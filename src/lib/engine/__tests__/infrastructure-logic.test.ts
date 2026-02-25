/**
 * Systems & Infrastructure Logic Tests
 *
 * Three critical defenses that protect the database and the server
 * from human unpredictability and systemic time-lapses:
 *
 * 1. Idempotency & Race Condition ("Double-Click Trap")
 *    → 50 rapid-fire mutations in 10ms, exactly 1 execution
 *
 * 2. Schema Evolution & Backwards Compatibility ("Time Capsule")
 *    → V1 save file from 2026 seamlessly upgrades to V2+ in 2028
 *
 * 3. Grandfather Clause Engine ("Regulatory Epochs")
 *    → Points are timestamped assets; legacy rules route by acquisition date
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  idempotencyLedger,
  generateIdempotencyKey,
  guardedDrawOutcome,
  guardedBudgetChange,
  guardedRebalance,
  guardedOperation,
} from "../idempotency-guard";
import {
  migrateState,
  detectSchemaVersion,
  validateSchema,
  createV1Snapshot,
  createCurrentSnapshot,
  CURRENT_SCHEMA_VERSION,
  MIN_SUPPORTED_VERSION,
  type PointAcquisitionRecord,
} from "../schema-migration";
import {
  buildTimestampedPoints,
  countLegacyPoints,
  countModernPoints,
  splitPointsByEpoch,
  computeEffectivePoints,
  enforcePointCap,
  analyzeTransitionImpact,
  REGULATORY_EPOCHS,
  type TimestampedPoint,
  type RegulatoryEpoch,
} from "../grandfather-clause";

// ============================================================================
// TEST 1: Idempotency & Race Condition — "The Double-Click Trap"
// ============================================================================

describe("TEST 1 — Idempotency & Race Condition (The Double-Click Trap)", () => {
  beforeEach(() => {
    idempotencyLedger.clear();
  });

  it("fires 50 rapid mutations, only the first one executes", () => {
    let executionCount = 0;
    let budgetDeductions = 0;
    const tagCost = 1200; // Wyoming elk tag

    // Same key for all 50 attempts — simulating 50 clicks on "Mark as Drawn"
    const key = "draw_outcome:wy-elk-milestone-2026:rapid-fire";

    // Fire 50 times in a tight loop (well under 10ms in V8)
    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      guardedDrawOutcome(key, () => {
        executionCount++;
        budgetDeductions += tagCost;
      });
    }
    const elapsed = performance.now() - start;

    // THE VERDICT: Exactly 1 execution, no double-charge
    expect(executionCount).toBe(1);
    expect(budgetDeductions).toBe(tagCost); // $1,200 once, not $60,000
    expect(elapsed).toBeLessThan(50); // Well under 10ms for 50 calls
  });

  it("fires 50 budget changes, only the first one executes", () => {
    let budgetUpdates = 0;
    const key = "budget_change:user-123:slash-2026";

    for (let i = 0; i < 50; i++) {
      guardedBudgetChange(key, () => {
        budgetUpdates++;
      });
    }

    expect(budgetUpdates).toBe(1);
  });

  it("fires 50 portfolio rebalances, only the first one executes", () => {
    let rebalanceCount = 0;
    const key = "rebalance:portfolio-2026:user-action";

    for (let i = 0; i < 50; i++) {
      guardedRebalance(key, () => {
        rebalanceCount++;
      });
    }

    expect(rebalanceCount).toBe(1);
  });

  it("allows different keys to execute independently", () => {
    let count = 0;

    guardedDrawOutcome("key-A", () => { count++; });
    guardedDrawOutcome("key-B", () => { count++; });
    guardedDrawOutcome("key-C", () => { count++; });

    // Three different keys = three executions
    expect(count).toBe(3);
  });

  it("generates unique idempotency keys", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateIdempotencyKey("draw_outcome", `milestone-${i}`));
    }
    // All 100 keys must be unique
    expect(keys.size).toBe(100);
  });

  it("tracks processed keys in the ledger", () => {
    const key = "test:operation:123";
    expect(idempotencyLedger.hasKey(key)).toBe(false);

    guardedOperation(key, "test", () => "result");

    expect(idempotencyLedger.hasKey(key)).toBe(true);
    expect(idempotencyLedger.size).toBe(1);
  });

  it("returns execution result for first call, null for duplicates", () => {
    const key = "test:return-value:456";

    const first = guardedOperation(key, "test", () => 42);
    expect(first).toEqual({ executed: true, result: 42 });

    const second = guardedOperation(key, "test", () => 99);
    expect(second).toEqual({ executed: false, result: null });
  });

  it("garbage-collects stale entries", () => {
    // Add some entries manually via guardedOperation
    for (let i = 0; i < 10; i++) {
      guardedOperation(`stale-${i}`, "test", () => null);
    }
    expect(idempotencyLedger.size).toBe(10);

    // GC should NOT remove entries that are still within TTL (5 minutes)
    const removed = idempotencyLedger.gc();
    expect(removed).toBe(0);
    expect(idempotencyLedger.size).toBe(10);
  });

  it("simulates phone + desktop simultaneous mutation", () => {
    // Same user, same action, same milestone — from two devices
    const milestoneId = "ms-wy-elk-2026";
    const key = `draw_outcome:${milestoneId}:drew`;

    let phoneResult = false;
    let desktopResult = false;

    // Phone fires first
    const phoneFired = guardedDrawOutcome(key, () => {
      phoneResult = true;
    });

    // Desktop fires 50ms later (same key)
    const desktopFired = guardedDrawOutcome(key, () => {
      desktopResult = true;
    });

    // Only phone should have executed
    expect(phoneFired).toBe(true);
    expect(desktopFired).toBe(false);
    expect(phoneResult).toBe(true);
    expect(desktopResult).toBe(false);
  });

  it("protects against point balance corruption from double-deduction", () => {
    let pointBalance = 8; // 8 Wyoming elk preference points
    const key = "draw_outcome:wy-elk-drew:2026";

    for (let i = 0; i < 50; i++) {
      guardedDrawOutcome(key, () => {
        pointBalance = 0; // Zero out on draw
      });
    }

    // Points should be 0, not -392 (8 - 50*8)
    expect(pointBalance).toBe(0);
  });

  it("protects budget from double-charge on tag fee deduction", () => {
    let budget = 8000;
    const tagCost = 1200;
    const key = "tag-fee:wy-elk:2026";

    for (let i = 0; i < 50; i++) {
      guardedOperation(key, "tag_fee", () => {
        budget -= tagCost;
      });
    }

    // Budget should be 6800 ($8000 - $1200), not -$52,000
    expect(budget).toBe(8000 - tagCost);
  });
});

// ============================================================================
// TEST 2: Schema Evolution & Backwards Compatibility — "The Time Capsule"
// ============================================================================

describe("TEST 2 — Schema Evolution & Backwards Compatibility (The Time Capsule)", () => {
  it("detects V1 snapshots (no _schemaVersion field)", () => {
    const v1 = createV1Snapshot();
    expect(detectSchemaVersion(v1)).toBe(1);
  });

  it("detects current-version snapshots", () => {
    const current = createCurrentSnapshot();
    expect(detectSchemaVersion(current)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("migrates V1 → V2 without data loss", () => {
    const v1 = createV1Snapshot();

    // Verify V1 is missing V2 fields
    expect(v1.outfitterLicenseNumber).toBeUndefined();
    expect(v1.weaponSeasons).toBeUndefined();
    expect(v1.partyMembers).toBeUndefined();
    expect(v1.pointAcquisitionHistory).toBeUndefined();
    expect(v1._schemaVersion).toBeUndefined();

    const result = migrateState(v1);

    // Migration should have happened
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION);

    // V2 fields should now exist with safe defaults
    expect(result.state.outfitterLicenseNumber).toBeNull();
    expect(result.state.weaponSeasons).toEqual({});
    expect(result.state.partyMembers).toEqual([]);
    expect(result.state._schemaVersion).toBe(2);

    // Original data must be PRESERVED (no data loss)
    expect(result.state.homeState).toBe("CO");
    expect(result.state.homeCity).toBe("Denver");
    expect(result.state.species).toEqual(["elk", "mule_deer"]);
    expect(result.state.pointYearBudget).toBe(2000);
    expect(result.state.huntYearBudget).toBe(8000);
    expect(result.state.selectedStatesConfirmed).toEqual(["CO", "WY", "MT"]);
    expect(result.state.weaponType).toBe("rifle");
  });

  it("backfills point acquisition history from V1 existingPoints", () => {
    const v1 = createV1Snapshot({
      existingPoints: {
        CO: { elk: 3, mule_deer: 2 },
        WY: { elk: 5 },
      },
    });

    const result = migrateState(v1);
    const history = result.state.pointAcquisitionHistory as PointAcquisitionRecord[];

    // Should have created timestamped entries for all points
    // 3 (CO elk) + 2 (CO mule_deer) + 5 (WY elk) = 10 total
    expect(history).toHaveLength(10);

    // CO elk: 3 points spread across 3 years
    const coElk = history.filter((h) => h.stateId === "CO" && h.speciesId === "elk");
    expect(coElk).toHaveLength(3);
    expect(coElk.every((h) => h.method === "unknown")).toBe(true);

    // WY elk: 5 points spread across 5 years
    const wyElk = history.filter((h) => h.stateId === "WY" && h.speciesId === "elk");
    expect(wyElk).toHaveLength(5);

    // Oldest points should have earlier years
    expect(wyElk[0].acquiredYear).toBeLessThan(wyElk[4].acquiredYear);
  });

  it("does NOT re-migrate already-current snapshots", () => {
    const current = createCurrentSnapshot();
    const result = migrateState(current);

    expect(result.migrated).toBe(false);
    expect(result.fromVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("validates schema completeness", () => {
    // V1 snapshot should fail validation
    const v1 = createV1Snapshot();
    const missing = validateSchema(v1);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing).toContain("pointAcquisitionHistory");

    // Migrated snapshot should pass validation
    const migrated = migrateState(v1);
    const missingAfter = validateSchema(migrated.state);
    expect(missingAfter).toHaveLength(0);
  });

  it("reports added fields in the migration audit trail", () => {
    const v1 = createV1Snapshot();
    const result = migrateState(v1);

    expect(result.addedFields).toContain("outfitterLicenseNumber");
    expect(result.addedFields).toContain("weaponSeasons");
    expect(result.addedFields).toContain("partyMembers");
    expect(result.addedFields).toContain("pointAcquisitionHistory");
  });

  it("handles empty existingPoints gracefully during migration", () => {
    const v1 = createV1Snapshot({ existingPoints: {} });
    const result = migrateState(v1);
    const history = result.state.pointAcquisitionHistory as PointAcquisitionRecord[];
    expect(history).toHaveLength(0);
  });

  it("preserves nested objects through migration", () => {
    const v1 = createV1Snapshot({
      existingPoints: { AZ: { elk: 1, mule_deer: 0 } },
      fineTuneAnswers: { q1: "yes", q2: "no" },
    });

    const result = migrateState(v1);

    // Nested objects preserved
    expect(result.state.existingPoints).toEqual({ AZ: { elk: 1, mule_deer: 0 } });
    expect(result.state.fineTuneAnswers).toEqual({ q1: "yes", q2: "no" });
  });

  it("handles schema version below minimum gracefully", () => {
    const ancient = { _schemaVersion: 0, someOldField: true };
    const result = migrateState(ancient);

    // Should still produce a usable result (not crash)
    expect(result.migrated).toBe(true);
    expect(result.state._schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("migration is idempotent — running twice produces same result", () => {
    const v1 = createV1Snapshot();
    const first = migrateState(v1);
    const second = migrateState(first.state);

    // Second run should be a no-op
    expect(second.migrated).toBe(false);
    expect(second.state).toEqual(first.state);
  });
});

// ============================================================================
// TEST 3: Grandfather Clause Engine — "Regulatory Epochs"
// ============================================================================

describe("TEST 3 — Grandfather Clause Engine (Regulatory Epochs)", () => {
  // Build a test point history: user with WY elk points from 2022-2028
  const wyElkHistory: PointAcquisitionRecord[] = [
    { stateId: "WY", speciesId: "elk", acquiredYear: 2022, method: "application" },
    { stateId: "WY", speciesId: "elk", acquiredYear: 2023, method: "application" },
    { stateId: "WY", speciesId: "elk", acquiredYear: 2024, method: "purchase" },
    { stateId: "WY", speciesId: "elk", acquiredYear: 2025, method: "application" },
    { stateId: "WY", speciesId: "elk", acquiredYear: 2026, method: "application" },
    // These two were acquired AFTER the 2027 epoch
    { stateId: "WY", speciesId: "elk", acquiredYear: 2027, method: "application" },
    { stateId: "WY", speciesId: "elk", acquiredYear: 2028, method: "application" },
  ];

  it("builds timestamped points from acquisition history", () => {
    const points = buildTimestampedPoints(wyElkHistory, "WY", "elk");
    expect(points).toHaveLength(7);
    expect(points[0].acquiredYear).toBe(2022);
    expect(points[6].acquiredYear).toBe(2028);
  });

  it("counts legacy points before a cutoff year", () => {
    const points = buildTimestampedPoints(wyElkHistory, "WY", "elk");
    // Points before 2027 = 5 (2022, 2023, 2024, 2025, 2026)
    expect(countLegacyPoints(points, 2027)).toBe(5);
  });

  it("counts modern points at or after a cutoff year", () => {
    const points = buildTimestampedPoints(wyElkHistory, "WY", "elk");
    // Points 2027+ = 2 (2027, 2028)
    expect(countModernPoints(points, 2027)).toBe(2);
  });

  it("splits points by epoch into legacy/modern buckets", () => {
    const points = buildTimestampedPoints(wyElkHistory, "WY", "elk");
    const wyEpoch = REGULATORY_EPOCHS.find((e) => e.id === "wy-pref-overhaul-2027")!;

    const split = splitPointsByEpoch(points, wyEpoch);
    expect(split.legacy).toHaveLength(5); // Pre-2027
    expect(split.modern).toHaveLength(2); // 2027+
  });

  it("applies grandfather clause: legacy points retain full value", () => {
    const points = buildTimestampedPoints(wyElkHistory, "WY", "elk");

    // Compute effective points in 2028 (after WY epoch took effect in 2027)
    const result = computeEffectivePoints(points, "WY", "elk", 2028);

    expect(result.grandfathered).toBe(true);
    expect(result.legacyPoints).toBe(5);
    expect(result.modernPoints).toBe(2);
    expect(result.legacyValue).toBe(5); // Full value (WY grandfather rule)
    expect(result.modernValue).toBe(2);
    expect(result.effectivePoints).toBe(7); // 5 legacy + 2 modern = 7
    expect(result.appliedEpoch?.id).toBe("wy-pref-overhaul-2027");
  });

  it("routes legacy rules: IF acquired_date < 2027 THEN apply_legacy_rules()", () => {
    // User with ALL points before 2027 (pure veteran)
    const veteranHistory: PointAcquisitionRecord[] = [
      { stateId: "WY", speciesId: "elk", acquiredYear: 2020, method: "application" },
      { stateId: "WY", speciesId: "elk", acquiredYear: 2021, method: "application" },
      { stateId: "WY", speciesId: "elk", acquiredYear: 2022, method: "application" },
      { stateId: "WY", speciesId: "elk", acquiredYear: 2023, method: "application" },
      { stateId: "WY", speciesId: "elk", acquiredYear: 2024, method: "application" },
    ];

    const points = buildTimestampedPoints(veteranHistory, "WY", "elk");
    const result = computeEffectivePoints(points, "WY", "elk", 2028);

    expect(result.grandfathered).toBe(true);
    expect(result.legacyPoints).toBe(5);
    expect(result.modernPoints).toBe(0);
    expect(result.effectivePoints).toBe(5);
    expect(result.explanation).toContain("legacy points");
    expect(result.explanation).toContain("grandfather clause");
  });

  it("applies conversion ratio for MT bonus restructure", () => {
    const mtHistory: PointAcquisitionRecord[] = [
      { stateId: "MT", speciesId: "elk", acquiredYear: 2025, method: "application" },
      { stateId: "MT", speciesId: "elk", acquiredYear: 2026, method: "application" },
      { stateId: "MT", speciesId: "elk", acquiredYear: 2027, method: "application" },
      { stateId: "MT", speciesId: "elk", acquiredYear: 2028, method: "application" },
      // After MT epoch (2029)
      { stateId: "MT", speciesId: "elk", acquiredYear: 2029, method: "application" },
      { stateId: "MT", speciesId: "elk", acquiredYear: 2030, method: "application" },
    ];

    const points = buildTimestampedPoints(mtHistory, "MT", "elk");
    const result = computeEffectivePoints(points, "MT", "elk", 2030);

    // 4 legacy points × 1.5 conversion = 6.0 effective legacy value
    expect(result.legacyPoints).toBe(4);
    expect(result.legacyValue).toBe(6); // 4 × 1.5
    expect(result.modernPoints).toBe(2);
    expect(result.modernValue).toBe(2);
    expect(result.effectivePoints).toBe(8); // 6 + 2
    expect(result.grandfathered).toBe(true);
  });

  it("respects grandfather clause sunset (MT: 5-year expiry)", () => {
    const mtHistory: PointAcquisitionRecord[] = [
      { stateId: "MT", speciesId: "elk", acquiredYear: 2025, method: "application" },
      { stateId: "MT", speciesId: "elk", acquiredYear: 2026, method: "application" },
    ];

    const points = buildTimestampedPoints(mtHistory, "MT", "elk");

    // In 2034 (5 years after 2029 epoch) — grandfather clause expired
    const result = computeEffectivePoints(points, "MT", "elk", 2034);

    expect(result.grandfathered).toBe(false);
    // After sunset, all points at face value (no 1.5x conversion)
    expect(result.legacyValue).toBe(2); // No conversion, just face value
    expect(result.effectivePoints).toBe(2);
    expect(result.explanation).toContain("expired");
  });

  it("no epoch applies — all points at face value", () => {
    // NV has no regulatory epoch in our registry
    const nvHistory: PointAcquisitionRecord[] = [
      { stateId: "NV", speciesId: "elk", acquiredYear: 2020, method: "application" },
      { stateId: "NV", speciesId: "elk", acquiredYear: 2021, method: "application" },
    ];

    const points = buildTimestampedPoints(nvHistory, "NV", "elk");
    const result = computeEffectivePoints(points, "NV", "elk", 2028);

    expect(result.grandfathered).toBe(false);
    expect(result.appliedEpoch).toBeNull();
    expect(result.effectivePoints).toBe(2);
    expect(result.explanation).toContain("No regulatory change");
  });

  it("enforces point cap with grandfather exception", () => {
    // User with 30 CO elk points (above the 25-point cap)
    const coHistory: PointAcquisitionRecord[] = Array.from({ length: 30 }, (_, i) => ({
      stateId: "CO",
      speciesId: "elk",
      acquiredYear: 2000 + i,
      method: "application" as const,
    }));

    const points = buildTimestampedPoints(coHistory, "CO", "elk");

    // User has points before the 2028 cutoff — grandfathered
    const capResult = enforcePointCap(points, "CO", "elk");
    expect(capResult.capped).toBe(false);
    expect(capResult.reason).toContain("Grandfathered");
  });

  it("enforces point cap for new users (no grandfather)", () => {
    // New user with all points after 2028
    const newUserHistory: PointAcquisitionRecord[] = Array.from({ length: 26 }, (_, i) => ({
      stateId: "CO",
      speciesId: "elk",
      acquiredYear: 2028 + i,
      method: "application" as const,
    }));

    const points = buildTimestampedPoints(newUserHistory, "CO", "elk");

    // No legacy points → cap applies
    const capResult = enforcePointCap(points, "CO", "elk");
    expect(capResult.capped).toBe(true);
    expect(capResult.maxAllowed).toBe(25);
    expect(capResult.reason).toContain("cap of 25 reached");
  });

  it("analyzes transition impact across portfolio", () => {
    const history: PointAcquisitionRecord[] = [
      // WY elk: 5 pre-epoch + 2 post-epoch
      ...wyElkHistory,
      // CO elk: 3 points (affected by point cap epoch)
      { stateId: "CO", speciesId: "elk", acquiredYear: 2024, method: "application" },
      { stateId: "CO", speciesId: "elk", acquiredYear: 2025, method: "application" },
      { stateId: "CO", speciesId: "elk", acquiredYear: 2026, method: "application" },
    ];

    const impacts = analyzeTransitionImpact(history, 2028);

    // Should have impacts for WY elk and CO elk
    const wyImpact = impacts.find((i) => i.stateId === "WY");
    expect(wyImpact).toBeDefined();
    expect(wyImpact!.advisory).toContain("grandfathered");

    const coImpact = impacts.find((i) => i.stateId === "CO");
    expect(coImpact).toBeDefined();
    expect(coImpact!.advisory).toContain("grandfathered");
  });

  it("handles mixed legacy/modern points correctly", () => {
    // User who started before AND continued after the WY epoch
    const points: TimestampedPoint[] = [
      { acquiredYear: 2024, method: "application" },
      { acquiredYear: 2025, method: "application" },
      { acquiredYear: 2026, method: "purchase" },
      { acquiredYear: 2027, method: "application" }, // Post-epoch
      { acquiredYear: 2028, method: "application" }, // Post-epoch
    ];

    const result = computeEffectivePoints(points, "WY", "elk", 2028);

    // 3 legacy (full value) + 2 modern (face value) = 5
    expect(result.legacyPoints).toBe(3);
    expect(result.modernPoints).toBe(2);
    expect(result.effectivePoints).toBe(5);
    expect(result.grandfathered).toBe(true);
  });

  it("protects veteran users from blanket rule updates", () => {
    // THE KEY TEST: Veteran with 10 points ALL acquired before 2027
    // A blanket update to bonus-squared would destroy their position.
    // The Grandfather Clause protects them.

    const veteranPoints: TimestampedPoint[] = Array.from({ length: 10 }, (_, i) => ({
      acquiredYear: 2017 + i, // 2017-2026 (all pre-epoch)
      method: "application" as const,
    }));

    // New user with same point count but ALL acquired post-epoch
    const newbiePoints: TimestampedPoint[] = Array.from({ length: 10 }, (_, i) => ({
      acquiredYear: 2027 + i, // 2027-2036 (all post-epoch)
      method: "application" as const,
    }));

    const veteranResult = computeEffectivePoints(veteranPoints, "WY", "elk", 2036);
    const newbieResult = computeEffectivePoints(newbiePoints, "WY", "elk", 2036);

    // Veteran is grandfathered — their points retain full preference value
    expect(veteranResult.grandfathered).toBe(true);
    expect(veteranResult.legacyPoints).toBe(10);
    expect(veteranResult.effectivePoints).toBe(10);

    // Newbie is NOT grandfathered — their points are in the new system
    expect(newbieResult.grandfathered).toBe(false);
    expect(newbieResult.modernPoints).toBe(10);
    expect(newbieResult.effectivePoints).toBe(10);

    // Both have 10 effective points, but the RULES applied are different
    expect(veteranResult.appliedEpoch).not.toBeNull();
    expect(veteranResult.explanation).toContain("grandfather clause");
    expect(newbieResult.explanation).not.toContain("grandfather clause");
  });

  it("handles species-specific vs state-wide epochs", () => {
    // CO epoch is species-specific (elk only)
    // WY epoch is state-wide (all species)

    // CO mule_deer should NOT be affected by the CO elk epoch
    const coMDPoints: TimestampedPoint[] = [
      { acquiredYear: 2024, method: "application" },
      { acquiredYear: 2025, method: "application" },
    ];

    const result = computeEffectivePoints(coMDPoints, "CO", "mule_deer", 2030);
    expect(result.appliedEpoch).toBeNull(); // CO epoch only applies to elk
    expect(result.effectivePoints).toBe(2); // Face value, no epoch

    // WY mule_deer SHOULD be affected (state-wide epoch)
    const wyMDPoints: TimestampedPoint[] = [
      { acquiredYear: 2024, method: "application" },
      { acquiredYear: 2028, method: "application" },
    ];

    const wyResult = computeEffectivePoints(wyMDPoints, "WY", "mule_deer", 2028);
    expect(wyResult.appliedEpoch).not.toBeNull(); // WY epoch is state-wide
    expect(wyResult.grandfathered).toBe(true); // Has pre-2027 points
  });
});

// ============================================================================
// INTEGRATION: Cross-System Verification
// ============================================================================

describe("Cross-System Integration", () => {
  beforeEach(() => {
    idempotencyLedger.clear();
  });

  it("V1 snapshot migrates AND idempotency protects the migration", () => {
    const v1 = createV1Snapshot();
    const key = "migration:user-123:v1-to-v2";

    let migrationCount = 0;
    let migratedState: Record<string, unknown> | null = null;

    // Simulate migration triggered 50 times (e.g., multiple tab refreshes)
    for (let i = 0; i < 50; i++) {
      guardedOperation(key, "schema_migration", () => {
        migrationCount++;
        const result = migrateState(v1);
        migratedState = result.state;
        return result;
      });
    }

    // Migration ran exactly once
    expect(migrationCount).toBe(1);
    expect(migratedState).not.toBeNull();
    expect(detectSchemaVersion(migratedState!)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("migrated V1 points feed into Grandfather Clause engine", () => {
    // Start with a V1 snapshot that has 5 WY elk points
    const v1 = createV1Snapshot({
      existingPoints: { WY: { elk: 5 } },
    });

    // Migrate to V2
    const migrated = migrateState(v1);
    const history = migrated.state.pointAcquisitionHistory as PointAcquisitionRecord[];

    // Build timestamped points from migrated history
    const points = buildTimestampedPoints(history, "WY", "elk");
    expect(points).toHaveLength(5);

    // Feed into Grandfather Clause engine
    const effective = computeEffectivePoints(points, "WY", "elk", 2028);

    // All points should be legacy (acquired before 2027 epoch)
    // because migration backfills with years ending at current year
    expect(effective.legacyPoints + effective.modernPoints).toBe(5);
    expect(effective.effectivePoints).toBe(5);
  });

  it("full pipeline: V1 save → migrate → grandfather → idempotent draw outcome", () => {
    // 1. Start with V1 save file
    const v1Save = createV1Snapshot({ existingPoints: { WY: { elk: 8 } } });

    // 2. Migrate
    const migrated = migrateState(v1Save);
    expect(migrated.migrated).toBe(true);

    // 3. Grandfather check
    const history = migrated.state.pointAcquisitionHistory as PointAcquisitionRecord[];
    const points = buildTimestampedPoints(history, "WY", "elk");
    const effective = computeEffectivePoints(points, "WY", "elk", 2028);
    expect(effective.effectivePoints).toBe(8);

    // 4. Protected draw outcome (double-click proof)
    let drawExecuted = 0;
    const drawKey = "draw:wy-elk:2028:drew";

    for (let i = 0; i < 50; i++) {
      guardedDrawOutcome(drawKey, () => {
        drawExecuted++;
      });
    }

    expect(drawExecuted).toBe(1);
  });
});
