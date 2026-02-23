---
phase: 02-shareable-plan-links
plan: 02
subsystem: ui
tags: [share-links, server-components, clipboard-api, next-dynamic-routes, redis, middleware]

# Dependency graph
requires:
  - phase: 02-shareable-plan-links
    plan: 01
    provides: "POST /api/share endpoint, SharedResultsShell component, cacheGet/cacheSet helpers, CACHE_TTLS.share_links"
provides:
  - "Server component page at /shared/[token] rendering shared plan views from Redis"
  - "ShareButton client component with clipboard copy and visual status feedback"
  - "ResultsShell integration with ShareButton in action bar"
  - "Friendly expired/invalid share link page (not generic 404)"
  - "Dev cache fallback via globalThis for Turbopack worker sharing"
  - "isCacheAvailable() helper for checking cache readiness"
affects: [results-shell, middleware, redis-infrastructure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server component page with Promise<params> pattern (Next.js 16)"
    - "globalThis-attached Map for cross-worker dev cache sharing in Turbopack"
    - "Clipboard API with fallback to execCommand for non-secure contexts"
    - "Middleware exclusion pattern for public routes (/api/share, /shared/)"

key-files:
  created:
    - src/app/shared/[token]/page.tsx
    - src/components/results/ShareButton.tsx
  modified:
    - src/app/api/share/route.ts
    - src/components/results/ResultsShell.tsx
    - src/lib/redis.ts
    - src/middleware.ts
    - .gitignore

key-decisions:
  - "Store { assessment, createdAt } wrapper in Redis to calculate expiration from creation time (not access time)"
  - "Render friendly in-page expired message instead of calling notFound() for better UX"
  - "Use globalThis-attached Map for dev cache fallback so Turbopack workers share data"
  - "Add isCacheAvailable() helper to check Redis or dev fallback availability"
  - "Exclude /api/share and /shared/ from auth middleware matcher (public endpoints)"

patterns-established:
  - "Share flow pattern: ShareButton -> POST /api/share -> clipboard copy -> /shared/[token] server component -> SharedResultsShell"
  - "Expired/invalid entity page pattern: in-page message with CTA instead of generic 404"
  - "Dev cache fallback pattern: globalThis Map with TTL expiration for local development without Redis"

# Metrics
duration: 44min
completed: 2026-02-22
---

# Phase 02 Plan 02: Shared Plan Page + ShareButton Integration Summary

**End-to-end share flow wiring: ShareButton in results action bar, server component page at /shared/[token] with Redis fetch, friendly expired state, and dev cache fallback via globalThis**

## Performance

- **Duration:** 44 min (includes human verification checkpoint)
- **Started:** 2026-02-22T02:28:01Z
- **Completed:** 2026-02-22T03:12:56Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 7

## Accomplishments
- Complete end-to-end share flow: click Share Plan in results -> POST /api/share -> URL copied to clipboard -> visit /shared/[token] -> see full read-only assessment
- Server component shared page fetches from Redis with generateMetadata for SEO, friendly expired/invalid state with Clock icon and "Create your own plan" CTA
- ShareButton with 4-state UI (idle/loading/copied/error), clipboard API with execCommand fallback, auto-reset timers
- Dev cache fallback using globalThis-attached Map for Turbopack worker sharing (fixed cross-worker isolation issue found during UAT)

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared plan page route and ShareButton component** - `046efd5` (feat)
2. **Task 2: Integrate ShareButton into ResultsShell action bar** - `20deada` (feat)
3. **Task 3: Verify end-to-end share flow** - human verification checkpoint (approved)

**UAT fix:** `85b016c` (fix) - middleware exclusion + dev cache fallback

## Files Created/Modified
- `src/app/shared/[token]/page.tsx` - Server component rendering shared plan view from Redis with friendly expired state
- `src/components/results/ShareButton.tsx` - Client component for share link creation with clipboard copy and 4-state visual feedback
- `src/app/api/share/route.ts` - Updated to store `{ assessment, createdAt }` wrapper; switched to `isCacheAvailable()` check
- `src/components/results/ResultsShell.tsx` - Added ShareButton between PlanExport and Confirm in action bar
- `src/lib/redis.ts` - Added globalThis dev cache fallback, `isCacheAvailable()` helper
- `src/middleware.ts` - Excluded `/api/share` and `/shared/` from auth middleware matcher
- `.gitignore` - Added `.cache/` directory

## Decisions Made
- **Store `{ assessment, createdAt }` wrapper:** The POST endpoint now wraps the assessment with a `createdAt` timestamp so the shared page can derive expiration from creation time rather than access time, ensuring consistency with the Redis TTL.
- **Friendly in-page expired message:** Instead of calling Next.js `notFound()` which shows a generic 404, the shared page renders a custom expired state with a Clock icon, helpful copy, and a "Create your own plan" CTA linking to `/plan-builder`.
- **globalThis dev cache fallback:** During UAT, discovered that Turbopack creates separate workers for API routes and page routes. An in-memory Map was not shared across workers. Switched to `globalThis`-attached Map to ensure data written by POST /api/share is readable by the /shared/[token] page route.
- **Middleware exclusion:** Auth middleware was blocking /api/share and /shared/ routes since they don't carry auth tokens. Excluded both via the matcher pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Middleware blocking public share endpoints**
- **Found during:** Task 3 (human verification / UAT)
- **Issue:** Auth middleware intercepted requests to `/api/share` (POST) and `/shared/[token]` (page), causing auth redirects on public endpoints
- **Fix:** Added `api/share` and `shared/` to middleware matcher exclusion pattern
- **Files modified:** `src/middleware.ts`
- **Committed in:** `85b016c`

**2. [Rule 1 - Bug] In-memory cache not shared across Turbopack workers**
- **Found during:** Task 3 (human verification / UAT)
- **Issue:** The in-memory Map cache fallback (for dev without Redis) was per-worker — data stored by the API route worker was invisible to the page route worker, so visiting the shared URL always showed the expired state
- **Fix:** Replaced module-level Map with `globalThis`-attached Map and added `isCacheAvailable()` helper; updated route.ts to use `isCacheAvailable()` instead of `getRedis() !== null`
- **Files modified:** `src/lib/redis.ts`, `src/app/api/share/route.ts`
- **Committed in:** `85b016c`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were necessary for the share flow to work in local development. No scope creep. Production with Redis is unaffected.

## Issues Encountered
- Turbopack worker isolation meant the dev fallback cache needed a different sharing mechanism (globalThis). This is a dev-only concern; production uses Redis where all workers share the same external store.

## User Setup Required
None - no external service configuration required. Uses existing Redis infrastructure from Phase 1. Dev fallback cache works without Redis.

## Next Phase Readiness
- Phase 02 (Shareable Plan Links) is fully complete
- Share links are immutable snapshots stored in Redis with 90-day TTL
- UX polish feedback captured in `.planning/autosaves/session9-uat-feedback.md` for a future pass
- All endpoints are publicly accessible (no auth required to view shared plans)

## Self-Check: PASSED

All files verified present on disk. All commit hashes verified in git log.

---
*Phase: 02-shareable-plan-links*
*Completed: 2026-02-22*
