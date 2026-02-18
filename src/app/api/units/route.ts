import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import type { Unit } from "@/lib/types";

/**
 * GET /api/units — List/search units with filters and pagination.
 *
 * Query params:
 *   stateId    — filter by state (e.g., "CO")
 *   speciesId  — filter by species (e.g., "elk")
 *   sortBy     — "trophy" | "success" | "points" | "pressure" (default: trophy)
 *   page       — 1-indexed page number (default: 1)
 *   pageSize   — results per page (default: 20, max 100)
 *   search     — free-text search on unit_code, unit_name, notes
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stateId = searchParams.get("stateId");
  const speciesId = searchParams.get("speciesId");
  const sortBy = searchParams.get("sortBy") ?? "trophy";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const search = searchParams.get("search");

  try {
    const supabase = await createServerSupabase();

    let query = supabase
      .from("ref_units")
      .select("*", { count: "exact" });

    if (stateId) query = query.eq("state_id", stateId);
    if (speciesId) query = query.eq("species_id", speciesId);
    if (search) {
      query = query.or(
        `unit_code.ilike.%${search}%,unit_name.ilike.%${search}%,notes.ilike.%${search}%`
      );
    }

    // Sort
    const sortMap: Record<string, { column: string; ascending: boolean }> = {
      trophy: { column: "trophy_rating", ascending: false },
      success: { column: "success_rate", ascending: false },
      points: { column: "points_required_nonresident", ascending: true },
      pressure: { column: "pressure_level", ascending: true },
    };
    const sort = sortMap[sortBy] ?? sortMap.trophy;
    query = query.order(sort.column, { ascending: sort.ascending });

    // Paginate
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, count, error } = await query;

    if (error || !data || data.length === 0) {
      // Fall back to constants
      let fallback = [...SAMPLE_UNITS];
      if (stateId) fallback = fallback.filter((u) => u.stateId === stateId);
      if (speciesId) fallback = fallback.filter((u) => u.speciesId === speciesId);
      if (search) {
        const q = search.toLowerCase();
        fallback = fallback.filter(
          (u) =>
            u.unitCode.toLowerCase().includes(q) ||
            u.unitName?.toLowerCase().includes(q) ||
            u.notes?.toLowerCase().includes(q)
        );
      }

      // Sort fallback
      fallback.sort((a, b) => {
        switch (sortBy) {
          case "success": return b.successRate - a.successRate;
          case "points": return a.pointsRequiredNonresident - b.pointsRequiredNonresident;
          default: return b.trophyRating - a.trophyRating;
        }
      });

      const total = fallback.length;
      const paged = fallback.slice(from, from + pageSize);

      return NextResponse.json({
        units: paged,
        total,
        page,
        pageSize,
        source: "constants",
      });
    }

    const units: Unit[] = data.map(mapDbRowToUnit);

    return NextResponse.json({
      units,
      total: count ?? units.length,
      page,
      pageSize,
      source: "database",
    });
  } catch {
    // Complete fallback
    let fallback = [...SAMPLE_UNITS];
    if (stateId) fallback = fallback.filter((u) => u.stateId === stateId);
    if (speciesId) fallback = fallback.filter((u) => u.speciesId === speciesId);

    return NextResponse.json({
      units: fallback.slice(0, pageSize),
      total: fallback.length,
      page: 1,
      pageSize,
      source: "constants",
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbRowToUnit(row: any): Unit {
  return {
    id: row.id,
    stateId: row.state_id,
    speciesId: row.species_id,
    unitCode: row.unit_code,
    unitName: row.unit_name ?? undefined,
    successRate: Number(row.success_rate) || 0,
    trophyRating: row.trophy_rating ?? 5,
    pointsRequiredResident: row.points_required_resident ?? 0,
    pointsRequiredNonresident: row.points_required_nonresident ?? 0,
    terrainType: row.terrain_type ?? [],
    pressureLevel: row.pressure_level ?? "Moderate",
    elevationRange: row.elevation_range ?? [0, 0],
    publicLandPct: Number(row.public_land_pct) || 0,
    tagQuotaNonresident: row.tag_quota_nonresident ?? 0,
    seasonDates: row.season_dates ?? undefined,
    notes: row.notes ?? undefined,
    tacticalNotes: row.tactical_notes ?? undefined,
    nearestAirport: row.nearest_airport ?? undefined,
    driveTimeFromAirport: row.drive_time_from_airport ?? undefined,
  };
}
