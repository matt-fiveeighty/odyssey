import { createServerSupabase } from "@/lib/supabase/server";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import type {
  Unit,
  TerrainType,
  PressureLevel,
  UnitTacticalNotes,
} from "@/lib/types";

// ============================================================================
// DB Row Types
// ============================================================================

interface RefUnitRow {
  id: string;
  state_id: string;
  species_id: string;
  unit_code: string;
  unit_name: string | null;
  success_rate: number | null;
  trophy_rating: number | null;
  points_required_resident: number;
  points_required_nonresident: number;
  terrain_type: string[];
  pressure_level: string | null;
  elevation_range: number[];
  public_land_pct: number | null;
  tag_quota_nonresident: number | null;
  season_dates: Record<string, { start: string; end: string }> | null;
  notes: string | null;
  tactical_notes: UnitTacticalNotes | null;
  nearest_airport: string | null;
  drive_time_from_airport: string | null;
  source_url: string | null;
  source_pulled_at: string | null;
  updated_at: string;
}

export interface DrawHistoryRow {
  id: string;
  unitId: string;
  year: number;
  applicants: number | null;
  tagsAvailable: number | null;
  tagsIssued: number | null;
  oddsPercent: number | null;
  residentApplicants: number | null;
  nonresidentApplicants: number | null;
  minPointsDrawn: number | null;
  sourceUrl: string | null;
  sourcePulledAt: string | null;
}

interface RefDrawHistoryRow {
  id: string;
  unit_id: string;
  year: number;
  applicants: number | null;
  tags_available: number | null;
  tags_issued: number | null;
  odds_percent: number | null;
  resident_applicants: number | null;
  nonresident_applicants: number | null;
  min_points_drawn: number | null;
  source_url: string | null;
  source_pulled_at: string | null;
}

export interface UnitSearchFilters {
  stateId?: string;
  speciesId?: string;
  sortBy?: "trophy" | "success" | "points" | "pressure";
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Row Mapping
// ============================================================================

function mapRowToUnit(row: RefUnitRow): Unit {
  return {
    id: row.id,
    stateId: row.state_id,
    speciesId: row.species_id,
    unitCode: row.unit_code,
    unitName: row.unit_name ?? undefined,
    successRate: row.success_rate ?? 0,
    trophyRating: row.trophy_rating ?? 0,
    pointsRequiredResident: row.points_required_resident ?? 0,
    pointsRequiredNonresident: row.points_required_nonresident ?? 0,
    terrainType: (row.terrain_type ?? []) as TerrainType[],
    pressureLevel: (row.pressure_level ?? "Moderate") as PressureLevel,
    elevationRange: (row.elevation_range?.length === 2
      ? row.elevation_range
      : [0, 0]) as [number, number],
    publicLandPct: row.public_land_pct ?? 0,
    tagQuotaNonresident: row.tag_quota_nonresident ?? 0,
    seasonDates: row.season_dates ?? undefined,
    notes: row.notes ?? undefined,
    tacticalNotes: row.tactical_notes ?? undefined,
    nearestAirport: row.nearest_airport ?? undefined,
    driveTimeFromAirport: row.drive_time_from_airport ?? undefined,
  };
}

function mapDrawHistoryRow(row: RefDrawHistoryRow): DrawHistoryRow {
  return {
    id: row.id,
    unitId: row.unit_id,
    year: row.year,
    applicants: row.applicants,
    tagsAvailable: row.tags_available,
    tagsIssued: row.tags_issued,
    oddsPercent: row.odds_percent,
    residentApplicants: row.resident_applicants,
    nonresidentApplicants: row.nonresident_applicants,
    minPointsDrawn: row.min_points_drawn,
    sourceUrl: row.source_url,
    sourcePulledAt: row.source_pulled_at,
  };
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Fetch units for a given state, optionally filtered by species.
 * Falls back to SAMPLE_UNITS if the query fails or returns empty.
 */
export async function getUnitsForState(
  stateId: string,
  speciesId?: string
): Promise<Unit[]> {
  try {
    const supabase = await createServerSupabase();
    let query = supabase
      .from("ref_units")
      .select("*")
      .eq("state_id", stateId);

    if (speciesId) {
      query = query.eq("species_id", speciesId);
    }

    query = query.order("unit_code");

    const { data, error } = await query;

    if (error) {
      console.error("[db/units] getUnitsForState error:", error.message);
      return fallbackUnitsForState(stateId, speciesId);
    }

    if (!data || data.length === 0) {
      return fallbackUnitsForState(stateId, speciesId);
    }

    return (data as unknown as RefUnitRow[]).map(mapRowToUnit);
  } catch (err) {
    console.error("[db/units] getUnitsForState unexpected error:", err);
    return fallbackUnitsForState(stateId, speciesId);
  }
}

function fallbackUnitsForState(stateId: string, speciesId?: string): Unit[] {
  return SAMPLE_UNITS.filter(
    (u) => u.stateId === stateId && (!speciesId || u.speciesId === speciesId)
  );
}

/**
 * Fetch a single unit by its UUID.
 * Falls back to SAMPLE_UNITS lookup.
 */
export async function getUnitById(unitId: string): Promise<Unit | null> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("ref_units")
      .select("*")
      .eq("id", unitId)
      .single();

    if (error) {
      console.error("[db/units] getUnitById error:", error.message);
      return SAMPLE_UNITS.find((u) => u.id === unitId) ?? null;
    }

    if (!data) {
      return SAMPLE_UNITS.find((u) => u.id === unitId) ?? null;
    }

    return mapRowToUnit(data as unknown as RefUnitRow);
  } catch (err) {
    console.error("[db/units] getUnitById unexpected error:", err);
    return SAMPLE_UNITS.find((u) => u.id === unitId) ?? null;
  }
}

