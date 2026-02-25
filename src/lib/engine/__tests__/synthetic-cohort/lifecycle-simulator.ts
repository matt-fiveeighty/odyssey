/**
 * Lifecycle Execution Simulator
 *
 * Forces synthetic users through a full 10-year hunting lifecycle:
 *   1. Application Submission — commit sunk + floated capital
 *   2. Draw Results — Monte Carlo probability-based drew/didnt_draw
 *   3. Refund/Reset — release floated capital, zero points on draw
 *   4. Year +1 — advance calendar and repeat
 *
 * Also injects Adversarial Agents mid-stream:
 *   - Regulatory Shock: Double a state fee in Year 3
 *   - 5-Year Life Disruption: Slash 10 users' budgets by 50% in Year 4
 *   - Inflation Spike: 8% annual F&G inflation across the board
 */

import type { SyntheticProfile } from "./profiles";
import type {
  StrategicAssessment,
  RoadmapYear,
  RoadmapAction,
  UserPoints,
  Milestone,
  CapitalSummary,
  ClassifiedFee,
} from "@/lib/types";
import { generateStrategicAssessment, resetDataContext } from "../../roadmap-generator";
import { computeCapitalSummary } from "../../capital-allocator";
import { dispatchDrawOutcome, type DrawOutcomeEvent, type CascadeResult } from "../../fiduciary-dispatcher";
import { cascadingPrune, type PortfolioAsset } from "../../portfolio-stress";
import { STATES_MAP } from "@/lib/constants/states";

// ── Deterministic seeded randomness ──

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Types ──

export interface YearLog {
  year: number;
  /** Actions taken (apply/buy_points/hunt/scout) */
  actionsSubmitted: number;
  /** Capital deployed this year */
  sunkCapital: number;
  floatedCapital: number;
  contingentCapital: number;
  /** Draw outcomes */
  draws: Array<{
    stateId: string;
    speciesId: string;
    outcome: "drew" | "didnt_draw";
    drawOdds: number;
    pointsBefore: number;
    pointsAfter: number;
  }>;
  /** Refunds processed */
  refundsProcessed: number;
  /** Alerts fired */
  alertsFired: string[];
  /** Total points across all states/species */
  totalPortfolioPoints: number;
  /** Year cost */
  yearCost: number;
  /** Cumulative cost */
  cumulativeCost: number;
  /** Budget was exceeded? */
  budgetExceeded: boolean;
  /** PTO exceeded? */
  ptoExceeded: boolean;
  /** Any negative values encountered? */
  negativeValues: string[];
  /** Adversarial events injected this year */
  adversarialEvents: string[];
}

export interface SimulationResult {
  profileId: string;
  persona: string;
  testDescription: string;
  /** Per-year logs */
  yearLogs: YearLog[];
  /** Assessment generated */
  assessmentGenerated: boolean;
  /** Total years simulated */
  yearsSimulated: number;

  // ── Pass/Fail Criteria ──

  /** Financial Reconciliation: do year 1-10 costs sum correctly? */
  financialReconciliationPassed: boolean;
  financialReconciliationDetail: string;

  /** Capital Allocation Risk: did any year exceed budget/PTO without warning? */
  capitalAllocationPassed: boolean;
  capitalAllocationDetail: string;

  /** Trust Breakpoints: any negative or impossible F&G values? */
  trustBreakpointsPassed: boolean;
  trustBreakpointsDetail: string;

  /** Adversarial Survival: did the engine survive all injected chaos? */
  adversarialSurvivalPassed: boolean;
  adversarialSurvivalDetail: string;

  /** Overall pass */
  allPassed: boolean;

  /** Errors encountered during simulation */
  errors: string[];

  /** Duration in ms */
  durationMs: number;
}

