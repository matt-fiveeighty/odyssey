---
phase: 01-data-foundation
plan: 03
subsystem: engine
tags: [redis, supabase, caching, three-tier-resolution, graceful-degradation]

# Dependency graph
requires:
  - "01-01: VerifiedDatum type system (STALE_THRESHOLD_DAYS alignment)"
  - "01-02: Shared Redis client with cacheGet/cacheSet helpers"
provides:
  - "Three-tier data resolution chain: Supabase > Redis cache > hardcoded constants"
  - "Redis cache middle layer with 24h TTL for last-known-good data"
  - "DataStatus with tier reporting (1=Supabase, 2=Redis, 3=constants)"
  - "Fire-and-forget Redis cache writes after successful Supabase loads"
affects: [02-state-resolution, 07-scrp-fresh]

# Tech tracking
tech-stack:
  added: []
  patterns: [three-tier-resolution, fire-and-forget-cache-write, conservative-staleness]

key-files:
  created: []
  modified:
    - src/lib/engine/data-loader.ts

key-decisions:
  - "Tier functions extracted as _tryLoadFromSupabase and _tryLoadFromCache for clean separation"
  - "Cache tier without scrape timestamp conservatively marked isStale=true"
  - "Fire-and-forget cache writes (.catch(() => {})) to avoid blocking the response path"
  - "24h Redis TTL balances freshness vs cache utility (longer than 5min in-memory, shorter than scrape cadence)"

patterns-established:
  - "Three-tier resolution: always try live source first, cached data second, constants last"
  - "Fire-and-forget cache write: cache successful live data for next time without blocking"
  - "Conservative staleness: when metadata is unavailable, assume stale rather than fresh"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 1 Plan 3: Three-Tier Data Resolution Summary

**Three-tier data resolution chain (Supabase > Redis > constants) with fire-and-forget cache writes and tier-aware DataStatus reporting**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T01:42:34Z
- **Completed:** 2026-02-22T01:45:33Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Three-tier data resolution: Supabase live scrape > Redis last-known-good > hardcoded constants
- Successful Supabase loads write to Redis cache (fire-and-forget) for graceful degradation on next outage
- DataStatus reports which tier resolved (tier 1/2/3) with conservative staleness for cache tier
- All 5 fallback scenarios resolve without throwing: Supabase+success, Supabase+fail+cache-hit, Supabase+fail+cache-miss, no-Supabase+cache-hit, no-Supabase+no-Redis

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Redis cache tier to data-loader.ts** - `bf4c1f2` (feat)
2. **Task 2: Validate fallback chain and update data status reporting** - `74232cb` (feat)

## Files Created/Modified
- `src/lib/engine/data-loader.ts` - Three-tier resolution with _tryLoadFromSupabase, _tryLoadFromCache, tier-aware DataStatus

## Decisions Made
- **Extracted tier functions:** _tryLoadFromSupabase and _tryLoadFromCache as separate async functions returning boolean success, keeping _loadDataContextInner as a clean orchestrator
- **Conservative cache staleness:** When loading from Redis cache (tier 2), _cachedScrapeTimestamp is null (no scrape metadata in cache), so isStale defaults to true -- prevents false confidence in cached data age
- **Fire-and-forget writes:** `cacheSet(...).catch(() => {})` ensures cache failures never block or crash the response path
- **24h Redis TTL:** CACHE_KEY_TTL = 86400s balances freshness vs utility -- longer than the 5min process-level dedup cache, shorter than the weekly scrape cadence

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Existing UPSTASH_REDIS_REST_URL/TOKEN and SUPABASE env vars are used unchanged.

## Next Phase Readiness
- Phase 1 (Data Foundation) is complete: VerifiedDatum types (01-01), Redis client (01-02), and three-tier resolution (01-03) are all in place
- data-loader.ts is ready for Phase 2 state-level resolution types to consume
- Redis cache layer is ready for Phase 7 SCRP+FRESH scrapers to populate
- DataStatus.tier enables UI freshness badges in future phases

## Self-Check: PASSED

- [x] src/lib/engine/data-loader.ts exists
- [x] Commit bf4c1f2 (Task 1) found in git log
- [x] Commit 74232cb (Task 2) found in git log
- [x] `npx tsc --noEmit` passes
- [x] `npx next build` passes
- [x] cacheGet and cacheSet imported and used
- [x] DataStatus includes tier field
- [x] No raw `new Redis()` in data-loader.ts

---
*Phase: 01-data-foundation*
*Completed: 2026-02-22*
