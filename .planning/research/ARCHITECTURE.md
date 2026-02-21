# Architecture Patterns

**Domain:** Autonomous hunting advisor data pipeline + feature systems
**Researched:** 2026-02-21
**Overall confidence:** HIGH (based on deep codebase analysis + verified Next.js 16 / Vercel docs)

## Executive Summary

The current Odyssey Outdoors codebase already has substantial infrastructure that this milestone builds on: 15 state scrapers with a `BaseScraper` class, a GitHub Actions weekly workflow, a Supabase-backed `DataContext` merge layer, and Upstash Redis for rate limiting. The constraint is "no database this milestone" -- meaning the existing Supabase integration stays (it's already wired), but no new database schemas are introduced. The data pipeline architecture leverages what exists and adds three new layers: a `VerifiedDatum<T>` provenance wrapper, external API integration (Amadeus/BLS), and server-side data serving endpoints.

The architecture divides into six systems with clear boundaries: (1) Scraper Layer (already exists, needs enrichment), (2) Data Store (Supabase tables already exist, add KV cache via Upstash Redis), (3) VerifiedDatum Provenance Layer (new TypeScript wrapper), (4) API Integration Layer (Amadeus + BLS), (5) Serving Layer (calendar, share links, data endpoints), and (6) Client Consumption (Zustand + engine, already exists).

## Recommended Architecture

### System Overview

```
                                    SCRAPER LAYER
                                    (GitHub Actions)
                                         |
  State F&G Sites -----> BaseScraper ----+----> Supabase (ref_units,
  (HTML/PDF/CSV)         15 scrapers     |      scraped_deadlines,
                                         |      scraped_fees, etc.)
                                         |
                                    DATA STORE
                                    (Supabase + Upstash Redis)
                                         |
  External APIs -----> API Integration --+----> Upstash Redis
  (Amadeus, BLS)        Layer            |      (flight cache, CPI cache)
                                         |
                                    PROVENANCE LAYER
                                    (VerifiedDatum<T> wrapper)
                                         |
                              +----------+----------+
                              |          |          |
                         API Routes   .ics       Share
                         (data)      Calendar    Links
                              |     Endpoint   Endpoint
                              |          |          |
                                    CLIENT LAYER
                                    (Zustand + Engine)
```

### Component Boundaries

| Component | Responsibility | Communicates With | Files |
|-----------|---------------|-------------------|-------|
| **Scraper Layer** | Fetch, parse, validate raw data from 15 state F&G websites | Supabase (write), GitHub Actions (orchestration) | `scripts/scrapers/*.ts`, `.github/workflows/scrape-draw-data.yml` |
| **Data Store** | Persist scraped data, cache API responses, serve merged data | Scraper Layer (receives), Serving Layer (provides) | `src/lib/db/states.ts`, `src/lib/engine/data-loader.ts`, Supabase tables |
| **Provenance Layer** | Wrap every datum with source URL, scrape date, confidence | Data Store (reads), all consumers (provides) | `src/lib/engine/verified-datum.ts` (new) |
| **API Integration Layer** | Fetch real-time data from external APIs (Amadeus, BLS) | Upstash Redis (cache), Serving Layer (provides) | `src/lib/api/amadeus.ts`, `src/lib/api/bls.ts` (new) |
| **Serving Layer** | Expose data through App Router route handlers | Data Store, Provenance Layer, Client Layer | `src/app/api/` route handlers |
| **Client Layer** | Consume verified data, render UI, persist user state | Serving Layer (reads), Zustand (persists) | `src/lib/store.ts`, `src/lib/engine/*.ts`, components |

## Data Flow

### Primary Pipeline: Scrape -> Store -> Serve -> Consume

```
1. SCRAPE (Weekly - GitHub Actions)
   State F&G Website
     -> BaseScraper.fetchPage() (retry + backoff + User-Agent)
     -> Parse (HTML regex / CSV parse / PDF extract)
     -> Validate (Zod schemas in schemas.ts)
     -> Upsert to Supabase (ref_units, scraped_deadlines, scraped_fees, etc.)
     -> Log to data_import_log

2. STORE (Supabase + Upstash Redis)
   Supabase: Authoritative scraped data (units, draw history, deadlines, fees, seasons)
   Upstash Redis: Volatile caches (flight prices 6h TTL, CPI data 30d TTL, share link data 90d TTL)

3. SERVE (Next.js Route Handlers)
   GET /api/states         -> Merged data (DB > constants fallback)
   GET /api/states/[id]    -> Single state with provenance
   GET /api/flights/quote  -> Amadeus cached lookup
   GET /api/inflation/cpi  -> BLS cached lookup
   GET /api/cal/[token]    -> .ics calendar subscription
   GET /api/share/[token]  -> Shared plan JSON

4. CONSUME (Client)
   data-loader.ts loads DataContext (already exists)
     -> Engine functions consume DataContext
     -> VerifiedDatum<T> propagates to UI components
     -> Freshness badges render based on provenance metadata
```

### VerifiedDatum<T> Propagation

This is the core architectural innovation. Every piece of data displayed to users carries provenance metadata.

```typescript
// src/lib/engine/verified-datum.ts

export type DataConfidence = "verified" | "estimated" | "stale" | "user_reported";

export interface VerifiedDatum<T> {
  value: T;
  source: {
    url: string;           // "https://cpw.state.co.us/..."
    scrapedAt: string;     // ISO date of last scrape
    label: string;         // "Colorado Parks & Wildlife"
  };
  confidence: DataConfidence;
  staleDays: number | null;  // Days since scrapedAt
  isStale: boolean;          // staleDays > threshold
}

// Factory functions
export function verified<T>(value: T, sourceUrl: string, scrapedAt: string, label: string): VerifiedDatum<T>;
export function estimated<T>(value: T, basis: string): VerifiedDatum<T>;
export function userReported<T>(value: T, reportedAt: string): VerifiedDatum<T>;

// Unwrap helper for engine functions that don't need provenance
export function unwrap<T>(datum: VerifiedDatum<T>): T;

// Batch wrapper for arrays
export function verifyBatch<T>(items: T[], sourceUrl: string, scrapedAt: string, label: string): VerifiedDatum<T>[];
```

**Propagation Rules:**

1. **Scraper output** -> Always `verified` with source URL and scrape timestamp
2. **Constants fallback** -> `estimated` with note "Hardcoded estimate from [year]"
3. **API responses** (Amadeus/BLS) -> `verified` with API URL and response timestamp
4. **User-reported data** (draw results) -> `user_reported` with submission timestamp
5. **Derived calculations** -> Inherit the lowest confidence of inputs (e.g., if draw odds are `verified` but creep rate is `estimated`, the projection is `estimated`)
6. **Stale threshold** -> 10 days for weekly data, 365 days for annual data

**Where VerifiedDatum wraps:**

| Data | Wrapped At | Consumed By |
|------|-----------|-------------|
| Fee amounts | `data-loader.ts` merge step | `fee-resolver.ts`, cost calculations, UI |
| Deadline dates | `data-loader.ts` merge step | Calendar, dashboard, UI |
| Draw odds | `draw-odds.ts` | Opportunity scorer, results display |
| Flight prices | `amadeus.ts` response handler | Travel logistics, cost calculator |
| CPI/Inflation | `bls.ts` response handler | `draw-inflation-risk.ts`, projections |
| Tag costs | `data-loader.ts` merge step | `roi-calculator.ts`, budget breakdown |
| Success rates | `data-loader.ts` merge step | Unit scoring, results display |

**Important: Gradual adoption.** The engine currently consumes raw `State` and `Unit` types. Wrapping every field in `VerifiedDatum<T>` all at once would require rewriting every engine function. Instead:

- **Phase 1:** Add `VerifiedDatum` type and factory functions. Add provenance fields to `State` and `Unit` types (the `sourceUrl`, `lastScrapedAt`, `dataVersion` fields already exist on State).
- **Phase 2:** Wrap fee amounts, deadlines, and tag costs (the most user-visible numbers).
- **Phase 3:** Propagate to UI with freshness badges.
- **Phase 4:** Wrap derived calculations (draw odds projections, cost estimates).

### External API Integration

#### Amadeus Flight Pricing

```
Client requests flight estimate for state
  -> GET /api/flights/quote?from=DEN&to=BZN&month=10
  -> Route handler checks Upstash Redis cache (key: flight:DEN:BZN:2026-10, TTL: 6h)
  -> Cache miss: call Amadeus Flight Offers API
  -> Wrap response in VerifiedDatum with Amadeus API URL + timestamp
  -> Cache in Upstash Redis
  -> Return to client
```

```typescript
// src/lib/api/amadeus.ts

interface FlightQuote {
  price: VerifiedDatum<number>;   // Lowest fare found
  airline: string;
  duration: string;
  stops: number;
  searchedAt: string;
}

// Rate limit: 2K calls/month free tier
// Strategy: Cache aggressively (6h for real-time, 7d for seasonal averages)
// Fallback: Return estimated price from flight-hubs.ts constants
```

**Budget management:** Track monthly API calls in Upstash Redis counter (`amadeus:calls:2026-02`). When approaching 1800/2000 limit, switch to cache-only mode with stale responses. Never hard-fail -- always fall back to `estimated` constants.

#### BLS CPI/Inflation Data

```
Engine needs inflation rate for cost projection
  -> Import from src/lib/api/bls.ts
  -> Check Upstash Redis cache (key: bls:cpi:latest, TTL: 30d)
  -> Cache miss: call BLS Series API (series CUUR0000SA0)
  -> Parse response, calculate YoY rate
  -> Wrap in VerifiedDatum with BLS API URL + data period
  -> Cache in Upstash Redis (30 day TTL -- CPI updates monthly)
  -> Return to consumer
```

```typescript
// src/lib/api/bls.ts

interface InflationData {
  annualRate: VerifiedDatum<number>;     // e.g., 3.2
  latestCpiValue: VerifiedDatum<number>; // e.g., 314.5
  period: string;                         // "2025-12"
  seriesId: string;                       // "CUUR0000SA0"
}

// Rate limit: 500 calls/day free tier (no API key needed for v2)
// Strategy: Cache 30 days (CPI publishes monthly)
// Fallback: Return estimated 3.0% from engine constants
```

### Calendar Subscription Endpoint

The existing `calendar-export.ts` generates .ics files for browser download. The new `.ics` subscription endpoint serves a dynamically-generated calendar that calendar apps (Google Calendar, Apple Calendar) can subscribe to and auto-refresh.

```
User clicks "Subscribe to Calendar"
  -> App generates a calendar token (plan data hash + creation timestamp)
  -> Stores plan snapshot in Upstash Redis (key: cal:{token}, TTL: 365d)
  -> Returns webcal:// URL: webcal://odysseyoutdoors.com/api/cal/{token}
  -> User adds to Google Calendar / Apple Calendar

Calendar app polls URL periodically (typically every 12-24h):
  -> GET /api/cal/{token}
  -> Route handler retrieves plan snapshot from Upstash Redis
  -> Generates full .ics VCALENDAR with all deadlines + milestones
  -> Returns with Content-Type: text/calendar
  -> Calendar app syncs events
```

```typescript
// src/app/api/cal/[token]/route.ts

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Retrieve plan data from Upstash Redis
  const redis = getRedis();
  const planData = await redis?.get(`cal:${token}`);
  if (!planData) {
    return new Response("Calendar not found", { status: 404 });
  }

  // Generate .ics content using existing buildICS logic (refactored from calendar-export.ts)
  const icsContent = generateSubscriptionCalendar(planData);

  return new Response(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="odyssey-hunt-plan.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
```

**Key architectural decisions for calendar:**

1. **Refactor `calendar-export.ts`** -- Extract `buildICS()` into a shared module that works both client-side (download) and server-side (subscription endpoint). The current implementation uses `document.createElement` for download, which is client-only.
2. **Store plan snapshots, not references** -- The .ics endpoint receives a serialized plan snapshot in Redis, not a reference to live Zustand state (which is client-side). When the user updates their plan, they regenerate the calendar token.
3. **No auth needed** -- The token IS the auth. Long random token (32+ chars) provides security through obscurity. Token can be revoked by deleting from Redis.
4. **Calendar refresh** -- When the user modifies their plan, prompt them to regenerate the calendar subscription. The old token keeps working with the old data until TTL expires.

### Shareable Plan URLs

Share links use the same token-based pattern as calendar subscriptions but serve a read-only UI.

```
User clicks "Share Plan"
  -> App serializes current StrategicAssessment from Zustand
  -> POST /api/share
  -> Route handler generates token, stores assessment in Upstash Redis (key: share:{token}, TTL: 90d)
  -> Returns share URL: https://odysseyoutdoors.com/shared/{token}

Recipient visits share URL:
  -> GET /shared/{token} (Next.js page route, not API route)
  -> Server component fetches plan data from Upstash Redis
  -> Renders read-only ResultsShell with shared data
  -> No Zustand interaction (pure server render)
```

```typescript
// src/app/api/share/route.ts (POST - create share link)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = generateShareToken(); // crypto.randomUUID() or similar
  const redis = getRedis();

  await redis?.set(`share:${token}`, JSON.stringify(body), {
    ex: 90 * 24 * 60 * 60, // 90 day TTL
  });

  return Response.json({
    token,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/shared/${token}`,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

// src/app/shared/[token]/page.tsx (read-only view)
export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const planData = await getSharedPlan(token); // Reads from Upstash Redis

  if (!planData) {
    notFound();
  }

  return <SharedResultsShell assessment={planData} />;
}
```

**Key architectural decisions for share links:**

1. **Upstash Redis, not Supabase** -- Share link data is ephemeral (90d TTL). Redis TTL handles expiry automatically. No schema changes needed.
2. **Server component rendering** -- The shared plan page is a server component that fetches data and renders read-only. No Zustand involvement.
3. **Snapshot, not live link** -- The shared plan is a point-in-time snapshot. If the creator updates their plan, the shared link still shows the original. This is intentional -- share links are for "look at my plan" not "collaborate on my plan."
4. **Size constraints** -- A full `StrategicAssessment` serialized is ~15-30KB. Upstash Redis free tier allows 256MB. At 30KB per share, that is ~8,500 active share links -- more than sufficient.
5. **Rate limiting** -- Use existing `limiters.guest` rate limiter to prevent abuse of share link creation.

## Cron Job Architecture

### Current State

The scraping infrastructure already exists and is well-architected:

| Component | Status | Details |
|-----------|--------|---------|
| `BaseScraper` class | Exists | Abstract class with retry, CSV parsing, Zod validation, DB upsert |
| 15 state scrapers | Exist | CO, WY, MT, NV, AZ, UT, NM, OR, ID, KS, AK, WA, NE, SD, ND |
| GitHub Actions workflow | Exists | Weekly Sunday 6AM UTC, manual dispatch, failure alerting |
| Vercel Cron trigger | Exists | `vercel.json` cron at `0 6 * * 0`, fires GitHub Actions via API |
| `data-loader.ts` | Exists | Merges DB data with constants, 5min in-memory cache |
| `data_import_log` | Exists | Per-state run tracking with error logging |
| Admin status endpoint | Exists | `/api/admin/scraper-status` with freshness scoring |

### Additional Cron Jobs Needed

| Job | Schedule | Where | What |
|-----|----------|-------|------|
| BLS CPI refresh | `0 12 15 * *` (monthly, 15th at noon) | Vercel Cron -> API route | Fetch latest CPI data from BLS, cache in Upstash Redis |
| Leftover tag check | `0 8 * * 1,4` (Mon/Thu 8AM UTC) | Vercel Cron -> triggers GH Action | Scrape leftover tag pages (Jul-Sep only, skip other months) |
| Flight price warm | `0 10 1 * *` (monthly, 1st at 10AM) | Vercel Cron -> API route | Pre-cache popular airport pairs for next 3 months |
| Share link cleanup | Not needed | N/A | Upstash Redis TTL handles expiry automatically |

**Vercel Cron constraints (current plan):**
- Hobby: Once per day minimum, hourly precision. The weekly scrape cron already exists.
- Pro: Per-minute precision. If on Pro, leftover tag checks can run Mon/Thu.
- All crons limited to 100 per project (plenty of headroom).
- Crons trigger GET requests to route handlers -- actual scraping happens in GitHub Actions (handles the 45min timeout, which exceeds Vercel function limits).

### Scraper Enrichment (No New Scrapers, Enhance Existing)

The 15 state scrapers already implement `scrapeUnits()` and `scrapeDrawHistory()`. The optional methods need implementation per-state:

| Method | States Needing Implementation | Priority |
|--------|-------------------------------|----------|
| `scrapeDeadlines()` | All 15 (some may already have partial) | HIGH -- feeds calendar |
| `scrapeFees()` | All 15 (critical for cost accuracy) | HIGH -- feeds VerifiedDatum |
| `scrapeSeasons()` | All 15 (feeds intra-year calendar) | MEDIUM |
| `scrapeLeftoverTags()` | CO, WY, MT, AZ, NV, UT, OR, ID | MEDIUM -- feeds discovery |
| `scrapeRegulations()` | All 15 (feeds "what changed" diff) | LOW |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Scraping
**What:** Running fetch calls to state F&G websites from the browser.
**Why bad:** CORS blocks it, exposes scraping logic, can't respect rate limits, can't run on schedule.
**Instead:** All scraping runs in GitHub Actions (server-side, no CORS, full Node.js environment). Already correctly implemented.

### Anti-Pattern 2: Inline Scraping in API Routes
**What:** Running heavy scraping inside Vercel serverless functions.
**Why bad:** Vercel function timeout is 10s (Hobby) / 60s (Pro). Full scrape takes 10-45 minutes. Functions also have cold start latency.
**Instead:** Vercel Cron fires a lightweight endpoint that dispatches GitHub Actions. The API route returns immediately after triggering the workflow. Already correctly implemented in `/api/cron/scrape/route.ts`.

### Anti-Pattern 3: Wrapping VerifiedDatum<T> Around Everything at Once
**What:** Refactoring every engine function to accept `VerifiedDatum<T>` inputs and return `VerifiedDatum<T>` outputs simultaneously.
**Why bad:** Massive refactor touching 20+ engine files. High risk of breaking the consultation wizard. No incremental value -- users see the same results until UI badges are added.
**Instead:** Add provenance metadata to the data layer (source URL, scrape date on State/Unit types -- mostly already there). Wrap UI-facing numbers gradually. Engine functions can use `unwrap()` to extract raw values internally.

### Anti-Pattern 4: Storing Share Links in Zustand
**What:** Saving shared plan data in the creator's browser localStorage.
**Why bad:** The recipient cannot access the creator's localStorage. Share links must be server-accessible.
**Instead:** Store share link snapshots in Upstash Redis (server-side, accessible by anyone with the token).

### Anti-Pattern 5: Polling APIs on Every Page Load
**What:** Fetching Amadeus flight prices or BLS CPI data on every client request.
**Why bad:** Blows through API rate limits immediately. Flight prices don't change per-second.
**Instead:** Cache in Upstash Redis with appropriate TTLs. Flight prices: 6h. CPI: 30 days. Serve from cache, refresh on cron schedule or cache miss.

### Anti-Pattern 6: Generating .ics on the Client for Subscriptions
**What:** Using the existing `downloadICS()` client function for calendar subscriptions.
**Why bad:** Calendar subscriptions require a persistent URL that the calendar app can poll. Client-side blob downloads are one-shot, not subscribable.
**Instead:** Server-side .ics generation via a GET endpoint. Refactor `buildICS()` into a shared isomorphic module.

## Patterns to Follow

### Pattern 1: Constants-First with DB Override
**What:** Every data point has a hardcoded constant as fallback. DB/scraped data overrides when available.
**When:** All data access paths.
**Why:** The app never breaks when the database is unavailable or a scraper fails. Already implemented in `data-loader.ts` (`mergeUnits`, `mergeDeadlines`).

```typescript
// Existing pattern in data-loader.ts — extend to all new data types
const mergedUnits = mergeUnits(dbUnits ?? [], SAMPLE_UNITS);
const mergedStates = mergeDeadlines(STATES, dbDeadlines ?? []);
```

### Pattern 2: Lazy Redis Client
**What:** Create Redis client on first use, return null if credentials missing.
**When:** All Upstash Redis access.
**Why:** App works in development without Upstash configured. Already implemented in `rate-limit.ts`.

```typescript
// Existing pattern in rate-limit.ts — reuse for all Redis operations
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}
```

### Pattern 3: Graceful API Degradation
**What:** External API failures return estimated values, never errors.
**When:** Amadeus, BLS, or any external data source.
**Why:** A flight pricing API outage should never break the consultation wizard.

```typescript
async function getFlightPrice(from: string, to: string, month: number): Promise<VerifiedDatum<number>> {
  try {
    const cached = await redis?.get(`flight:${from}:${to}:${month}`);
    if (cached) return verified(cached.price, "Amadeus API", cached.fetchedAt, "Amadeus Flight Offers");

    const price = await callAmadeusAPI(from, to, month);
    await redis?.set(`flight:${from}:${to}:${month}`, { price, fetchedAt: new Date().toISOString() }, { ex: 21600 });
    return verified(price, "Amadeus API", new Date().toISOString(), "Amadeus Flight Offers");
  } catch {
    // Fallback to hardcoded estimate from flight-hubs.ts
    const estimate = getStaticFlightEstimate(from, to);
    return estimated(estimate, "Historical average from 2024");
  }
}
```

### Pattern 4: Isomorphic .ics Generation
**What:** Single `buildICS()` function that works both client-side (download) and server-side (subscription).
**When:** Calendar export and subscription.

```typescript
// src/lib/calendar/ics-builder.ts (new shared module)
// Extracted from current calendar-export.ts, removing DOM dependencies

