/**
 * DATA AIRLOCK TESTS — Staging Schema + Diff-Checker Tolerance Engine
 *
 * Validates that the Data Airlock correctly classifies F&G data changes:
 *   - Fee increases >8% → BLOCK
 *   - Fee decreases >1% → BLOCK (suspicious)
 *   - Deadline shifts >3 days → BLOCK
 *   - Quota drops >20% → BLOCK
 *   - Rule mutations → BLOCK
 *   - New species → WARN
 *   - Species removal → BLOCK
 *   - Within-tolerance changes → PASS
 */

import { describe, it, expect } from "vitest";
import {
  evaluateSnapshot,
  promoteSnapshot,
  generateChangeImpactNotifications,
  diffSnapshots,
  DEFAULT_TOLERANCES,
  type StagingSnapshot,
  type AirlockTolerances,
} from "@/lib/engine/data-airlock";
import type { State } from "@/lib/types";

// ── Helper: Build a minimal live State ──

function makeLiveState(overrides?: Partial<State>): State {
  return {
    id: "CO",
    name: "Colorado",
    abbreviation: "CO",
    pointSystem: "preference",
    pointSystemDetails: {
      preferencePct: 80,
      randomPct: 20,
      description: "True Preference with 80/20 hybrid.",
    },
    fgUrl: "https://cpw.state.co.us",
    buyPointsUrl: "https://cpw.state.co.us/draw",
    applicationDeadlines: {
      elk: { open: "2026-03-01", close: "2026-04-07" },
      mule_deer: { open: "2026-03-01", close: "2026-04-07" },
    },
    licenseFees: { qualifyingLicense: 101.54, appFee: 11, pointFee: 0 },
    feeSchedule: [
      { name: "NR Qualifying License", amount: 101.54, frequency: "annual", required: true },
      { name: "Application Processing Fee", amount: 11, frequency: "per_species", required: true },
    ],
    applicationApproach: "per_unit",
    applicationApproachDescription: "",
    applicationTips: [],
    onceInALifetime: ["moose", "bighorn_sheep", "mountain_goat"],
    availableSpecies: ["elk", "mule_deer", "moose", "bighorn_sheep", "mountain_goat"],
    drawResultDates: { elk: "2026-06-01", mule_deer: "2026-06-01" },
    pointCost: { elk: 0, mule_deer: 0, moose: 100, bighorn_sheep: 100, mountain_goat: 100 },
    tagCosts: { elk: 825.03, mule_deer: 494.47, moose: 2758.49, bighorn_sheep: 2758.49, mountain_goat: 2758.49 },
    color: "#1E40AF",
    ...overrides,
  } as State;
}

// ── Helper: Build a staging snapshot ──

function makeSnapshot(stateId: string, overrides?: Partial<StagingSnapshot>): StagingSnapshot {
  const live = makeLiveState();
  return {
    id: `staging-${stateId}-test`,
    stateId,
    capturedAt: "2026-02-24T10:00:00Z",
    sourceUrl: "https://cpw.state.co.us/fees",
    dataVersion: "2026.2",
    captureMethod: "manual",
    fees: {
      licenseFees: { ...live.licenseFees },
      feeSchedule: [...live.feeSchedule],
      tagCosts: { ...live.tagCosts },
      pointCost: { ...live.pointCost },
    },
    deadlines: {
      applicationDeadlines: { ...live.applicationDeadlines },
      drawResultDates: { ...live.drawResultDates },
    },
    quotas: {},
    rules: {
      pointSystem: live.pointSystem,
      pointSystemDetails: { ...live.pointSystemDetails },
      applicationApproach: live.applicationApproach,
      onceInALifetime: [...(live.onceInALifetime ?? [])],
    },
    species: {
      availableSpecies: [...live.availableSpecies],
    },
    capturedBy: "test",
    ...overrides,
  };
}

// ============================================================================
// 1. Fee Tolerance Tests
// ============================================================================

