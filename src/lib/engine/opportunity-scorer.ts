/**
 * Opportunity Scorer
 *
 * Ranks all state+species combinations by how actionable they are for the user,
 * with the user's own point position as the dominant factor.
 *
 * Draw access classification:
 *   "otc"              — True OTC: buy a tag, no draw needed (high quota, unlimited, or leftover)
 *   "high_odds_draw"   — Draw required but odds are favorable (>50% or high quota relative to applicants)
 *   "competitive_draw" — Draw required, moderate competition
 *   "limited_draw"     — Very few tags, extremely competitive (e.g., NV bighorn)
 *   "unknown_draw"     — No unit data to determine; draw system exists but we can't quantify
 */

import type {
  UserPoints,
  OpportunityResult,
  OpportunityTier,
  PointSystemType,
  Unit,
} from "@/lib/types";
import { STATES } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { estimateCreepRate, yearsToDrawWithCreep } from "./point-creep";

// ============================================================================
// Constants
// ============================================================================

const POINT_SYSTEM_LABELS: Record<PointSystemType, string> = {
  random: "Pure Random",
  bonus: "Bonus Point",
  bonus_squared: "Bonus Squared",
  hybrid: "75/25 Hybrid",
  dual: "Dual System",
  preference: "Preference Point",
  preference_nr: "NR Preference",
};

const DRAW_ACCESS_SCORES: Record<PointSystemType, number> = {
  random: 22,
  bonus: 18,
  bonus_squared: 16,
  hybrid: 14,
  dual: 12,
  preference: 10,
  preference_nr: 8,
};

/** Default point estimates when no unit data exists */
const DEFAULT_POINTS_BY_SYSTEM: Record<PointSystemType, number> = {
  random: 0,
  bonus: 0,
  bonus_squared: 0,
  hybrid: 3,
  dual: 3,
  preference: 5,
  preference_nr: 3,
};

// Tag quota thresholds for OTC classification
const OTC_QUOTA_THRESHOLD = 500;          // 500+ NR tags = likely OTC / very high availability
const HIGH_ODDS_QUOTA_THRESHOLD = 100;    // 100+ NR tags = favorable odds
const LIMITED_QUOTA_THRESHOLD = 20;       // Under 20 NR tags = limited/competitive

// ============================================================================
// Filters
// ============================================================================

export interface OpportunityWeights {
  pointPosition: number;   // default 1.0
  drawAccess: number;      // default 1.0
  huntQuality: number;     // default 1.0
  cost: number;            // default 1.0
}

export const DEFAULT_WEIGHTS: OpportunityWeights = {
  pointPosition: 1.0,
  drawAccess: 1.0,
  huntQuality: 1.0,
  cost: 1.0,
};

export interface OpportunityFilters {
  species?: string[];
  states?: string[];
  timeline?: "this_year" | "1_3" | "3_7" | "any";
  weights?: OpportunityWeights;
}

// ============================================================================
// Draw Access Classification
// ============================================================================

type DrawAccessType = OpportunityResult["drawAccessType"];

/**
 * Classify how accessible a tag actually is.
 *
 * "otc"              — Walk in, buy a tag. No draw, no uncertainty.
 * "high_odds_draw"   — Draw required but your odds are very good (>50% or high NR quota)
 * "competitive_draw" — Draw required, moderate competition, points help
 * "limited_draw"     — Very few tags, extremely competitive (sheep, goat, moose in most states)
 * "unknown_draw"     — We don't have enough unit data to classify accurately
 */
function classifyDrawAccess(
  units: Unit[],
  pointsRequired: number,
  isRandom: boolean,
  isOIAL: boolean,
  pointSystem: PointSystemType,
): DrawAccessType {
  // OIAL species are almost never OTC — they're the most competitive tags
  if (isOIAL) return "limited_draw";

  // If we have unit data, use tag quota as the primary signal
  if (units.length > 0) {
    const maxQuota = Math.max(...units.map((u) => u.tagQuotaNonresident));

    // Very high quota with zero points = true OTC territory
    // (e.g., CO general elk OTC, ID general deer)
    if (maxQuota >= OTC_QUOTA_THRESHOLD && pointsRequired === 0) {
      return "otc";
    }

    // Good quota with zero points = high odds draw
    if (maxQuota >= HIGH_ODDS_QUOTA_THRESHOLD && pointsRequired === 0) {
      return "high_odds_draw";
    }

    // Low quota = limited/competitive regardless of points
    if (maxQuota < LIMITED_QUOTA_THRESHOLD) {
      return "limited_draw";
    }

    // Moderate quota with points required
    if (pointsRequired > 0) {
      return "competitive_draw";
    }

    // Moderate quota, no points required
    return "high_odds_draw";
  }

  // No unit data — we can't make confident claims
  // If it's a random system with zero points, it's at least accessible
  if (isRandom) return "unknown_draw";

  // No units, no evidence — don't guess
  return "unknown_draw";
}

