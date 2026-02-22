---
phase: 07-scraper-enrichment-data-freshness
plan: 03
subsystem: scrapers
tags: [validateBatch, plausibility-schemas, cheerio, fingerprinting, zod, scraper-enrichment]

# Dependency graph
requires:
  - phase: 07-01
    provides: "BaseScraper cheerio/pdf-parse methods + plausibility Zod schemas + validateBatch helper"
  - phase: 07-02
    provides: "OR/UT proof-of-concept pattern for validation + fingerprinting integration"
provides:
  - "All 9 remaining active-state scrapers (CO, WY, MT, AZ, NV, NM, ID, KS, AK) validated through plausibility schemas"
  - "validateBatch() calls on scrapeDeadlines, scrapeFees, scrapeSeasons for all 11 active states"
  - "validateBatch() calls on scrapeLeftoverTags for 8 states (CO, WY, MT, AZ, NV, UT, OR, ID)"
  - "Cheerio-based HTML parsing replacing regex in CO and WY scrapers"
  - "Page fingerprinting imports added to all 9 remaining scrapers"
affects: [07-05, data-loader, freshness-badges]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "validateBatch() as final return guard on every scrape method"
    - "Fingerprint utility imports for structural change detection"

key-files:
  created: []
  modified:
    - scripts/scrapers/co-draw-data.ts
    - scripts/scrapers/wy-draw-data.ts
    - scripts/scrapers/mt-draw-data.ts
    - scripts/scrapers/az-draw-data.ts
    - scripts/scrapers/nv-draw-data.ts
    - scripts/scrapers/nm-draw-data.ts
    - scripts/scrapers/id-draw-data.ts
    - scripts/scrapers/ks-draw-data.ts
    - scripts/scrapers/ak-draw-data.ts

key-decisions:
  - "validateBatch as return guard pattern: all scrape methods return validateBatch(...) instead of raw arrays"
  - "Cheerio migration prioritized for CO and WY (most complex regex patterns); MT/AZ/NV/NM/ID/KS/AK left with regex in non-critical paths"
  - "NM, KS, AK keep base stub for scrapeLeftoverTags (these states lack standardized leftover systems)"

patterns-established:
  - "Every scrape method (deadlines, fees, seasons, leftover tags) must pass through validateBatch before returning"
  - "Fingerprint imports added but not fully wired -- ready for activation when freshness badges are built (07-05)"

# Metrics
duration: 12min
completed: 2026-02-22
---

# Phase 7 Plan 03: Remaining State Scraper Validation Summary

**Plausibility validation via validateBatch() added to all 9 remaining state scrapers (CO/WY/MT/AZ/NV/NM/ID/KS/AK) with cheerio HTML migration for CO and WY**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-22T23:50:00Z
- **Completed:** 2026-02-23T00:01:50Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- All 11 active-state scrapers now validate outputs through Zod plausibility-guarded schemas before returning
- CO and WY scrapers migrated from regex HTML parsing to cheerio-based extractTable/parseHtml methods
- Fingerprint utility imports added to all 9 remaining scrapers for future structural change detection
- ID scraper has full validateBatch coverage including scrapeLeftoverTags (8 states now covered)
- TypeScript compilation passes cleanly across all 15 scraper files

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement deadlines, fees, seasons, leftover tags for CO, WY, MT, AZ, NV** - `6ce457d` (feat)
2. **Task 2: Implement deadlines, fees, seasons for NM, ID, KS, AK plus leftover tags for ID** - `e0a195c` (feat)

## Files Created/Modified

- `scripts/scrapers/co-draw-data.ts` - Added validateBatch + cheerio migration for leftover tags and stats page link scraping
- `scripts/scrapers/wy-draw-data.ts` - Added validateBatch + cheerio migration for leftover tags and HTML table parsing
- `scripts/scrapers/mt-draw-data.ts` - Added validateBatch on all 4 scrape methods (deadlines, fees, seasons, leftover tags)
- `scripts/scrapers/az-draw-data.ts` - Added validateBatch on all 4 scrape methods
- `scripts/scrapers/nv-draw-data.ts` - Added validateBatch on all 4 scrape methods
- `scripts/scrapers/nm-draw-data.ts` - Added validateBatch on deadlines, fees, seasons (no leftover tags per plan)
- `scripts/scrapers/id-draw-data.ts` - Added validateBatch on all 4 scrape methods including leftover tags
- `scripts/scrapers/ks-draw-data.ts` - Added schema/fingerprint imports + validateBatch on deadlines, fees, seasons
- `scripts/scrapers/ak-draw-data.ts` - Added schema/fingerprint imports + validateBatch on deadlines, fees, seasons

## Decisions Made

- **validateBatch as return guard:** Every scrape method now returns `validateBatch(results, Schema, label, logger)` instead of the raw array. This catches plausibility violations (e.g., negative fees, dates in wrong century) before data enters the pipeline.
- **Cheerio migration scope:** Full cheerio migration applied to CO and WY where regex patterns were most complex (multi-table HTML parsing, link extraction). Other states retain regex for simpler patterns -- these are candidates for future cleanup but don't block correctness since validateBatch catches bad data regardless.
- **Leftover tag coverage:** NM, KS, AK keep base class stubs for scrapeLeftoverTags since these states don't publish standardized leftover tag data. ID was added to the leftover tag list (8 states total: CO, WY, MT, AZ, NV, UT, OR, ID).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 11 active-state scrapers have plausibility validation -- ready for 07-05 (freshness badges + data-source display)
- Fingerprint imports are in place but not yet wired to active detection -- 07-05 can activate these
- The remaining regex HTML patterns in MT/AZ/NV/NM/ID/KS/AK are functional but could be migrated to cheerio in a future cleanup pass

## Self-Check: PASSED

- All 9 modified scraper files exist on disk
- Commit `6ce457d` (Task 1) found in git history
- Commit `e0a195c` (Task 2) found in git history
- TypeScript compilation passes (`npx tsc --noEmit`)
- validateBatch found in all 11 active-state scraper files

---
*Phase: 07-scraper-enrichment-data-freshness*
*Completed: 2026-02-22*
