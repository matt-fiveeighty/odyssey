/**
 * Strategy Metrics Service
 *
 * Centralized computation of portfolio-level strategic metrics.
 * Pure function — takes assessment + mandate, returns all key numbers.
 * Recalculated whenever budget, states, age, or species change.
 */

import type {
  StrategicAssessment,
  PortfolioMandate,
  RoadmapYear,
} from "@/lib/types";

export interface StrategyMetrics {
  /** Year number of the next projected hunt */
  nextHighProbabilityDrawYear: number | null;
  /** Annual application spend across all states */
  annualApplicationSpend: number;
  /** 10-year projected total spend */
  projected10YearSpend: number;
  /** 20-year projected total spend */
  projected20YearSpend: number;
  /** e.g. "1–2" or "3–5" */
  huntFrequencyRange: string;
  /** % of budget allocated to <5% odds species */
  lowProbabilityAllocationPercentage: number;
  /** % of budget in top single state (Herfindahl-style) */
  portfolioConcentrationPercentage: number;
}

/**
 * Compute all strategy metrics from a confirmed assessment.
 */
export function computeStrategyMetrics(
  assessment: StrategicAssessment,
  mandate?: PortfolioMandate,
): StrategyMetrics {
  const roadmap = assessment.roadmap;

  // --- Next high-probability draw year ---
  const nextHuntAction = roadmap
    .flatMap((yr) =>
      yr.actions
        .filter((a) => a.type === "hunt")
        .map((a) => ({ year: yr.year, odds: a.estimatedDrawOdds ?? 0 })),
    )
    .sort((a, b) => a.year - b.year)[0];

  const nextHighProbabilityDrawYear = nextHuntAction?.year ?? null;

  // --- Annual application spend (year 1 point-year cost) ---
  const year1 = roadmap[0];
  const annualApplicationSpend = year1?.pointYearCost ?? 0;

  // --- 10-year and 20-year projected spend ---
  const projected10YearSpend = projectSpend(roadmap, 10);
  const projected20YearSpend = projectSpend(roadmap, 20);

  // --- Hunt frequency range ---
  const huntFrequencyRange = computeHuntFrequencyRange(roadmap);

  // --- Low-probability allocation % ---
  const lowProbabilityAllocationPercentage =
    computeLowProbAllocation(roadmap);

  // --- Portfolio concentration % ---
  const portfolioConcentrationPercentage =
    computeConcentration(assessment);

  return {
    nextHighProbabilityDrawYear,
    annualApplicationSpend,
    projected10YearSpend,
    projected20YearSpend,
    huntFrequencyRange,
    lowProbabilityAllocationPercentage,
    portfolioConcentrationPercentage,
  };
}

// --- Helpers ---

function projectSpend(roadmap: RoadmapYear[], years: number): number {
  if (roadmap.length === 0) return 0;

  let total = 0;
  for (let i = 0; i < years; i++) {
    // Cycle through roadmap if horizon exceeds roadmap length
    const yr = roadmap[i % roadmap.length];
    if (yr) total += yr.estimatedCost;
  }
  return Math.round(total);
}

function computeHuntFrequencyRange(roadmap: RoadmapYear[]): string {
  if (roadmap.length === 0) return "0";

  const totalHunts = roadmap.reduce(
    (s, yr) => s + yr.actions.filter((a) => a.type === "hunt").length,
    0,
  );

  const years = roadmap.length;
  const avg = totalHunts / years;

  // Return as a range: floor–ceil of avg per year, with a ±0.3 buffer
  const lo = Math.max(0, Math.floor((avg - 0.3) * 10) / 10);
  const hi = Math.ceil((avg + 0.3) * 10) / 10;

  // Format nicely
  const loInt = Math.max(0, Math.floor(avg * years * 0.8 / years));
  const hiInt = Math.ceil(avg * years * 1.2 / years);

  if (loInt === hiInt) return `~${loInt}`;
  return `${loInt}–${hiInt}`;
}

function computeLowProbAllocation(roadmap: RoadmapYear[]): number {
  const year1 = roadmap[0];
  if (!year1) return 0;

  const totalCost = year1.estimatedCost;
  if (totalCost === 0) return 0;

  const lowOddsCost = year1.actions
    .filter(
      (a) => a.estimatedDrawOdds !== undefined && a.estimatedDrawOdds < 0.05,
    )
    .reduce((s, a) => s + a.cost, 0);

  return Math.round((lowOddsCost / totalCost) * 100);
}

function computeConcentration(
  assessment: StrategicAssessment,
): number {
  const recs = assessment.stateRecommendations;
  if (recs.length === 0) return 0;

  const totalCost = recs.reduce((s, r) => s + r.annualCost, 0);
  if (totalCost === 0) return 0;

  const maxStateCost = Math.max(...recs.map((r) => r.annualCost));
  return Math.round((maxStateCost / totalCost) * 100);
}
