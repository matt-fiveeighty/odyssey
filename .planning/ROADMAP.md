# Roadmap: Odyssey Outdoors -- Autonomous Advisor Milestone

## Overview

This milestone transforms Odyssey Outdoors from a static results generator into a living, autonomous hunting advisor. The journey moves infrastructure-first (data provenance and Redis layer), then quick user-visible wins (share links, calendar), then the advisor intelligence layer, then the data pipeline (scrapers, APIs, freshness), and finally second-wave features (savings, diff, scouting). Every phase delivers a coherent, verifiable capability. The guiding principle throughout: every number is real, every recommendation is specific, and the system works for the user between visits.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data Foundation** - VerifiedDatum type system, Redis data layer, cache helpers, and three-tier data resolution
- [ ] **Phase 2: Shareable Plan Links** - Token-based read-only plan snapshots via unique URLs
- [ ] **Phase 3: Season Calendar** - Month-by-month swimlane calendar showing all hunt activities within a single year
- [ ] **Phase 4: Calendar Subscription** - Isomorphic .ics builder and webcal:// subscription endpoint
- [ ] **Phase 5: Advisor Voice** - Opinionated interpretation layer across dashboard, calendar, and board state
- [ ] **Phase 6: API Integrations** - Amadeus flight pricing and BLS inflation data with cache-first patterns
- [ ] **Phase 7: Scraper Enrichment & Data Freshness** - Enhanced scrapers (deadlines, fees, seasons, leftovers) plus freshness badges and provenance tooltips
- [ ] **Phase 8: Savings & Budget Tracker** - Goal-based hunt fund savings with progress rings, projections, and advisor integration
- [ ] **Phase 9: Diff View** - Structured "since your last visit" diff engine replacing the Welcome Back card
- [ ] **Phase 10: Scouting Strategy** - Dual-purpose OTC hunt detection near trophy draw units

## Phase Details

### Phase 1: Data Foundation
**Goal**: Every piece of data in the system carries provenance metadata and the app has a shared server-side cache layer, so downstream features (share links, calendar subscriptions, API caching) have infrastructure to build on
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06
**Estimated effort**: 2-3 days
**Success Criteria** (what must be TRUE):
  1. Any engine function can wrap a value in VerifiedDatum with source URL, scrape date, and confidence level -- and any consumer can unwrap it back to a raw value without refactoring
  2. Data resolution follows three tiers (live scrape > cached last-known-good > hardcoded constants) and the app renders with reasonable data even when all external sources are disabled
  3. A shared Upstash Redis client is available to any server-side module, with configurable TTL helpers for flight prices (6h), CPI data (30d), share links (90d), and calendar plans (365d)
  4. Derived calculations (e.g., cost projections combining verified odds with estimated creep) automatically inherit the lowest confidence of their inputs
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — VerifiedDatum type system, factory functions, unwrap helpers, and confidence propagation (TDD)
- [ ] 01-02-PLAN.md — Shared Redis client extraction and cache helper utilities with configurable TTLs
- [ ] 01-03-PLAN.md — Three-tier data resolution (Supabase > Redis > constants) in data-loader

### Phase 2: Shareable Plan Links
**Goal**: Users can share their hunting strategy with anyone via a unique URL that renders a read-only snapshot of their plan
**Depends on**: Phase 1 (Redis layer for plan storage)
**Requirements**: SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05, SHARE-06, SHARE-07
**Estimated effort**: 2 days
**Success Criteria** (what must be TRUE):
  1. User clicks "Share Plan" in results and receives a unique URL they can copy and send to anyone
  2. Anyone with the URL sees a complete read-only view of the plan (roadmap, states, timeline, costs) without needing an account or any local state
  3. The shared plan is an immutable snapshot -- if the creator changes their plan afterward, the shared link still shows the original version
  4. Share links expire after 90 days and the shared page clearly shows the expiration date
  5. The shared page includes a "Create your own plan" CTA that starts the consultation wizard
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — POST /api/share endpoint + SharedResultsShell read-only component (no Zustand)
- [ ] 02-02-PLAN.md — GET /shared/[token] page, ShareButton component, and ResultsShell integration

