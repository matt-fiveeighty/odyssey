/**
 * Advisor Insight Generator Pipeline
 *
 * The brain of Phase 5. Transforms raw board state, health, metrics,
 * violations, milestones, points, and temporal context into prioritized,
 * portfolio-specific AdvisorInsight[] items with actionable CTAs.
 *
 * Requirements: ADV-02 through ADV-08.
 *
 * CRITICAL anti-patterns (ADV-08):
 *   - Never suggest abandoning the user's plan
 *   - Never say "consider switching to X instead"
 *   - Always frame insights in terms of the user's EXISTING plan
 *   - Always reference specific states/species/points -- never generic "your portfolio"
 *   - Never show temporal context when daysSinceLastVisit < 1
 *
 * Pure functions. No React, no store, no side effects.
 */

import type {
  BoardState,
  StrategicAssessment,
  DisciplineViolation,
  Milestone,
  UserPoints,
  AdvisorInsight,
  AdvisorUrgency,
  DisciplineRuleId,
  SavingsGoal,
  UserGoal,
} from "@/lib/types";
import type { PortfolioHealthResult } from "@/lib/engine/portfolio-health";
import type { StrategyMetrics } from "@/lib/engine/strategy-metrics";
import type { TemporalContext } from "@/lib/engine/advisor-temporal";
import { getUrgencyLevel, daysUntilDate } from "@/lib/engine/urgency";
import { formatTemporalPrefix } from "@/lib/engine/advisor-temporal";
import { generatePointCreepInsights } from "@/lib/engine/advisor-creep";
import { generateSavingsInsights } from "@/lib/engine/advisor-savings";
import { generateScoutingInsights } from "@/lib/engine/advisor-scouting";
import { detectScoutingOpportunities } from "@/lib/engine/scouting-engine";
import { STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName } from "@/lib/utils";

// --- Constants ---

const MAX_VISIBLE_INSIGHTS = 7;

/** Urgency sort priority: lower = higher priority */
const URGENCY_PRIORITY: Record<AdvisorUrgency, number> = {
  immediate: 0,
  soon: 1,
  informational: 2,
  positive: 3,
};

// ============================================================================
// Sub-generators — each returns AdvisorInsight[]
// ============================================================================

/**
 * 1. Deadline Insights
 *
 * For milestones with due dates in the future, generate urgency-calibrated
 * insights using canonical thresholds (red<=14d, amber<=30d, green>30d).
 * Cap at 3 nearest deadlines.
 */