/**
 * Fetch draw history records for a given unit.
 * Returns empty array if query fails.
 */
export async function getUnitDrawHistory(
  unitId: string
): Promise<DrawHistoryRow[]> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("ref_unit_draw_history")
      .select("*")
      .eq("unit_id", unitId)
      .order("year", { ascending: false });

    if (error) {
      console.error("[db/units] getUnitDrawHistory error:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return (data as unknown as RefDrawHistoryRow[]).map(mapDrawHistoryRow);
  } catch (err) {
    console.error("[db/units] getUnitDrawHistory unexpected error:", err);
    return [];
  }
}

/**
 * Search units with filters, sorting, and pagination.
 * Falls back to filtered SAMPLE_UNITS.
 */
export async function searchUnits(
  filters: UnitSearchFilters
): Promise<{ units: Unit[]; total: number }> {
  const {
    stateId,
    speciesId,
    sortBy = "trophy",
    page = 1,
    pageSize = 20,
  } = filters;

  try {
    const supabase = await createServerSupabase();
    let query = supabase.from("ref_units").select("*", { count: "exact" });

    if (stateId) {
      query = query.eq("state_id", stateId);
    }
    if (speciesId) {
      query = query.eq("species_id", speciesId);
    }

    // Apply sorting
    switch (sortBy) {
      case "trophy":
        query = query.order("trophy_rating", { ascending: false });
        break;
      case "success":
        query = query.order("success_rate", { ascending: false });
        break;
      case "points":
        query = query.order("points_required_nonresident", { ascending: true });
        break;
      case "pressure":
        query = query.order("pressure_level", { ascending: true });
        break;
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[db/units] searchUnits error:", error.message);
      return fallbackSearch(filters);
    }

    if (!data || data.length === 0) {
      return fallbackSearch(filters);
    }

    return {
      units: (data as unknown as RefUnitRow[]).map(mapRowToUnit),
      total: count ?? data.length,
    };
  } catch (err) {
    console.error("[db/units] searchUnits unexpected error:", err);
    return fallbackSearch(filters);
  }
}

function fallbackSearch(
  filters: UnitSearchFilters
): { units: Unit[]; total: number } {
  const {
    stateId,
    speciesId,
    sortBy = "trophy",
    page = 1,
    pageSize = 20,
  } = filters;

  const filtered = SAMPLE_UNITS.filter(
    (u) =>
      (!stateId || u.stateId === stateId) &&
      (!speciesId || u.speciesId === speciesId)
  );

  // Sort
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "trophy":
        return b.trophyRating - a.trophyRating;
      case "success":
        return b.successRate - a.successRate;
      case "points":
        return a.pointsRequiredNonresident - b.pointsRequiredNonresident;
      case "pressure": {
        const order: Record<string, number> = { Low: 0, Moderate: 1, High: 2 };
        return (order[a.pressureLevel] ?? 1) - (order[b.pressureLevel] ?? 1);
      }
      default:
        return 0;
    }
  });

  const total = filtered.length;
  const from = (page - 1) * pageSize;
  const paged = filtered.slice(from, from + pageSize);

  return { units: paged, total };
}
