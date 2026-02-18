import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getUnitsForState, getUnitDrawHistory } from "@/lib/db/units";
import { scoreUnit } from "@/lib/engine/unit-scoring";
import type { DrawHistoryEntry } from "@/lib/engine/unit-scoring";
import { findAlternateUnits } from "@/lib/engine/unit-alternates";

/**
 * GET /api/goals/[goalId]/suggestions — Get unit suggestions for a goal.
 *
 * Auth required.
 *
 * Since goals are stored client-side in Zustand, stateId and speciesId
 * are accepted as query params: ?stateId=CO&speciesId=elk
 *
 * Returns: { suggested: { unit, score, whyBullets }, alternates }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const { goalId } = await params;
  void goalId; // reserved for future DB-backed goals

  try {
    // Auth required
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const stateId = searchParams.get("stateId");
    const speciesId = searchParams.get("speciesId");

    if (!stateId || !speciesId) {
      return NextResponse.json(
        { error: "stateId and speciesId query params are required" },
        { status: 400 }
      );
    }

    // Fetch all units for this state + species
    const units = await getUnitsForState(stateId, speciesId);

    if (units.length === 0) {
      return NextResponse.json(
        { error: "No units found for this state/species combination" },
        { status: 404 }
      );
    }

    // Score each unit with draw history
    const scored = await Promise.all(
      units.map(async (unit) => {
        const historyRows = await getUnitDrawHistory(unit.id);
        const drawHistory: DrawHistoryEntry[] = historyRows.map((row) => ({
          year: row.year,
          applicants: row.applicants,
          tagsAvailable: row.tagsAvailable,
          tagsIssued: row.tagsIssued,
          oddsPercent: row.oddsPercent,
          minPointsDrawn: row.minPointsDrawn,
        }));

        const score = scoreUnit(unit, drawHistory, {});
        return { unit, score };
      })
    );

    // Sort by totalScore descending — pick best as suggestion
    scored.sort((a, b) => b.score.totalScore - a.score.totalScore);
    const top = scored[0];

    // Generate "why" bullets for the top suggestion
    const whyBullets: string[] = [];
    for (const factor of top.score.factors) {
      if (factor.score >= factor.maxScore * 0.7) {
        whyBullets.push(factor.explanation);
      }
    }

    // Find alternates for the top unit
    const alternates = findAlternateUnits(top.unit, units);

    return NextResponse.json({
      suggested: {
        unit: top.unit,
        score: top.score,
        whyBullets: whyBullets.slice(0, 4),
      },
      alternates,
    });
  } catch (err) {
    console.error("Goal suggestions error:", err);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
