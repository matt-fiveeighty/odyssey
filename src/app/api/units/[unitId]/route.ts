import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import type { Unit } from "@/lib/types";

/**
 * GET /api/units/[unitId] — Single unit with draw history.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const { unitId } = await params;

  try {
    const supabase = await createServerSupabase();

    // Fetch unit
    const { data: row, error } = await supabase
      .from("ref_units")
      .select("*")
      .eq("id", unitId)
      .single();

    if (error || !row) {
      // Fall back to constants
      const fallback = SAMPLE_UNITS.find((u) => u.id === unitId);
      if (!fallback) {
        return NextResponse.json({ error: "Unit not found" }, { status: 404 });
      }
      return NextResponse.json({
        unit: fallback,
        drawHistory: fallback.drawData ?? [],
        source: "constants",
      });
    }

    const unit: Unit = mapDbRowToUnit(row);

    // Fetch draw history
    const { data: historyRows } = await supabase
      .from("ref_unit_draw_history")
      .select("*")
      .eq("unit_id", unitId)
      .order("year", { ascending: false });

    const drawHistory = (historyRows ?? []).map((h) => ({
      year: h.year,
      applicants: h.applicants,
      tagsAvailable: h.tags_available,
      tagsIssued: h.tags_issued,
      oddsPercent: h.odds_percent ? Number(h.odds_percent) : null,
      minPointsDrawn: h.min_points_drawn,
    }));

    // Fetch tags
    const { data: tagRows } = await supabase
      .from("ref_unit_tags")
      .select("tag, confidence")
      .eq("unit_id", unitId);

    // Fetch notes
    const { data: noteRows } = await supabase
      .from("ref_unit_notes")
      .select("*")
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      unit,
      drawHistory,
      tags: tagRows ?? [],
      notes: noteRows ?? [],
      source: "database",
    });
  } catch {
    const fallback = SAMPLE_UNITS.find((u) => u.id === unitId);
    if (!fallback) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }
    return NextResponse.json({
      unit: fallback,
      drawHistory: fallback.drawData ?? [],
      tags: [],
      notes: [],
      source: "constants",
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbRowToUnit(row: any): Unit {
  return {
    id: row.id,
    stateId: row.state_id,
    speciesId: row.species_id,
    unitCode: row.unit_code,
    unitName: row.unit_name ?? undefined,
    successRate: Number(row.success_rate) || 0,
    trophyRating: row.trophy_rating ?? 5,
    pointsRequiredResident: row.points_required_resident ?? 0,
    pointsRequiredNonresident: row.points_required_nonresident ?? 0,
    terrainType: row.terrain_type ?? [],
    pressureLevel: row.pressure_level ?? "Moderate",
    elevationRange: row.elevation_range ?? [0, 0],
    publicLandPct: Number(row.public_land_pct) || 0,
    tagQuotaNonresident: row.tag_quota_nonresident ?? 0,
    seasonDates: row.season_dates ?? undefined,
    notes: row.notes ?? undefined,
    tacticalNotes: row.tactical_notes ?? undefined,
    nearestAirport: row.nearest_airport ?? undefined,
    driveTimeFromAirport: row.drive_time_from_airport ?? undefined,
  };
}
