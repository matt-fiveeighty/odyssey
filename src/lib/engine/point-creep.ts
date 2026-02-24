/**
 * Point Creep Model
 *
 * Models the annual inflation of point requirements for popular units.
 * Point creep is the reality that as more hunters apply, the points
 * needed to draw a specific tag increase over time.
 *
 * v2: Added Point Creep Velocity (PCV) algorithm and Dynamic Time-To-Draw (TTD)
 *     per the Master Allocator Blueprint.
 */

import type { PCVResult, TTDResult, DrawHistoryEntry } from "@/lib/types";

interface PointCreepInput {
  currentPointsRequired: number;
  yearsOfData?: number; // how many years of history we have
  annualCreepRate?: number; // override rate
}

interface PointCreepProjection {
  year: number;
  projectedPoints: number;
}

/**
 * Default creep rates by unit tier:
 * - Trophy units (8-10 rating): 0.5-1.0 pts/year
 * - Mid-tier units (5-7 rating): 0.3-0.5 pts/year
 * - General/OTC units: 0-0.1 pts/year
 */
export function estimateCreepRate(trophyRating: number): number {
  if (trophyRating >= 8) return 0.7;
  if (trophyRating >= 6) return 0.4;
  if (trophyRating >= 4) return 0.2;
  return 0.05;
}

export function projectPointCreep(
  input: PointCreepInput,
  yearsForward: number = 10
): PointCreepProjection[] {
  const creepRate = input.annualCreepRate ?? 0.4;
  const currentYear = new Date().getFullYear();
  const projections: PointCreepProjection[] = [];

  for (let i = 0; i <= yearsForward; i++) {
    projections.push({
      year: currentYear + i,
      projectedPoints: Math.round(
        input.currentPointsRequired + creepRate * i
      ),
    });
  }

  return projections;
}

/**
 * Calculate when a user will be able to draw, accounting for creep.
 * The user gains 1 point/year, but requirements also creep.
 * They draw when their accumulated points >= projected requirement.
 */
export function yearsToDrawWithCreep(
  currentUserPoints: number,
  currentRequired: number,
  creepRate: number
): number {
  let userPts = currentUserPoints;
  let required = currentRequired;

  for (let year = 0; year < 30; year++) {
    if (userPts >= required) return year;
    userPts += 1;
    required += creepRate;
  }

  return 30; // cap at 30 years
}

/**
 * Confidence band for draw timelines.
 * Returns optimistic (low creep), expected, and pessimistic (high creep) estimates.
 * Confidence multipliers: optimistic = 0.5x creep, pessimistic = 1.5x creep.
 */
export function drawConfidenceBand(
  currentUserPoints: number,
  currentRequired: number,
  creepRate: number
): { optimistic: number; expected: number; pessimistic: number } {
  return {
    optimistic: yearsToDrawWithCreep(currentUserPoints, currentRequired, creepRate * 0.5),
    expected: yearsToDrawWithCreep(currentUserPoints, currentRequired, creepRate),
    pessimistic: yearsToDrawWithCreep(currentUserPoints, currentRequired, creepRate * 1.5),
  };
}

// ============================================================================
// Point Creep Velocity (PCV) — Master Allocator Blueprint
// ============================================================================

/**
 * Compute Point Creep Velocity from historical draw data.
 *
 * PCV = Σ(P_i - P_{i-1}) / n
 *
 * Where P_i is the min points required in year i.
 * A PCV >= 1.0 means the tag is inflating faster than a hunter can accumulate
 * points (1 pt/year), making it a "dead asset."
 *
 * Also detects trend: accelerating (recent deltas > historical average),
 * stable, or decelerating.
 */
export function computePCV(history: DrawHistoryEntry[], earnRate: number = 1): PCVResult {
  const sorted = [...history].sort((a, b) => a.year - b.year);
  const points = sorted
    .map((h) => h.minPointsDrawn)
    .filter((v): v is number => v !== null);

  // Not enough data — fall back to heuristic
  if (points.length < 2) {
    return {
      pcv: 0,
      isDeadAsset: false,
      trend: "stable",
      dataPoints: points.length,
      confidence: "low",
    };
  }

  // Calculate year-over-year deltas
  const deltas: number[] = [];
  for (let i = 1; i < points.length; i++) {
    deltas.push(points[i] - points[i - 1]);
  }

  // PCV = average of deltas
  const pcv = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;

  // Trend detection: compare recent half vs first half of deltas
  let trend: PCVResult["trend"] = "stable";
  if (deltas.length >= 4) {
    const mid = Math.floor(deltas.length / 2);
    const firstHalf = deltas.slice(0, mid).reduce((s, d) => s + d, 0) / mid;
    const secondHalf = deltas.slice(mid).reduce((s, d) => s + d, 0) / (deltas.length - mid);
    const diff = secondHalf - firstHalf;
    if (diff > 0.15) trend = "accelerating";
    else if (diff < -0.15) trend = "decelerating";
  }

  const confidence: PCVResult["confidence"] =
    points.length >= 8 ? "high" : points.length >= 4 ? "medium" : "low";

  return {
    pcv: Math.round(pcv * 100) / 100,
    isDeadAsset: pcv >= earnRate,
    trend,
    dataPoints: points.length,
    confidence,
  };
}

/**
 * Estimate PCV from trophy rating when no historical data is available.
 * Uses the existing estimateCreepRate heuristic.
 */
export function estimatePCV(trophyRating: number, earnRate: number = 1): PCVResult {
  const pcv = estimateCreepRate(trophyRating);
  return {
    pcv,
    isDeadAsset: pcv >= earnRate,
    trend: "stable",
    dataPoints: 0,
    confidence: "low",
  };
}

// ============================================================================
// Dynamic Time-To-Draw (TTD) — Master Allocator Blueprint
// ============================================================================

/**
 * Dynamic Time-To-Draw formula:
 *
 *   TTD = (Required_current - User_current) / (EarnRate - PCV)
 *
 * If EarnRate <= PCV, the user can never catch up — the tag is a dead asset.
 * For safety, also runs the iterative simulation to cross-check.
 */
export function computeTTD(
  currentUserPoints: number,
  currentRequired: number,
  pcv: number,
  earnRate: number = 1,
): TTDResult {
  const currentYear = new Date().getFullYear();
  const gap = currentRequired - currentUserPoints;

  // Already drawable
  if (gap <= 0) {
    return {
      years: 0,
      targetYear: currentYear,
      isReachable: true,
      projectedPointsAtDraw: currentUserPoints,
      projectedRequiredAtDraw: currentRequired,
    };
  }

  const netGainPerYear = earnRate - pcv;

  // Dead asset: creep outpaces earning
  if (netGainPerYear <= 0) {
    return {
      years: Infinity,
      targetYear: Infinity,
      isReachable: false,
      projectedPointsAtDraw: currentUserPoints,
      projectedRequiredAtDraw: currentRequired,
    };
  }

  // Closed-form TTD
  const ttdRaw = gap / netGainPerYear;
  const ttd = Math.ceil(ttdRaw);

  // Cross-check with iterative simulation (catches rounding edge cases)
  const iterative = yearsToDrawWithCreep(currentUserPoints, currentRequired, pcv);
  const finalTTD = Math.max(ttd, iterative);

  return {
    years: finalTTD,
    targetYear: currentYear + finalTTD,
    isReachable: finalTTD < 30,
    projectedPointsAtDraw: currentUserPoints + finalTTD * earnRate,
    projectedRequiredAtDraw: Math.round((currentRequired + finalTTD * pcv) * 10) / 10,
  };
}
