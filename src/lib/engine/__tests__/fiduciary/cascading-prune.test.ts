/**
 * FIDUCIARY TEST 1: Cascading Prune Logic
 * (Hierarchical Asset Liquidation)
 *
 * Scenario: 5-state portfolio, $1,500/yr budget, slashed to $400/yr in Year 4.
 *
 * The engine MUST:
 *   - Drop lottery states (NM, ID) first because they hold zero equity
 *   - Preserve the state closest to burn with high sunk cost (WY with 4 pts)
 *   - Never arbitrarily drop high-equity preference states
 *
 * FAILURE STATE: System drops Wyoming (4 points, $260 sunk) while keeping
 *               a pure random draw in New Mexico.
 */

import { describe, it, expect } from "vitest";
import {
  cascadingPrune,
  type PortfolioAsset,
} from "@/lib/engine/portfolio-stress";

describe("Fiduciary Test 1: Cascading Prune Logic", () => {
  // Build a realistic 5-state portfolio at $1,500/yr
  const portfolio: PortfolioAsset[] = [
    {
      stateId: "WY",
      speciesId: "elk",
      currentPoints: 4,
      annualCost: 310,           // WY elk NR: ~$310/yr (license + app + point)
      sunkCost: 4 * 310,        // $1,240 invested
      drawType: "preference",
      estimatedDrawYear: 2028,   // Only 2 years out
      isCloseToBurn: true,       // Within 2 years of burn
    },
    {
      stateId: "CO",
      speciesId: "elk",
      currentPoints: 3,
      annualCost: 115,           // CO elk NR: ~$115/yr (license amortized + app)
      sunkCost: 3 * 115,        // $345 invested
      drawType: "preference",
      estimatedDrawYear: 2031,
      isCloseToBurn: false,
    },
    {
      stateId: "MT",
      speciesId: "elk",
      currentPoints: 2,
      annualCost: 250,           // MT: high combo license cost
      sunkCost: 2 * 250,        // $500 invested
      drawType: "preference",
      estimatedDrawYear: 2034,
      isCloseToBurn: false,
    },
    {
      stateId: "NM",
      speciesId: "elk",
      currentPoints: 0,          // Pure lottery — ZERO equity
      annualCost: 180,           // NM app fee + processing
      sunkCost: 0,               // Nothing to show for it
      drawType: "lottery",
      estimatedDrawYear: 2050,   // Unknown — pure luck
      isCloseToBurn: false,
    },
    {
      stateId: "ID",
      speciesId: "elk",
      currentPoints: 0,          // Pure lottery — ZERO equity
      annualCost: 200,           // ID app fee + tag fee (pre-pay)
      sunkCost: 0,               // Nothing to show for it
      drawType: "lottery",
      estimatedDrawYear: 2050,   // Unknown — pure luck
      isCloseToBurn: false,
    },
  ];

  const totalAnnualCost = portfolio.reduce((s, a) => s + a.annualCost, 0);

  it("should have a total annual cost exceeding the slashed budget", () => {
    expect(totalAnnualCost).toBeGreaterThan(400);
    expect(totalAnnualCost).toBe(1055); // Sanity check
  });

  describe("Budget slashed from $1,500 to $400", () => {
    const result = cascadingPrune(portfolio, 400);

    it("should NEVER prune Wyoming (close-to-burn, highest sunk cost)", () => {
      const wyKept = result.kept.find(
        (a) => a.stateId === "WY" && a.speciesId === "elk",
      );
      const wyPruned = result.pruned.find(
        (a) => a.stateId === "WY" && a.speciesId === "elk",
      );
      expect(wyKept).toBeDefined();
      expect(wyPruned).toBeUndefined();
    });

    it("should prune NM BEFORE WY (zero equity lottery vs 4-point preference)", () => {
      const nmPruned = result.pruned.find(
        (a) => a.stateId === "NM",
      );
      expect(nmPruned).toBeDefined();
    });

    it("should prune ID BEFORE WY (zero equity lottery)", () => {
      const idPruned = result.pruned.find(
        (a) => a.stateId === "ID",
      );
      expect(idPruned).toBeDefined();
    });

    it("should prune lottery states before any preference states", () => {
      const keptLottery = result.kept.filter((a) => a.drawType === "lottery");
      const prunedPreference = result.pruned.filter(
        (a) => a.drawType === "preference",
      );

      // If any preference state was pruned, ALL lottery states must also be pruned
      if (prunedPreference.length > 0) {
        const totalLottery = portfolio.filter(
          (a) => a.drawType === "lottery",
        ).length;
        const prunedLottery = result.pruned.filter(
          (a) => a.drawType === "lottery",
        ).length;
        expect(prunedLottery).toBe(totalLottery);
      }
    });

    it("should keep total kept-asset cost within the new budget", () => {
      const keptCost = result.kept.reduce((s, a) => s + a.annualCost, 0);
      expect(keptCost).toBeLessThanOrEqual(400);
    });

    it("should produce reasoning explaining each prune decision", () => {
      expect(result.reasoning.length).toBeGreaterThan(0);
      const wyProtected = result.reasoning.find((r) =>
        r.includes("WY") && r.includes("PROTECTED"),
      );
      expect(wyProtected).toBeDefined();
    });
  });

  describe("FAILURE STATE: System must not drop WY while keeping NM", () => {
    it("must never have WY pruned and NM kept simultaneously", () => {
      const result = cascadingPrune(portfolio, 400);
      const wyPruned = result.pruned.some((a) => a.stateId === "WY");
      const nmKept = result.kept.some((a) => a.stateId === "NM");
      // This is the exact failure state from the spec — it should NEVER happen
      expect(wyPruned && nmKept).toBe(false);
    });
  });
});
