import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { promoteScrapedBatch } from "@/lib/engine/airlock-db";

/**
 * POST /api/admin/airlock/approve
 *
 * Approve a quarantined batch — promote its staging rows to 'approved'
 * and sync fees to ref_states.
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
        { error: `Cannot approve entry with status '${entry.status}' — must be 'quarantined'` },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // Promote the batch
    await promoteScrapedBatch(supabase, entry.scrape_batch_id, entry.state_id);

    // Update queue entry
    await supabase
      .from("airlock_queue")
      .update({
        status: "approved",
        resolved_at: now,
        resolved_by: "admin",
        resolution_notes: notes ?? null,
      })
      .eq("id", queueId);

    // Log to audit
    await supabase.from("airlock_audit_log").insert({
      queue_id: queueId,
      state_id: entry.state_id,
      action: "manual_approve",
      diffs_promoted: entry.diffs_json,
      promoted_by: "admin",
    });

    return NextResponse.json({
      ok: true,
      queueId,
      stateId: entry.state_id,
      promotedAt: now,
    });
  } catch (err) {
    console.error("[airlock/approve]", err);
    return NextResponse.json(
      { error: `Approval failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
