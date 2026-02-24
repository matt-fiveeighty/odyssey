import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  HuntStyle, UserPoints, UserGoal, Milestone, DreamHunt, StrategicAssessment,
  StateScoreBreakdown, BoardState, DisciplineViolation, LockedAnchor, PortfolioMandate,
  ExperienceLevel, TrophyVsMeat, SavingsGoal,
} from "@/lib/types";
import { generateMilestonesForGoal } from "@/lib/engine/roadmap-generator";

// ============================================================================
// Strategic Consultation Wizard Store v4
// Models a deep consultation — 10 conversational steps, adaptive feedback,
// intermediate state previews, and fine-tune follow-ups
// ============================================================================

export type PhysicalComfort = "sea_level" | "moderate_elevation" | "high_alpine" | "any";
export type HuntFrequency = "every_year" | "every_other" | "every_3" | "when_opportunity";
export type TravelWillingness = "drive_only" | "short_flight" | "will_fly_anywhere";
// ExperienceLevel and TrophyVsMeat now live in @/lib/types — re-export for backwards compat
export type { ExperienceLevel, TrophyVsMeat } from "@/lib/types";
export type TimeAvailable = "weekend_warrior" | "full_week" | "10_plus_days" | "flexible";
export type HuntingMotivation = "challenge" | "connection" | "tradition" | "escape" | "meat_provider";
export type UncertaintyComfort = "love_it" | "tolerate" | "prefer_certainty";

interface ConsultationState {
  step: number;

  // Step 1: Tell me about yourself
  planForName: string; // "My son Jake", "Dad", "" (self)
  planForAge: number | null; // null = not specified
  planningHorizon: number; // 10, 15, 20, 25
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
  huntDaysPerYear: number; // PTO / available hunt days per year

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

  // Express mode (3-step quick plan)
  expressMode: boolean;

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
  setExpressMode: (enabled: boolean) => void;
  reset: () => void;
}

const consultationInitial: Omit<ConsultationState,
  | "setStep" | "setField" | "setExistingPoints" | "toggleArrayField"
  | "addDreamHunt" | "removeDreamHunt" | "confirmPlan" | "prefillFromGoals" | "reset"
  | "setPreviewScores" | "confirmStateSelection" | "setFineTuneAnswer"
  | "setGenerationPhase" | "setGenerationProgress" | "setExpressMode"
> = {
  step: 1,
  planForName: "",
  planForAge: null,
  planningHorizon: 10,
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
  huntDaysPerYear: 0,
  hasExistingPoints: false,
  existingPoints: {},
  previewScores: [],
  selectedStatesConfirmed: [],
  fineTuneAnswers: {},
  generationPhase: "idle",
  generationProgress: 0,
  expressMode: false,
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
      setExpressMode: (enabled) => set({ expressMode: enabled }),
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
    { name: "hunt-planner-wizard-v6" }
  )
);

// ============================================================================
// App State Store — enhanced with milestones from confirmed plans
// ============================================================================

/** A named plan that can be saved, switched between, and shared */
export interface SavedPlan {
  id: string;
  name: string;
  label?: string; // e.g. "Youth", "Dad", "2027 Trip"
  assessment: StrategicAssessment;
  createdAt: string;
  updatedAt: string;
}

// ── Collaborative Calendar Types ──────────────────────────────────────────