// ============================================================================
// Scoring Functions
// ============================================================================

function getPointPositionScore(
  userPts: number,
  pointsRequired: number,
  isRandom: boolean,
  drawAccessType: DrawAccessType,
): number {
  if (isRandom) return 35;

  // True OTC = highest score (guaranteed tag)
  if (drawAccessType === "otc") return 45;

  // High odds draw = very good but not guaranteed
  if (drawAccessType === "high_odds_draw" && pointsRequired === 0) return 40;

  // Unknown draw with no unit data — moderate score, don't over-promise
  if (drawAccessType === "unknown_draw") return 20;

  // Limited draw with no points required still requires winning a draw
  if (drawAccessType === "limited_draw" && pointsRequired === 0) return 12;

  if (pointsRequired === 0) return 35;

  const yearsAway = yearsToDrawWithCreep(
    userPts,
    pointsRequired,
    estimateCreepRate(5) // use mid-tier creep rate for estimation
  );

  if (yearsAway === 0) return 45;
  if (yearsAway === 1) return 38;
  if (yearsAway === 2) return 30;
  if (yearsAway === 3) return 22;
  if (yearsAway <= 5) return 15;
  if (yearsAway <= 10) return 8;
  return 2;
}

function getDrawAccessScore(
  pointSystem: PointSystemType,
  pointsRequired: number
): number {
  let score = DRAW_ACCESS_SCORES[pointSystem];
  if (pointsRequired === 0 && pointSystem !== "random") {
    score = Math.min(25, score + 10);
  }
  return score;
}

function getHuntQualityScore(units: Unit[]): number {
  if (units.length === 0) return 10; // neutral default

  let bestScore = 0;
  for (const u of units) {
    const s =
      u.successRate * 10 +
      (u.trophyRating / 10) * 5 +
      u.publicLandPct * 5;
    if (s > bestScore) bestScore = s;
  }
  return Math.min(20, Math.round(bestScore * 10) / 10);
}

function getCostScore(annualCost: number): number {
  if (annualCost <= 25) return 10;
  if (annualCost <= 50) return 8;
  if (annualCost <= 100) return 5;
  return 2;
}

function getTier(score: number): OpportunityTier {
  if (score >= 75) return "excellent";
  if (score >= 55) return "good";
  if (score >= 35) return "moderate";
  return "long_term";
}

function getBestUnit(units: Unit[]): OpportunityResult["bestUnit"] | undefined {
  if (units.length === 0) return undefined;

  let best = units[0];
  let bestScore = 0;
  for (const u of units) {
    const s = u.successRate * 10 + u.trophyRating + u.publicLandPct * 5;
    if (s > bestScore) {
      bestScore = s;
      best = u;
    }
  }

  return {
    unitCode: best.unitCode,
    unitName: best.unitName ?? best.unitCode,
    successRate: best.successRate,
    trophyRating: best.trophyRating,
    publicLandPct: best.publicLandPct,
    pressureLevel: best.pressureLevel,
  };
}

// ============================================================================
// Messaging — top reason and why bullets
// ============================================================================

const DRAW_ACCESS_LABELS: Record<DrawAccessType, string> = {
  otc: "OTC — buy a tag, no draw needed",
  high_odds_draw: "No points needed — favorable draw odds",
  competitive_draw: "Competitive draw — points improve your odds",
  limited_draw: "Limited tags — highly competitive draw",
  unknown_draw: "Draw required — unit data coming soon",
};

