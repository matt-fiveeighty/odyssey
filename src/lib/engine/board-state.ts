/**
 * Board State Computation
 *
 * Evaluates the current roadmap against the mandate and discipline violations
 * to produce a single status badge + contextual signals.
 *
 * Pure function. No side effects.
 */

import type {
  StrategicAssessment,
  PortfolioMandate,
  DisciplineViolation,
  BoardState,
  BoardStatus,
  BoardSignal,
  UserPoints,
} from "@/lib/types";
import { migratePhaseToYearType } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName } from "@/lib/utils";

/**
 * Compute the board state from an assessment, mandate, discipline violations, and user points.
 */
export function computeBoardState(
  assessment: StrategicAssessment,
  mandate: PortfolioMandate | undefined,
  violations: DisciplineViolation[],
  userPoints: UserPoints[],
  currentYear?: number,
): BoardState {
  const year = currentYear ?? new Date().getFullYear();
  const roadmap = assessment.roadmap;

  // Count violations by severity
  const criticalCount = violations.filter((v) => v.severity === "critical").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;

  // Cadence calculation
  const targetCadence = mandate?.annualHuntFrequencyTarget ?? 1;
  const first5 = roadmap.slice(0, 5);
  const totalHunts = first5.reduce(
    (s, yr) => s + yr.actions.filter((a) => a.type === "hunt").length,
    0,
  );
  const actualCadence = totalHunts / Math.max(first5.length, 1);
  const cadenceMet = actualCadence >= targetCadence * 0.8; // 80% threshold

  // Capital deployed this year
  const thisYearData = roadmap.find((yr) => yr.year === year);
  const capitalDeployed = thisYearData?.estimatedCost ?? 0;
  const capitalBudgeted = mandate
    ? mandate.annualBudgetCeiling
    : assessment.financialSummary.annualSubscription;

  // Detect burn windows
  const thisYearPhase = thisYearData?.phase;
  const nextYear = roadmap.find((yr) => yr.year === year + 1);
  const nextYearPhase = nextYear?.phase;
  const normalizedThisPhase = thisYearPhase ? migratePhaseToYearType(thisYearPhase) : null;
  const normalizedNextPhase = nextYearPhase ? migratePhaseToYearType(nextYearPhase) : null;

  // Check if a burn was executed (completed hunt in current or prior year)
  const hasCompletedHunt = thisYearData?.actions.some(
    (a) => a.type === "hunt"
  ) ?? false;

  // Determine status
  let status: BoardStatus;
  const hasOverexposedViolation = violations.some(
    (v) => v.ruleId === "budget_concentration" || v.ruleId === "premium_overload",
  );
  const hasPlateauViolation = violations.some(
    (v) => v.ruleId === "plateau_detected" || v.ruleId === "build_fatigue",
  );

  if (normalizedThisPhase === "burn" && hasCompletedHunt) {
    status = "conversion_executed";
  } else if (normalizedThisPhase === "burn") {
    status = "conversion_ready";
  } else if (normalizedNextPhase === "burn") {
    status = "conversion_approaching";
  } else if (criticalCount >= 2) {
    status = "off_track";
  } else if (hasOverexposedViolation) {
    status = "overexposed";
  } else if (hasPlateauViolation) {
    status = "plateau_detected";
  } else if (criticalCount === 0 && warningCount === 0 && cadenceMet) {
    status = "position_strong";
  } else if (criticalCount === 0 && cadenceMet) {
    status = "on_track";
  } else {
    status = "off_track";
  }

  // Build signals
  const signals: BoardSignal[] = [];

  if (cadenceMet) {
    signals.push({
      type: "positive",
      message: `Cadence: ${actualCadence.toFixed(1)} hunts/yr (target ${targetCadence}).`,
    });
  } else {
    signals.push({
      type: "warning",
      message: `Cadence below target: ${actualCadence.toFixed(1)} hunts/yr (target ${targetCadence}).`,
    });
  }

  const statesOnTrack = assessment.stateRecommendations.length;
  if (statesOnTrack > 0) {
    signals.push({
      type: "positive",
      message: `${statesOnTrack} state${statesOnTrack > 1 ? "s" : ""} in portfolio.`,
    });
  }

  if (criticalCount > 0) {
    signals.push({
      type: "critical",
      message: `${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} require attention.`,
    });
  }

  if (warningCount > 0) {
    signals.push({
      type: "warning",
      message: `${warningCount} warning${warningCount > 1 ? "s" : ""}.`,
    });
  }

  // Primary focus — identify the next major action
  let primaryFocus = "Building portfolio";
  const burnYears = roadmap.filter((yr) => {
    const p = migratePhaseToYearType(yr.phase);
    return p === "burn";
  });
  const nextBurn = burnYears.find((yr) => yr.year >= year);
  if (nextBurn) {
    const burnAction = nextBurn.actions.find((a) => a.type === "hunt");
    if (burnAction) {
      const state = STATES_MAP[burnAction.stateId];
      const yearsOut = nextBurn.year - year;
      primaryFocus = yearsOut === 0
        ? `${state?.abbreviation ?? burnAction.stateId} ${formatSpeciesName(burnAction.speciesId)} — conversion year`
        : `${state?.abbreviation ?? burnAction.stateId} ${formatSpeciesName(burnAction.speciesId)} — Year ${yearsOut} of ${yearsOut + (roadmap.findIndex((y) => y === nextBurn) + 1)}`;
    }
  }

  return {
    status,
    primaryFocus,
    cadence: `${actualCadence.toFixed(1)} hunts/yr — target ${targetCadence}`,
    capitalDeployed,
    capitalBudgeted,
    statesActive: assessment.stateRecommendations.length,
    speciesActive: new Set(
      assessment.stateRecommendations.flatMap((r) =>
        r.bestUnits.map((u) => u.unitCode.split("-")[0]),
      ),
    ).size || assessment.stateRecommendations.length,
    lastUpdated: new Date().toISOString(),
    signals,
  };
}

/** Human-readable labels for board status */
export const BOARD_STATUS_LABELS: Record<BoardStatus, string> = {
  position_strong: "Position Strong",
  on_track: "On Track",
  overexposed: "Overexposed",
  plateau_detected: "Plateau Detected",
  conversion_approaching: "Conversion Approaching",
  conversion_ready: "Conversion Ready",
  conversion_executed: "Conversion Executed",
  off_track: "Off Track",
};

/** Color tokens for board status badges (uses semantic tokens from phase-colors) */
export const BOARD_STATUS_COLORS: Record<BoardStatus, { bg: string; text: string; border: string }> = {
  position_strong: { bg: "bg-chart-5/15", text: "text-chart-5", border: "border-chart-5/30" },
  on_track: { bg: "bg-success/15", text: "text-success", border: "border-success/30" },
  overexposed: { bg: "bg-chart-4/15", text: "text-chart-4", border: "border-chart-4/30" },
  plateau_detected: { bg: "bg-warning/15", text: "text-warning", border: "border-warning/30" },
  conversion_approaching: { bg: "bg-info/15", text: "text-info", border: "border-info/30" },
  conversion_ready: { bg: "bg-primary/15", text: "text-primary", border: "border-primary/30" },
  conversion_executed: { bg: "bg-chart-5/15", text: "text-chart-5", border: "border-chart-5/30" },
  off_track: { bg: "bg-destructive/15", text: "text-destructive", border: "border-destructive/30" },
};
