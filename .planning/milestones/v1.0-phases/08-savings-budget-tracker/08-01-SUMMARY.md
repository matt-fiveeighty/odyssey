---
phase: 08-savings-budget-tracker
plan: 01
subsystem: ui, database
tags: [zustand, persist, savings, budget, typescript]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: Zustand AppState store with UserGoal/Milestone types
provides:
  - SavingsGoal, SavingsContribution, SavingsStatus types in types/index.ts
  - savingsGoals[] slice in AppState with CRUD actions + addContribution
  - Zustand-backed SavingsGoalCard with UserGoal linking and derived targetCost
  - "savings" category added to AdvisorInsightCategory
  - Cascade delete from removeUserGoal to linked savingsGoals
affects: [08-02-PLAN, 08-03-PLAN, 08-04-PLAN, 08-05-PLAN, advisor-voice]

# Tech tracking
tech-stack:
  added: []
  patterns: [derived-cost-pattern, goalId-linking, cascade-delete]

key-files:
  created: []
  modified:
    - src/lib/types/index.ts
    - src/lib/store.ts
    - src/components/budget/SavingsGoalCard.tsx
    - src/components/advisor/AdvisorCard.tsx

key-decisions:
  - "targetCost derived from milestones at render time, never stored on SavingsGoal (avoids stale cost bug)"
  - "Manual goal creation requires linking to a UserGoal via dropdown selector"
  - "dismissedSuggestions kept as useState (intentionally ephemeral, session-only)"
  - "Persist key unchanged at hunt-planner-app-v2 (shallow merge handles existing users)"

patterns-established:
  - "Derived-cost pattern: targetCost computed from milestones.filter(m => m.planId === goalId).reduce() at read time"
  - "GoalId linking: SavingsGoal.goalId references UserGoal.id for all data derivation"
  - "Cascade delete: removeUserGoal also filters savingsGoals by goalId"

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 8 Plan 1: Savings Data Foundation Summary

**SavingsGoal types + Zustand persistence slice + SavingsGoalCard refactored from ephemeral useState to persisted store with UserGoal linking and milestone-derived costs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T00:32:32Z
- **Completed:** 2026-02-23T00:36:07Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- SavingsGoal, SavingsContribution, SavingsStatus types exported from types/index.ts (no targetCost -- derived at render time)
- AppState extended with savingsGoals[] and 4 CRUD actions (add, update, remove, addContribution) under unchanged hunt-planner-app-v2 persist key
- SavingsGoalCard fully refactored: local SavingsGoal interface removed, useState replaced with useAppStore, manual add dialog now requires linking to UserGoal via dropdown
- Cascade delete wired: removeUserGoal also removes linked savingsGoals
- AdvisorInsightCategory extended with "savings" + PiggyBank icon added to AdvisorCard

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SavingsGoal types and extend AdvisorInsightCategory** - `4c278b5` (feat)
2. **Task 2: Add savingsGoals slice to AppState Zustand store** - `366ebb6` (feat)
3. **Task 3: Refactor SavingsGoalCard to use Zustand persistence** - `c1e683b` (feat)

## Files Created/Modified
- `src/lib/types/index.ts` - Added SavingsGoal, SavingsContribution, SavingsStatus types; extended AdvisorInsightCategory with "savings"
- `src/lib/store.ts` - Added savingsGoals slice with CRUD actions and cascade delete in removeUserGoal
- `src/components/budget/SavingsGoalCard.tsx` - Refactored from useState to Zustand, UserGoal linking, derived targetCost
- `src/components/advisor/AdvisorCard.tsx` - Added PiggyBank icon for "savings" category

## Decisions Made
- targetCost is derived from milestones at render time, never stored on SavingsGoal (avoids stale cost bug when goals are updated)
- Manual goal creation requires linking to a UserGoal via dropdown selector (no freeform title/cost inputs)
- dismissedSuggestions kept as useState (intentionally ephemeral -- session-only dismissals)
- Persist key unchanged at hunt-planner-app-v2 (Zustand persist shallow merge defaults new savingsGoals field to [])

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added PiggyBank icon to AdvisorCard category icon map**
- **Found during:** Task 1 (extending AdvisorInsightCategory)
- **Issue:** Adding "savings" to AdvisorInsightCategory caused TS error in AdvisorCard.tsx -- Record<AdvisorInsightCategory, ...> was missing the "savings" key
- **Fix:** Imported PiggyBank from lucide-react and added `savings: PiggyBank` to CATEGORY_ICONS
- **Files modified:** src/components/advisor/AdvisorCard.tsx
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 4c278b5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for type correctness -- extending the union type required updating all exhaustive Record usages. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Savings data foundation complete -- all subsequent plans (calculator, progress rings, advisor insights) can import SavingsGoal from types and read/write via useAppStore
- savingsGoals persists across navigation and browser refresh under existing hunt-planner-app-v2 key
- No blockers for Phase 8 Plan 2

## Self-Check: PASSED

All 4 files verified present. All 3 task commits verified in git log.

---
*Phase: 08-savings-budget-tracker*
*Completed: 2026-02-23*
