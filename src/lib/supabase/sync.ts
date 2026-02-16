import { createClient } from "./client";

// ============================================================================
// Wizard State Sync
// ============================================================================

export async function loadWizardState(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("wizard_state")
    .select("state")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data.state as Record<string, unknown>;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function saveWizardStateDebounced(
  userId: string,
  state: Record<string, unknown>
) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const supabase = createClient();
    await supabase.from("wizard_state").upsert(
      {
        user_id: userId,
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }, 2000);
}

// ============================================================================
// Assessment Sync
// ============================================================================

export async function saveAssessment(
  userId: string,
  input: Record<string, unknown>,
  result: Record<string, unknown>
) {
  const supabase = createClient();
  const { error } = await supabase.from("assessments").insert({
    user_id: userId,
    input,
    result,
  });
  return !error;
}

export async function loadLatestAssessment(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return {
    input: data.input as Record<string, unknown>,
    result: data.result as Record<string, unknown>,
  };
}

// ============================================================================
// Goal Sync
// ============================================================================

export async function loadGoals(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function saveGoal(
  userId: string,
  goal: {
    title: string;
    species?: string;
    target_state?: string;
    target_year?: number;
  }
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_goals")
    .insert({ user_id: userId, ...goal })
    .select()
    .single();

  if (error || !data) return null;
  return data;
}

export async function deleteGoal(userId: string, goalId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId);

  return !error;
}
