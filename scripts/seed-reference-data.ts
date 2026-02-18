/**
 * Seed script: reads from existing TypeScript constants and inserts into Supabase tables.
 *
 * Usage:
 *   npx tsx scripts/seed-reference-data.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL  — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (bypasses RLS)
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Imports from app constants (relative paths — no @/ alias in scripts)
// ---------------------------------------------------------------------------
import { STATES } from "../src/lib/constants/states";
import { SAMPLE_UNITS } from "../src/lib/constants/sample-units";
import { SPECIES } from "../src/lib/constants/species";
import {
  SPECIES_IMAGES,
  SPECIES_GRADIENTS,
  SPECIES_DESCRIPTIONS,
} from "../src/lib/constants/species-images";

// ---------------------------------------------------------------------------
// Supabase client (service-role for full access)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logImport(entry: {
  import_type: string;
  state_id: string | null;
  rows_imported: number;
  rows_skipped: number;
  errors: string[];
  source_file: string;
}) {
  await supabase.from("data_import_log").insert({
    import_type: entry.import_type,
    state_id: entry.state_id,
    rows_imported: entry.rows_imported,
    rows_skipped: entry.rows_skipped,
    errors: entry.errors,
    source_file: entry.source_file,
    source_url: null,
  });
}

// ---------------------------------------------------------------------------
// 1. Seed ref_states
// ---------------------------------------------------------------------------

async function seedStates() {
  console.log("\n--- Seeding ref_states ---");

  const now = new Date().toISOString();

  const rows = STATES.map((s) => ({
    id: s.id,
    name: s.name,
    abbreviation: s.abbreviation,
    point_system: s.pointSystem,
    point_system_details: s.pointSystemDetails ?? {},
    fg_url: s.fgUrl,
    buy_points_url: s.buyPointsUrl,
    application_deadlines: s.applicationDeadlines ?? {},
    license_fees: s.licenseFees ?? {},
    fee_schedule: s.feeSchedule ?? [],
    application_approach: s.applicationApproach,
    application_approach_description: s.applicationApproachDescription,
    application_tips: s.applicationTips ?? [],
    available_species: s.availableSpecies ?? [],
    draw_result_dates: s.drawResultDates ?? {},
    point_cost: s.pointCost ?? {},
    color: s.color,
    logistics: s.logistics ?? null,
    point_only_application: s.pointOnlyApplication ?? null,
    season_tiers: s.seasonTiers ?? null,
    state_personality: s.statePersonality ?? null,
    source_url: s.fgUrl,
    source_pulled_at: now,
    updated_at: now,
  }));

  const { data, error } = await supabase
    .from("ref_states")
    .upsert(rows, { onConflict: "id" })
    .select("id");

  const inserted = data?.length ?? 0;
  const errors: string[] = error ? [error.message] : [];

  console.log(`  Upserted ${inserted} states. Errors: ${errors.length}`);

  await logImport({
    import_type: "seed",
    state_id: null,
    rows_imported: inserted,
    rows_skipped: rows.length - inserted,
    errors,
    source_file: "constants/states.ts",
  });

  return inserted;
}

// ---------------------------------------------------------------------------
// 2. Seed ref_species
// ---------------------------------------------------------------------------

async function seedSpecies() {
  console.log("\n--- Seeding ref_species ---");

  const now = new Date().toISOString();

  const rows = SPECIES.map((sp) => {
    const img = SPECIES_IMAGES[sp.id];
    return {
      id: sp.id,
      name: sp.name,
      icon: sp.icon,
      // The schema has image_url (single column). We store the src path.
      image_url: img?.src ?? null,
      gradient: SPECIES_GRADIENTS[sp.id] ?? null,
      description: SPECIES_DESCRIPTIONS[sp.id] ?? null,
      updated_at: now,
    };
  });

  const { data, error } = await supabase
    .from("ref_species")
    .upsert(rows, { onConflict: "id" })
    .select("id");

  const inserted = data?.length ?? 0;
  const errors: string[] = error ? [error.message] : [];

  console.log(`  Upserted ${inserted} species. Errors: ${errors.length}`);

  await logImport({
    import_type: "seed",
    state_id: null,
    rows_imported: inserted,
    rows_skipped: rows.length - inserted,
    errors,
    source_file: "constants/species.ts + species-images.ts",
  });

  return inserted;
}

// ---------------------------------------------------------------------------
// 3. Seed ref_units
// ---------------------------------------------------------------------------

async function seedUnits() {
  console.log("\n--- Seeding ref_units ---");

  const now = new Date().toISOString();

  const rows = SAMPLE_UNITS.map((u) => ({
    // We omit `id` to let the DB generate a UUID; upsert on the unique
    // constraint (state_id, species_id, unit_code).
    state_id: u.stateId,
    species_id: u.speciesId,
    unit_code: u.unitCode,
    unit_name: u.unitName ?? null,
    success_rate: u.successRate,
    trophy_rating: u.trophyRating,
    points_required_resident: u.pointsRequiredResident,
    points_required_nonresident: u.pointsRequiredNonresident,
    terrain_type: u.terrainType ?? [],
    pressure_level: u.pressureLevel,
    elevation_range: u.elevationRange ?? [],
    public_land_pct: u.publicLandPct,
    tag_quota_nonresident: u.tagQuotaNonresident,
    notes: u.notes ?? null,
    tactical_notes: u.tacticalNotes ?? null,
    nearest_airport: u.nearestAirport ?? null,
    drive_time_from_airport: u.driveTimeFromAirport ?? null,
    source_url: null,
    source_pulled_at: now,
    updated_at: now,
  }));

  // Upsert on (state_id, species_id, unit_code) unique constraint
  const { data, error } = await supabase
    .from("ref_units")
    .upsert(rows, {
      onConflict: "state_id,species_id,unit_code",
    })
    .select("id");

  const inserted = data?.length ?? 0;
  const errors: string[] = error ? [error.message] : [];

  console.log(`  Upserted ${inserted} units. Errors: ${errors.length}`);

  if (error) {
    console.error("  Error detail:", error.message);
  }

  await logImport({
    import_type: "seed",
    state_id: null,
    rows_imported: inserted,
    rows_skipped: rows.length - inserted,
    errors,
    source_file: "constants/sample-units.ts",
  });

  return inserted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Hunt Planner: Seed Reference Data ===");
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const statesCount = await seedStates();
  const speciesCount = await seedSpecies();
  const unitsCount = await seedUnits();

  console.log("\n=== Seed Summary ===");
  console.log(`  States:  ${statesCount}`);
  console.log(`  Species: ${speciesCount}`);
  console.log(`  Units:   ${unitsCount}`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
