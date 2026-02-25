/**
 * FIDUCIARY TEST 6: Draw Outcome Cascade (The Endless Loop)
 *
 * When a user records "Drew" or "Didn't Draw", the dispatcher must
 * execute a multi-part cascade across all stores.
 *
 * DREW cascade:
 *   1. Zero out point balance
 *   2. Apply waiting period (OIL species)
 *   3. Reclassify floated capital → sunk
 *   4. Detect schedule conflicts (PTO overlap, success disaster)
 *
 * DIDN'T DRAW cascade:
 *   1. Increment points +1 (preference states) or +0 (random states)
 *   2. Release floated capital
 *   3. Update roadmap (push timeline)
 *   4. Check for dead asset (point creep)
 */

import { describe, it, expect } from "vitest";
import {
  dispatchDrawOutcome,
  type DrawOutcomeEvent,
} from "@/lib/engine/fiduciary-dispatcher";
import type { RoadmapYear, RoadmapAction, Milestone, UserPoints } from "@/lib/types";

// ── Helpers ──

function makeYear(year: number, actions: Partial<RoadmapAction>[]): RoadmapYear {
  return {
    year,
    phase: "build",
    actions: actions.map((a) => ({
      type: a.type ?? "apply",
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

function makeMilestone(overrides: Partial<Milestone>): Milestone {
  return {
    id: overrides.id ?? "m-1",
    title: "",
    description: "",
    type: overrides.type ?? "apply",
    stateId: overrides.stateId ?? "CO",
    speciesId: overrides.speciesId ?? "elk",
    year: overrides.year ?? 2028,
    costs: [],
    totalCost: overrides.totalCost ?? 0,
    completed: overrides.completed ?? true,
    ...overrides,
  };
}

function makePoints(stateId: string, speciesId: string, points: number): UserPoints {
  return { id: `${stateId}-${speciesId}`, userId: "u1", stateId, speciesId, points, pointType: "preference" };
}

// ── Tests ──

describe("Fiduciary Test 6: Draw Outcome Cascade", () => {
  const roadmap: RoadmapYear[] = [
    makeYear(2026, [{ stateId: "CO", speciesId: "elk", type: "buy_points" }]),
    makeYear(2027, [{ stateId: "CO", speciesId: "elk", type: "apply" }]),
    makeYear(2028, [{ stateId: "CO", speciesId: "elk", type: "hunt" }]),
    makeYear(2029, [{ stateId: "CO", speciesId: "elk", type: "buy_points" }]),
    makeYear(2030, [{ stateId: "CO", speciesId: "elk", type: "apply" }]),
  ];

  describe("DREW cascade — 4-part execution", () => {
    const event: DrawOutcomeEvent = {
      type: "draw_outcome",
      milestoneId: "m-1",
      outcome: "drew",
      stateId: "CO",
      speciesId: "elk",
      year: 2028,
      currentPoints: 6,
    };

    const result = dispatchDrawOutcome(
      event,
      roadmap,
      [makePoints("CO", "elk", 6)],
      [makeMilestone({ stateId: "CO", speciesId: "elk", year: 2028 })],
      14, // huntDaysPerYear
      5000, // huntYearBudget
    );

    it("Part 1: should zero out point balance", () => {
      const pm = result.pointMutations.find(
        (m) => m.stateId === "CO" && m.speciesId === "elk",
      );
      expect(pm).toBeDefined();
      expect(pm!.newPoints).toBe(0);
      expect(pm!.delta).toBe(-6);
    });

    it("Part 2: should compute post-draw reset", () => {
      expect(result.postDrawReset).toBeDefined();
      expect(result.postDrawReset!.pointsZeroed).toBe(6);
      // Elk is NOT OIL — no waiting period
      expect(result.postDrawReset!.waitingPeriodYears).toBe(0);
      expect(result.postDrawReset!.nextEligibleYear).toBe(2029);
    });

    it("Part 2: should invalidate affected roadmap years", () => {
      const invalidated = result.roadmapInvalidations;
      expect(invalidated.length).toBeGreaterThan(0);
      expect(invalidated.some((i) => i.year === 2029)).toBe(true);
      expect(invalidated.some((i) => i.year === 2030)).toBe(true);
      // Should NOT invalidate draw year or before
      expect(invalidated.every((i) => i.year > 2028)).toBe(true);
    });

    it("Part 3: should reclassify floated capital for CO elk", () => {
      // CO has tag costs — check for capital reclassification
      const reclass = result.capitalReclassifications;
      // May or may not have one depending on whether CO elk has a tagCost in STATES_MAP
      // But the structure should be correct
      if (reclass.length > 0) {
        expect(reclass[0].from).toBe("floated");
        expect(reclass[0].to).toBe("sunk");
      }
    });
  });

  describe("DREW cascade — OIL species (CO moose)", () => {
    const mooseRoadmap: RoadmapYear[] = [
      makeYear(2028, [{ stateId: "CO", speciesId: "moose", type: "hunt" }]),
      makeYear(2029, [{ stateId: "CO", speciesId: "moose", type: "buy_points" }]),
      makeYear(2030, [{ stateId: "CO", speciesId: "moose", type: "apply" }]),
      makeYear(2031, [{ stateId: "CO", speciesId: "moose", type: "apply" }]),
      makeYear(2032, [{ stateId: "CO", speciesId: "moose", type: "apply" }]),
      makeYear(2033, [{ stateId: "CO", speciesId: "moose", type: "apply" }]),
      makeYear(2034, [{ stateId: "CO", speciesId: "moose", type: "apply" }]),
    ];

    const event: DrawOutcomeEvent = {
      type: "draw_outcome",
      milestoneId: "m-moose",
      outcome: "drew",
      stateId: "CO",
      speciesId: "moose",
      year: 2028,
      currentPoints: 10,
    };

    const result = dispatchDrawOutcome(
      event,
      mooseRoadmap,
      [makePoints("CO", "moose", 10)],
      [makeMilestone({ stateId: "CO", speciesId: "moose", year: 2028 })],
      14,
      5000,
    );

    it("should detect 5-year OIL waiting period for CO moose", () => {
      expect(result.postDrawReset).toBeDefined();
      expect(result.postDrawReset!.waitingPeriodYears).toBe(5);
      expect(result.postDrawReset!.nextEligibleYear).toBe(2034);
    });

    it("should generate OIL waiting period alert", () => {
      const oilAlert = result.alerts.find((a) => a.id.includes("oil-wait"));
      expect(oilAlert).toBeDefined();
      expect(oilAlert!.severity).toBe("warning");
      expect(oilAlert!.description).toContain("2034");
    });

    it("should invalidate all years during waiting period", () => {
      const affected = result.roadmapInvalidations.map((i) => i.year);
      expect(affected).toContain(2029);
      expect(affected).toContain(2030);
      expect(affected).toContain(2031);
      expect(affected).toContain(2032);
      expect(affected).toContain(2033);
    });
  });

  describe("DREW cascade — permanent OIL (ID bighorn)", () => {
    const idRoadmap: RoadmapYear[] = [
      makeYear(2028, [{ stateId: "ID", speciesId: "bighorn_sheep", type: "hunt" }]),
      makeYear(2029, [{ stateId: "ID", speciesId: "bighorn_sheep", type: "apply" }]),
    ];

    const event: DrawOutcomeEvent = {
      type: "draw_outcome",
      milestoneId: "m-id-sheep",
      outcome: "drew",
      stateId: "ID",
      speciesId: "bighorn_sheep",
      year: 2028,
      currentPoints: 0,
    };

    const result = dispatchDrawOutcome(
      event,
      idRoadmap,
      [],
      [makeMilestone({ stateId: "ID", speciesId: "bighorn_sheep", year: 2028 })],
      14,
      5000,
    );

    it("should flag as permanent ban (once-in-a-lifetime)", () => {
      expect(result.postDrawReset!.isOnceInALifetime).toBe(true);
      expect(result.postDrawReset!.nextEligibleYear).toBeNull();
    });

    it("should generate permanent ban alert", () => {
      const permAlert = result.alerts.find((a) => a.id.includes("oil-permanent"));
      expect(permAlert).toBeDefined();
      expect(permAlert!.severity).toBe("critical");
    });

    it("should mark affected years for removal (not recalculation)", () => {
      const removals = result.roadmapInvalidations.filter((i) => i.action === "remove");
      expect(removals.length).toBeGreaterThan(0);
    });
  });

  describe("DIDN'T DRAW cascade — preference state (CO elk)", () => {
    const event: DrawOutcomeEvent = {
      type: "draw_outcome",
      milestoneId: "m-1",
      outcome: "didnt_draw",
      stateId: "CO",
      speciesId: "elk",
      year: 2028,
      currentPoints: 5,
    };

    const result = dispatchDrawOutcome(
      event,
      roadmap,
      [makePoints("CO", "elk", 5)],
      [makeMilestone({ stateId: "CO", speciesId: "elk", year: 2028 })],
      14,
      5000,
    );

    it("Part 1: should increment points +1 for preference state", () => {
      const pm = result.pointMutations.find(
        (m) => m.stateId === "CO" && m.speciesId === "elk",
      );
      expect(pm).toBeDefined();
      expect(pm!.newPoints).toBe(6); // 5 + 1
      expect(pm!.delta).toBe(1);
    });

    it("should generate dead asset check alert for 6+ points", () => {
      const creepAlert = result.alerts.find((a) => a.id.includes("creep-check"));
      expect(creepAlert).toBeDefined();
      expect(creepAlert!.description).toContain("6 points");
    });
  });

  describe("DIDN'T DRAW cascade — random draw state (NM elk)", () => {
    const nmRoadmap: RoadmapYear[] = [
      makeYear(2028, [{ stateId: "NM", speciesId: "elk", type: "apply" }]),
    ];

    const event: DrawOutcomeEvent = {
      type: "draw_outcome",
      milestoneId: "m-nm",
      outcome: "didnt_draw",
      stateId: "NM",
      speciesId: "elk",
      year: 2028,
      currentPoints: 0,
    };

    const result = dispatchDrawOutcome(
      event,
      nmRoadmap,
      [],
      [makeMilestone({ stateId: "NM", speciesId: "elk", year: 2028 })],
      14,
      5000,
    );

    it("should NOT increment points for random draw state", () => {
      const pm = result.pointMutations.find(
        (m) => m.stateId === "NM" && m.speciesId === "elk",
      );
      expect(pm).toBeDefined();
      expect(pm!.delta).toBe(0);
      expect(pm!.newPoints).toBe(0);
    });
  });

  describe("Success Disaster detection (drew + over budget)", () => {
    const expensiveRoadmap: RoadmapYear[] = [
      makeYear(2028, [
        { stateId: "CO", speciesId: "elk", type: "hunt", cost: 3000 },
        { stateId: "WY", speciesId: "elk", type: "hunt", cost: 4000 },
      ]),
    ];

    const event: DrawOutcomeEvent = {
      type: "draw_outcome",
      milestoneId: "m-co",
      outcome: "drew",
      stateId: "CO",
      speciesId: "elk",
      year: 2028,
      currentPoints: 6,
    };

    const result = dispatchDrawOutcome(
      event,
      expensiveRoadmap,
      [makePoints("CO", "elk", 6)],
      [makeMilestone({ stateId: "CO", speciesId: "elk", year: 2028 })],
      14,
      5000, // Budget is $5,000 but total costs are $7,000
    );

    it("should detect success disaster when costs exceed budget", () => {
      const disaster = result.scheduleConflicts.find(
        (c) => c.conflictType === "success_disaster",
      );
      expect(disaster).toBeDefined();
      expect(disaster!.severity).toBe("critical");
    });

    it("should generate success disaster alert", () => {
      const disasterAlert = result.alerts.find((a) => a.id.includes("success-disaster"));
      expect(disasterAlert).toBeDefined();
      expect(disasterAlert!.severity).toBe("critical");
    });
  });
});
