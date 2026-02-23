---
phase: 08-savings-budget-tracker
plan: 02
subsystem: engine
tags: [pure-functions, tdd, vitest, savings, math, traffic-light]

# Dependency graph
requires:
  - phase: 08-01
    provides: "SavingsGoal, SavingsContribution, SavingsStatus types in types/index.ts"
provides:
  - "calculateMonthlySavingsTarget -- remaining cost / months with Math.max(1) guard"
  - "calculateFundedDate -- projected date at current contribution rate"
  - "calculateSavingsStatus -- green/amber/red traffic light from funded vs target date"
  - "calculateCatchUpDelta -- extra monthly needed to get back on track"
  - "deriveTargetCost -- sum milestone costs by planId"
  - "calculateAnnualSpendForecast -- group incomplete milestones by year"
  - "AnnualSpendForecast interface export"
affects: [08-03, 08-04, 08-05]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Pure function engine with injectable now parameter for testability", "Math.max(1, months) division-by-zero guard", "Traffic light status derived from funded date delta"]

key-files:
  created:
    - "src/lib/engine/savings-calculator.ts"
    - "src/lib/engine/__tests__/savings-calculator.test.ts"
  modified: []

key-decisions:
  - "Date math uses 30.44 days/month average for ms-to-months conversion"
  - "setMonth-based funded date projection (native JS Date arithmetic, no date library)"
  - "Amber threshold: 1-3 months late; Red threshold: >3 months or $0/mo savings"
  - "deriveTargetCost filters by planId === goalId (matches existing milestone.planId field)"
  - "calculateAnnualSpendForecast uses new Date().getFullYear() internally (injectable via fake timers in tests)"

patterns-established:
  - "Injectable now parameter: all date-dependent functions accept optional now: Date = new Date() for deterministic testing"
  - "Composable calculator functions: calculateSavingsStatus calls calculateFundedDate, calculateCatchUpDelta calls calculateMonthlySavingsTarget"
  - "Engine __tests__ directory: src/lib/engine/__tests__/ for co-located engine test files"

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 8 Plan 2: Savings Calculator Engine Summary

**6 pure-function savings calculator with TDD: monthly targets, funded-date projections, traffic light status, catch-up deltas, target cost derivation, and annual spend forecasts -- 44 tests, zero NaN/Infinity edge cases**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T00:38:29Z
- **Completed:** 2026-02-23T00:41:45Z
- **Tasks:** 2 (RED + GREEN TDD cycle)
- **Files created:** 2

## Accomplishments
- All 6 exported functions implemented and tested with comprehensive edge cases
- Math.max(1, monthsRemaining) guard prevents division by zero across all date-dependent functions
- Traffic light thresholds (green/amber/red) compose cleanly from calculateFundedDate
- AnnualSpendForecast interface exported alongside function for downstream UI consumption
- 44 tests covering normal paths, edge cases (zero, negative, past dates, overfunded, never funded), and NaN/Infinity guards

## Task Commits

Each task was committed atomically:

1. **RED: Failing tests for 6 functions** - `56a7b7f` (test)
2. **GREEN: Implementation passing all 44 tests** - `2e26ac0` (feat)

_No refactor commit needed -- implementation was clean from GREEN phase._

## Files Created/Modified
- `src/lib/engine/savings-calculator.ts` - Pure function engine: 6 named exports + AnnualSpendForecast interface
- `src/lib/engine/__tests__/savings-calculator.test.ts` - 44 tests across 6 describe blocks

## Decisions Made
- Used 30.44 days/month average (standard astronomical month) for millisecond-to-month conversion instead of calendar-aware calculation -- simpler and sufficient for savings projections
- Funded date projection uses native JS Date.setMonth arithmetic rather than a date library -- keeps the engine dependency-free
- Test assertions for funded date use month-diff calculation instead of absolute month index to avoid timezone-dependent failures across environments
- AnnualSpendForecast falls back to milestone.title when no matching UserGoal found (orphan milestone resilience)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed timezone-sensitive date assertions in tests**
- **Found during:** GREEN phase (test execution)
- **Issue:** Test expectations used absolute month indices (e.g., `getMonth() === 10`) which fail when Date.setMonth operates in local timezone on UTC-constructed dates
- **Fix:** Changed assertions to use relative month-diff calculation: `(year * 12 + month) - (nowYear * 12 + nowMonth)`
- **Files modified:** src/lib/engine/__tests__/savings-calculator.test.ts
- **Verification:** All 44 tests pass
- **Committed in:** 2e26ac0 (part of GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test assertion fix only -- implementation unchanged, no scope creep.

## Issues Encountered
None beyond the timezone-sensitive test assertion fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Savings calculator engine ready for consumption by:
  - 08-03: SavingsProgressRing component (will call calculateSavingsStatus, deriveTargetCost)
  - 08-04: Advisor savings sub-generator (will call calculateSavingsStatus, calculateCatchUpDelta, calculateFundedDate)
  - 08-05: Budget page integration (will call calculateAnnualSpendForecast)
- All functions are pure with no side effects -- safe to call from any context (server, client, test)

## Self-Check: PASSED

- [x] src/lib/engine/savings-calculator.ts exists
- [x] src/lib/engine/__tests__/savings-calculator.test.ts exists
- [x] .planning/phases/08-savings-budget-tracker/08-02-SUMMARY.md exists
- [x] Commit 56a7b7f (RED) exists
- [x] Commit 2e26ac0 (GREEN) exists
- [x] 44/44 tests pass
- [x] tsc --noEmit clean

---
*Phase: 08-savings-budget-tracker*
*Completed: 2026-02-23*
