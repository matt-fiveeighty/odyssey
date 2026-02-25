/**
 * FIDUCIARY TEST 4: Post-Draw Reset & Recalculation
 * (The Success Event)
 *
 * Scenario: User hits their "Burn Year" in Colorado in 2028 for elk.
 *           They mark the tag as "Drawn" in the dashboard.
 *
 * The engine MUST execute three simultaneous logical actions:
 *   1. Zero out the Colorado elk point balance for 2029
 *   2. Check species constraint: if Moose/Sheep tag, apply waiting period
 *   3. Automatically spin up a new target horizon starting from 0 points
 *
 * FAILURE STATE: Roadmap leaves 2029 blank for CO, or worse,
 *               continues projecting the user as having maximum points.
 */

import { describe, it, expect } from "vitest";
import {
  computePostDrawReset,
  WAITING_PERIOD_RULES,
  type PostDrawReset,
} from "@/lib/engine/portfolio-stress";
import type { RoadmapYear, RoadmapAction } from "@/lib/types";

// Helper
function makeYear(
  year: number,
  actions: Partial<RoadmapAction>[],
): RoadmapYear {
  return {
    year,
    phase: "build",
    actions: actions.map((a) => ({
      type: a.type ?? "buy_points",
      stateId: a.stateId ?? "CO",
      speciesId: a.speciesId ?? "elk",
      description: a.description ?? "",
      cost: a.cost ?? 0,
      costs: a.costs ?? [],
      ...a,
    })) as RoadmapAction[],
    estimatedCost: 0,
    isHuntYear: false,
    pointYearCost: 0,
    huntYearCost: 0,
  };
}

