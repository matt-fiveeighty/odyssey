# Odyssey Outdoors — Hunt Planning Platform

## What This Is

A western big-game hunt planning platform that builds personalized multi-state, multi-year strategic roadmaps through a 9-step consultation wizard. Delivers a living, autonomous advisor that scrapes real data, synthesizes personalized recommendations, tracks savings goals, detects what changed since your last visit, and surfaces scouting opportunities — actively planning for users rather than passively displaying information.

## Core Value

Every number is real, every recommendation is specific to you, and the system actively works for you between visits — like a fiduciary managing your hunting portfolio, not a spreadsheet you maintain yourself.

## Requirements

### Validated

- ✓ 9-step consultation wizard collecting species, budget, style, travel, points — pre-existing
- ✓ 10-year phased roadmap with state-by-state scoring and visible math — pre-existing
- ✓ Unit recommendations with tactical notes — pre-existing
- ✓ Investment calculator with per-species/state cost modeling — pre-existing
- ✓ Dashboard with portfolio health, deadlines, goals, milestones — pre-existing
- ✓ Journey map with 15-year visual timeline — pre-existing
- ✓ Rebalance engine for missed draws — pre-existing
- ✓ Point creep forecasting with confidence bands — pre-existing
- ✓ Calendar export (.ics) for individual deadlines — pre-existing
- ✓ What-If modeler for strategy comparison — pre-existing
- ✓ 11 states, 18 species, ~150 sample units — pre-existing
- ✓ Data provenance system (VerifiedDatum<T>, three-tier resolution, confidence propagation) — v1.0
- ✓ Shared Redis cache layer with configurable TTLs — v1.0
- ✓ Shareable plan links (token-based read-only snapshots, 90d TTL) — v1.0
- ✓ Intra-year season calendar (state × month swimlane with urgency colors) — v1.0
- ✓ Full-year .ics calendar subscription (webcal://, stable UIDs, METHOD:PUBLISH) — v1.0
- ✓ Advisor voice throughout dashboard (8 sub-generators, temporal context, CTAs) — v1.0
- ✓ Real flight pricing via Amadeus API (batch-cached, quota-tracked) — v1.0
- ✓ Real inflation data via BLS CPI API (30d cache, cron refresh) — v1.0
- ✓ State F&G scraping infrastructure (11 states, cheerio/pdf-parse, structural fingerprinting) — v1.0
- ✓ FreshnessBadge provenance UI (verified/estimated/stale, hover tooltip) — v1.0
- ✓ Savings/budget tracker (progress rings, traffic light, funded-date projection) — v1.0
- ✓ "Since your last visit" diff view (materiality filter, 4 categories, advisor interpretation) — v1.0
- ✓ Scouting hunt strategy (4-dimension scoring, ScoutingMoveCards, calendar badge) — v1.0

### Active

_No active requirements — next milestone not yet defined._

### Out of Scope

- Third-party tag purchase portal — not in the cards right now (user confirmed)
- User authentication system — removed in session 5, not re-adding
- Database migration (Supabase/Postgres) — Zustand persist + JSON + Redis KV
- GoHunt partnership/API — no API exists, we scrape public data ourselves
- Mobile native app — web-first
- AI chat assistant — hallucination risk in legal domain, advisor voice is structured not conversational
- Hunt group collaboration — future milestone
- Outfitter marketplace — not our product
- Unit mapping/GPS features — OnX's territory
- Real-time push notifications — calendar apps handle this better
- Multi-state regulatory engine — legal consequences, link to state F&G instead
- Automated plan re-generation on data change — draw results are the defined rebalance trigger

## Context

### Current State (post v1.0)

- **Codebase:** 53K LOC TypeScript across 484 files
- **Stack:** Next.js 16 App Router + TypeScript + Tailwind CSS 4 + shadcn/ui + Zustand persist + Upstash Redis
- **Engine:** 8-sub-generator advisor pipeline, scouting detection, diff computation, savings calculator, point creep forecasting, portfolio health, ROI calculator, opportunity scorer
- **Data:** 11 states, 18 species, ~150 units, real Amadeus flights, real BLS inflation, scraped deadlines/fees/seasons
- **Persist keys:** wizard v5, app v2

### Known Tech Debt

- calendar-grid.ts defaults tag type to "draw" — OTC/leftover detection requires scraper→DB→runtime pipeline
- pdf-parse v2 table extraction unvalidated against actual state draw PDFs
- estimated() wrappers at render boundary only (not full VerifiedDatum plumbing through engine internals)

### User Validation

User's hunting buddy conversation confirmed the pain point: "My plan is currently floating in my head. Would be cool to look at all the seasons and strategically fill up your schedule. Strategize how to use points. Professionalize the scheduling process."

## Constraints

- **Stack**: Next.js 16 + Zustand + Tailwind — no stack changes
- **No Auth**: No user accounts — all state in browser (Zustand persist) + shareable URLs
- **No Database**: Server-side data lives in JSON files or KV store, not a database
- **Data Accuracy**: FOUNDATIONAL MANDATE — nothing assumed, nothing generalized, everything specific and arithmetic
- **Scraping Legal**: Rate-limited, User-Agent identified, robots.txt respected, aggressively cached
- **API Budget**: Amadeus free tier (2K/month), BLS free tier (500/day) — stay within limits

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Data pipeline before features | Everything downstream depends on accurate data | ✓ Good — enabled confidence badges, graceful fallbacks |
| Oregon + Utah as scraping proof of concept | Best structured data sources (CSV + REST) | ✓ Good — extended to all 11 states |
| VerifiedDatum<T> wrapper for all data | Provenance chain enables "estimated" badges | ✓ Good — foundation for trust UI |
| Advisor voice: very opinionated | Users want active planning, not passive dashboards | ✓ Good — 8 sub-generators, portfolio-specific |
| Share links before hunt groups | Lower complexity, higher virality per engineering hour | ✓ Good — clean Zustand isolation |
| .ics subscription as notification layer | No auth needed, Google Calendar becomes the agent | ✓ Good — webcal:// works cross-platform |
| Direct fetch over Amadeus SDK | CJS-only SDK incompatible with Next.js 16 | ✓ Good — simpler, no bundling issues |
| BLS API for real inflation | Replace hardcoded 3% assumption with actual CPI | ✓ Good — 3.5% fallback, cache-first |
| Post-build enrichment for advisor notes | Keeps calendar-grid.ts pure data transformation | ✓ Good — clean separation of concerns |
| Savings targetCost derived at render time | Avoids stale cost bug from stored values | ✓ Good — always current |
| Diff computation in useMemo before recordVisit | Prevents comparing "today vs today" | ✓ Good — timing-critical ordering |
| Haversine + static centroids for scouting | Units lack lat/lon, no geocoding API needed | ✓ Good — state-region fallback handles gaps |

---
*Last updated: 2026-02-23 after v1.0 milestone*