function generateDeadlineInsights(
  milestones: Milestone[],
  assessment: StrategicAssessment,
): AdvisorInsight[] {
  const now = new Date();
  const insights: AdvisorInsight[] = [];

  // Filter to milestones with due dates in the future
  const upcoming = milestones
    .filter((m) => {
      if (!m.dueDate) return false;
      const days = daysUntilDate(m.dueDate, now);
      return days > 0; // skip overdue and undated
    })
    .sort((a, b) => daysUntilDate(a.dueDate!, now) - daysUntilDate(b.dueDate!, now));

  for (const milestone of upcoming.slice(0, 3)) {
    const days = daysUntilDate(milestone.dueDate!, now);
    const urgencyLevel = getUrgencyLevel(milestone.dueDate, now);

    // Map urgency level to AdvisorUrgency (skip overdue/none — already filtered)
    let urgency: AdvisorUrgency;
    if (urgencyLevel === "red") urgency = "immediate";
    else if (urgencyLevel === "amber") urgency = "soon";
    else urgency = "informational";

    const stateLabel =
      STATES_MAP[milestone.stateId]?.abbreviation ?? milestone.stateId;
    const speciesLabel = formatSpeciesName(milestone.speciesId);

    // Interpretation varies by urgency
    let interpretation: string;
    if (urgency === "immediate") {
      interpretation = `${stateLabel} ${speciesLabel} closes in ${days} days. Miss this and you lose a year of point building.`;
    } else if (urgency === "soon") {
      interpretation = `${stateLabel} ${speciesLabel} deadline is ${days} days out. Time to finalize your unit choices.`;
    } else {
      interpretation = `${stateLabel} ${speciesLabel} opens in ~${days} days. No rush, but start thinking about your approach.`;
    }

    // Recommendation varies by urgency
    let recommendation: string;
    if (urgency === "immediate") {
      recommendation = `Submit your application today. Cost: $${milestone.totalCost}.`;
    } else if (urgency === "soon") {
      recommendation =
        "Review your unit selections and budget, then apply before the deadline.";
    } else {
      recommendation =
        "Use this time to research units and confirm your strategy.";
    }

    // CTA: external link for urgent deadlines with URLs, otherwise internal
    const cta =
      milestone.url && (urgency === "immediate" || urgency === "soon")
        ? { label: "Apply Now", href: milestone.url, external: true }
        : { label: "View Deadlines", href: "/deadlines" };

    // Portfolio context: user's point count for this state+species
    let portfolioContext: string | undefined;
    const stateRec = assessment.stateRecommendations.find(
      (r) => r.stateId === milestone.stateId,
    );
    if (stateRec) {
      const bestUnit = stateRec.bestUnits[0];
      if (bestUnit?.drawConfidence) {
        portfolioContext = `Expected draw in Year ${bestUnit.drawConfidence.expected}`;
      }
    }

    insights.push({
      id: `deadline-${milestone.stateId}-${milestone.speciesId}`,
      signal: {
        type: urgency === "immediate" ? "critical" : "warning",
        message: `${stateLabel} ${speciesLabel} deadline in ${days} days`,
      },
      category: "deadline",
      urgency,
      interpretation,
      recommendation,
      cta,
      portfolioContext,
      expiresAt: milestone.dueDate,
    });
  }

  return insights;
}

/**
 * 2. Portfolio Insights
 *
 * Generate 1-2 insights based on portfolio health score.
 * Always includes portfolio-specific context (state count, species count, annual spend).
 * Cap at 2.
 */
function generatePortfolioInsights(
  boardState: BoardState,
  health: PortfolioHealthResult,
  metrics: StrategyMetrics,
  assessment: StrategicAssessment,
): AdvisorInsight[] {
  const insights: AdvisorInsight[] = [];

  const stateCount = boardState.statesActive;
  const speciesCount = boardState.speciesActive;
  const annualSpend = metrics.annualApplicationSpend;

  const portfolioContext = `${stateCount} state${stateCount !== 1 ? "s" : ""}, ${speciesCount} species, $${annualSpend}/yr`;

  // Find weakest health dimension
  const breakdown = health.breakdown;
  const dimensions = [
    { name: "budget alignment", score: breakdown.budget },
    { name: "hunt frequency", score: breakdown.frequency },
    { name: "low-odds exposure", score: breakdown.exposure },
    { name: "age horizon", score: breakdown.horizon },
    { name: "discipline", score: breakdown.discipline },
  ];
  const weakest = dimensions.reduce((min, d) =>
    d.score < min.score ? d : min,
  );

  if (health.score < 60) {
    insights.push({
      id: "portfolio-health-low",
      signal: {
        type: "warning",
        message: `Portfolio health: ${health.score}/100`,
      },
      category: "portfolio",
      urgency: "soon",
      interpretation: `Your portfolio health is ${health.score}/100. Weakest dimension: ${weakest.name} at ${weakest.score}/100.`,
      recommendation: getHealthRecommendation(weakest.name),
      cta: { label: "View Strategy", href: "/plan-builder" },
      portfolioContext,
    });
  } else if (health.score >= 80) {
    insights.push({
      id: "portfolio-health-strong",
      signal: {
        type: "positive",
        message: `Portfolio health: ${health.score}/100`,
      },
      category: "portfolio",
      urgency: "positive",
      interpretation: `Your portfolio is in strong shape at ${health.score}/100. All dimensions are performing well.`,
      recommendation:
        "Maintain your current course. Focus on executing upcoming deadlines.",
      cta: { label: "View Strategy", href: "/plan-builder" },
      portfolioContext,
    });
  } else {
    // 60-79: informational
    insights.push({
      id: "portfolio-health-mid",
      signal: {
        type: "positive",
        message: `Portfolio health: ${health.score}/100`,
      },
      category: "portfolio",
      urgency: "informational",
      interpretation: `Your portfolio health is ${health.score}/100. Room for improvement in ${weakest.name} (${weakest.score}/100).`,
      recommendation: getHealthRecommendation(weakest.name),
      cta: { label: "View Strategy", href: "/plan-builder" },
      portfolioContext,
    });
  }

  // Concentration risk insight
  if (metrics.portfolioConcentrationPercentage > 70) {
    const topState = assessment.stateRecommendations.reduce(
      (max, r) => (r.annualCost > max.annualCost ? r : max),
      assessment.stateRecommendations[0],
    );
    const topStateLabel =
      STATES_MAP[topState?.stateId]?.abbreviation ?? topState?.stateId ?? "unknown";

    insights.push({
      id: "portfolio-concentration",
      signal: {
        type: "warning",
        message: `${metrics.portfolioConcentrationPercentage}% of budget in ${topStateLabel}`,
      },
      category: "portfolio",
      urgency: "informational",
      interpretation: `${metrics.portfolioConcentrationPercentage}% of your annual budget is concentrated in ${topStateLabel}. A single bad draw year hits hard.`,
      recommendation:
        "Consider diversifying with a lower-cost state to spread risk across your portfolio.",
      cta: { label: "View Strategy", href: "/plan-builder" },
      portfolioContext,
    });
  }

  return insights.slice(0, 2);
}

