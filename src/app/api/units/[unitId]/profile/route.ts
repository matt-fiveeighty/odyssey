import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getUnitById, getUnitDrawHistory, getUnitsForState } from "@/lib/db/units";
import { scoreUnit } from "@/lib/engine/unit-scoring";
import type { DrawHistoryEntry } from "@/lib/engine/unit-scoring";
import { findAlternateUnits } from "@/lib/engine/unit-alternates";

/**
 * GET /api/units/[unitId]/profile — Full unit profile with score,
 * draw history, alternates, tags, and notes.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const { unitId } = await params;

  try {
    // Fetch unit
    const unit = await getUnitById(unitId);
    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Fetch draw history
    const historyRows = await getUnitDrawHistory(unitId);
    const drawHistory: DrawHistoryEntry[] = historyRows.map((row) => ({
      year: row.year,
      applicants: row.applicants,
      tagsAvailable: row.tagsAvailable,
      tagsIssued: row.tagsIssued,
      oddsPercent: row.oddsPercent,
      minPointsDrawn: row.minPointsDrawn,
    }));

    // Score the unit
    const score = scoreUnit(unit, drawHistory, {});

    // Fetch alternate units from the same state + species pool
    const allUnits = await getUnitsForState(unit.stateId, unit.speciesId);
    const alternates = findAlternateUnits(unit, allUnits);

    // Fetch tags and notes from DB
    const supabase = await createServerSupabase();

    const { data: tagRows } = await supabase
      .from("ref_unit_tags")
      .select("tag, confidence")
      .eq("unit_id", unitId);

    const { data: noteRows } = await supabase
      .from("ref_unit_notes")
      .select("*")
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      unit,
      drawHistory,
      score,
      alternates,
      tags: tagRows ?? [],
      notes: noteRows ?? [],
    });
  } catch (err) {
    console.error("Unit profile error:", err);
    return NextResponse.json(
      { error: "Failed to load unit profile" },
      { status: 500 }
    );
  }
}
