### `grok_api_reference.md`

````markdown
# Grok (xAI) API Reference

## Overview

The xAI API provides programmatic access to Grok models, including the latest **Grok 4** and **Grok 3** series. The API is fully compatible with the OpenAI SDK, allowing for easy integration by changing the `base_url` and `api_key`.

- **Base URL:** `https://api.x.ai/v1`
- **Dashboard/Keys:** [console.x.ai](https://console.x.ai)
- **Docs:** [docs.x.ai](https://docs.x.ai)

## Authentication

Authentication uses a Bearer token in the header.

```bash
Authorization: Bearer <YOUR_XAI_API_KEY>
```
````

## Available Models

Always prefer the latest models for best performance.

| Model ID                      | Description                                                                      | Context Window |
| ----------------------------- | -------------------------------------------------------------------------------- | -------------- |
| **`grok-4`**                  | **Current Flagship.** Strongest reasoning and general-purpose capabilities.      | 128k+          |
| **`grok-4-1-fast-reasoning`** | High-speed, cost-effective reasoning model. Ideal for complex agentic workflows. | 128k+          |
| **`grok-3`**                  | Previous flagship. Excellent performance for general tasks.                      | 128k           |
| **`grok-2-vision-1212`**      | Stable vision-capable model (if Grok 4 vision behavior is inconsistent).         | 32k            |

> **Note:** Model aliases like `grok-beta` are deprecated in favor of specific versions.

## Usage with OpenAI SDK

You can use the standard OpenAI Python/Node.js SDKs by overriding the base URL.

### Python Example

```python
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.getenv("XAI_API_KEY"),
    base_url="[https://api.x.ai/v1](https://api.x.ai/v1)",
)

response = client.chat.completions.create(
    model="grok-4",
    messages=[
        {"role": "system", "content": "You are Grok, a helpful AI assistant."},
        {"role": "user", "content": "Explain quantum entanglement in simple terms."}
    ]
)

print(response.choices[0].message.content)

```

### Vision (Image Input)

Grok models with vision capabilities (e.g., `grok-4` or `grok-2-vision-1212`) accept images via the standard `image_url` content block.

```python
response = client.chat.completions.create(
    model="grok-4",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What is in this image?"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "[https://example.com/image.jpg](https://example.com/image.jpg)",
                        "detail": "high"
                    }
                }
            ]
        }
    ]
)

```

## Special Features & Tools

### Server-Side Tools

xAI provides built-in server-side tools that can be enabled to give Grok real-time capabilities. These do not require you to implement the tool logic yourself.

To use them, include the `tools` definition in your request but **do not** implement the function execution; the API handles it and returns the final answer.

**Available Tools:**

1. **`web_search`**: Searches the internet for real-time info.
2. **`x_search`**: Searches X (formerly Twitter) posts and users.
3. **`code_execution`**: Executes Python code in a secure sandbox.

**Example: Enabling Web Search**

```python
# To enable web search, you strictly define the tool but let xAI handle execution
tools = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for current information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"}
                },
                "required": ["query"]
            }
        }
    }
]

# Note: For strict server-side execution without client-side loops,
# refer to specific xAI SDK "tool_choice" or "enable_tools" parameters
# if using the official xai-sdk, or standard tool usage in OpenAI SDK.

```

### System Prompts

Grok responds well to system prompts defining its persona.

- **Default Persona:** "You are Grok, a highly intelligent, helpful AI assistant."
- **Fun Persona:** Grok has a "fun mode" inspired by _The Hitchhiker's Guide to the Galaxy_ if prompted to be humorous or rebellious.

## Rate Limits & Errors

- **429 Too Many Requests:** You have hit the rate limit. Implement exponential backoff.
- **401 Unauthorized:** Check your API key.
- **Streaming:** Fully supported via `stream=True`.

## Key Differences from OpenAI

1. **Base URL:** Must be set to `https://api.x.ai/v1`.
2. **Models:** Use `grok-4`, `grok-3`, etc., instead of `gpt-4`.
3. **Content Policy:** Grok is designed to be "maximally truth-seeking" and may answer questions other models refuse, provided they don't violate safety laws.

```

```
