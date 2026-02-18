import { createServerSupabase } from "@/lib/supabase/server";

// ============================================================================
// Entitlement System — Decoupled from pricing tiers
// Feature flags live in DB, not code. Product team can adjust via Supabase.
// ============================================================================

export type PlanId = "free" | "pro" | "elite";

export type Feature =
  | "state_overview"
  | "top_3_states"
  | "basic_budget"
  | "species_explorer"
  | "full_draw_odds"
  | "unlimited_reruns"
  | "export"
  | "priority_support"
  | "goal_tracking"
  | "deadline_reminders"
  | "advanced_analytics"
  | "multi_year_comparison"
  | "unit_database"
  | "draw_history"
  | "unit_scoring"
  | "unit_export"
  | "odds_finder"
  | "point_unlock_preview"
  | "goal_suggestions"
  | "planner"
  | "auto_fill"
  | "opportunity_finder"
  | "budget_planner"
  | "savings_goals"
  | "journey_map"
  | "llm_narratives"
  | "collaboration"
  | "group_applications";

// Hardcoded fallback when DB is unavailable (matches seed data)
const FALLBACK_FLAGS: Record<PlanId, Partial<Record<Feature, boolean>>> = {
  free: {
    state_overview: true,
    top_3_states: true,
    basic_budget: true,
    species_explorer: true,
    full_draw_odds: false,
    unlimited_reruns: false,
    export: false,
    priority_support: false,
    goal_tracking: false,
    deadline_reminders: false,
    advanced_analytics: false,
    multi_year_comparison: false,
    unit_database: true,
    draw_history: false,
    unit_scoring: false,
    unit_export: false,
    odds_finder: true,
    point_unlock_preview: true,
    goal_suggestions: false,
    planner: true,
    auto_fill: false,
    opportunity_finder: false,
    budget_planner: true,
    savings_goals: false,
    journey_map: true,
    llm_narratives: false,
    collaboration: false,
    group_applications: false,
  },
  pro: {
    state_overview: true,
    top_3_states: true,
    basic_budget: true,
    species_explorer: true,
    full_draw_odds: true,
    unlimited_reruns: true,
    export: false,
    priority_support: false,
    goal_tracking: true,
    deadline_reminders: true,
    advanced_analytics: false,
    multi_year_comparison: false,
    unit_database: true,
    draw_history: true,
    unit_scoring: true,
    unit_export: false,
    odds_finder: true,
    point_unlock_preview: true,
    goal_suggestions: true,
    planner: true,
    auto_fill: true,
    opportunity_finder: false,
    budget_planner: true,
    savings_goals: true,
    journey_map: true,
    llm_narratives: true,
    collaboration: true,
    group_applications: false,
  },
  elite: {
    state_overview: true,
    top_3_states: true,
    basic_budget: true,
    species_explorer: true,
    full_draw_odds: true,
    unlimited_reruns: true,
    export: true,
    priority_support: true,
    goal_tracking: true,
    deadline_reminders: true,
    advanced_analytics: true,
    multi_year_comparison: true,
    unit_database: true,
    draw_history: true,
    unit_scoring: true,
    unit_export: true,
    odds_finder: true,
    point_unlock_preview: true,
    goal_suggestions: true,
    planner: true,
    auto_fill: true,
    opportunity_finder: true,
    budget_planner: true,
    savings_goals: true,
    journey_map: true,
    llm_narratives: true,
    collaboration: true,
    group_applications: true,
  },
};

// ── Server-side entitlement check ──────────────────────────────────

export async function getUserPlan(userId: string): Promise<PlanId> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("subscriptions")
      .select("plan_id, status")
      .eq("user_id", userId)
      .single();

    if (!data || data.status !== "active") return "free";
    return (data.plan_id as PlanId) ?? "free";
  } catch {
    return "free";
  }
}

export async function hasFeature(
  userId: string,
  feature: Feature
): Promise<boolean> {
  const planId = await getUserPlan(userId);
  return checkFeatureForPlan(planId, feature);
}

export async function checkFeatureForPlan(
  planId: PlanId,
  feature: Feature
): Promise<boolean> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("feature_flags")
      .select("features")
      .eq("plan_id", planId)
      .single();

    if (!data?.features) return FALLBACK_FLAGS[planId]?.[feature] ?? false;
    return (data.features as Record<string, boolean>)?.[feature] ?? false;
  } catch {
    return FALLBACK_FLAGS[planId]?.[feature] ?? false;
  }
}

export async function getFeaturesForPlan(
  planId: PlanId
): Promise<Record<string, boolean>> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("feature_flags")
      .select("features")
      .eq("plan_id", planId)
      .single();

    return (data?.features as Record<string, boolean>) ?? FALLBACK_FLAGS[planId] ?? {};
  } catch {
    return FALLBACK_FLAGS[planId] ?? {};
  }
}

// ── Client-side types for Zustand store ────────────────────────────

export interface SubscriptionInfo {
  planId: PlanId;
  status: "active" | "trial" | "past_due" | "canceled" | "expired";
  features: Record<string, boolean>;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export const DEFAULT_SUBSCRIPTION: SubscriptionInfo = {
  planId: "free",
  status: "active",
  features: FALLBACK_FLAGS.free as Record<string, boolean>,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};
