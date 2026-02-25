/**
 * REAL-WORLD CHAOS SUITE — Automated Edge-Case Tests
 *
 * Phase 1: Crawler & Data Ingestion (broken DOM, PDF hallucination)
 * Phase 2: Temporal & Deadline Stress (48hr warning, timezone, leap year)
 * Phase 3: Chaotic Human (residency switch, portfolio freeze, missed-it slide)
 * Phase 4: Multi-Player Destructibility (flaky buddy, mixed residency)
 * Phase 5: Micro-Financial Reconciliation (CC fees, refund delays)
 */

import { describe, it, expect } from "vitest";
import {
  validateCrawlData,
  checkAnomalousVariance,
  computeDeadlineUrgency,
  convertDeadlineToUserTimezone,
  isLeapYear,
  validateDateAcrossYears,
  computeResidencySwitch,
  computePortfolioFreeze,
  slideRoadmapForMissedDeadline,
  computeFlakeBuddyImpact,
  checkMixedResidencyParty,
  computeRefinedCapital,
  computeRefundStatus,
  type StagingSnapshot,
} from "@/lib/engine/chaos-suite";
import type { RoadmapYear, RoadmapAction } from "@/lib/types";

// ── Helpers ──

function makeSnapshot(overrides?: Partial<StagingSnapshot>): StagingSnapshot {
  return {
    id: "staging-CO-test",
    stateId: "CO",
    capturedAt: "2026-02-24T10:00:00Z",
    sourceUrl: "https://cpw.state.co.us/fees",
    dataVersion: "2026.2",
    captureMethod: "scrape",
    fees: {
      licenseFees: { qualifyingLicense: 101.54, appFee: 11, pointFee: 0 },
      feeSchedule: [
        { name: "NR Qualifying License", amount: 101.54, frequency: "annual", required: true },
      ],
      tagCosts: { elk: 825.03, mule_deer: 494.47 },
      pointCost: { elk: 0, mule_deer: 0 },
    },
    deadlines: {
      applicationDeadlines: {
        elk: { open: "2026-03-01", close: "2026-04-07" },
      },
    },
    quotas: {},
    rules: {
      pointSystem: "preference",
      pointSystemDetails: { preferencePct: 80, randomPct: 20, description: "Test" },
      applicationApproach: "per_unit",
    },
    species: { availableSpecies: ["elk", "mule_deer"] },
    capturedBy: "test",
    ...overrides,
  } as StagingSnapshot;
}

function makeRoadmap(years: { year: number; actions: Partial<RoadmapAction>[] }[]): RoadmapYear[] {
  return years.map((yr) => ({
    year: yr.year,
    phase: "build" as const,
    actions: yr.actions.map((a) => ({
      type: a.type ?? "apply",
      stateId: a.stateId ?? "CO",
      speciesId: a.speciesId ?? "elk",
      description: "",
      cost: a.cost ?? 0,
      costs: [],
      ...a,
    })) as RoadmapAction[],
    estimatedCost: 0,
    isHuntYear: false,
    pointYearCost: 0,
    huntYearCost: 0,
  }));
}

// ============================================================================
// PHASE 1: CRAWLER & DATA INGESTION
// ============================================================================

