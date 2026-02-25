import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * GET /api/admin/airlock/queue
 *
 * Returns airlock queue entries, optionally filtered by status.
 * Powers the Quarantine Dashboard.
 *
 * Query params: ?status=quarantined (optional — omit for all entries)
 * Auth: x-admin-key header matching SUPABASE_SERVICE_ROLE_KEY
 */
export async function GET(request: NextRequest) {
  const adminKey = request.headers.get("x-admin-key");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || adminKey !== serviceKey) {
    return NextResponse.json(
      { error: "Unauthorized — invalid admin key" },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status");

    const supabase = await createServerSupabase();

    let query = supabase
      .from("airlock_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `DB query failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Also pull recent audit log entries
    const { data: auditLog } = await supabase
      .from("airlock_audit_log")
      .select("*")
      .order("promoted_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      queue: data ?? [],
      auditLog: auditLog ?? [],
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[airlock/queue]", err);
    return NextResponse.json(
      { error: `Queue fetch failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
