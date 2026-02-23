# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Every number is real, every recommendation is specific to you, and the system actively works for you between visits -- like a fiduciary managing your hunting portfolio, not a spreadsheet you maintain yourself.
**Current focus:** Phase 8 in progress -- Savings & Budget Tracker.

## Current Position

Phase: 8 of 10 (Savings & Budget Tracker)
Plan: 4 of 5 complete
Status: Executing Phase 8
Last activity: 2026-02-23 -- Plan 08-05 complete (AnnualSpendForecast component + budget page integration)

Progress: [████████████████░] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 25
- Average duration: 6 min
- Total execution time: 2.44 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-foundation | 3 | 7 min | 2 min |
| 02-shareable-plan-links | 2 | 47 min | 24 min |
| 03-season-calendar | 2 | 12 min | 6 min |
| 04-calendar-subscription | 2 | 30 min | 15 min |
| 05-advisor-voice | 4 | 11 min | 3 min |
| 06-api-integrations | 3 | 8 min | 3 min |
| 07-scraper-enrichment-data-freshness | 5 | 24 min | 5 min |
| 08-savings-budget-tracker | 4 | 10 min | 3 min |

**Recent Trend:**
- Last 5 plans: 08-01 (3 min), 08-02 (3 min), 08-03 (2 min), 08-05 (2 min)
- Trend: Consistent sub-3-min for Phase 8 component plans -- small focused components with clear patterns

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
- [05-02]: Point creep detection uses estimateCreepRate(trophyRating) from point-creep.ts -- leverages existing tier-based model
- [05-02]: inferSpeciesFromUnit parses unit codes in STATE-SPECIES-UNIT format with fallback to state's first available species
- [05-02]: Concentration risk insight fires at >70% threshold, matching StrategyMetrics.portfolioConcentrationPercentage
- [05-02]: Temporal insights suppressed entirely for non-returning users (daysSinceLastVisit < 1)
- [05-03]: Removed Check/X icons from dashboard imports -- only used in now-removed Welcome Back section
- [05-03]: Added Compass icon for advisor section header (visually distinct from RefreshCw used by old Welcome Back)
- [05-03]: Board state computed via computeBoardState in useMemo fed into generateAdvisorInsights pipeline
- [05-04]: Post-build enrichment pattern: advisor notes generated AFTER buildCalendarGrid, not inside it (keeps calendar-grid.ts pure)
- [05-04]: Native title attribute for tooltips instead of custom tooltip component (simplest approach, no new dependency)
- [05-04]: Advisor note prepended to ICS DESCRIPTION (not appended) so it appears first in calendar app event details
- [06-01]: Direct fetch over amadeus npm SDK (CJS-only, bundling risk in Next.js 16)
- [06-01]: Soft quota limit at 1800/2000 monthly Amadeus calls with Redis INCR + auto-expire TTL
- [06-01]: BLS API key optional -- graceful fallback to v1 rate limits when omitted
- [06-01]: 3.5% FALLBACK_INFLATION_RATE exported as shared constant for downstream consumers
- [06-02]: User-facing routes never call external APIs -- read from Redis cache or fall back to static estimates
- [06-02]: warm-flights uses batch processing (10 pairs/group, 1s delay) with per-batch quota checks
- [06-02]: Search date targets Oct 1 off-season, 6 weeks out during Sep-Nov hunting season
- [06-02]: Cron auth uses simplified CRON_SECRET-only check (Vercel-triggered only, no admin fallback needed)
- [06-03]: Self-contained fetch in each component (no shared hook) -- keeps PortfolioOverview and HeroSummary independent
- [06-03]: useState(0.035) default ensures identical pre-fetch rendering to old hardcoded behavior (zero-flash pattern)
- [06-03]: Subtle BLS source indicator in text only when inflationSource is verified (not a badge, just context)
- [07-01]: Used PDFParse class API (pdf-parse v2) instead of default export (v1 pattern)
- [07-01]: Named base method extractPdfText to avoid collision with existing UT/KS parsePdfText methods
- [07-01]: Plausibility schema pattern: base schema for structure, Plausible*Schema for domain guards -- callers choose which to pass to validateBatch()
- [07-03]: validateBatch as return guard pattern: every scrape method returns validateBatch() instead of raw array
- [07-03]: Cheerio migration prioritized for CO/WY (most complex regex); other states retain regex in non-critical paths
- [07-05]: estimated() wrappers at render boundary (not full VerifiedDatum plumbing through engine) -- deliberate incremental approach
- [07-05]: Draw history guard skipped because ref_unit_draw_history has no state_id column (uses unit_id FK)
- [07-05]: FreshnessBadge showLabel=false for all inline annotations to preserve compact layout
- [08-01]: targetCost derived from milestones at render time, never stored on SavingsGoal (avoids stale cost bug)
- [08-01]: Manual savings goal creation requires linking to a UserGoal via dropdown selector
- [08-01]: dismissedSuggestions kept as ephemeral useState (session-only, not persisted)
- [08-01]: Persist key unchanged at hunt-planner-app-v2 (shallow merge handles existing users)
- [08-02]: Date math uses 30.44 days/month average for ms-to-months conversion (no date library dependency)
- [08-02]: Traffic light thresholds: green = on time, amber = 1-3 months late, red = >3 months or $0/mo
- [08-02]: Composable calculator: calculateSavingsStatus calls calculateFundedDate, calculateCatchUpDelta calls calculateMonthlySavingsTarget
- [08-02]: Engine __tests__ directory established at src/lib/engine/__tests__/ for co-located engine tests
- [Phase 08]: [08-05]: Used STATE_VISUALS gradients for state badges instead of state.color (matches YearByYearBreakdown pattern)
- [Phase 08]: [08-04]: Savings urgency caps: red='soon', amber='informational', never 'immediate' (deadlines rank higher)
- [Phase 08]: [08-04]: Default params (savingsGoals=[], userGoals=[]) for backwards compat at all existing call sites

### Pending Todos

None yet.

### Blockers/Concerns

- pdf-parse v2 table extraction quality is unvalidated against actual state draw PDFs (affects Phase 7)
- ~~Amadeus SDK v11 compatibility with Next.js 16 server components is unverified~~ RESOLVED: Used direct fetch instead of SDK (06-01)

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 08-05-PLAN.md (AnnualSpendForecast component + budget page integration)
Resume file: None
