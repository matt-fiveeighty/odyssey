---
phase: 07-scraper-enrichment-data-freshness
plan: 01
subsystem: scraper
tags: [cheerio, pdf-parse, zod, html-parsing, pdf-extraction, plausibility-validation]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: "BaseScraper class, Zod schemas, scraper infrastructure"
provides:
  - "cheerio HTML parsing (parseHtml, extractTable) in BaseScraper"
  - "pdf-parse v2 PDF extraction (fetchPdfBuffer, extractPdfText, parsePdfTableLines) in BaseScraper"
  - "5MB response guard on fetchPage() preventing OOM in GitHub Actions"
  - "Plausibility-guarded Zod schemas (PlausibleFee, PlausibleDeadline, PlausibleSeason, PlausibleLeftoverTag, PlausibleDrawHistory)"
affects: [07-02, 07-03, 07-04, 07-05]

# Tech tracking
tech-stack:
  added: [cheerio 1.2.0, pdf-parse 2.4.5]
  patterns: [header-keyed table extraction, plausibility refinement schemas, response size guards]

key-files:
  created: []
  modified:
    - scripts/scrapers/base-scraper.ts
    - scripts/scrapers/schemas.ts
    - package.json

key-decisions:
  - "Used PDFParse class API (pdf-parse v2) instead of default export (v1 pattern)"
  - "Named base method extractPdfText to avoid collision with existing UT/KS parsePdfText methods"
  - "Removed @types/pdf-parse since v2 ships its own TypeScript types"

patterns-established:
  - "Plausibility schema pattern: base schema for structure, Plausible*Schema for domain guards -- callers choose which to pass to validateBatch()"
  - "Response size guard pattern: check Content-Length header first (avoids buffering), then check actual body length"
  - "PDF buffer fetching pattern: fetchPdfBuffer returns Buffer (not text) with 20MB limit and exponential backoff retry"

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 7 Plan 1: Scraper Foundation Summary

**Cheerio HTML parsing + pdf-parse v2 PDF extraction in BaseScraper, 5MB response guard, and plausibility-guarded Zod schemas for all scraped data types**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T20:49:10Z
- **Completed:** 2026-02-22T20:52:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- BaseScraper now provides 5 new protected methods for HTML and PDF parsing available to all state scrapers
- fetchPage() rejects responses over 5MB (Content-Length header check + body size check) to prevent OOM in GitHub Actions
- 5 plausibility-guarded Zod schemas enforce domain-specific validation (fee ranges, date ranges, odds bounds)
- Zero breaking changes to existing scrapers (KS, UT, CO, OR) or the run-all orchestrator

## Task Commits

Each task was committed atomically:

1. **Task 1: Install cheerio and pdf-parse, add HTML/PDF parsing methods to BaseScraper** - `37deb56` (feat)
2. **Task 2: Add plausibility refinements to Zod schemas** - `71873f3` (feat)

## Files Created/Modified
- `scripts/scrapers/base-scraper.ts` - Added cheerio/pdf-parse imports, parseHtml(), extractTable(), fetchPdfBuffer(), extractPdfText(), parsePdfTableLines(), 5MB guard on fetchPage()
- `scripts/scrapers/schemas.ts` - Added PlausibleFeeSchema, PlausibleDeadlineSchema, PlausibleSeasonSchema, PlausibleLeftoverTagSchema, PlausibleDrawHistorySchema, updated validateBatch() JSDoc
- `package.json` - Added cheerio 1.2.0 and pdf-parse 2.4.5 as production dependencies

## Decisions Made
- **pdf-parse v2 class API:** v2.4.5 ships a `PDFParse` class with `.getText()` instead of v1's default export function. Used `new PDFParse({ data: new Uint8Array(buffer) })` with explicit `.destroy()` for resource cleanup.
- **extractPdfText naming:** Existing UT and KS scrapers already define private `parsePdfText()` methods with different signatures. Named the base class method `extractPdfText()` to avoid TypeScript inheritance conflicts while keeping both usable.
- **No @types/pdf-parse needed:** pdf-parse v2 ships its own TypeScript declarations, so the @types package was removed after initial install.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pdf-parse v2 API incompatibility**
- **Found during:** Task 1 (adding imports)
- **Issue:** Plan specified `import pdfParse from "pdf-parse"` (v1 default export pattern), but v2.4.5 has no default export -- it exports `PDFParse` class
- **Fix:** Changed import to `import { PDFParse } from "pdf-parse"`, updated extractPdfText to use class-based API with `new PDFParse({ data })` + `.getText()` + `.destroy()`
- **Files modified:** scripts/scrapers/base-scraper.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 37deb56 (Task 1 commit)

**2. [Rule 3 - Blocking] parsePdfText name collision with existing scrapers**
- **Found during:** Task 1 (type checking)
- **Issue:** UT scraper has `private parsePdfText(text: string, speciesIds: string[])` and KS scraper has `private parsePdfText(text: string, year: number)` -- both incompatible with base class `protected parsePdfText(buffer: Buffer): Promise<string>`
- **Fix:** Renamed base class method to `extractPdfText()` to avoid inheritance conflicts
- **Files modified:** scripts/scrapers/base-scraper.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors across all scraper files
- **Committed in:** 37deb56 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for type safety. Method rename is cosmetic only -- downstream plans can use `extractPdfText()` instead of `parsePdfText()`. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- BaseScraper HTML/PDF methods ready for OR scraper (Plan 02), UT scraper (Plan 03), and remaining state scrapers
- Plausibility schemas ready for all downstream scrapers to use via `validateBatch(rows, PlausibleFeeSchema, ...)`
- Existing UT/KS scrapers continue to work unchanged -- their private `parsePdfText` methods are unaffected

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 07-scraper-enrichment-data-freshness*
*Completed: 2026-02-22*