export function buildICS(events: CalendarEvent[]): string {
  // Pure string generation — no DOM APIs
  // ... (existing logic from calendar-export.ts)
}

// Client usage (download)
import { buildICS } from "@/lib/calendar/ics-builder";
function downloadICS(events: CalendarEvent[], filename: string) {
  const ics = buildICS(events);
  const blob = new Blob([ics], { type: "text/calendar" });
  // ... DOM download logic
}

// Server usage (subscription endpoint)
import { buildICS } from "@/lib/calendar/ics-builder";
export async function GET() {
  const events = await getCalendarEvents(token);
  const ics = buildICS(events);
  return new Response(ics, { headers: { "Content-Type": "text/calendar" } });
}
```

## Build Order (Dependencies)

The following build order respects dependencies -- each phase builds on the previous.

```
Phase 1: VerifiedDatum<T> Type System
  No dependencies. Pure TypeScript types + factory functions.
  Output: src/lib/engine/verified-datum.ts
  Enables: Provenance badges in UI, trust signals

Phase 2: Upstash Redis Data Layer
  Depends on: Upstash Redis already configured (rate-limit.ts proves it works)
  Output: src/lib/redis.ts (shared client), cache helpers
  Enables: Share links, calendar subscriptions, API caching

Phase 3: API Integrations (Amadeus + BLS)
  Depends on: Phase 2 (Redis caching)
  Output: src/lib/api/amadeus.ts, src/lib/api/bls.ts
  Enables: Real flight prices, real inflation data

