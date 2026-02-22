# Phase 6: API Integrations - Research

**Researched:** 2026-02-22
**Domain:** External API integration (flight pricing, economic data), caching, cron scheduling
**Confidence:** MEDIUM (SDK compatibility unverified in runtime; API contracts verified via official docs)

## Summary

Phase 6 replaces two hardcoded data sources with real API-backed data: Amadeus Flight Offers Search for flight pricing (replacing static `avgCost` values in `flight-hubs.ts`) and BLS CPI API for inflation rates (replacing an implicit 3% assumption). Both APIs have generous free tiers that fit the project's needs, but the architecture must ensure zero user-facing API calls -- all data flows through Redis cache populated by Vercel Cron jobs.

The existing codebase is well-prepared: `src/lib/redis.ts` already provides `cacheGet`/`cacheSet`/`cacheDel` with graceful degradation, `CACHE_TTLS` already has `flight_prices` (6h) and `cpi_data` (30d) presets, and `src/lib/engine/verified-datum.ts` already provides `verified()` and `estimated()` factory functions. The primary integration work is building two thin API clients, two route handlers with cache-first patterns, two cron jobs for background warming, and a graceful degradation layer.

**Primary recommendation:** Use direct REST calls (no SDK) for both APIs. The official `amadeus` npm package (v11.1.0) is CJS-only with no `exports` field, making it a bundling risk in Next.js 16's ESM-first server components. A thin fetch-based client (~100 lines) avoids this entirely, handles OAuth token caching simply, and has zero dependencies.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `fetch` | built-in | Amadeus REST API calls | Zero dependencies, full control, avoids CJS/ESM issues |
| Native `fetch` | built-in | BLS API v2 calls | Zero dependencies, simple POST endpoint |
| `@upstash/redis` | ^1.36.2 | Cache storage + quota counter | Already in project, INCR is atomic for quota tracking |
| `zod` | ^4.3.6 | Response validation | Already in project, validates API responses before caching |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@upstash/ratelimit` | ^2.0.8 | Rate limiting cron endpoints | Already in project for API rate limiting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct fetch for Amadeus | `amadeus` npm v11.1.0 | Official SDK is CJS-only, no `exports` field, Babel-transpiled, risks bundling failures in Next.js 16 server components. SDK has single dep (`qs`). Community `amadeus-ts` (v5.1.1) has ESM support but is unmaintained by Amadeus. Direct fetch is safest. |
| Direct fetch for BLS | `bls` npm package | Package is ancient, unmaintained. BLS API is a single POST endpoint -- no SDK needed. |

**Installation:**
```bash
# No new packages needed -- all dependencies already in project
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── api/
│   │   ├── amadeus.ts           # Amadeus OAuth + flight quote client
│   │   └── bls.ts               # BLS CPI client
│   ├── redis.ts                 # Existing -- shared Redis client
│   └── engine/
│       └── verified-datum.ts    # Existing -- VerifiedDatum wrapping
├── app/
│   └── api/
│       ├── flights/
│       │   └── quote/
│       │       └── route.ts     # GET /api/flights/quote (cache-first)
│       ├── inflation/
│       │   └── cpi/
│       │       └── route.ts     # GET /api/inflation/cpi (cache-first)
│       └── cron/
│           ├── scrape/
│           │   └── route.ts     # Existing cron
│           ├── warm-flights/
│           │   └── route.ts     # Monthly flight price warming
│           └── refresh-cpi/
│               └── route.ts     # Monthly CPI refresh
```

### Pattern 1: Direct REST Client with Token Caching (Amadeus)
**What:** Thin fetch wrapper that handles OAuth2 client_credentials flow with in-memory token caching.
**When to use:** Amadeus requires a bearer token that expires every ~30 minutes. Cache the token and refresh proactively.
**Example:**
```typescript
// src/lib/api/amadeus.ts

