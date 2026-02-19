/**
 * Anthropic Claude SDK Wrapper
 *
 * Provides structured LLM interactions with:
 * - Official @anthropic-ai/sdk integration
 * - System prompts that enforce "only reference provided data"
 * - Structured output extraction
 * - Error handling and fallback
 * - Token tracking
 *
 * Requires: ANTHROPIC_API_KEY env var
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/utils";

interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmResponse {
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

// Lazy-init SDK client (server-side only)
let _client: Anthropic | null = null;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!_client) {
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Call the Anthropic Claude API with a structured prompt.
 * Uses the official SDK. Falls back gracefully if the API key is missing or the call fails.
 */
export async function callClaude(
  messages: LlmMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }
): Promise<LlmResponse | null> {
  const client = getClient();
  if (!client) {
    logger.warn("[llm/client] ANTHROPIC_API_KEY not set — skipping LLM call");
    return null;
  }

  const model = options?.model ?? "claude-sonnet-4-20250514";

  try {
    const response = await client.messages.create({
      model,
      max_tokens: options?.maxTokens ?? 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text =
      response.content?.[0]?.type === "text" ? response.content[0].text : "";
    const tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);

    return {
      text,
      tokensUsed,
      model: response.model ?? model,
    };
  } catch (err) {
    console.error("[llm/client] API error:", err);
    return null;
  }
}
