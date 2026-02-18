/**
 * Unlock Horizon Engine
 *
 * Calculates what units become drawable at different time horizons,
 * accounting for point creep (the reality that point requirements
 * increase over time as more hunters apply).
 *
 * Horizons:
 *   - thisYear:  drawable now (0 points needed OR user has enough)
 *   - shortTerm: 1-3 years
 *   - midTerm:   3-7 years
 *   - longTerm:  7+ years
 */

import type { Unit } from "@/lib/types";
import { estimateCreepRate, yearsToDrawWithCreep } from "@/lib/engine/point-creep";

// ============================================================================
// Types
// ============================================================================

export interface UnlockHorizonResult {
  thisYear: UnlockedUnit[];
  shortTerm: UnlockedUnit[];
  midTerm: UnlockedUnit[];
  longTerm: UnlockedUnit[];
}

export interface UnlockedUnit {
  unit: Unit;
  yearsToUnlock: number;
  pointsNeeded: number;
  userCurrentPoints: number;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Bucket units into time-horizon categories based on how many years
 * until the user can realistically draw a tag.
 *
 * For preference/hybrid systems, this uses point creep modeling.
 * For random/bonus systems, units are treated as "thisYear" (always drawable).
 *
 * @param units - Array of units to evaluate
 * @param userPoints - User's current point balance for this state+species
 * @param statePointSystem - The state's point system type
 * @returns Units bucketed by time horizon
 */
export function calculateUnlockHorizons(
  units: Unit[],
  userPoints: number,
  statePointSystem: string
): UnlockHorizonResult {
  const result: UnlockHorizonResult = {
    thisYear: [],
    shortTerm: [],
    midTerm: [],
    longTerm: [],
  };

  // Random and bonus systems: all units are always "drawable"
  // (no deterministic point threshold — everyone enters the same pool)
  if (statePointSystem === "random") {
    for (const unit of units) {
      result.thisYear.push({
        unit,
        yearsToUnlock: 0,
        pointsNeeded: 0,
        userCurrentPoints: userPoints,
      });
    }
    return result;
  }

  for (const unit of units) {
    const pointsRequired = unit.pointsRequiredNonresident;
    const creepRate = estimateCreepRate(unit.trophyRating);
    const years = yearsToDrawWithCreep(userPoints, pointsRequired, creepRate);

    // The points the user will still need beyond what they have now
    // (accounting for creep, the required threshold also moves up)
    const futureRequired = pointsRequired + creepRate * years;
    const pointsNeeded = Math.max(0, Math.ceil(futureRequired - userPoints));

    const entry: UnlockedUnit = {
      unit,
      yearsToUnlock: years,
      pointsNeeded,
      userCurrentPoints: userPoints,
    };

    if (years === 0) {
      result.thisYear.push(entry);
    } else if (years <= 3) {
      result.shortTerm.push(entry);
    } else if (years <= 7) {
      result.midTerm.push(entry);
    } else {
      result.longTerm.push(entry);
    }
  }

  // Sort each bucket by yearsToUnlock ascending (most accessible first)
  result.thisYear.sort((a, b) => a.yearsToUnlock - b.yearsToUnlock);
  result.shortTerm.sort((a, b) => a.yearsToUnlock - b.yearsToUnlock);
  result.midTerm.sort((a, b) => a.yearsToUnlock - b.yearsToUnlock);
  result.longTerm.sort((a, b) => a.yearsToUnlock - b.yearsToUnlock);

  return result;
}
