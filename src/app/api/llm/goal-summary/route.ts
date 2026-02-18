import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { callClaude } from "@/lib/llm/client";
import { buildGoalSummaryPrompt } from "@/lib/llm/prompts";
import { getCachedResponse, setCachedResponse, logLlmUsage } from "@/lib/llm/cache";
import { getUnitsForState } from "@/lib/db/units";
import { estimateCreepRate, yearsToDrawWithCreep } from "@/lib/engine/point-creep";

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
    const { stateId, speciesId, targetYear, notes, currentPoints } = body;

    if (!stateId || !speciesId) {
      return NextResponse.json(
        { error: "stateId and speciesId required" },
        { status: 400 }
      );
    }

    const cacheParams = { stateId, speciesId, currentPoints: currentPoints ?? 0 };
    const cached = await getCachedResponse("goal_summary", cacheParams);
    if (cached) {
      return NextResponse.json({ narrative: cached, cached: true });
    }

    // Find best unit for this state/species
    const units = await getUnitsForState(stateId, speciesId);
    if (units.length === 0) {
      return NextResponse.json({ narrative: null, error: "No units found" });
    }

    // Pick the best unit (highest trophy + success composite)
    const scored = units.map((u) => ({
      unit: u,
      score: u.successRate * 40 + (u.trophyRating / 10) * 40 + u.publicLandPct * 20,
    }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].unit;

    const creepRate = estimateCreepRate(best.trophyRating);
    const yearsToUnlock = yearsToDrawWithCreep(
      currentPoints ?? 0,
      best.pointsRequiredNonresident,
      creepRate
    );

    const prompt = buildGoalSummaryPrompt(
      { stateId, speciesId, targetYear, notes },
      best,
      yearsToUnlock,
      currentPoints ?? 0
    );

    const response = await callClaude([{ role: "user", content: prompt }]);

    if (!response) {
      return NextResponse.json({ narrative: null, error: "LLM unavailable" });
    }

    await setCachedResponse("goal_summary", cacheParams, response.text, response.model, response.tokensUsed);
    await logLlmUsage(user.id, "goal_summary", response.tokensUsed);

    return NextResponse.json({ narrative: response.text, cached: false });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate narrative" },
      { status: 500 }
    );
  }
}