const AMADEUS_BASE = process.env.AMADEUS_PRODUCTION === "true"
  ? "https://api.amadeus.com"
  : "https://test.api.amadeus.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

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

export interface FlightQuote {
  origin: string;
  destination: string;
  price: number;       // grandTotal in USD
  currency: string;
  airline: string;
  queriedAt: string;   // ISO timestamp
}

export async function searchFlightOffers(
  origin: string,
  destination: string,
  departureDate: string,
): Promise<FlightQuote | null> {
  const token = await getToken();
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
  const json = await res.json();
  const offers = json.data;
  if (!offers?.length) return null;

  // Return cheapest offer
  const cheapest = offers.reduce((min, o) =>
    parseFloat(o.price.grandTotal) < parseFloat(min.price.grandTotal) ? o : min
  );

  return {
    origin,
    destination,
    price: parseFloat(cheapest.price.grandTotal),
    currency: cheapest.price.currency,
    airline: cheapest.validatingAirlineCodes?.[0] ?? "Unknown",
    queriedAt: new Date().toISOString(),
  };
}
```

### Pattern 2: Redis INCR Quota Counter
**What:** Atomic monthly counter using Redis INCR with auto-expiring TTL. Check before each API call.
**When to use:** Track Amadeus monthly call budget (1800/2000 soft limit).
**Example:**
```typescript
// Inside amadeus.ts

const QUOTA_KEY = "amadeus:monthly_calls";
const MONTHLY_LIMIT = 1800; // soft limit, 2000 is hard

async function checkAndIncrementQuota(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // dev mode, no tracking

  const count = await redis.incr(QUOTA_KEY);

  // First call of the month: set TTL to end of current month
  if (count === 1) {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const secondsRemaining = Math.ceil((endOfMonth.getTime() - now.getTime()) / 1000);
    await redis.expire(QUOTA_KEY, secondsRemaining);
  }

  if (count > MONTHLY_LIMIT) {
    // Decrement back since we won't make the call
    await redis.decr(QUOTA_KEY);
    return false; // quota exhausted
  }

  return true;
}
```

### Pattern 3: BLS CPI Client (Single POST Endpoint)
**What:** Simple POST to BLS API v2 to fetch annual CPI data.
**When to use:** Monthly refresh on the 15th to get latest CPI-U index values.
**Example:**
```typescript
// src/lib/api/bls.ts

const BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const CPI_SERIES_ID = "CUUR0000SA0"; // CPI-U, All items, US city average, NSA

export interface CpiDataPoint {
  year: string;
  period: string;
  value: number;
  periodName: string;
}

export async function fetchCpiData(
  startYear: number,
  endYear: number,
): Promise<CpiDataPoint[]> {
  const res = await fetch(BLS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seriesid: [CPI_SERIES_ID],
      startyear: String(startYear),
      endyear: String(endYear),
      registrationkey: process.env.BLS_API_KEY,
    }),
  });

  if (!res.ok) return [];
  const json = await res.json();

  if (json.status !== "REQUEST_SUCCEEDED") return [];

  const series = json.Results?.series?.[0];
  if (!series?.data) return [];

  return series.data.map((d: any) => ({
    year: d.year,
    period: d.period,
    value: parseFloat(d.value),
    periodName: d.periodName,
  }));
}

