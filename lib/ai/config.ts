export type AIProviderName = "openai" | "anthropic" | "custom";

export interface AIConfig {
  provider: AIProviderName;
  apiKey: string | undefined;
  model: string;
  baseUrl?: string;
}

const DEFAULT_MODELS: Record<AIProviderName, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  custom: "default",
};

const DEFAULT_BASE_URLS: Record<AIProviderName, string | undefined> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  custom: undefined,
};

/**
 * Provider-agnostic AI configuration.
 *
 * AI_PROVIDER:        openai | anthropic | custom (custom = any OpenAI-compatible API:
 *                     Gemini, Groq, Together, OpenRouter, local LM Studio, etc.)
 * AI_API_KEY:         your key (falls back to OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY)
 * AI_MODEL:           override the default model per provider
 * AI_BASE_URL:        override the endpoint (required for "custom")
 */
export const getAIConfig = (): AIConfig => {
  const provider = (process.env.AI_PROVIDER?.toLowerCase() ??
    "openai") as AIProviderName;

  const apiKey =
    process.env.AI_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.ANTHROPIC_API_KEY ??
    process.env.GEMINI_API_KEY;

  return {
    provider,
    apiKey,
    model: process.env.AI_MODEL || DEFAULT_MODELS[provider],
    baseUrl:
      process.env.AI_BASE_URL ??
      DEFAULT_BASE_URLS[provider] ??
      "https://api.openai.com/v1",
  };
};

export const isAIConfigured = () => Boolean(getAIConfig().apiKey);
