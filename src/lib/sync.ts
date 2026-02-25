/**
 * Cloud Persistence Sync Manager
 *
 * Handles debounced sync to Supabase and full hydration on login.
 * Replaces the old inline `syncPointsToDb()` with a unified bulk sync.
 *
 * Architecture:
 * - Local Zustand store is ALWAYS the source of truth (offline-first)
 * - Supabase is an async backup that enables cross-device access
 * - All writes are debounced (800ms) and fire-and-forget
 * - All reads happen once on login via hydrateFromDb()
 */

// We import the stores lazily to avoid circular dependency issues.
// The stores import from sync.ts, so sync.ts cannot import from store.ts at module level.
// Instead, we accept store getters as parameters or import dynamically.

type SyncStatus = "idle" | "syncing" | "error" | "success";

let _syncStatus: SyncStatus = "idle";
let _syncTimeout: ReturnType<typeof setTimeout> | null = null;
let _lastSyncAt: string | null = null;

const SYNC_DEBOUNCE_MS = 800;

// ============================================================================
// Public API
// ============================================================================

/**
 * Get current sync status for UI indicators.
 */
export function getSyncStatus(): SyncStatus {
  return _syncStatus;
}

/**
 * Get the last successful sync timestamp.
 */
export function getLastSyncAt(): string | null {
  return _lastSyncAt;
}

/**
 * Debounced sync of all store data to Supabase.
 * Call this after every mutating store action.
 * Safe to call rapidly — only fires after 800ms of quiet.
 */
