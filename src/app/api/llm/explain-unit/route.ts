import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { callClaude } from "@/lib/llm/client";
import { buildExplainUnitPrompt } from "@/lib/llm/prompts";
import { getCachedResponse, setCachedResponse, logLlmUsage } from "@/lib/llm/cache";
import { getUnitById, getUnitDrawHistory } from "@/lib/db/units";

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
    const { unitId, scoreFactors, experienceLevel, huntStyle, existingPoints } = body;

    if (!unitId) {
      return NextResponse.json({ error: "unitId required" }, { status: 400 });
    }

    // Check cache first
    const cacheParams = { unitId, experienceLevel, huntStyle, existingPoints };
    const cached = await getCachedResponse("explain_unit", cacheParams);
    if (cached) {
      return NextResponse.json({ narrative: cached, cached: true });
    }

    // Fetch unit data
    const unit = await getUnitById(unitId);
    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    const drawHistory = await getUnitDrawHistory(unitId);

    // Build prompt
    const prompt = buildExplainUnitPrompt(
      unit,
      drawHistory.map((d) => ({
        year: d.year,
        applicants: d.applicants ?? 0,
        tags: d.tagsIssued ?? 0,
        odds: d.oddsPercent ? d.oddsPercent / 100 : 0,
        minPointsDrawn: d.minPointsDrawn ?? null,
      })),
      scoreFactors ?? [],
      { experienceLevel, huntStyle, existingPoints }
    );

    // Call LLM
    const response = await callClaude([{ role: "user", content: prompt }]);

    if (!response) {
      return NextResponse.json({ narrative: null, error: "LLM unavailable" });
    }

    // Cache and log
    await setCachedResponse("explain_unit", cacheParams, response.text, response.model, response.tokensUsed);
    await logLlmUsage(user.id, "explain_unit", response.tokensUsed);

    return NextResponse.json({ narrative: response.text, cached: false });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate narrative" },
      { status: 500 }
    );
  }
}
