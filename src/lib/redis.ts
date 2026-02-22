import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Dev fallback: globalThis-attached store for cross-worker sharing
// Uses globalThis so the Map survives Turbopack HMR and is shared across
// server-side workers within the same Node.js process.
// ---------------------------------------------------------------------------
type DevEntry = { value: string; expiresAt: number };

const GLOBAL_KEY = "__dev_cache_store__" as const;

function getDevStore(): Map<string, DevEntry> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, DevEntry>();
  }
  return g[GLOBAL_KEY] as Map<string, DevEntry>;
}

function useDevFallback(): boolean {
  return (
    typeof window === "undefined" &&
    (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)
  );
}

// ---------------------------------------------------------------------------
// Shared Redis client — lazy-initialized, returns null if env vars are missing
// ---------------------------------------------------------------------------
let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

/**
 * Returns true if cache is available (either Redis or dev fallback).
 * Use this instead of `getRedis() !== null` when you need to know if
 * cacheGet/cacheSet will actually work.
 */
export function isCacheAvailable(): boolean {
  return getRedis() !== null || useDevFallback();
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
 * Get a cached value by key. Returns null if key doesn't exist or has expired.
 * Falls back to globalThis Map when Redis is unavailable (dev mode).
 * Degrades gracefully — never throws.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    if (client) {
      const value = await client.get<T>(key);
      return value ?? null;
    }

    // Dev fallback (server-side only)
    if (useDevFallback()) {
      const store = getDevStore();
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return JSON.parse(entry.value) as T;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with a TTL. Accepts a preset key (e.g. "flight_prices") or raw seconds.
 * Falls back to globalThis Map when Redis is unavailable (dev mode).
 * Degrades gracefully — silently no-ops on error.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttl: CacheTTLKey | number
): Promise<void> {
  try {
    const ttlSeconds = typeof ttl === "number" ? ttl : CACHE_TTLS[ttl];
    const client = getRedis();
    if (client) {
      await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
      return;
    }

    // Dev fallback (server-side only)
    if (useDevFallback()) {
      const store = getDevStore();
      store.set(key, {
        value: JSON.stringify(value),
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }
  } catch {
    // Graceful degradation — cache write failure is non-fatal
  }
}

/**
 * Delete a cached key. Falls back to globalThis Map when Redis is unavailable.
 * Degrades gracefully — silently no-ops on error.
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedis();
    if (client) {
      await client.del(key);
      return;
    }

    // Dev fallback (server-side only)
    if (useDevFallback()) {
      const store = getDevStore();
      store.delete(key);
    }
  } catch {
    // Graceful degradation — cache delete failure is non-fatal
  }
}
