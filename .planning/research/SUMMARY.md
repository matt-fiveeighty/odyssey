# Project Research Summary

**Project:** Odyssey Outdoors -- Autonomous Advisor Milestone
**Domain:** Data pipeline + API integrations + advisory intelligence layer for a hunting portfolio management platform
**Researched:** 2026-02-21
**Confidence:** MEDIUM-HIGH

## Executive Summary

Odyssey Outdoors is an existing Next.js 16 hunting portfolio advisor with a 9-step consultation wizard, 10-year roadmap engine, and 15 state scrapers already built. This milestone transforms it from a static results generator into an autonomous, living advisor by adding three layers: (1) a verified data pipeline that replaces all placeholder numbers with real, provenance-tracked data from state F&G websites and external APIs, (2) a set of user-facing delivery mechanisms -- shareable plan links, calendar subscriptions, and a savings tracker, and (3) an opinionated advisor voice that interprets data rather than just displaying it. The financial advisory analogy (Betterment/Wealthfront for hunting) is the guiding design principle across every feature.

The recommended approach is infrastructure-first, features-second. The `VerifiedDatum<T>` provenance wrapper and Upstash Redis data layer must be built before any user-facing feature because every feature depends on the trust layer -- share links need Redis, calendar subscriptions need server-side .ics generation, the advisor voice needs provenance context to speak credibly. The good news: most of the hard engine work already exists (auto-fill, opportunity-scorer, board-state, calendar-export). The remaining work is primarily data plumbing and UI presentation, not algorithmic invention.

The key risks are (1) state F&G website breakage silently corrupting data -- mitigated by a three-tier fallback chain (live scrape > cached last-known-good > hardcoded constants) with plausibility validation at ingest, (2) Amadeus API free tier exhaustion -- mitigated by aggressive weekly batch-caching with 7-day TTLs rather than per-request calls, and (3) Zustand persist serving stale data after scraper updates -- mitigated by separating user preferences from computed values and adding `dataVersion` comparison banners. None of these are showstoppers; all have well-understood mitigation patterns that are partially implemented already.

## Key Findings

### Recommended Stack

The existing stack (Next.js 16, TypeScript, Zod, Supabase, Upstash Redis) stays unchanged. Five new runtime dependencies are needed, all lightweight and well-established. The project already has a substantial scraping infrastructure (15 state scrapers, GitHub Actions weekly cron, Zod schemas, admin endpoints) -- this milestone enriches it rather than replacing it.

**Core additions:**
- **cheerio** (^1.2.0): HTML parsing for state F&G tables -- the Node.js standard, replaces manual regex parsing in existing scrapers
- **pdf-parse** (^2.4.5): PDF text/table extraction for Arizona and Wyoming draw reports -- v2 TypeScript rewrite with table extraction (needs validation)
- **amadeus** (^11.0.0): Flight pricing SDK with OAuth management -- free tier at 2K calls/month, must be paired with aggressive Redis caching
- **ics** (^3.8.1): iCalendar generation for subscription endpoints -- dominant Node.js .ics library, stable spec
- **nanoid** (^5.1.6) + **lz-string** (^1.5.0): Share token generation and plan state compression for Upstash Redis storage
- **Native fetch**: BLS inflation API -- single endpoint, no SDK needed, 500 calls/day free tier

**Critical version note:** pdf-parse v2 table extraction is unverified against actual state draw PDFs. Budget time for validation and potential fallback to pdfjs-dist.

### Expected Features

**Must have (table stakes -- P1):**
- **Intra-year season calendar** -- most validated user need; engine already built via `auto-fill.ts`, this is primarily a UI build
- **Shareable plan links** -- zero dependencies, highest viral coefficient, lowest complexity (~2 days)
- **Full-year .ics calendar subscription** -- trivial extension of season calendar, makes the advisor autonomous via calendar push
- **Advisor voice (initial pass)** -- opinionated interpretation layer on dashboard cards, calendar items, and board-state signals

**Should have (differentiators -- P2):**
- **Goal-based savings tracker** -- backend schema exists in `db/budget.ts`, frontend build only; analogous to Vanguard goal-based investing
- **"Since your last visit" diff view** -- replaces/upgrades the existing Welcome Back card with structured data diffs
- **Scouting hunt strategy** -- dual-purpose detection for OTC units near trophy draw areas; analogous to tax-loss harvesting

**Defer (v2+):**
- **Opportunistic discovery feed** -- requires live data pipeline for freshness; without it, the feed is static and misleading
- **Youth pathway optimization** -- requires per-state youth license/point research that does not exist yet; highest data risk
- **Live data pipeline (full)** -- foundational but can be built incrementally; start with Oregon CSV and Utah REST, defer PDF-heavy states

