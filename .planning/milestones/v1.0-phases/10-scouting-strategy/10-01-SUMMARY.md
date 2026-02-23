# Plan 10-01 Summary: Unit Centroid Lookup + Scouting Engine

**Status:** Complete
**Duration:** ~8 min (manual execution after agent limit)
**Commits:** c10c8e9, fc9ef79

## What Was Built

### Types (src/lib/types/index.ts)
- Added `"scouting"` to `AdvisorInsightCategory` union type
- Added `ScoutingTarget` interface: targetStateId, targetSpeciesId, targetUnitCode, targetYearsAway, strategicReason

### Unit Centroids (src/lib/constants/unit-centroids.ts) — NEW
- 46 unit centroid [lat, lon] entries covering all active units across 11 states
- `haversineDistance(lat1, lon1, lat2, lon2)` — returns miles between coordinates
- `getUnitDistance(unitA, unitB)` — lookup with state-region fallback for missing centroids
- State region fallback uses region-based distance estimates (50mi same-state, 100-800mi cross-region)

### Scouting Engine (src/lib/engine/scouting-engine.ts) — NEW (380 lines)
- `ScoutingOpportunity` interface: scoutUnit, targetUnit, 4 score dimensions, totalScore, distanceMiles, terrainOverlap, strategicReason
- `detectScoutingOpportunities(assessment)` — main detection function
- `extractTrophyTargets(assessment)` — finds units with 3+ year draw timelines
- 4-dimension scoring: proximity (0-40), terrain (0-25), season (0-20), cost (0-15)
- All-OTC portfolio suppression (no trophy targets = no scouting value)
- Thresholds: MIN_SCORE=45, MAX_PER_TARGET=2, MAX_TOTAL=5
- Same-state proximity discount (0.7x) to favor cross-state scouting diversity
- `buildStrategicReason()` — generates natural language strategic connection

### AdvisorCard Fix (src/components/advisor/AdvisorCard.tsx)
- Added `Binoculars` icon import and `scouting: Binoculars` entry to CATEGORY_ICONS map (exhaustiveness fix)

## Must-Haves Verified
- ✅ Engine detects OTC/high-odds units near trophy draw units as scouting opportunities
- ✅ Opportunities scored by proximity, terrain, season, cost (4 dimensions)
- ✅ Suppressed for all-OTC portfolios
- ✅ Units without centroids fall back to state-level proximity
