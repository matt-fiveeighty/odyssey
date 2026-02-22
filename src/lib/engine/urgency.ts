// ============================================================================
// Shared Urgency Calculation
// ============================================================================
// Canonical thresholds per CAL-06:
//   red    = <=14 days
//   amber  = <=30 days
//   green  = >30 days
//   overdue = past due
//   none   = no date provided
//
// Replaces duplicated logic in:
//   - src/app/(app)/deadlines/page.tsx (urgencyClass/urgencyBorder)
//   - src/components/goals/MilestoneCalendar.tsx (isUrgent)
//   - src/components/results/sections/YearOneActionPlan.tsx (isUrgent)
// ============================================================================

export type UrgencyLevel = "red" | "amber" | "green" | "none" | "overdue";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Returns the number of days until the given date. Negative values mean overdue.
 * Ceiling is used so a deadline later today still shows as 1 day away (not 0).
 */
export function daysUntilDate(dueDateStr: string, now?: Date): number {
  const due = new Date(dueDateStr);
  const today = now ?? new Date();
  return Math.ceil((due.getTime() - today.getTime()) / MS_PER_DAY);
}

/**
 * Returns the urgency level for a given due date.
 *
 * @param dueDateStr - ISO date string (e.g. "2026-04-07") or undefined
 * @param now        - Optional override for "today" (used for deterministic testing)
 */
export function getUrgencyLevel(
  dueDateStr: string | undefined,
  now?: Date,
): UrgencyLevel {
  if (!dueDateStr) return "none";

  const days = daysUntilDate(dueDateStr, now);

  if (days <= 0) return "overdue";
  if (days <= 14) return "red";
  if (days <= 30) return "amber";
  return "green";
}

/**
 * Returns Tailwind utility classes for each urgency level.
 * Uses the app's oklch-based color tokens (chart-2 for green, destructive for overdue).
 */
export function urgencyColorClass(level: UrgencyLevel): string {
  switch (level) {
    case "red":
      return "text-red-400 border-red-500/30 bg-red-500/10";
    case "amber":
      return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    case "green":
      return "text-chart-2 border-chart-2/30 bg-chart-2/10";
    case "overdue":
      return "text-destructive border-destructive/30 bg-destructive/10";
    case "none":
      return "text-muted-foreground border-border/50 bg-transparent";
  }
}
