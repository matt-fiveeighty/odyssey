import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getUnitsForState } from "@/lib/db/units";
import { getStateById } from "@/lib/db/states";
import { calculateUnlockHorizons } from "@/lib/engine/unlock-horizon";

/**
 * POST /api/points/unlock-preview — Calculate unlock horizons for a
 * state/species based on user's current points.
 *
 * Auth required.
 *
 * Body: { stateId, speciesId, currentPoints }
 * Returns: { horizons: { thisYear, shortTerm, midTerm, longTerm } }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth required
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { stateId, speciesId, currentPoints } = body;

    if (!stateId || !speciesId) {
      return NextResponse.json(
        { error: "stateId and speciesId are required" },
        { status: 400 }
      );
    }

    const points =
      typeof currentPoints === "number" ? currentPoints : 0;

    // Fetch units for this state + species
    const units = await getUnitsForState(stateId, speciesId);

    if (units.length === 0) {
      return NextResponse.json(
        { error: "No units found for this state/species combination" },
        { status: 404 }
      );
    }

    // Fetch the state to get its point system type
    const state = await getStateById(stateId);
    const pointSystem = state?.pointSystem ?? "preference";

    // Calculate horizons
    const horizons = calculateUnlockHorizons(units, points, pointSystem);

    return NextResponse.json({ horizons });
  } catch (err) {
    console.error("Unlock preview error:", err);
    return NextResponse.json(
      { error: "Failed to calculate unlock horizons" },
      { status: 500 }
    );
  }
}
