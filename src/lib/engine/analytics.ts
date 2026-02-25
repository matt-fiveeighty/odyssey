/**
 * Analytics Event System — PostHog-Ready Stubs
 *
 * All analytics events are defined here as typed stubs.
 * In production, wire `trackEvent()` to PostHog or LogRocket.
 * During beta, events are logged to console + stored locally
 * for debugging.
 *
 * Event taxonomy:
 *   - User actions: what the user explicitly did
 *   - System events: cascades, calculations, alerts
 *   - Timing: session duration, time-to-action
 */

// ============================================================================
// Event Definitions — Typed event name → payload map
// ============================================================================

export interface AnalyticsEventMap {
  // ── Fiduciary Engine Events ──
  /** Budget change triggered cascading prune */
  budget_overflow_triggered: {
    old_budget: number;
    new_budget: number;
    positions_pruned: number;
    total_saved: number;
  };

  /** User accepted a cascading prune recommendation */
  cascading_prune_accepted: {
    positions_pruned: number;
    total_saved: number;
    states_affected: string[];
  };

  /** User dismissed/ignored a dead asset warning */
  dead_asset_warning_ignored: {
    state_id: string;
    species_id: string;
    current_points: number;
    pcv: number;
  };

  /** Draw outcome recorded (4-part cascade triggered) */
  draw_outcome_recorded: {
    outcome: "drew" | "didnt_draw";
    state_id: string;
    species_id: string;
    points_at_draw: number;
    cascade_alerts_generated: number;
  };

  /** Missed deadline detected */
  missed_deadline_detected: {
    state_id: string;
    species_id: string;
    days_late: number;
    points_at_risk: number;
  };

  /** Success disaster detected (multiple draws exceed budget) */
  success_disaster_detected: {
    year: number;
    tags_drawn: number;
    total_cost: number;
    budget: number;
    over_by: number;
  };

  /** Profile anchor variable changed */
  profile_anchor_changed: {
    field: string;
    old_value: unknown;
    new_value: unknown;
    cascade_alerts_generated: number;
  };

  // ── Data Airlock Events ──
  /** Staging snapshot evaluated */
  airlock_snapshot_evaluated: {
    state_id: string;
    verdict: "pass" | "warn" | "block";
    block_count: number;
    warn_count: number;
    auto_promoted: boolean;
  };

  /** Staging snapshot manually promoted after review */
  airlock_snapshot_promoted: {
    state_id: string;
    block_count_overridden: number;
  };

  // ── Bug Report Events ──
  /** Bug report submitted */
  bug_report_submitted: {
    report_id: string;
    page_url: string;
  };

  // ── Navigation & Session Events ──
  /** User visited a page */
  page_viewed: {
    page: string;
    time_since_last_visit_hours?: number;
  };

  /** Plan builder completed */
  plan_generated: {
    states_count: number;
    species_count: number;
    planning_horizon: number;
    express_mode: boolean;
  };

  /** Plan confirmed and saved */
  plan_confirmed: {
    plan_id: string;
    states: string[];
    estimated_annual_cost: number;
  };

  /** Consultation step completed */
  wizard_step_completed: {
    step: number;
    time_on_step_ms: number;
  };

  // ── Savings & Budget Events ──
  /** Savings contribution made */
  savings_contribution_added: {
    goal_id: string;
    amount: number;
    progress_pct: number;
  };

  /** Budget changed */
  budget_changed: {
    field: "point_year" | "hunt_year";
    old_value: number;
    new_value: number;
  };

  // ── Engagement Events ──
  /** User dismissed a fiduciary alert */
  fiduciary_alert_dismissed: {
    alert_id: string;
    alert_type: string;
    severity: string;
  };

  /** User clicked an advisor CTA */
  advisor_cta_clicked: {
    insight_id: string;
    cta_label: string;
    cta_href: string;
  };

  /** User viewed diff/change report */
  diff_viewed: {
    diff_count: number;
    categories: string[];
  };
}

// ============================================================================
// Event Type Helpers
// ============================================================================

export type AnalyticsEventName = keyof AnalyticsEventMap;

// ============================================================================
// Track Function — The single call site
// ============================================================================

/**
 * Track an analytics event. During beta, logs to console.
 * In production, replace the body with PostHog/LogRocket calls.
 *
 * Usage:
 *   trackEvent("budget_overflow_triggered", {
 *     old_budget: 5000,
 *     new_budget: 3000,
 *     positions_pruned: 2,
 *     total_saved: 800,
 *   });
 */
export function trackEvent<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventMap[E],
): void {
  // ── PostHog integration point ──
  // if (typeof window !== "undefined" && window.posthog) {
  //   window.posthog.capture(event, properties);
  // }

  // ── LogRocket integration point ──
  // if (typeof window !== "undefined" && window.LogRocket) {
  //   window.LogRocket.track(event, properties as Record<string, unknown>);
  // }

  // ── Beta: console + local storage ──
  if (process.env.NODE_ENV === "development") {
    console.log(`[Analytics] ${event}`, properties);
  }

  // Store in local buffer for bug reports
  storeEventLocally(event, properties);
}

// ============================================================================
// Local Event Buffer — For bug reports + offline sync
// ============================================================================

const EVENT_BUFFER_KEY = "hunt-planner-analytics-buffer";
const MAX_BUFFER_SIZE = 100;

interface BufferedEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

function storeEventLocally(event: string, properties: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(EVENT_BUFFER_KEY);
    const buffer: BufferedEvent[] = raw ? JSON.parse(raw) : [];

    buffer.push({
      event,
      properties,
      timestamp: new Date().toISOString(),
    });

    // Keep only last N events
    const trimmed = buffer.slice(-MAX_BUFFER_SIZE);
    localStorage.setItem(EVENT_BUFFER_KEY, JSON.stringify(trimmed));
  } catch {
    // Silent fail — analytics should never break the app
  }
}

/**
 * Get the local event buffer for inclusion in bug reports.
 */
export function getEventBuffer(): BufferedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENT_BUFFER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear the local event buffer (after successful sync).
 */
export function clearEventBuffer(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(EVENT_BUFFER_KEY);
  } catch {
    // Silent fail
  }
}

// ============================================================================
// Identify — Set user properties for segmentation
// ============================================================================

/**
 * Identify the current user for analytics.
 * Call this after authentication or on first wizard completion.
 */
export function identifyUser(
  userId: string,
  traits?: {
    homeState?: string;
    experienceLevel?: string;
    planningHorizon?: number;
    activeStates?: string[];
    subscriptionTier?: string;
  },
): void {
  // ── PostHog integration point ──
  // if (typeof window !== "undefined" && window.posthog) {
  //   window.posthog.identify(userId, traits);
  // }

  if (process.env.NODE_ENV === "development") {
    console.log(`[Analytics] identify:`, userId, traits);
  }
}
