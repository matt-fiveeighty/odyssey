/**
 * Unit Scoring Engine
 *
 * Transparent 6-factor scoring system (100pt max) for ranking hunt units.
 * Server-side engine used by API routes. Each factor produces a score with
 * a human-readable explanation so users understand exactly why a unit ranks
 * where it does.
 */

import type { Unit, PressureLevel } from "@/lib/types";

// ============================================================================
// Types
// ============================================================================

export interface UnitScoreResult {
  totalScore: number;
  maxPossibleScore: number;
  factors: UnitScoreFactor[];
}

export interface UnitScoreFactor {
  label: string;
  score: number;
  maxScore: number;
  explanation: string;
}

export interface UnitScoreInput {
  weaponType?: "archery" | "rifle" | "muzzleloader";
  seasonPreference?: "early" | "mid" | "late" | "any";
  userPoints?: number;
  huntStyle?: "diy_truck" | "diy_backpack" | "guided" | "drop_camp";
}

export interface DrawHistoryEntry {
  year: number;
  applicants: number | null;
  tagsAvailable: number | null;
  tagsIssued: number | null;
  oddsPercent: number | null;
  minPointsDrawn: number | null;
}

// ============================================================================
// Factor 1: Harvest Trend (25pt max)
// ============================================================================

function scoreHarvestTrend(drawHistory: DrawHistoryEntry[]): UnitScoreFactor {
  const maxScore = 25;

  // Filter to entries that have usable odds data, sorted by year
  const usable = drawHistory
    .filter((e) => e.oddsPercent !== null)
    .sort((a, b) => a.year - b.year);

  if (usable.length < 2) {
    return {
      label: "Harvest Trend",
      score: 12,
      maxScore,
      explanation: "Insufficient draw history data — scored as neutral.",
    };
  }

  // Calculate year-over-year trend using simple linear regression on odds
  const n = usable.length;
  const xMean = usable.reduce((s, e, i) => s + i, 0) / n;
  const yMean = usable.reduce((s, e) => s + (e.oddsPercent ?? 0), 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = (usable[i].oddsPercent ?? 0) - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;

  // Categorize the trend
  if (n >= 3 && slope > 1.5) {
    return {
      label: "Harvest Trend",
      score: 25,
      maxScore,
      explanation: `Draw odds improving over ${n} years (+${slope.toFixed(1)}%/yr trend).`,
    };
  }
  if (slope > -0.5 && slope <= 1.5) {
    return {
      label: "Harvest Trend",
      score: 18,
      maxScore,
      explanation: `Draw odds stable over ${n} years (${slope > 0 ? "+" : ""}${slope.toFixed(1)}%/yr trend).`,
    };
  }
  if (slope > -2.0) {
    return {
      label: "Harvest Trend",
      score: 12,
      maxScore,
      explanation: `Draw odds slightly declining over ${n} years (${slope.toFixed(1)}%/yr trend).`,
    };
  }
  return {
    label: "Harvest Trend",
    score: 5,
    maxScore,
    explanation: `Draw odds sharply declining over ${n} years (${slope.toFixed(1)}%/yr trend).`,
  };
}

// ============================================================================
// Factor 2: Tag Availability (20pt max)
// ============================================================================

function scoreTagAvailability(unit: Unit): UnitScoreFactor {
  const maxScore = 20;
  const quota = unit.tagQuotaNonresident;

  if (quota === undefined || quota === null || quota <= 0) {
    return {
      label: "Tag Availability",
      score: 10,
      maxScore,
      explanation: "No tag quota data available — scored as neutral.",
    };
  }

  if (quota > 100) {
    return {
      label: "Tag Availability",
      score: 20,
      maxScore,
      explanation: `${quota} NR tags available — excellent supply.`,
    };
  }
  if (quota >= 50) {
    return {
      label: "Tag Availability",
      score: 16,
      maxScore,
      explanation: `${quota} NR tags available — good supply.`,
    };
  }
  if (quota >= 20) {
    return {
      label: "Tag Availability",
      score: 12,
      maxScore,
      explanation: `${quota} NR tags available — moderate supply.`,
    };
  }
  if (quota >= 10) {
    return {
      label: "Tag Availability",
      score: 8,
      maxScore,
      explanation: `${quota} NR tags available — limited supply.`,
    };
  }
  return {
    label: "Tag Availability",
    score: 4,
    maxScore,
    explanation: `${quota} NR tags available — very limited supply.`,
  };
}

// ============================================================================
// Factor 3: Hunter Pressure (20pt max)
// ============================================================================

function scoreHunterPressure(unit: Unit): UnitScoreFactor {
  const maxScore = 20;
  const pressure: PressureLevel = unit.pressureLevel;
  const publicLand = unit.publicLandPct;

  if (pressure === "Low" && publicLand > 0.6) {
    return {
      label: "Hunter Pressure",
      score: 20,
      maxScore,
      explanation: `Low pressure + ${Math.round(publicLand * 100)}% public land — ideal conditions.`,
    };
  }
  if (pressure === "Low") {
    return {
      label: "Hunter Pressure",
      score: 16,
      maxScore,
      explanation: `Low pressure with ${Math.round(publicLand * 100)}% public land access.`,
    };
  }
  if (pressure === "Moderate" && publicLand > 0.6) {
    return {
      label: "Hunter Pressure",
      score: 12,
      maxScore,
      explanation: `Moderate pressure offset by ${Math.round(publicLand * 100)}% public land.`,
    };
  }
  if (pressure === "Moderate") {
    return {
      label: "Hunter Pressure",
      score: 8,
      maxScore,
      explanation: `Moderate pressure with ${Math.round(publicLand * 100)}% public land.`,
    };
  }
  // High pressure
  return {
    label: "Hunter Pressure",
    score: 4,
    maxScore,
    explanation: `High pressure — expect competition. ${Math.round(publicLand * 100)}% public land.`,
  };
}

// ============================================================================
// Factor 4: Season Timing Fit (15pt max)
// ============================================================================

function scoreSeasonTimingFit(unit: Unit, input: UnitScoreInput): UnitScoreFactor {
  const maxScore = 15;

  // If user has no preferences, return neutral
  if (!input.weaponType && !input.seasonPreference) {
    return {
      label: "Season Timing Fit",
      score: 8,
      maxScore,
      explanation: "No weapon or season preference specified — scored as neutral.",
    };
  }

  // Check if unit has season_dates
  if (!unit.seasonDates || Object.keys(unit.seasonDates).length === 0) {
    return {
      label: "Season Timing Fit",
      score: 8,
      maxScore,
      explanation: "No season date data available for this unit.",
    };
  }

  let weaponMatch = false;
  let seasonMatch = false;

  // Check weapon type match against season keys
  const seasonKeys = Object.keys(unit.seasonDates).map((k) => k.toLowerCase());

  if (input.weaponType) {
    weaponMatch = seasonKeys.some((k) => k.includes(input.weaponType!));
  }

  // Check season preference against dates
  if (input.seasonPreference && input.seasonPreference !== "any") {
    const allDates = Object.values(unit.seasonDates);
    for (const dateRange of allDates) {
      const startMonth = parseInt(dateRange.start.split("-")[1], 10);
      if (
        (input.seasonPreference === "early" && startMonth <= 9) ||
        (input.seasonPreference === "mid" && startMonth >= 10 && startMonth <= 11) ||
        (input.seasonPreference === "late" && startMonth >= 11)
      ) {
        seasonMatch = true;
        break;
      }
    }
  } else if (input.seasonPreference === "any") {
    seasonMatch = true;
  }

  if (weaponMatch && seasonMatch) {
    return {
      label: "Season Timing Fit",
      score: 15,
      maxScore,
      explanation: `Perfect match — ${input.weaponType} season aligns with ${input.seasonPreference} preference.`,
    };
  }
  if (weaponMatch || seasonMatch) {
    const matchType = weaponMatch ? "weapon type" : "season timing";
    return {
      label: "Season Timing Fit",
      score: 10,
      maxScore,
      explanation: `Good match on ${matchType}. Partial alignment on the other factor.`,
    };
  }
  return {
    label: "Season Timing Fit",
    score: 6,
    maxScore,
    explanation: `Limited alignment with ${input.weaponType ?? "any"} weapon / ${input.seasonPreference ?? "any"} season preferences.`,
  };
}

// ============================================================================
// Factor 5: Success Rate (10pt max)
// ============================================================================

function scoreSuccessRate(unit: Unit): UnitScoreFactor {
  const maxScore = 10;
  const rate = unit.successRate;

  if (rate > 0.4) {
    return {
      label: "Success Rate",
      score: 10,
      maxScore,
      explanation: `${Math.round(rate * 100)}% success rate — excellent.`,
    };
  }
  if (rate >= 0.25) {
    return {
      label: "Success Rate",
      score: 8,
      maxScore,
      explanation: `${Math.round(rate * 100)}% success rate — above average.`,
    };
  }
  if (rate >= 0.15) {
    return {
      label: "Success Rate",
      score: 6,
      maxScore,
      explanation: `${Math.round(rate * 100)}% success rate — average.`,
    };
  }
  if (rate >= 0.05) {
    return {
      label: "Success Rate",
      score: 4,
      maxScore,
      explanation: `${Math.round(rate * 100)}% success rate — below average.`,
    };
  }
  return {
    label: "Success Rate",
    score: 2,
    maxScore,
    explanation: `${Math.round(rate * 100)}% success rate — very challenging.`,
  };
}

// ============================================================================
// Factor 6: Public Land Access (10pt max)
// ============================================================================

function scorePublicLandAccess(unit: Unit): UnitScoreFactor {
  const maxScore = 10;
  const pct = unit.publicLandPct;

  if (pct > 0.7) {
    return {
      label: "Public Land Access",
      score: 10,
      maxScore,
      explanation: `${Math.round(pct * 100)}% public land — outstanding access.`,
    };
  }
  if (pct >= 0.5) {
    return {
      label: "Public Land Access",
      score: 8,
      maxScore,
      explanation: `${Math.round(pct * 100)}% public land — solid access.`,
    };
  }
  if (pct >= 0.3) {
    return {
      label: "Public Land Access",
      score: 6,
      maxScore,
      explanation: `${Math.round(pct * 100)}% public land — moderate access.`,
    };
  }
  if (pct >= 0.1) {
    return {
      label: "Public Land Access",
      score: 4,
      maxScore,
      explanation: `${Math.round(pct * 100)}% public land — limited access.`,
    };
  }
  return {
    label: "Public Land Access",
    score: 2,
    maxScore,
    explanation: `${Math.round(pct * 100)}% public land — mostly private land.`,
  };
}

// ============================================================================
// Main Scoring Function
// ============================================================================

/**
 * Score a single unit across 6 transparent factors (100pt max).
 *
 * @param unit - The unit to score
 * @param drawHistory - Historical draw data for this unit (may be empty)
 * @param input - User preferences for personalized scoring
 * @returns Detailed score breakdown with explanations
 */
export function scoreUnit(
  unit: Unit,
  drawHistory: DrawHistoryEntry[],
  input: UnitScoreInput
): UnitScoreResult {
  const factors: UnitScoreFactor[] = [
    scoreHarvestTrend(drawHistory),
    scoreTagAvailability(unit),
    scoreHunterPressure(unit),
    scoreSeasonTimingFit(unit, input),
    scoreSuccessRate(unit),
    scorePublicLandAccess(unit),
  ];

  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  const maxPossibleScore = factors.reduce((sum, f) => sum + f.maxScore, 0);

  return { totalScore, maxPossibleScore, factors };
}

// ============================================================================
// Batch Scoring & Ranking
// ============================================================================

/**
 * Score all units and return them sorted by totalScore descending.
 *
 * @param units - Array of units to score
 * @param drawHistories - Map of unit ID to draw history entries
 * @param input - User preferences for personalized scoring
 * @returns Scored units sorted by totalScore (highest first)
 */
export function scoreAndRankUnits(
  units: Unit[],
  drawHistories: Map<string, DrawHistoryEntry[]>,
  input: UnitScoreInput
): (Unit & { score: UnitScoreResult })[] {
  return units
    .map((unit) => {
      const history = drawHistories.get(unit.id) ?? [];
      const score = scoreUnit(unit, history, input);
      return { ...unit, score };
    })
    .sort((a, b) => b.score.totalScore - a.score.totalScore);
}
