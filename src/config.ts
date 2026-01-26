/**
 * Model panel configuration for Junto.
 *
 * Each "thinker" is a frontier model that independently processes the user's prompt.
 * The "consolidator" synthesizes all thinker responses into one answer.
 *
 * All models are accessed via OpenRouter (https://openrouter.ai).
 * Model IDs follow OpenRouter's naming convention: "provider/model-name".
 */

export interface ModelConfig {
  id: string;
  label: string;
  /** Optional reasoning config — sent as `reasoning` in the OpenRouter request body. */
  reasoning?: { effort: string };
}

export interface PanelConfig {
  thinkers: ModelConfig[];
  consolidator: ModelConfig;
}

/**
 * Default model panel — 4 providers for maximum architectural diversity.
 *
 * GPT-5.2 gets `reasoning.effort: "high"` because reasoning is OFF by default
 * on the 5.2 series — you must explicitly enable it. "high" allocates ~80% of
 * the token budget to reasoning, which is what we want for a depth-first tool.
 */
export function buildPanel(pro: boolean): PanelConfig {
  const gptModelId =
    process.env.JUNTO_GPT_PRO_MODEL && pro
      ? process.env.JUNTO_GPT_PRO_MODEL
      : pro
        ? "openai/gpt-5.2-pro"
        : process.env.JUNTO_GPT_MODEL ?? "openai/gpt-5.2";

  const gptLabel = pro ? "GPT-5.2 Pro" : "GPT-5.2";

  return {
    thinkers: [
      { id: gptModelId, label: gptLabel, reasoning: { effort: "high" } },
      { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro" },
      { id: "x-ai/grok-4", label: "Grok 4" },
      { id: "anthropic/claude-opus-4.5", label: "Claude Opus 4.5" },
    ],
    consolidator: {
      id: "anthropic/claude-opus-4.5",
      label: "Claude Opus 4.5 (Consolidator)",
    },
  };
}

export interface JuntoConfig {
  openrouterApiKey: string;
  /** Request timeout per model call in milliseconds. Default: 120_000 (2 min). */
  timeoutMs: number;
}

export function loadConfig(): JuntoConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is required.\n" +
        "Get your key at https://openrouter.ai/keys"
    );
  }

  return {
    openrouterApiKey: apiKey,
    timeoutMs: 120_000,
  };
}