export function computeAnnualInflationRate(data: CpiDataPoint[]): number {
  // Get annual averages (M13 period) or compute from monthly data
  const annuals = data.filter(d => d.period === "M13");

  if (annuals.length >= 2) {
    // Sort by year descending
    annuals.sort((a, b) => parseInt(b.year) - parseInt(a.year));
    const current = annuals[0].value;
    const previous = annuals[1].value;
    return (current - previous) / previous;
  }

  // Fallback: use December values
  const decembers = data
    .filter(d => d.period === "M12")
    .sort((a, b) => parseInt(b.year) - parseInt(a.year));

  if (decembers.length >= 2) {
    return (decembers[0].value - decembers[1].value) / decembers[1].value;
  }

  return 0.03; // ultimate fallback
}
```

### Pattern 4: Cache-First Route Handler
**What:** Route handler that always reads from Redis cache, never calls external API inline.
**When to use:** All user-facing API routes for flight quotes and CPI data.
**Example:**
```typescript
// src/app/api/flights/quote/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cacheGet } from "@/lib/redis";
import { verified, estimated } from "@/lib/engine/verified-datum";
import { findBestRoutes } from "@/lib/constants/flight-hubs";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.searchParams.get("origin");
  const destination = request.nextUrl.searchParams.get("destination");

  if (!origin || !destination) {
    return NextResponse.json({ error: "Missing origin/destination" }, { status: 400 });
  }

  const cacheKey = `flight:${origin}:${destination}`;
  const cached = await cacheGet<{ price: number; queriedAt: string }>(cacheKey);

  if (cached) {
    return NextResponse.json({
      data: verified(
        cached.price,
        "https://api.amadeus.com",
        cached.queriedAt,
        "Amadeus Flight Offers Search"
      ),
    });
  }

  // Fallback: use static estimates from flight-hubs.ts
  const staticRoutes = findBestRoutes(/* homeState */"", /* targetState */"");
  const staticPrice = staticRoutes[0]?.avgCost ?? 250;

  return NextResponse.json({
    data: estimated(staticPrice, "Historical average from flight-hubs.ts"),
  });
}
```

### Pattern 5: Vercel Cron Configuration
**What:** Multiple cron jobs in vercel.json for different schedules.
**When to use:** Warming flight cache monthly, refreshing CPI monthly.
**Example:**
```json
{
  "crons": [
    {
      "path": "/api/cron/scrape",
      "schedule": "0 6 * * 0"
    },
    {
      "path": "/api/cron/warm-flights",
      "schedule": "0 8 1 * *"
    },
    {
      "path": "/api/cron/refresh-cpi",
      "schedule": "0 10 15 * *"
    }
  ]
}
```

### Anti-Patterns to Avoid
- **Calling Amadeus/BLS in user request path:** Every external API call adds 200-2000ms latency and risks failure. Always serve from cache.
- **Using the `amadeus` npm SDK in Next.js 16:** CJS-only package without `exports` field. Will require `serverExternalPackages` config and may still break. Use direct fetch.
- **Storing API secrets in client-side code:** Both API clients are server-only. Keep in `src/lib/api/` and only import from route handlers / cron jobs.
- **Using BLS API v1 (unregistered):** Limited to 25 queries/day. Register for v2 (free) to get 500 queries/day.
- **Not validating API responses with zod:** External APIs can return unexpected shapes. Validate before caching.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth2 token management | Full OAuth library | Simple in-memory cache with `fetch` | Amadeus uses plain client_credentials grant, token lasts 30min. ~15 lines of code. |
| Monthly quota tracking | Custom DB table or file | Redis INCR + TTL | Atomic, auto-expiring, zero maintenance. Already have `@upstash/redis`. |
| Rate limiting cron endpoints | Custom middleware | Existing `CRON_SECRET` pattern | Already proven in `api/cron/scrape/route.ts`. |
| CPI inflation calculation | Custom statistics library | Simple year-over-year percentage | BLS returns raw index values. One division gives you the rate. |
| Cache key management | Custom cache layer | Existing `cacheGet`/`cacheSet` from `redis.ts` | Already handles graceful degradation, dev fallback, TTL presets. |

**Key insight:** Both APIs are simple REST endpoints with straightforward auth. The complexity is in the caching/scheduling architecture, not the API calls themselves. The existing Redis infrastructure handles 90% of what's needed.

## Common Pitfalls

### Pitfall 1: Amadeus Test Environment Returns Fake Data
**What goes wrong:** Test environment (`test.api.amadeus.com`) returns limited, synthetic data. Prices are not real.
**Why it happens:** Amadeus test env is for development only, not real pricing data.
**How to avoid:** Use production environment (`api.amadeus.com`) for real data. Requires requesting a Production Key from Amadeus after initial development.
**Warning signs:** Prices seem unrealistic or limited route availability.

### Pitfall 2: OAuth Token Expiry Mid-Request
**What goes wrong:** Token expires during a batch warming job that takes several minutes.
**Why it happens:** Amadeus tokens expire after ~30 minutes (1799 seconds). A large batch of requests could span that window.
**How to avoid:** Check token expiry before each request with a 60-second buffer. Refresh proactively.
**Warning signs:** Intermittent 401 errors during cron jobs.

### Pitfall 3: Vercel Cron Function Timeout
**What goes wrong:** Flight warming cron tries to pre-cache 50+ airport pairs but times out.
**Why it happens:** Vercel Hobby plan has 10s function timeout; Pro has 60s (configurable up to 5 min). Each Amadeus API call takes 500ms-2s.
**How to avoid:** Batch airport pairs into groups. Use `maxDuration` export in route handler (Pro plan). Alternatively, warm only the most popular pairs (top 20-30 routes).
**Warning signs:** Cron job returns 504 or partial results.

### Pitfall 4: Amadeus Quota Exhaustion Without Detection
**What goes wrong:** Monthly quota burns through unnoticed, then all API calls fail.
**Why it happens:** No tracking mechanism. 2000 calls/month sounds like a lot but 50 airport pairs x weekly warm = 200/week = 800/month just for warming.
**How to avoid:** Redis INCR counter checked before every API call. Soft limit at 1800 triggers cache-only mode. Log quota usage.
**Warning signs:** Approaching 1500 calls mid-month.

### Pitfall 5: BLS API Returns No Annual Average for Current Year
**What goes wrong:** Requesting current year's M13 (annual average) period returns nothing because it's only published after year-end.
**Why it happens:** BLS annual averages are published in January/February for the previous year. Current year only has monthly data.
**How to avoid:** Fall back to computing rate from most recent 12 months of monthly data (M01-M12). Check for M13 first, then compute from monthlies.
**Warning signs:** Empty annual data for current year, stale CPI values.

### Pitfall 6: Race Condition in Quota Counter
**What goes wrong:** Two simultaneous cron invocations both pass the quota check and both make API calls.
**Why it happens:** Check-then-act is not atomic.
**How to avoid:** Use Redis INCR (atomic) and check AFTER incrementing. If over limit, decrement back. Never check-then-increment.
**Warning signs:** Actual API calls exceed the soft limit.

### Pitfall 7: Cache Key Collisions Between Airport Pairs
**What goes wrong:** `flight:DEN:MCO` and `flight:MCO:DEN` are different routes but might be confused.
**Why it happens:** Origin/destination order matters for one-way searches.
**How to avoid:** Consistent key format: `flight:{origin}:{destination}` always in origin-first order. For round-trip estimates, store both directions.
**Warning signs:** Wrong prices displayed for return flights.

## Code Examples

### Amadeus Flight Offers Search GET Request
```typescript
// Source: https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search/api-reference
// GET /v2/shopping/flight-offers

