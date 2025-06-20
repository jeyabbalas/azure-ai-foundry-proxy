# Azure AI Foundry Proxy

This repository contains the code for a proxy server that connects the frontend application [Medical Report Information Extractor](https://github.com/jeyabbalas/medical-report-information-extractor) and a backend large language model (LLM) API endpoint deployed on [Azure AI Foundry](https://learn.microsoft.com/en-us/azure/ai-foundry/what-is-azure-ai-foundry). The proxy mimics a minimal [OpenAI API structure](https://platform.openai.com/docs/api-reference/introduction) required by the Medical Report Information Extractor. This proxy can be ran locally in your computer. 

## Motivation
Below is a list of motivations for using this proxy server.

1. The LLM APIs on Azure AI Foundry is structured slightly differently from the OpenAI's API. With respect to the requirements of Medical Report Information Extractor, the API on Azure lacks the required `models/` endpoint, which the web app uses for validating the API key and listing the available models. The LLM API deployed on Azure corresponds to a single model and therefore lacks a `models/` endpoint. 
2. By default, the CORS policy at APIs hosted on Azure do not allow cross-origin requests. This proxy circumvents that by making calls from the desktop and attaching CORS headers for cross-origin requests from Medical Report Information Extractor.
3. Azure API parameters are different from those of OpenAI. For example, `developer` role is not supported in Azure endpoints. Azure endpoints default to `max_tokens` of 16. So, it needs to be specified explicitly in the request. This proxy server modifies requests to include the `max_tokens` parameter and substitutes the `developer` role to `system`.

**Note**: This proxy is only intended for testing Medical Report Information Extractor with a backend LLM API hosted on Azure AI Foundry. This setup is not suitable for production. For production, consider [Azure API Management service](https://azure.microsoft.com/en-us/products/api-management) to connect the frontend application with backend APIs hosted on Azure. To learn how to set an appropriate CORS policy on the Azure API Management service, [read this blog entry](https://techcommunity.microsoft.com/blog/azurepaasblog/how-to-troubleshoot-cors-error-in-azure-api-management-service/2241695). Also, Medical Report Information Extractor should be modified to not depend upon the `models/` endpoint.

## Usage
1. Clone this repository to your local machine.
2. Install the required dependencies:
```bash
npm install
```
3. Create a `.env` file in the root directory of the project and add the environment variables described below.
```bash
# The URL of the Azure AI Foundry model endpoint (without /chat/completions)
AZURE_API_ENDPOINT=https://Meta-Llama-3-1-405B-Instruct-xyz.eastus2.models.ai.azure.com

# The API key provided by Azure AI Foundry
AZURE_API_KEY=<ENTER_YOUT_API_KEY_HERE>

# Model name
MODEL_NAME=Meta-Llama-3.1-405B-Instruct
```
4. Start the proxy server:
```bash
npm start
```
5. Go to the [Medical Report Information Extractor web app](https://jeyabbalas.github.io/medical-report-information-extractor/). Enter the following configuration for the LLM API:
```
Base URL: http://localhost:3000/v1
API Key: <ANY_NON-EMPTY_STRING>
```
