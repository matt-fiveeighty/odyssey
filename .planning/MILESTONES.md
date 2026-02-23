# Milestones

## v1.0 Autonomous Advisor (Shipped: 2026-02-23)

**Phases completed:** 10 phases, 30 plans
**Timeline:** 2026-02-20 → 2026-02-23 (4 days)
**Stats:** 75 feat commits, 484 files changed, 107K insertions, 53K LOC TypeScript
**Execution:** ~2.8 hours total, 6 min avg/plan

**Key accomplishments:**
1. VerifiedDatum provenance system — every number carries source URL, scrape date, confidence level with three-tier resolution (Supabase > Redis > constants)
2. Shareable plan links via unique token URLs with 90-day immutable snapshots in Redis
3. Season calendar swimlane (state × month grid) with urgency color-coding and monthly cost summary
4. webcal:// calendar subscription with isomorphic ICS builder, content-derived stable UIDs, and rich event descriptions
5. 8-sub-generator advisor pipeline delivering opinionated insights with temporal context, point creep detection, and portfolio-specific recommendations
6. Real flight pricing (Amadeus) and inflation data (BLS CPI) replacing all hardcoded estimates, batch-cached via cron
7. Enhanced scrapers (11 states) with cheerio/pdf-parse, structural fingerprinting, plausibility validation, and FreshnessBadge provenance UI
8. Goal-based savings tracker with progress rings, traffic light status, funded-date projection, and catch-up calculations
9. Structured diff view ("since your last visit") with materiality filter and temporal insight suppression
10. Scouting strategy engine with haversine proximity, 4-dimension scoring, violet ScoutingMoveCards, and calendar SCOUT HUNT badges

**Tech debt carried forward:**
- calendar-grid.ts OTC/leftover tag detection deferred (scraper data pipeline doesn't flow into runtime yet)
- pdf-parse v2 table extraction unvalidated against actual state draw PDFs

**Archive:** [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) · [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

---
