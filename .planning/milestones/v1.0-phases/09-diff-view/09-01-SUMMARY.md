---
phase: 09-diff-view
plan: 01
subsystem: engine
tags: [diff-engine, temporal, advisor-voice, zustand, materiality-filter]

# Dependency graph
requires:
  - phase: 05-advisor-voice
    provides: "TemporalContext, formatTemporalPrefix, buildTemporalContext, AdvisorCTA, lastVisitAt in AppState"
  - phase: 05-advisor-voice
    provides: "detectCreepShifts from advisor-creep.ts, CreepShiftResult type"
  - phase: 03-season-calendar
    provides: "getUrgencyLevel, daysUntilDate from urgency.ts"
provides:
  - "computeDiffItems pure function pipeline returning DiffItem[]"
  - "DiffItem, DiffSource, DiffCategory types"
  - "MATERIALITY_THRESHOLDS and DIFF_CATEGORY_PRIORITY constants"
  - "seenDiffIds, lastDiffComputedAt, markDiffSeen, markAllDiffsSeen in AppState"
affects: [09-diff-view, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Sub-generator pipeline: 4 generators -> materiality filter -> sort -> cap", "Stable deterministic IDs for cross-session tracking", "Stale assessment guard to prevent diffs after plan regeneration"]

key-files:
  created:
    - src/lib/engine/diff-engine.ts
  modified:
    - src/lib/types/index.ts
    - src/lib/store.ts

key-decisions:
  - "Stale assessment guard: skip diffs when assessment.createdAt > lastDiffComputedAt (prevents showing stale diffs after plan regeneration)"
  - "Categorization inline in sub-generators (not a separate step) since each source maps to a fixed category"
  - "DiffItem reuses existing AdvisorCTA type (no parallel definition)"
  - "No persist key bump for seenDiffIds/lastDiffComputedAt (nullable/default-empty fields)"
  - "Draw result diffs scoped to species within stateRecommendations (not all available species)"

patterns-established:
  - "Diff sub-generator pattern: each returns DiffItem[] with source, category, advisor-voice interpretation"
  - "Materiality filter pattern: per-source thresholds with always-material sources"
  - "Stable diff ID format: diff-{source}-{stateId}-{speciesId}"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 9 Plan 1: Diff Engine Pipeline Summary

**Pure-function diff engine with 4 sub-generators (deadline proximity, draw results, point creep, new opportunities), materiality filter, category-priority sorting, and Zustand seen-tracking persistence**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T02:01:06Z
- **Completed:** 2026-02-23T02:04:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- DiffItem, DiffSource, DiffCategory types added to the shared types module
- Complete diff engine pipeline: 4 sub-generators -> materiality filter -> sort by category priority -> cap at 5 items
- AppState extended with seenDiffIds, lastDiffComputedAt, markDiffSeen, and markAllDiffsSeen for cross-session diff tracking
- Stale assessment guard prevents showing misleading diffs after plan regeneration

## Task Commits

Each task was committed atomically:

1. **Task 1: DiffItem types and AppState store extensions** - `fd37b89` (feat)
2. **Task 2: Diff engine pipeline** - `175237b` (feat)

## Files Created/Modified
- `src/lib/engine/diff-engine.ts` - 335-line pure function module: computeDiffItems pipeline with 4 sub-generators, materiality filter, category sort
- `src/lib/types/index.ts` - Added DiffItem, DiffSource, DiffCategory types (reuses existing AdvisorCTA)
- `src/lib/store.ts` - Added seenDiffIds, lastDiffComputedAt state + markDiffSeen, markAllDiffsSeen actions to AppState

## Decisions Made
- Stale assessment guard: skip diffs when assessment.createdAt > lastDiffComputedAt (prevents showing stale diffs after plan regeneration, per Pitfall 3 in research)
- Categorization done inline in each sub-generator rather than as a separate pipeline step, since each source maps to a fixed category (deadline->action_required/warning, draw->status_update, creep->warning, opportunity->opportunity)
- Draw result diffs scoped to species within stateRecommendations only (not all species a state offers), ensuring relevance to the user's active plan
- No persist key bump -- seenDiffIds defaults to [] and lastDiffComputedAt defaults to null, both compatible with Zustand's shallow merge on existing users

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Diff engine pipeline is ready for Plan 02 (UI integration)
- computeDiffItems can be called from dashboard with temporal context + assessment data
- seenDiffIds tracking enables dismiss/seen functionality in the UI layer

---
*Phase: 09-diff-view*
*Completed: 2026-02-22*
