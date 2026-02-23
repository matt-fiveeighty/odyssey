// ============================================================================
// Diff Engine Pipeline (Phase 9)
// Pure functions -- no React, no store, no side effects.
//
// Computes what changed since the user's last visit, filters to material
// changes only, categorizes each item, and generates advisor-voice
// interpretation. Following the pipeline pattern from advisor.ts (Phase 5).
// ============================================================================

import type {
  DiffItem,
  DiffCategory,
  Milestone,
  StrategicAssessment,
  UserPoints,
  State,
} from "@/lib/types";
import { getUrgencyLevel, daysUntilDate } from "@/lib/engine/urgency";
import { detectCreepShifts } from "@/lib/engine/advisor-creep";
import { formatTemporalPrefix, type TemporalContext } from "@/lib/engine/advisor-temporal";
import { STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName } from "@/lib/utils";

// ============================================================================
// Constants
// ============================================================================

export const MATERIALITY_THRESHOLDS = {
  costChange: 25,           // $25 minimum cost delta
  deadlineShift: 5,         // 5-day minimum deadline zone change
  drawTimelineShift: 1,     // 1-year minimum draw timeline shift
} as const;

export const DIFF_CATEGORY_PRIORITY: Record<DiffCategory, number> = {
  action_required: 0,
  warning: 1,
  opportunity: 2,
  status_update: 3,
};

const MAX_DIFF_ITEMS = 5;

// ============================================================================
// Main Pipeline
// ============================================================================

/**
 * Compute diff items showing what changed since the user's last visit.
 *
 * Guards:
 * - Returns [] for non-returning users (first visit or same day)
 * - Returns [] if assessment was regenerated after the last diff computation
 *   (avoids stale diffs per Pitfall 3 in research)
 *
 * Pipeline: 4 sub-generators -> materiality filter -> sort -> cap at MAX_DIFF_ITEMS
 */
export function computeDiffItems(
  temporal: TemporalContext,
  milestones: Milestone[],
  assessment: StrategicAssessment,
  userPoints: UserPoints[],
  states: State[],
  lastDiffComputedAt?: string | null,
): DiffItem[] {
  // Guard: non-returning users get no diffs
  if (!temporal.isReturningUser || temporal.daysSinceLastVisit === null || temporal.daysSinceLastVisit < 1) {
    return [];
  }

  // Guard: skip diffs if assessment was regenerated since last diff computation
  // This avoids showing stale "changes" that are really just new plan data
  if (lastDiffComputedAt && assessment.createdAt > lastDiffComputedAt) {
    return [];
  }

  // Run 4 sub-generators
  const rawItems: DiffItem[] = [
    ...computeDeadlineDiffs(temporal, milestones, states),
    ...computeDrawResultDiffs(temporal, states, assessment),
    ...computeCreepDiffs(temporal, assessment, userPoints),
    ...computeOpportunityDiffs(temporal, assessment, states),
  ];

  // Filter by materiality
  const materialItems = filterByMateriality(rawItems);

  // Sort by category priority (action_required first), then by absolute delta descending
  materialItems.sort((a, b) => {
    const catDiff = DIFF_CATEGORY_PRIORITY[a.category] - DIFF_CATEGORY_PRIORITY[b.category];
    if (catDiff !== 0) return catDiff;
    return Math.abs(b.delta) - Math.abs(a.delta);
  });

  // Cap at MAX_DIFF_ITEMS
  return materialItems.slice(0, MAX_DIFF_ITEMS);
}

// ============================================================================
// Sub-generator 1: Deadline Proximity
// ============================================================================

/**
 * Detect deadlines that moved into a more urgent zone since last visit.
 * Only fires when a deadline transitions to red or amber (not green->green).
 */
