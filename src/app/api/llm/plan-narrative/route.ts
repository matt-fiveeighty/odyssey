import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { callClaude } from "@/lib/llm/client";
import { buildPlanNarrativePrompt } from "@/lib/llm/prompts";
import { getCachedResponse, setCachedResponse, logLlmUsage } from "@/lib/llm/cache";

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
    const { planItems, year } = body;

    if (!Array.isArray(planItems) || !year) {
      return NextResponse.json(
        { error: "planItems array and year required" },
        { status: 400 }
      );
    }

    const cacheParams = { userId: user.id, year, itemCount: planItems.length };
    const cached = await getCachedResponse("plan_narrative", cacheParams);
    if (cached) {
      return NextResponse.json({ narrative: cached, cached: true });
    }

    const prompt = buildPlanNarrativePrompt(planItems, year);
    const response = await callClaude([{ role: "user", content: prompt }]);

    if (!response) {
      return NextResponse.json({ narrative: null, error: "LLM unavailable" });
    }

    await setCachedResponse("plan_narrative", cacheParams, response.text, response.model, response.tokensUsed);
    await logLlmUsage(user.id, "plan_narrative", response.tokensUsed);

    return NextResponse.json({ narrative: response.text, cached: false });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate narrative" },
      { status: 500 }
    );
  }
}
