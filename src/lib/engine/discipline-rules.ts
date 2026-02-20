/**
 * Discipline Rule Engine v1
 *
 * Evaluates a strategic assessment against a portfolio mandate and surfaces
 * violations as Observation → Implication → Recommendation.
 *
 * Pure functions. No side effects. Called after roadmap generation.
 */

import type {
  StrategicAssessment,
  PortfolioMandate,
  DisciplineViolation,
  DisciplineRuleId,
  UserPoints,
  RoadmapYear,
} from "@/lib/types";
import { migratePhaseToYearType } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName } from "@/lib/utils";

// --- Individual Rules ---

/** Rule 1: Budget concentration >60% in <5% draw odds states */
function checkBudgetConcentration(
  assessment: StrategicAssessment,
): DisciplineViolation | null {
  const year1 = assessment.roadmap[0];
  if (!year1) return null;

  const totalCost = year1.estimatedCost;
  if (totalCost === 0) return null;

  // Find actions in low-odds states (<5% draw)
  const lowOddsActions = year1.actions.filter(
    (a) => a.estimatedDrawOdds !== undefined && a.estimatedDrawOdds < 0.05
  );
  const lowOddsCost = lowOddsActions.reduce((s, a) => s + a.cost, 0);
  const pct = lowOddsCost / totalCost;

  if (pct <= 0.6) return null;

  const states = [...new Set(lowOddsActions.map((a) => a.stateId))];
  const stateLabels = states.map((s) => STATES_MAP[s]?.abbreviation ?? s).join(", ");

  return {
    ruleId: "budget_concentration",
    severity: "warning",
    observation: `${Math.round(pct * 100)}% of year 1 budget concentrated in ${stateLabels}. Combined draw odds below 5%.`,
    implication: `$${Math.round(lowOddsCost)} allocated to low-probability outcomes. If none hit, that capital produced no hunt.`,
    recommendation: `Cap long-shot allocation at 40%. Redirect surplus to states with OTC or high-odds draws.`,
    affectedStates: states,
  };
}

/** Rule 2: Building in >3 premium states simultaneously */
function checkPremiumOverload(
  assessment: StrategicAssessment,
): DisciplineViolation | null {
  const premiumStates = ["NV", "AZ"];
  const premiumSpecies: Record<string, string[]> = {
    WY: ["moose", "bighorn_sheep"],
    MT: ["bison", "moose"],
  };

  const activePremium: string[] = [];
  for (const rec of assessment.stateRecommendations) {
    if (premiumStates.includes(rec.stateId)) {
      activePremium.push(rec.stateId);
    }
    const speciesCheck = premiumSpecies[rec.stateId];
    if (speciesCheck) {
      const hasSpecies = rec.bestUnits.some((u) =>
        speciesCheck.some((sp) => u.unitCode.toLowerCase().includes(sp) || rec.stateId === "MT" || rec.stateId === "WY")
      );
      if (hasSpecies) activePremium.push(rec.stateId);
    }
  }

  const unique = [...new Set(activePremium)];
  if (unique.length <= 3) return null;

  return {
    ruleId: "premium_overload",
    severity: "warning",
    observation: `Building in ${unique.length} premium states simultaneously: ${unique.join(", ")}.`,
    implication: `Each premium state costs $150-300/yr with 10-20 year timelines. Capital spread too thin to convert any single one.`,
    recommendation: `Pick your top 2 premium investments. Park the others until one converts.`,
    affectedStates: unique,
  };
}

/** Rule 3: Build fatigue — >4 consecutive years with no hunts */
function checkBuildFatigue(
  assessment: StrategicAssessment,
): DisciplineViolation | null {
  const roadmap = assessment.roadmap;
  let consecutiveBuildYears = 0;
  let maxConsecutive = 0;

  for (const yr of roadmap) {
    const hasHunt = yr.actions.some((a) => a.type === "hunt");
    if (!hasHunt) {
      consecutiveBuildYears++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveBuildYears);
    } else {
      consecutiveBuildYears = 0;
    }
  }

  if (maxConsecutive <= 4) return null;

  return {
    ruleId: "build_fatigue",
    severity: "critical",
    observation: `${maxConsecutive} consecutive years with no hunts scheduled.`,
    implication: `${maxConsecutive} years without hunting risks motivation loss and budget fatigue. Point-building without hunting is not a strategy.`,
    recommendation: `Add an opportunity play in year 2 or 3. ID general tag or NM random draw — low cost, near-guaranteed hunt.`,
    affectedYears: roadmap
      .filter((yr) => !yr.actions.some((a) => a.type === "hunt"))
      .map((yr) => yr.year),
  };
}