**Anti-features (explicitly rejected):**
- Real-time push notifications (calendar apps handle this better)
- Social/community feed (dilutes advisor value proposition)
- AI chat assistant (hallucination risk in a domain with legal consequences)
- GPS/mapping (OnX owns this space)
- Tag purchase integration (multi-state legal project)

### Architecture Approach

The architecture divides into six systems with clear boundaries: Scraper Layer (already exists, needs enrichment with cheerio/pdf-parse), Data Store (Supabase for scraped data + Upstash Redis for volatile caches), VerifiedDatum Provenance Layer (new TypeScript wrapper with `verified`/`estimated`/`stale` confidence levels), API Integration Layer (Amadeus + BLS with cache-first patterns), Serving Layer (calendar subscriptions, share links, data endpoints via App Router route handlers), and Client Layer (existing Zustand + engine, unchanged). The key pattern is constants-first with DB override: the app never breaks when external data sources fail.

**Major components:**
1. **VerifiedDatum<T> type system** -- wraps every data point with source URL, scrape date, and confidence level; enables trust signals in UI
2. **Upstash Redis data layer** -- shared client for share link storage (90d TTL), calendar plan snapshots (365d TTL), flight price cache (6h TTL), CPI cache (30d TTL)
3. **Isomorphic .ics builder** -- extracted from existing client-side `calendar-export.ts` into a shared module that works both client-side (download) and server-side (subscription endpoint)
4. **Graceful API degradation** -- every external call (Amadeus, BLS, state F&G) falls back to cached or estimated values on failure; the app never shows empty data

### Critical Pitfalls

1. **State F&G website breakage** -- government sites redesign without notice across 11 states. Prevent with schema validation at ingest, structural fingerprinting, and never overwriting good data with failed scrape results. Build the validation layer BEFORE any scraper goes live.
2. **Amadeus API free tier exhaustion** -- 2K calls/month disappears fast with per-request calls. Prevent by batch-caching weekly via cron, budget-tracking calls in Redis, and automatic fallback to static estimates from `flight-hubs.ts`. Never call Amadeus in a user-facing request path.
3. **Zustand persist serving stale data** -- persisted `StrategicAssessment` bakes in data at generation time. Prevent by separating user preferences from computed values, adding `dataVersion` comparison, and recomputing display values at render time rather than persisting them.
4. **.ics subscription vs download confusion** -- subscriptions require stable deterministic UIDs, server-side generation, and `webcal://` protocol. The existing `uid()` uses `Date.now()` which will cause event duplication in Google Calendar. Fix UID generation to be content-derived before building the subscription endpoint.
5. **Replacing constants without fallback** -- the temptation to delete hardcoded constants once scrapers work removes the safety net. Maintain the three-tier resolution: live scrape > cached last-known-good > hardcoded constants. Test by disabling all external sources and verifying the app still renders.

## Implications for Roadmap

Based on combined research, the milestone breaks into 7 phases with clear dependency ordering. The architecture research's build order aligns with the feature research's priority tiers and the pitfall research's phase-to-prevention mapping.

### Phase 1: Foundation -- VerifiedDatum Type System + Redis Data Layer
**Rationale:** Every subsequent phase depends on the provenance wrapper and Redis client. The pitfalls research is emphatic: build the validation layer before any scraper goes live. This phase has zero user-visible output but is architecturally critical.
**Delivers:** `verified-datum.ts` (type + factory functions + unwrap helpers), `redis.ts` (shared Upstash client extracted from rate-limit.ts), cache helper utilities
**Features addressed:** None directly -- this is infrastructure
**Pitfalls avoided:** "Replacing constants without fallback" (Pitfall 7), "VerifiedDatum wrapping everything at once" (Anti-pattern 3)
**Estimated effort:** 2-3 days

### Phase 2: Shareable Plan Links
**Rationale:** Zero dependencies beyond Phase 1's Redis layer. Lowest complexity, highest viral coefficient. The feature research calls this "the easiest win with the highest viral impact." Build it first among user-facing features to validate the Redis + token + server-render pattern that calendar subscriptions will reuse.
**Delivers:** POST `/api/share` (create link), GET `/shared/[token]/page.tsx` (read-only view), share button in results UI
**Features addressed:** Shareable plan links (P1)
**Pitfalls avoided:** "Share URL token security" (Pitfall 6) -- use crypto.randomUUID, not JWTs; snapshot immutability; 90-day TTL
**Estimated effort:** 2 days

