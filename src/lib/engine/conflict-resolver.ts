/**
 * Conflict Resolution Engine — Overdraw & PTO Detection
 *
 * Detects conflicts when users draw multiple premium tags in the same year,
 * or when schedule/budget constraints create impossible hunting seasons.
 */

import type { StrategicAssessment, RoadmapYear, RoadmapAction } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName } from "@/lib/utils";

// ── Conflict types ──

export interface PlanConflict {
  id: string;
  type: "overdraw" | "pto_conflict" | "budget_overflow" | "schedule_overlap" | "point_abandon";
  severity: "critical" | "warning" | "info";
  year: number;
  title: string;
  description: string;
  resolution: string;
  affectedActions: { stateId: string; speciesId: string }[];
}

// ── Overdraw Detection ──
// If a user draws 2+ premium tags in the same year, they may not have
// enough PTO, budget, or physical bandwidth to hunt both.

export function detectOverdrawConflicts(
  assessment: StrategicAssessment,
  maxHuntsPerYear: number = 2,
  huntDaysPerYear: number = 14,
): PlanConflict[] {
  const conflicts: PlanConflict[] = [];

  for (const yr of assessment.roadmap) {
    const huntActions = yr.actions.filter((a) => a.type === "hunt");
    if (huntActions.length <= 1) continue;

    // Check if too many hunts are scheduled
    if (huntActions.length > maxHuntsPerYear) {
      conflicts.push({
        id: `overdraw-${yr.year}`,
        type: "overdraw",
        severity: "critical",
        year: yr.year,
        title: `Overdraw: ${huntActions.length} hunts in ${yr.year}`,
        description:
          `You're scheduled for ${huntActions.length} hunts in ${yr.year}: ${huntActions.map((a) => `${STATES_MAP[a.stateId]?.abbreviation ?? a.stateId} ${formatSpeciesName(a.speciesId)}`).join(", ")}. This exceeds your ${maxHuntsPerYear}-hunt max.`,
        resolution:
          `Move the lowest-priority hunt to "Points Only" for ${yr.year} and reschedule to ${yr.year + 1}.`,
        affectedActions: huntActions.map((a) => ({
          stateId: a.stateId,
          speciesId: a.speciesId,
        })),
      });
    }

    // Check total hunt days required
    const totalDaysNeeded = huntActions.length * 7; // ~7 days per hunt average
    if (totalDaysNeeded > huntDaysPerYear) {
      conflicts.push({
        id: `pto-${yr.year}`,
        type: "pto_conflict",
        severity: "warning",
        year: yr.year,
        title: `PTO Conflict: ${totalDaysNeeded} days needed in ${yr.year}`,
        description:
          `${huntActions.length} hunts × ~7 days = ${totalDaysNeeded} days required. You have ${huntDaysPerYear} days available per year.`,
        resolution:
          `Consider combining nearby hunts (e.g., CO elk + CO deer in one trip) or shifting one hunt to "Points Only" for this year.`,
        affectedActions: huntActions.map((a) => ({
          stateId: a.stateId,
          speciesId: a.speciesId,
        })),
      });
    }
  }

  return conflicts;
}

// ── Budget Overflow Detection ──

export function detectBudgetConflicts(
  assessment: StrategicAssessment,
  pointYearBudget: number,
  huntYearBudget: number,
): PlanConflict[] {
  const conflicts: PlanConflict[] = [];

  for (const yr of assessment.roadmap) {
    const yearCost = yr.actions.reduce((sum, a) => sum + a.cost, 0);
    const isHuntYear = yr.actions.some((a) => a.type === "hunt");
    const budget = isHuntYear ? huntYearBudget : pointYearBudget;

    if (budget > 0 && yearCost > budget * 1.2) {
      const overagePercent = Math.round(((yearCost - budget) / budget) * 100);
      conflicts.push({
        id: `budget-${yr.year}`,
        type: "budget_overflow",
        severity: yearCost > budget * 1.5 ? "critical" : "warning",
        year: yr.year,
        title: `Budget Overflow: ${yr.year} costs ${overagePercent}% over cap`,
        description:
          `${yr.year} projected cost: $${yearCost.toLocaleString()} vs your $${budget.toLocaleString()} ${isHuntYear ? "hunt year" : "point year"} budget.`,
        resolution:
          `Drop the most expensive state from ${yr.year} applications, or reduce to "Points Only" for one state.`,
        affectedActions: yr.actions
          .filter((a) => a.cost > budget * 0.3)
          .map((a) => ({ stateId: a.stateId, speciesId: a.speciesId })),
      });
    }
  }

  return conflicts;
}

// ── Schedule Overlap Detection ──
// Detect when two hunts have overlapping season dates in the same year.

