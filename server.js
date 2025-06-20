const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');

// Environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Get credentials from environment variables
const AZURE_API_ENDPOINT = process.env.AZURE_API_ENDPOINT;
const AZURE_API_KEY = process.env.AZURE_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME;

if (!AZURE_API_ENDPOINT || !AZURE_API_KEY || !MODEL_NAME) {
    console.error("Error: Make sure AZURE_API_ENDPOINT, AZURE_API_KEY, and MODEL_NAME are set in the .env file.");
    process.exit(1);
}

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

// Endpoint 1: /models
// Mimics the OpenAI /models endpoint for the authentication and model listing logic of Medical Report Information Extractor.
app.get('/v1/models', async (req, res) => {
    try {
        // Azure endpoint does not have a dedicated /models endpoint that we can use for validation.
        // Instead, we make a small, non-streaming request to the chat completions endpoint to validate the API key.
        await axios.post(
            `${AZURE_API_ENDPOINT}/chat/completions`,
            {
                "messages": [{"role": "user", "content": "test"}],
                "max_tokens": 5,
                "stream": false
            },
            {
                headers: {
                    'Authorization': `Bearer ${AZURE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Success; return models list in OpenAI's format
        res.status(200).json({
            "object": "list",
            "data": [
                {
                    "id": MODEL_NAME,
                    "object": "model",
                    "created": new Date().getTime(),
                    "owned_by": "user"
                }
            ]
        });
    } catch (error) {
        if (error.response) {
            console.error("API Key validation failed:", error.response.status, error.response.data);
            // Forward the authentication error from Azure to the client
            res.status(error.response.status).json({
                error: {
                    message: "API key validation failed. Please check the key in your .env file.",
                    details: error.response.data
                }
            });
        } else {
            console.error("An unexpected error occurred during API key validation:", error.message);
            res.status(500).json({
                error: {
                    message: "An internal server error occurred.",
                    details: error.message
                }
            });
        }
    }
});


// Endpoint 2: /chat/completions
// Reframes and forwards the request to Azure's chat completions endpoint.
app.post('/v1/chat/completions', async (req, res) => {
    // The body from the request from Medical Report Information Extractor
    const requestBody = req.body;

    // Handling inconsistencies between OpenAI's API and Azure's API
    // Azure's API documentation: https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#request-body

    // Azure's endpoint does not support the 'developer' role?
    if (requestBody.messages && Array.isArray(requestBody.messages)) {
        requestBody.messages.forEach(msg => {
            if (msg.role === 'developer') {
                msg.role = 'system';
            }
        });
    }

    // Otherwise `max_tokens` at the Azure endpoint defaults to 16
    requestBody.max_tokens = requestBody.max_tokens || 5000;

    try {
        // Forward the request to the Azure endpoint
        const azureResponse = await axios.post(
            `${AZURE_API_ENDPOINT}/chat/completions`,
            requestBody,
            {
                headers: {
                    'Authorization': `Bearer ${AZURE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                responseType: requestBody.stream ? 'stream' : 'json'
            }
        );

        if (requestBody.stream) {
            console.log("Streaming response back to client.");
            res.setHeader('Content-Type', 'text/event-stream');
            azureResponse.data.pipe(res);
        } else {
            console.log("Sending JSON response back to client.");
            console.log(azureResponse.data);
            res.status(200).json(azureResponse.data);
        }
    } catch (error) {
        if (error.response) {
            console.error("Error forwarding request to Azure:", error.response.status, error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            console.error("An unexpected error occurred while forwarding the request:", error.message);
            res.status(500).json({ error: 'Failed to forward request to Azure endpoint.' });
        }
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Express proxy server is running on http://localhost:${PORT}`);
    console.log(`Proxying requests to: ${AZURE_API_ENDPOINT}`);
});