function computeDeadlineDiffs(
  temporal: TemporalContext,
  milestones: Milestone[],
  states: State[],
): DiffItem[] {
  const items: DiffItem[] = [];
  const lastVisitDate = new Date(temporal.lastVisitAt!);
  const prefix = formatTemporalPrefix(temporal);

  for (const milestone of milestones) {
    if (!milestone.dueDate) continue;

    const daysNow = daysUntilDate(milestone.dueDate, temporal.currentDate);
    // Only consider future deadlines
    if (daysNow <= 0) continue;

    const daysAtLastVisit = daysUntilDate(milestone.dueDate, lastVisitDate);

    const zoneNow = getUrgencyLevel(milestone.dueDate, temporal.currentDate);
    const zoneThen = getUrgencyLevel(milestone.dueDate, lastVisitDate);

    // Only generate diff if zone got MORE urgent and is now red or amber
    if (zoneNow === zoneThen) continue;
    if (zoneNow !== "red" && zoneNow !== "amber") continue;

    const state = STATES_MAP[milestone.stateId];
    const stateLabel = state?.abbreviation ?? milestone.stateId;
    const speciesLabel = formatSpeciesName(milestone.speciesId);
    const delta = daysAtLastVisit - daysNow;

    items.push({
      id: `diff-deadline-${milestone.stateId}-${milestone.speciesId}`,
      source: "deadline_proximity",
      category: zoneNow === "red" ? "action_required" : "warning",
      stateId: milestone.stateId,
      speciesId: milestone.speciesId,
      headline: `${stateLabel} ${speciesLabel} deadline now ${zoneNow === "red" ? "urgent" : "approaching"}`,
      interpretation: `${prefix ?? "Recently"}, your ${stateLabel} ${speciesLabel} deadline moved from ${zoneThen} to ${zoneNow}. You have ${daysNow} days remaining.`,
      recommendation: zoneNow === "red"
        ? "Submit your application immediately to avoid missing this deadline."
        : "Review your application materials and prepare to submit soon.",
      cta: {
        label: zoneNow === "red" ? "Apply Now" : "Review Deadline",
        href: state?.buyPointsUrl ?? "/deadlines",
        external: !!state?.buyPointsUrl,
      },
      delta,
      previousValue: zoneThen,
      currentValue: zoneNow,
    });
  }

  return items;
}

// ============================================================================
// Sub-generator 2: Draw Results
// ============================================================================

/**
 * Detect draw result dates that passed since the user's last visit.
 * Only for species the user is actively pursuing (has a state recommendation).
 */
function computeDrawResultDiffs(
  temporal: TemporalContext,
  states: State[],
  assessment: StrategicAssessment,
): DiffItem[] {
  const items: DiffItem[] = [];
  const lastVisitDate = new Date(temporal.lastVisitAt!);
  const today = temporal.currentDate;

  for (const rec of assessment.stateRecommendations) {
    const state = states.find((s) => s.id === rec.stateId);
    if (!state?.drawResultDates) continue;

    const stateLabel = state.abbreviation ?? rec.stateId;

    for (const [speciesId, drawDateStr] of Object.entries(state.drawResultDates)) {
      // Only include species the user is actively pursuing
      // (has milestones or the stateRecommendation implies pursuit)
      const drawDate = new Date(drawDateStr);

      // Draw result released between last visit and today
      if (drawDate <= lastVisitDate || drawDate > today) continue;

      const speciesLabel = formatSpeciesName(speciesId);

      items.push({
        id: `diff-draw-${rec.stateId}-${speciesId}`,
        source: "draw_result",
        category: "status_update",
        stateId: rec.stateId,
        speciesId,
        headline: `${stateLabel} ${speciesLabel} draw results released`,
        interpretation: `${formatTemporalPrefix(temporal) ?? "Recently"}, ${stateLabel} released ${speciesLabel} draw results on ${drawDateStr}. Check whether you were drawn.`,
        recommendation: "Check your draw results and record your outcome.",
        cta: { label: "Record Outcome", href: "/goals" },
        delta: 0, // No numeric delta for draw results
        previousValue: "pending",
        currentValue: "released",
      });
    }
  }

  return items;
}

// ============================================================================
// Sub-generator 3: Point Creep
// ============================================================================

/**
 * Detect draw timeline shifts caused by point creep.
 * Leverages existing detectCreepShifts from advisor-creep.ts.
 */