### Phase 3: Season Calendar
**Goal**: Users can see all their hunt-related activities for a single year laid out month-by-month, so they can professionalize their scheduling and see open slots
**Depends on**: Phase 1 (VerifiedDatum for deadline/cost confidence display)
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06, CAL-07, CAL-08
**Estimated effort**: 3-4 days
**Success Criteria** (what must be TRUE):
  1. User sees a month-by-month swimlane calendar organized by state (rows) and month (columns, Jan-Dec) showing all applications, deadlines, point purchases, hunts, and prep activities
  2. Each calendar slot shows species, state, tag type (draw/OTC/leftover), purpose, and estimated cost
  3. Empty months are visually distinct, making it obvious where open slots are available for filling
  4. Calendar items are color-coded by urgency -- red for deadlines within 14 days, amber within 30, green on track
  5. Monthly cost totals appear in a summary row so the user can see spending cadence across the year
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md — Shared urgency utility + calendar grid data model (buildCalendarGrid pure function)
- [ ] 03-02-PLAN.md — CalendarSlot chip, SeasonCalendar swimlane, and TimelineRoadmap zoom toggle integration

### Phase 4: Calendar Subscription
**Goal**: Users can subscribe to their hunt calendar in Google Calendar or Apple Calendar and receive automatic updates as their plan evolves -- the advisor speaks through their calendar
**Depends on**: Phase 1 (Redis for plan snapshot storage), Phase 3 (calendar data model and event generation)
**Requirements**: ICS-01, ICS-02, ICS-03, ICS-04, ICS-05, ICS-06, ICS-07, ICS-08
**Estimated effort**: 2-3 days
**Success Criteria** (what must be TRUE):
  1. User can click "Subscribe to Calendar" and add a webcal:// URL to Google Calendar or Apple Calendar that auto-refreshes
  2. The buildICS module works both client-side (for individual event downloads) and server-side (for the subscription endpoint) without any DOM dependencies
  3. Calendar events have stable content-derived UIDs so that refreshing the subscription never creates duplicate events
  4. Plan snapshots are stored server-side in Redis (365d TTL) -- the subscription works independently of the user's browser state
  5. User can regenerate their calendar token when their plan changes, and the old token continues serving its snapshot until TTL expires
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — Isomorphic ICS builder extraction + stable UIDs + VTIMEZONE/METHOD:PUBLISH (pure logic, no API/UI)
- [ ] 04-02-PLAN.md — POST/GET /api/cal endpoints + SubscribeCalendar UI + token regeneration

### Phase 5: Advisor Voice
**Goal**: The dashboard and calendar speak like an opinionated advisor -- interpreting data, making specific recommendations, and prompting action -- not just displaying numbers
**Depends on**: Phase 1 (VerifiedDatum for confidence-aware commentary), Phase 3 (calendar items receive advisor interpretation)
**Requirements**: ADV-01, ADV-02, ADV-03, ADV-04, ADV-05, ADV-06, ADV-07, ADV-08
**Estimated effort**: 3-4 days
**Success Criteria** (what must be TRUE):
  1. Dashboard cards show opinionated "so what?" interpretations specific to the user's portfolio -- not just data values but what they mean and what to do about it
  2. Every advisor insight ends with a recommended action and a clickable CTA that takes the user to the relevant part of the app
  3. The advisor uses temporal context -- referencing days since last visit, days until deadlines, and time-sensitive windows
  4. Deadline proximity generates urgency-calibrated commentary (immediate within 14 days, soon within 30, informational at 60+)
  5. Point creep detection alerts the user when draw timelines shift, with specific impact stated (e.g., "Year 5 to Year 6")
**Plans**: 4 plans

Plans:
- [ ] 05-01-PLAN.md — AdvisorInsight type system, temporal context engine, and lastVisitAt store integration
- [ ] 05-02-PLAN.md — Advisor insight generator pipeline + point creep shift detection engine
- [ ] 05-03-PLAN.md — AdvisorCard component + dashboard rewrite replacing Welcome Back with advisor insights
- [ ] 05-04-PLAN.md — Calendar advisor notes generator + CalendarSlot tooltips + ICS description enrichment

