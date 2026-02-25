# Session 16 — Endless Loop Architecture
**Date:** 2026-02-24
**Status:** Complete — Fiduciary Event Dispatcher + Hunter Profile + 160 tests, 0 failures

## What Was Built

### 1. Fiduciary Event Dispatcher: `src/lib/engine/fiduciary-dispatcher.ts`
A centralized cascade engine with 7 pure functions and supporting types. No tab owns its own math — every mutation triggers cross-store recalculations.

#### Event Types
- `DrawOutcomeEvent` — Drew/Didn't Draw with 4-part cascade
- `BudgetChangeEvent` — Budget slash triggers Cascading Prune
- `ProfileChangeEvent` — Anchor variable changes (horizon, weapon, float, party)
- `DeadlineMissedEvent` — Stale deadlines trigger rebalance alerts
- `PartyChangeEvent` — Group composition changes cascade to odds

#### Dispatch Functions
1. **`dispatchDrawOutcome()`** — The 4-Part Cascade
   - **If Drew:** Zero points → apply OIL waiting period → reclassify floated→sunk capital → detect PTO/schedule conflicts → success disaster check
   - **If Didn't Draw:** Increment points (+1 for preference, +0 for random) → release floated capital → push roadmap timeline → dead asset check

2. **`dispatchBudgetChange()`** — Builds PortfolioAssets from roadmap, runs `cascadingPrune()`, generates removal invalidations and alerts

3. **`dispatchProfileChange()`** — Handles physicalHorizon (prune beyond cutoff), capitalFloatTolerance (liquidity recheck), weaponType (season rebuild), planningHorizon (roadmap truncation)

4. **`dispatchDeadlineMissed()`** — Surfaces critical alerts for missed applications, tracks inactivity counter for purge-rule states

5. **`dispatchPartyChange()`** — Runs `computeGroupDrawPoints()` for state/species, surfaces rounding warnings and party spread alerts

6. **`detectMissedDeadlines()`** — Scans all milestones for past-due "apply" entries without completion
7. **`detectSuccessDisaster()`** — Detects when multiple drawn tags exceed hunt-year budget or PTO capacity

#### Cascade Result Shape
```typescript
interface CascadeResult {
  pointMutations: PointMutation[];
  capitalReclassifications: CapitalReclassification[];
  roadmapInvalidations: RoadmapInvalidation[];
  alerts: FiduciaryAlert[];
  scheduleConflicts: ScheduleConflict[];
  postDrawReset?: PostDrawReset;
  groupDrawResult?: GroupDrawResult;
}
```

### 2. Store Integration: `src/lib/store.ts`
- **`setDrawOutcomeCascade(id, outcome)`** — Enhanced draw outcome action that:
  - Finds the milestone and current points
  - Calls `dispatchDrawOutcome()` to get the cascade result
  - Applies point mutations (zero/increment) to `userPoints`
  - Stores cascade result, fiduciary alerts, and schedule conflicts
  - Syncs points to DB

- **`setAnchorField(field, value)`** — Cascade-aware profile anchor mutation on WizardStore:
  - Updates the field value
  - Dispatches `ProfileChangeEvent` through the cascade engine
  - Pushes resulting alerts to AppStore

- **New AppState fields:**
  - `lastCascadeResult: CascadeResult | null`
  - `fiduciaryAlerts: FiduciaryAlert[]`
  - `scheduleConflicts: ScheduleConflict[]`
  - `clearFiduciaryAlerts()`
  - `dismissFiduciaryAlert(alertId)`

### 3. Hunter Profile Page: `src/app/(app)/profile/page.tsx`
Permanent fiduciary anchor variables page with cascade triggers:
- **Identity section** (read-only: name, age, home, experience)
- **Planning Horizon** — 5/10/15/20/25 year presets, changes trigger roadmap truncation
- **Physical Horizon** — Slider (1-30yr), shortening triggers Cascading Prune
- **Target Weapon** — rifle/archery/muzzleloader, changes signal full strategy rebuild
- **Capital Float Tolerance** — $0-$10K slider, reducing triggers liquidity recheck
- **Default Party Size** — 1-4, changes trigger group averaging cascade
- **Available Hunt Days** — PTO slider for schedule conflict detection
- **Cascade Alert Banner** — Shows profile-change alerts with dismiss
- **Strategy Quick Links** — Roadmap, Rebalance, Budget, Plan Builder

### 4. Rebalance Page Enhancement: `src/app/(app)/rebalance/page.tsx`
- **Success Disaster Warning** — Red ShieldAlert card when multiple drew tags exceed budget
- **Missed Deadline Alert** — Red Calendar card with affected states/species
- **Fiduciary Cascade Alerts** — Persistent alerts from draw outcome cascades (OIL waiting periods, point resets, etc.)

### 5. Roadmap Page Enhancement: `src/app/(app)/roadmap/page.tsx`
- Missed deadline alerts merged into `gotchaAlerts` memo
- Persistent fiduciary cascade alerts merged into AlertsBar
- `detectMissedDeadlines()` imported and wired

### Test Files: `src/lib/engine/__tests__/fiduciary/`

| File | Tests | Assertions |
|---|---|---|
| `cascading-prune.test.ts` | 8 | Budget slash, preservation hierarchy, failure states |
| `liquidity-bottleneck.test.ts` | 8 | Peak float detection, overlap windows, triple overlap |
| `inactivity-purge.test.ts` | 8 | WY 2yr purge, NV 1yr purge, AZ no-rule |
| `post-draw-reset.test.ts` | 18 | Points zeroed, OIL waiting periods, permanent bans |
| `group-draw-averaging.test.ts` | 24 | CO floor, WY exact, all state rules, edge cases |
| `draw-outcome-cascade.test.ts` | 15 | 4-part drew/didn't draw cascade, OIL, success disaster |
| `missed-deadline.test.ts` | 14 | Deadline detection, success disaster, PTO shortage |
| **Total Fiduciary** | **95** | All passing |
| **Total Project** | **160** | All passing (includes savings-calculator + verified-datum) |

## Files Created
- `src/lib/engine/fiduciary-dispatcher.ts` — NEW (7 dispatch functions + types)
- `src/app/(app)/profile/page.tsx` — NEW (Hunter Profile page)
- `src/lib/engine/__tests__/fiduciary/draw-outcome-cascade.test.ts` — NEW
- `src/lib/engine/__tests__/fiduciary/missed-deadline.test.ts` — NEW
- `src/components/ui/slider.tsx` — NEW (shadcn component)

## Files Modified
- `src/lib/store.ts` — Added fiduciary imports, `setDrawOutcomeCascade`, `setAnchorField`, fiduciary state
- `src/app/(app)/rebalance/page.tsx` — Added success disaster + missed deadline + cascade alerts
- `src/app/(app)/roadmap/page.tsx` — Added missed deadline + fiduciary alerts to AlertsBar

## Architecture Decision: Pure Functions + Store Actions
The dispatcher uses pure functions that compute CascadeResults (what SHOULD happen).
Store actions then execute those mutations. This keeps the engine testable and the stores
as thin mutation executors. The Endless Loop is: User Action → Dispatch → CascadeResult → Multi-Store Mutations → UI Re-render.

## Remaining Directive Items (for future sessions)
- Part 2 screen-by-screen: Budget tab renaming (Definite→Sunk, If You Draw→Floated), inflation pegging for 10-year projections
- Calculator: prerequisite license detection
- Planner: PTO collision detection with drawn tags (wiring exists in dispatcher, needs UI)
- Hunt Plans: group penalty display when applying as party
- Nav wiring: add Profile to sidebar/navigation
