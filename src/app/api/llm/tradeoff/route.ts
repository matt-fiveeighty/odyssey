import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { callClaude } from "@/lib/llm/client";
import { buildTradeoffPrompt } from "@/lib/llm/prompts";
import { getCachedResponse, setCachedResponse, logLlmUsage } from "@/lib/llm/cache";
import { getUnitById } from "@/lib/db/units";

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
    const { primaryUnitId, alternateUnitId, tradeoffType, tradeoffSummary } = body;

    if (!primaryUnitId || !alternateUnitId) {
      return NextResponse.json(
        { error: "primaryUnitId and alternateUnitId required" },
        { status: 400 }
      );
    }

    // Check cache
    const cacheParams = { primaryUnitId, alternateUnitId, tradeoffType };
    const cached = await getCachedResponse("tradeoff", cacheParams);
    if (cached) {
      return NextResponse.json({ narrative: cached, cached: true });
    }

    const [primaryUnit, alternateUnit] = await Promise.all([
      getUnitById(primaryUnitId),
      getUnitById(alternateUnitId),
    ]);

    if (!primaryUnit || !alternateUnit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    const prompt = buildTradeoffPrompt(
      primaryUnit,
      alternateUnit,
      tradeoffType ?? "general",
      tradeoffSummary ?? ""
    );

    const response = await callClaude([{ role: "user", content: prompt }]);

    if (!response) {
      return NextResponse.json({ narrative: null, error: "LLM unavailable" });
    }

    await setCachedResponse("tradeoff", cacheParams, response.text, response.model, response.tokensUsed);
    await logLlmUsage(user.id, "tradeoff", response.tokensUsed);

    return NextResponse.json({ narrative: response.text, cached: false });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate narrative" },
      { status: 500 }
    );
  }
}
