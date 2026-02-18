import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { STATES_MAP } from "@/lib/constants/states";
import type { State } from "@/lib/types";

/**
 * GET /api/states/[stateId] — Single state detail.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stateId: string }> }
) {
  const { stateId } = await params;

  try {
    const supabase = await createServerSupabase();
    const { data: row, error } = await supabase
      .from("ref_states")
      .select("*")
      .eq("id", stateId)
      .single();

    if (error || !row) {
      const fallback = STATES_MAP[stateId];
      if (!fallback) {
        return NextResponse.json({ error: "State not found" }, { status: 404 });
      }
      return NextResponse.json({ state: fallback, source: "constants" });
    }

    const state: State = {
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
      color: row.color ?? "#6B7280",
      logistics: row.logistics ?? undefined,
      pointOnlyApplication: row.point_only_application ?? undefined,
      seasonTiers: row.season_tiers ?? undefined,
      statePersonality: row.state_personality ?? undefined,
    };

    return NextResponse.json({ state, source: "database" });
  } catch {
    const fallback = STATES_MAP[stateId];
    if (!fallback) {
      return NextResponse.json({ error: "State not found" }, { status: 404 });
    }
    return NextResponse.json({ state: fallback, source: "constants" });
  }
}
