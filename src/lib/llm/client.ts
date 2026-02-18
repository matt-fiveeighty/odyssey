/**
 * Anthropic Claude SDK Wrapper
 *
 * Provides structured LLM interactions with:
 * - System prompts that enforce "only reference provided data"
 * - Structured output extraction
 * - Error handling and fallback
 * - Token tracking
 *
 * Requires: ANTHROPIC_API_KEY env var
 */

// Note: @anthropic-ai/sdk must be added to package.json
// For now, use fetch-based approach that works without the SDK

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

interface LlmResponse {
  text: string;
  tokensUsed: number;
  model: string;
}

const SYSTEM_PROMPT = `You are a hunting strategy advisor for Odyssey Outdoors, a western big game hunt planning platform.

CRITICAL RULES:
1. Only reference data that has been provided to you in the user message. Never invent statistics, draw odds, success rates, or unit information.
2. When discussing units, only reference the specific data fields provided (success rate, trophy rating, points required, terrain, etc.).
3. Be specific and actionable. Use numbers from the provided data.
4. Write in a knowledgeable but approachable tone — like a veteran hunting buddy who also happens to be good with data.
5. Keep responses concise. Aim for 2-4 short paragraphs.
6. Never recommend illegal activities or disregard game regulations.`;

/**
 * Call the Anthropic Claude API with a structured prompt.
 * Falls back gracefully if the API key is missing or the call fails.
 */
export async function callClaude(
  messages: LlmMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }
): Promise<LlmResponse | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[llm/client] ANTHROPIC_API_KEY not set — skipping LLM call");
    return null;
  }

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: options?.model ?? "claude-sonnet-4-20250514",
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        system: SYSTEM_PROMPT,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[llm/client] API error:", res.status, errorText);
      return null;
    }

    const data = await res.json();
    const text =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";
    const tokensUsed =
      (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    return {
      text,
      tokensUsed,
      model: data.model ?? options?.model ?? "claude-sonnet-4-20250514",
    };
  } catch (err) {
    console.error("[llm/client] Unexpected error:", err);
    return null;
  }
}
