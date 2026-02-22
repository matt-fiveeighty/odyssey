# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Every number is real, every recommendation is specific to you, and the system actively works for you between visits -- like a fiduciary managing your hunting portfolio, not a spreadsheet you maintain yourself.
**Current focus:** Phase 5 in progress -- Advisor Voice system.

## Current Position

Phase: 5 of 10 (Advisor Voice)
Plan: 1 of 4 in current phase
Status: Plan 05-01 complete
Last activity: 2026-02-22 -- Completed 05-01 (AdvisorInsight types + temporal context engine)

Progress: [████░░░░░░] 24%

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: 10 min
- Total execution time: 1.6 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-foundation | 3 | 7 min | 2 min |
| 02-shareable-plan-links | 2 | 47 min | 24 min |
| 03-season-calendar | 2 | 12 min | 6 min |
| 04-calendar-subscription | 2 | 30 min | 15 min |
| 05-advisor-voice | 1 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 03-01 (4 min), 03-02 (8 min), 04-01 (12 min), 04-02 (18 min), 05-01 (2 min)
- Trend: 05-01 was pure type/engine work -- fast execution, no UI or API complexity

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Infrastructure-first ordering -- VerifiedDatum + Redis before any user-facing features
- [Roadmap]: Split Calendar (Phase 3) and ICS Subscription (Phase 4) into separate phases for independent delivery
- [Roadmap]: Split Phase 7 three ways -- Savings (Phase 8), Diff (Phase 9), Scouting (Phase 10) for independent validation
- [Roadmap]: SCRP + FRESH kept together (Phase 7) since freshness badges are meaningless without enriched scrapers
- [01-01]: Used Vitest over Jest for ESM-native test runner compatible with Next.js 16
- [01-01]: STALE_THRESHOLDS.default = 10 days, aligned with existing STALE_THRESHOLD_DAYS in data-loader.ts
- [01-02]: All modules share single Redis client via getRedis() from src/lib/redis.ts
- [01-02]: Cache helpers degrade gracefully (null on get, no-op on set/del) when Redis unavailable
- [01-03]: Three-tier resolution chain: Supabase > Redis cache > hardcoded constants
- [01-03]: Fire-and-forget Redis cache writes after successful Supabase loads
- [01-03]: Cache tier conservatively marked isStale=true when no scrape timestamp available
- [02-01]: Used x-forwarded-for header for rate limit identifier (req.ip not available in Next.js 16)
- [02-01]: Forked ResultsShell into SharedResultsShell rather than adding readOnly prop (Zustand isolation)
- [02-01]: Rendered all sections inline in SharedResultsShell (existing section components depend on Zustand)
- [02-01]: Explicit 503 failure for share endpoint when Redis unavailable (vs graceful degradation for cache)
- [02-02]: Store { assessment, createdAt } wrapper in Redis for expiration calculation from creation time
- [02-02]: Friendly in-page expired message instead of notFound() for better share link UX
- [02-02]: globalThis-attached Map for dev cache fallback (Turbopack workers don't share module-level state)
- [02-02]: Exclude /api/share and /shared/ from auth middleware (public endpoints)
- [03-01]: Canonical urgency thresholds: red <=14d, amber <=30d, green >30d (per CAL-06, replaces 3 divergent implementations)
- [03-01]: Tag type defaults to "draw" -- OTC/leftover detection deferred to Phase 7 scraper data
- [03-01]: Milestone deduplication by stateId + speciesId + type + month prevents duplicate calendar entries
- [03-02]: Calendar is a zoom level inside Timeline tab (not a new tab) per CAL-08
- [03-02]: Mobile renders vertical month list below md breakpoint (matching MilestoneCalendar pattern)
- [03-02]: +N more overflow for cells with >3 items (prevents overcrowding from multi-species states)
- [04-01]: Isomorphic ICS builder (zero DOM deps) reused by browser export + server subscription endpoint
- [04-01]: SHA-256 content-derived UIDs from EventIdentity (alphabetical key ordering for determinism)
- [04-01]: timezones-ical-library returns string[] -- first element is VTIMEZONE block
- [04-01]: Refactored calendar-export.ts into thin browser-only wrapper delegating to ics-builder.ts
- [04-02]: POST /api/cal stores entire StrategicAssessment in Redis (50-100KB, 365d TTL)
- [04-02]: GET /api/cal/[token] generates ICS dynamically for ALL roadmap years (not just one)
- [04-02]: webcal:// URL via window.open(url, "_self") — doesn't create new tab, hands to OS handler
- [04-02]: Token regeneration creates new Redis entry; old tokens never invalidated (serve until 365d TTL expires)
- [04-02]: Rich calendar descriptions: F&G portal links, cost breakdowns, unit codes, license reminders, step-by-step nav
- [04-02]: SubscribeCalendar uses popover-style absolute positioning to avoid breaking action bar flex layout
- [05-01]: Inline literal union for AdvisorInsight.confidence instead of importing DataConfidence (avoids types->engine circular dep)
- [05-01]: recordVisit() same-day guard prevents overwriting lastVisitAt on page reloads
- [05-01]: No persist key bump for lastVisitAt -- nullable field is backwards-compatible with Zustand persist merge

### Pending Todos

None yet.

### Blockers/Concerns

- pdf-parse v2 table extraction quality is unvalidated against actual state draw PDFs (affects Phase 7)
- Amadeus SDK v11 compatibility with Next.js 16 server components is unverified (affects Phase 6)

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 05-01-PLAN.md (AdvisorInsight types + temporal context engine)
Resume file: None
