/**
 * Amadeus Flight Offers Search API Client
 *
 * Pure server-side library: OAuth2 client_credentials flow with in-memory
 * token caching, Redis INCR quota tracking, and direct fetch (no SDK).
 *
 * Never throws -- all errors return null for graceful degradation.
 */

import { getRedis } from "@/lib/redis";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const AMADEUS_BASE =
  process.env.AMADEUS_PRODUCTION === "true"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";

// ---------------------------------------------------------------------------
// OAuth2 Token Management
// ---------------------------------------------------------------------------

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Obtain an OAuth2 bearer token via client_credentials grant.
 * Caches the token in-memory and refreshes 60s before expiry.
 */
async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID!,
      client_secret: process.env.AMADEUS_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) throw new Error(`Amadeus auth failed: ${res.status}`);

  const data = await res.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

// ---------------------------------------------------------------------------
// Quota Tracking (Redis INCR pattern)
// ---------------------------------------------------------------------------

const QUOTA_KEY = "amadeus:monthly_calls";
const MONTHLY_LIMIT = 1800;

/**
 * Atomically increment the monthly call counter. Returns false if the soft
 * limit (1800/2000) has been reached. Sets auto-expire TTL on first call
 * of the month so the counter resets naturally.
 *
 * Returns true (allow) when Redis is unavailable (dev mode, no tracking).
 */
async function checkAndIncrementQuota(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // dev mode, no tracking

  const count = await redis.incr(QUOTA_KEY);

  // First call of the month: set TTL to first day of next month
  if (count === 1) {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const secondsRemaining = Math.ceil(
      (endOfMonth.getTime() - now.getTime()) / 1000,
    );
    await redis.expire(QUOTA_KEY, secondsRemaining);
  }

  if (count > MONTHLY_LIMIT) {
    // Roll back -- we won't actually make the call
    await redis.decr(QUOTA_KEY);
    return false;
  }

  return true;
}

/**
 * Read current quota usage without incrementing.
 * Safe to call from dashboards / status checks.
 */
export async function checkQuotaRemaining(): Promise<{
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
}> {
  const redis = getRedis();
  if (!redis) {
    return { used: 0, limit: MONTHLY_LIMIT, remaining: MONTHLY_LIMIT, exhausted: false };
  }

  const raw = await redis.get<number>(QUOTA_KEY);
  const used = raw ?? 0;

  return {
    used,
    limit: MONTHLY_LIMIT,
    remaining: Math.max(0, MONTHLY_LIMIT - used),
    exhausted: used >= MONTHLY_LIMIT,
  };
}

// ---------------------------------------------------------------------------
// Flight Search
// ---------------------------------------------------------------------------

export interface FlightQuote {
  origin: string;
  destination: string;
  price: number;
  currency: string;
  airline: string;
  queriedAt: string;
}

/**
 * Search Amadeus Flight Offers for the cheapest one-way fare.
 *
 * Returns null when:
 * - Monthly quota is exhausted
 * - OAuth token cannot be obtained
 * - API returns an error or no results
 * - Any unexpected error occurs
 */
export async function searchFlightOffers(
  origin: string,
  destination: string,
  departureDate: string,
): Promise<FlightQuote | null> {
  try {
    // 1. Check quota
    const allowed = await checkAndIncrementQuota();
    if (!allowed) return null;

    // 2. Get bearer token
    const token = await getToken();

    // 3. Search flight offers
    const params = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: "1",
      nonStop: "false",
      currencyCode: "USD",
      max: "5",
    });

    const res = await fetch(
      `${AMADEUS_BASE}/v2/shopping/flight-offers?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) return null;

    // 4. Parse response
    const json = await res.json();
    const offers = json.data;
    if (!offers?.length) return null;

    // 5. Find cheapest offer
    const cheapest = offers.reduce(
      (
        min: { price: { grandTotal: string } },
        o: { price: { grandTotal: string } },
      ) =>
        parseFloat(o.price.grandTotal) < parseFloat(min.price.grandTotal)
          ? o
          : min,
    );

    // 6. Return FlightQuote
    return {
      origin,
      destination,
      price: parseFloat(cheapest.price.grandTotal),
      currency: cheapest.price.currency,
      airline: cheapest.validatingAirlineCodes?.[0] ?? "Unknown",
      queriedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Amadeus search failed:", err);
    return null;
  }
}