/** Plan color palette for multi-plan calendar overlay */
export const PLAN_PALETTE = [
  { bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444", text: "#fca5a5", dot: "#ef4444", label: "Red" },
  { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6", text: "#93c5fd", dot: "#3b82f6", label: "Blue" },
  { bg: "rgba(34, 197, 94, 0.15)", border: "#22c55e", text: "#86efac", dot: "#22c55e", label: "Green" },
  { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b", text: "#fcd34d", dot: "#f59e0b", label: "Amber" },
  { bg: "rgba(139, 92, 246, 0.15)", border: "#8b5cf6", text: "#c4b5fd", dot: "#8b5cf6", label: "Violet" },
  { bg: "rgba(236, 72, 153, 0.15)", border: "#ec4899", text: "#f9a8d4", dot: "#ec4899", label: "Pink" },
  { bg: "rgba(20, 184, 166, 0.15)", border: "#14b8a6", text: "#5eead4", dot: "#14b8a6", label: "Teal" },
  { bg: "rgba(249, 115, 22, 0.15)", border: "#f97316", text: "#fdba74", dot: "#f97316", label: "Orange" },
] as const;

/** An imported friend/peer plan for calendar overlay */
export interface FriendPlan {
  id: string;
  name: string;       // Friend's name
  color: string;      // hex color from palette
  items: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    stateId?: string;
    speciesId?: string;
    month: number;
    day?: number;
    endDay?: number;
    endMonth?: number;
    estimatedCost?: number;
  }>;
  importedAt: string;
}

/** A proposed hunt date range to share with peers */
export interface DateProposal {
  id: string;
  stateId: string;
  speciesId: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  year: number;
  notes: string;
  createdAt: string;
}

interface AppState {
  userPoints: UserPoints[];
  userGoals: UserGoal[];
  milestones: Milestone[];
  confirmedAssessment: StrategicAssessment | null;

  // Temporal context (Phase 5 Advisor Voice)
  lastVisitAt: string | null;
  recordVisit: () => void;

  // Multi-plan management
  savedPlans: SavedPlan[];
  activePlanId: string | null;
  savePlan: (name: string, assessment: StrategicAssessment, label?: string) => string;
  renamePlan: (id: string, name: string) => void;
  deletePlan: (id: string) => void;
  switchPlan: (id: string) => void;
  duplicatePlan: (id: string, newName: string) => string;

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
  setDrawOutcome: (id: string, outcome: "drew" | "didnt_draw" | null) => void;

  // Savings goals (Phase 8)
  savingsGoals: SavingsGoal[];
  addSavingsGoal: (goal: SavingsGoal) => void;
  updateSavingsGoal: (id: string, updates: Partial<Pick<SavingsGoal, 'currentSaved' | 'monthlySavings'>>) => void;
  removeSavingsGoal: (id: string) => void;
  addContribution: (goalId: string, amount: number, note?: string) => void;

  // Diff tracking (Phase 9)
  seenDiffIds: string[];
  lastDiffComputedAt: string | null;
  markDiffSeen: (id: string) => void;
  markAllDiffsSeen: (ids: string[]) => void;

  // Collaborative calendar
  friendPlans: FriendPlan[];
  planVisibility: Record<string, boolean>; // planId → visible (true = shown)
  dateProposals: DateProposal[];
  addFriendPlan: (plan: FriendPlan) => void;
  removeFriendPlan: (id: string) => void;
  togglePlanVisibility: (id: string) => void;
  setPlanVisibility: (id: string, visible: boolean) => void;
  addDateProposal: (proposal: DateProposal) => void;
  removeProposal: (id: string) => void;

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
      savingsGoals: [],

      // Diff tracking (Phase 9)
      seenDiffIds: [],
      lastDiffComputedAt: null,

      // Temporal context (Phase 5 Advisor Voice)
      lastVisitAt: null,
      recordVisit: () => {
        // Read current value BEFORE overwriting -- this is the "last" visit
        const current = useAppStore.getState().lastVisitAt;
        // Only update if the existing value is from a different day (avoid overwriting on same-session reloads)
        const today = new Date().toISOString().slice(0, 10);
        const lastDay = current?.slice(0, 10);
        if (lastDay === today) return; // Same day, don't overwrite
        set({ lastVisitAt: new Date().toISOString() });
      },

      // Multi-plan management
      savedPlans: [],
      activePlanId: null,
      savePlan: (name, assessment, label) => {
        const id = `plan-${Date.now()}`;
        const now = new Date().toISOString();
        const plan: SavedPlan = { id, name, label, assessment, createdAt: now, updatedAt: now };
        set((state) => ({
          savedPlans: [...state.savedPlans, plan],
          activePlanId: id,
          confirmedAssessment: assessment,
        }));
        useRoadmapStore.getState().setActiveAssessment(assessment);
        return id;
      },
      renamePlan: (id, name) =>
        set((state) => ({
          savedPlans: state.savedPlans.map((p) =>
            p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p
          ),
        })),
      deletePlan: (id) =>
        set((state) => {
          const remaining = state.savedPlans.filter((p) => p.id !== id);
          const wasActive = state.activePlanId === id;
          if (wasActive && remaining.length > 0) {
            // Switch to first remaining plan
            const next = remaining[0];
            useRoadmapStore.getState().setActiveAssessment(next.assessment);
            return {
              savedPlans: remaining,
              activePlanId: next.id,
              confirmedAssessment: next.assessment,
            };
          }
          if (wasActive) {
            useRoadmapStore.getState().clear();
            return { savedPlans: remaining, activePlanId: null, confirmedAssessment: null };
          }
          return { savedPlans: remaining };
        }),
      switchPlan: (id) =>
        set((state) => {
          const plan = state.savedPlans.find((p) => p.id === id);
          if (!plan) return {};
          useRoadmapStore.getState().setActiveAssessment(plan.assessment);
          return { activePlanId: id, confirmedAssessment: plan.assessment };
        }),
      duplicatePlan: (id, newName) => {
        const newId = `plan-${Date.now()}`;
        const now = new Date().toISOString();
        set((state) => {
          const source = state.savedPlans.find((p) => p.id === id);
          if (!source) return {};
          const clone: SavedPlan = {
            id: newId,
            name: newName,
            assessment: { ...source.assessment, id: newId },
            createdAt: now,
            updatedAt: now,
          };
          return { savedPlans: [...state.savedPlans, clone] };
        });
        return newId;
      },

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
          const hs = useWizardStore.getState().homeState;
          const goalMs = generateMilestonesForGoal(goal, hs);

          // G1: Auto-create a savings goal if the hunt is >1 year out and >$500
          const totalCost = goalMs.reduce((s, m) => s + m.totalCost, 0);
          const currentYear = new Date().getFullYear();
          const monthsAway = Math.max(1, (goal.targetYear - currentYear) * 12);
          const shouldAutoSave =
            totalCost > 500 &&
            goal.targetYear > currentYear + 1 &&
            !state.savingsGoals.some((sg) => sg.goalId === goal.id);

          const now = new Date().toISOString();
          const newSavingsGoals = shouldAutoSave
            ? [
                ...state.savingsGoals,
                {
                  id: `auto-sg-${goal.id}`,
                  goalId: goal.id,
                  currentSaved: 0,
                  monthlySavings: Math.ceil(totalCost / monthsAway),
                  contributions: [],
                  createdAt: now,
                  updatedAt: now,
                },
              ]
            : state.savingsGoals;

          return {
            userGoals: [...state.userGoals, goal],
            milestones: [...state.milestones, ...goalMs],
            savingsGoals: newSavingsGoals,
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
          const hs = useWizardStore.getState().homeState;
          const newGoalMs = updatedGoal
            ? generateMilestonesForGoal(updatedGoal, hs).map((m) =>
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
          savingsGoals: state.savingsGoals.filter((sg) => sg.goalId !== id),
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
      setDrawOutcome: (id, outcome) =>
        set((state) => ({
          milestones: state.milestones.map((m) =>
            m.id === id
              ? { ...m, drawOutcome: outcome, drawOutcomeAt: outcome ? new Date().toISOString() : undefined }
              : m
          ),
        })),

      // Savings goals (Phase 8)
      addSavingsGoal: (goal) =>
        set((state) => ({ savingsGoals: [...state.savingsGoals, goal] })),
      updateSavingsGoal: (id, updates) =>
        set((state) => ({
          savingsGoals: state.savingsGoals.map((sg) =>
            sg.id === id ? { ...sg, ...updates, updatedAt: new Date().toISOString() } : sg
          ),
        })),
      removeSavingsGoal: (id) =>
        set((state) => ({ savingsGoals: state.savingsGoals.filter((sg) => sg.id !== id) })),
      addContribution: (goalId, amount, note) =>
        set((state) => ({
          savingsGoals: state.savingsGoals.map((sg) =>
            sg.id !== goalId
              ? sg
              : {
                  ...sg,
                  currentSaved: sg.currentSaved + amount,
                  contributions: [...sg.contributions, { amount, date: new Date().toISOString(), note }],
                  updatedAt: new Date().toISOString(),
                }
          ),
        })),

      // Diff tracking (Phase 9)
      markDiffSeen: (id) =>
        set((state) => ({
          seenDiffIds: state.seenDiffIds.includes(id)
            ? state.seenDiffIds
            : [...state.seenDiffIds, id],
        })),
      markAllDiffsSeen: (ids) =>
        set((state) => ({
          seenDiffIds: [...new Set([...state.seenDiffIds, ...ids])],
          lastDiffComputedAt: new Date().toISOString(),
        })),

      // Collaborative calendar
      friendPlans: [],
      planVisibility: {},
      dateProposals: [],
      addFriendPlan: (plan) =>
        set((state) => ({ friendPlans: [...state.friendPlans, plan] })),
      removeFriendPlan: (id) =>
        set((state) => ({
          friendPlans: state.friendPlans.filter((p) => p.id !== id),
          planVisibility: Object.fromEntries(
            Object.entries(state.planVisibility).filter(([k]) => k !== id)
          ),
        })),
      togglePlanVisibility: (id) =>
        set((state) => ({
          planVisibility: {
            ...state.planVisibility,
            [id]: !(state.planVisibility[id] ?? true),
          },
        })),
      setPlanVisibility: (id, visible) =>
        set((state) => ({
          planVisibility: { ...state.planVisibility, [id]: visible },
        })),
      addDateProposal: (proposal) =>
        set((state) => ({ dateProposals: [...state.dateProposals, proposal] })),
      removeProposal: (id) =>
        set((state) => ({
          dateProposals: state.dateProposals.filter((p) => p.id !== id),
        })),

      setConfirmedAssessment: (assessment) => {
        set((state) => {
          // Auto-save: if no saved plans exist yet, create one; otherwise update the active plan
          const now = new Date().toISOString();
          const existingActive = state.savedPlans.find((p) => p.id === state.activePlanId);
          if (existingActive) {
            return {
              confirmedAssessment: assessment,
              savedPlans: state.savedPlans.map((p) =>
                p.id === state.activePlanId
                  ? { ...p, assessment, updatedAt: now }
                  : p
              ),
            };
          }
          // First plan — auto-create
          const id = `plan-${Date.now()}`;
          const plan: SavedPlan = {
            id,
            name: "My Strategy",
            assessment,
            createdAt: now,
            updatedAt: now,
          };
          return {
            confirmedAssessment: assessment,
            savedPlans: [...state.savedPlans, plan],
            activePlanId: id,
          };
        });
        // Sync to roadmap store — the roadmap store is the new center of gravity
        if (assessment) {
          useRoadmapStore.getState().setActiveAssessment(assessment);
        }
      },
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

// ============================================================================
// Roadmap Store — the center of gravity for the living strategic plan
// Holds the active assessment, board state, discipline violations, and anchors.
// Synced from AppStore.confirmedAssessment for backwards compat; new features
// read from here directly.
// ============================================================================

interface RoadmapStoreState {
  activeAssessment: StrategicAssessment | null;
  portfolioMandate: PortfolioMandate | null;
  boardState: BoardState | null;
  disciplineViolations: DisciplineViolation[];
  lockedAnchors: LockedAnchor[];
  version: number;
  lastRebalancedAt: string | null;

  // Actions
  setActiveAssessment: (assessment: StrategicAssessment) => void;
  setPortfolioMandate: (mandate: PortfolioMandate) => void;
  setBoardState: (state: BoardState) => void;
  setDisciplineViolations: (violations: DisciplineViolation[]) => void;
  addLockedAnchor: (anchor: LockedAnchor) => void;
  removeLockedAnchor: (id: string) => void;
  clear: () => void;
}

export const useRoadmapStore = create<RoadmapStoreState>()(
  persist(
    (set) => ({
      activeAssessment: null,
      portfolioMandate: null,
      boardState: null,
      disciplineViolations: [],
      lockedAnchors: [],
      version: 0,
      lastRebalancedAt: null,

      setActiveAssessment: (assessment) =>
        set({
          activeAssessment: assessment,
          boardState: assessment.boardState ?? null,
          disciplineViolations: assessment.disciplineViolations ?? [],
          lockedAnchors: assessment.lockedAnchors ?? [],
        }),
      setPortfolioMandate: (mandate) => set({ portfolioMandate: mandate }),
      setBoardState: (boardState) => set({ boardState }),
      setDisciplineViolations: (disciplineViolations) => set({ disciplineViolations }),
      addLockedAnchor: (anchor) =>
        set((state) => ({ lockedAnchors: [...state.lockedAnchors, anchor] })),
      removeLockedAnchor: (id) =>
        set((state) => ({ lockedAnchors: state.lockedAnchors.filter((a) => a.id !== id) })),
      clear: () =>
        set({
          activeAssessment: null,
          portfolioMandate: null,
          boardState: null,
          disciplineViolations: [],
          lockedAnchors: [],
          version: 0,
          lastRebalancedAt: null,
        }),
    }),
    { name: "hunt-planner-roadmap-v1" }
  )
);

/**
 * One-time migration: if AppStore has a confirmedAssessment but RoadmapStore doesn't,
 * copy it over. Call this from a top-level layout effect.
 */
export function migrateAssessmentToRoadmapStore() {
  const appAssessment = useAppStore.getState().confirmedAssessment;
  const roadmapAssessment = useRoadmapStore.getState().activeAssessment;
  if (appAssessment && !roadmapAssessment) {
    useRoadmapStore.getState().setActiveAssessment(appAssessment);
  }
}