export interface CohortReport {
  totalProfiles: number;
  totalYearsSimulated: number;
  totalPassed: number;
  totalFailed: number;
  /** Per-criterion pass rates */
  financialReconciliationPassRate: number;
  capitalAllocationPassRate: number;
  trustBreakpointPassRate: number;
  adversarialSurvivalPassRate: number;
  /** Failures grouped by persona */
  failuresByPersona: Record<string, number>;
  /** All individual results */
  results: SimulationResult[];
  /** Total duration */
  durationMs: number;
}

// ── Adversarial Event Configuration ──

export interface AdversarialConfig {
  /** Year in which to double a random state's fees */
  regulatoryShockYear: number;
  /** Year in which to slash budgets for N users by 50% */
  lifeDisruptionYear: number;
  /** Number of users hit by life disruption */
  lifeDisruptionCount: number;
  /** Annual inflation rate applied to all fees */
  inflationRate: number;
  /** Enable/disable adversarial agents */
  enabled: boolean;
}

const DEFAULT_ADVERSARIAL: AdversarialConfig = {
  regulatoryShockYear: 3, // Year offset (year 3 of the sim)
  lifeDisruptionYear: 4,
  lifeDisruptionCount: 10,
  inflationRate: 0.08,
  enabled: true,
};

// ── Core Simulator ──

