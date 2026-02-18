import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HuntStyle, UserPoints, UserGoal, Milestone, DreamHunt, StrategicAssessment, StateScoreBreakdown } from "@/lib/types";
import { generateMilestonesForGoal } from "@/lib/engine/roadmap-generator";

// ============================================================================
// Strategic Consultation Wizard Store v4
// Models a deep consultation — 10 conversational steps, adaptive feedback,
// intermediate state previews, and fine-tune follow-ups
// ============================================================================

export type PhysicalComfort = "sea_level" | "moderate_elevation" | "high_alpine" | "any";
export type HuntFrequency = "every_year" | "every_other" | "every_3" | "when_opportunity";
export type TravelWillingness = "drive_only" | "short_flight" | "will_fly_anywhere";
export type ExperienceLevel = "never_hunted_west" | "1_2_trips" | "3_5_trips" | "veteran";
export type TrophyVsMeat = "trophy_focused" | "lean_trophy" | "balanced" | "lean_meat" | "meat_focused";
export type TimeAvailable = "weekend_warrior" | "full_week" | "10_plus_days" | "flexible";
export type HuntingMotivation = "challenge" | "connection" | "tradition" | "escape" | "meat_provider";
export type UncertaintyComfort = "love_it" | "tolerate" | "prefer_certainty";

interface ConsultationState {
  step: number;

  // Step 1: Tell me about yourself
  homeState: string;
  homeCity: string;
  experienceLevel: ExperienceLevel | null;
  physicalComfort: PhysicalComfort | null;
  hasHuntedStates: string[];

  // Step 2: What's calling you?
  species: string[];
  huntingMotivation: HuntingMotivation | null;

  // Step 3: Paint the picture
  trophyVsMeat: TrophyVsMeat | null;
  comfortWithUncertainty: UncertaintyComfort | null;
  bucketListDescription: string;
  dreamHunts: DreamHunt[];

  // Step 4: Let's talk investment
  pointYearBudget: number;
  huntYearBudget: number;

  // Step 5: Your hunting DNA
  huntStylePrimary: HuntStyle | null;
  openToGuided: boolean;
  guidedForSpecies: string[];
  preferredTerrain: string[];
  importantFactors: string[];

  // Step 6: Travel reality
  huntFrequency: HuntFrequency | null;
  timeAvailable: TimeAvailable | null;
  travelWillingness: TravelWillingness | null;

  // Step 7: Point portfolio
  hasExistingPoints: boolean;
  existingPoints: Record<string, Record<string, number>>;

  // Step 8: Help me choose states (intermediate preview)
  previewScores: StateScoreBreakdown[];
  selectedStatesConfirmed: string[];

  // Step 9: Fine-tune
  fineTuneAnswers: Record<string, string>;

  // Generation tracking
  generationPhase: string;
  generationProgress: number;

  // Legacy/derived
  physicalLimitations: string;
  recommendedStates: string[];
  planName: string;
  confirmedPlan: StrategicAssessment | null;

  // Actions
  setStep: (step: number) => void;
  setField: <K extends keyof ConsultationState>(key: K, value: ConsultationState[K]) => void;
  setExistingPoints: (stateId: string, speciesId: string, pts: number) => void;
  toggleArrayField: <K extends keyof ConsultationState>(key: K, value: string) => void;
  addDreamHunt: (hunt: DreamHunt) => void;
  removeDreamHunt: (id: string) => void;
  setPreviewScores: (scores: StateScoreBreakdown[]) => void;
  confirmStateSelection: (stateIds: string[]) => void;
  setFineTuneAnswer: (questionId: string, answer: string) => void;
  setGenerationPhase: (phase: string) => void;
  setGenerationProgress: (pct: number) => void;
  confirmPlan: (assessment: StrategicAssessment) => void;
  prefillFromGoals: (goals: import("@/lib/types").UserGoal[]) => void;
  reset: () => void;
}

const consultationInitial: Omit<ConsultationState,
  | "setStep" | "setField" | "setExistingPoints" | "toggleArrayField"
  | "addDreamHunt" | "removeDreamHunt" | "confirmPlan" | "prefillFromGoals" | "reset"
  | "setPreviewScores" | "confirmStateSelection" | "setFineTuneAnswer"
  | "setGenerationPhase" | "setGenerationProgress"
