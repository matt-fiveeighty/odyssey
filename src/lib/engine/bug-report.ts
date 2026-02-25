/**
 * Beta Bug Report — "Report Logic Break" System
 *
 * When a beta tester sees a calculation that looks wrong, they click
 * the "Report Logic Break" button. The system captures:
 *   - A unique report ID
 *   - Timestamp
 *   - User comment (free text)
 *   - Full system state snapshot (roadmap, milestones, alerts, etc.)
 *   - Active fiduciary alerts at the time of report
 *   - Engine versions for reproducibility
 *
 * The report is POSTed to a webhook endpoint (configurable).
 * In production, this becomes a Supabase insert or Discord webhook.
 */

import { useAppStore, useWizardStore, useRoadmapStore } from "@/lib/store";

// ============================================================================
// Bug Report Schema
// ============================================================================

export interface BugReport {
  report_id: string;
  timestamp: string;                   // ISO 8601
  user_id: string;                     // Anonymous ID or auth user ID
  user_comment: string;                // Free text from the user

  system_state: {
    page_url: string;                  // Which page the user was on
    active_plan_id: string | null;
    roadmap_years: number;             // Length of roadmap
    milestones_total: number;
    milestones_completed: number;
    points_entries: number;
    goals_count: number;
    wizard_step: number;
    planning_horizon: number;
    hunt_year_budget: number;
    point_year_budget: number;
    active_states: string[];           // States in play
    active_species: string[];          // Species in play
  };

  active_alerts: {
    fiduciary_alerts: number;
    schedule_conflicts: number;
    discipline_violations: number;
    cascade_result_present: boolean;
  };

  engine_versions: {
    app_version: string;               // From package.json or env
    data_version: string;              // From states.ts dataVersion
    wizard_persist_key: string;
    app_persist_key: string;
    roadmap_persist_key: string;
  };

  // Optional: screenshot or DOM snapshot
  screenshot_data_url?: string;
}

// ============================================================================
// Report Builder — Captures current system state
// ============================================================================

/**
 * Build a complete bug report from the current application state.
 * Call this when the user clicks "Report Logic Break".
 */
export function buildBugReport(
  userComment: string,
  pageUrl: string,
  userId: string = "anonymous",
): BugReport {
  const appState = useAppStore.getState();
  const wizardState = useWizardStore.getState();
  const roadmapState = useRoadmapStore.getState();

  const assessment = roadmapState.activeAssessment;
  const roadmap = assessment?.roadmap ?? [];

  // Extract active states and species from roadmap
  const stateSet = new Set<string>();
  const speciesSet = new Set<string>();
  for (const yr of roadmap) {
    for (const action of yr.actions) {
      stateSet.add(action.stateId);
      speciesSet.add(action.speciesId);
    }
  }

  return {
    report_id: `bug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    user_id: userId,
    user_comment: userComment,

    system_state: {
      page_url: pageUrl,
      active_plan_id: appState.activePlanId,
      roadmap_years: roadmap.length,
      milestones_total: appState.milestones.length,
      milestones_completed: appState.milestones.filter((m) => m.completed).length,
      points_entries: appState.userPoints.length,
      goals_count: appState.userGoals.length,
      wizard_step: wizardState.step,
      planning_horizon: wizardState.planningHorizon,
      hunt_year_budget: wizardState.huntYearBudget,
      point_year_budget: wizardState.pointYearBudget,
      active_states: [...stateSet],
      active_species: [...speciesSet],
    },

    active_alerts: {
      fiduciary_alerts: appState.fiduciaryAlerts.length,
      schedule_conflicts: appState.scheduleConflicts.length,
      discipline_violations: roadmapState.disciplineViolations.length,
      cascade_result_present: appState.lastCascadeResult !== null,
    },

    engine_versions: {
      app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0-beta",
      data_version: "2026.1",
      wizard_persist_key: "hunt-planner-wizard-v6",
      app_persist_key: "hunt-planner-app-v2",
      roadmap_persist_key: "hunt-planner-roadmap-v1",
    },
  };
}

// ============================================================================
// Webhook Sender
// ============================================================================

const WEBHOOK_URL = process.env.NEXT_PUBLIC_BUG_REPORT_WEBHOOK ?? "/api/bug-report";

/**
 * Submit a bug report to the configured webhook endpoint.
 * Returns true on success, false on failure (non-blocking).
 */
export async function submitBugReport(report: BugReport): Promise<boolean> {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
    return response.ok;
  } catch {
    console.error("[BugReport] Failed to submit report:", report.report_id);
    return false;
  }
}

// ============================================================================
// API Route Handler (for local dev / Supabase relay)
// ============================================================================

/**
 * Validate an incoming bug report payload.
 * Use this in your API route handler.
 */
export function validateBugReport(payload: unknown): payload is BugReport {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.report_id === "string" &&
    typeof p.timestamp === "string" &&
    typeof p.user_comment === "string" &&
    typeof p.system_state === "object" &&
    typeof p.active_alerts === "object" &&
    typeof p.engine_versions === "object"
  );
}