function buildWhyBullets(
  userPts: number,
  pointsRequired: number,
  yearsToUnlock: number,
  isRandom: boolean,
  pointSystem: PointSystemType,
  pointSystemLabel: string,
  isOIAL: boolean,
  annualCost: number,
  bestUnit: OpportunityResult["bestUnit"] | undefined,
  drawAccessType: DrawAccessType,
): string[] {
  const bullets: string[] = [];

  // Draw access classification (most important — sets expectations correctly)
  if (drawAccessType === "otc") {
    bullets.push("No points required — OTC tag, buy and go");
  } else if (drawAccessType === "high_odds_draw") {
    bullets.push("No points needed — draw required but odds are favorable");
  } else if (drawAccessType === "limited_draw") {
    if (isOIAL) {
      bullets.push("Once-in-a-lifetime species — extremely limited tags");
    } else {
      bullets.push("Very limited NR tags — highly competitive draw");
    }
  } else if (drawAccessType === "unknown_draw") {
    if (isRandom) {
      bullets.push(`${pointSystemLabel} — every applicant has an equal shot each year`);
    } else {
      bullets.push(`${pointSystemLabel} system — detailed draw data coming soon`);
    }
  } else if (isRandom) {
    bullets.push(`${pointSystemLabel} — every applicant has an equal shot each year`);
  } else if (userPts >= pointsRequired && pointsRequired > 0) {
    bullets.push(
      `You have ${userPts} points — enough to draw (${pointsRequired} needed)`
    );
  } else if (yearsToUnlock <= 2 && pointsRequired > 0) {
    bullets.push(
      `You have ${userPts} of ${pointsRequired} points needed — ${yearsToUnlock === 1 ? "1 year" : `${yearsToUnlock} years`} away`
    );
  } else if (userPts > 0 && pointsRequired > 0) {
    bullets.push(
      `You have ${userPts} points, need ${pointsRequired} — ~${yearsToUnlock} year build`
    );
  } else if (pointsRequired > 0) {
    bullets.push(
      `${pointsRequired} points needed — ~${yearsToUnlock} year investment from zero`
    );
  }

  // Draw system context
  if (!isRandom && pointsRequired > 0 && drawAccessType !== "unknown_draw") {
    bullets.push(`${pointSystemLabel} draw system`);
  }

  // Cost
  if (annualCost === 0) {
    bullets.push("Free to apply — no point purchase cost");
  } else if (annualCost <= 25) {
    bullets.push(`Low annual cost — $${annualCost}/yr to build points`);
  }

  // OIAL warning
  if (isOIAL) {
    bullets.push("Once-in-a-lifetime species — one successful draw per lifetime");
  }

  // Unit quality (if available)
  if (bestUnit) {
    if (bestUnit.successRate >= 0.25) {
      bullets.push(
        `${Math.round(bestUnit.successRate * 100)}% success rate in best unit`
      );
    }
    if (bestUnit.trophyRating >= 7) {
      bullets.push(`Trophy rating ${bestUnit.trophyRating}/10 — premium quality`);
    }
    if (bestUnit.publicLandPct >= 0.5) {
      bullets.push(
        `${Math.round(bestUnit.publicLandPct * 100)}% public land access`
      );
    }
  }

  return bullets.slice(0, 5);
}

function buildTopReason(
  userPts: number,
  pointsRequired: number,
  yearsToUnlock: number,
  isRandom: boolean,
  pointSystemLabel: string,
  bestUnit: OpportunityResult["bestUnit"] | undefined,
  drawAccessType: DrawAccessType,
): string {
  // Use draw access classification for the headline
  if (drawAccessType === "otc") {
    return "OTC tag — buy over the counter, no draw needed";
  }
  if (drawAccessType === "high_odds_draw") {
    return "No points needed — apply for favorable draw odds";
  }
  if (drawAccessType === "limited_draw") {
    return "Extremely limited tags — plan for a long-term draw investment";
  }
  if (drawAccessType === "unknown_draw") {
    if (isRandom) {
      return `${pointSystemLabel} — apply every year for an equal shot`;
    }
    return `${pointSystemLabel} draw — detailed unit data coming soon`;
  }

  if (isRandom) {
    return `${pointSystemLabel} — apply every year for an equal shot`;
  }
  if (userPts >= pointsRequired && pointsRequired > 0) {
    if (bestUnit && bestUnit.successRate >= 0.25) {
      return `You have enough points to draw with ${Math.round(bestUnit.successRate * 100)}% success rate`;
    }
    return `You have ${userPts} points — enough to draw this year`;
  }
  if (yearsToUnlock === 1) {
    return "Just 1 more year of points and you're in";
  }
  if (yearsToUnlock <= 3) {
    return `${yearsToUnlock} years away — a short build with your current points`;
  }
  if (bestUnit && bestUnit.trophyRating >= 8) {
    return `Premium trophy potential worth the ${yearsToUnlock}-year investment`;
  }
  return `~${yearsToUnlock} year point build — apply annually to get in line`;
}

// ============================================================================
// Main Generator
// ============================================================================