### Phase 6: API Integrations
**Goal**: Real flight pricing and real inflation data replace all hardcoded estimates, served from cache so API free tiers are never exhausted in user-facing request paths
**Depends on**: Phase 1 (Redis caching layer, VerifiedDatum wrapping)
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08
**Estimated effort**: 4-5 days
**Success Criteria** (what must be TRUE):
  1. Flight cost estimates in the results and calculator reflect real Amadeus fare data (wrapped in VerifiedDatum with "verified" confidence) instead of the static $180 average
  2. Inflation projections use real BLS CPI data instead of the hardcoded 3% assumption
  3. Amadeus calls are batch-cached weekly via cron and never called in a user-facing request path -- monthly call budget is tracked in Redis with automatic switch to cache-only at 1800/2000 limit
  4. BLS data is cached 30 days and refreshed monthly via Vercel Cron on the 15th
  5. When either API fails or quota is exhausted, the app seamlessly falls back to static estimates with "estimated" confidence -- users never see $0 flights or broken projections
**Plans**: 7 plans

Plans:
- [ ] 06-01: Amadeus SDK integration and flight quote client (src/lib/api/amadeus.ts)
- [ ] 06-02: Amadeus Redis caching with 6h TTL and quota tracking
- [ ] 06-03: GET /api/flights/quote route handler with cache-first pattern
- [ ] 06-04: Flight price warm cron (monthly pre-cache of popular airport pairs)
- [ ] 06-05: BLS CPI/inflation client (src/lib/api/bls.ts) with 30d cache
- [ ] 06-06: GET /api/inflation/cpi route handler and monthly refresh cron
- [ ] 06-07: Graceful degradation for both APIs (fallback to static estimates with "estimated" confidence)

### Phase 7: Scraper Enrichment & Data Freshness
**Goal**: Existing state scrapers are enhanced to capture deadlines, fees, seasons, and leftover tags -- and every number on screen shows whether it is verified, estimated, or stale
**Depends on**: Phase 1 (VerifiedDatum for provenance wrapping), Phase 6 (API patterns establish the cache-first + fallback pattern reused here)
**Requirements**: SCRP-01, SCRP-02, SCRP-03, SCRP-04, SCRP-05, SCRP-06, SCRP-07, SCRP-08, SCRP-09, FRESH-01, FRESH-02, FRESH-03, FRESH-04
**Estimated effort**: 8-10 days
**Success Criteria** (what must be TRUE):
  1. BaseScraper supports cheerio HTML parsing and pdf-parse PDF extraction alongside existing CSV parsing
  2. Oregon (CSV) and Utah (REST) scrapers are fully implemented as proof of concept, outputting VerifiedDatum-wrapped deadlines, fees, and season dates
  3. Structural fingerprinting detects when a state website has changed format and flags the scrape as "structure changed" rather than silently misparsing
  4. Schema validation at ingest rejects implausible values (e.g., $0 tag costs, dates in 1970) and never overwrites good data with failed scrape results
  5. FreshnessBadge component displays verified/estimated/stale confidence on any displayed number, with a provenance tooltip showing source URL and scrape date on hover
**Plans**: 8 plans

Plans:
- [ ] 07-01: BaseScraper enhancement with cheerio HTML parsing (fetchAndParse)
- [ ] 07-02: BaseScraper enhancement with pdf-parse PDF extraction (fetchPdf)
- [ ] 07-03: Oregon CSV + Utah REST proof-of-concept scrapers (deadlines, fees, seasons)
- [ ] 07-04: scrapeDeadlines() and scrapeFees() implementation for remaining active states
- [ ] 07-05: scrapeSeasons() and scrapeLeftoverTags() implementation
- [ ] 07-06: Structural fingerprinting and schema validation at ingest
- [ ] 07-07: FreshnessBadge component and provenance tooltip
- [ ] 07-08: Dashboard "Data last updated" timestamp and stale data visual flagging

### Phase 8: Savings & Budget Tracker
**Goal**: Users can set up goal-based savings for each hunt in their plan and see whether they are on track, behind, or ahead -- with the advisor telling them exactly what to adjust
**Depends on**: Phase 5 (advisor voice integration for savings commentary)
**Requirements**: SAV-01, SAV-02, SAV-03, SAV-04, SAV-05, SAV-06, SAV-07
**Estimated effort**: 4 days
**Success Criteria** (what must be TRUE):
  1. Each hunt goal on the dashboard has a savings progress ring showing percent funded
  2. Monthly savings targets are automatically calculated from target cost divided by months remaining
  3. A projection shows the funded date at the current contribution rate, so the user knows exactly when they will have enough
  4. Traffic light status (green/amber/red) makes it immediately clear which hunts are on track and which need attention
  5. The advisor voice provides specific savings guidance -- e.g., "You're $400 behind on your CO elk fund -- increase by $50/mo to get back on track"