### Phase 3: Intra-Year Season Calendar + .ics Subscription
**Rationale:** The season calendar is the most validated user need and the engine work already exists in `auto-fill.ts`. The .ics subscription is a trivial extension once the calendar UI exists. Grouping them avoids building the calendar event model twice. Requires extracting `buildICS()` into an isomorphic module (Architecture Pattern 4).
**Delivers:** Month-by-month swimlane calendar UI, refactored `ics-builder.ts`, GET `/api/cal/[token]` subscription endpoint, `webcal://` URL generation
**Features addressed:** Intra-year season calendar (P1), Full-year .ics subscription (P1)
**Pitfalls avoided:** ".ics subscription vs download confusion" (Pitfall 5) -- stable UIDs, server-side generation, VTIMEZONE handling, `METHOD:PUBLISH`
**Estimated effort:** 5-6 days

### Phase 4: Advisor Voice (Initial Pass)
**Rationale:** The advisor voice is not a standalone feature -- it is a presentation layer that enhances every existing card and metric. It can be applied incrementally starting with dashboard cards, then calendar items. The feature research notes the existing `BoardSignal` type is a prototype. This phase extends it with interpretation, recommendation, and CTA patterns.
**Delivers:** `AdvisorInsight` type system, opinionated dashboard card rewrites, "so what?" interpretations on board-state signals, deadline proximity commentary
**Features addressed:** Advisor voice (P1)
**Pitfalls avoided:** "Advisor recommendations contradicting user plan" -- comments on the user's plan, never suggests abandoning it
**Estimated effort:** 3-4 days

### Phase 5: API Integrations (Amadeus + BLS)
**Rationale:** Depends on Phase 1's Redis caching layer. These are cache-first integrations: the cron job populates Redis, user-facing routes serve from cache. Building them after the calendar and share links means the core user experience works before adding live data, and the live data enriches what already exists.
**Delivers:** `src/lib/api/amadeus.ts`, `src/lib/api/bls.ts`, GET `/api/flights/quote`, GET `/api/inflation/cpi`, monthly cron jobs for refresh, quota monitoring in Redis
**Features addressed:** Real flight pricing, real inflation data (active requirements from PROJECT.md)
**Pitfalls avoided:** "Amadeus free tier exhaustion" (Pitfall 4) -- batch-cache weekly, budget-track calls, graceful fallback to static estimates
**Estimated effort:** 4-5 days

### Phase 6: Scraper Enrichment + Data Freshness UI
**Rationale:** The 15 state scrapers exist but need enrichment (fees, deadlines, seasons, leftover tags). This phase adds cheerio and pdf-parse to `BaseScraper`, implements the `scrapeDeadlines()` and `scrapeFees()` methods, and builds the freshness badge UI. Grouped because freshness badges are meaningless without enriched scrapers.
**Delivers:** Enhanced `BaseScraper` with `fetchAndParse()` (cheerio) and `fetchPdf()` (pdf-parse), per-state deadline/fee/season scraper implementations, `FreshnessBadge` component, provenance tooltips, structural fingerprinting for breakage detection
**Features addressed:** Live data pipeline (partial -- foundational), Data provenance system (active requirements from PROJECT.md)
**Pitfalls avoided:** "State F&G website breakage" (Pitfall 1), "PDF parsing fragility" (Pitfall 2) -- start with Oregon CSV + Utah REST, defer PDF-heavy states
**Estimated effort:** 8-10 days

### Phase 7: Second-Wave Features (Savings Tracker + Diff View + Scouting)
**Rationale:** These are P2 features that build on the P1 foundation. The savings tracker backend already exists in `db/budget.ts`. The diff view upgrades the existing Welcome Back card. Scouting strategy leverages the existing opportunity-finder. Group them as a follow-up wave after the core "autonomous advisor" experience is validated.
**Delivers:** Goal-based savings tracker UI with progress rings, "since your last visit" structured diff engine, dual-purpose scouting hunt detection
**Features addressed:** Savings tracker (P2), "Since your last visit" diff (P2), Scouting hunt strategy (P2)
**Pitfalls avoided:** "Diff showing every scraped data change" -- filter by materiality (>$25 or >5 days for deadlines)
**Estimated effort:** 12-14 days

### Phase Ordering Rationale

