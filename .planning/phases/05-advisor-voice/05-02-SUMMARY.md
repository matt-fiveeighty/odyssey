---
phase: 05-advisor-voice
plan: 02
subsystem: engine
tags: [typescript, advisor, point-creep, insights, pure-functions]

# Dependency graph
requires:
  - phase: 05-advisor-voice
    plan: 01
    provides: "AdvisorInsight, AdvisorUrgency, AdvisorCTA types; TemporalContext, formatTemporalPrefix from advisor-temporal.ts"
  - phase: 01-data-foundation
    provides: "BoardSignal type used in AdvisorInsight.signal"
provides:
  - "generateAdvisorInsights pipeline in advisor.ts -- consumes all engine outputs, returns prioritized AdvisorInsight[]"
  - "generatePointCreepInsights + detectCreepShifts + CreepShiftResult in advisor-creep.ts"
  - "5 sub-generators: deadline, portfolio, discipline, temporal, milestone insights"
affects: [05-03, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Sub-generator pipeline pattern (each category returns AdvisorInsight[], main fn flattens + sorts + caps)", "Urgency-to-priority mapping for insight sorting", "Graceful fallback for missing drawConfidence data"]

key-files:
  created:
    - "src/lib/engine/advisor.ts"
    - "src/lib/engine/advisor-creep.ts"
  modified: []

key-decisions:
  - "Point creep detection uses estimateCreepRate(trophyRating) from point-creep.ts rather than hardcoded rates -- leverages existing tier-based model"
  - "inferSpeciesFromUnit uses unit code parsing with STATE-SPECIES-UNIT format fallback to state's first available species"
  - "Concentration risk insight only fires at >70% threshold (matches StrategyMetrics.portfolioConcentrationPercentage)"
  - "Temporal insights suppressed entirely for non-returning users -- no daysSinceLastVisit < 1 content"

patterns-established:
  - "Advisor pipeline: sub-generators produce category-specific insights, main function flattens + sorts by urgency priority + caps at 7"
  - "Every insight must have non-empty cta.href -- enforced by typed CTA mappings in helper functions"
  - "ADV-08 compliance: all recommendation text frames advice in terms of user's existing plan, never suggests abandoning"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 5 Plan 02: Advisor Insight Generator Engine Summary

**Pure-function advisor pipeline with 6 insight categories (deadline, portfolio, discipline, temporal, milestone, point creep), urgency-sorted output capped at 7, and ADV-08 compliant recommendation text**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T17:45:57Z
- **Completed:** 2026-02-22T17:49:14Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Point creep shift detection engine comparing assessment drawConfidence against recomputed timelines with current user points
- Main advisor pipeline consuming BoardState, PortfolioHealthResult, StrategyMetrics, DisciplineViolation[], Milestone[], UserPoints[], TemporalContext, and StrategicAssessment
- 6 insight categories with per-category caps (deadline: 3, portfolio: 2, discipline: 2, temporal: 1, milestone: 1, creep: 3) and global cap of 7
- All insights include portfolio-specific context (actual states, species, points, budget) and actionable CTAs

## Task Commits

Each task was committed atomically:

1. **Task 1: Point creep shift detection engine (advisor-creep.ts)** - `727e45c` (feat)
2. **Task 2: Main advisor insight generator pipeline (advisor.ts)** - `a1f3c63` (feat)

## Files Created/Modified
- `src/lib/engine/advisor-creep.ts` - CreepShiftResult type, detectCreepShifts pure function, generatePointCreepInsights insight generator
- `src/lib/engine/advisor.ts` - generateAdvisorInsights main pipeline, 5 sub-generators (deadline, portfolio, discipline, temporal, milestone), helper functions for health recommendations and discipline CTAs

## Decisions Made
- Point creep detection uses `estimateCreepRate(trophyRating)` from existing point-creep.ts rather than introducing new rate constants -- consistent with the tier-based creep model already in use
- `inferSpeciesFromUnit` parses unit codes in STATE-SPECIES-UNIT format (e.g., CO-E-001) with fallback to state's first available species from STATES_MAP
- Portfolio concentration risk insight uses >70% threshold from StrategyMetrics, identifying the top-cost state by name
- Temporal insights completely suppressed for first-time and same-day visitors (guard on isReturningUser + daysSinceLastVisit >= 1)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- generateAdvisorInsights ready for 05-03 (dashboard integration) to consume
- generatePointCreepInsights ready for standalone use in point creep UI
- All insight types produce valid CTAs for routing in the UI layer
- No blockers for subsequent plans

## Self-Check: PASSED

- [x] src/lib/engine/advisor-creep.ts - FOUND
- [x] src/lib/engine/advisor.ts - FOUND
- [x] .planning/phases/05-advisor-voice/05-02-SUMMARY.md - FOUND
- [x] Commit 727e45c - FOUND
- [x] Commit a1f3c63 - FOUND

---
*Phase: 05-advisor-voice*
*Completed: 2026-02-22*
