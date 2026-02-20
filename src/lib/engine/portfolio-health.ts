/**
 * Portfolio Health Score — 0-100 composite
 *
 * Weighted across five dimensions:
 *   Budget Alignment    25%
 *   Hunt Frequency      20%
 *   Low-Odds Exposure   20%
 *   Age Horizon         20%
 *   Discipline          15%
 *
 * Pure function. No side effects.
 */

import type {
  StrategicAssessment,
  PortfolioMandate,
  DisciplineViolation,
} from "@/lib/types";

// --- Public types ---

export interface HealthScoreBreakdown {
  budget: number;
  frequency: number;
  exposure: number;
  horizon: number;
  discipline: number;
}

export interface PortfolioHealthResult {
  score: number;
  breakdown: HealthScoreBreakdown;
}

// --- Species → ideal burn-age windows ---

const IDEAL_BURN_WINDOWS: Record<string, [number, number]> = {
  bighorn_sheep: [35, 55],
  dall_sheep: [35, 55],
  mountain_goat: [35, 55],
  // Everything else gets a wider window
  _default: [30, 60],
};

function getIdealWindow(speciesId: string): [number, number] {
  return IDEAL_BURN_WINDOWS[speciesId] ?? IDEAL_BURN_WINDOWS._default;
}

// --- Component scorers ---

/**
 * 1. Budget Alignment (0–100)
 *
 * How closely actual per-state allocation matches an equal-weight
 * recommended allocation. If the mandate specifies a budget ceiling,
 * we also penalise exceeding it.
 */
function scoreBudgetAlignment(
  assessment: StrategicAssessment,
  mandate?: PortfolioMandate,
): number {
  const recs = assessment.stateRecommendations;
  if (recs.length === 0) return 100; // no states = no misalignment

  const totalCost = recs.reduce((s, r) => s + r.annualCost, 0);
  if (totalCost === 0) return 100;

  // Recommended = equal allocation (simple baseline)
  const recommendedPerState = totalCost / recs.length;

  const deviations = recs.map((r) =>
    recommendedPerState > 0
      ? Math.abs(r.annualCost - recommendedPerState) / recommendedPerState
      : 0,
  );
  const avgDeviation = deviations.reduce((s, d) => s + d, 0) / deviations.length;

  let score = Math.max(0, 100 - avgDeviation * 100);

  // Penalise if over budget ceiling
  if (mandate && totalCost > mandate.annualBudgetCeiling) {
    const overPct =
      (totalCost - mandate.annualBudgetCeiling) / mandate.annualBudgetCeiling;
    score = Math.max(0, score - overPct * 50);
  }

  return Math.round(Math.min(100, score));
}

/**
 * 2. Hunt Frequency (0–100)
 *
 * Smooth curve: score = max(0, 100 - yearsToNextHunt * 8)
 * Fallback to roadmap-level average if no explicit hunt scheduled.
 */
function scoreHuntFrequency(assessment: StrategicAssessment): number {
  const roadmap = assessment.roadmap;
  if (roadmap.length === 0) return 0;

  // Find first hunt year
  let yearsToNext = roadmap.length; // worst case: no hunts
  for (let i = 0; i < roadmap.length; i++) {
    if (roadmap[i].actions.some((a) => a.type === "hunt")) {
      yearsToNext = i + 1; // 1-indexed year
      break;
    }
  }

  return Math.max(0, Math.round(100 - yearsToNext * 8));
}

/**
 * 3. Low-Odds Exposure (0–100)
 *
 * Penalise % of year-1 spend in <5% draw odds actions.
 * score = 100 - lowOddsPercentage * 100
 */
function scoreLowOddsExposure(assessment: StrategicAssessment): number {
  const year1 = assessment.roadmap[0];
  if (!year1) return 100;

  const totalSpend = year1.estimatedCost;
  if (totalSpend === 0) return 100;

  const lowOddsSpend = year1.actions
    .filter(
      (a) => a.estimatedDrawOdds !== undefined && a.estimatedDrawOdds < 0.05,
    )
    .reduce((s, a) => s + a.cost, 0);

  const pct = lowOddsSpend / totalSpend;
  return Math.max(0, Math.round(100 - pct * 100));
}

/**
 * 4. Age Horizon Optimisation (0–100)
 *
 * Checks whether the first major burn year lands inside the ideal
 * physical window for the target species.
 */
function scoreAgeHorizon(
  assessment: StrategicAssessment,
  mandate?: PortfolioMandate,
): number {
  if (!mandate) return 75; // no mandate = neutral score

  const currentAge = ageFromMandate(mandate);
  if (currentAge === null) return 75;

  // Find primary burn species and projected burn year
  const firstHuntAction = assessment.roadmap
    .flatMap((yr) =>
      yr.actions
        .filter((a) => a.type === "hunt")
        .map((a) => ({ year: yr.year, speciesId: a.speciesId })),
    )
    .sort((a, b) => a.year - b.year)[0];

  if (!firstHuntAction) return 50; // no hunt planned

  const burnAge = currentAge + firstHuntAction.year;
  const [lo, hi] = getIdealWindow(firstHuntAction.speciesId);

  if (burnAge >= lo && burnAge <= hi) return 100;

  const penalty = Math.min(burnAge < lo ? lo - burnAge : burnAge - hi, 10);
  return Math.max(0, Math.round(100 - penalty * 10));
}

/**
 * 5. Discipline Compliance (0–100)
 *
 * Start at 100, deduct per violation by severity.
 */
function scoreDiscipline(violations: DisciplineViolation[]): number {
  let score = 100;

  for (const v of violations) {
    switch (v.severity) {
      case "critical":
        score -= 25;
        break;
      case "warning":
        score -= 15;
        break;
      case "info":
        score -= 5;
        break;
    }
  }

  return Math.max(0, Math.round(score));
}

// --- Helpers ---

/**
 * Best-effort age extraction.
 * The mandate doesn't store age directly, but youthAge is the child's age.
 * We check if the horizon implies a rough age bracket.
 * For now, return a reasonable default if we can't infer.
 */
function ageFromMandate(mandate: PortfolioMandate): number | null {
  // If youth toggle is on and we have a youth age, the *parent* is likely 25-35 yrs older
  if (mandate.youthToggle && mandate.youthAge) {
    return mandate.youthAge + 28; // rough estimate
  }

  // Infer from time horizon: 5yr = ~55+, 25yr = ~25-35
  const horizonAgeMap: Record<number, number> = {
    5: 55,
    10: 45,
    15: 40,
    20: 35,
    25: 30,
  };
  return horizonAgeMap[mandate.timeHorizonYears] ?? null;
}

// --- Public API ---

/**
 * Calculate the Portfolio Health Score.
 *
 * Returns a 0-100 integer and breakdown by component.
 */
export function calculatePortfolioHealthScore(
  assessment: StrategicAssessment,
  mandate?: PortfolioMandate,
  violations?: DisciplineViolation[],
): PortfolioHealthResult {
  const budget = scoreBudgetAlignment(assessment, mandate);
  const frequency = scoreHuntFrequency(assessment);
  const exposure = scoreLowOddsExposure(assessment);
  const horizon = scoreAgeHorizon(assessment, mandate);
  const discipline = scoreDiscipline(violations ?? assessment.disciplineViolations ?? []);

  const score = Math.round(
    budget * 0.25 +
    frequency * 0.20 +
    exposure * 0.20 +
    horizon * 0.20 +
    discipline * 0.15,
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: { budget, frequency, exposure, horizon, discipline },
  };
}
