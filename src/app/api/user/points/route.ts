import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * GET /api/user/points — Fetch user's points from DB for hydration.
 * POST /api/user/points — Sync user points to DB.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_points")
      .select("*")
      .eq("user_id", user.id)
      .order("state_id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const points = (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      stateId: row.state_id,
      speciesId: row.species_id,
      points: row.points,
      pointType: row.point_type,
      yearStarted: row.year_started,
    }));

    return NextResponse.json({ points });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch points" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { points } = body;

    if (!Array.isArray(points)) {
      return NextResponse.json(
        { error: "points must be an array" },
        { status: 400 }
      );
    }

    // Upsert all points
    const upsertData = points.map(
      (p: {
        stateId: string;
        speciesId: string;
        points: number;
        pointType: string;
        yearStarted?: number;
      }) => ({
        user_id: user.id,
        state_id: p.stateId,
        species_id: p.speciesId,
        points: p.points,
        point_type: p.pointType ?? "preference",
        year_started: p.yearStarted ?? null,
        updated_at: new Date().toISOString(),
      })
    );

    const { error } = await supabase
      .from("user_points")
      .upsert(upsertData, {
        onConflict: "user_id,state_id,species_id,point_type",
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ synced: upsertData.length });
  } catch {
    return NextResponse.json(
      { error: "Failed to sync points" },
      { status: 500 }
    );
  }
}