export function generateAllOpportunities(
  userPoints: UserPoints[],
  filters: OpportunityFilters
): OpportunityResult[] {
  const results: OpportunityResult[] = [];

  // Build point lookup: stateId:speciesId → points
  const pointLookup = new Map<string, number>();
  for (const pt of userPoints) {
    const key = `${pt.stateId}:${pt.speciesId}`;
    const existing = pointLookup.get(key) ?? 0;
    pointLookup.set(key, Math.max(existing, pt.points));
  }

  // Pre-index sample units by stateId:speciesId
  const unitIndex = new Map<string, Unit[]>();
  for (const unit of SAMPLE_UNITS) {
    const key = `${unit.stateId}:${unit.speciesId}`;
    const arr = unitIndex.get(key) ?? [];
    arr.push(unit);
    unitIndex.set(key, arr);
  }

  for (const state of STATES) {
    // State filter
    if (filters.states && filters.states.length > 0 && !filters.states.includes(state.id)) {
      continue;
    }

    for (const speciesId of state.availableSpecies) {
      // Species filter
      if (filters.species && filters.species.length > 0 && !filters.species.includes(speciesId)) {
        continue;
      }

      const species = SPECIES_MAP[speciesId];
      if (!species) continue;

      const key = `${state.id}:${speciesId}`;
      const units = unitIndex.get(key) ?? [];
      const userPts = pointLookup.get(key) ?? 0;

      // Determine points required
      let pointsRequired: number;
      if (units.length > 0) {
        // Use lowest pointsRequiredNonresident across units as the "easiest entry"
        pointsRequired = Math.min(...units.map((u) => u.pointsRequiredNonresident));
      } else {
        pointsRequired = DEFAULT_POINTS_BY_SYSTEM[state.pointSystem];
      }

      const isRandom = state.pointSystem === "random";
      const isOIAL = state.onceInALifetime?.includes(speciesId) ?? false;
      const creepRate = units.length > 0
        ? estimateCreepRate(units.reduce((max, u) => Math.max(max, u.trophyRating), 0))
        : estimateCreepRate(5);

      const yearsToUnlock = isRandom
        ? 0
        : yearsToDrawWithCreep(userPts, pointsRequired, creepRate);

      // Classify draw access — the core fix
      const drawAccessType = classifyDrawAccess(
        units, pointsRequired, isRandom, isOIAL, state.pointSystem
      );

      // Scoring
      const pointPositionScore = getPointPositionScore(userPts, pointsRequired, isRandom, drawAccessType);
      const drawAccessScore = getDrawAccessScore(state.pointSystem, pointsRequired);
      const huntQualityScore = getHuntQualityScore(units);
      const annualPointCost = state.pointCost[speciesId] ?? 0;
      const totalAnnualCost = annualPointCost + (state.licenseFees.appFee ?? 0);
      const costScore = getCostScore(totalAnnualCost);

      const w = filters.weights ?? DEFAULT_WEIGHTS;
      const opportunityScore =
        pointPositionScore * w.pointPosition +
        drawAccessScore * w.drawAccess +
        huntQualityScore * w.huntQuality +
        costScore * w.cost;

      // Timeline filter
      if (filters.timeline && filters.timeline !== "any") {
        if (filters.timeline === "this_year" && yearsToUnlock > 0) continue;
        if (filters.timeline === "1_3" && yearsToUnlock > 3) continue;
        if (filters.timeline === "3_7" && yearsToUnlock > 7) continue;
      }

      const pointSystemLabel = POINT_SYSTEM_LABELS[state.pointSystem];
      const bestUnit = getBestUnit(units);
      const deadline = state.applicationDeadlines[speciesId];

      const whyBullets = buildWhyBullets(
        userPts, pointsRequired, yearsToUnlock, isRandom,
        state.pointSystem, pointSystemLabel, isOIAL, annualPointCost, bestUnit,
        drawAccessType
      );

      const topReason = buildTopReason(
        userPts, pointsRequired, yearsToUnlock, isRandom,
        pointSystemLabel, bestUnit, drawAccessType
      );

      const tier = getTier(opportunityScore);

      results.push({
        stateId: state.id,
        speciesId,
        pointSystem: state.pointSystem,
        pointSystemLabel,
        annualPointCost,
        applicationDeadline: deadline,
        isOnceInALifetime: isOIAL,
        userPoints: userPts,
        pointsRequired,
        yearsToUnlock,
        opportunityScore,
        pointPositionScore,
        drawAccessScore,
        huntQualityScore,
        costScore,
        hasUnitData: units.length > 0,
        bestUnit,
        unitCount: units.length,
        drawAccessType,
        whyBullets,
        topReason,
        tier,
      });
    }
  }

  // Sort by opportunity score descending
  results.sort((a, b) => b.opportunityScore - a.opportunityScore);

  return results;
}
