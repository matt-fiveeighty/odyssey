import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { rejectScrapedBatch } from "@/lib/engine/airlock-db";

/**
 * POST /api/admin/airlock/reject
 *
 * Reject a quarantined batch — mark staging rows as 'rejected'.
 *
 * Body: { queueId: string, notes?: string }
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
    const { queueId, notes } = body as { queueId?: string; notes?: string };

    if (!queueId) {
      return NextResponse.json(
        { error: "Missing required field: queueId" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Load the queue entry
    const { data: entry, error: fetchErr } = await supabase
      .from("airlock_queue")
      .select("*")
      .eq("id", queueId)
      .single();

    if (fetchErr || !entry) {
      return NextResponse.json(
        { error: "Queue entry not found" },
        { status: 404 }
      );
    }

    if (entry.status !== "quarantined") {
      return NextResponse.json(
        { error: `Cannot reject entry with status '${entry.status}' — must be 'quarantined'` },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // Reject the batch
    await rejectScrapedBatch(supabase, entry.scrape_batch_id);

    // Update queue entry
    await supabase
      .from("airlock_queue")
      .update({
        status: "rejected",
        resolved_at: now,
        resolved_by: "admin",
        resolution_notes: notes ?? null,
      })
      .eq("id", queueId);

    // Log to audit
    await supabase.from("airlock_audit_log").insert({
      queue_id: queueId,
      state_id: entry.state_id,
      action: "reject",
      diffs_promoted: null,
      promoted_by: "admin",
    });

    return NextResponse.json({
      ok: true,
      queueId,
      stateId: entry.state_id,
      rejectedAt: now,
    });
  } catch (err) {
    console.error("[airlock/reject]", err);
    return NextResponse.json(
      { error: `Rejection failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