describe("Data Airlock: Fee Tolerance", () => {
  const live = makeLiveState();

  it("should PASS when no fees change", () => {
    const snapshot = makeSnapshot("CO");
    const verdict = evaluateSnapshot(snapshot, live);
    expect(verdict.overallVerdict).toBe("pass");
    expect(verdict.canAutoPromote).toBe(true);
    expect(verdict.blockCount).toBe(0);
  });

  it("should PASS when fee increases within 8% tolerance", () => {
    const snapshot = makeSnapshot("CO");
    // 5% increase on qualifying license: $101.54 → $106.62
    snapshot.fees.licenseFees.qualifyingLicense = 106.62;
    const verdict = evaluateSnapshot(snapshot, live);
    const feeDiffs = verdict.diffs.filter((d) => d.field.includes("qualifyingLicense"));
    expect(feeDiffs.length).toBe(1);
    expect(feeDiffs[0].severity).toBe("pass");
    expect(verdict.blockCount).toBe(0);
  });

  it("should BLOCK when fee increases >8%", () => {
    const snapshot = makeSnapshot("CO");
    // 12% increase: $101.54 → $113.72
    snapshot.fees.licenseFees.qualifyingLicense = 113.72;
    const verdict = evaluateSnapshot(snapshot, live);
    const feeDiffs = verdict.diffs.filter((d) => d.field.includes("qualifyingLicense"));
    expect(feeDiffs.length).toBe(1);
    expect(feeDiffs[0].severity).toBe("block");
    expect(verdict.overallVerdict).toBe("block");
    expect(verdict.canAutoPromote).toBe(false);
  });

  it("should BLOCK when fee decreases >1% (suspicious)", () => {
    const snapshot = makeSnapshot("CO");
    // 5% decrease: $101.54 → $96.46
    snapshot.fees.licenseFees.qualifyingLicense = 96.46;
    const verdict = evaluateSnapshot(snapshot, live);
    const feeDiffs = verdict.diffs.filter((d) => d.field.includes("qualifyingLicense"));
    expect(feeDiffs.length).toBe(1);
    expect(feeDiffs[0].severity).toBe("block");
    expect(feeDiffs[0].toleranceRule).toContain("decrease");
  });

  it("should PASS when fee decreases <=1%", () => {
    const snapshot = makeSnapshot("CO");
    // 0.5% decrease: $101.54 → $101.03
    snapshot.fees.licenseFees.qualifyingLicense = 101.03;
    const verdict = evaluateSnapshot(snapshot, live);
    const feeDiffs = verdict.diffs.filter((d) => d.field.includes("qualifyingLicense"));
    expect(feeDiffs.length).toBe(1);
    expect(feeDiffs[0].severity).toBe("pass");
  });

  it("should BLOCK when tag cost increases >8%", () => {
    const snapshot = makeSnapshot("CO");
    // 15% increase: $825.03 → $948.78
    snapshot.fees.tagCosts.elk = 948.78;
    const verdict = evaluateSnapshot(snapshot, live);
    const tagDiffs = verdict.diffs.filter((d) => d.field.includes("tagCost-elk"));
    expect(tagDiffs.length).toBe(1);
    expect(tagDiffs[0].severity).toBe("block");
    expect(tagDiffs[0].pctChange).toBeGreaterThan(8);
  });

  it("should detect fee schedule item changes", () => {
    const snapshot = makeSnapshot("CO");
    // Increase NR Qualifying License in fee schedule
    snapshot.fees.feeSchedule = snapshot.fees.feeSchedule.map((f) =>
      f.name === "NR Qualifying License" ? { ...f, amount: 115.00 } : f,
    );
    const verdict = evaluateSnapshot(snapshot, live);
    const scheduleDiffs = verdict.diffs.filter((d) => d.field.includes("feeSchedule"));
    expect(scheduleDiffs.length).toBe(1);
    expect(scheduleDiffs[0].severity).toBe("block"); // >8% increase
  });

  it("should handle multiple fee changes in one snapshot", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.fees.licenseFees.qualifyingLicense = 115.00; // >8% increase
    snapshot.fees.licenseFees.appFee = 12; // ~9% increase
    snapshot.fees.tagCosts.elk = 900.00; // ~9% increase
    const verdict = evaluateSnapshot(snapshot, live);
    expect(verdict.blockCount).toBe(3); // All three exceed 8%
    expect(verdict.overallVerdict).toBe("block");
  });
});

// ============================================================================
// 2. Deadline Tolerance Tests
// ============================================================================

