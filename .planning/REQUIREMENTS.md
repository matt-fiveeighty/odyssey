# Requirements: Odyssey Outdoors — Autonomous Advisor Milestone

**Defined:** 2026-02-21
**Core Value:** Every number is real, every recommendation is specific to you, and the system actively works for you between visits — like a fiduciary managing your hunting portfolio, not a spreadsheet you maintain yourself.

## v1 Requirements

Requirements for the Autonomous Advisor milestone. Each maps to roadmap phases.

### Data Foundation

- [ ] **DATA-01**: Every displayed number carries provenance metadata (source URL, scrape date, confidence level) via `VerifiedDatum<T>` wrapper
- [ ] **DATA-02**: Three-tier data resolution — live scrape > cached last-known-good > hardcoded constants — ensures app never shows empty data
- [ ] **DATA-03**: Shared Upstash Redis client extracted from rate-limit.ts, available to all server-side modules
- [ ] **DATA-04**: Cache helper utilities with configurable TTLs for flight prices (6h), CPI data (30d), share links (90d), calendar plans (365d)
- [ ] **DATA-05**: `unwrap()` helper allows engine functions to consume VerifiedDatum values without refactoring
- [ ] **DATA-06**: Derived calculations inherit the lowest confidence of their inputs (e.g., verified odds + estimated creep = estimated projection)

### Scraper Enrichment

- [ ] **SCRP-01**: BaseScraper enhanced with cheerio HTML parsing for state F&G table extraction
- [ ] **SCRP-02**: BaseScraper enhanced with pdf-parse for Arizona/Wyoming/Colorado draw report extraction
- [ ] **SCRP-03**: `scrapeDeadlines()` implemented for all active states, outputting VerifiedDatum-wrapped deadline dates
- [ ] **SCRP-04**: `scrapeFees()` implemented for all active states, replacing placeholder tag costs with real values
- [ ] **SCRP-05**: `scrapeSeasons()` implemented for all active states, providing month-level hunt season windows
- [ ] **SCRP-06**: Structural fingerprinting detects when a state website has changed format, preventing silent data corruption
- [ ] **SCRP-07**: Schema validation at ingest — never overwrite good data with failed scrape results
- [ ] **SCRP-08**: Oregon CSV and Utah REST endpoints implemented first as proof of concept
- [ ] **SCRP-09**: `scrapeLeftoverTags()` implemented for CO, WY, MT, AZ, NV, UT, OR, ID

### API Integrations

- [ ] **API-01**: Amadeus flight pricing integration returns real fare estimates wrapped in VerifiedDatum
- [ ] **API-02**: Amadeus calls batch-cached weekly via cron, never called in user-facing request paths
- [ ] **API-03**: Amadeus monthly call budget tracked in Redis counter, switches to cache-only at 1800/2000 limit
- [ ] **API-04**: Amadeus failures gracefully fall back to static estimates from flight-hubs.ts with "estimated" confidence
- [ ] **API-05**: BLS CPI/inflation integration returns real annual rate wrapped in VerifiedDatum
- [ ] **API-06**: BLS data cached 30 days, refreshed monthly via Vercel Cron on the 15th
- [ ] **API-07**: BLS failures gracefully fall back to hardcoded 3.0% estimate with "estimated" confidence
- [ ] **API-08**: Flight price warm cron pre-caches popular airport pairs monthly

### Season Calendar

- [ ] **CAL-01**: Month-by-month swimlane calendar view showing all hunt activities within a single year
- [ ] **CAL-02**: Calendar rows organized by state, columns by month (Jan-Dec)
- [ ] **CAL-03**: Calendar items include applications, point purchases, deadlines, hunts, scouting, and prep activities
- [ ] **CAL-04**: Each calendar slot shows species, state, tag type (draw/OTC/leftover), purpose, and estimated cost
- [ ] **CAL-05**: Empty months visually indicate open slots available for filling
- [ ] **CAL-06**: Color-coding by urgency — red for deadlines within 14 days, amber within 30, green on track
- [ ] **CAL-07**: Monthly cost totals displayed in summary row
- [ ] **CAL-08**: Calendar lives as a zoom level inside Timeline tab (year → month view)

### Calendar Subscription

- [ ] **ICS-01**: `buildICS()` extracted into isomorphic `ics-builder.ts` module — works both client-side (download) and server-side (subscription)
- [ ] **ICS-02**: GET `/api/cal/[token]` endpoint serves dynamically-generated .ics calendar
- [ ] **ICS-03**: Calendar subscription URL uses `webcal://` protocol for native calendar app integration
- [ ] **ICS-04**: Stable content-derived UIDs prevent event duplication on calendar refresh (not `Date.now()`)
- [ ] **ICS-05**: Plan snapshot stored in Upstash Redis (365d TTL), not referencing client-side Zustand
- [ ] **ICS-06**: VTIMEZONE handling ensures correct time display across time zones
- [ ] **ICS-07**: Calendar includes METHOD:PUBLISH header for proper subscription behavior
- [ ] **ICS-08**: User can regenerate calendar token when plan changes, old token continues serving old data until TTL

