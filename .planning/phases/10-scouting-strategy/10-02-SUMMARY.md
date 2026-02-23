# Plan 10-02 Summary: ScoutingMoveCard UI + Calendar Badge + Advisor Sub-Generator

**Status:** Complete
**Duration:** ~5 min (manual execution)
**Commits:** 4f50553, c301df5

## What Was Built

### Advisor Scouting Sub-Generator (src/lib/engine/advisor-scouting.ts) — NEW
- `generateScoutingInsights(assessment, scoutingOpps)` — 8th sub-generator in advisor pipeline
- Capped at 2 insights, sorted by totalScore descending
- Category: "scouting", urgency: "informational", signal: "positive"
- Interpretation includes terrain overlap, distance, strategic connection
- CTA links to /plan-builder
- portfolioContext shows target unit years-away status

### Advisor Pipeline Wiring (src/lib/engine/advisor.ts)
- Imports `detectScoutingOpportunities` + `generateScoutingInsights`
- Calls detection internally (no new function parameters)
- Scouting insights added to flattened `all[]` array after savings insights

### Calendar ScoutingTarget Metadata (src/lib/engine/calendar-grid.ts)
- Added `scoutingTarget?: ScoutingTarget` field to `CalendarSlotData` interface
- Imported `ScoutingTarget` from types

### ScoutingMoveCard (src/components/results/sections/StatePortfolio.tsx)
- Memoized `ScoutingMoveCard` component with violet accent theme
- Binoculars icon + "Scouting Move" header badge
- Scout unit info: state/unit/species, OTC vs high-odds, success rate
- Strategic connection paragraph from `opp.strategicReason`
- Target unit reference with Target icon + years-to-build
- Score pills: terrain overlap tags + total score /100
- Distance display when available
- Section header "Scouting Opportunities" with Binoculars icon
- Grid layout (2-col on sm+) below Also Considered section
- Conditional rendering: hidden when no scouting opportunities

### Calendar SCOUT HUNT Badge (src/components/results/sections/CalendarSlot.tsx)
- Detects `slot.scoutingTarget` presence
- Override urgency classes → violet border/bg when scouting
- "SCOUT HUNT" badge replaces tag type badge (violet-500/15 bg, violet-400 text)
- Tooltip shows scouting context: target state, unit code, strategic reason

## Must-Haves Verified
- ✅ Scouting hunts appear with distinct violet treatment in calendar
- ✅ ScoutingMoveCards render in results with strategic connection
- ✅ Advisor explains scouting strategy with specific details
- ✅ Calendar slots have scoutingTarget metadata for tooltip display
- ✅ `npx tsc --noEmit` passes clean
- ✅ `npm run build` succeeds
