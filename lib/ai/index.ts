import { getAIConfig, isAIConfigured } from "@/lib/ai/config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class AINotConfiguredError extends Error {
  constructor() {
    super(
      "AI is not configured. Set AI_PROVIDER and AI_API_KEY to enable AI features.",
    );
    this.name = "AINotConfiguredError";
  }
}

const completeWithOpenAICompatible = async (
  messages: ChatMessage[],
  options: { temperature?: number; json?: boolean },
) => {
  const { apiKey, model, baseUrl } = getAIConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      payload.error?.message ?? `AI request failed (${response.status})`,
    );
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return payload.choices?.[0]?.message?.content ?? "";
};

const completeWithAnthropic = async (
  messages: ChatMessage[],
  options: { temperature?: number; json?: boolean },
) => {
  const { apiKey, model, baseUrl } = getAIConfig();

  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: options.temperature ?? 0.2,
      system: system || undefined,
      messages: messages
        .filter((message) => message.role !== "system")
        .map((message) => ({ role: message.role, content: message.content })),
      ...(options.json
        ? {
            tools: [
              {
                name: "structured_output",
                description: "Return the response as JSON",
                input_schema: { type: "object" },
              },
            ],
            tool_choice: { type: "auto" },
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      payload.error?.message ?? `AI request failed (${response.status})`,
    );
  }

  const payload = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };

  return (
    payload.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("") ?? ""
  );
};

/**
 * Sends a chat completion to whichever provider is configured.
 */
export const complete = async (
  messages: ChatMessage[],
  options: { temperature?: number; json?: boolean } = {},
): Promise<string> => {
  if (!isAIConfigured()) throw new AINotConfiguredError();

  const { provider } = getAIConfig();

  if (provider === "anthropic") {
    return completeWithAnthropic(messages, options);
  }

  return completeWithOpenAICompatible(messages, options);
};
