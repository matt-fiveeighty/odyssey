/**
 * FIDUCIARY TEST 5: Fractional Averaging in Group Draws
 * (State-Specific Rounding Pedantry)
 *
 * Scenario: User A has 5 points, User B has 2 points.
 *   Party average = 3.5
 *
 *   - Colorado: FLOOR to 3 (Effective Points = 3)
 *   - Wyoming: EXACT decimal (Effective Points = 3.5)
 *
 * FAILURE STATE: computeMonteCarloOdds() treats a 3.5 in Colorado as 3.5,
 *               giving the user a falsely elevated probability band in the UI.
 */

import { describe, it, expect } from "vitest";
import {
  computeGroupDrawPoints,
  GROUP_DRAW_ROUNDING,
  type GroupDrawResult,
} from "@/lib/engine/portfolio-stress";

describe("Fiduciary Test 5: Fractional Averaging in Group Draws", () => {
  const partyPoints = [5, 2]; // User A: 5, User B: 2
  const rawAverage = 3.5;     // (5 + 2) / 2

  describe("Raw average calculation", () => {
    it("should compute arithmetic mean correctly", () => {
      const result = computeGroupDrawPoints("CO", "elk", partyPoints);
      expect(result.rawAverage).toBe(3.5);
    });

    it("should handle single-person 'party'", () => {
      const result = computeGroupDrawPoints("CO", "elk", [7]);
      expect(result.rawAverage).toBe(7);
      expect(result.effectivePoints).toBe(7); // Floor of 7 = 7
    });

    it("should handle empty party", () => {
      const result = computeGroupDrawPoints("CO", "elk", []);
      expect(result.rawAverage).toBe(0);
      expect(result.effectivePoints).toBe(0);
    });
  });

  describe("Colorado: FLOOR rounding (3.5 → 3)", () => {
    const result = computeGroupDrawPoints("CO", "elk", partyPoints);

    it("should use 'floor' rounding method for CO", () => {
      expect(result.roundingMethod).toBe("floor");
      expect(GROUP_DRAW_ROUNDING.CO).toBe("floor");
    });

    it("should produce effective points of 3 (NOT 3.5)", () => {
      expect(result.effectivePoints).toBe(3);
    });

    it("should calculate 0.5 point loss from rounding", () => {
      expect(result.pointLoss).toBe(0.5);
    });

    it("should generate a warning about rounding cost", () => {
      expect(result.warning).not.toBeNull();
      expect(result.warning).toContain("CO");
      expect(result.warning).toContain("floor");
    });
  });

  describe("Wyoming: EXACT decimal (3.5 → 3.5)", () => {
    const result = computeGroupDrawPoints("WY", "elk", partyPoints);

    it("should use 'exact' rounding method for WY", () => {
      expect(result.roundingMethod).toBe("exact");
      expect(GROUP_DRAW_ROUNDING.WY).toBe("exact");
    });

    it("should produce effective points of 3.5 (no rounding)", () => {
      expect(result.effectivePoints).toBe(3.5);
    });

    it("should have zero point loss", () => {
      expect(result.pointLoss).toBe(0);
    });

    it("should NOT generate a warning (no rounding cost)", () => {
      expect(result.warning).toBeNull();
    });
  });

  describe("FAILURE STATE: CO must NOT be treated as 3.5", () => {
    it("Colorado effective points must be strictly integer (floored)", () => {
      const coResult = computeGroupDrawPoints("CO", "elk", partyPoints);
      expect(Number.isInteger(coResult.effectivePoints)).toBe(true);
      expect(coResult.effectivePoints).toBe(3);
    });

    it("feeding CO effective points to odds must use 3, not 3.5", () => {
      const coResult = computeGroupDrawPoints("CO", "elk", partyPoints);
      const wyResult = computeGroupDrawPoints("WY", "elk", partyPoints);

      // The key fiduciary check: these MUST be different values
      expect(coResult.effectivePoints).not.toBe(wyResult.effectivePoints);
      expect(coResult.effectivePoints).toBeLessThan(wyResult.effectivePoints);
    });
  });

  describe("Additional state rounding rules", () => {
    it("Montana should floor (3.5 → 3)", () => {
      const result = computeGroupDrawPoints("MT", "elk", partyPoints);
      expect(result.effectivePoints).toBe(3);
      expect(result.roundingMethod).toBe("floor");
    });

    it("Nevada should use exact (3.5 → 3.5) before squaring", () => {
      const result = computeGroupDrawPoints("NV", "mule_deer", partyPoints);
      expect(result.effectivePoints).toBe(3.5);
      expect(result.roundingMethod).toBe("exact");
    });

    it("Arizona should floor (3.5 → 3)", () => {
      const result = computeGroupDrawPoints("AZ", "elk", partyPoints);
      expect(result.effectivePoints).toBe(3);
      expect(result.roundingMethod).toBe("floor");
    });

    it("Oregon should floor (3.5 → 3)", () => {
      const result = computeGroupDrawPoints("OR", "elk", partyPoints);
      expect(result.effectivePoints).toBe(3);
      expect(result.roundingMethod).toBe("floor");
    });
  });

  describe("Edge cases for group averaging", () => {
    it("exact integer average should not lose points in floor states", () => {
      // 4 + 4 = 8 / 2 = 4.0 → floor(4.0) = 4
      const result = computeGroupDrawPoints("CO", "elk", [4, 4]);
      expect(result.effectivePoints).toBe(4);
      expect(result.pointLoss).toBe(0);
      expect(result.warning).toBeNull();
    });

    it("large party with uneven points should floor correctly", () => {
      // 10 + 3 + 1 + 0 = 14 / 4 = 3.5 → floor = 3
      const result = computeGroupDrawPoints("CO", "elk", [10, 3, 1, 0]);
      expect(result.rawAverage).toBe(3.5);
      expect(result.effectivePoints).toBe(3);
    });

    it("party of 3 with weird average should floor in CO", () => {
      // 7 + 4 + 1 = 12 / 3 = 4.0 → floor = 4
      const result = computeGroupDrawPoints("CO", "elk", [7, 4, 1]);
      expect(result.rawAverage).toBeCloseTo(4.0);
      expect(result.effectivePoints).toBe(4);
    });

    it("party of 3 with non-integer average in CO", () => {
      // 6 + 4 + 1 = 11 / 3 = 3.666... → floor = 3
      const result = computeGroupDrawPoints("CO", "elk", [6, 4, 1]);
      expect(result.rawAverage).toBeCloseTo(3.667, 2);
      expect(result.effectivePoints).toBe(3);
    });
  });

  describe("GROUP_DRAW_ROUNDING constant integrity", () => {
    it("should have rounding rules for all 11 states", () => {
      const expectedStates = [
        "CO", "WY", "MT", "NV", "AZ", "OR", "UT", "ID", "NM", "KS",
      ];
      for (const st of expectedStates) {
        expect(GROUP_DRAW_ROUNDING[st]).toBeDefined();
      }
    });

    it("floor states should be: CO, MT, AZ, OR, UT, KS", () => {
      const floorStates = ["CO", "MT", "AZ", "OR", "UT", "KS"];
      for (const st of floorStates) {
        expect(GROUP_DRAW_ROUNDING[st]).toBe("floor");
      }
    });

    it("exact states should be: WY, NV, ID, NM", () => {
      const exactStates = ["WY", "NV", "ID", "NM"];
      for (const st of exactStates) {
        expect(GROUP_DRAW_ROUNDING[st]).toBe("exact");
      }
    });
  });
});
