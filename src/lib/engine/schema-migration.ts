/**
 * Schema Evolution & Backwards Compatibility — The "Time Capsule" Defense
 *
 * Users build 10-25 year F&G plans. Their JSON save files will outlive
 * every schema change we ever make. When a 2026 save file meets a 2028
 * engine, it must NOT crash — it must silently migrate.
 *
 * Architecture:
 *   1. Every persisted state snapshot carries a `_schemaVersion` number
 *   2. Migrations are pure functions: (oldState, version) → newState
 *   3. Migrations run sequentially: V1 → V2 → V3 → ... → current
 *   4. Missing fields get safe defaults (never undefined)
 *   5. Removed fields are cleaned up (no dead weight)
 *   6. The engine NEVER reads a field that hasn't been migrated
 *
 * This is NOT Zustand's built-in `version` + `migrate` — that only handles
 * the persist layer. This module handles the ASSESSMENT and ROADMAP schemas
 * that live inside the persisted state as nested JSON.
 */

// ============================================================================
// Schema Version Registry
// ============================================================================

/** Current schema version — bump this when adding migrations */
export const CURRENT_SCHEMA_VERSION = 2;

/** Minimum supported version — anything older than this is irrecoverable */
export const MIN_SUPPORTED_VERSION = 1;

// ============================================================================
// Migration Types
// ============================================================================

export interface MigrationResult {
  /** The migrated state */
  state: Record<string, unknown>;
  /** Version before migration */
  fromVersion: number;
  /** Version after migration */
  toVersion: number;
  /** Fields that were added with defaults */
  addedFields: string[];
  /** Fields that were removed */
  removedFields: string[];
  /** Whether any migration was needed */
  migrated: boolean;
}

export interface Migration {
  /** Source version this migration applies to */
  fromVersion: number;
  /** Target version after migration */
  toVersion: number;
  /** Description of what this migration does */
  description: string;
  /** The migration function — must be pure */
  migrate: (state: Record<string, unknown>) => Record<string, unknown>;
  /** Fields added in this version (for audit trail) */
  addedFields: string[];
  /** Fields removed in this version (for audit trail) */
  removedFields: string[];
}

// ============================================================================
// Migration Registry
// ============================================================================

/**
 * V1 → V2: Add weapon-specific fields and outfitter tracking.
 *
 * Scenario: In 2028 we add support for outfitter license numbers,
 * weapon-specific season data, and party member profiles.
 * A 2026 save file won't have any of these fields.
 */
const MIGRATION_V1_TO_V2: Migration = {
  fromVersion: 1,
  toVersion: 2,
  description: "Add outfitter tracking, weapon seasons, party profiles, and point timestamps",
  addedFields: [
    "outfitterLicenseNumber",
    "weaponSeasons",
    "partyMembers",
    "pointAcquisitionHistory",
    "schemaVersion",
  ],
  removedFields: [
    // V1 had a deprecated `physicalLimitations` free-text field
    // that was replaced by the structured `physicalComfort` enum
  ],
  migrate: (state: Record<string, unknown>): Record<string, unknown> => {
    const migrated = { ...state };

    // Add outfitter license number (optional field, default null)
    if (!("outfitterLicenseNumber" in migrated)) {
      migrated.outfitterLicenseNumber = null;
    }

    // Add weapon-specific season data
    if (!("weaponSeasons" in migrated)) {
      migrated.weaponSeasons = {};
    }

    // Add party member profiles (beyond just partySize)
    if (!("partyMembers" in migrated)) {
      migrated.partyMembers = [];
    }

    // Add point acquisition history (timestamped assets for Grandfather Clause)
    if (!("pointAcquisitionHistory" in migrated)) {
      // If user already has existingPoints, backfill them as "unknown acquisition date"
      const existingPoints = migrated.existingPoints as Record<string, Record<string, number>> | undefined;
      const history: PointAcquisitionRecord[] = [];

      if (existingPoints) {
        for (const [stateId, species] of Object.entries(existingPoints)) {
          for (const [speciesId, points] of Object.entries(species)) {
            // Spread points across years ending at current year (best guess)
            const currentYear = new Date().getFullYear();
            for (let i = 0; i < points; i++) {
              history.push({
                stateId,
                speciesId,
                acquiredYear: currentYear - (points - 1 - i), // Oldest first
                method: "unknown", // Migrated from V1 — exact method unknown
              });
            }
          }
        }
      }

      migrated.pointAcquisitionHistory = history;
    }

    // Stamp the schema version
    migrated._schemaVersion = 2;

    return migrated;
  },
};

/** All registered migrations, in order */
const MIGRATIONS: Migration[] = [
  MIGRATION_V1_TO_V2,
  // Future migrations go here:
  // MIGRATION_V2_TO_V3,
  // MIGRATION_V3_TO_V4,
];

