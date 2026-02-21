# Odyssey Outdoors — Autonomous Advisor Milestone

## What This Is

A western big-game hunt planning platform that builds personalized multi-state, multi-year strategic roadmaps through a 9-step consultation wizard. Currently delivers static results — this milestone transforms it into a living, autonomous advisor that constantly scrapes real data, synthesizes personalized recommendations, and actively plans for users rather than passively displaying information.

## Core Value

Every number is real, every recommendation is specific to you, and the system actively works for you between visits — like a fiduciary managing your hunting portfolio, not a spreadsheet you maintain yourself.

## Requirements

### Validated

- ✓ 9-step consultation wizard collecting species, budget, style, travel, points — existing
- ✓ 10-year phased roadmap with state-by-state scoring and visible math — existing
- ✓ Unit recommendations with tactical notes — existing
- ✓ Investment calculator with per-species/state cost modeling — existing
- ✓ Dashboard with portfolio health, deadlines, goals, milestones — existing
- ✓ Journey map with 15-year visual timeline — existing
- ✓ Rebalance engine for missed draws — existing
- ✓ Point creep forecasting with confidence bands — existing
- ✓ Calendar export (.ics) for individual deadlines — existing
- ✓ What-If modeler for strategy comparison — existing
- ✓ 11 states, 18 species, ~150 sample units — existing

### Active

- [ ] Live data pipeline replacing all placeholder/estimated values with scraped, verified data
- [ ] Data provenance system — every number has source URL, scrape date, confidence level
- [ ] State F&G scraping infrastructure (deadlines, fees, tag costs, draw odds)
- [ ] Real flight pricing via Amadeus API replacing static estimates
- [ ] Real inflation data via BLS API replacing hardcoded assumptions
- [ ] Intra-year season calendar — month-level hunt scheduling within a single year
- [ ] Savings/budget tool — goal-based hunt funds with monthly targets and tracking
- [ ] Opportunistic discovery feed — leftover tags, OTC hunts, curated to user profile
- [ ] Youth pathway optimization — surface youth-specific advantages and accelerated strategies
- [ ] Scouting hunt strategy — detect OTC overlap with trophy units for dual-purpose missions
- [ ] Shareable plan links — read-only snapshot via unique token URL
- [ ] Full-year .ics calendar subscription (not individual events)
- [ ] Advisor voice throughout dashboard — opinionated, specific, actionable recommendations
- [ ] "Since your last visit" diff view — what changed, new recommendations, action items
- [ ] Draw results as annual heartbeat — automatic rebalance trigger per state

### Out of Scope

- Third-party tag purchase portal — not in the cards right now (user confirmed)
- User authentication system — removed in session 5, not re-adding this milestone
- Database (Supabase/Postgres) — staying with Zustand persist + JSON for now
- GoHunt partnership/API — no API exists, we scrape public data ourselves
- Mobile native app — web-first
- AI chat assistant — advisor voice is structured, not conversational
- Hunt group collaboration (multi-person linked plans) — Phase 2 after share links
- Outfitter marketplace — not our product
- Unit mapping/GPS features — OnX's territory, not ours

## Context

### Existing Architecture
- Next.js 16 App Router + TypeScript + Tailwind CSS 4 + shadcn/ui + Zustand (persist)
- tw-animate-css for animations
- No auth, no database, no backend services currently
- All data in TypeScript constants files (states.ts ~1060 lines, sample-units.ts ~1000 lines)
- Engine: roadmap-generator.ts, draw-odds.ts, point-creep.ts, portfolio-health.ts, roi-calculator.ts, opportunity-scorer.ts, unit-scoring.ts, fee-resolver.ts
- Persist keys: wizard v5, app v2

### Data Landscape
- No state F&G agency offers a public API — the industry runs on manual PDF scraping
- Oregon publishes CSV draw data (zero parsing needed) — best proof of concept state
- Utah has the best reverse-engineerable web app endpoints (dwrapps.utah.gov)
- Arizona hosts draw PDFs on predictable S3 URLs
- BLS inflation API confirmed live and free (500 calls/day)
- Amadeus flight API available (2K free calls/month)
- `ics` npm package (779 stars) handles calendar generation
- Open-source hunting data landscape is empty — massive opportunity to be first

### Current Data Status
- REAL: Point system mechanics, deadlines, license fees, app fees, elevation ranges, airport codes
- PLACEHOLDER: Tag costs (~2023 estimates), flight costs (~2024 averages), success rates, public land %, point creep rates, draw applicant multipliers
- FORMULA: Draw odds (CO/WY/NV accurate), point creep projection, portfolio health, unit scoring

### User Validation
User's hunting buddy conversation confirmed the pain point: "My plan is currently floating in my head. Would be cool to look at all the seasons and strategically fill up your schedule. Strategize how to use points. Professionalize the scheduling process. Currently it's just a phone call with some dudes making up a random plan."

## Constraints

- **Stack**: Next.js 16 + Zustand + Tailwind — no stack changes this milestone
- **No Auth**: No user accounts — all state in browser (Zustand persist) + shareable URLs
- **No Database**: Server-side data lives in JSON files or KV store, not a database
- **Data Accuracy**: FOUNDATIONAL MANDATE — nothing assumed, nothing generalized, everything specific and arithmetic. Every displayed number must have provenance.
- **Scraping Legal**: Rate-limited, User-Agent identified, robots.txt respected, aggressively cached
- **API Budget**: Amadeus free tier (2K/month), BLS free tier (500/day) — stay within limits

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Data pipeline before features | Everything downstream depends on accurate data | — Pending |
| Oregon + Utah as scraping proof of concept | Best structured data sources (CSV + REST endpoints) | — Pending |
| VerifiedDatum<T> wrapper for all data | Provenance chain enables "estimated" badges, builds trust | — Pending |
| Advisor voice: very opinionated | Users want active planning, not passive dashboards | — Pending |
| Share links before hunt groups | Lower complexity, higher virality per engineering hour | — Pending |
| .ics subscription as notification layer | No auth needed, Google Calendar becomes the autonomous agent | — Pending |
| User-reported draw results as feedback loop | Engine gets smarter about YOUR portfolio over time | — Pending |
| BLS API for real inflation | Replace hardcoded 3% assumption with actual CPI data | — Pending |
| Amadeus API for real flight pricing | Replace static $180 estimates with actual fare data | — Pending |

---
*Last updated: 2025-02-21 after session 7 initialization*
