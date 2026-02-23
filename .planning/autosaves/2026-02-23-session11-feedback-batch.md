# Session 11 — Feedback Batch Implementation

## Date: 2026-02-23

## What Was Done (12 files, +440 lines)

### Critical Logic Fixes
1. **Hunt classification fix** — `estimateDrawOdds()` now properly calculates actual draw odds (not harvest success rate). NM random draw with 25 tags correctly classifies as APPLY (not HUNT). Threshold: >=51% draw odds for green HUNT status.
2. **Journey data reclassification** — Low-odds "hunt" actions (< 51% draw odds) now show as applications on the interactive map, not as green hunt markers.

### State Data Enrichment
3. **Niche facts for all 15 states** — Added `nicheFacts: string[]` to State type and populated for CO, WY, MT, NV, AZ, UT, NM, OR, ID, KS, WA, NE, SD, ND, AK. Examples:
   - CO: "Points are per species" / "OTC 2nd and 3rd rifle elk tags always available"
   - ID: "If you draw a controlled elk tag, you automatically get a spring black bear tag"
   - NM: "Pure random draw — NO points system"
   - NV: "Bonus squared: 5 points = 25 chances"

### UI Enhancements
4. **StateDetailModal** — New "Insider Knowledge" section with niche facts, quick-jump pill, missed deadlines in red with "Missed" badge
5. **InteractiveMap** — States grow on hover (scale 1.06), brighter fill, thicker stroke
6. **YearTimeline** — APPLY/HUNT/BUILD labels next to each year, color-coded (green/blue/muted), vertical-only scroll
7. **Portfolio page** — Species-level fee breakdown per state (license + per-species costs), niche fact highlight
8. **StatePortfolio (results)** — Fee breakdown inline, first niche fact displayed
9. **ApplicationStatusBoard** — Fee summary per action (license + app + tag if drawn)
10. **RoadmapTimeline** — Fee breakdown per action (license + app + point costs)
11. **Cost ranges** — "if drawn" shows low end (no tags) to high end (all tags)

### Files Changed
- `src/lib/types/index.ts` — Added `nicheFacts?: string[]` to State type
- `src/lib/constants/states.ts` — Added nicheFacts arrays to all 15 states (+120 lines)
- `src/lib/engine/roadmap-generator.ts` — `estimateDrawOdds()` function, draw odds threshold logic
- `src/lib/engine/journey-data.ts` — >=51% threshold for hunt vs apply classification
- `src/components/journey/StateDetailModal.tsx` — Insider Knowledge section, missed deadlines
- `src/components/journey/InteractiveMap.tsx` — Hover grow animation
- `src/components/journey/YearTimeline.tsx` — APPLY/HUNT labels
- `src/components/roadmap/ApplicationStatusBoard.tsx` — Fee summary
- `src/components/roadmap/RoadmapTimeline.tsx` — Fee breakdown
- `src/components/results/sections/StatePortfolio.tsx` — Fee breakdown + niche facts
- `src/app/(app)/portfolio/page.tsx` — Species-level fees + niche facts
- `src/app/(app)/roadmap/page.tsx` — Layout tweaks

## Status
- Build: CLEAN
- TypeScript: CLEAN
- Not committed yet