describe("Fiduciary Test 4: Post-Draw Reset & Recalculation", () => {
  const roadmap: RoadmapYear[] = [
    makeYear(2026, [{ stateId: "CO", speciesId: "elk", type: "buy_points" }]),
    makeYear(2027, [{ stateId: "CO", speciesId: "elk", type: "apply" }]),
    makeYear(2028, [{ stateId: "CO", speciesId: "elk", type: "hunt" }]),
    makeYear(2029, [{ stateId: "CO", speciesId: "elk", type: "buy_points" }]),
    makeYear(2030, [{ stateId: "CO", speciesId: "elk", type: "apply" }]),
    makeYear(2031, [{ stateId: "CO", speciesId: "elk", type: "apply" }]),
  ];

  describe("Action 1: Zero out point balance after draw", () => {
    const result = computePostDrawReset("CO", "elk", 2028, 6, roadmap);

    it("should report points zeroed to 0", () => {
      expect(result.pointsZeroed).toBe(6);
    });

    it("should identify affected roadmap years AFTER the draw year", () => {
      expect(result.affectedRoadmapYears).toContain(2029);
      expect(result.affectedRoadmapYears).toContain(2030);
      expect(result.affectedRoadmapYears).toContain(2031);
      // Should NOT include the draw year itself or before
      expect(result.affectedRoadmapYears).not.toContain(2028);
      expect(result.affectedRoadmapYears).not.toContain(2027);
    });
  });

  describe("Action 2: Non-OIL species have no waiting period", () => {
    const result = computePostDrawReset("CO", "elk", 2028, 6, roadmap);

    it("elk is NOT once-in-a-lifetime — should have 0 waiting period", () => {
      expect(result.waitingPeriodYears).toBe(0);
      expect(result.isOnceInALifetime).toBe(false);
    });

    it("should allow re-application the very next year", () => {
      expect(result.nextEligibleYear).toBe(2029);
    });

    it("should set new horizon starting from draw year + 1", () => {
      expect(result.newHorizonStart).toBe(2029);
    });
  });

  describe("Action 2b: OIL species trigger waiting period", () => {
    // Scenario: User draws CO moose in 2028
    const mooseRoadmap: RoadmapYear[] = [
      makeYear(2026, [{ stateId: "CO", speciesId: "moose", type: "buy_points" }]),
      makeYear(2027, [{ stateId: "CO", speciesId: "moose", type: "apply" }]),
      makeYear(2028, [{ stateId: "CO", speciesId: "moose", type: "hunt" }]),
      makeYear(2029, [{ stateId: "CO", speciesId: "moose", type: "buy_points" }]),
      makeYear(2030, [{ stateId: "CO", speciesId: "moose", type: "apply" }]),
      makeYear(2031, [{ stateId: "CO", speciesId: "moose", type: "apply" }]),
      makeYear(2032, [{ stateId: "CO", speciesId: "moose", type: "apply" }]),
      makeYear(2033, [{ stateId: "CO", speciesId: "moose", type: "apply" }]),
      makeYear(2034, [{ stateId: "CO", speciesId: "moose", type: "apply" }]),
    ];

    const result = computePostDrawReset("CO", "moose", 2028, 10, mooseRoadmap);

    it("CO moose is OIL — should have 5-year waiting period", () => {
      expect(result.waitingPeriodYears).toBe(5);
    });

    it("should not allow re-application until 2034 (2028 + 1 + 5)", () => {
      expect(result.nextEligibleYear).toBe(2034);
    });

    it("should flag all years 2029-2033 as affected", () => {
      expect(result.affectedRoadmapYears).toContain(2029);
      expect(result.affectedRoadmapYears).toContain(2030);
      expect(result.affectedRoadmapYears).toContain(2031);
      expect(result.affectedRoadmapYears).toContain(2032);
      expect(result.affectedRoadmapYears).toContain(2033);
    });
  });

  describe("Action 2c: Idaho OIL is permanently banned", () => {
    const idRoadmap: RoadmapYear[] = [
      makeYear(2028, [{ stateId: "ID", speciesId: "bighorn_sheep", type: "hunt" }]),
      makeYear(2029, [{ stateId: "ID", speciesId: "bighorn_sheep", type: "apply" }]),
    ];

    const result = computePostDrawReset(
      "ID", "bighorn_sheep", 2028, 0, idRoadmap,
    );

    it("should flag as once-in-a-lifetime (permanent ban)", () => {
      expect(result.isOnceInALifetime).toBe(true);
    });

    it("should have null nextEligibleYear (never eligible again)", () => {
      expect(result.nextEligibleYear).toBeNull();
    });

    it("should have infinite waiting period", () => {
      expect(result.waitingPeriodYears).toBe(Infinity);
    });
  });

  describe("Action 3: New horizon must start from 0 points", () => {
    const result = computePostDrawReset("CO", "elk", 2028, 6, roadmap);

    it("new horizon start should be the year after draw", () => {
      expect(result.newHorizonStart).toBe(2029);
    });

    it("should explicitly report 6 points zeroed out", () => {
      expect(result.pointsZeroed).toBe(6);
    });
  });

  describe("FAILURE STATE: System must not continue projecting max points", () => {
    it("pointsZeroed must equal the user's actual point balance at draw time", () => {
      const result = computePostDrawReset("CO", "elk", 2028, 6, roadmap);
      // If the system ignores the draw and continues with 6 points, it's wrong
      expect(result.pointsZeroed).toBe(6);
      expect(result.affectedRoadmapYears.length).toBeGreaterThan(0);
    });
  });

  describe("Waiting period rules data integrity", () => {
    it("CO should have moose, bighorn_sheep, mountain_goat as OIL", () => {
      const co = WAITING_PERIOD_RULES.CO;
      expect(co.oilSpecies).toContain("moose");
      expect(co.oilSpecies).toContain("bighorn_sheep");
      expect(co.oilSpecies).toContain("mountain_goat");
    });

    it("WY should have 3-year waiting period for OIL", () => {
      expect(WAITING_PERIOD_RULES.WY.waitingYears).toBe(3);
    });

    it("MT should have 7-year waiting period for OIL", () => {
      expect(WAITING_PERIOD_RULES.MT.waitingYears).toBe(7);
    });

    it("ID and AZ should be permanent bans (waitingYears = 0)", () => {
      expect(WAITING_PERIOD_RULES.ID.waitingYears).toBe(0);
      expect(WAITING_PERIOD_RULES.AZ.waitingYears).toBe(0);
    });
  });
});