const params = new URLSearchParams({
  originLocationCode: "DEN",          // IATA code
  destinationLocationCode: "MCO",     // IATA code
  departureDate: "2026-09-15",        // YYYY-MM-DD
  adults: "1",
  nonStop: "false",
  currencyCode: "USD",
  max: "5",                           // limit results
});

const response = await fetch(
  `https://api.amadeus.com/v2/shopping/flight-offers?${params}`,
  { headers: { Authorization: `Bearer ${accessToken}` } }
);

// Response shape:
// { data: [{ price: { grandTotal: "247.36", currency: "USD" }, validatingAirlineCodes: ["UA"], ... }] }
```

### BLS CPI API v2 POST Request
```typescript
// Source: https://www.bls.gov/developers/api_signature_v2.htm
// POST https://api.bls.gov/publicAPI/v2/timeseries/data/

const response = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    seriesid: ["CUUR0000SA0"],     // CPI-U, All Items, US City Average
    startyear: "2024",
    endyear: "2025",
    registrationkey: process.env.BLS_API_KEY,
  }),
});

// Response shape:
// {
//   status: "REQUEST_SUCCEEDED",
//   Results: {
//     series: [{
//       seriesID: "CUUR0000SA0",
//       data: [
//         { year: "2025", period: "M12", periodName: "December", value: "320.352" },
//         { year: "2025", period: "M13", periodName: "Annual", value: "318.241" },
//         ...
//       ]
//     }]
//   }
// }
```

### Redis Quota Tracking with INCR
```typescript
// Source: Upstash Redis INCR pattern

