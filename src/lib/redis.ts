import { Redis } from "@upstash/redis";

// Shared Redis client — lazy-initialized, returns null if env vars are missing
let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// TTL presets for different data categories (values in seconds)
export const CACHE_TTLS = {
  flight_prices: 6 * 60 * 60, // 6 hours
  cpi_data: 30 * 24 * 60 * 60, // 30 days
  share_links: 90 * 24 * 60 * 60, // 90 days
  calendar_plans: 365 * 24 * 60 * 60, // 365 days
  default: 60 * 60, // 1 hour fallback
} as const;

export type CacheTTLKey = keyof typeof CACHE_TTLS;

/**
 * Get a cached value by key. Returns null if Redis is unavailable or key doesn't exist.
 * Degrades gracefully — never throws.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    if (!client) return null;
    const value = await client.get<T>(key);
    return value ?? null;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with a TTL. Accepts a preset key (e.g. "flight_prices") or raw seconds.
 * Degrades gracefully — silently no-ops if Redis is unavailable.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttl: CacheTTLKey | number
): Promise<void> {
  try {
    const client = getRedis();
    if (!client) return;
    const ttlSeconds = typeof ttl === "number" ? ttl : CACHE_TTLS[ttl];
    await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch {
    // Graceful degradation — cache write failure is non-fatal
  }
}

/**
 * Delete a cached key. Degrades gracefully — silently no-ops if Redis is unavailable.
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedis();
    if (!client) return;
    await client.del(key);
  } catch {
    // Graceful degradation — cache delete failure is non-fatal
  }
}