function computeCreepDiffs(
  temporal: TemporalContext,
  assessment: StrategicAssessment,
  userPoints: UserPoints[],
): DiffItem[] {
  const shifts = detectCreepShifts(assessment, userPoints);
  const prefix = formatTemporalPrefix(temporal);

  return shifts
    .filter((shift) => shift.shiftYears >= MATERIALITY_THRESHOLDS.drawTimelineShift)
    .map((shift): DiffItem => {
      const state = STATES_MAP[shift.stateId];
      const stateLabel = state?.abbreviation ?? shift.stateId;
      const speciesLabel = formatSpeciesName(shift.speciesId);

      return {
        id: `diff-creep-${shift.stateId}-${shift.speciesId}`,
        source: "point_creep",
        category: "warning",
        stateId: shift.stateId,
        speciesId: shift.speciesId,
        headline: `${stateLabel} ${speciesLabel} draw moved to Year ${shift.currentDrawYear}`,
        interpretation: `${prefix ?? "Recently"}, your ${speciesLabel} draw timeline shifted from Year ${shift.previousDrawYear} to Year ${shift.currentDrawYear} due to point creep.`,
        recommendation: "Consider applying this cycle to lock in your position, or increase point purchases.",
        cta: { label: "Review Draw Timeline", href: "/plan-builder" },
        delta: shift.shiftYears,
        previousValue: shift.previousDrawYear,
        currentValue: shift.currentDrawYear,
      };
    });
}

// ============================================================================
// Sub-generator 4: New Opportunities
// ============================================================================

/**
 * Detect application windows that opened since the user's last visit.
 * Checks applicationDeadlines.open dates that fall between lastVisitAt and today.
 */
function computeOpportunityDiffs(
  temporal: TemporalContext,
  assessment: StrategicAssessment,
  states: State[],
): DiffItem[] {
  const items: DiffItem[] = [];
  const lastVisitDate = new Date(temporal.lastVisitAt!);
  const today = temporal.currentDate;

  for (const rec of assessment.stateRecommendations) {
    const state = states.find((s) => s.id === rec.stateId);
    if (!state?.applicationDeadlines) continue;

    const stateLabel = state.abbreviation ?? rec.stateId;

    for (const [speciesId, deadlines] of Object.entries(state.applicationDeadlines)) {
      if (!deadlines.open) continue;

      const openDate = new Date(deadlines.open);

      // Application window opened while user was away
      if (openDate <= lastVisitDate || openDate > today) continue;

      const speciesLabel = formatSpeciesName(speciesId);

      items.push({
        id: `diff-opportunity-${rec.stateId}-${speciesId}`,
        source: "new_opportunity",
        category: "opportunity",
        stateId: rec.stateId,
        speciesId,
        headline: `${stateLabel} ${speciesLabel} application window now open`,
        interpretation: `${formatTemporalPrefix(temporal) ?? "Recently"}, the ${stateLabel} ${speciesLabel} application window opened on ${deadlines.open}. The deadline is ${deadlines.close}.`,
        recommendation: "Application window is open. Review your unit choices and submit before the deadline.",
        cta: {
          label: "Apply Now",
          href: state.buyPointsUrl,
          external: true,
        },
        delta: daysUntilDate(deadlines.close, today), // Days until close
        previousValue: "closed",
        currentValue: "open",
      });
    }
  }

  return items;
}

// ============================================================================
// Materiality Filter
// ============================================================================

/**
 * Filter diff items to only material changes.
 * - deadline_proximity: delta >= deadlineShift threshold (5 days)
 * - point_creep: delta >= drawTimelineShift threshold (1 year)
 * - draw_result: always material
 * - new_opportunity: always material
 */
function filterByMateriality(items: DiffItem[]): DiffItem[] {
  return items.filter((item) => {
    switch (item.source) {
      case "deadline_proximity":
        return Math.abs(item.delta) >= MATERIALITY_THRESHOLDS.deadlineShift;
      case "point_creep":
        return Math.abs(item.delta) >= MATERIALITY_THRESHOLDS.drawTimelineShift;
      case "draw_result":
        return true;
      case "new_opportunity":
        return true;
    }
  });
}