export function detectScheduleOverlaps(
  assessment: StrategicAssessment,
): PlanConflict[] {
  const conflicts: PlanConflict[] = [];

  for (const yr of assessment.roadmap) {
    const huntActions = yr.actions.filter((a) => a.type === "hunt");
    if (huntActions.length <= 1) continue;

    // Check for same-month overlaps using state season data
    for (let i = 0; i < huntActions.length; i++) {
      for (let j = i + 1; j < huntActions.length; j++) {
        const a1 = huntActions[i];
        const a2 = huntActions[j];
        const state1 = STATES_MAP[a1.stateId];
        const state2 = STATES_MAP[a2.stateId];

        // Simple overlap heuristic: same state or neighboring states
        // with overlapping season months (Oct-Nov is peak for most western states)
        if (a1.stateId !== a2.stateId) {
          // Check if both are likely Oct/Nov seasons (most rifle seasons)
          const bothRifle = !a1.description?.toLowerCase().includes("archery") &&
                           !a2.description?.toLowerCase().includes("archery");
          if (bothRifle) {
            conflicts.push({
              id: `schedule-${yr.year}-${a1.stateId}-${a2.stateId}`,
              type: "schedule_overlap",
              severity: "info",
              year: yr.year,
              title: `Season Overlap Risk: ${a1.stateId} + ${a2.stateId} (${yr.year})`,
              description:
                `Both ${STATES_MAP[a1.stateId]?.abbreviation ?? a1.stateId} ${formatSpeciesName(a1.speciesId)} and ${STATES_MAP[a2.stateId]?.abbreviation ?? a2.stateId} ${formatSpeciesName(a2.speciesId)} likely fall in Oct-Nov rifle season. Verify dates don't overlap.`,
              resolution:
                `Consider archery for one species (earlier season) or confirm specific season dates don't conflict.`,
              affectedActions: [
                { stateId: a1.stateId, speciesId: a1.speciesId },
                { stateId: a2.stateId, speciesId: a2.speciesId },
              ],
            });
          }
        }
      }
    }
  }

  return conflicts;
}

// ── Point Abandonment Warnings ──
// Warn when points have been building 5+ years with no projected draw.

export function detectPointAbandonment(
  assessment: StrategicAssessment,
  existingPoints: Record<string, Record<string, number>>,
): PlanConflict[] {
  const conflicts: PlanConflict[] = [];
  const currentYear = new Date().getFullYear();
  const maxYear = Math.max(...assessment.roadmap.map((yr) => yr.year), currentYear);

  for (const [stateId, speciesMap] of Object.entries(existingPoints)) {
    for (const [speciesId, pts] of Object.entries(speciesMap)) {
      if (pts < 3) continue; // Not enough invested to worry about

      // Check if this state/species ever has a hunt action in the roadmap
      const hasPlannedHunt = assessment.roadmap.some((yr) =>
        yr.actions.some(
          (a) => a.stateId === stateId && a.speciesId === speciesId && a.type === "hunt",
        ),
      );

      if (!hasPlannedHunt) {
        conflicts.push({
          id: `abandon-${stateId}-${speciesId}`,
          type: "point_abandon",
          severity: pts >= 5 ? "warning" : "info",
          year: currentYear,
          title: `Stale Points: ${pts} pts in ${STATES_MAP[stateId]?.abbreviation ?? stateId} ${formatSpeciesName(speciesId)}`,
          description:
            `You have ${pts} preference points in ${STATES_MAP[stateId]?.name ?? stateId} for ${formatSpeciesName(speciesId)} but no hunt is planned within your ${maxYear - currentYear + 1}-year horizon.`,
          resolution:
            `Either add a ${formatSpeciesName(speciesId)} hunt to your plan, or stop buying points to free up budget.`,
          affectedActions: [{ stateId, speciesId }],
        });
      }
    }
  }

  return conflicts;
}

// ── Master Conflict Runner ──

export function detectAllConflicts(
  assessment: StrategicAssessment,
  options: {
    maxHuntsPerYear?: number;
    huntDaysPerYear?: number;
    pointYearBudget: number;
    huntYearBudget: number;
    existingPoints: Record<string, Record<string, number>>;
  },
): PlanConflict[] {
  return [
    ...detectOverdrawConflicts(
      assessment,
      options.maxHuntsPerYear ?? 2,
      options.huntDaysPerYear ?? 14,
    ),
    ...detectBudgetConflicts(
      assessment,
      options.pointYearBudget,
      options.huntYearBudget,
    ),
    ...detectScheduleOverlaps(assessment),
    ...detectPointAbandonment(assessment, options.existingPoints),
  ];
}