> = {
  step: 1,
  homeState: "",
  homeCity: "",
  experienceLevel: null,
  physicalComfort: null,
  hasHuntedStates: [],
  species: [],
  huntingMotivation: null,
  trophyVsMeat: null,
  comfortWithUncertainty: null,
  bucketListDescription: "",
  dreamHunts: [],
  pointYearBudget: 1500,
  huntYearBudget: 5000,
  huntStylePrimary: null,
  openToGuided: false,
  guidedForSpecies: [],
  preferredTerrain: [],
  importantFactors: [],
  huntFrequency: null,
  timeAvailable: null,
  travelWillingness: null,
  hasExistingPoints: false,
  existingPoints: {},
  previewScores: [],
  selectedStatesConfirmed: [],
  fineTuneAnswers: {},
  generationPhase: "idle",
  generationProgress: 0,
  physicalLimitations: "",
  recommendedStates: [],
  planName: "My Western Strategy",
  confirmedPlan: null,
};

export const useWizardStore = create<ConsultationState>()(
  persist(
    (set) => ({
      ...(consultationInitial as ConsultationState),
      setStep: (step) => set({ step }),
      setField: (key, value) => set({ [key]: value } as Partial<ConsultationState>),
      setExistingPoints: (stateId, speciesId, pts) =>
        set((state) => ({
          existingPoints: {
            ...state.existingPoints,
            [stateId]: { ...state.existingPoints[stateId], [speciesId]: pts },
          },
        })),
      toggleArrayField: (key, value) =>
        set((state) => {
          const arr = state[key] as string[];
          if (arr.includes(value)) {
            return { [key]: arr.filter((v: string) => v !== value) } as Partial<ConsultationState>;
          }
          return { [key]: [...arr, value] } as Partial<ConsultationState>;
        }),
      addDreamHunt: (hunt) =>
        set((state) => ({ dreamHunts: [...state.dreamHunts, hunt] })),
      removeDreamHunt: (id) =>
        set((state) => ({
          dreamHunts: state.dreamHunts.filter((h) => h.id !== id),
        })),
      setPreviewScores: (scores) => set({ previewScores: scores }),
      confirmStateSelection: (stateIds) => set({ selectedStatesConfirmed: stateIds }),
      setFineTuneAnswer: (questionId, answer) =>
        set((state) => ({
          fineTuneAnswers: { ...state.fineTuneAnswers, [questionId]: answer },
        })),
      setGenerationPhase: (phase) => set({ generationPhase: phase }),
      setGenerationProgress: (pct) => set({ generationProgress: pct }),
      confirmPlan: (assessment) => set({ confirmedPlan: assessment }),
      prefillFromGoals: (goals) => {
        // Extract unique species from goals
        const species = [...new Set(goals.map(g => g.speciesId))];
        // Most common hunt style across goals (if any)
        const styleCounts: Record<string, number> = {};
        goals.forEach(g => { if (g.huntStyle) styleCounts[g.huntStyle] = (styleCounts[g.huntStyle] ?? 0) + 1; });
        const topStyle = Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as import("@/lib/types").HuntStyle | undefined;
        // Trophy vs meat from trophy descriptions
        const hasTrophyDreams = goals.some(g => g.trophyDescription && g.trophyDescription.length > 10);
        const trophyVsMeat = hasTrophyDreams ? "lean_trophy" as const : null;
        // Bucket list from all trophy descriptions
        const bucketList = goals
          .filter(g => g.trophyDescription)
          .map(g => `${g.title}: ${g.trophyDescription}`)
          .join("\n");

        set({
          species,
          ...(topStyle ? { huntStylePrimary: topStyle } : {}),
          ...(trophyVsMeat ? { trophyVsMeat } : {}),
          ...(bucketList ? { bucketListDescription: bucketList } : {}),
          step: 1,
        } as Partial<ConsultationState>);
      },
      reset: () => set(consultationInitial as ConsultationState),
    }),
    { name: "hunt-planner-wizard-v5" }
  )
);

// ============================================================================
// App State Store — enhanced with milestones from confirmed plans
// ============================================================================

interface AppState {
  userPoints: UserPoints[];
  userGoals: UserGoal[];
  milestones: Milestone[];
  confirmedAssessment: StrategicAssessment | null;

  // Subscription / entitlements (client-side cache)
  subscriptionPlanId: string;
  subscriptionFeatures: Record<string, boolean>;
  setSubscription: (planId: string, features: Record<string, boolean>) => void;

  setUserPoints: (points: UserPoints[]) => void;
  addUserPoint: (point: UserPoints) => void;
  updateUserPoint: (id: string, updates: Partial<UserPoints>) => void;
  removeUserPoint: (id: string) => void;

  setUserGoals: (goals: UserGoal[]) => void;
  addUserGoal: (goal: UserGoal) => void;
  updateUserGoal: (id: string, updates: Partial<UserGoal>) => void;
  removeUserGoal: (id: string) => void;

  setMilestones: (milestones: Milestone[]) => void;
  addMilestones: (milestones: Milestone[]) => void;
  completeMilestone: (id: string) => void;
  uncompleteMilestone: (id: string) => void;

