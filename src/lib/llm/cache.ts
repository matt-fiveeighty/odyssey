/**
 * LLM Response Cache
 *
 * Server-side cache backed by Supabase `llm_cache` table.
 * Hash input params → check cache → return cached or generate fresh.
 *
 * TTL:
 * - Unit explanations: 7 days
 * - Plan narratives: 24 hours
 * - Tradeoff comparisons: 7 days
 * - Goal summaries: 24 hours
 */

import { createServerSupabase } from "@/lib/supabase/server";

const TTL_MAP: Record<string, number> = {
  explain_unit: 7 * 24 * 60 * 60 * 1000,    // 7 days
  tradeoff: 7 * 24 * 60 * 60 * 1000,         // 7 days
  plan_narrative: 24 * 60 * 60 * 1000,        // 24 hours
  goal_summary: 24 * 60 * 60 * 1000,          // 24 hours
};

/**
 * Create a stable hash key from prompt type + input params.
 */
function createCacheKey(
  promptType: string,
  inputParams: Record<string, unknown>
): string {
  const sorted = JSON.stringify(inputParams, Object.keys(inputParams).sort());
  // Simple hash — good enough for cache keys
  let hash = 0;
  const str = `${promptType}:${sorted}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `${promptType}_${Math.abs(hash).toString(36)}`;
}

/**
 * Check the cache for a stored response.
 * Returns null if not found or expired.
 */
export async function getCachedResponse(
  promptType: string,
  inputParams: Record<string, unknown>
): Promise<string | null> {
  try {
    const supabase = await createServerSupabase();
    const cacheKey = createCacheKey(promptType, inputParams);

    const { data, error } = await supabase
      .from("llm_cache")
      .select("output, expires_at")
      .eq("cache_key", cacheKey)
      .single();

    if (error || !data) return null;

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      // Expired — delete and return null
      await supabase.from("llm_cache").delete().eq("cache_key", cacheKey);
      return null;
    }

    return data.output;
  } catch {
    return null;
  }
}

/**
 * Store a response in the cache.
 */
export async function setCachedResponse(
  promptType: string,
  inputParams: Record<string, unknown>,
  output: string,
  model: string,
  tokensUsed: number
): Promise<void> {
  try {
    const supabase = await createServerSupabase();
    const cacheKey = createCacheKey(promptType, inputParams);
    const ttl = TTL_MAP[promptType] ?? 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttl).toISOString();

    await supabase.from("llm_cache").upsert(
      {
        cache_key: cacheKey,
        prompt_type: promptType,
        input_params: inputParams,
        output,
        model,
        tokens_used: tokensUsed,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: "cache_key" }
    );
  } catch (err) {
    console.error("[llm/cache] Failed to cache response:", err);
  }
}

/**
 * Log LLM usage for rate limiting.
 */
export async function logLlmUsage(
  userId: string,
  promptType: string,
  tokensUsed: number
): Promise<void> {
  try {
    const supabase = await createServerSupabase();
    await supabase.from("llm_usage").insert({
      user_id: userId,
      prompt_type: promptType,
      tokens_used: tokensUsed,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[llm/cache] Failed to log usage:", err);
  }
}

/**
 * Check if a user is within their rate limit.
 * Pro: 50 calls/month, Elite: unlimited
 */
export async function checkRateLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const supabase = await createServerSupabase();
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { count, error } = await supabase
      .from("llm_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo);

    if (error) {
      // Fail open — allow the call
      return { allowed: true, remaining: 50 };
    }

    const used = count ?? 0;
    // Default to 50/month (Pro limit). Elite is handled by entitlements layer.
    const limit = 50;
    return {
      allowed: used < limit,
      remaining: Math.max(0, limit - used),
    };
  } catch {
    return { allowed: true, remaining: 50 };
  }
}