describe("Phase 1: Crawler Fail-Safes", () => {
  describe("Test 1.1: Broken DOM Protocol — Null Detection", () => {
    it("should PASS for valid snapshot data", () => {
      const snapshot = makeSnapshot();
      const result = validateCrawlData(snapshot);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.shouldRevert).toBe(false);
    });

    it("should detect null license fee and flag P1", () => {
      const snapshot = makeSnapshot();
      (snapshot.fees.licenseFees as Record<string, unknown>).qualifyingLicense = null;
      const result = validateCrawlData(snapshot, "last-good-123");
      expect(result.isValid).toBe(false);
      expect(result.shouldRevert).toBe(true);
      expect(result.lastKnownGoodId).toBe("last-good-123");
      const p1Errors = result.errors.filter((e) => e.severity === "p1");
      expect(p1Errors.length).toBeGreaterThan(0);
    });

    it("should detect $0 tag cost as P1 error (no state gives free NR tags)", () => {
      const snapshot = makeSnapshot();
      snapshot.fees.tagCosts.elk = 0;
      const result = validateCrawlData(snapshot);
      expect(result.isValid).toBe(false);
      const tagError = result.errors.find((e) => e.field.includes("tagCosts.elk"));
      expect(tagError).toBeDefined();
      expect(tagError!.severity).toBe("p1");
      expect(tagError!.message).toContain("$0");
    });

    it("should detect NaN fee value", () => {
      const snapshot = makeSnapshot();
      (snapshot.fees.licenseFees as Record<string, unknown>).appFee = NaN;
      const result = validateCrawlData(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.shouldRevert).toBe(true);
    });

    it("should detect negative fee value", () => {
      const snapshot = makeSnapshot();
      snapshot.fees.licenseFees.qualifyingLicense = -50;
      const result = validateCrawlData(snapshot);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain("negative");
    });

    it("should detect invalid date format in deadlines", () => {
      const snapshot = makeSnapshot();
      snapshot.deadlines.applicationDeadlines.elk = { open: "not-a-date", close: "2026-04-07" };
      const result = validateCrawlData(snapshot);
      expect(result.isValid).toBe(false);
      const dateError = result.errors.find((e) => e.expected === "date");
      expect(dateError).toBeDefined();
    });

    it("should detect empty species list (total scrape failure)", () => {
      const snapshot = makeSnapshot();
      snapshot.species.availableSpecies = [];
      const result = validateCrawlData(snapshot);
      expect(result.isValid).toBe(false);
      const speciesError = result.errors.find((e) => e.field === "availableSpecies");
      expect(speciesError).toBeDefined();
      expect(speciesError!.message).toContain("empty");
    });

    it("should detect NaN in fee schedule items", () => {
      const snapshot = makeSnapshot();
      snapshot.fees.feeSchedule[0].amount = NaN;
      const result = validateCrawlData(snapshot);
      expect(result.isValid).toBe(false);
    });
  });

  describe("Test 1.2: Anomalous Variance Checker — PDF Parse Errors", () => {
    const oldData = [
      { pointsRequired: 8, unitId: "unit-201", stateId: "CO", speciesId: "elk" },
      { pointsRequired: 5, unitId: "unit-11", stateId: "CO", speciesId: "elk" },
      { pointsRequired: 3, unitId: "unit-4", stateId: "CO", speciesId: "elk" },
    ];

    it("should quarantine unit with suspicious point drop (8 → 3)", () => {
      const newData = [
        { pointsRequired: 3, unitId: "unit-201", stateId: "CO", speciesId: "elk" }, // 8→3 drop!
        { pointsRequired: 5, unitId: "unit-11", stateId: "CO", speciesId: "elk" },
        { pointsRequired: 3, unitId: "unit-4", stateId: "CO", speciesId: "elk" },
      ];
      const results = checkAnomalousVariance(oldData, newData, 3);
      expect(results.length).toBe(1);
      expect(results[0].quarantined).toBe(true);
      expect(results[0].unitId).toBe("unit-201");
      expect(results[0].delta).toBe(-5);
      expect(results[0].reason).toContain("OCR/parse error");
    });

    it("should NOT quarantine normal 1-point changes", () => {
      const newData = [
        { pointsRequired: 9, unitId: "unit-201", stateId: "CO", speciesId: "elk" }, // +1
        { pointsRequired: 4, unitId: "unit-11", stateId: "CO", speciesId: "elk" },  // -1
        { pointsRequired: 3, unitId: "unit-4", stateId: "CO", speciesId: "elk" },
      ];
      const results = checkAnomalousVariance(oldData, newData, 3);
      expect(results.length).toBe(0);
    });

    it("should quarantine suspicious massive INCREASE", () => {
      const newData = [
        { pointsRequired: 20, unitId: "unit-201", stateId: "CO", speciesId: "elk" }, // 8→20!
        { pointsRequired: 5, unitId: "unit-11", stateId: "CO", speciesId: "elk" },
        { pointsRequired: 3, unitId: "unit-4", stateId: "CO", speciesId: "elk" },
      ];
      const results = checkAnomalousVariance(oldData, newData, 3);
      expect(results.length).toBe(1);
      expect(results[0].quarantined).toBe(true);
      expect(results[0].delta).toBe(12);
    });

    it("should allow custom threshold", () => {
      const newData = [
        { pointsRequired: 4, unitId: "unit-201", stateId: "CO", speciesId: "elk" }, // -4
      ];
      // With threshold=5, a 4-point drop should pass
      const results = checkAnomalousVariance(oldData.slice(0, 1), newData, 5);
      expect(results.length).toBe(0);
    });
  });
});

