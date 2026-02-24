# Session 14 — Master Allocator Blueprint Implementation
**Date:** 2026-02-24
**Status:** ALL 4 PHASES COMPLETE

## Objective
Transform Odyssey from a generic planning tool into a mathematically bulletproof capital allocation engine per the Master Allocator Blueprint.

## Completed Phases

### Phase 1: Math Engine — DONE
- **PCV Algorithm** (`point-creep.ts`): `computePCV()` from historical data, `estimatePCV()` from trophy rating
  - Trend detection: accelerating / stable / decelerating
  - Dead Asset flag when PCV >= earn rate
- **Dynamic TTD** (`point-creep.ts`): `computeTTD()` — closed-form + iterative cross-check
  - Returns years, targetYear, isReachable, projected points at draw
- **Monte Carlo** (`draw-odds.ts`): `computeMonteCarloOdds()` — cumulative probability over horizon
  - Year-by-year running cumulative, median draw year
  - `classifyDrawType()`, `isLotteryPlay()` — draw system classification
- **Capital Allocator** (`capital-allocator.ts`): NEW MODULE
  - `computeCapitalSummary()` — sunk/floated/contingent classification
  - `computeBurnRateMatrix()` — per state/species position snapshot
  - `computeStatusTicker()` — annual BUILD/LOTTERY/DIVIDEND/BURN classification

### Phase 2: Dashboard Redesign — DONE
- **StatusTicker** (`StatusTicker.tsx`): Color-coded annual status bar at top
  - Pill tags: BUILD WY, LOTTERY NM, DIVIDEND MT, BURN CO
  - Mini timeline dots for all years
- **KPIStrip** (`KPIStrip.tsx`): Complete redesign
  - Card 1: Sunk Capital with per-state sparkline bars
  - Card 2: Floated Capital with sunk/floated ratio bar
  - Card 3: First Hunt (year + species)
  - Card 4: 10-Year Total with sparkline + yearly tooltips
  - All text stripped → [?] hover tooltips via shadcn Tooltip
- **BurnRateMatrix** (`BurnRateMatrix.tsx`): Full data table
  - State/Species | Pts | Req | PCV with trend arrow | ETA | Draw Type badge
  - Dead Asset warning icons, Lottery Play badges with cumulative odds
  - [?] tooltip explaining PCV
- **ContextualAlerts** (`ContextualAlerts.tsx`): Dismissible alert cards
  - Lottery Play, Dead Asset, Physical Horizon Exceeded, Plateau Reclassified

### Phase 3: Onboarding Questions — DONE
- **Weapon Type** added to Step 5 (Hunting DNA)
  - Rifle / Archery / Muzzleloader cards with advisor insights
  - Store field: `weaponType: WeaponType | null`
- **Party Size** added to Step 6 (Travel Reality)
  - Stepper control 1-6, solo vs group insight about point averaging
  - Store field: `partySize: number` (default 1)
- **Physical Horizon** added to Step 6 (Travel Reality)
  - Stepper + quick-select buttons (5/10/15/20 years)
  - AdvisorInsight for <=5 year window
  - Store field: `physicalHorizon: number | null`
- All 3 fields wired through `build-consultation-input.ts` → `ConsultationInput`

### Phase 4: Change Impact Engine — DONE
- **Fee Diffing** (`change-impact.ts`): `diffStateFees()` — compares two state versions
  - Diffs flat fees, per-species point costs, tag costs, fee schedule items
- **Plan Impact** (`change-impact.ts`): `computePlanImpact()` — financial impact on user plan
  - Annual impact, 10-year impact, affected years
- **Contextual Alerts** (`change-impact.ts`): `generateContextualAlerts()`
  - Lottery Play badges for random states (fixes NM popup issue)
  - Dead Asset detection (PCV >= 1.0 pts/yr)
  - Physical Horizon exceeded warnings
  - Plateau reclassification for lottery states (9 years without drawing 2% tag = expected, not plateau)

## New Files Created
- `src/lib/engine/capital-allocator.ts`
- `src/lib/engine/change-impact.ts`
- `src/components/results/dashboard/StatusTicker.tsx`
- `src/components/results/dashboard/BurnRateMatrix.tsx`
- `src/components/results/dashboard/ContextualAlerts.tsx`

## Files Modified
- `src/lib/types/index.ts` — 10 new types/interfaces
- `src/lib/engine/point-creep.ts` — PCV + TTD algorithms
- `src/lib/engine/draw-odds.ts` — Monte Carlo + draw classification
- `src/lib/store.ts` — weaponType, partySize, physicalHorizon
- `src/lib/engine/build-consultation-input.ts` — new field passthrough
- `src/lib/engine/roadmap-generator.ts` — ConsultationInput extended
- `src/components/results/ResultsShell.tsx` — new dashboard rows
- `src/components/results/dashboard/KPIStrip.tsx` — complete redesign
- `src/components/consultation/steps/StepHuntingDNA.tsx` — weapon choice
- `src/components/consultation/steps/StepTravelReality.tsx` — party + horizon

## Persist Key
No persist key bump needed — new fields have defaults (null/1) and are additive.
Zustand will merge them into existing persisted state automatically.

## What's NOT Done (Future Work)
- Engine doesn't yet USE weaponType to alter point requirements per season
- PartySize not yet factored into point averaging calculations in scoring
- Change Impact modal UI (the engine exists but no login/persistence layer to trigger on state data changes)
- Actual scraping/data pipeline for live fee updates (uses hardcoded constants)
- 3% compounding inflation projections mentioned in blueprint QA section
- Adversarial QA test suite ($0 budget, $100k budget, etc.)
