---
plan: "07-02"
started: 2026-02-22T20:56:00Z
completed: 2026-02-22T21:15:00Z
duration: "19 min"
status: complete
---

# Plan 07-02: Oregon + Utah PoC Scrapers

## What was built
Structural fingerprinting module (`src/lib/scrapers/fingerprint.ts`) and data-loss guard (`src/lib/scrapers/plausibility.ts`) for scraper change detection and safe upserts. Oregon and Utah scrapers fully upgraded to use cheerio-based HTML parsing, pdf-parse PDF extraction, structural fingerprinting, and plausibility-validated outputs.

## Key files

### Created
- `src/lib/scrapers/fingerprint.ts` — SHA-256 structural fingerprints from HTML DOM structure (tables, forms, sections)
- `src/lib/scrapers/plausibility.ts` — guardAgainstDataLoss prevents 0-row upserts, checkRowCountSanity flags >80% drops

### Modified
- `scripts/scrapers/or-draw-data.ts` — Cheerio-based extractTable/parseHtml, fingerprinting on ODFW pages, plausibility validation on all outputs
- `scripts/scrapers/ut-draw-data.ts` — Cheerio-based HTML parsing, fetchPdfBuffer/extractPdfText for PDFs, fingerprinting on DWR pages, plausibility validation

## Decisions
- [07-02]: Renamed UT `parsePdfText` → `parsePdfDrawData` to avoid collision with inherited `BaseScraper.extractPdfText`
- [07-02]: Fingerprinting applied to key entry pages only (report downloads, controlled hunts, draw odds) — not every fetched sub-page
- [07-02]: Plausibility validation wired into all data methods returning arrays (deadlines, fees, seasons, leftovers) via `validateBatch()`
- [07-02]: Regex patterns for text content extraction (dates, fee amounts, unit numbers) kept as-is — only HTML structural parsing migrated to cheerio

## Verification
- `npx tsc --noEmit` passes clean
- Zero regex HTML patterns (`/<table|/<tr|/<th|/<td`) in both scraper files
- UT scraper uses `fetchPdfBuffer()` + `extractPdfText()` for all PDF URLs
- Both scrapers import fingerprinting and plausibility modules
- Both scrapers validate outputs through Plausible*Schema via validateBatch()

## Self-Check: PASSED