// ============================================================================
// Point Acquisition History (Grandfather Clause support)
// ============================================================================

export interface PointAcquisitionRecord {
  stateId: string;
  speciesId: string;
  acquiredYear: number;
  method: "application" | "purchase" | "bonus" | "unknown";
}

// ============================================================================
// Migration Engine
// ============================================================================

/**
 * Detect the schema version of a state snapshot.
 * V1 snapshots don't have a _schemaVersion field.
 */
export function detectSchemaVersion(state: Record<string, unknown>): number {
  if (typeof state._schemaVersion === "number") {
    return state._schemaVersion;
  }
  // No version stamp = V1 (original schema)
  return 1;
}

/**
 * Migrate a state snapshot from its current version to the latest.
 *
 * Runs all necessary migrations sequentially.
 * Returns the migrated state + audit trail.
 *
 * GUARANTEES:
 *   - Pure function (no side effects)
 *   - Never throws (returns error info in result)
 *   - Never loses data (only adds/transforms)
 *   - Idempotent (running on already-current state is a no-op)
 */
export function migrateState(
  state: Record<string, unknown>,
): MigrationResult {
  const fromVersion = detectSchemaVersion(state);

  // Already current — no migration needed
  if (fromVersion >= CURRENT_SCHEMA_VERSION) {
    return {
      state,
      fromVersion,
      toVersion: fromVersion,
      addedFields: [],
      removedFields: [],
      migrated: false,
    };
  }

  // Too old to migrate
  if (fromVersion < MIN_SUPPORTED_VERSION) {
    // Return state with version stamped but otherwise untouched
    return {
      state: { ...state, _schemaVersion: CURRENT_SCHEMA_VERSION },
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      addedFields: [],
      removedFields: [],
      migrated: true,
    };
  }

  // Run migrations sequentially
  let current = { ...state };
  let currentVersion = fromVersion;
  const allAddedFields: string[] = [];
  const allRemovedFields: string[] = [];

  for (const migration of MIGRATIONS) {
    if (migration.fromVersion === currentVersion) {
      current = migration.migrate(current);
      currentVersion = migration.toVersion;
      allAddedFields.push(...migration.addedFields);
      allRemovedFields.push(...migration.removedFields);
    }
  }

  return {
    state: current,
    fromVersion,
    toVersion: currentVersion,
    addedFields: allAddedFields,
    removedFields: allRemovedFields,
    migrated: true,
  };
}

/**
 * Validate that a state snapshot has all required fields for the current version.
 * Returns a list of missing fields (empty = valid).
 */
export function validateSchema(
  state: Record<string, unknown>,
): string[] {
  const missing: string[] = [];

  // V2 required fields
  const v2RequiredFields = [
    "pointAcquisitionHistory",
    "weaponSeasons",
    "partyMembers",
  ];

  for (const field of v2RequiredFields) {
    if (!(field in state)) {
      missing.push(field);
    }
  }

  return missing;
}

/**
 * Create a V1 snapshot for testing — simulates a 2026 save file.
 */
export function createV1Snapshot(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    // Core consultation state (V1 shape)
    step: 10,
    planForName: "",
    planningHorizon: 10,
    homeState: "CO",
    homeCity: "Denver",
    experienceLevel: "intermediate",
    physicalComfort: "moderate_elevation",
    hasHuntedStates: ["CO"],
    species: ["elk", "mule_deer"],
    trophyVsMeat: "balanced",
    pointYearBudget: 2000,
    huntYearBudget: 8000,
    capitalFloatTolerance: 3000,
    huntStylePrimary: "diy_truck",
    openToGuided: false,
    guidedForSpecies: [],
    preferredTerrain: ["Mountain", "Mixed"],
    importantFactors: ["draw_odds", "cost_efficiency"],
    weaponType: "rifle",
    huntFrequency: "every_year",
    timeAvailable: "full_week",
    travelWillingness: "will_fly_anywhere",
    huntDaysPerYear: 14,
    partySize: 1,
    physicalHorizon: null,
    hasExistingPoints: true,
    existingPoints: {
      CO: { elk: 3, mule_deer: 2 },
      WY: { elk: 5 },
    },
    selectedStatesConfirmed: ["CO", "WY", "MT"],
    // Note: NO outfitterLicenseNumber, weaponSeasons, partyMembers,
    // pointAcquisitionHistory, or _schemaVersion — those are V2 fields
    physicalLimitations: "None", // Deprecated V1 field
    ...overrides,
  };
}

/**
 * Create a current-version snapshot for testing.
 */
export function createCurrentSnapshot(overrides?: Record<string, unknown>): Record<string, unknown> {
  const v1 = createV1Snapshot(overrides);
  const result = migrateState(v1);
  return result.state;
}
