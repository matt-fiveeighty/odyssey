import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getUnitById, getUnitDrawHistory } from "@/lib/db/units";
import { scoreUnit } from "@/lib/engine/unit-scoring";
import type { DrawHistoryEntry } from "@/lib/engine/unit-scoring";

/**
 * POST /api/units/score — Batch-score units with user preferences.
 *
 * Body: { units: string[], weaponType?, seasonPref?, drawHistory? }
 * Returns: { scores: { unitId, totalScore, maxPossibleScore, factors }[] }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { units: unitIds, weaponType, seasonPref } = body;

  if (!Array.isArray(unitIds) || unitIds.length === 0) {
    return NextResponse.json(
      { error: "units must be a non-empty array of unit IDs" },
      { status: 400 }
    );
  }

  if (unitIds.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 units per request" },
      { status: 400 }
    );
  }

  try {
    // Auth is optional — scoring works without it
    const supabase = await createServerSupabase();
    void supabase; // available for future auth-gated features

    const scores = await Promise.all(
      unitIds.map(async (unitId: string) => {
        const unit = await getUnitById(unitId);
        if (!unit) {
          return { unitId, error: "Unit not found" };
        }

        const historyRows = await getUnitDrawHistory(unitId);

        // Map DrawHistoryRow → DrawHistoryEntry for the scoring engine
        const drawHistory: DrawHistoryEntry[] = historyRows.map((row) => ({
          year: row.year,
          applicants: row.applicants,
          tagsAvailable: row.tagsAvailable,
          tagsIssued: row.tagsIssued,
          oddsPercent: row.oddsPercent,
          minPointsDrawn: row.minPointsDrawn,
        }));

        const result = scoreUnit(unit, drawHistory, {
          weaponType,
          seasonPreference: seasonPref,
        });

        return {
          unitId,
          totalScore: result.totalScore,
          maxPossibleScore: result.maxPossibleScore,
          factors: result.factors,
        };
      })
    );

    return NextResponse.json({ scores });
  } catch (err) {
    console.error("Unit scoring error:", err);
    return NextResponse.json(
      { error: "Failed to score units" },
      { status: 500 }
    );
  }
}
