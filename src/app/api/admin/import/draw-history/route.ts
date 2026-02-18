import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * POST /api/admin/import/draw-history — Bulk upsert draw history entries.
 *
 * Service role only: requires x-admin-key header matching SUPABASE_SERVICE_ROLE_KEY.
 *
 * Body: {
 *   entries: Array<{ unitId, year, applicants, tags, odds, minPointsDrawn }>,
 *   source: string
 * }
 *
 * Returns: { imported: number }
 */
export async function POST(request: NextRequest) {
  // Auth: verify admin key
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
    const { entries, source } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "entries must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!source || typeof source !== "string") {
      return NextResponse.json(
        { error: "source is required (e.g. 'co_cpw_draw_2024')" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Map camelCase input to snake_case DB schema
    const rows = entries.map(
      (e: {
        unitId: string;
        year: number;
        applicants?: number;
        tags?: number;
        tagsIssued?: number;
        odds?: number;
        minPointsDrawn?: number;
        residentApplicants?: number;
        nonresidentApplicants?: number;
        sourceUrl?: string;
      }) => ({
        unit_id: e.unitId,
        year: e.year,
        applicants: e.applicants ?? null,
        tags_available: e.tags ?? null,
        tags_issued: e.tagsIssued ?? null,
        odds_percent: e.odds ?? null,
        min_points_drawn: e.minPointsDrawn ?? null,
        resident_applicants: e.residentApplicants ?? null,
        nonresident_applicants: e.nonresidentApplicants ?? null,
        source_url: e.sourceUrl ?? null,
        source_pulled_at: new Date().toISOString(),
      })
    );

    const { error } = await supabase
      .from("ref_unit_draw_history")
      .upsert(rows, {
        onConflict: "unit_id,year",
      });

    if (error) {
      console.error("Admin draw history import upsert error:", error.message);
      return NextResponse.json(
        { error: `Upsert failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Log the import
    await supabase.from("data_import_log").insert({
      source,
      table_name: "ref_unit_draw_history",
      rows_affected: rows.length,
      imported_at: new Date().toISOString(),
    });

    return NextResponse.json({ imported: rows.length });
  } catch (err) {
    console.error("Admin draw history import error:", err);
    return NextResponse.json(
      { error: "Failed to import draw history" },
      { status: 500 }
    );
  }
}
