// ============================================================================
// Advisor Temporal Context Engine (Phase 5)
// Pure functions -- no React, no store, no side effects.
// ============================================================================

/** Context about the user's visit pattern */
export interface TemporalContext {
  lastVisitAt: string | null;          // ISO date of previous visit
  daysSinceLastVisit: number | null;   // null = first visit
  currentDate: Date;
  isReturningUser: boolean;
}

/**
 * Build temporal context from a lastVisitAt ISO string.
 * Pure function -- pass `now` for deterministic testing.
 */
export function buildTemporalContext(
  lastVisitAt: string | null,
  now?: Date,
): TemporalContext {
  const currentDate = now ?? new Date();
  if (!lastVisitAt) {
    return { lastVisitAt: null, daysSinceLastVisit: null, currentDate, isReturningUser: false };
  }
  const lastDate = new Date(lastVisitAt);
  const diffMs = currentDate.getTime() - lastDate.getTime();
  const daysSinceLastVisit = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return {
    lastVisitAt,
    daysSinceLastVisit,
    currentDate,
    isReturningUser: daysSinceLastVisit >= 1,
  };
}

/**
 * Format a human-readable temporal prefix for advisor commentary.
 * Returns null if the user is not a returning user (first visit or same day).
 */
export function formatTemporalPrefix(temporal: TemporalContext): string | null {
  if (!temporal.isReturningUser || temporal.daysSinceLastVisit === null) return null;
  const days = temporal.daysSinceLastVisit;
  if (days === 1) return "Since yesterday";
  if (days < 7) return `Since your last visit (${days} days ago)`;
  if (days < 30) return `Since your last visit (${Math.floor(days / 7)} weeks ago)`;
  return `Since your last visit (${Math.floor(days / 30)} months ago)`;
}