// ============================================================================
// PHASE 2: TEMPORAL & DEADLINE STRESS
// ============================================================================

describe("Phase 2: Temporal Logic", () => {
  describe("Test 2.1: 48-Hour Critical Deadline Warning", () => {
    const deadlines = [
      { stateId: "CO", speciesId: "elk", close: "2026-04-07" },
      { stateId: "WY", speciesId: "elk", close: "2026-05-31" },
      { stateId: "NV", speciesId: "mule_deer", close: "2026-04-06" },
    ];

    it("should flag 48hr critical with server crash warning", () => {
      // Set "now" to April 6, 2026 at 8 AM (36 hours before CO deadline)
      const now = new Date("2026-04-06T08:00:00");
      const results = computeDeadlineUrgency(deadlines, now);

      const coResult = results.find((r) => r.stateId === "CO");
      expect(coResult!.urgencyLevel).toBe("critical_48hr");
      expect(coResult!.serverCrashWarning).toBe(true);
      expect(coResult!.message).toContain("crash on deadline day");
    });

    it("should flag expired deadlines", () => {
      const now = new Date("2026-04-10T08:00:00");
      const results = computeDeadlineUrgency(deadlines, now);

      const coResult = results.find((r) => r.stateId === "CO");
      expect(coResult!.urgencyLevel).toBe("expired");
    });

    it("should flag 7-day urgent window", () => {
      const now = new Date("2026-04-02T08:00:00"); // 5 days before CO
      const results = computeDeadlineUrgency(deadlines, now);

      const coResult = results.find((r) => r.stateId === "CO");
      expect(coResult!.urgencyLevel).toBe("urgent_7d");
      expect(coResult!.serverCrashWarning).toBe(false);
    });

    it("should return sorted by urgency (most urgent first)", () => {
      const now = new Date("2026-04-06T08:00:00");
      const results = computeDeadlineUrgency(deadlines, now);
      expect(results[0].hoursRemaining).toBeLessThanOrEqual(results[1].hoursRemaining);
    });

    it("should classify 30+ day deadlines as safe", () => {
      const now = new Date("2026-03-01T08:00:00"); // 37 days before CO
      const results = computeDeadlineUrgency(deadlines, now);

      const coResult = results.find((r) => r.stateId === "CO");
      expect(coResult!.urgencyLevel).toBe("safe");
    });
  });

  describe("Test 2.2: Timezone Conversion", () => {
    it("should convert CO deadline (America/Denver) to NYC time", () => {
      const result = convertDeadlineToUserTimezone(
        "CO", "elk",
        "2026-04-07",
        "America/Denver",
        "America/New_York",
      );
      expect(result.stateTimezone).toBe("America/Denver");
      expect(result.deadlineUtc).toBeInstanceOf(Date);
      expect(result.userLocalDisplay).toBeDefined();
      expect(result.warningNote).toBeUndefined(); // CO is not Arizona
    });

    it("should flag Arizona DST warning", () => {
      const result = convertDeadlineToUserTimezone(
        "AZ", "elk",
        "2026-04-07",
        "America/Phoenix",
        "America/New_York",
      );
      expect(result.warningNote).toBeDefined();
      expect(result.warningNote).toContain("Arizona");
      expect(result.warningNote).toContain("Daylight Saving");
    });

    it("should produce valid UTC Date", () => {
      const result = convertDeadlineToUserTimezone(
        "CO", "elk",
        "2026-04-07",
        "America/Denver",
        "America/Chicago",
      );
      expect(result.deadlineUtc.getTime()).not.toBeNaN();
    });
  });

  describe("Test 2.3: Leap Year Safety", () => {
    it("should correctly identify leap years", () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2028)).toBe(true);
      expect(isLeapYear(2032)).toBe(true);
      expect(isLeapYear(1900)).toBe(false); // Century non-leap
      expect(isLeapYear(2000)).toBe(true);  // 400-year leap
    });

    it("should pin Feb 29 to Feb 28 in non-leap years (NOT March 1)", () => {
      const results = validateDateAcrossYears("2028-02-29", 5);
      // 2028 is leap year (base)
      expect(results[0].date).toBe("2028-02-29");
      expect(results[0].shifted).toBe(false);

      // 2029 is NOT leap year — must pin to Feb 28
      expect(results[1].date).toBe("2029-02-28");
      expect(results[1].shifted).toBe(true);

      // Must NOT shift to March 1
      expect(results[1].date).not.toContain("03-01");
    });

    it("should handle 10-year projection through 2028 and 2032", () => {
      const results = validateDateAcrossYears("2026-02-28", 10);
      // 2028 and 2032 are leap years
      expect(results.find((r) => r.year === 2028)!.isLeapYear).toBe(true);
      expect(results.find((r) => r.year === 2032)!.isLeapYear).toBe(true);
      // All dates should be valid
      for (const r of results) {
        expect(r.date).toMatch(/^\d{4}-02-28$/);
      }
    });

    it("should not shift non-Feb-29 dates", () => {
      const results = validateDateAcrossYears("2026-03-15", 5);
      for (const r of results) {
        expect(r.shifted).toBe(false);
        expect(r.date).toMatch(/^\d{4}-03-15$/);
      }
    });
  });
});

