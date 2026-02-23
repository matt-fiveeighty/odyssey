---
phase: 08-savings-budget-tracker
plan: 05
subsystem: ui
tags: [react, recharts, savings, budget, forecast, animated-counter]

requires:
  - phase: 08-01
    provides: "SavingsGoal types, UserGoal store, milestones"
  - phase: 08-02
    provides: "calculateAnnualSpendForecast engine function"
  - phase: 08-03
    provides: "SavingsGoalsSection on budget page"
provides:
  - "AnnualSpendForecast component showing year-by-year hunt cost projections"
  - "Budget page integration with forecast after savings goals"
affects: [08-savings-budget-tracker]

tech-stack:
  added: []
  patterns:
    - "Self-gating component pattern (returns null when no data)"
    - "STATE_VISUALS gradient badges for state identification"

key-files:
  created:
    - src/components/budget/AnnualSpendForecast.tsx
  modified:
    - src/app/(app)/budget/page.tsx

key-decisions:
  - "Used STATE_VISUALS gradients for state badges instead of state.color (matches YearByYearBreakdown pattern)"
  - "SPECIES_MAP for display names instead of formatSpeciesName (consistent with sibling components)"

patterns-established:
  - "Forecast visualization: year header bar + item grid with species avatars"

duration: 2min
completed: 2026-02-23
---

# Phase 8 Plan 5: Annual Spend Forecast Summary

**AnnualSpendForecast component with year-by-year hunt cost breakdown, species avatars, state gradient badges, and AnimatedCounter totals on budget page**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T00:47:41Z
- **Completed:** 2026-02-23T00:49:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created AnnualSpendForecast component rendering 5-year cost projections grouped by year
- Each year shows itemized costs with SpeciesAvatar, STATE_VISUALS gradient badges, species name, and per-item cost
- Year totals use AnimatedCounter with primary color for visual emphasis
- Component self-gates (returns null) when no costs exist across all forecast years
- Integrated on budget page after SavingsGoalsSection (SAV-07)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AnnualSpendForecast component** - `467d1ce` (feat)
2. **Task 2: Add AnnualSpendForecast to budget page** - `14e67db` (feat)

## Files Created/Modified
- `src/components/budget/AnnualSpendForecast.tsx` - Annual spend forecast visualization with year-by-year cost breakdown
- `src/app/(app)/budget/page.tsx` - Added AnnualSpendForecast import and rendering after SavingsGoalsSection

## Decisions Made
- Used STATE_VISUALS gradients for state badges instead of inline state.color -- matches existing YearByYearBreakdown and SavingsGoalCard patterns for visual consistency
- Used SPECIES_MAP for species display names instead of formatSpeciesName -- consistent with sibling budget components

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used STATE_VISUALS gradients instead of state.color for badges**
- **Found during:** Task 1
- **Issue:** Plan specified `state.color` for badge backgrounds, but existing budget components (YearByYearBreakdown, SavingsGoalCard) use `STATE_VISUALS[stateId]?.gradient` with `bg-gradient-to-br`
- **Fix:** Imported STATE_VISUALS and used gradient pattern matching sibling components
- **Files modified:** src/components/budget/AnnualSpendForecast.tsx
- **Verification:** Visual consistency with existing budget components
- **Committed in:** 467d1ce (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial styling consistency fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Budget page now has all planned sections: AnnualBudgetPlanner, YearByYearBreakdown, SavingsGoalsSection, AnnualSpendForecast
- Phase 08 plan 04 (SavingsGoalsSection enhancements) is the remaining plan in this phase

## Self-Check: PASSED

- FOUND: src/components/budget/AnnualSpendForecast.tsx
- FOUND: 467d1ce (Task 1 commit)
- FOUND: 14e67db (Task 2 commit)

---
*Phase: 08-savings-budget-tracker*
*Completed: 2026-02-23*
