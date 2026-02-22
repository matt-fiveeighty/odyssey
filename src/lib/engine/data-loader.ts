/**
 * Data Loader — Three-tier data resolution for the engine's DataContext.
 *
 * Resolution chain:
 *   Tier 1 (live):      Supabase scrape → merge with constants → cache to Redis
 *   Tier 2 (cached):    Redis last-known-good → merge with constants
 *   Tier 3 (fallback):  Hardcoded constants only
 *
 * The app always renders with reasonable data regardless of which external
 * services are available. Successful Supabase loads are cached to Redis so
 * a subsequent Supabase outage serves recent data instead of stale constants.
 *
 * Usage:
 *   - Server-side: Call from API routes or server components
 *   - Client-side: Call once on app load (after auth check)
 */

import { createClient } from "@supabase/supabase-js";
import { setDataContext, resetDataContext } from "./roadmap-generator";
import { cacheGet, cacheSet } from "@/lib/redis";
import { STATES } from "@/lib/constants/states";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import type { State, Unit } from "@/lib/types";
import { logger } from "@/lib/utils";

// Cache to avoid redundant DB queries within the same process
let _lastLoadedAt: number | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Redis cache keys for three-tier resolution
const CACHE_KEY_UNITS = "data:units:latest";
const CACHE_KEY_DEADLINES = "data:deadlines:latest";
const CACHE_KEY_TTL = 24 * 60 * 60; // 24 hours — longer than the 5min in-memory cache, shorter than scrape cadence

// Concurrent request deduplication — prevents double-load from
// simultaneous preview + full generation calls
let _pendingLoad: Promise<void> | null = null;

// Data source tracking for staleness indicators
let _dataSource: "db" | "cache" | "constants" = "constants";
let _dbUnitCount = 0;
let _dbDeadlineCount = 0;

/** Staleness threshold aligned with weekly crawl cadence + buffer */
export const STALE_THRESHOLD_DAYS = 10;

export interface DataStatus {
  source: "db" | "cache" | "constants";
  /** Which resolution tier provided the data: 1=Supabase, 2=Redis cache, 3=constants */
  tier: 1 | 2 | 3;
  lastLoadedAt: number | null;
  staleMinutes: number | null;
  dbUnitCount: number;
  dbDeadlineCount: number;
  isUsingConstants: boolean;
  /** Whether the overall data context is stale (>10 days since last scrape) */
  isStale: boolean;
  /** Days since last data load, or null if never loaded */
  staleDays: number | null;
}

/**
 * Returns metadata about the current data context.
 * Components can use this to show staleness warnings.
 */
export function getDataStatus(): DataStatus {
  // For cache tier, use the cached scrape timestamp if available
  const referenceTime = _dataSource === "cache" && _cachedScrapeTimestamp
    ? _cachedScrapeTimestamp
    : _lastLoadedAt;

  const staleMinutes = referenceTime
    ? Math.round((Date.now() - referenceTime) / 60_000)
    : null;
  const staleDays = staleMinutes !== null ? Math.floor(staleMinutes / (60 * 24)) : null;

  const tier: 1 | 2 | 3 = _dataSource === "db" ? 1 : _dataSource === "cache" ? 2 : 3;

  return {
    source: _dataSource,
    tier,
    lastLoadedAt: _lastLoadedAt,
    staleMinutes,
    dbUnitCount: _dbUnitCount,
    dbDeadlineCount: _dbDeadlineCount,
    isUsingConstants: _dataSource === "constants",
    // Cache tier without a scrape timestamp is conservatively marked stale
    isStale: _dataSource === "cache" && !_cachedScrapeTimestamp
      ? true
      : staleDays === null || staleDays > STALE_THRESHOLD_DAYS,
    staleDays,
  };
}

/**
 * Load data via three-tier resolution: Supabase > Redis cache > constants.
 *
 * Safe to call repeatedly; results are cached in-memory for 5 minutes.
 * Each tier falls through to the next on failure. Never throws.
 */
export async function loadDataContext(): Promise<void> {
  // Check cache
  if (_lastLoadedAt && Date.now() - _lastLoadedAt < CACHE_TTL_MS) {
    return; // Still fresh
  }

  // Deduplicate concurrent calls — if a load is already in flight, piggyback on it
  if (_pendingLoad) {
    return _pendingLoad;
  }

  _pendingLoad = _loadDataContextInner();
  try {
    await _pendingLoad;
  } finally {
    _pendingLoad = null;
  }
}

// Cached scrape timestamp — used by getDataStatus for cache-tier staleness
let _cachedScrapeTimestamp: number | null = null;

