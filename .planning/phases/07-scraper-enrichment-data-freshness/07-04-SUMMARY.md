---
plan: "07-04"
started: 2026-02-22T20:55:00Z
completed: 2026-02-22T21:25:00Z
duration: "30 min"
status: complete
---

# Plan 07-04: FreshnessBadge + Data Loader Merging

## What was built
FreshnessBadge component for datum-level provenance display with confidence dot and hover tooltip. DataSourceBadge enhanced with "Data last updated" timestamp and relative time. Data loader extended to merge scraped fees and seasons into state constants alongside existing deadline merging.

## Key files

### Created
- `src/components/shared/FreshnessBadge.tsx` — VerifiedDatum-aware confidence indicator (green/blue/amber/red dot + tooltip with source, date, view-source link)

### Modified
- `src/components/shared/DataSourceBadge.tsx` — Added `showLastUpdated` prop with relative time display, client-side useEffect for hydration safety
- `src/lib/engine/data-loader.ts` — Added mergeFees() and mergeSeasons() functions, wired into both Tier 1 and Tier 2 paths, extended DataStatus with fee/season counts

## Decisions
- [07-04]: FreshnessBadge uses isStale flag override — if datum.isStale is true, confidence displays as "stale" regardless of original confidence
- [07-04]: Client-side staleness computation via useState + useEffect to avoid server/client hydration flicker
- [07-04]: Fee merging updates tagCosts (species-specific) and licenseFees (app/point/qualifying) from scraped_fees table
- [07-04]: Season merging stores state-level summaries as _scrapedSeasons extension (non-breaking) since seasons primarily live at unit level
- [07-04]: DataStatus extended with dbFeeCount and dbSeasonCount for dashboard status display

## Verification
- `npx tsc --noEmit` passes clean
- FreshnessBadge.tsx exports FreshnessBadge with "use client" directive
- DataSourceBadge accepts showLastUpdated prop and renders timestamp
- data-loader.ts queries scraped_fees and scraped_seasons tables
- data-loader.ts has mergeFees and mergeSeasons wired into both tiers
- getDataStatus() returns dbFeeCount and dbSeasonCount

## Self-Check: PASSED
