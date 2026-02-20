import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { STATES } from "@/lib/constants/states";
import type { State } from "@/lib/types";

/**
 * GET /api/states — List all states with metadata.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("ref_states")
      .select("*")
      .order("name");

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        states: STATES,
        source: "constants",
      });
    }

    const states: State[] = data.map(mapDbRowToState);
    return NextResponse.json({ states, source: "database" });
  } catch {
    return NextResponse.json({ states: STATES, source: "constants" });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbRowToState(row: any): State {
  return {
    id: row.id,
    name: row.name,
    abbreviation: row.abbreviation,
    pointSystem: row.point_system,
    pointSystemDetails: row.point_system_details ?? { description: "" },
    fgUrl: row.fg_url ?? "",
    buyPointsUrl: row.buy_points_url ?? "",
    applicationDeadlines: row.application_deadlines ?? {},
    licenseFees: row.license_fees ?? {},
    feeSchedule: row.fee_schedule ?? [],
    applicationApproach: row.application_approach ?? "per_unit",
    applicationApproachDescription: row.application_approach_description ?? "",
    applicationTips: row.application_tips ?? [],
    availableSpecies: row.available_species ?? [],
    drawResultDates: row.draw_result_dates ?? undefined,
    pointCost: row.point_cost ?? {},
    tagCosts: row.tag_costs ?? {},
    color: row.color ?? "#6B7280",
    logistics: row.logistics ?? undefined,
    pointOnlyApplication: row.point_only_application ?? undefined,
    seasonTiers: row.season_tiers ?? undefined,
    statePersonality: row.state_personality ?? undefined,
  };
}