describe("Data Airlock: Deadline Tolerance", () => {
  const live = makeLiveState();

  it("should PASS when deadlines don't change", () => {
    const snapshot = makeSnapshot("CO");
    const verdict = evaluateSnapshot(snapshot, live);
    const deadlineDiffs = verdict.diffs.filter((d) => d.category === "deadline");
    expect(deadlineDiffs.length).toBe(0);
  });

  it("should PASS when deadline shifts <=3 days", () => {
    const snapshot = makeSnapshot("CO");
    // Shift elk close date by 2 days later
    snapshot.deadlines.applicationDeadlines.elk = { open: "2026-03-01", close: "2026-04-09" };
    const verdict = evaluateSnapshot(snapshot, live);
    const deadlineDiffs = verdict.diffs.filter((d) => d.category === "deadline");
    expect(deadlineDiffs.length).toBe(1);
    expect(deadlineDiffs[0].severity).toBe("pass");
    expect(deadlineDiffs[0].daysDelta).toBe(2);
  });

  it("should BLOCK when deadline shifts >3 days", () => {
    const snapshot = makeSnapshot("CO");
    // Shift elk close date by 10 days later
    snapshot.deadlines.applicationDeadlines.elk = { open: "2026-03-01", close: "2026-04-17" };
    const verdict = evaluateSnapshot(snapshot, live);
    const deadlineDiffs = verdict.diffs.filter((d) => d.field.includes("elk") && d.field.includes("close"));
    expect(deadlineDiffs.length).toBe(1);
    expect(deadlineDiffs[0].severity).toBe("block");
    expect(deadlineDiffs[0].daysDelta).toBe(10);
  });

  it("should BLOCK when deadline shifts >3 days earlier", () => {
    const snapshot = makeSnapshot("CO");
    // Shift elk close date 5 days earlier
    snapshot.deadlines.applicationDeadlines.elk = { open: "2026-03-01", close: "2026-04-02" };
    const verdict = evaluateSnapshot(snapshot, live);
    const deadlineDiffs = verdict.diffs.filter((d) => d.field.includes("elk") && d.field.includes("close"));
    expect(deadlineDiffs.length).toBe(1);
    expect(deadlineDiffs[0].severity).toBe("block");
    expect(Math.abs(deadlineDiffs[0].daysDelta!)).toBe(5);
  });

  it("should detect open date shifts", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.deadlines.applicationDeadlines.elk = { open: "2026-03-15", close: "2026-04-07" };
    const verdict = evaluateSnapshot(snapshot, live);
    const openDiffs = verdict.diffs.filter((d) => d.field.includes("open"));
    expect(openDiffs.length).toBe(1);
    expect(openDiffs[0].severity).toBe("block"); // 14 days > 3
  });

  it("should WARN on draw result date shifts", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.deadlines.drawResultDates = { elk: "2026-06-15", mule_deer: "2026-06-01" };
    const verdict = evaluateSnapshot(snapshot, live);
    const resultDiffs = verdict.diffs.filter((d) => d.field.includes("drawResult"));
    expect(resultDiffs.length).toBe(1); // Only elk changed
    expect(resultDiffs[0].severity).toBe("warn"); // 14 days > 3 threshold
  });
});

// ============================================================================
// 3. Rule Mutation Tests
// ============================================================================