- **Infrastructure before features:** Phase 1 (VerifiedDatum + Redis) unlocks every subsequent phase. Without it, share links have no storage, calendar subscriptions have no plan snapshots, and API integrations have no cache.
- **Quick wins before heavy lifts:** Phases 2-4 (share links, calendar, advisor voice) deliver the "autonomous advisor" promise with 10-12 days of work. The app feels transformed before the data pipeline (Phase 6) is built.
- **Data pipeline after core UX:** Scraper enrichment is the highest-risk, highest-effort phase. Deferring it to Phase 6 means the core user experience works with existing constants/estimates. When live data arrives, it enriches what already exists rather than being a prerequisite.
- **P2 features last:** Phase 7 is explicitly after validation. Ship P1 features, see if users engage, then add savings/diff/scouting based on actual demand.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Calendar):** The .ics subscription pattern has subtle gotchas (UID stability, Google Calendar refresh behavior, VTIMEZONE). Recommend `/gsd:research-phase` before implementation.
- **Phase 5 (API Integrations):** Amadeus SDK v11 compatibility with Next.js 16 server components is unverified. BLS API registration and exact rate limits need current-docs verification.
- **Phase 6 (Scraper Enrichment):** PDF parsing quality for Arizona/Wyoming/Montana draw reports is completely unvalidated. Per-state scraper implementation will require state-by-state research.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Pure TypeScript types + Redis client extraction. Well-documented, zero unknowns.
- **Phase 2 (Share Links):** Token + Redis + server component render. Standard pattern, existing Upstash Redis infrastructure proves it works.
- **Phase 4 (Advisor Voice):** UI rewrite of existing card components. No external dependencies, no data requirements.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | All packages verified via npm registry. pdf-parse v2 table extraction is the one uncertainty -- needs hands-on validation with actual state PDFs. |
| Features | MEDIUM | Feature prioritization is well-reasoned but competitor analysis and financial platform analogies are training-data-driven (May 2025 cutoff). User validation quotes from PROJECT.md add confidence. |
| Architecture | HIGH | Based on deep codebase analysis of existing infrastructure. All proposed patterns extend what already works (data-loader fallback chain, Upstash Redis client, calendar-export). Next.js 16 route handler docs were verified via WebFetch. |
| Pitfalls | MEDIUM | Government website breakage patterns are well-established and high confidence. Amadeus/BLS API specifics are training-data-driven and should be verified against current docs. .ics subscription gotchas (UIDs, refresh timing) are RFC 5545-based and stable. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **pdf-parse v2 table extraction quality:** Must be validated against actual Arizona S3 PDFs and Wyoming draw reports before committing to PDF-heavy scraper implementations. Budget a spike task in Phase 6 for this.
- **Amadeus SDK v11 exact free tier limits and Next.js 16 compatibility:** Training data says 2K calls/month, but verify against current Amadeus docs before building the quota management system.
- **Youth license/point rules per state:** The youth pathway feature (deferred to v2+) requires state-by-state data that does not exist in the codebase or in readily available structured form. This is a research project unto itself.
- **cheerio v1.2.0 stability:** Published on the same day as research (2026-02-21). Verify this is a stable release and not an artifact of npm cache before adopting. Consider pinning to v1.1.x if v1.2.0 is brand new.
- **Upstash Redis free tier storage limits:** At 256MB free tier, share links at 30KB each support ~8,500 active links. Monitor usage and plan for compression or tier upgrade if adoption exceeds projections.
- **Google Calendar subscription refresh behavior:** Documented as 12-24h refresh interval but this is not controllable. User-facing copy must not promise real-time calendar updates. Validate during Phase 3 implementation.

## Sources

### Primary (HIGH confidence)
- npm registry -- all package versions, publish dates, dependency trees verified directly via `npm view`
- Next.js 16 Route Handlers documentation (v16.1.6, updated 2026-02-20) -- verified via WebFetch
- Vercel Cron Jobs documentation -- verified via WebFetch
- Existing codebase: `base-scraper.ts`, `data-loader.ts`, `calendar-export.ts`, `rate-limit.ts`, `store.ts`, `roadmap-generator.ts`, all engine files, `vercel.json`, `scrape-draw-data.yml`

### Secondary (MEDIUM confidence)
- Financial advisory platform patterns (Betterment, Wealthfront, Vanguard, Personal Capital) -- training data, May 2025 cutoff
- RFC 5545 iCalendar specification -- training data, stable standard
- BLS API documentation -- training data, rate limits may have changed
- Government web scraping best practices -- training data, patterns are well-established

### Tertiary (LOW confidence)
- Amadeus Self-Service API free tier specifics -- training data only, exact limits need verification against current docs
- pdf-parse v2 table extraction capabilities -- npm description claims it, unvalidated with real PDFs
- cheerio v1.2.0 release stability -- same-day publish, may be too fresh

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