export function simulateLifecycle(
  profile: SyntheticProfile,
  config: {
    adversarial: AdversarialConfig;
    /** Deterministic RNG for draw outcomes */
    rng: () => number;
    /** Indices of profiles selected for budget slash (from cohort-level selection) */
    isLifeDisruptionTarget: boolean;
    /** State selected for regulatory shock */
    regulatoryShockState: string;
  },
): SimulationResult {
  const startTime = performance.now();
  const errors: string[] = [];
  const yearLogs: YearLog[] = [];

  // ── Step 1: Generate the assessment ──
  let assessment: StrategicAssessment;
  try {
    resetDataContext();
    assessment = generateStrategicAssessment(profile.input);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      profileId: profile.id,
      persona: profile.persona,
      testDescription: profile.testDescription,
      yearLogs: [],
      assessmentGenerated: false,
      yearsSimulated: 0,
      financialReconciliationPassed: false,
      financialReconciliationDetail: `Assessment generation failed: ${msg}`,
      capitalAllocationPassed: false,
      capitalAllocationDetail: `Assessment generation failed: ${msg}`,
      trustBreakpointsPassed: false,
      trustBreakpointsDetail: `Assessment generation failed: ${msg}`,
      adversarialSurvivalPassed: false,
      adversarialSurvivalDetail: `Assessment generation failed: ${msg}`,
      allPassed: false,
      errors: [`Assessment generation failed: ${msg}`],
      durationMs: performance.now() - startTime,
    };
  }

  // ── Initialize simulation state ──
  let roadmap = assessment.roadmap;
  let userPoints: UserPoints[] = [];
  let milestones: Milestone[] = [...assessment.milestones];
  let currentBudgetHunt = profile.huntYearBudget;
  let currentBudgetPoint = profile.pointYearBudget;
  let cumulativeCost = 0;
  const currentYear = new Date().getFullYear();

  // Seed points from profile
  for (const [stateId, speciesMap] of Object.entries(profile.input.existingPoints)) {
    for (const [speciesId, pts] of Object.entries(speciesMap)) {
      userPoints.push({
        id: `${profile.id}-${stateId}-${speciesId}`,
        userId: profile.id,
        stateId,
        speciesId,
        points: pts,
        pointType: "preference",
      });
    }
  }

  // ── Year-by-Year Simulation Loop ──
  const simYears = Math.min(roadmap.length, 10);

  for (let yearIdx = 0; yearIdx < simYears; yearIdx++) {
    const yearData = roadmap[yearIdx];
    if (!yearData) break;

    const yearNum = yearData.year;
    const yearOffset = yearIdx + 1; // 1-indexed
    const negativeValues: string[] = [];
    const adversarialEvents: string[] = [];
    const alertsFired: string[] = [];
    let refundsProcessed = 0;

    // ── Adversarial Agent: Inflation Spike ──
    // Apply compounding inflation to all action costs
    if (config.adversarial.enabled && yearIdx > 0) {
      const inflationMultiplier = Math.pow(1 + config.adversarial.inflationRate, yearIdx);
      for (const action of yearData.actions) {
        action.cost = Math.round(action.cost * inflationMultiplier);
        for (const ci of action.costs) {
          ci.amount = Math.round(ci.amount * inflationMultiplier);
        }
      }
      yearData.estimatedCost = yearData.actions.reduce((s, a) => s + a.cost, 0);
      adversarialEvents.push(`Inflation applied: ${((inflationMultiplier - 1) * 100).toFixed(1)}% cumulative`);
    }

    // ── Adversarial Agent: Regulatory Shock (Year 3) ──
    if (
      config.adversarial.enabled &&
      yearOffset === config.adversarial.regulatoryShockYear
    ) {
      for (const action of yearData.actions) {
        if (action.stateId === config.regulatoryShockState) {
          const oldCost = action.cost;
          action.cost = oldCost * 2;
          for (const ci of action.costs) {
            ci.amount = ci.amount * 2;
          }
          adversarialEvents.push(
            `REGULATORY SHOCK: ${config.regulatoryShockState} fees doubled ($${oldCost} → $${action.cost})`
          );
        }
      }
      yearData.estimatedCost = yearData.actions.reduce((s, a) => s + a.cost, 0);
    }

    // ── Adversarial Agent: Life Disruption (Year 4) ──
    if (
      config.adversarial.enabled &&
      yearOffset === config.adversarial.lifeDisruptionYear &&
      config.isLifeDisruptionTarget
    ) {
      const oldHunt = currentBudgetHunt;
      const oldPoint = currentBudgetPoint;
      currentBudgetHunt = Math.round(currentBudgetHunt * 0.5);
      currentBudgetPoint = Math.round(currentBudgetPoint * 0.5);
      adversarialEvents.push(
        `LIFE DISRUPTION: Budget slashed 50% (Hunt: $${oldHunt} → $${currentBudgetHunt}, Point: $${oldPoint} → $${currentBudgetPoint})`
      );

      // Execute cascading prune if year cost exceeds new budget
      if (yearData.estimatedCost > currentBudgetHunt) {
        try {
          const assets: PortfolioAsset[] = yearData.actions
            .filter(a => a.type === "apply" || a.type === "buy_points")
            .map(a => {
              const pts = userPoints.find(p => p.stateId === a.stateId && p.speciesId === a.speciesId)?.points ?? 0;
              return {
                stateId: a.stateId,
                speciesId: a.speciesId,
                currentPoints: pts,
                annualCost: a.cost,
                sunkCost: pts * (STATES_MAP[a.stateId]?.pointCost?.[a.speciesId] ?? 30),
                drawType: (STATES_MAP[a.stateId]?.pointSystem === "random" ? "lottery" : "preference") as "preference" | "lottery" | "bonus",
                estimatedDrawYear: yearNum + (a.estimatedDrawOdds ? Math.ceil(1 / a.estimatedDrawOdds) : 5),
                isCloseToBurn: a.type === "apply" && (a.estimatedDrawOdds ?? 0) > 0.5,
              };
            });

          const pruneResult = cascadingPrune(assets, currentBudgetHunt);
          adversarialEvents.push(
            `cascadingPrune: Kept ${pruneResult.kept.length}, Pruned ${pruneResult.pruned.length}, Saved $${pruneResult.totalSaved}`
          );

          // Remove pruned actions from year
          const prunedKeys = new Set(pruneResult.pruned.map(p => `${p.stateId}-${p.speciesId}`));
          yearData.actions = yearData.actions.filter(
            a => !prunedKeys.has(`${a.stateId}-${a.speciesId}`)
          );
          yearData.estimatedCost = yearData.actions.reduce((s, a) => s + a.cost, 0);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`cascadingPrune failed in year ${yearNum}: ${msg}`);
          adversarialEvents.push(`cascadingPrune ERROR: ${msg}`);
        }
      }
    }

    // ── Step 2: Application Submission — compute capital classification ──
    let capitalSummary: CapitalSummary;
    try {
      capitalSummary = computeCapitalSummary(assessment, profile.input.homeState);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Capital summary failed in year ${yearNum}: ${msg}`);
      capitalSummary = {
        sunkCapital: 0, floatedCapital: 0, contingentCapital: 0,
        totalDeployed: 0, totalExposure: 0, byState: [], classifiedFees: [],
      };
    }

    // Check for negative capital values
    if (capitalSummary.sunkCapital < 0) negativeValues.push(`sunkCapital=${capitalSummary.sunkCapital}`);
    if (capitalSummary.floatedCapital < 0) negativeValues.push(`floatedCapital=${capitalSummary.floatedCapital}`);
    if (capitalSummary.contingentCapital < 0) negativeValues.push(`contingentCapital=${capitalSummary.contingentCapital}`);

    // ── Step 3: Draw Results — use Monte Carlo probabilities ──
    const drawResults: YearLog["draws"] = [];
    const applyActions = yearData.actions.filter(a => a.type === "apply");

    for (const action of applyActions) {
      const drawOdds = action.estimatedDrawOdds ?? 0.15;
      const roll = config.rng();
      const outcome: "drew" | "didnt_draw" = roll < drawOdds ? "drew" : "didnt_draw";

      // Find or create user point entry
      let pointEntry = userPoints.find(p => p.stateId === action.stateId && p.speciesId === action.speciesId);
      if (!pointEntry) {
        pointEntry = {
          id: `${profile.id}-${action.stateId}-${action.speciesId}`,
          userId: profile.id,
          stateId: action.stateId,
          speciesId: action.speciesId,
          points: 0,
          pointType: "preference",
        };
        userPoints.push(pointEntry);
      }

      const pointsBefore = pointEntry.points;

      // Build draw outcome event
      const drawEvent: DrawOutcomeEvent = {
        type: "draw_outcome",
        milestoneId: `sim-${profile.id}-${yearNum}-${action.stateId}-${action.speciesId}`,
        outcome,
        stateId: action.stateId,
        speciesId: action.speciesId,
        year: yearNum,
        currentPoints: pointsBefore,
      };

      // Dispatch through fiduciary cascade
      let cascade: CascadeResult;
      try {
        cascade = dispatchDrawOutcome(
          drawEvent,
          roadmap,
          userPoints,
          milestones,
          profile.ptoDays,
          currentBudgetHunt,
        );

        // Apply point mutations
        for (const pm of cascade.pointMutations) {
          const target = userPoints.find(p => p.stateId === pm.stateId && p.speciesId === pm.speciesId);
          if (target) {
            target.points = pm.newPoints;
            if (pm.newPoints < 0) negativeValues.push(`points(${pm.stateId}-${pm.speciesId})=${pm.newPoints}`);
          }
        }

        // Track alerts
        for (const alert of cascade.alerts) {
          alertsFired.push(`[${alert.severity}] ${alert.title}`);
        }

        // Track refunds (floated → available on didn't draw)
        for (const reclass of cascade.capitalReclassifications) {
          if (reclass.amount < 0) refundsProcessed++;
        }

        // Track schedule conflicts
        for (const conflict of cascade.scheduleConflicts) {
          alertsFired.push(`[schedule] ${conflict.message}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`dispatchDrawOutcome failed for ${action.stateId}-${action.speciesId} in year ${yearNum}: ${msg}`);
      }

      const pointsAfter = pointEntry.points;
      drawResults.push({
        stateId: action.stateId,
        speciesId: action.speciesId,
        outcome,
        drawOdds,
        pointsBefore,
        pointsAfter,
      });
    }

    // ── Step 4: Buy Points for non-draw actions ──
    const buyActions = yearData.actions.filter(a => a.type === "buy_points");
    for (const action of buyActions) {
      let pointEntry = userPoints.find(p => p.stateId === action.stateId && p.speciesId === action.speciesId);
      if (!pointEntry) {
        pointEntry = {
          id: `${profile.id}-${action.stateId}-${action.speciesId}`,
          userId: profile.id,
          stateId: action.stateId,
          speciesId: action.speciesId,
          points: 0,
          pointType: "preference",
        };
        userPoints.push(pointEntry);
      }
      pointEntry.points += 1;
    }

    // ── Compute year metrics ──
    const yearCost = yearData.estimatedCost;
    cumulativeCost += yearCost;
    const totalPoints = userPoints.reduce((s, p) => s + p.points, 0);

    // Check for negative costs
    if (yearCost < 0) negativeValues.push(`yearCost=${yearCost}`);
    for (const a of yearData.actions) {
      if (a.cost < 0) negativeValues.push(`action(${a.stateId}-${a.speciesId}).cost=${a.cost}`);
    }

    // Budget exceeded check
    const isHuntYear = yearData.actions.some(a => a.type === "hunt");
    const budgetLimit = isHuntYear ? currentBudgetHunt : currentBudgetPoint;
    const budgetExceeded = yearCost > budgetLimit * 1.2; // 20% tolerance

    // PTO check (estimate 6 days per hunt)
    const huntCount = yearData.actions.filter(a => a.type === "hunt").length;
    const estimatedDays = huntCount * 6;
    const ptoExceeded = estimatedDays > profile.ptoDays;

    yearLogs.push({
      year: yearNum,
      actionsSubmitted: yearData.actions.length,
      sunkCapital: capitalSummary.sunkCapital,
      floatedCapital: capitalSummary.floatedCapital,
      contingentCapital: capitalSummary.contingentCapital,
      draws: drawResults,
      refundsProcessed,
      alertsFired,
      totalPortfolioPoints: totalPoints,
      yearCost,
      cumulativeCost,
      budgetExceeded,
      ptoExceeded,
      negativeValues,
      adversarialEvents,
    });
  }

  // ── Evaluate Pass/Fail Criteria ──

  // 1. Financial Reconciliation: do individual year costs sum to cumulative?
  const yearCostSum = yearLogs.reduce((s, yl) => s + yl.yearCost, 0);
  const lastCumulative = yearLogs[yearLogs.length - 1]?.cumulativeCost ?? 0;
  const reconciliationDelta = Math.abs(yearCostSum - lastCumulative);
  const financialReconciliationPassed = reconciliationDelta < 1; // < $1 tolerance (rounding)
  const financialReconciliationDetail = financialReconciliationPassed
    ? `Sum of year costs ($${yearCostSum}) matches cumulative ($${lastCumulative})`
    : `MISMATCH: Sum of year costs ($${yearCostSum}) != cumulative ($${lastCumulative}), delta=$${reconciliationDelta}`;

  // 2. Capital Allocation Risk: any budget/PTO exceeded without warning?
  const budgetExceededYears = yearLogs.filter(yl => yl.budgetExceeded);
  const ptoExceededYears = yearLogs.filter(yl => yl.ptoExceeded);
  const budgetExceededWithoutWarning = budgetExceededYears.filter(
    yl => !yl.alertsFired.some(a => a.includes("budget") || a.includes("Budget") || a.includes("BUDGET") || a.includes("cost") || a.includes("Disaster"))
  );
  const ptoExceededWithoutWarning = ptoExceededYears.filter(
    yl => !yl.alertsFired.some(a => a.includes("PTO") || a.includes("schedule") || a.includes("days") || a.includes("Disaster"))
  );
  const capitalAllocationPassed = budgetExceededWithoutWarning.length === 0 && ptoExceededWithoutWarning.length === 0;
  const capitalAllocationDetail = capitalAllocationPassed
    ? `Budget exceeded in ${budgetExceededYears.length} years (all warned), PTO exceeded in ${ptoExceededYears.length} years (all warned)`
    : `UNWARNED EXCEEDANCES: ${budgetExceededWithoutWarning.length} budget, ${ptoExceededWithoutWarning.length} PTO — years: ${[...budgetExceededWithoutWarning, ...ptoExceededWithoutWarning].map(y => y.year).join(", ")}`;

  // 3. Trust Breakpoints: any negative or impossible values?
  const allNegatives = yearLogs.flatMap(yl => yl.negativeValues);
  const trustBreakpointsPassed = allNegatives.length === 0;
  const trustBreakpointsDetail = trustBreakpointsPassed
    ? "No negative or impossible values detected across all years"
    : `NEGATIVE VALUES: ${allNegatives.join("; ")}`;

  // 4. Adversarial Survival: did the engine survive all chaos without crashing?
  const adversarialSurvivalPassed = errors.length === 0;
  const adversarialSurvivalDetail = adversarialSurvivalPassed
    ? `Survived all adversarial events across ${simYears} years`
    : `ERRORS: ${errors.join("; ")}`;

  const allPassed =
    financialReconciliationPassed &&
    capitalAllocationPassed &&
    trustBreakpointsPassed &&
    adversarialSurvivalPassed;

  return {
    profileId: profile.id,
    persona: profile.persona,
    testDescription: profile.testDescription,
    yearLogs,
    assessmentGenerated: true,
    yearsSimulated: simYears,
    financialReconciliationPassed,
    financialReconciliationDetail,
    capitalAllocationPassed,
    capitalAllocationDetail,
    trustBreakpointsPassed,
    trustBreakpointsDetail,
    adversarialSurvivalPassed,
    adversarialSurvivalDetail,
    allPassed,
    errors,
    durationMs: performance.now() - startTime,
  };
}