describe("Data Airlock: Rule Mutations", () => {
  const live = makeLiveState();

  it("should BLOCK when point system type changes", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.rules.pointSystem = "hybrid";
    const verdict = evaluateSnapshot(snapshot, live);
    const ruleDiffs = verdict.diffs.filter((d) => d.field === "pointSystem");
    expect(ruleDiffs.length).toBe(1);
    expect(ruleDiffs[0].severity).toBe("block");
    expect(verdict.overallVerdict).toBe("block");
  });

  it("should BLOCK when preference percentage changes", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.rules.pointSystemDetails.preferencePct = 75;
    const verdict = evaluateSnapshot(snapshot, live);
    const pctDiffs = verdict.diffs.filter((d) => d.field.includes("preferencePct"));
    expect(pctDiffs.length).toBe(1);
    expect(pctDiffs[0].severity).toBe("block");
  });

  it("should BLOCK when application approach changes", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.rules.applicationApproach = "per_state";
    const verdict = evaluateSnapshot(snapshot, live);
    const appDiffs = verdict.diffs.filter((d) => d.field === "applicationApproach");
    expect(appDiffs.length).toBe(1);
    expect(appDiffs[0].severity).toBe("block");
  });

  it("should BLOCK when species added to OIL list", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.rules.onceInALifetime = ["moose", "bighorn_sheep", "mountain_goat", "elk"];
    const verdict = evaluateSnapshot(snapshot, live);
    const oilDiffs = verdict.diffs.filter((d) => d.id.includes("oil-added"));
    expect(oilDiffs.length).toBe(1);
    expect(oilDiffs[0].speciesId).toBe("elk");
    expect(oilDiffs[0].severity).toBe("block");
  });

  it("should BLOCK when species removed from OIL list", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.rules.onceInALifetime = ["moose", "bighorn_sheep"]; // mountain_goat removed
    const verdict = evaluateSnapshot(snapshot, live);
    const oilDiffs = verdict.diffs.filter((d) => d.id.includes("oil-removed"));
    expect(oilDiffs.length).toBe(1);
    expect(oilDiffs[0].speciesId).toBe("mountain_goat");
    expect(oilDiffs[0].severity).toBe("block");
  });

  it("should BLOCK when bonus point squaring changes", () => {
    const liveNV = makeLiveState({
      id: "NV",
      pointSystem: "bonus_squared",
      pointSystemDetails: { squared: true, description: "Squared bonus" },
    });
    const snapshot = makeSnapshot("NV");
    snapshot.rules.pointSystem = "bonus_squared";
    snapshot.rules.pointSystemDetails = { squared: false, description: "Linear bonus" };
    const verdict = evaluateSnapshot(snapshot, liveNV);
    const squaredDiffs = verdict.diffs.filter((d) => d.field.includes("squared"));
    expect(squaredDiffs.length).toBe(1);
    expect(squaredDiffs[0].severity).toBe("block");
  });

  it("should PASS when rules don't change", () => {
    const snapshot = makeSnapshot("CO");
    const verdict = evaluateSnapshot(snapshot, live);
    const ruleDiffs = verdict.diffs.filter((d) => d.category === "rule");
    expect(ruleDiffs.length).toBe(0);
  });
});

// ============================================================================
// 4. Species List Tests
// ============================================================================

describe("Data Airlock: Species Changes", () => {
  const live = makeLiveState();

  it("should WARN when new species added", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.species.availableSpecies = [...live.availableSpecies, "black_bear"];
    const verdict = evaluateSnapshot(snapshot, live);
    const speciesDiffs = verdict.diffs.filter((d) => d.id.includes("species-added"));
    expect(speciesDiffs.length).toBe(1);
    expect(speciesDiffs[0].severity).toBe("warn");
    expect(speciesDiffs[0].speciesId).toBe("black_bear");
  });

  it("should BLOCK when species removed", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.species.availableSpecies = live.availableSpecies.filter((s) => s !== "moose");
    const verdict = evaluateSnapshot(snapshot, live);
    const speciesDiffs = verdict.diffs.filter((d) => d.id.includes("species-removed"));
    expect(speciesDiffs.length).toBe(1);
    expect(speciesDiffs[0].severity).toBe("block");
    expect(speciesDiffs[0].speciesId).toBe("moose");
  });

  it("should PASS when species list unchanged", () => {
    const snapshot = makeSnapshot("CO");
    const verdict = evaluateSnapshot(snapshot, live);
    const speciesDiffs = verdict.diffs.filter((d) => d.category === "species");
    expect(speciesDiffs.length).toBe(0);
  });
});

// ============================================================================
// 5. Verdict Summary Tests
// ============================================================================