async function _loadDataContextInner(): Promise<void> {
  // --- Tier 1: Try Supabase (live scrape) ---
  const tier1Success = await _tryLoadFromSupabase();
  if (tier1Success) return;

  // --- Tier 2: Try Redis cache (last-known-good) ---
  const tier2Success = await _tryLoadFromCache();
  if (tier2Success) return;

  // --- Tier 3: Hardcoded constants (always available) ---
  logger.warn("[data-loader] Tier 3: Falling back to hardcoded constants");
  _dataSource = "constants";
  _dbUnitCount = 0;
  _dbDeadlineCount = 0;
  _cachedScrapeTimestamp = null;
  resetDataContext();
}

/**
 * Tier 1: Attempt to load data from Supabase.
 * On success, caches the result to Redis (fire-and-forget) and returns true.
 * On failure, returns false so the caller can try the next tier.
 */
async function _tryLoadFromSupabase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // No Supabase credentials — skip to next tier (normal for local dev)
    return false;
  }

  try {
    const supabase = createClient(url, key);

    // --- Fetch scraped units ---
    const { data: dbUnits, error: unitsError } = await supabase
      .from("ref_units")
      .select("*")
      .order("state_id")
      .limit(5000);

    if (unitsError) {
      logger.warn("[data-loader] Tier 1: ref_units query failed:", unitsError.message);
      return false;
    }

    // --- Fetch scraped deadlines for merging into state data ---
    // Query current year AND next year (deadlines for next hunting season may already be scraped)
    const currentYear = new Date().getFullYear();
    const { data: dbDeadlines } = await supabase
      .from("scraped_deadlines")
      .select("*")
      .in("year", [currentYear, currentYear + 1])
      .limit(1000);

    // --- Merge DB units with hardcoded constants ---
    const mergedUnits = mergeUnits(dbUnits ?? [], SAMPLE_UNITS);

    // --- Merge deadline data into state constants ---
    const mergedStates = mergeDeadlines(STATES, dbDeadlines ?? []);
    const mergedStatesMap = Object.fromEntries(mergedStates.map((s) => [s.id, s]));

    // --- Update engine context ---
    setDataContext({
      states: mergedStates,
      statesMap: mergedStatesMap,
      units: mergedUnits,
    });

    _dataSource = "db";
    _dbUnitCount = dbUnits?.length ?? 0;
    _dbDeadlineCount = dbDeadlines?.length ?? 0;
    _lastLoadedAt = Date.now();
    _cachedScrapeTimestamp = null;

    logger.info(`[data-loader] Tier 1: Loaded from Supabase (${_dbUnitCount} units, ${_dbDeadlineCount} deadlines)`);

    // Fire-and-forget cache write — don't block the response
    cacheSet(CACHE_KEY_UNITS, dbUnits ?? [], CACHE_KEY_TTL).catch(() => {});
    if (dbDeadlines?.length) {
      cacheSet(CACHE_KEY_DEADLINES, dbDeadlines, CACHE_KEY_TTL).catch(() => {});
    }

    return true;
  } catch (err) {
    logger.warn("[data-loader] Tier 1: Supabase load failed:", (err as Error).message);
    return false;
  }
}

/**
 * Tier 2: Attempt to load data from Redis cache (last-known-good).
 * Returns true if cache had valid data, false otherwise.
 */
async function _tryLoadFromCache(): Promise<boolean> {
  try {
    const cachedUnits = await cacheGet<DbUnit[]>(CACHE_KEY_UNITS);

    if (!cachedUnits || cachedUnits.length === 0) {
      logger.warn("[data-loader] Tier 2: Redis cache miss (no units)");
      return false;
    }

    const cachedDeadlines = await cacheGet<DbDeadline[]>(CACHE_KEY_DEADLINES);

    // --- Merge cached data with constants (reuse existing merge functions) ---
    const mergedUnits = mergeUnits(cachedUnits, SAMPLE_UNITS);
    const mergedStates = mergeDeadlines(STATES, cachedDeadlines ?? []);
    const mergedStatesMap = Object.fromEntries(mergedStates.map((s) => [s.id, s]));

    // --- Update engine context ---
    setDataContext({
      states: mergedStates,
      statesMap: mergedStatesMap,
      units: mergedUnits,
    });

    _dataSource = "cache";
    _dbUnitCount = cachedUnits.length;
    _dbDeadlineCount = cachedDeadlines?.length ?? 0;
    _lastLoadedAt = Date.now();
    // No scrape timestamp available from cache — mark as null (conservative staleness)
    _cachedScrapeTimestamp = null;

    logger.info("[data-loader] Tier 2: Loaded from Redis cache");

    return true;
  } catch (err) {
    logger.warn("[data-loader] Tier 2: Redis cache load failed:", (err as Error).message);
    return false;
  }
}

/**
 * Force-refresh the data context (bypasses cache).
 */
export async function refreshDataContext(): Promise<void> {
  _lastLoadedAt = null;
  await loadDataContext();
}

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