### Shareable Plan Links

- [ ] **SHARE-01**: "Share Plan" button in results UI generates a unique token URL
- [ ] **SHARE-02**: POST `/api/share` serializes current StrategicAssessment to Upstash Redis (90d TTL)
- [ ] **SHARE-03**: GET `/shared/[token]` renders read-only results view as server component (no Zustand)
- [ ] **SHARE-04**: Share links are immutable snapshots — creator's plan changes don't affect shared link
- [ ] **SHARE-05**: Token generated via crypto.randomUUID (not JWT, not predictable sequences)
- [ ] **SHARE-06**: Rate limiting on share link creation using existing `limiters.guest`
- [ ] **SHARE-07**: Share page shows expiration date and "Create your own plan" CTA

### Advisor Voice

- [ ] **ADV-01**: `AdvisorInsight` type system extends existing `BoardSignal` with interpretation, recommendation, and CTA
- [ ] **ADV-02**: Dashboard cards rewritten with opinionated "so what?" interpretations, not just data display
- [ ] **ADV-03**: Every insight ends with a recommended action and clickable CTA
- [ ] **ADV-04**: Advisor voice uses temporal context — "Since your last visit (34 days ago)..." "21 days until deadline..."
- [ ] **ADV-05**: Advisor voice is specific to user's portfolio — references their points, states, species, budget
- [ ] **ADV-06**: Deadline proximity generates urgency-calibrated commentary (14 days = urgent, 30 = soon, 60+ = informational)
- [ ] **ADV-07**: Point creep detection alerts when draw timelines shift, with specific impact ("Year 5 → Year 6")
- [ ] **ADV-08**: Advisor comments on the user's existing plan, never suggests abandoning it

### Savings & Budget

- [ ] **SAV-01**: Goal-based savings tracker with progress rings per hunt goal on dashboard
- [ ] **SAV-02**: Each savings goal linked to a specific UserGoal (state/species combination)
- [ ] **SAV-03**: Monthly savings target calculated from target cost / months remaining
- [ ] **SAV-04**: Projection shows funded date at current contribution rate
- [ ] **SAV-05**: Traffic light status — green (on track), amber (behind but recoverable), red (significantly behind)
- [ ] **SAV-06**: Advisor voice integration — "You're $400 behind on your CO elk fund — increase by $50/mo to get back on track"
- [ ] **SAV-07**: Annual spend forecast summarizing all upcoming hunt costs

### Diff View

- [ ] **DIFF-01**: "Since your last visit" structured diff replaces/upgrades existing Welcome Back card
- [ ] **DIFF-02**: Diff sources: deadline proximity changes, draw result dates, point creep shifts, new opportunities
- [ ] **DIFF-03**: Materiality filter — only show changes that matter (>$25 cost change, >5 day deadline shift, >1 year draw timeline change)
- [ ] **DIFF-04**: Diff items categorized as action_required, opportunity, status_update, or warning
- [ ] **DIFF-05**: Each diff item has advisor voice interpretation and recommended action

### Scouting Strategy

- [ ] **SCOUT-01**: Engine detects OTC/high-odds units geographically near user's trophy draw units
- [ ] **SCOUT-02**: Scouting opportunities scored by geographic proximity, terrain similarity, season overlap, and cost
- [ ] **SCOUT-03**: "Dual-Purpose Move" presentation showing the strategic value of scouting hunts
- [ ] **SCOUT-04**: Scouting hunts appear as distinct color/badge in season calendar
- [ ] **SCOUT-05**: Advisor voice explains the connection — "While you build for WY Unit 100, hunt CO Unit 76 for scouting intel"

### Data Freshness UI

- [ ] **FRESH-01**: `FreshnessBadge` component shows verified/estimated/stale confidence level on displayed numbers
- [ ] **FRESH-02**: Provenance tooltip on hover shows source URL, scrape date, and data label
- [ ] **FRESH-03**: Stale data visually flagged (>10 days for weekly data, >365 days for annual data)
- [ ] **FRESH-04**: "Data last updated" timestamp on dashboard

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Opportunistic Discovery

- **DISC-01**: Persistent opportunities feed on dashboard showing leftover tags, OTC hunts, shoulder season fills
- **DISC-02**: Opportunities curated to user profile — species interests, budget, travel willingness, calendar gaps
- **DISC-03**: "New since last check" badge for temporally fresh opportunities
- **DISC-04**: Dismiss/save/add-to-plan actions on each opportunity card

### Youth Pathways

- **YOUTH-01**: Per-state youth license age requirements data researched and added
- **YOUTH-02**: Per-state youth point accumulation rules documented
- **YOUTH-03**: Age-indexed timeline showing point accumulation and hunt eligibility milestones
- **YOUTH-04**: Multi-person plans with individual portfolio health cards per person
- **YOUTH-05**: Advisor insight when young person added — "CO youth bighorn odds are 10x better"