Phase 4: Scraper Enrichment
  Depends on: Phase 1 (VerifiedDatum for provenance tracking)
  Output: Enhanced BaseScraper methods (fees, deadlines, seasons, leftovers)
  Enables: Live data replacing constants

Phase 5: Calendar Subscription Endpoint
  Depends on: Phase 2 (Redis for plan storage), Phase 4 (enriched deadlines/seasons)
  Output: /api/cal/[token]/route.ts, refactored ics-builder.ts
  Enables: Google Calendar subscription

Phase 6: Share Link System
  Depends on: Phase 2 (Redis for plan storage)
  Output: /api/share/route.ts, /shared/[token]/page.tsx
  Enables: Viral sharing, read-only plan views

Phase 7: Data Freshness UI
  Depends on: Phase 1 (VerifiedDatum), Phase 4 (enriched scrapers)
  Output: FreshnessBadge component, provenance tooltips
  Enables: User-facing trust signals
```

## Scalability Considerations

| Concern | Current (100 users) | At 10K users | At 100K users |
|---------|---------------------|--------------|---------------|
| Scraper load | 15 scrapers weekly, no issue | Same -- scraping is independent of user count | Same -- scraped data is shared |
| Upstash Redis storage | <1MB (rate limits only) | ~50MB (share links + calendar + caches) | ~500MB (may need paid tier) |
| Amadeus API calls | <100/month | ~1500/month (near free tier limit) | Need paid tier or longer cache TTLs |
| BLS API calls | 1/month | 1/month (data is global, not per-user) | 1/month |
| Share link reads | <100/month | ~5K/month | ~50K/month (Redis handles fine) |
| Calendar polls | <100/day | ~2K/day | ~20K/day (Vercel function invocations) |
| Vercel function invocations | Well within hobby tier | Pro tier recommended | Enterprise or consider edge functions |

## File Structure (Proposed)

```
src/
  lib/
    api/
      amadeus.ts          # Amadeus flight pricing client + cache
      bls.ts              # BLS CPI/inflation client + cache
    calendar/
      ics-builder.ts      # Isomorphic .ics generation (extracted from calendar-export.ts)
      calendar-export.ts  # Client-side download wrapper (uses ics-builder.ts)
    engine/
      verified-datum.ts   # VerifiedDatum<T> type, factory functions, unwrap helpers
      data-loader.ts      # (existing) Enhanced with VerifiedDatum wrapping
    redis.ts              # Shared Upstash Redis client (extracted from rate-limit.ts)
  app/
    api/
      cal/
        [token]/
          route.ts        # GET — .ics calendar subscription
      share/
        route.ts          # POST — create share link
      flights/
        quote/
          route.ts        # GET — cached Amadeus flight quote
      inflation/
        cpi/
          route.ts        # GET — cached BLS CPI data
      cron/
        refresh-cpi/
          route.ts        # GET — monthly CPI refresh (Vercel Cron)
        warm-flights/
          route.ts        # GET — monthly flight cache warm (Vercel Cron)
    shared/
      [token]/
        page.tsx          # Read-only shared plan view
```

## Sources

- Next.js 16 Route Handlers documentation (verified via WebFetch, v16.1.6, updated 2026-02-20) -- confirms non-UI Response patterns, dynamic route params, Content-Type headers, segment config
- Vercel Cron Jobs documentation (verified via WebFetch) -- confirms Hobby: daily minimum, Pro: per-minute; max 100 crons per project; UTC timezone
- Vercel KV deprecated December 2024, replaced by Upstash Redis Marketplace integration (verified via WebFetch)
- Existing codebase analysis: `base-scraper.ts` (680 lines), `data-loader.ts` (294 lines), `calendar-export.ts` (141 lines), `rate-limit.ts` (63 lines), `guest-token.ts` (38 lines), `vercel.json`, `scrape-draw-data.yml`
- Existing Upstash Redis integration confirmed in `rate-limit.ts` via `@upstash/redis` and `@upstash/ratelimit` packages
