/**
 * Savings Advisor Sub-generator
 *
 * Produces up to 2 AdvisorInsight items for behind-schedule savings goals.
 * Green-status goals are suppressed (positive silence).
 *
 * CRITICAL: Savings insights use urgency "soon" (red) and "informational" (amber).
 * NEVER "immediate" -- deadline and discipline insights must always rank higher.
 *
 * Pure function. No React, no store, no side effects.
 */

import type { AdvisorInsight, SavingsGoal, UserGoal, Milestone } from "@/lib/types";
import { calculateSavingsStatus, calculateCatchUpDelta, deriveTargetCost } from "./savings-calculator";
import { STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName } from "@/lib/utils";

const MAX_SAVINGS_INSIGHTS = 2;

/**
 * Generate advisor insights for behind-schedule savings goals.
 *
 * For each savings goal linked to a UserGoal:
 * - Derives target cost from milestones
 * - Computes traffic light status
 * - RED -> urgency "soon", AMBER -> urgency "informational"
 * - GREEN -> suppressed (no insight)
 *
 * Returns at most MAX_SAVINGS_INSIGHTS items, red before amber.
 */
export function generateSavingsInsights(
  savingsGoals: SavingsGoal[],
  userGoals: UserGoal[],
  milestones: Milestone[],
): AdvisorInsight[] {
  const insights: AdvisorInsight[] = [];

  for (const sg of savingsGoals) {
    // Find linked UserGoal
    const goal = userGoals.find((g) => g.id === sg.goalId);
    if (!goal) continue;

    // Derive target cost from milestones
    const targetCost = deriveTargetCost(milestones, sg.goalId);
    if (targetCost <= 0) continue;

    // Compute target date (fall of target year)
    const targetDate = new Date(`${goal.targetYear}-09-01`);

    // Traffic light status
    const status = calculateSavingsStatus(
      targetCost,
      sg.currentSaved,
      sg.monthlySavings,
      targetDate,
    );

    // Green = positive silence, no insight needed
    if (status === "green") continue;

    // Compute catch-up delta
    const delta = calculateCatchUpDelta(
      targetCost,
      sg.currentSaved,
      sg.monthlySavings,
      targetDate,
    );

    const deficit = targetCost - sg.currentSaved;
    const stateLabel = STATES_MAP[goal.stateId]?.abbreviation ?? goal.stateId;
    const speciesLabel = formatSpeciesName(goal.speciesId);

    if (status === "red") {
      insights.push({
        id: `savings-behind-${sg.goalId}`,
        signal: { type: "critical", message: `${stateLabel} ${speciesLabel} fund significantly behind` },
        category: "savings",
        urgency: "soon", // NEVER "immediate" -- deadlines rank higher
        interpretation: `You're $${deficit.toLocaleString()} behind on your ${stateLabel} ${speciesLabel} fund -- increase by $${Math.ceil(delta)}/mo to get back on track.`,
        recommendation: `Adjust your monthly savings from $${sg.monthlySavings} to $${Math.ceil(sg.monthlySavings + delta)} to meet your ${goal.targetYear} target.`,
        cta: { label: "Update Savings", href: "/budget" },
        portfolioContext: `$${sg.currentSaved.toLocaleString()} of $${targetCost.toLocaleString()} saved`,
      });
    } else {
      // amber
      insights.push({
        id: `savings-warning-${sg.goalId}`,
        signal: { type: "warning", message: `${stateLabel} ${speciesLabel} fund slightly behind` },
        category: "savings",
        urgency: "informational", // Amber is informational, not soon
        interpretation: `Your ${stateLabel} ${speciesLabel} fund is slightly behind -- $${Math.ceil(delta)} extra per month closes the gap.`,
        recommendation: `Small adjustment: increase monthly savings by $${Math.ceil(delta)} to stay on track for ${goal.targetYear}.`,
        cta: { label: "View Savings", href: "/budget" },
        portfolioContext: `$${sg.currentSaved.toLocaleString()} of $${targetCost.toLocaleString()} saved`,
      });
    }
  }

  // Sort by severity: red (urgency "soon") before amber (urgency "informational")
  insights.sort((a, b) => {
    const order = { immediate: 0, soon: 1, informational: 2, positive: 3 };
    return order[a.urgency] - order[b.urgency];
  });

  return insights.slice(0, MAX_SAVINGS_INSIGHTS);
}