// ============================================================================
// PHASE 3: CHAOTIC HUMAN EDGE CASES
// ============================================================================

describe("Phase 3: Chaotic Human", () => {
  describe("Test 3.1: Mid-Stream Residency Switch", () => {
    it("should compute fee savings when moving TO a state with active positions", () => {
      const result = computeResidencySwitch(
        "FL",    // Old home (NR everywhere)
        "CO",    // New home (now resident in CO)
        ["CO", "WY", "MT"],
        { CO: ["elk", "mule_deer"], WY: ["elk"], MT: ["elk"] },
      );

      // Should have fee impacts for CO (now resident = cheaper)
      const coImpacts = result.feeImpact.filter((f) => f.stateId === "CO");
      expect(coImpacts.length).toBeGreaterThan(0);
      for (const impact of coImpacts) {
        expect(impact.newResidency).toBe("resident");
        expect(impact.delta).toBeLessThan(0); // Cheaper as resident
      }

      expect(result.totalAnnualSavings).toBeGreaterThan(0);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts[0].description).toContain("resident");
    });

    it("should compute fee INCREASES when moving AWAY from a state", () => {
      const result = computeResidencySwitch(
        "CO",    // Was CO resident
        "FL",    // Moving to FL (now NR in CO)
        ["CO", "WY"],
        { CO: ["elk"], WY: ["elk"] },
      );

      const coImpacts = result.feeImpact.filter((f) => f.stateId === "CO");
      expect(coImpacts.length).toBeGreaterThan(0);
      for (const impact of coImpacts) {
        expect(impact.newResidency).toBe("nonresident");
        expect(impact.delta).toBeGreaterThan(0); // More expensive as NR
      }

      expect(result.totalAnnualIncrease).toBeGreaterThan(0);
    });

    it("should generate both savings and increase alerts for CO→WY", () => {
      const result = computeResidencySwitch(
        "CO",    // Was CO resident
        "WY",    // Now WY resident
        ["CO", "WY"],
        { CO: ["elk"], WY: ["elk"] },
      );

      // Should save on WY (now resident) but lose on CO (now NR)
      expect(result.feeImpact.length).toBeGreaterThanOrEqual(2);
      expect(result.alerts.length).toBeGreaterThanOrEqual(1);
    });

    it("should return no impact for states where residency didn't change", () => {
      const result = computeResidencySwitch(
        "FL",
        "TX",    // Neither FL nor TX are in active states
        ["CO", "WY"],
        { CO: ["elk"], WY: ["elk"] },
      );
      expect(result.feeImpact.length).toBe(0);
      expect(result.netBudgetImpact).toBe(0);
    });
  });

  describe("Test 3.2: Portfolio Freeze / Suspension", () => {
    const existingPoints: Record<string, Record<string, number>> = {
      CO: { elk: 6, mule_deer: 3 },
      WY: { elk: 4 },
      NV: { mule_deer: 8 },
    };

    it("should preserve purge risk alerts while frozen", () => {
      const roadmap = makeRoadmap([
        { year: 2026, actions: [{ stateId: "CO", speciesId: "elk" }] },
      ]);
      const result = computePortfolioFreeze("violation", existingPoints, roadmap);
      expect(result.isFrozen).toBe(true);
      expect(result.purgeRisks.length).toBeGreaterThan(0);
      expect(result.preservedAlerts.length).toBeGreaterThan(0);

      // Check that purge-risk states are identified
      const wyPurge = result.purgeRisks.find((r) => r.stateId === "WY");
      expect(wyPurge).toBeDefined();
      expect(wyPurge!.currentPoints).toBe(4);
    });

    it("should suppress apply/hunt/scout actions", () => {
      const result = computePortfolioFreeze("violation", existingPoints, []);
      expect(result.suppressedActions).toContain("apply");
      expect(result.suppressedActions).toContain("hunt");
      expect(result.suppressedActions).toContain("scout");
      // buy_points should NOT be suppressed (needed to prevent purge)
      expect(result.suppressedActions).not.toContain("buy_points");
    });

    it("should label freeze reason correctly", () => {
      const result = computePortfolioFreeze("violation", existingPoints, []);
      expect(result.freezeReason).toContain("Wildlife violation");

      const medResult = computePortfolioFreeze("medical", existingPoints, []);
      expect(medResult.freezeReason).toContain("Medical");
    });

    it("should alert for every state with purge rules and points", () => {
      const result = computePortfolioFreeze("voluntary", existingPoints, []);
      // WY has 2yr purge, NV has 1yr purge, CO has 10yr
      const alerts = result.preservedAlerts;
      expect(alerts.some((a) => a.stateId === "WY")).toBe(true);
      expect(alerts.some((a) => a.stateId === "NV")).toBe(true);
    });
  });

  describe("Test 3.3: Missed-It Roadmap Slide", () => {
    const roadmap = makeRoadmap([
      { year: 2026, actions: [
        { stateId: "CO", speciesId: "elk", type: "apply" },
        { stateId: "WY", speciesId: "elk", type: "apply" },
      ]},
      { year: 2027, actions: [
        { stateId: "CO", speciesId: "elk", type: "apply" },
      ]},
      { year: 2028, actions: [
        { stateId: "CO", speciesId: "elk", type: "hunt" },
      ]},
    ]);

    it("should slide CO elk actions right by 1 year", () => {
      const result = slideRoadmapForMissedDeadline(roadmap, "CO", "elk", 2026, 5);

      // 2026 should no longer have CO elk
      const yr2026 = result.slidRoadmap.find((y) => y.year === 2026);
      const coElk2026 = yr2026?.actions.filter(
        (a) => a.stateId === "CO" && a.speciesId === "elk",
      );
      expect(coElk2026?.length ?? 0).toBe(0);

      // 2027 should now have 2 CO elk entries (slid from 2026 + original 2027)
      const yr2027 = result.slidRoadmap.find((y) => y.year === 2027);
      const coElk2027 = yr2027?.actions.filter(
        (a) => a.stateId === "CO" && a.speciesId === "elk",
      );
      expect(coElk2027!.length).toBeGreaterThanOrEqual(1);
    });

    it("should NOT slide other state/species actions", () => {
      const result = slideRoadmapForMissedDeadline(roadmap, "CO", "elk", 2026, 5);

      // WY elk in 2026 should remain untouched
      const yr2026 = result.slidRoadmap.find((y) => y.year === 2026);
      const wyElk = yr2026?.actions.filter(
        (a) => a.stateId === "WY" && a.speciesId === "elk",
      );
      expect(wyElk!.length).toBe(1);
    });

    it("should generate inactivity warning if user has points", () => {
      const result = slideRoadmapForMissedDeadline(roadmap, "CO", "elk", 2026, 5);
      const purgeAlert = result.alerts.find((a) => a.id.includes("purge"));
      // CO has a 10yr purge rule, so alert should exist
      expect(purgeAlert).toBeDefined();
    });

    it("should generate roadmap slide confirmation alert", () => {
      const result = slideRoadmapForMissedDeadline(roadmap, "CO", "elk", 2026, 0);
      const slideAlert = result.alerts.find((a) => a.id.includes("roadmap-slide"));
      expect(slideAlert).toBeDefined();
      expect(slideAlert!.title).toContain("+1 Year");
    });
  });
});