export function syncAllToDb(): void {
  if (_syncTimeout) clearTimeout(_syncTimeout);
  _syncTimeout = setTimeout(() => {
    void _executeSyncToDb();
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Hydrate all stores from Supabase on login.
 * Returns true if hydration succeeded, false if skipped/failed.
 *
 * Merge strategy:
 * - If local store section is empty → use DB data
 * - If both exist → compare updatedAt timestamps, use newer
 * - Points always merge from DB (DB is authoritative for points after hydration)
 */
export async function hydrateFromDb(): Promise<boolean> {
  try {
    const res = await fetch("/api/user/sync");
    if (!res.ok) return false;

    const data = await res.json();
    if (!data) return false;

    // Dynamic imports to avoid circular dependencies
    const { useAppStore, useWizardStore, useRoadmapStore } = await import(
      "@/lib/store"
    );

    const appState = useAppStore.getState();
    const wizardState = useWizardStore.getState();

    // ── Plans ────────────────────────────────────────────────────────────
    if (Array.isArray(data.plans) && data.plans.length > 0) {
      const localEmpty = appState.savedPlans.length === 0;
      if (localEmpty) {
        // DB has plans, local doesn't → use DB
        useAppStore.setState({
          savedPlans: data.plans,
          activePlanId: data.activePlanId ?? data.plans[0]?.id ?? null,
          confirmedAssessment: data.plans.find(
            (p: { id: string }) => p.id === (data.activePlanId ?? data.plans[0]?.id)
          )?.assessment ?? null,
        });
        // Sync to RoadmapStore
        const activePlan = data.plans.find(
          (p: { id: string }) => p.id === (data.activePlanId ?? data.plans[0]?.id)
        );
        if (activePlan?.assessment) {
          useRoadmapStore.getState().setActiveAssessment(activePlan.assessment);
        }
      } else {
        // Both have data — use whichever set has a more recent updatedAt
        const dbNewest = Math.max(
          ...data.plans.map((p: { updatedAt: string }) =>
            new Date(p.updatedAt).getTime()
          )
        );
        const localNewest = Math.max(
          ...appState.savedPlans.map((p) => new Date(p.updatedAt).getTime())
        );
        if (dbNewest > localNewest) {
          useAppStore.setState({
            savedPlans: data.plans,
            activePlanId: data.activePlanId ?? data.plans[0]?.id ?? null,
            confirmedAssessment: data.plans.find(
              (p: { id: string }) => p.id === (data.activePlanId ?? data.plans[0]?.id)
            )?.assessment ?? null,
          });
          const activePlan = data.plans.find(
            (p: { id: string }) => p.id === (data.activePlanId ?? data.plans[0]?.id)
          );
          if (activePlan?.assessment) {
            useRoadmapStore.getState().setActiveAssessment(activePlan.assessment);
          }
        }
        // else: local is newer, keep local (will sync to DB on next mutation)
      }
    }

    // ── Goals ────────────────────────────────────────────────────────────
    if (Array.isArray(data.goals) && data.goals.length > 0) {
      const localEmpty = appState.userGoals.length === 0;
      if (localEmpty) {
        useAppStore.setState({ userGoals: data.goals });
        // Extract milestones from goals
        const allMilestones = data.goals.flatMap(
          (g: { milestones?: unknown[] }) => g.milestones ?? []
        );
        if (allMilestones.length > 0) {
          useAppStore.setState({ milestones: allMilestones });
        }
      }
      // If local has goals, keep local (simpler merge — no per-goal timestamp yet)
    }

    // ── Savings Goals ───────────────────────────────────────────────────
    if (Array.isArray(data.savings) && data.savings.length > 0) {
      const localEmpty = appState.savingsGoals.length === 0;
      if (localEmpty) {
        useAppStore.setState({ savingsGoals: data.savings });
      }
    }

    // ── Alerts ──────────────────────────────────────────────────────────
    if (Array.isArray(data.alerts) && data.alerts.length > 0) {
      // Alerts: merge (add any DB alerts not already in local)
      const localIds = new Set(appState.fiduciaryAlerts.map((a) => a.id));
      const newAlerts = data.alerts.filter(
        (a: { id: string }) => !localIds.has(a.id)
      );
      if (newAlerts.length > 0) {
        useAppStore.setState({
          fiduciaryAlerts: [...appState.fiduciaryAlerts, ...newAlerts],
        });
      }
    }

    // ── Points ──────────────────────────────────────────────────────────
    if (Array.isArray(data.points) && data.points.length > 0) {
      // Points: DB is authoritative after hydration (it's the only section
      // that was previously syncing). Always take DB if it has data.
      useAppStore.setState({ userPoints: data.points });
    }

    // ── Wizard State ────────────────────────────────────────────────────
    if (data.wizardState && typeof data.wizardState === "object") {
      // Only restore wizard if local wizard is at step 1 (untouched)
      if (wizardState.step === 1 && !wizardState.confirmedPlan) {
        // Restore wizard state from DB (user had an incomplete session)
        const restored = data.wizardState;
        if (restored.step && restored.step > 1) {
          useWizardStore.setState(restored);
        }
      }
    }

    return true;
  } catch (err) {
    console.error("[sync/hydrate]", err);
    return false;
  }
}

// ============================================================================
// Internal
// ============================================================================

async function _executeSyncToDb(): Promise<void> {
  _syncStatus = "syncing";

  try {
    // Dynamic import to avoid circular dep
    const { useAppStore, useWizardStore } = await import("@/lib/store");
    const app = useAppStore.getState();
    const wizard = useWizardStore.getState();

    // Build sync payload
    const payload: Record<string, unknown> = {
      plans: app.savedPlans,
      activePlanId: app.activePlanId,
      goals: app.userGoals,
      savings: app.savingsGoals,
      alerts: app.fiduciaryAlerts,
      points: app.userPoints,
    };

    // Only include wizard state if user has progressed past step 1
    if (wizard.step > 1 || wizard.confirmedPlan) {
      // Strip action functions — only serialize data fields
      const { /* eslint-disable @typescript-eslint/no-unused-vars */
        setStep: _1, setField: _2, setExistingPoints: _3, toggleArrayField: _4,
        addDreamHunt: _5, removeDreamHunt: _6, confirmPlan: _7, prefillFromGoals: _8,
        reset: _9, setPreviewScores: _10, confirmStateSelection: _11,
        setFineTuneAnswer: _12, setGenerationPhase: _13, setGenerationProgress: _14,
        setExpressMode: _15, setAnchorField: _16,
        /* eslint-enable @typescript-eslint/no-unused-vars */
        ...wizardData
      } = wizard;
      payload.wizardState = wizardData;
    }

    const res = await fetch("/api/user/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      _syncStatus = "success";
      _lastSyncAt = new Date().toISOString();
    } else {
      _syncStatus = "error";
    }
  } catch {
    // Silent fail — local store is still authoritative
    _syncStatus = "error";
  }

  // Reset to idle after a moment (so UI can flash the status)
  setTimeout(() => {
    _syncStatus = "idle";
  }, 2000);
}
