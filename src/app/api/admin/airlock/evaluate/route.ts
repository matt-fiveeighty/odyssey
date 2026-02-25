import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { evaluateStagingBatch } from "@/lib/engine/airlock-db";

/**
 * POST /api/admin/airlock/evaluate
 *
 * Evaluate a staging batch through the data airlock.
 * Called by the scraper webhook after each state completes, or manually from the dashboard.
 *
 * Body: { stateId: string, batchId: string }
 * Auth: x-admin-key header matching SUPABASE_SERVICE_ROLE_KEY
 */
export async function POST(request: NextRequest) {
  const adminKey = request.headers.get("x-admin-key");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || adminKey !== serviceKey) {
    return NextResponse.json(
      { error: "Unauthorized — invalid admin key" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { stateId, batchId } = body as { stateId?: string; batchId?: string };

    if (!stateId || !batchId) {
      return NextResponse.json(
        { error: "Missing required fields: stateId, batchId" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();
    const result = await evaluateStagingBatch(supabase, stateId, batchId);

    return NextResponse.json({
      ok: true,
      stateId,
      batchId,
      queueId: result.queueId,
      autoPromoted: result.autoPromoted,
      verdict: {
        overallVerdict: result.verdict.overallVerdict,
        blockCount: result.verdict.blockCount,
        warnCount: result.verdict.warnCount,
        passCount: result.verdict.passCount,
        summary: result.verdict.summary,
      },
    });
  } catch (err) {
    console.error("[airlock/evaluate]", err);
    return NextResponse.json(
      { error: `Evaluation failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