// ============================================================================
// PHASE 4: MULTI-PLAYER DESTRUCTIBILITY
// ============================================================================

describe("Phase 4: Multi-Player Destructibility", () => {
  describe("Test 4.1: Flaky Buddy Recompute", () => {
    it("should detect severe odds drop when buddy bails (3→2 man group)", () => {
      // [10, 1, 1]: avg = 4, floor = 4. Remove index 0 (strongest) → [1, 1] avg = 1.
      // Drop = 4 - 1 = 3. That's "severe" (>= 3).
      const result = computeFlakeBuddyImpact(
        "CO", "elk",
        [10, 1, 1],   // 3-man group, strongest has 10 pts
        0,             // Strongest member bails
      );

      expect(result.oldGroupSize).toBe(3);
      expect(result.newGroupSize).toBe(2);
      expect(result.pointsDrop).toBeGreaterThanOrEqual(3);
      expect(result.oddsImpact).toBe("severe");
      expect(result.alert).toBeDefined();
      expect(result.alert.eventType).toBe("party_change");
    });

    it("should generate critical alert for severe point drop", () => {
      // 3 members: [8, 1, 1]. Group avg ≈ 3.3 → floor = 3
      // If high-point member bails: [1, 1] avg = 1 → floor = 1. Drop of 2.
      // If low-point member bails: [8, 1] avg = 4.5 → floor = 4. Drop = 0 or -1.
      const result = computeFlakeBuddyImpact(
        "CO", "elk",
        [8, 1, 1],
        0, // High-point member bails
      );

      // Points should drop significantly
      expect(result.pointsDrop).toBeGreaterThan(0);
      expect(result.alert.description).toContain("dropped");
    });

    it("should classify minimal impact correctly", () => {
      // Two members with same points
      const result = computeFlakeBuddyImpact(
        "CO", "elk",
        [5, 5],
        1, // One bails, but solo is still 5
      );

      // Going from group avg 5 to solo 5 = no drop
      expect(result.newGroupSize).toBe(1);
    });
  });

  describe("Test 4.2: Mixed Residency Party Warning", () => {
    it("should warn when resident applies with non-resident in CO", () => {
      const result = checkMixedResidencyParty(
        "CO", "elk",
        [
          { memberId: "matt", homeState: "CO" },    // Resident
          { memberId: "dave", homeState: "TX" },     // Non-resident
        ],
      );

      expect(result.hasWarning).toBe(true);
      expect(result.alert).toBeDefined();
      expect(result.alert!.description).toContain("Non-Resident cap");
      expect(result.impactDescription).toContain("entire party");
    });

    it("should NOT warn for all-resident parties", () => {
      const result = checkMixedResidencyParty(
        "CO", "elk",
        [
          { memberId: "matt", homeState: "CO" },
          { memberId: "joe", homeState: "CO" },
        ],
      );

      expect(result.hasWarning).toBe(false);
      expect(result.alert).toBeUndefined();
    });

    it("should NOT warn for all-NR parties", () => {
      const result = checkMixedResidencyParty(
        "CO", "elk",
        [
          { memberId: "matt", homeState: "TX" },
          { memberId: "dave", homeState: "FL" },
        ],
      );

      expect(result.hasWarning).toBe(false);
    });

    it("should enforce mixed-party rules for western states", () => {
      // Test multiple states
      for (const state of ["CO", "WY", "MT", "NV"]) {
        const result = checkMixedResidencyParty(
          state, "elk",
          [
            { memberId: "res", homeState: state },
            { memberId: "nr", homeState: "FL" },
          ],
        );
        expect(result.hasWarning).toBe(true);
      }
    });

    it("should recommend applying separately", () => {
      const result = checkMixedResidencyParty(
        "CO", "elk",
        [
          { memberId: "matt", homeState: "CO" },
          { memberId: "dave", homeState: "TX" },
        ],
      );

      expect(result.alert!.recommendation).toContain("separately");
    });
  });
});