  setConfirmedAssessment: (assessment: StrategicAssessment) => void;
  clearConfirmedAssessment: () => void;
}

// ============================================================================
// Points DB Sync — fire-and-forget POST to /api/user/points
// Zustand stays the source of truth for instant UI. DB is async backup.
// ============================================================================

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

function syncPointsToDb() {
  // Debounce: wait 500ms after last mutation before syncing
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    const pts = useAppStore.getState().userPoints;
    fetch("/api/user/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: pts }),
    }).catch(() => {
      // Silent fail — local store is still authoritative
    });
  }, 500);
}

/**
 * Hydrate points from DB on authenticated app load.
 * Call this from a top-level layout effect when user is authenticated.
 */
export async function hydratePointsFromDb() {
  try {
    const res = await fetch("/api/user/points");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.points) && data.points.length > 0) {
      useAppStore.getState().setUserPoints(data.points);
    }
  } catch {
    // Silent fail — local store is still authoritative
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userPoints: [],
      userGoals: [],
      milestones: [],
      confirmedAssessment: null,

      // Subscription defaults (free tier)
      subscriptionPlanId: "free",
      subscriptionFeatures: {
        state_overview: true,
        top_3_states: true,
        basic_budget: true,
        species_explorer: true,
        full_draw_odds: false,
        unlimited_reruns: false,
        export: false,
        priority_support: false,
      },
      setSubscription: (planId, features) =>
        set({ subscriptionPlanId: planId, subscriptionFeatures: features }),

      setUserPoints: (userPoints) => set({ userPoints }),
      addUserPoint: (point) => {
        set((state) => ({ userPoints: [...state.userPoints, point] }));
        syncPointsToDb();
      },
      updateUserPoint: (id, updates) => {
        set((state) => ({
          userPoints: state.userPoints.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
        syncPointsToDb();
      },
      removeUserPoint: (id) => {
        set((state) => ({
          userPoints: state.userPoints.filter((p) => p.id !== id),
        }));
        syncPointsToDb();
      },

      setUserGoals: (userGoals) => set({ userGoals }),
      addUserGoal: (goal) =>
        set((state) => {
          const goalMs = generateMilestonesForGoal(goal);
          return {
            userGoals: [...state.userGoals, goal],
            milestones: [...state.milestones, ...goalMs],
          };
        }),
      updateUserGoal: (id, updates) =>
        set((state) => {
          const updatedGoals = state.userGoals.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          );
          const updatedGoal = updatedGoals.find((g) => g.id === id);
          // Preserve completion status from old goal milestones
          const oldGoalMs = state.milestones.filter((m) => m.planId === id);
          const completedMap = new Map(
            oldGoalMs.filter((m) => m.completed).map((m) => [m.id, m.completedAt])
          );
          const otherMs = state.milestones.filter((m) => m.planId !== id);
          const newGoalMs = updatedGoal
            ? generateMilestonesForGoal(updatedGoal).map((m) =>
                completedMap.has(m.id)
                  ? { ...m, completed: true, completedAt: completedMap.get(m.id) }
                  : m
              )
            : [];
          return {
            userGoals: updatedGoals,
            milestones: [...otherMs, ...newGoalMs],
          };
        }),
      removeUserGoal: (id) =>
        set((state) => ({
          userGoals: state.userGoals.filter((g) => g.id !== id),
          milestones: state.milestones.filter((m) => m.planId !== id),
        })),

      setMilestones: (milestones) =>
        set((state) => {
          // Preserve goal-sourced milestones; only replace plan-sourced ones
          const goalMs = state.milestones.filter(
            (m) => m.planId && state.userGoals.some((g) => g.id === m.planId)
          );
          return { milestones: [...milestones, ...goalMs] };
        }),
      addMilestones: (newMilestones) =>
        set((state) => ({ milestones: [...state.milestones, ...newMilestones] })),
      completeMilestone: (id) =>
        set((state) => ({
          milestones: state.milestones.map((m) =>
            m.id === id ? { ...m, completed: true, completedAt: new Date().toISOString() } : m
          ),
        })),
      uncompleteMilestone: (id) =>
        set((state) => ({
          milestones: state.milestones.map((m) =>
            m.id === id ? { ...m, completed: false, completedAt: undefined } : m
          ),
        })),

      setConfirmedAssessment: (assessment) => set({ confirmedAssessment: assessment }),
      clearConfirmedAssessment: () =>
        set((state) => ({
          confirmedAssessment: null,
          // Keep goal-sourced milestones, only clear plan ones
          milestones: state.milestones.filter(
            (m) => m.planId && state.userGoals.some((g) => g.id === m.planId)
          ),
        })),
    }),
    { name: "hunt-planner-app-v2" }
  )
);
