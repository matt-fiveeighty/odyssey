---
phase: 06-api-integrations
plan: 01
subsystem: api
tags: [amadeus, bls, cpi, flight-pricing, oauth2, redis, quota-tracking, inflation]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: "Redis client (getRedis, cacheGet, cacheSet) and VerifiedDatum types"
provides:
  - "Amadeus OAuth2 flight quote client with quota tracking (searchFlightOffers, checkQuotaRemaining, FlightQuote)"
  - "BLS CPI inflation rate client with cache (fetchCpiData, computeAnnualInflationRate, getLatestInflationRate, FALLBACK_INFLATION_RATE)"
affects: [06-api-integrations, results, logistics, roadmap-generator]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Direct REST fetch for external APIs (no SDK) to avoid CJS bundling issues"
    - "Redis INCR atomic quota tracking with auto-expire TTL"
    - "M13 > M12 > fallback inflation rate resolution chain"
    - "Cache-first with graceful degradation to hardcoded constants"

key-files:
  created:
    - src/lib/api/amadeus.ts
    - src/lib/api/bls.ts
  modified: []

key-decisions:
  - "Direct fetch over amadeus npm SDK (CJS-only, bundling risk in Next.js 16)"
  - "Soft quota limit at 1800/2000 monthly Amadeus calls with Redis INCR + auto-expire TTL"
  - "BLS API key optional -- graceful fallback to v1 rate limits when omitted"
  - "3.5% FALLBACK_INFLATION_RATE exported as shared constant for downstream consumers"

patterns-established:
  - "API client pattern: src/lib/api/*.ts for pure server-side library code with no route handlers"
  - "Quota tracking via Redis INCR with rollback on over-limit"
  - "Three-tier inflation resolution: cache > live API > hardcoded fallback"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 6 Plan 1: API Client Modules Summary

**Amadeus OAuth2 flight quote client and BLS CPI inflation client with Redis quota tracking and 30-day cache -- zero new dependencies**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-22T18:33:04Z
- **Completed:** 2026-02-22T18:35:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Amadeus flight quote client with OAuth2 token caching (60s refresh buffer), Redis INCR quota tracking (1800 soft limit), and cheapest-offer extraction
- BLS CPI client with annual inflation rate computation (M13 > M12 > 3.5% fallback chain) and 30-day Redis cache
- Both clients use direct fetch (no npm SDKs) and handle all errors gracefully (null/empty/fallback, never throw)

## Task Commits

Each task was committed atomically:

1. **Task 1: Amadeus flight quote client with OAuth2 and quota tracking** - `2c8159c` (feat)
2. **Task 2: BLS CPI client with inflation rate computation and cache** - `d22622e` (feat)

## Files Created/Modified
- `src/lib/api/amadeus.ts` - Amadeus OAuth2 + flight search + Redis quota tracking
- `src/lib/api/bls.ts` - BLS CPI fetch + inflation rate computation + Redis cache

## Decisions Made
- Used direct `fetch` instead of `amadeus` npm SDK -- SDK is CJS-only with no `exports` field, bundling risk in Next.js 16
- Soft quota limit at 1800/2000 to leave buffer for debugging/ad-hoc calls
- BLS API key is optional -- omits `registrationkey` from request body when `BLS_API_KEY` env var is unset, falling back to v1 rate limits (25/day vs 500/day)
- Exported `FALLBACK_INFLATION_RATE = 0.035` as a shared constant so downstream consumers (PortfolioOverview, HeroSummary) can reference it directly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** The plan's `user_setup` frontmatter documents:

**Amadeus:**
- `AMADEUS_CLIENT_ID` - from https://developers.amadeus.com/my-apps
- `AMADEUS_CLIENT_SECRET` - from https://developers.amadeus.com/my-apps
- `AMADEUS_PRODUCTION` - set to `"true"` for production, omit for test

**BLS:**
- `BLS_API_KEY` - from https://data.bls.gov/registrationEngine/ (optional, increases quota from 25 to 500 queries/day)

## Next Phase Readiness
- Both API client modules are ready for consumption by route handlers and cron jobs in Plan 06-02
- No new npm dependencies were added -- everything uses built-in `fetch` and existing `@upstash/redis`
- Quota tracking and cache patterns are established and ready for the warm-flights and refresh-cpi cron jobs

## Self-Check: PASSED

- FOUND: src/lib/api/amadeus.ts
- FOUND: src/lib/api/bls.ts
- FOUND: .planning/phases/06-api-integrations/06-01-SUMMARY.md
- FOUND: commit 2c8159c
- FOUND: commit d22622e

---
*Phase: 06-api-integrations*
*Completed: 2026-02-22*