/**
 * 3. Discipline Insights
 *
 * For each DisciplineViolation, map severity to urgency and generate
 * insights with CTAs targeting the appropriate section.
 * Cap at 2 (critical first).
 */
function generateDisciplineInsights(
  violations: DisciplineViolation[],
): AdvisorInsight[] {
  // Sort by severity: critical first
  const sorted = [...violations].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const insights: AdvisorInsight[] = [];

  for (const violation of sorted.slice(0, 2)) {
    const urgency: AdvisorUrgency =
      violation.severity === "critical"
        ? "immediate"
        : violation.severity === "warning"
          ? "soon"
          : "informational";

    const cta = getDisciplineCTA(violation.ruleId);

    const portfolioContext = violation.affectedStates?.length
      ? `Affected: ${violation.affectedStates.map((s) => STATES_MAP[s]?.abbreviation ?? s).join(", ")}`
      : undefined;

    insights.push({
      id: `discipline-${violation.ruleId}`,
      signal: {
        type:
          violation.severity === "critical"
            ? "critical"
            : violation.severity === "warning"
              ? "warning"
              : "positive",
        message: violation.observation,
      },
      category: "discipline",
      urgency,
      interpretation: violation.observation,
      recommendation: violation.recommendation,
      cta,
      portfolioContext,
    });
  }

  return insights;
}

/**
 * 4. Temporal Insights
 *
 * Only generate if user is returning (daysSinceLastVisit >= 1).
 * Summarize what changed since their last visit.
 * Cap at 1.
 */