describe("Data Airlock: Verdict & Summary", () => {
  const live = makeLiveState();

  it("should produce correct block/warn/pass counts", () => {
    const snapshot = makeSnapshot("CO");
    // 1 block (fee >8%)
    snapshot.fees.licenseFees.qualifyingLicense = 115.00;
    // 1 warn (new species)
    snapshot.species.availableSpecies = [...live.availableSpecies, "black_bear"];
    // 1 pass (deadline within tolerance)
    snapshot.deadlines.applicationDeadlines.elk = { open: "2026-03-01", close: "2026-04-08" };
    const verdict = evaluateSnapshot(snapshot, live);
    expect(verdict.blockCount).toBeGreaterThanOrEqual(1);
    expect(verdict.warnCount).toBeGreaterThanOrEqual(1);
    expect(verdict.overallVerdict).toBe("block");
    expect(verdict.canAutoPromote).toBe(false);
    expect(verdict.requiredAction).toBeDefined();
  });

  it("should auto-promote when all changes pass", () => {
    const snapshot = makeSnapshot("CO");
    // Small fee change within tolerance: 3% increase
    snapshot.fees.licenseFees.qualifyingLicense = 104.59;
    const verdict = evaluateSnapshot(snapshot, live);
    expect(verdict.canAutoPromote).toBe(true);
    expect(verdict.overallVerdict).toBe("pass");
  });

  it("should produce a human-readable summary", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.fees.licenseFees.qualifyingLicense = 115.00; // Block
    const verdict = evaluateSnapshot(snapshot, live);
    expect(verdict.summary).toContain("blocked");
  });
});

// ============================================================================
// 6. Snapshot Promotion Tests
// ============================================================================

describe("Data Airlock: Snapshot Promotion", () => {
  const live = makeLiveState();

  it("should apply fee changes to promoted state", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.fees.licenseFees.qualifyingLicense = 105.00;
    snapshot.fees.tagCosts.elk = 850.00;
    const promoted = promoteSnapshot(snapshot, live);
    expect(promoted.licenseFees.qualifyingLicense).toBe(105.00);
    expect(promoted.tagCosts.elk).toBe(850.00);
    // Unchanged fields preserved
    expect(promoted.licenseFees.appFee).toBe(11);
    expect(promoted.tagCosts.mule_deer).toBe(494.47);
  });

  it("should apply deadline changes to promoted state", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.deadlines.applicationDeadlines.elk = { open: "2026-03-05", close: "2026-04-10" };
    const promoted = promoteSnapshot(snapshot, live);
    expect(promoted.applicationDeadlines.elk.close).toBe("2026-04-10");
    expect(promoted.applicationDeadlines.elk.open).toBe("2026-03-05");
    // Unchanged species preserved
    expect(promoted.applicationDeadlines.mule_deer.close).toBe("2026-04-07");
  });

  it("should apply rule changes to promoted state", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.rules.pointSystem = "hybrid";
    const promoted = promoteSnapshot(snapshot, live);
    expect(promoted.pointSystem).toBe("hybrid");
  });

  it("should update metadata on promotion", () => {
    const snapshot = makeSnapshot("CO");
    const promoted = promoteSnapshot(snapshot, live);
    expect(promoted.lastScrapedAt).toBe(snapshot.capturedAt);
    expect(promoted.dataVersion).toBe("2026.2");
    expect(promoted.sourceUrl).toBe(snapshot.sourceUrl);
  });

  it("should NOT mutate the original live state", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.fees.licenseFees.qualifyingLicense = 999;
    const promoted = promoteSnapshot(snapshot, live);
    expect(live.licenseFees.qualifyingLicense).toBe(101.54); // Unchanged
    expect(promoted.licenseFees.qualifyingLicense).toBe(999);
  });
});

// ============================================================================
// 7. Change Impact Notifications Tests
// ============================================================================

