import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getUnevaluatedBatches, evaluateStagingBatch } from "@/lib/engine/airlock-db";

/**
 * GET /api/cron/airlock-eval — Safety net cron for the Data Airlock.
 *
 * Runs 30 minutes after the scraper cron. Finds any staging batches where the
 * scraper webhook didn't fire (network issues, etc.) and evaluates them.
 *
 * Schedule: 6:30 AM UTC every Sunday (vercel.json)
 *
 * Protected by:
 *   1. Vercel CRON_SECRET (auto-injected by Vercel for cron routes)
 *   2. x-admin-key fallback for manual triggers
 */
export async function GET(request: NextRequest) {
  // --- Auth ---
  const cronSecret = process.env.CRON_SECRET;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = request.headers.get("authorization");
  const xAdminKey = request.headers.get("x-admin-key");

  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isAdminKey = adminKey && xAdminKey === adminKey;

  if (!isVercelCron && !isAdminKey) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const supabase = await createServerSupabase();
    const unevaluated = await getUnevaluatedBatches(supabase);

    if (unevaluated.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unevaluated staging batches found",
        evaluatedAt: new Date().toISOString(),
      });
    }

    const results: Array<{
      stateId: string;
      batchId: string;
      autoPromoted: boolean;
      verdict: string;
    }> = [];

    for (const batch of unevaluated) {
      try {
        const result = await evaluateStagingBatch(
          supabase,
          batch.stateId,
          batch.batchId,
        );
        results.push({
          stateId: batch.stateId,
          batchId: batch.batchId,
          autoPromoted: result.autoPromoted,
          verdict: result.verdict.overallVerdict,
        });
      } catch (err) {
        console.error(`[airlock-eval] Failed for ${batch.stateId}/${batch.batchId}:`, err);
        results.push({
          stateId: batch.stateId,
          batchId: batch.batchId,
          autoPromoted: false,
          verdict: `error: ${(err as Error).message}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Evaluated ${results.length} orphaned batches`,
      results,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[airlock-eval cron]", err);
    return NextResponse.json(
      { error: `Airlock eval failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
