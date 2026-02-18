import { createServerSupabase } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface YearPlan {
  id: string;
  userId: string;
  year: number;
  status: "draft" | "active" | "completed";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanItem {
  id: string;
  planId: string;
  itemType: string;
  title: string;
  description: string | null;
  stateId: string | null;
  speciesId: string | null;
  unitId: string | null;
  month: number | null;
  startDate: string | null;
  endDate: string | null;
  estimatedCost: number | null;
  costBreakdown: unknown[];
  completed: boolean;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CreatePlanItemInput {
  itemType: string;
  title: string;
  description?: string;
  stateId?: string;
  speciesId?: string;
  unitId?: string;
  month?: number;
  startDate?: string;
  endDate?: string;
  estimatedCost?: number;
  costBreakdown?: unknown[];
  sortOrder?: number;
}

// ============================================================================
// Row Mapping
// ============================================================================

interface YearPlanRow {
  id: string;
  user_id: string;
  year: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PlanItemRow {
  id: string;
  plan_id: string;
  item_type: string;
  title: string;
  description: string | null;
  state_id: string | null;
  species_id: string | null;
  unit_id: string | null;
  month: number | null;
  start_date: string | null;
  end_date: string | null;
  estimated_cost: number | null;
  cost_breakdown: unknown[];
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

function mapYearPlanRow(row: YearPlanRow): YearPlan {
  return {
    id: row.id,
    userId: row.user_id,
    year: row.year,
    status: row.status as YearPlan["status"],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlanItemRow(row: PlanItemRow): PlanItem {
  return {
    id: row.id,
    planId: row.plan_id,
    itemType: row.item_type,
    title: row.title,
    description: row.description,
    stateId: row.state_id,
    speciesId: row.species_id,
    unitId: row.unit_id,
    month: row.month,
    startDate: row.start_date,
    endDate: row.end_date,
    estimatedCost: row.estimated_cost,
    costBreakdown: row.cost_breakdown ?? [],
    completed: row.completed,
    completedAt: row.completed_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

// ============================================================================
// Year Plan CRUD
// ============================================================================

/**
 * Fetch all year plans for a user, sorted by year descending.
 */
export async function getYearPlans(userId: string): Promise<YearPlan[]> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("year_plans")
      .select("*")
      .eq("user_id", userId)
      .order("year", { ascending: false });

    if (error) {
      console.error("[db/planner] getYearPlans error:", error.message);
      return [];
    }

    return (data as unknown as YearPlanRow[]).map(mapYearPlanRow);
  } catch (err) {
    console.error("[db/planner] getYearPlans unexpected error:", err);
    return [];
  }
}

/**
 * Fetch a single year plan for a user by year.
 */
export async function getYearPlan(
  userId: string,
  year: number
): Promise<YearPlan | null> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("year_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("year", year)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned — not an error, just doesn't exist yet
        return null;
      }
      console.error("[db/planner] getYearPlan error:", error.message);
      return null;
    }

    return mapYearPlanRow(data as unknown as YearPlanRow);
  } catch (err) {
    console.error("[db/planner] getYearPlan unexpected error:", err);
    return null;
  }
}

/**
 * Create a new year plan for a user.
 */
export async function createYearPlan(
  userId: string,
  year: number
): Promise<YearPlan> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("year_plans")
    .insert({ user_id: userId, year, status: "draft" })
    .select()
    .single();

  if (error) {
    throw new Error(`[db/planner] createYearPlan failed: ${error.message}`);
  }

  return mapYearPlanRow(data as unknown as YearPlanRow);
}

// ============================================================================
// Plan Item CRUD
// ============================================================================

/**
 * Fetch all items for a given plan, sorted by sort_order.
 */
export async function getPlanItems(planId: string): Promise<PlanItem[]> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("year_plan_items")
      .select("*")
      .eq("plan_id", planId)
      .order("sort_order")
      .order("created_at");

    if (error) {
      console.error("[db/planner] getPlanItems error:", error.message);
      return [];
    }

    return (data as unknown as PlanItemRow[]).map(mapPlanItemRow);
  } catch (err) {
    console.error("[db/planner] getPlanItems unexpected error:", err);
    return [];
  }
}

/**
 * Create a new plan item.
 */
export async function createPlanItem(
  planId: string,
  item: CreatePlanItemInput
): Promise<PlanItem> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("year_plan_items")
    .insert({
      plan_id: planId,
      item_type: item.itemType,
      title: item.title,
      description: item.description ?? null,
      state_id: item.stateId ?? null,
      species_id: item.speciesId ?? null,
      unit_id: item.unitId ?? null,
      month: item.month ?? null,
      start_date: item.startDate ?? null,
      end_date: item.endDate ?? null,
      estimated_cost: item.estimatedCost ?? null,
      cost_breakdown: item.costBreakdown ?? [],
      sort_order: item.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`[db/planner] createPlanItem failed: ${error.message}`);
  }

  return mapPlanItemRow(data as unknown as PlanItemRow);
}

/**
 * Update a plan item by ID. Only the provided fields are updated.
 */
export async function updatePlanItem(
  itemId: string,
  updates: Partial<PlanItem>
): Promise<PlanItem> {
  const supabase = await createServerSupabase();

  // Map camelCase fields to snake_case DB columns
  const dbUpdates: Record<string, unknown> = {};
  if (updates.itemType !== undefined) dbUpdates.item_type = updates.itemType;
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.stateId !== undefined) dbUpdates.state_id = updates.stateId;
  if (updates.speciesId !== undefined) dbUpdates.species_id = updates.speciesId;
  if (updates.unitId !== undefined) dbUpdates.unit_id = updates.unitId;
  if (updates.month !== undefined) dbUpdates.month = updates.month;
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
  if (updates.estimatedCost !== undefined) dbUpdates.estimated_cost = updates.estimatedCost;
  if (updates.costBreakdown !== undefined) dbUpdates.cost_breakdown = updates.costBreakdown;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  if (updates.completed !== undefined) {
    dbUpdates.completed = updates.completed;
    if (updates.completed) {
      dbUpdates.completed_at = new Date().toISOString();
    } else {
      dbUpdates.completed_at = null;
    }
  }

  const { data, error } = await supabase
    .from("year_plan_items")
    .update(dbUpdates)
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`[db/planner] updatePlanItem failed: ${error.message}`);
  }

  return mapPlanItemRow(data as unknown as PlanItemRow);
}

/**
 * Delete a plan item by ID.
 */
export async function deletePlanItem(itemId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("year_plan_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw new Error(`[db/planner] deletePlanItem failed: ${error.message}`);
  }
}
