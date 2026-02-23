---
phase: 08-savings-budget-tracker
plan: 04
subsystem: engine
tags: [advisor, savings, pure-functions, insights]

# Dependency graph
requires:
  - phase: 08-01
    provides: SavingsGoal type, savingsGoals store slice, PiggyBank icon in AdvisorCard
  - phase: 08-02
    provides: calculateSavingsStatus, calculateCatchUpDelta, deriveTargetCost from savings-calculator.ts
  - phase: 05-advisor-voice
    provides: advisor.ts pipeline, AdvisorCard.tsx, AdvisorInsight type with category/urgency
provides:
  - generateSavingsInsights sub-generator for behind-schedule savings goals
  - Savings insights wired into advisor pipeline with default params for backwards compat
affects: [08-05-budget-page, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [sub-generator pattern matching existing advisor-creep.ts]

key-files:
  created: [src/lib/engine/advisor-savings.ts]
  modified: [src/lib/engine/advisor.ts, src/app/(app)/dashboard/page.tsx]

key-decisions:
  - "Savings urgency caps: red='soon', amber='informational', never 'immediate' (deadlines rank higher)"
  - "Default params (savingsGoals=[], userGoals=[]) for backwards compat at all existing call sites"
  - "Skipped AdvisorCard PiggyBank changes -- already done as 08-01 deviation"

patterns-established:
  - "Savings sub-generator follows same pattern as advisor-creep.ts: export single function, return AdvisorInsight[]"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 8 Plan 4: Advisor Savings Sub-generator Summary

**Savings advisor sub-generator producing dollar-specific catch-up insights for behind-schedule hunt fund goals, wired into the 7-insight advisor pipeline**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T00:47:36Z
- **Completed:** 2026-02-23T00:49:47Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `generateSavingsInsights` pure function producing up to 2 insights for behind-schedule savings goals
- Wired savings sub-generator into advisor pipeline as 7th sub-generator with backwards-compatible default params
- Savings insights include specific dollar amounts in interpretation text (SAV-06): deficit, monthly increase, and portfolio context
- Urgency capped at "soon" (red) and "informational" (amber) so deadlines/discipline always rank higher

## Task Commits

Each task was committed atomically:

1. **Task 1: Create advisor-savings.ts sub-generator** - `d91b73a` (feat)
2. **Task 2: Wire savings into advisor pipeline and AdvisorCard** - `a2746f6` (feat)

## Files Created/Modified
- `src/lib/engine/advisor-savings.ts` - Savings advisor sub-generator with generateSavingsInsights
- `src/lib/engine/advisor.ts` - Added savingsGoals/userGoals params, import, and call to generateSavingsInsights
- `src/app/(app)/dashboard/page.tsx` - Pass savingsGoals + userGoals to generateAdvisorInsights call

## Decisions Made
- Savings urgency caps: red goals use "soon", amber goals use "informational", NEVER "immediate" -- ensures deadline and discipline insights always outrank savings in the advisor pipeline sort
- Default parameters `savingsGoals: SavingsGoal[] = []` and `userGoals: UserGoal[] = []` added as last params for backwards compatibility -- no changes needed at any other call site
- Skipped AdvisorCard PiggyBank icon changes since they were already completed as a deviation fix in 08-01

## Deviations from Plan

None - plan executed exactly as written. The PiggyBank icon was already present in AdvisorCard.tsx from 08-01 (plan acknowledged this possibility: "check first -- if PiggyBank is already there, skip that step").

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Advisor pipeline now includes savings insights -- budget page (08-05) can link from advisor CTA
- All savings engine pieces complete: calculator (08-02), progress ring (08-03), advisor (08-04)
- Only 08-05 (budget page) remains to complete Phase 8

## Self-Check: PASSED

- [x] `src/lib/engine/advisor-savings.ts` exists
- [x] Commit `d91b73a` exists (Task 1)
- [x] Commit `a2746f6` exists (Task 2)
- [x] `08-04-SUMMARY.md` exists

---
*Phase: 08-savings-budget-tracker*
*Completed: 2026-02-22*