function generateTemporalInsights(
  temporal: TemporalContext,
  milestones: Milestone[],
): AdvisorInsight[] {
  // Guard: no temporal insights for first-time or same-day visitors
  if (!temporal.isReturningUser || temporal.daysSinceLastVisit === null || temporal.daysSinceLastVisit < 1) {
    return [];
  }

  const now = temporal.currentDate;
  const lastVisit = temporal.lastVisitAt ? new Date(temporal.lastVisitAt) : null;
  if (!lastVisit) return [];

  const prefix = formatTemporalPrefix(temporal);
  if (!prefix) return [];

  // Count milestones that became urgent since last visit
  const newlyUrgent = milestones.filter((m) => {
    if (!m.dueDate) return false;
    const days = daysUntilDate(m.dueDate, now);
    if (days <= 0) return false; // already overdue, skip

    // Was green (>30d) at last visit, now amber or red (<=30d)?
    const daysFromLastVisit = daysUntilDate(m.dueDate, lastVisit);
    const wasGreen = daysFromLastVisit > 30;
    const nowUrgent = days <= 30;
    return wasGreen && nowUrgent;
  });

  // Long absence (>30 days)
  if (temporal.daysSinceLastVisit > 30) {
    const pendingCount = milestones.filter((m) => !m.completed).length;
    const completedCount = milestones.filter((m) => m.completed).length;

    return [
      {
        id: "temporal-welcome-back",
        signal: {
          type: "positive",
          message: "Welcome back",
        },
        category: "temporal",
        urgency: "informational",
        interpretation: `${prefix}, ${pendingCount} milestone${pendingCount !== 1 ? "s" : ""} are pending and ${completedCount} completed. ${newlyUrgent.length > 0 ? `${newlyUrgent.length} deadline${newlyUrgent.length !== 1 ? "s" : ""} became urgent while you were away.` : "No urgent changes."}`,
        recommendation:
          "Review your upcoming deadlines and confirm your strategy is still on track.",
        cta: { label: "View Deadlines", href: "/deadlines" },
        temporalContext: prefix,
      },
    ];
  }

  // Shorter absence with urgency changes
  if (newlyUrgent.length > 0) {
    const labels = newlyUrgent
      .slice(0, 3)
      .map((m) => {
        const st = STATES_MAP[m.stateId]?.abbreviation ?? m.stateId;
        return `${st} ${formatSpeciesName(m.speciesId)}`;
      })
      .join(", ");

    return [
      {
        id: "temporal-urgency-change",
        signal: {
          type: "warning",
          message: `${newlyUrgent.length} deadline${newlyUrgent.length !== 1 ? "s" : ""} became urgent`,
        },
        category: "temporal",
        urgency: "soon",
        interpretation: `${prefix}, ${labels} ${newlyUrgent.length === 1 ? "has" : "have"} moved into the 30-day window.`,
        recommendation:
          "Check these deadlines now to ensure you don't miss any application windows.",
        cta: { label: "View Deadlines", href: "/deadlines" },
        temporalContext: prefix,
      },
    ];
  }

  // No significant changes -- don't generate noise
  return [];
}

/**
 * 5. Milestone Insights
 *
 * Generate insights about milestone completion progress.
 * Cap at 1.
 */
function generateMilestoneInsights(
  milestones: Milestone[],
): AdvisorInsight[] {
  if (milestones.length === 0) return [];

  const currentYear = new Date().getFullYear();
  const thisYearMilestones = milestones.filter((m) => m.year === currentYear);

  if (thisYearMilestones.length === 0) return [];

  const completed = thisYearMilestones.filter((m) => m.completed);
  const pending = thisYearMilestones.filter((m) => !m.completed);

  // All milestones complete for current year
  if (pending.length === 0 && completed.length > 0) {
    return [
      {
        id: "milestone-all-complete",
        signal: {
          type: "positive",
          message: `All ${currentYear} milestones complete`,
        },
        category: "milestone",
        urgency: "positive",
        interpretation: `You've completed all ${completed.length} milestone${completed.length !== 1 ? "s" : ""} for ${currentYear}. Your plan is fully executed for this year.`,
        recommendation:
          "Start reviewing next year's milestones and plan ahead for upcoming seasons.",
        cta: { label: "View Timeline", href: "/plan-builder" },
      },
    ];
  }

  // Pending milestones exist
  if (pending.length > 0) {
    const nextPending = pending
      .filter((m) => m.dueDate)
      .sort((a, b) => daysUntilDate(a.dueDate!, new Date()) - daysUntilDate(b.dueDate!, new Date()))[0];

    const nextLabel = nextPending
      ? `Next: ${STATES_MAP[nextPending.stateId]?.abbreviation ?? nextPending.stateId} ${formatSpeciesName(nextPending.speciesId)}`
      : "";

    return [
      {
        id: "milestone-progress",
        signal: {
          type: "positive",
          message: `${completed.length}/${thisYearMilestones.length} milestones complete`,
        },
        category: "milestone",
        urgency: "informational",
        interpretation: `${completed.length} of ${thisYearMilestones.length} ${currentYear} milestones complete, ${pending.length} pending. ${nextLabel}`,
        recommendation:
          "Stay on track by completing your next pending milestone before its deadline.",
        cta: { label: "View Timeline", href: "/plan-builder" },
      },
    ];
  }

  return [];
}

