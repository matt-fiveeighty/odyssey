import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * POST /api/admin/import/units — Bulk upsert units into ref_units.
 *
 * Service role only: requires x-admin-key header matching SUPABASE_SERVICE_ROLE_KEY.
 *
 * Body: {
 *   units: Array<{ stateId, speciesId, unitCode, unitName, successRate, trophyRating, ...rest }>,
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
    const { units, source } = body;

    if (!Array.isArray(units) || units.length === 0) {
      return NextResponse.json(
        { error: "units must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!source || typeof source !== "string") {
      return NextResponse.json(
        { error: "source is required (e.g. 'co_cpw_2025')" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Map camelCase input to snake_case DB schema
    const rows = units.map(
      (u: {
        stateId: string;
        speciesId: string;
        unitCode: string;
        unitName?: string;
        successRate?: number;
        trophyRating?: number;
        pointsRequiredResident?: number;
        pointsRequiredNonresident?: number;
        terrainType?: string[];
        pressureLevel?: string;
        elevationRange?: number[];
        publicLandPct?: number;
        tagQuotaNonresident?: number;
        seasonDates?: Record<string, { start: string; end: string }>;
        notes?: string;
        tacticalNotes?: Record<string, unknown>;
        nearestAirport?: string;
        driveTimeFromAirport?: string;
        sourceUrl?: string;
      }) => ({
        state_id: u.stateId,
        species_id: u.speciesId,
        unit_code: u.unitCode,
        unit_name: u.unitName ?? null,
        success_rate: u.successRate ?? null,
        trophy_rating: u.trophyRating ?? null,
        points_required_resident: u.pointsRequiredResident ?? 0,
        points_required_nonresident: u.pointsRequiredNonresident ?? 0,
        terrain_type: u.terrainType ?? [],
        pressure_level: u.pressureLevel ?? "Moderate",
        elevation_range: u.elevationRange ?? [0, 0],
        public_land_pct: u.publicLandPct ?? null,
        tag_quota_nonresident: u.tagQuotaNonresident ?? null,
        season_dates: u.seasonDates ?? null,
        notes: u.notes ?? null,
        tactical_notes: u.tacticalNotes ?? null,
        nearest_airport: u.nearestAirport ?? null,
        drive_time_from_airport: u.driveTimeFromAirport ?? null,
        source_url: u.sourceUrl ?? null,
        source_pulled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    );

    const { error } = await supabase
      .from("ref_units")
      .upsert(rows, {
        onConflict: "state_id,species_id,unit_code",
      });

    if (error) {
      console.error("Admin unit import upsert error:", error.message);
      return NextResponse.json(
        { error: `Upsert failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Log the import
    await supabase.from("data_import_log").insert({
      source,
      table_name: "ref_units",
      rows_affected: rows.length,
      imported_at: new Date().toISOString(),
    });

    return NextResponse.json({ imported: rows.length });
  } catch (err) {
    console.error("Admin unit import error:", err);
    return NextResponse.json(
      { error: "Failed to import units" },
      { status: 500 }
    );
  }
}