### Hunt Group Collaboration

- **GROUP-01**: Hunt group (2-4 linked profiles) with shared plan view
- **GROUP-02**: Engine finds schedule/unit overlap for group hunts
- **GROUP-03**: Collaborative What-If modeling across multiple portfolios

### Export & Sharing Enhancements

- **EXPORT-01**: PDF summary export of full roadmap
- **EXPORT-02**: Shareable image/card for social media
- **EXPORT-03**: Full-year .ics with advisor commentary in event descriptions

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Tag purchase portal | Multi-state legal project, user confirmed "not in the cards" |
| User authentication | Removed in session 5, not re-adding this milestone |
| Database migration (Supabase/Postgres) | Existing Supabase stays for scrapers, no new schemas |
| AI chat assistant | Hallucination risk in legal domain, advisor voice is structured not conversational |
| GPS/mapping features | OnX's territory with $100M+ investment, not competitive |
| Real-time push notifications | Calendar apps handle this better, insufficient event volume |
| Social/community feed | Dilutes advisor value proposition, GoHunt/HuntTalk already serve this |
| Outfitter marketplace | Not our product |
| Multi-state regulatory engine | Legal consequences from wrong regulation display, link to state F&G instead |
| Automated plan re-generation on data change | Creates plan instability, draw results are the defined rebalance trigger |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| DATA-06 | Phase 1 | Pending |
| SHARE-01 | Phase 2 | Pending |
| SHARE-02 | Phase 2 | Pending |
| SHARE-03 | Phase 2 | Pending |
| SHARE-04 | Phase 2 | Pending |
| SHARE-05 | Phase 2 | Pending |
| SHARE-06 | Phase 2 | Pending |
| SHARE-07 | Phase 2 | Pending |
| CAL-01 | Phase 3 | Pending |
| CAL-02 | Phase 3 | Pending |
| CAL-03 | Phase 3 | Pending |
| CAL-04 | Phase 3 | Pending |
| CAL-05 | Phase 3 | Pending |
| CAL-06 | Phase 3 | Pending |
| CAL-07 | Phase 3 | Pending |
| CAL-08 | Phase 3 | Pending |
| ICS-01 | Phase 3 | Pending |
| ICS-02 | Phase 3 | Pending |
| ICS-03 | Phase 3 | Pending |
| ICS-04 | Phase 3 | Pending |
| ICS-05 | Phase 3 | Pending |
| ICS-06 | Phase 3 | Pending |
| ICS-07 | Phase 3 | Pending |
| ICS-08 | Phase 3 | Pending |
| ADV-01 | Phase 4 | Pending |
| ADV-02 | Phase 4 | Pending |
| ADV-03 | Phase 4 | Pending |
| ADV-04 | Phase 4 | Pending |
| ADV-05 | Phase 4 | Pending |
| ADV-06 | Phase 4 | Pending |
| ADV-07 | Phase 4 | Pending |
| ADV-08 | Phase 4 | Pending |
| API-01 | Phase 5 | Pending |
| API-02 | Phase 5 | Pending |
| API-03 | Phase 5 | Pending |
| API-04 | Phase 5 | Pending |
| API-05 | Phase 5 | Pending |
| API-06 | Phase 5 | Pending |
| API-07 | Phase 5 | Pending |
| API-08 | Phase 5 | Pending |
| SCRP-01 | Phase 6 | Pending |
| SCRP-02 | Phase 6 | Pending |
| SCRP-03 | Phase 6 | Pending |
| SCRP-04 | Phase 6 | Pending |
| SCRP-05 | Phase 6 | Pending |
| SCRP-06 | Phase 6 | Pending |
| SCRP-07 | Phase 6 | Pending |
| SCRP-08 | Phase 6 | Pending |
| SCRP-09 | Phase 6 | Pending |
| FRESH-01 | Phase 6 | Pending |
| FRESH-02 | Phase 6 | Pending |
| FRESH-03 | Phase 6 | Pending |
| FRESH-04 | Phase 6 | Pending |
| SAV-01 | Phase 7 | Pending |
| SAV-02 | Phase 7 | Pending |
| SAV-03 | Phase 7 | Pending |
| SAV-04 | Phase 7 | Pending |
| SAV-05 | Phase 7 | Pending |
| SAV-06 | Phase 7 | Pending |
| SAV-07 | Phase 7 | Pending |
| DIFF-01 | Phase 7 | Pending |
| DIFF-02 | Phase 7 | Pending |
| DIFF-03 | Phase 7 | Pending |
| DIFF-04 | Phase 7 | Pending |
| DIFF-05 | Phase 7 | Pending |
| SCOUT-01 | Phase 7 | Pending |
| SCOUT-02 | Phase 7 | Pending |
| SCOUT-03 | Phase 7 | Pending |
| SCOUT-04 | Phase 7 | Pending |
| SCOUT-05 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 75 total
- Mapped to phases: 75
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-21 after initial definition*