interface DbUnit {
  state_id: string;
  species_id: string;
  unit_code: string;
  unit_name: string | null;
  success_rate: number | null;
  trophy_rating: number | null;
  points_required_resident: number | null;
  points_required_nonresident: number | null;
  terrain_type: string[] | null;
  pressure_level: string | null;
  elevation_range: number[] | null;
  public_land_pct: number | null;
  tag_quota_nonresident: number | null;
  notes: string | null;
  tactical_notes: Record<string, unknown> | null;
  nearest_airport: string | null;
  drive_time_from_airport: string | null;
  season_dates: Record<string, { start: string; end: string }> | null;
}

/**
 * Merge DB units with hardcoded sample units.
 * DB rows override matching hardcoded units; unmatched hardcoded units are kept.
 */
function mergeUnits(dbRows: DbUnit[], hardcoded: Unit[]): Unit[] {
  const merged = new Map<string, Unit>();

  // Start with hardcoded units
  for (const u of hardcoded) {
    const key = `${u.stateId}:${u.speciesId}:${u.unitCode}`;
    merged.set(key, u);
  }

  // DB units override or add
  for (const row of dbRows) {
    const key = `${row.state_id}:${row.species_id}:${row.unit_code}`;
    const existing = merged.get(key);

    const unit: Unit = {
      id: key,
      stateId: row.state_id,
      speciesId: row.species_id,
      unitCode: row.unit_code,
      unitName: row.unit_name ?? existing?.unitName,
      successRate: row.success_rate ?? existing?.successRate ?? 0,
      trophyRating: row.trophy_rating ?? existing?.trophyRating ?? 0,
      pointsRequiredResident: row.points_required_resident ?? existing?.pointsRequiredResident ?? 0,
      pointsRequiredNonresident: row.points_required_nonresident ?? existing?.pointsRequiredNonresident ?? 0,
      terrainType: (row.terrain_type as Unit["terrainType"]) ?? existing?.terrainType ?? [],
      pressureLevel: (row.pressure_level as Unit["pressureLevel"]) ?? existing?.pressureLevel ?? "Moderate",
      elevationRange: (row.elevation_range as [number, number]) ?? existing?.elevationRange ?? [0, 0],
      publicLandPct: row.public_land_pct ?? existing?.publicLandPct ?? 0,
      tagQuotaNonresident: row.tag_quota_nonresident ?? existing?.tagQuotaNonresident ?? 0,
      notes: row.notes ?? existing?.notes,
      seasonDates: row.season_dates ?? existing?.seasonDates,
      tacticalNotes: (row.tactical_notes as unknown as Unit["tacticalNotes"]) ?? existing?.tacticalNotes,
      nearestAirport: row.nearest_airport ?? existing?.nearestAirport,
      driveTimeFromAirport: row.drive_time_from_airport ?? existing?.driveTimeFromAirport,
    };

    merged.set(key, unit);
  }

  return Array.from(merged.values());
}

interface DbDeadline {
  state_id: string;
  species_id: string;
  deadline_type: string;
  date: string;
  year: number;
  notes: string | null;
}

/**
 * Merge scraped deadlines into state constants.
 * Updates applicationDeadlines on State objects where DB data is available.
 */
function mergeDeadlines(states: State[], dbDeadlines: DbDeadline[]): State[] {
  if (dbDeadlines.length === 0) return states;

  // Group deadlines by state
  const byState = new Map<string, DbDeadline[]>();
  for (const d of dbDeadlines) {
    if (!byState.has(d.state_id)) byState.set(d.state_id, []);
    byState.get(d.state_id)!.push(d);
  }

  return states.map((state) => {
    const stateDeadlines = byState.get(state.id);
    if (!stateDeadlines) return state;

    // Build updated applicationDeadlines from scraped data
    const updatedDeadlines = { ...state.applicationDeadlines };

    for (const d of stateDeadlines) {
      if (d.deadline_type === "application_open" || d.deadline_type === "application_close") {
        const existing = updatedDeadlines[d.species_id] ?? { open: "", close: "" };
        if (d.deadline_type === "application_open") {
          existing.open = d.date;
        } else {
          existing.close = d.date;
        }
        updatedDeadlines[d.species_id] = existing;
      }
    }

    // Validate: close date should be after open date (reject bad scraped data)
    for (const [speciesId, dl] of Object.entries(updatedDeadlines)) {
      if (dl.open && dl.close && dl.close < dl.open) {
        logger.warn(`[data-loader] Invalid deadline for ${state.id}/${speciesId}: close (${dl.close}) before open (${dl.open}). Keeping constants.`);
        updatedDeadlines[speciesId] = state.applicationDeadlines[speciesId] ?? dl;
      }
    }

    return { ...state, applicationDeadlines: updatedDeadlines };
  });
}
