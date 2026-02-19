import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * GET /api/admin/scraper-status — Operational visibility for scraper infrastructure.
 *
 * Returns per-state scraper status: last run time, rows imported, errors,
 * staleness (days since last scrape), and aggregate health metrics.
 *
 * Protected by x-admin-key header matching SUPABASE_SERVICE_ROLE_KEY.
 */

interface StateStatus {
  stateId: string;
  lastRunAt: string | null;
  rowsImported: number;
  errors: string[];
  daysSinceLastRun: number | null;
  isStale: boolean; // > 20 days since last run
}

export async function GET(request: NextRequest) {
  // Auth
  const adminKey = request.headers.get("x-admin-key");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || adminKey !== serviceKey) {
    return NextResponse.json(
      { error: "Unauthorized — invalid admin key" },
      { status: 401 }
    );
  }

  try {
    const supabase = await createServerSupabase();

    // Query data_import_log for latest run per state
    const { data: logs, error } = await supabase
      .from("data_import_log")
      .select("*")
      .eq("import_type", "scraper")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json(
        { error: `DB query failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Group by state_id — take the most recent entry per state
    const byState = new Map<string, typeof logs[number]>();
    for (const log of logs ?? []) {
      const sid = log.state_id;
      if (sid && !byState.has(sid)) {
        byState.set(sid, log);
      }
    }

    const now = Date.now();
    const STALE_THRESHOLD_DAYS = 20; // Cron runs every 15 days, 20 = buffer

    const allStates = [
      "CO", "WY", "MT", "NV", "AZ", "UT", "NM", "OR", "ID", "KS", "AK",
      "WA", "NE", "SD", "ND",
    ];

    const stateStatuses: StateStatus[] = allStates.map((stateId) => {
      const log = byState.get(stateId);
      if (!log) {
        return {
          stateId,
          lastRunAt: null,
          rowsImported: 0,
          errors: [],
          daysSinceLastRun: null,
          isStale: true,
        };
      }

      const lastRunAt = log.created_at;
      const daysSinceLastRun = lastRunAt
        ? Math.round((now - new Date(lastRunAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        stateId,
        lastRunAt,
        rowsImported: log.rows_imported ?? 0,
        errors: Array.isArray(log.errors) ? log.errors as string[] : [],
        daysSinceLastRun,
        isStale: daysSinceLastRun === null || daysSinceLastRun > STALE_THRESHOLD_DAYS,
      };
    });

    // Aggregate stats
    const statesWithData = stateStatuses.filter((s) => s.lastRunAt !== null).length;
    const statesWithErrors = stateStatuses.filter((s) => s.errors.length > 0).length;
    const staleStates = stateStatuses.filter((s) => s.isStale).length;
    const totalRowsImported = stateStatuses.reduce((sum, s) => sum + s.rowsImported, 0);
    const lastFullRun = stateStatuses
      .filter((s) => s.lastRunAt)
      .sort((a, b) => new Date(b.lastRunAt!).getTime() - new Date(a.lastRunAt!).getTime())[0]?.lastRunAt ?? null;

    return NextResponse.json({
      summary: {
        totalStates: allStates.length,
        statesWithData,
        statesWithErrors,
        staleStates,
        totalRowsImported,
        lastFullRun,
        checkedAt: new Date().toISOString(),
      },
      states: stateStatuses,
    });
  } catch (err) {
    console.error("Scraper status error:", err);
    return NextResponse.json(
      { error: "Failed to fetch scraper status" },
      { status: 500 }
    );
  }
}
