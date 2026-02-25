# Session 18: Real-World Chaos Suite
**Date:** 2026-02-24
**Context:** Continuation of Session 17 (Phase 3 Deployment). Ran and debugged the complete Chaos Suite.

## What Was Built
`src/lib/engine/chaos-suite.ts` — 12+ pure functions across 5 edge-case phases.

### Phase 1: Crawler & Data Ingestion Fail-Safes
- `validateCrawlData()` — Null/zero/NaN/garbage detection before staging DB ingestion. $0 tag cost = P1 halt. Invalid dates = P1 halt.
- `checkAnomalousVariance()` — Point requirement drops >40% quarantined. Massive increases flagged. Custom thresholds.

### Phase 2: Temporal & Deadline Stress
- `computeDeadlineUrgency()` — 48hr CRITICAL with F&G server crash warning. Sorted by urgency. Levels: expired / critical_48hr / urgent_7d / upcoming_30d / safe.
- `convertDeadlineToUserTimezone()` — Intl-powered TZ conversion. Arizona DST exception ("America/Phoenix" = no DST).
- `isLeapYear()` / `validateDateAcrossYears()` — Feb 29 pins to Feb 28 in non-leap years (never March 1).

### Phase 3: Chaotic Human Edge Cases
- `computeResidencySwitch()` — Fee delta per state when home state changes. Savings + increases in one move (e.g., CO->WY).
- `computePortfolioFreeze()` — Suppresses apply/hunt/scout but preserves purge-risk alerts. Reasons: violation, voluntary, medical.
- `slideRoadmapForMissedDeadline()` — Collect-strip-reinsert algorithm (NOT cascading mutation). Adds inactivity purge warning + roadmap slide confirmation alert.

### Phase 4: Multi-Player Destructibility
- `computeFlakeBuddyImpact()` — Group average recalculation when a member bails. Severity: severe (>=3 pt drop) / moderate (>=1) / minimal.
- `checkMixedResidencyParty()` — 10 western states enforce NR quota for mixed parties. Warns residents about cap impact.

### Phase 5: Micro-Financial Reconciliation
- `computeRefinedCapital()` — CC fee segregation: gross float - application fee - CC processing = actual refundable amount.
- `computeRefundStatus()` — 4-stage tracking: Applied/Awaiting -> Pending Refund -> Available -> Committed(Sunk). State-specific refund windows (NM=4wk, ID=6wk, WY=3wk, MT=4wk).

## Tests: 54 Chaos Suite Tests
`src/lib/engine/__tests__/chaos-suite.test.ts`

### Bugs Found & Fixed During Test Run
1. **"safe" deadline classification** — Test expected `upcoming_30d` for 37-day deadline but engine correctly returns `safe` (>720hrs). Fixed assertion.
2. **Roadmap slide cascading mutation** — Iterating slidRoadmap while pushing actions forward caused actions to cascade through all subsequent years. Fixed with collect→strip→reinsert pattern.
3. **Roadmap slide alert text** — Test checked `description` for "+1 Year" but that text was in `title`. Fixed to check `title`.
4. **Flaky buddy `require()`** — Used `require("./portfolio-stress")` inline but ESM/Vitest couldn't resolve it. Moved to top-level import alongside existing `POINT_PURGE_RULES` import.
5. **Flaky buddy test data** — Removing weakest member from [6,4,2] improves group average. Changed to [10,1,1] removing index 0 (strongest) for severe drop: floor(4) -> floor(1) = 3pt drop.
6. **StagingSnapshot re-export** — Test imported `StagingSnapshot` type from chaos-suite but it wasn't re-exported. Added `export type { StagingSnapshot }` from data-airlock.

## Final Verification
- **255 tests across 11 files — 0 failures**
- **0 TypeScript errors (`tsc --noEmit`)**

## Test File Inventory
| File | Tests |
|------|-------|
| chaos-suite.test.ts | 54 |
| savings-calculator.test.ts | 44 |
| data-airlock.test.ts | 41 |
| group-draw-averaging.test.ts | 24 |
| verified-datum.test.ts | 21 |
| post-draw-reset.test.ts | 18 |
| draw-outcome-cascade.test.ts | 15 |
| missed-deadline.test.ts | 14 |
| cascading-prune.test.ts | 8 |
| inactivity-purge.test.ts | 8 |
| liquidity-bottleneck.test.ts | 8 |
| **Total** | **255** |

## Architecture Notes
- All chaos-suite functions are pure (no store access, no side effects)
- Imports from existing engine modules: `portfolio-stress.ts` (POINT_PURGE_RULES, computeGroupDrawPoints), `data-airlock.ts` (StagingSnapshot), `fiduciary-dispatcher.ts` (CascadeResult types)
- STATES_MAP from constants used for fee lookups in residency switch
