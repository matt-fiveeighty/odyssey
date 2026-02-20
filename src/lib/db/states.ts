import { createServerSupabase } from "@/lib/supabase/server";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import type {
  State,
  PointSystemType,
  ApplicationApproach,
  FeeLineItem,
  StateLogistics,
  PointOnlyApplication,
  SeasonTier,
} from "@/lib/types";

// ============================================================================
// DB Row → TypeScript State mapping
// ============================================================================

interface RefStateRow {
  id: string;
  name: string;
  abbreviation: string;
  point_system: string;
  point_system_details: Record<string, unknown>;
  fg_url: string | null;
  buy_points_url: string | null;
  application_deadlines: Record<string, { open: string; close: string }>;
  license_fees: {
    qualifyingLicense?: number;
    appFee?: number;
    pointFee?: number;
  };
  fee_schedule: FeeLineItem[];
  application_approach: string | null;
  application_approach_description: string | null;
  application_tips: string[];
  available_species: string[];
  draw_result_dates: Record<string, string> | null;
  point_cost: Record<string, number>;
  color: string | null;
  logistics: StateLogistics | null;
  point_only_application: PointOnlyApplication | null;
  season_tiers: SeasonTier[] | null;
  state_personality: string | null;
  source_url: string | null;
  source_pulled_at: string | null;
  updated_at: string;
}

function mapRowToState(row: RefStateRow): State {
  return {
    id: row.id,
    name: row.name,
    abbreviation: row.abbreviation,
    pointSystem: row.point_system as PointSystemType,
    pointSystemDetails: row.point_system_details as State["pointSystemDetails"],
    fgUrl: row.fg_url ?? "",
    buyPointsUrl: row.buy_points_url ?? "",
    applicationDeadlines: row.application_deadlines,
    licenseFees: row.license_fees ?? {},
    feeSchedule: row.fee_schedule ?? [],
    applicationApproach: (row.application_approach ?? "per_unit") as ApplicationApproach,
    applicationApproachDescription: row.application_approach_description ?? "",
    applicationTips: row.application_tips ?? [],
    availableSpecies: row.available_species ?? [],
    drawResultDates: row.draw_result_dates ?? undefined,
    pointCost: row.point_cost ?? {},
    tagCosts: (row as unknown as Record<string, unknown>).tag_costs as Record<string, number> ?? {},
    color: row.color ?? "#6B7280",
    lastScrapedAt: row.source_pulled_at ?? undefined,
    logistics: row.logistics ?? undefined,
    pointOnlyApplication: row.point_only_application ?? undefined,
    seasonTiers: row.season_tiers ?? undefined,
    statePersonality: row.state_personality ?? undefined,
  };
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Fetch all states from the database. Falls back to hardcoded STATES constant
 * if the query fails or returns empty results.
 */
export async function getAllStates(): Promise<State[]> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("ref_states")
      .select("*")
      .order("name");

    if (error) {
      console.error("[db/states] getAllStates error:", error.message);
      return STATES;
    }

    if (!data || data.length === 0) {
      return STATES;
    }

    return (data as unknown as RefStateRow[]).map(mapRowToState);
  } catch (err) {
    console.error("[db/states] getAllStates unexpected error:", err);
    return STATES;
  }
}

/**
 * Fetch a single state by ID. Falls back to STATES_MAP lookup
 * if the query fails or returns no result.
 */
export async function getStateById(stateId: string): Promise<State | null> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("ref_states")
      .select("*")
      .eq("id", stateId)
      .single();

    if (error) {
      console.error("[db/states] getStateById error:", error.message);
      return STATES_MAP[stateId] ?? null;
    }

    if (!data) {
      return STATES_MAP[stateId] ?? null;
    }

    return mapRowToState(data as unknown as RefStateRow);
  } catch (err) {
    console.error("[db/states] getStateById unexpected error:", err);
    return STATES_MAP[stateId] ?? null;
  }
}