// ============================================================================
// Main Pipeline
// ============================================================================

/**
 * Generate prioritized advisor insights from all engine outputs.
 *
 * Calls 5 sub-generators + point creep insights, flattens, sorts by
 * urgency priority, and caps at MAX_VISIBLE_INSIGHTS (7).
 */
export function generateAdvisorInsights(
  boardState: BoardState,
  health: PortfolioHealthResult,
  metrics: StrategyMetrics,
  violations: DisciplineViolation[],
  milestones: Milestone[],
  userPoints: UserPoints[],
  temporal: TemporalContext,
  assessment: StrategicAssessment,
  savingsGoals: SavingsGoal[] = [],
  userGoals: UserGoal[] = [],
  suppressTemporal: boolean = false,
): AdvisorInsight[] {
  // Call all sub-generators
  const deadlineInsights = generateDeadlineInsights(milestones, assessment);
  const portfolioInsights = generatePortfolioInsights(
    boardState,
    health,
    metrics,
    assessment,
  );
  const disciplineInsights = generateDisciplineInsights(violations);
  const temporalInsights = suppressTemporal ? [] : generateTemporalInsights(temporal, milestones);
  const milestoneInsights = generateMilestoneInsights(milestones);
  const creepInsights = generatePointCreepInsights(assessment, userPoints);
  const savingsInsights = generateSavingsInsights(savingsGoals, userGoals, milestones);
  const scoutingOpps = detectScoutingOpportunities(assessment);
  const scoutingInsights = generateScoutingInsights(assessment, scoutingOpps);

  // Flatten all insights
  const all: AdvisorInsight[] = [
    ...deadlineInsights,
    ...portfolioInsights,
    ...disciplineInsights,
    ...temporalInsights,
    ...milestoneInsights,
    ...creepInsights,
    ...savingsInsights,
    ...scoutingInsights,
  ];

  // Sort by urgency priority (immediate > soon > informational > positive)
  all.sort((a, b) => URGENCY_PRIORITY[a.urgency] - URGENCY_PRIORITY[b.urgency]);

  // Cap at MAX_VISIBLE_INSIGHTS
  return all.slice(0, MAX_VISIBLE_INSIGHTS);
}

// ============================================================================
// Helpers
// ============================================================================

/** Get a health-dimension-specific recommendation */
function getHealthRecommendation(dimension: string): string {
  switch (dimension) {
    case "budget alignment":
      return "Rebalance your state allocations to spread budget more evenly across your portfolio.";
    case "hunt frequency":
      return "Add an opportunity hunt in a build year to maintain motivation and field time.";
    case "low-odds exposure":
      return "Reduce allocation to sub-5% draw odds. Add OTC or high-odds states to balance risk.";
    case "age horizon":
      return "Review your burn year timing to align with your physical peak for target species.";
    case "discipline":
      return "Address the discipline violations in your portfolio to improve overall health.";
    default:
      return "Review your portfolio strategy and consider adjustments.";
  }
}

/** Get CTA for a discipline rule */
function getDisciplineCTA(
  ruleId: DisciplineRuleId,
): { label: string; href: string } {
  switch (ruleId) {
    case "budget_concentration":
    case "premium_overload":
      return { label: "Review Allocation", href: "/plan-builder" };
    case "build_fatigue":
    case "cadence_below_target":
      return { label: "Add Opportunity Hunt", href: "/plan-builder" };
    case "plateau_detected":
    case "point_abandonment":
      return { label: "Review Points", href: "/points" };
    case "strategic_drift":
      return { label: "Update Strategy", href: "/plan-builder" };
    default:
      return { label: "View Strategy", href: "/plan-builder" };
  }
}
