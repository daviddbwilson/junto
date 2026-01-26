/**
 * OpenRouter API client.
 *
 * OpenRouter provides a single OpenAI-compatible API for 400+ models.
 * We use native fetch (Node 18+) to avoid extra dependencies.
 *
 * API docs: https://openrouter.ai/docs/api/reference/overview
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ReasoningConfig {
  effort: string; // "none" | "low" | "medium" | "high" | "xhigh"
}

export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  /** Optional: max tokens to generate. */
  max_tokens?: number;
  /** Optional: reasoning effort for models that support it (GPT-5.2, o-series, etc.) */
  reasoning?: ReasoningConfig;
}

export interface CompletionResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call a single model via OpenRouter's chat completions endpoint.
 *
 * This is OpenAI-compatible: same request/response shape as the OpenAI API,
 * just pointed at OpenRouter's URL with an OpenRouter API key.
 *
 * The `reasoning` parameter is an OpenRouter extension that controls
 * how much compute the model spends on chain-of-thought reasoning.
 * GPT-5.2 defaults reasoning to OFF — we explicitly set it to "high".
 */
export async function chatCompletion(
  apiKey: string,
  request: CompletionRequest,
  timeoutMs: number
): Promise<CompletionResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
    };

    if (request.max_tokens) {
      body.max_tokens = request.max_tokens;
    }

    if (request.reasoning) {
      body.reasoning = request.reasoning;
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/junto-mcp",
        "X-Title": "Junto MCP",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenRouter API error (${response.status}): ${errorBody}`
      );
    }

    return (await response.json()) as CompletionResponse;
  } finally {
    clearTimeout(timeout);
  }
}
