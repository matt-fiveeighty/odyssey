import { createServerSupabase } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface BudgetPlan {
  id: string;
  userId: string;
  year: number;
  totalBudget: number | null;
  categories: Record<string, number>;
  actualSpend: Record<string, number>;
  notes: string | null;
}

export interface BudgetPlanInput {
  totalBudget?: number;
  categories?: Record<string, number>;
  actualSpend?: Record<string, number>;
  notes?: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetCost: number;
  targetDate: string | null;
  monthlySavings: number | null;
  currentSaved: number;
  stateId: string | null;
  speciesId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavingsGoalInput {
  title: string;
  targetCost: number;
  targetDate?: string;
  monthlySavings?: number;
  currentSaved?: number;
  stateId?: string;
  speciesId?: string;
  notes?: string;
}

// ============================================================================
// Row Types
// ============================================================================

interface BudgetPlanRow {
  id: string;
  user_id: string;
  year: number;
  total_budget: number | null;
  categories: Record<string, number>;
  actual_spend: Record<string, number>;
  notes: string | null;
}

interface SavingsGoalRow {
  id: string;
  user_id: string;
  title: string;
  target_cost: number;
  target_date: string | null;
  monthly_savings: number | null;
  current_saved: number;
  state_id: string | null;
  species_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Row Mapping
// ============================================================================

function mapBudgetPlanRow(row: BudgetPlanRow): BudgetPlan {
  return {
    id: row.id,
    userId: row.user_id,
    year: row.year,
    totalBudget: row.total_budget,
    categories: row.categories ?? {},
    actualSpend: row.actual_spend ?? {},
    notes: row.notes,
  };
}

function mapSavingsGoalRow(row: SavingsGoalRow): SavingsGoal {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    targetCost: row.target_cost,
    targetDate: row.target_date,
    monthlySavings: row.monthly_savings,
    currentSaved: row.current_saved ?? 0,
    stateId: row.state_id,
    speciesId: row.species_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Budget Plan CRUD
// ============================================================================

/**
 * Fetch a budget plan for a user and year.
 * Returns null if none exists.
 */
export async function getBudgetPlan(
  userId: string,
  year: number
): Promise<BudgetPlan | null> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("budget_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("year", year)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("[db/budget] getBudgetPlan error:", error.message);
      return null;
    }

    return mapBudgetPlanRow(data as unknown as BudgetPlanRow);
  } catch (err) {
    console.error("[db/budget] getBudgetPlan unexpected error:", err);
    return null;
  }
}

/**
 * Create or update a budget plan for a user and year.
 * Uses Supabase upsert on the (user_id, year) unique constraint.
 */
export async function upsertBudgetPlan(
  userId: string,
  year: number,
  input: BudgetPlanInput
): Promise<BudgetPlan> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("budget_plans")
    .upsert(
      {
        user_id: userId,
        year,
        total_budget: input.totalBudget ?? null,
        categories: input.categories ?? {},
        actual_spend: input.actualSpend ?? {},
        notes: input.notes ?? null,
      },
      { onConflict: "user_id,year" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`[db/budget] upsertBudgetPlan failed: ${error.message}`);
  }

  return mapBudgetPlanRow(data as unknown as BudgetPlanRow);
}

// ============================================================================
// Savings Goals CRUD
// ============================================================================

/**
 * Fetch all savings goals for a user.
 */
export async function getSavingsGoals(
  userId: string
): Promise<SavingsGoal[]> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[db/budget] getSavingsGoals error:", error.message);
      return [];
    }

    return (data as unknown as SavingsGoalRow[]).map(mapSavingsGoalRow);
  } catch (err) {
    console.error("[db/budget] getSavingsGoals unexpected error:", err);
    return [];
  }
}

/**
 * Create a new savings goal.
 */
export async function createSavingsGoal(
  userId: string,
  input: CreateSavingsGoalInput
): Promise<SavingsGoal> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("savings_goals")
    .insert({
      user_id: userId,
      title: input.title,
      target_cost: input.targetCost,
      target_date: input.targetDate ?? null,
      monthly_savings: input.monthlySavings ?? null,
      current_saved: input.currentSaved ?? 0,
      state_id: input.stateId ?? null,
      species_id: input.speciesId ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`[db/budget] createSavingsGoal failed: ${error.message}`);
  }

  return mapSavingsGoalRow(data as unknown as SavingsGoalRow);
}

/**
 * Update a savings goal by ID. Only the provided fields are updated.
 */
export async function updateSavingsGoal(
  goalId: string,
  updates: Partial<SavingsGoal>
): Promise<SavingsGoal> {
  const supabase = await createServerSupabase();

  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.targetCost !== undefined) dbUpdates.target_cost = updates.targetCost;
  if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate;
  if (updates.monthlySavings !== undefined) dbUpdates.monthly_savings = updates.monthlySavings;
  if (updates.currentSaved !== undefined) dbUpdates.current_saved = updates.currentSaved;
  if (updates.stateId !== undefined) dbUpdates.state_id = updates.stateId;
  if (updates.speciesId !== undefined) dbUpdates.species_id = updates.speciesId;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("savings_goals")
    .update(dbUpdates)
    .eq("id", goalId)
    .select()
    .single();

  if (error) {
    throw new Error(`[db/budget] updateSavingsGoal failed: ${error.message}`);
  }

  return mapSavingsGoalRow(data as unknown as SavingsGoalRow);
}

/**
 * Delete a savings goal by ID.
 */
export async function deleteSavingsGoal(goalId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", goalId);

  if (error) {
    throw new Error(`[db/budget] deleteSavingsGoal failed: ${error.message}`);
  }
}
