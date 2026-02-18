import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiter instances — created lazily so the app works without Upstash configured
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function createLimiter(
  prefix: string,
  maxRequests: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`
): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(maxRequests, window),
    prefix: `rl:${prefix}`,
    analytics: true,
  });
}

// Per-endpoint limiters
export const limiters = {
  signIn: () => createLimiter("sign-in", 5, "15 m"),
  signUp: () => createLimiter("sign-up", 3, "1 h"),
  authCallback: () => createLimiter("auth-cb", 10, "1 m"),
  api: () => createLimiter("api", 60, "1 m"),
  guest: () => createLimiter("guest", 100, "1 h"),
  passwordReset: () => createLimiter("pw-reset", 3, "1 h"),
} as const;

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitResult> {
  if (!limiter) {
    // No Redis configured — allow all requests (dev mode)
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
