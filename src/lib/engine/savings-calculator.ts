// ============================================================================
// Savings Calculator Engine -- Pure Functions
// ============================================================================
//
// All savings math lives here. No React, no store access, no side effects.
// This is the arithmetic brain that UI components and advisor consume.

import type { SavingsStatus, UserGoal, Milestone } from "@/lib/types";

/** Average days per month for ms -> months conversion */
const DAYS_PER_MONTH = 30.44;
const MS_PER_MONTH = 1000 * 60 * 60 * 24 * DAYS_PER_MONTH;

// ============================================================================
// AnnualSpendForecast type (exported alongside the function)
// ============================================================================

export interface AnnualSpendForecast {
  year: number;
  items: {
    goalTitle: string;
    stateId: string;
    speciesId: string;
    cost: number;
  }[];
  totalCost: number;
}

// ============================================================================
// calculateMonthlySavingsTarget
// ============================================================================

/**
 * Monthly savings target = remaining cost / months remaining.
 * Uses Math.max(1, monthsRemaining) to prevent division by zero.
 * Returns 0 when already fully funded.
 */
export function calculateMonthlySavingsTarget(
  targetCost: number,
  targetDate: Date,
  currentSaved: number,
  now: Date = new Date(),
): number {
  const remaining = targetCost - currentSaved;
  if (remaining <= 0) return 0;

  const msRemaining = targetDate.getTime() - now.getTime();
  const monthsRemaining = Math.max(1, msRemaining / MS_PER_MONTH);
  return remaining / monthsRemaining;
}

// ============================================================================
// calculateFundedDate
// ============================================================================

/**
 * Projected funded date at current contribution rate.
 * Returns null if monthlySavings <= 0 (will never be funded).
 * Returns now if already funded.
 */
export function calculateFundedDate(
  targetCost: number,
  currentSaved: number,
  monthlySavings: number,
  now: Date = new Date(),
): Date | null {
  const remaining = targetCost - currentSaved;
  if (remaining <= 0) return new Date(now);
  if (monthlySavings <= 0) return null;

  const monthsNeeded = Math.ceil(remaining / monthlySavings);
  const funded = new Date(now);
  funded.setMonth(funded.getMonth() + monthsNeeded);
  return funded;
}

// ============================================================================
// calculateSavingsStatus
// ============================================================================

/**
 * Traffic light status based on funded date vs target date.
 * Green: funded date <= target date (on track or ahead)
 * Amber: funded date is 1-3 months after target date
 * Red: funded date is >3 months after target date OR monthlySavings = 0
 * Always green when currentSaved >= targetCost.
 */
export function calculateSavingsStatus(
  targetCost: number,
  currentSaved: number,
  monthlySavings: number,
  targetDate: Date,
  now: Date = new Date(),
): SavingsStatus {
  if (currentSaved >= targetCost) return "green";

  const fundedDate = calculateFundedDate(
    targetCost,
    currentSaved,
    monthlySavings,
    now,
  );
  if (!fundedDate) return "red";

  const diffMs = fundedDate.getTime() - targetDate.getTime();
  const diffMonths = diffMs / MS_PER_MONTH;

  if (diffMonths <= 0) return "green";
  if (diffMonths <= 3) return "amber";
  return "red";
}

// ============================================================================
// calculateCatchUpDelta
// ============================================================================

/**
 * Extra monthly amount needed to get back on track.
 * Returns max(0, neededTarget - currentMonthlySavings).
 */
export function calculateCatchUpDelta(
  targetCost: number,
  currentSaved: number,
  currentMonthlySavings: number,
  targetDate: Date,
  now: Date = new Date(),
): number {
  const neededTarget = calculateMonthlySavingsTarget(
    targetCost,
    targetDate,
    currentSaved,
    now,
  );
  return Math.max(0, neededTarget - currentMonthlySavings);
}

// ============================================================================
// deriveTargetCost
// ============================================================================

/**
 * Sum totalCost of milestones where planId === goalId.
 * Returns 0 when no milestones match.
 */
export function deriveTargetCost(
  milestones: Milestone[],
  goalId: string,
): number {
  return milestones
    .filter((m) => m.planId === goalId)
    .reduce((sum, m) => sum + m.totalCost, 0);
}

// ============================================================================
// calculateAnnualSpendForecast
// ============================================================================

/**
 * Groups incomplete milestones by year for the next N years.
 * Returns { year, items[], totalCost } for each year.
 */
export function calculateAnnualSpendForecast(
  userGoals: UserGoal[],
  milestones: Milestone[],
  yearsAhead: number = 5,
): AnnualSpendForecast[] {
  const currentYear = new Date().getFullYear();
  const forecasts: AnnualSpendForecast[] = [];

  for (let i = 0; i < yearsAhead; i++) {
    const year = currentYear + i;
    const yearMs = milestones.filter((m) => m.year === year && !m.completed);
    const items = yearMs.map((m) => {
      const goal = userGoals.find((g) => g.id === m.planId);
      return {
        goalTitle: goal?.title ?? m.title,
        stateId: m.stateId,
        speciesId: m.speciesId,
        cost: m.totalCost,
      };
    });
    forecasts.push({
      year,
      items,
      totalCost: items.reduce((s, it) => s + it.cost, 0),
    });
  }

  return forecasts;
}
