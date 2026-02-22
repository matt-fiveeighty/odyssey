/**
 * Point Creep Shift Detection Engine
 *
 * Compares a strategic assessment's drawConfidence projections against
 * recomputed timelines using current user points to detect shifts caused
 * by point creep. Produces AdvisorInsight[] for the main pipeline.
 *
 * Pure functions. No side effects.
 */

import type {
  StrategicAssessment,
  UserPoints,
  AdvisorInsight,
} from "@/lib/types";
import { yearsToDrawWithCreep, estimateCreepRate } from "@/lib/engine/point-creep";
import { STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName } from "@/lib/utils";

// --- Types ---

export interface CreepShiftResult {
  stateId: string;
  speciesId: string;
  unitCode: string;
  previousDrawYear: number;
  currentDrawYear: number;
  shiftYears: number;
  creepRate: number;
}

// --- Detection ---

/**
 * Detect draw timeline shifts caused by point creep.
 *
 * For each state recommendation's best unit with drawConfidence:
 *   1. Read the assessment's expected draw year (previousDrawYear)
 *   2. Recompute with current user points and estimated creep rate
 *   3. If the recomputed year is worse, record the shift
 *
 * Only includes shifts where things got worse (shiftYears > 0).
 * Caps at 3 most severe shifts.
 */
export function detectCreepShifts(
  assessment: StrategicAssessment,
  userPoints: UserPoints[],
): CreepShiftResult[] {
  const results: CreepShiftResult[] = [];

  for (const rec of assessment.stateRecommendations) {
    for (const unit of rec.bestUnits) {
      // Skip units without draw confidence data (Pitfall 5: graceful fallback)
      if (!unit.drawConfidence) continue;

      const previousDrawYear = unit.drawConfidence.expected;

      // Find user's current points for this state+species
      const speciesId = inferSpeciesFromUnit(unit.unitCode, rec);
      const userPt = userPoints.find(
        (p) => p.stateId === rec.stateId && p.speciesId === speciesId,
      );
      const currentUserPoints = userPt?.points ?? 0;

      // Get point requirement from unit data or estimate from draw confidence
      const pointsRequired = unit.trophyRating > 0
        ? Math.max(unit.trophyRating, previousDrawYear) // use trophy rating as proxy for difficulty
        : previousDrawYear; // fallback: assessment's expected year as rough point threshold

      // Use the actual points-required from the unit if available,
      // otherwise use the draw confidence expected value as a proxy
      const effectivePointsRequired = Math.max(1, previousDrawYear);

      const creepRate = estimateCreepRate(unit.trophyRating);

      const currentDrawYear = yearsToDrawWithCreep(
        currentUserPoints,
        effectivePointsRequired,
        creepRate,
      );

      const shiftYears = currentDrawYear - previousDrawYear;

      // Only include shifts where creep made things worse
      if (shiftYears > 0) {
        results.push({
          stateId: rec.stateId,
          speciesId,
          unitCode: unit.unitCode,
          previousDrawYear,
          currentDrawYear,
          shiftYears,
          creepRate,
        });
      }
    }
  }

  // Sort by severity (largest shift first) and cap at 3
  return results
    .sort((a, b) => b.shiftYears - a.shiftYears)
    .slice(0, 3);
}

// --- Insight Generation ---

/**
 * Generate AdvisorInsight[] for point creep shifts.
 *
 * Calls detectCreepShifts, then maps each result to an insight with
 * specific year-shift language and portfolio context.
 */
export function generatePointCreepInsights(
  assessment: StrategicAssessment,
  userPoints: UserPoints[],
): AdvisorInsight[] {
  const shifts = detectCreepShifts(assessment, userPoints);

  return shifts.map((shift): AdvisorInsight => {
    const state = STATES_MAP[shift.stateId];
    const stateLabel = state?.abbreviation ?? shift.stateId;
    const speciesLabel = formatSpeciesName(shift.speciesId);

    const userPt = userPoints.find(
      (p) => p.stateId === shift.stateId && p.speciesId === shift.speciesId,
    );
    const pts = userPt?.points ?? 0;

    return {
      id: `creep-${shift.stateId}-${shift.speciesId}`,
      signal: {
        type: "warning",
        message: `Draw timeline shifted for ${stateLabel} ${speciesLabel}`,
      },
      category: "point_creep",
      urgency: shift.shiftYears >= 2 ? "immediate" : "soon",
      interpretation: `${stateLabel} ${speciesLabel} draw moved from Year ${shift.previousDrawYear} to Year ${shift.currentDrawYear}. Point creep is eroding your position at ${shift.creepRate} pts/yr.`,
      recommendation:
        "Consider applying this cycle to lock in your current position, or increase point purchases to stay ahead of creep.",
      cta: { label: "Review Draw Timeline", href: "/plan-builder" },
      portfolioContext: `You have ${pts} ${stateLabel} ${speciesLabel} points`,
    };
  });
}

// --- Helpers ---

/**
 * Infer the species ID from a unit code and state recommendation.
 *
 * Unit codes vary by state (e.g., "CO-E-001" for elk, "WY-MD-101" for mule deer).
 * We check the state recommendation's context to determine the species, since
 * a state recommendation is typically associated with a primary species from
 * the roadmap actions.
 */
function inferSpeciesFromUnit(
  unitCode: string,
  rec: StrategicAssessment["stateRecommendations"][number],
): string {
  // The unit code often encodes species, but format varies by state.
  // Best heuristic: look at the roadmap context from the recommendation.
  // StateRecommendation doesn't directly have speciesId, but bestUnits
  // are associated with specific species in the broader assessment.
  // For now, extract from unit code patterns or default to first species in state.

  // Common patterns: "CO-E-001" (E=elk), "WY-MD-101" (MD=mule_deer)
  const speciesCodeMap: Record<string, string> = {
    E: "elk",
    EL: "elk",
    MD: "mule_deer",
    WT: "whitetail",
    CD: "coues_deer",
    BT: "blacktail",
    BB: "black_bear",
    GR: "grizzly",
    MO: "moose",
    PH: "pronghorn",
    BH: "bighorn_sheep",
    DS: "dall_sheep",
    MG: "mountain_goat",
    BI: "bison",
    CA: "caribou",
    ML: "mountain_lion",
    MX: "muskox",
    WF: "wolf",
  };

  // Try to extract species code from unit code (format: STATE-SPECIES-UNIT)
  const parts = unitCode.split("-");
  if (parts.length >= 2) {
    const speciesCode = parts[1].toUpperCase();
    if (speciesCodeMap[speciesCode]) {
      return speciesCodeMap[speciesCode];
    }
  }

  // Fallback: check what species the state offers and use the first one
  const state = STATES_MAP[rec.stateId];
  if (state?.availableSpecies?.length) {
    return state.availableSpecies[0];
  }

  return "elk"; // ultimate fallback
}