describe("Data Airlock: Change Impact Notifications", () => {
  const live = makeLiveState();

  it("should generate fee notifications for active portfolio states", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.fees.licenseFees.qualifyingLicense = 115.00;
    const verdict = evaluateSnapshot(snapshot, live);
    const notifications = generateChangeImpactNotifications(
      verdict,
      ["CO", "WY"],
      { CO: ["elk", "mule_deer"], WY: ["elk"] },
    );
    expect(notifications.length).toBeGreaterThan(0);
    const feeNotif = notifications.find((n) => n.category === "fee");
    expect(feeNotif).toBeDefined();
    expect(feeNotif!.severity).toBe("critical"); // Blocked fee
    expect(feeNotif!.actionRequired).toBe(true);
  });

  it("should NOT generate notifications for states not in user portfolio", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.fees.licenseFees.qualifyingLicense = 115.00;
    const verdict = evaluateSnapshot(snapshot, live);
    const notifications = generateChangeImpactNotifications(
      verdict,
      ["WY", "MT"], // CO not in active states
      { WY: ["elk"], MT: ["elk"] },
    );
    expect(notifications.length).toBe(0);
  });

  it("should generate rule change notifications as critical", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.rules.pointSystem = "hybrid";
    const verdict = evaluateSnapshot(snapshot, live);
    const notifications = generateChangeImpactNotifications(
      verdict,
      ["CO"],
      { CO: ["elk"] },
    );
    const ruleNotif = notifications.find((n) => n.category === "rule");
    expect(ruleNotif).toBeDefined();
    expect(ruleNotif!.severity).toBe("critical");
    expect(ruleNotif!.actionRequired).toBe(true);
  });

  it("should include CTA links in notifications", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.fees.licenseFees.qualifyingLicense = 115.00;
    const verdict = evaluateSnapshot(snapshot, live);
    const notifications = generateChangeImpactNotifications(
      verdict,
      ["CO"],
      { CO: ["elk"] },
    );
    const feeNotif = notifications.find((n) => n.category === "fee");
    expect(feeNotif!.cta).toBeDefined();
    expect(feeNotif!.cta!.href).toBe("/budget");
  });
});

// ============================================================================
// 8. Snapshot-to-Snapshot Diff Tests
// ============================================================================

describe("Data Airlock: Snapshot-to-Snapshot Diff", () => {
  it("should detect changes between two snapshots", () => {
    const old = makeSnapshot("CO");
    const newer = makeSnapshot("CO");
    newer.fees.licenseFees.qualifyingLicense = 115.00;
    const diffs = diffSnapshots(old, newer);
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs[0].category).toBe("fee");
  });

  it("should return empty when snapshots are identical", () => {
    const old = makeSnapshot("CO");
    const newer = makeSnapshot("CO");
    const diffs = diffSnapshots(old, newer);
    expect(diffs.length).toBe(0);
  });
});

// ============================================================================
// 9. Custom Tolerance Tests
// ============================================================================

describe("Data Airlock: Custom Tolerances", () => {
  const live = makeLiveState();

  it("should respect custom fee increase threshold", () => {
    const snapshot = makeSnapshot("CO");
    // 10% increase — would be blocked at 8%, but should pass at 15%
    snapshot.fees.licenseFees.qualifyingLicense = 111.69;
    const lenientTolerances: AirlockTolerances = {
      ...DEFAULT_TOLERANCES,
      feeIncreaseMaxPct: 15,
    };
    const verdict = evaluateSnapshot(snapshot, live, lenientTolerances);
    const feeDiffs = verdict.diffs.filter((d) => d.field.includes("qualifyingLicense"));
    expect(feeDiffs[0].severity).toBe("pass");
  });

  it("should respect custom deadline shift threshold", () => {
    const snapshot = makeSnapshot("CO");
    // 5 day shift — would be blocked at 3, but should pass at 7
    snapshot.deadlines.applicationDeadlines.elk = { open: "2026-03-01", close: "2026-04-12" };
    const lenientTolerances: AirlockTolerances = {
      ...DEFAULT_TOLERANCES,
      deadlineShiftMaxDays: 7,
    };
    const verdict = evaluateSnapshot(snapshot, live, lenientTolerances);
    const deadlineDiffs = verdict.diffs.filter((d) => d.field.includes("elk") && d.field.includes("close"));
    expect(deadlineDiffs[0].severity).toBe("pass");
  });

  it("should allow disabling rule mutation blocking", () => {
    const snapshot = makeSnapshot("CO");
    snapshot.rules.pointSystem = "hybrid";
    const lenientTolerances: AirlockTolerances = {
      ...DEFAULT_TOLERANCES,
      blockOnRuleMutation: false,
    };
    const verdict = evaluateSnapshot(snapshot, live, lenientTolerances);
    const ruleDiffs = verdict.diffs.filter((d) => d.field === "pointSystem");
    expect(ruleDiffs[0].severity).toBe("warn"); // Warn instead of block
  });
});