**Plans**: 6 plans

Plans:
- [ ] 08-01: Savings goal data model and Zustand store integration (linked to UserGoal)
- [ ] 08-02: Monthly savings target calculator and funded-date projection engine
- [ ] 08-03: Savings progress ring components on dashboard
- [ ] 08-04: Traffic light status system (green/amber/red)
- [ ] 08-05: Advisor voice savings insights (behind/on-track/ahead commentary)
- [ ] 08-06: Annual spend forecast summarizing all upcoming hunt costs

### Phase 9: Diff View
**Goal**: Returning users see a structured summary of what changed since their last visit -- deadline shifts, draw results, point creep, new opportunities -- filtered to only show changes that matter
**Depends on**: Phase 5 (advisor voice for diff item interpretation), Phase 7 (scraped data enables data-driven diffs beyond deadline proximity)
**Requirements**: DIFF-01, DIFF-02, DIFF-03, DIFF-04, DIFF-05
**Estimated effort**: 4 days
**Success Criteria** (what must be TRUE):
  1. The "Since your last visit" view replaces/upgrades the existing Welcome Back card with structured, categorized diff items
  2. Diff items are sourced from deadline proximity changes, draw result dates, point creep shifts, and new opportunities
  3. A materiality filter ensures only significant changes surface -- cost changes over $25, deadline shifts over 5 days, draw timeline changes over 1 year
  4. Each diff item is categorized (action_required, opportunity, status_update, warning) and has advisor voice interpretation with a recommended action
**Plans**: 5 plans

Plans:
- [ ] 09-01: Diff engine -- compare lastVisitTimestamp against current data for all diff sources
- [ ] 09-02: Materiality filter (threshold-based suppression of noise)
- [ ] 09-03: Diff item categorization and advisor voice interpretation
- [ ] 09-04: DiffView component replacing Welcome Back card
- [ ] 09-05: "What changed" persistence (mark diffs as seen, track visit timestamps)

### Phase 10: Scouting Strategy
**Goal**: Users with multi-year point-building strategies see actionable dual-purpose hunt recommendations -- OTC hunts near their trophy draw units that serve as scouting missions while they wait
**Depends on**: Phase 5 (advisor voice for scouting recommendations), Phase 3 (calendar integration for scouting items)
**Requirements**: SCOUT-01, SCOUT-02, SCOUT-03, SCOUT-04, SCOUT-05
**Estimated effort**: 5-6 days
**Success Criteria** (what must be TRUE):
  1. The engine detects OTC or high-odds units geographically near the user's trophy draw units and surfaces them as scouting opportunities
  2. Scouting opportunities are scored by geographic proximity, terrain similarity, season overlap, and cost
  3. Scouting hunts appear as a distinct color/badge in the season calendar, visually differentiated from primary draw hunts
  4. The advisor explains the strategic connection -- e.g., "While you build for WY Unit 100, hunt CO Unit 76 for scouting intel on the same elk migration corridor"
**Plans**: 5 plans

Plans:
- [ ] 10-01: Geographic proximity engine (unit-to-unit distance calculation)
- [ ] 10-02: Scouting opportunity scorer (proximity, terrain, season overlap, cost)
- [ ] 10-03: Dual-purpose recommendation presentation ("Scouting Move" cards)
- [ ] 10-04: Scouting hunt badge/color in season calendar
- [ ] 10-05: Advisor voice scouting explanations with strategic context

## Progress

**Execution Order:**
Phases execute in numeric order: 1 > 2 > 3 > 4 > 5 > 6 > 7 > 8 > 9 > 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 0/3 | Not started | - |
| 2. Shareable Plan Links | 0/2 | Not started | - |
| 3. Season Calendar | 0/2 | Not started | - |
| 4. Calendar Subscription | 0/2 | Not started | - |
| 5. Advisor Voice | 0/4 | Not started | - |
| 6. API Integrations | 0/7 | Not started | - |
| 7. Scraper Enrichment & Data Freshness | 0/8 | Not started | - |
| 8. Savings & Budget Tracker | 0/6 | Not started | - |
| 9. Diff View | 0/5 | Not started | - |
| 10. Scouting Strategy | 0/5 | Not started | - |