// ── Cohort Runner ──

export function runSyntheticCohort(
  profiles: SyntheticProfile[],
  adversarial: AdversarialConfig = DEFAULT_ADVERSARIAL,
): CohortReport {
  const startTime = performance.now();
  const rng = seededRandom(7777); // Deterministic draw outcomes

  // Pre-select which profiles get hit by life disruption
  const disruptionTargets = new Set<string>();
  const shuffled = [...profiles].sort((a, b) => {
    // Deterministic shuffle using profile IDs
    const ha = a.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const hb = b.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    return ha - hb;
  });
  for (let i = 0; i < Math.min(adversarial.lifeDisruptionCount, shuffled.length); i++) {
    disruptionTargets.add(shuffled[i].id);
  }

  // Pick regulatory shock state (deterministic)
  const shockState = "CO"; // Colorado — large impact, well-tested

  const results: SimulationResult[] = [];

  for (const profile of profiles) {
    const result = simulateLifecycle(profile, {
      adversarial,
      rng,
      isLifeDisruptionTarget: disruptionTargets.has(profile.id),
      regulatoryShockState: shockState,
    });
    results.push(result);
  }

  // ── Aggregate Report ──
  const totalPassed = results.filter(r => r.allPassed).length;
  const totalFailed = results.filter(r => !r.allPassed).length;

  const failuresByPersona: Record<string, number> = {};
  for (const r of results.filter(r => !r.allPassed)) {
    failuresByPersona[r.persona] = (failuresByPersona[r.persona] ?? 0) + 1;
  }

  return {
    totalProfiles: profiles.length,
    totalYearsSimulated: results.reduce((s, r) => s + r.yearsSimulated, 0),
    totalPassed,
    totalFailed,
    financialReconciliationPassRate: results.filter(r => r.financialReconciliationPassed).length / results.length,
    capitalAllocationPassRate: results.filter(r => r.capitalAllocationPassed).length / results.length,
    trustBreakpointPassRate: results.filter(r => r.trustBreakpointsPassed).length / results.length,
    adversarialSurvivalPassRate: results.filter(r => r.adversarialSurvivalPassed).length / results.length,
    failuresByPersona,
    results,
    durationMs: performance.now() - startTime,
  };
}