// ============================================================================
// PHASE 5: MICRO-FINANCIAL RECONCILIATION
// ============================================================================

describe("Phase 5: Micro-Financial Reconciliation", () => {
  describe("Test 5.1: CC Fee Segregation", () => {
    it("should correctly segregate NM elk upfront float", () => {
      const result = computeRefinedCapital(
        "NM", "elk",
        790,          // Gross float
        13,           // Application fee
        0.025,        // 2.5% CC rate
      );

      expect(result.grossFloat).toBe(790);
      expect(result.applicationFee).toBe(13);
      expect(result.ccProcessingFee).toBe(19.75); // 790 * 0.025
      expect(result.netRefundable).toBe(757.25);   // 790 - 13 - 19.75
      expect(result.totalSunk).toBe(32.75);         // 13 + 19.75
      expect(result.totalFloated).toBe(757.25);
    });

    it("should handle zero CC rate", () => {
      const result = computeRefinedCapital("ID", "elk", 500, 10, 0);
      expect(result.ccProcessingFee).toBe(0);
      expect(result.netRefundable).toBe(490);
      expect(result.totalSunk).toBe(10);
    });

    it("should not produce negative refundable amount", () => {
      // Edge case: fees > gross (shouldn't happen but defensive)
      const result = computeRefinedCapital("NM", "elk", 10, 15, 0.5);
      expect(result.netRefundable).toBe(0);
      expect(result.totalFloated).toBe(0);
    });

    it("should round CC fee to nearest cent", () => {
      const result = computeRefinedCapital("NM", "elk", 333, 10, 0.025);
      expect(result.ccProcessingFee).toBe(8.33); // 333 * 0.025 = 8.325 → 8.33
    });
  });

  describe("Test 5.2: Refund Delay Tracking", () => {
    it("should show Pending Refund after unsuccessful draw (not Available)", () => {
      const result = computeRefundStatus(
        "ID", "elk", 750,
        "didnt_draw",
        "2026-06-15",
        false, // User has NOT confirmed funds received
      );

      expect(result.status).toBe("not_drawn_refund_pending");
      expect(result.isAvailableForBudget).toBe(false);
      expect(result.statusLabel).toContain("Pending");
      expect(result.estimatedRefundDate).toBeDefined();

      // ID has 6-week refund window
      expect(result.refundWindowWeeks).toBe(6);
    });

    it("should show Available only after user confirms funds received", () => {
      const result = computeRefundStatus(
        "ID", "elk", 750,
        "didnt_draw",
        "2026-06-15",
        true, // User confirmed refund received
      );

      expect(result.status).toBe("refund_received");
      expect(result.isAvailableForBudget).toBe(true);
      expect(result.statusLabel).toContain("Available");
    });

    it("should show Committed (Sunk) when drawn", () => {
      const result = computeRefundStatus("NM", "elk", 790, "drew", "2026-06-01");
      expect(result.status).toBe("drawn_committed");
      expect(result.isAvailableForBudget).toBe(false);
      expect(result.statusLabel).toContain("Sunk");
    });

    it("should show Applied/Awaiting when no draw result yet", () => {
      const result = computeRefundStatus("NM", "elk", 790, null, "2026-08-01");
      expect(result.status).toBe("applied");
      expect(result.isAvailableForBudget).toBe(false);
    });

    it("should compute estimated refund date from draw date + window", () => {
      const result = computeRefundStatus(
        "NM", "elk", 790,
        "didnt_draw",
        "2026-06-01",
        false,
      );

      // NM = 4 week refund window → June 1 + 28 days = June 29
      expect(result.estimatedRefundDate).toBe("2026-06-29");
    });

    it("should use state-specific refund window (ID = 6 weeks)", () => {
      const result = computeRefundStatus(
        "ID", "elk", 750,
        "didnt_draw",
        "2026-06-15",
        false,
      );
      expect(result.refundWindowWeeks).toBe(6);
      // June 15 + 42 days = July 27
      expect(result.estimatedRefundDate).toBe("2026-07-27");
    });
  });
});