/** Rule 4: Cadence below target */
function checkCadenceBelowTarget(
  assessment: StrategicAssessment,
  mandate: PortfolioMandate | undefined,
): DisciplineViolation | null {
  if (!mandate) return null;

  const target = mandate.annualHuntFrequencyTarget;
  if (!target || target <= 0) return null;

  const first5 = assessment.roadmap.slice(0, 5);
  const totalHunts = first5.reduce(
    (s, yr) => s + yr.actions.filter((a) => a.type === "hunt").length,
    0
  );
  const avgCadence = totalHunts / Math.max(first5.length, 1);

  if (avgCadence >= target) return null;

  return {
    ruleId: "cadence_below_target",
    severity: "warning",
    observation: `Target: ${target} hunt/yr. Roadmap averages ${avgCadence.toFixed(1)} hunts/yr over first 5 years.`,
    implication: `You'll wait ${(1 / Math.max(avgCadence, 0.1)).toFixed(1)} years between hunts on average.`,
    recommendation: `Add OTC or high-odds hunts in build years to maintain cadence.`,
  };
}

/** Rule 5: Plateau detected — points past efficiency threshold */
function checkPlateauDetected(
  userPoints: UserPoints[],
): DisciplineViolation | null {
  const plateauStates: string[] = [];
  const statePointMap = new Map<string, number>();

  for (const p of userPoints) {
    const key = `${p.stateId}-${p.speciesId}`;
    const current = statePointMap.get(key) ?? 0;
    statePointMap.set(key, Math.max(current, p.points));
  }

  for (const [key, points] of statePointMap) {
    if (points >= 8) {
      const [stateId] = key.split("-");
      if (stateId) plateauStates.push(stateId);
    }
  }

  const unique = [...new Set(plateauStates)];
  if (unique.length === 0) return null;

  const stateLabels = unique.map((s) => STATES_MAP[s]?.abbreviation ?? s).join(", ");

  return {
    ruleId: "plateau_detected",
    severity: "info",
    observation: `8+ points accumulated in ${stateLabels}. Past the efficiency threshold.`,
    implication: `Each additional year adds diminishing draw probability. Marginal gain is minimal.`,
    recommendation: `Consider burning these points now or reallocating the annual fee budget.`,
    affectedStates: unique,
  };
}

/** Rule 6: Strategic drift — states/species in roadmap not in mandate */
function checkStrategicDrift(
  assessment: StrategicAssessment,
  mandate: PortfolioMandate | undefined,
): DisciplineViolation | null {
  if (!mandate) return null;

  const mandateStates = new Set(mandate.statesInPlay);
  const mandateSpecies = new Set(mandate.speciesPriorityRanking);

  const driftStates: string[] = [];
  for (const rec of assessment.stateRecommendations) {
    if (!mandateStates.has(rec.stateId)) {
      driftStates.push(rec.stateId);
    }
  }

  if (driftStates.length === 0) return null;

  const labels = driftStates.map((s) => STATES_MAP[s]?.abbreviation ?? s).join(", ");

  return {
    ruleId: "strategic_drift",
    severity: "info",
    observation: `Roadmap includes ${labels}, which are not in your mandate states.`,
    implication: `Roadmap is diverging from your stated priorities. Resources spread to unplanned states.`,
    recommendation: `Either update your mandate to include these states, or remove them from the roadmap.`,
    affectedStates: driftStates,
  };
}

/** Rule 7: Point abandonment — points accumulated but no planned action */
function checkPointAbandonment(
  assessment: StrategicAssessment,
  userPoints: UserPoints[],
): DisciplineViolation | null {
  const next2Years = assessment.roadmap.slice(0, 2);
  const plannedStates = new Set(
    next2Years.flatMap((yr) => yr.actions.map((a) => a.stateId))
  );

  const abandonedPoints: { stateId: string; speciesId: string; points: number }[] = [];

  for (const p of userPoints) {
    if (p.points >= 3 && !plannedStates.has(p.stateId)) {
      abandonedPoints.push({
        stateId: p.stateId,
        speciesId: p.speciesId,
        points: p.points,
      });
    }
  }

  if (abandonedPoints.length === 0) return null;

  const labels = abandonedPoints
    .map(
      (p) =>
        `${p.points} ${STATES_MAP[p.stateId]?.abbreviation ?? p.stateId} ${formatSpeciesName(p.speciesId)} points`
    )
    .join(", ");

  return {
    ruleId: "point_abandonment",
    severity: "warning",
    observation: `${labels} with no planned action in the next 2 years.`,
    implication: `Accumulated capital sitting idle. Points don't grow without continued investment.`,
    recommendation: `Either continue buying points to maintain position or burn them before creep erodes their value.`,
    affectedStates: [...new Set(abandonedPoints.map((p) => p.stateId))],
  };
}

// --- Public API ---

/**
 * Evaluate all discipline rules against the assessment and mandate.
 * Returns violations sorted by severity (critical > warning > info).
 */
export function evaluateDisciplineRules(
  assessment: StrategicAssessment,
  mandate: PortfolioMandate | undefined,
  userPoints: UserPoints[],
): DisciplineViolation[] {
  const violations: (DisciplineViolation | null)[] = [
    checkBudgetConcentration(assessment),
    checkPremiumOverload(assessment),
    checkBuildFatigue(assessment),
    checkCadenceBelowTarget(assessment, mandate),
    checkPlateauDetected(userPoints),
    checkStrategicDrift(assessment, mandate),
    checkPointAbandonment(assessment, userPoints),
  ];

  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return violations
    .filter((v): v is DisciplineViolation => v !== null)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
