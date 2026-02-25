/**
 * FIDUCIARY TEST 3: F&G Inactivity Purge
 * ("Use It or Lose It" Point Deletion)
 *
 * Scenario: User builds 5 WY Elk points. In Year 6 and Year 7,
 *           they skip Wyoming to save money.
 *
 * The engine MUST:
 *   - Reset Wyoming points to zero when 2 consecutive years are skipped
 *   - Throw a CRITICAL alert in Year 6 (first skip year):
 *     "Point Abandonment Risk: Skipping Wyoming this year will result in
 *      the permanent deletion of 5 preference points (Sunk Value: $260)."
 *   - computeTTD() must reflect the zeroed-out state in Year 8
 *
 * FAILURE STATE: Engine silently allows the skip without warning,
 *               or continues projecting 5 points in subsequent years.
 */

import { describe, it, expect } from "vitest";
import {
  detectInactivityPurges,
  POINT_PURGE_RULES,
  type InactivityPurgeAlert,
} from "@/lib/engine/portfolio-stress";
import type { RoadmapYear, RoadmapAction } from "@/lib/types";

// Helper: build a minimal RoadmapYear
function makeYear(
  year: number,
  actions: Partial<RoadmapAction>[],
): RoadmapYear {
  return {
    year,
    phase: "build",
    actions: actions.map((a) => ({
      type: a.type ?? "buy_points",
      stateId: a.stateId ?? "WY",
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

describe("Fiduciary Test 3: F&G Inactivity Purge", () => {
  describe("Wyoming 2-year purge rule", () => {
    it("should have WY in POINT_PURGE_RULES with maxInactiveYears = 2", () => {
      const rule = POINT_PURGE_RULES.WY;
      expect(rule).not.toBeNull();
      expect(rule!.maxInactiveYears).toBe(2);
    });
  });

  describe("5 WY Elk points, skip Year 6 and Year 7", () => {
    // Years 1-5: actively building WY points
    // Years 6-7: SKIP Wyoming entirely
    // Year 8+: still skipping
    const roadmap: RoadmapYear[] = [
      makeYear(2026, [{ stateId: "WY", speciesId: "elk", type: "buy_points" }]),
      makeYear(2027, [{ stateId: "WY", speciesId: "elk", type: "buy_points" }]),
      makeYear(2028, [{ stateId: "WY", speciesId: "elk", type: "buy_points" }]),
      makeYear(2029, [{ stateId: "WY", speciesId: "elk", type: "buy_points" }]),
      makeYear(2030, [{ stateId: "WY", speciesId: "elk", type: "buy_points" }]),
      // Years 6-7: NO Wyoming actions
      makeYear(2031, [{ stateId: "CO", speciesId: "elk", type: "buy_points" }]),
      makeYear(2032, [{ stateId: "CO", speciesId: "elk", type: "buy_points" }]),
      makeYear(2033, [{ stateId: "CO", speciesId: "elk", type: "buy_points" }]),
    ];

    const existingPoints = { WY: { elk: 5 } };
    const annualCosts = { WY: { elk: 52 } }; // ~$52/yr for WY point purchase

    const alerts = detectInactivityPurges(roadmap, existingPoints, annualCosts);

    it("should detect a critical purge alert for WY elk", () => {
      expect(alerts.length).toBeGreaterThan(0);
      const wyAlert = alerts.find(
        (a) => a.stateId === "WY" && a.speciesId === "elk",
      );
      expect(wyAlert).toBeDefined();
      expect(wyAlert!.severity).toBe("critical");
    });

    it("should identify the purge year as 2032 (after 2 consecutive skips in 2031-2032)", () => {
      const wyAlert = alerts.find(
        (a) => a.stateId === "WY" && a.speciesId === "elk",
      );
      expect(wyAlert!.yearOfPurge).toBe(2032);
    });

    it("should report 5 points at risk with sunk value of $260", () => {
      const wyAlert = alerts.find(
        (a) => a.stateId === "WY" && a.speciesId === "elk",
      );
      expect(wyAlert!.currentPoints).toBe(5);
      expect(wyAlert!.sunkValue).toBe(260); // 5 × $52
    });

    it("should include 'permanent deletion' or 'purge' in the message", () => {
      const wyAlert = alerts.find(
        (a) => a.stateId === "WY" && a.speciesId === "elk",
      );
      const msg = wyAlert!.message.toLowerCase();
      expect(msg).toMatch(/delet|purg/);
    });
  });

  describe("No purge when activity is maintained", () => {
    const activeRoadmap: RoadmapYear[] = [
      makeYear(2026, [{ stateId: "WY", speciesId: "elk", type: "buy_points" }]),
      makeYear(2027, [{ stateId: "WY", speciesId: "elk", type: "buy_points" }]),
      makeYear(2028, [{ stateId: "WY", speciesId: "elk", type: "apply" }]),
      makeYear(2029, [{ stateId: "WY", speciesId: "elk", type: "buy_points" }]),
      makeYear(2030, [{ stateId: "WY", speciesId: "elk", type: "hunt" }]),
    ];

    it("should return no critical alerts when user applies every year", () => {
      const alerts = detectInactivityPurges(
        activeRoadmap,
        { WY: { elk: 5 } },
        { WY: { elk: 52 } },
      );
      const critical = alerts.filter(
        (a) => a.stateId === "WY" && a.severity === "critical",
      );
      expect(critical.length).toBe(0);
    });
  });

  describe("Nevada single-year purge rule", () => {
    // NV purges after just 1 year of inactivity
    const roadmap: RoadmapYear[] = [
      makeYear(2026, [{ stateId: "NV", speciesId: "mule_deer", type: "buy_points" }]),
      // 2027: skip NV
      makeYear(2027, [{ stateId: "CO", speciesId: "elk", type: "buy_points" }]),
      makeYear(2028, [{ stateId: "CO", speciesId: "elk", type: "buy_points" }]),
    ];

    it("should detect purge in 2027 for NV with 1-year inactivity rule", () => {
      const alerts = detectInactivityPurges(
        roadmap,
        { NV: { mule_deer: 8 } },
        { NV: { mule_deer: 166 } },
      );
      const nvAlert = alerts.find((a) => a.stateId === "NV");
      expect(nvAlert).toBeDefined();
      expect(nvAlert!.severity).toBe("critical");
      expect(nvAlert!.yearOfPurge).toBe(2027);
    });
  });

  describe("State with no purge rule should not alert", () => {
    const roadmap: RoadmapYear[] = [
      makeYear(2026, [{ stateId: "AZ", speciesId: "elk", type: "buy_points" }]),
      makeYear(2027, [{ stateId: "CO", speciesId: "elk", type: "buy_points" }]),
      makeYear(2028, [{ stateId: "CO", speciesId: "elk", type: "buy_points" }]),
    ];

    it("should return no alerts for AZ (no purge rule)", () => {
      const alerts = detectInactivityPurges(
        roadmap,
        { AZ: { elk: 10 } },
        { AZ: { elk: 200 } },
      );
      const azAlerts = alerts.filter((a) => a.stateId === "AZ");
      expect(azAlerts.length).toBe(0);
    });
  });
});