async function trackAmadeusCall(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;

  const key = "amadeus:monthly_calls";
  const count = await redis.incr(key);

  // Set TTL on first call of the month
  if (count === 1) {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const ttl = Math.ceil((endOfMonth.getTime() - now.getTime()) / 1000);
    await redis.expire(key, ttl);
  }

  if (count > 1800) {
    await redis.decr(key); // roll back
    return false;
  }

  return true;
}
```

### Graceful Degradation Pattern
```typescript
// Wrapping API results in VerifiedDatum with fallback

import { verified, estimated } from "@/lib/engine/verified-datum";

function getFlightPrice(
  origin: string,
  destination: string,
  cachedData: { price: number; queriedAt: string } | null,
  staticFallback: number,
) {
  if (cachedData) {
    return verified(
      cachedData.price,
      "https://api.amadeus.com/v2/shopping/flight-offers",
      cachedData.queriedAt,
      "Amadeus Flight Offers Search",
    );
  }
  return estimated(staticFallback, "Static average from flight-hubs.ts");
}
```

### Cron Job with CRON_SECRET Auth
```typescript
// Source: existing pattern from src/app/api/cron/scrape/route.ts

export async function GET(request: NextRequest) {
  // Auth: Vercel injects CRON_SECRET as Bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... cron logic here
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Amadeus SDK (CJS) | Direct REST with fetch | 2024+ (ESM ecosystem shift) | Avoids CJS bundling issues in modern Next.js |
| BLS API v1 (no auth) | BLS API v2 (registered) | Always available | 500 vs 25 daily queries, annual averages, percent changes |
| Hardcoded inflation rate | Real CPI data via API | This phase | Trustworthy projections with source attribution |
| Static flight averages | Cached Amadeus pricing | This phase | Real fare data with "verified" confidence |

**Deprecated/outdated:**
- `amadeus` npm v11: Uses Babel + `babel-plugin-add-module-exports`. No ESM `exports` field. Still works via CJS `require()` but increasingly risky in ESM-first bundlers.
- BLS API v1: Limited to 25 queries/day. No reason to use it when v2 registration is free.

## Open Questions

1. **Amadeus Production Key Approval Timeline**
   - What we know: Test environment is instant, production requires submitting a form to Amadeus.
   - What's unclear: How long does production key approval take? Days? Weeks?
   - Recommendation: Start the production key request immediately, build against test environment, switch URLs via env var when approved.

2. **Vercel Plan Function Timeout for Cron Jobs**
   - What we know: Hobby = 10s, Pro = 60s (configurable to 5min). Warming 50 airport pairs at ~1s each = 50s minimum.
   - What's unclear: What Vercel plan is this project on?
   - Recommendation: Batch warm into groups of 10-15 pairs per invocation. If on Hobby, chain multiple cron jobs or reduce to top 20 routes. Can also use `maxDuration` export in route handler on Pro plan.

3. **Flight Price Seasonality and Search Date**
   - What we know: Flight prices vary dramatically by season. Hunting seasons are Sep-Nov primarily.
   - What's unclear: Should we search for a generic date (e.g., 2 months out) or hunting-season-specific dates?
   - Recommendation: Search for hunting season dates (e.g., October departures) to get relevant pricing. Store the search date alongside the price in cache.

4. **Where the Inflation Rate Is Actually Consumed**
   - What we know: The codebase has `draw-inflation-risk.ts` (point creep model) and `point-creep.ts`, but these model draw competition inflation, not dollar inflation. The `verified-datum.test.ts` references `estimated(0.03, "Historical 10-year CPI average")` as an example.
   - What's unclear: Where exactly does the 3% assumption currently feed into cost projections? It may be implicit in the roadmap generator's multi-year cost calculations rather than an explicit constant.
   - Recommendation: Audit `roadmap-generator.ts` for any multi-year cost projection logic. The BLS CPI integration should expose a `getInflationRate()` function that replaces wherever 3% is hardcoded or assumed.

5. **Amadeus Free Tier Budget Math**
   - What we know: 2000 free calls/month for Flight Offers Search. Project has ~48 unique airport pairs in `HUNTING_ROUTES`.
   - What's unclear: Weekly warming (4x/month) x 48 pairs = 192 calls. Monthly warming = 48 calls. What's the right cadence?
   - Recommendation: Weekly warming uses only ~10% of quota (192/2000). This is safe. Set soft limit at 1800 to leave buffer for any ad-hoc calls or debugging.

## Sources

### Primary (HIGH confidence)
- [Amadeus Flight Offers Search API Reference](https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search/api-reference) - API parameters, response format
- [Amadeus Authorization / API Keys](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/API-Keys/authorization/) - OAuth2 client_credentials flow, token endpoint URLs
- [Amadeus Test vs Production Environments](https://developers.amadeus.com/blog/test-and-production-environments-for-amadeus-self-service-apis-) - Base URLs, data differences
- [BLS Public Data API v2 Signatures](https://www.bls.gov/developers/api_signature_v2.htm) - Endpoint URL, request format, series IDs
- [BLS API Features Comparison](https://www.bls.gov/bls/api_features.htm) - v1 vs v2 limits (25 vs 500 queries/day)
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs) - Configuration, limits, CRON_SECRET

### Secondary (MEDIUM confidence)
- [Oreate AI - Amadeus Pricing & Quotas 2025](https://www.oreateai.com/blog/navigating-amadeus-selfservice-apis-understanding-pricing-and-quotas-for-2025/853cd266b0c68de77b281f1ab51b5c97) - Free tier: 2000 calls/month for Flight Offers Search, 3000 for Price. Production TPS: 40. Test: 1 req/100ms.
- [amadeus-node GitHub](https://github.com/amadeus4dev/amadeus-node) - SDK v11.1.0, CJS-only, Babel-built, `main: lib/amadeus.js`, no `exports` field
- [amadeus-ts GitHub](https://github.com/darseen/amadeus-ts) - Community fork v5.1.1, TypeScript-native, ESM support, tested with Next.js 15
- [BD Economics BLS API Guide](https://bd-econ.com/blsapi.html) - v2 registration info, POST format, series ID examples

### Tertiary (LOW confidence)
- Amadeus API response latency claims ("millisecond-level") - from marketing materials, actual latency likely 500ms-2s for flight search
- `amadeus` npm weekly downloads and maintenance status - last published ~1 year ago, could indicate low maintenance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using built-in `fetch` + existing `@upstash/redis` + existing `zod`. No new dependencies.
- Architecture: HIGH - Cache-first pattern with cron warming is well-established. Existing Redis infrastructure is proven.
- API contracts: MEDIUM - Amadeus response shape verified via official docs but not runtime-tested. BLS API v2 format verified via multiple sources.
- SDK compatibility: MEDIUM - Official `amadeus` v11 is CJS-only (verified via GitHub package.json). Direct fetch avoids the issue entirely. `amadeus-ts` ESM support is community-maintained.
- Pitfalls: MEDIUM - Quota math and timeout limits based on documented specs, not runtime experience.

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (30 days -- API pricing/limits may change)
