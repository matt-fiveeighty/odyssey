/**
 * FIDUCIARY TEST 2: Intra-Year Liquidity Bottleneck
 * (The Cash Flow Trap)
 *
 * Scenario: User has $1,500 float limit.
 *   - Wyoming Elk: $700 upfront in January, refund late May
 *   - Idaho Elk: $850 upfront, deadline May 15th
 *
 * The engine MUST recognize that for a ~15-day window in May,
 * the user's capital requirement overlaps, requiring $1,550 in
 * liquid cash — exceeding their $1,500 limit.
 *
 * FAILURE STATE: System says "On Track" because $700 + $850 = $1,550
 *               is "close enough" but fails to flag the overlap window.
 */

import { describe, it, expect } from "vitest";
import {
  detectLiquidityBottleneck,
  type FloatEvent,
} from "@/lib/engine/portfolio-stress";

describe("Fiduciary Test 2: Intra-Year Liquidity Bottleneck", () => {
  const floatLimit = 1500;

  // Exact scenario: WY charges Jan, refunds late May.
  // ID charges May 15, refunds August.
  const events: FloatEvent[] = [
    {
      stateId: "WY",
      speciesId: "elk",
      amount: 700,
      floatStartDate: "2026-01-15",   // WY app deadline (pre-pay)
      floatEndDate: "2026-05-28",     // WY refund date (late May)
      isRefundable: true,
    },
    {
      stateId: "ID",
      speciesId: "elk",
      amount: 850,
      floatStartDate: "2026-05-15",   // ID app deadline
      floatEndDate: "2026-08-01",     // ID refund date
      isRefundable: true,
    },
  ];

  describe("May 15–28 overlap window detection", () => {
    const result = detectLiquidityBottleneck(events, floatLimit);

    it("should detect a peak float of $1,550 during the overlap window", () => {
      expect(result.peakAmount).toBe(1550);
    });

    it("should identify both WY and ID as overlapping events", () => {
      expect(result.overlappingEvents.length).toBe(2);
      const stateIds = result.overlappingEvents.map((e) => e.stateId);
      expect(stateIds).toContain("WY");
      expect(stateIds).toContain("ID");
    });

    it("should calculate a $50 deficit over the $1,500 limit", () => {
      expect(result.deficit).toBe(50);
    });

    it("should flag severity as warning or critical (NOT ok)", () => {
      expect(result.severity).not.toBe("ok");
    });

    it("should pinpoint the peak date within the May 15–28 window", () => {
      // Compare raw ISO strings to avoid timezone offset issues
      expect(result.peakDate).toMatch(/^2026-05/); // Must be May 2026
      expect(result.peakDate >= "2026-05-15").toBe(true);
      expect(result.peakDate <= "2026-05-28").toBe(true);
    });
  });

  describe("FAILURE STATE: System must NOT report 'ok' when overlap exists", () => {
    it("must detect the liquidity deficit, not just check annual totals", () => {
      const result = detectLiquidityBottleneck(events, floatLimit);
      // The sum $700 + $850 = $1,550. Even though individual amounts are
      // under $1,500, the SIMULTANEOUS float exceeds the limit.
      expect(result.severity).not.toBe("ok");
      expect(result.deficit).toBeGreaterThan(0);
    });
  });

  describe("Non-overlapping events should pass", () => {
    const nonOverlapping: FloatEvent[] = [
      {
        stateId: "WY",
        speciesId: "elk",
        amount: 700,
        floatStartDate: "2026-01-15",
        floatEndDate: "2026-04-01",     // Refunded BEFORE ID deadline
        isRefundable: true,
      },
      {
        stateId: "ID",
        speciesId: "elk",
        amount: 850,
        floatStartDate: "2026-05-15",
        floatEndDate: "2026-08-01",
        isRefundable: true,
      },
    ];

    it("should report 'ok' when events do not overlap", () => {
      const result = detectLiquidityBottleneck(nonOverlapping, floatLimit);
      expect(result.peakAmount).toBeLessThanOrEqual(floatLimit);
      expect(result.severity).toBe("ok");
    });
  });

  describe("Three-way overlap stress test", () => {
    const tripleOverlap: FloatEvent[] = [
      {
        stateId: "WY",
        speciesId: "elk",
        amount: 700,
        floatStartDate: "2026-01-15",
        floatEndDate: "2026-06-01",
        isRefundable: true,
      },
      {
        stateId: "ID",
        speciesId: "elk",
        amount: 850,
        floatStartDate: "2026-05-01",
        floatEndDate: "2026-08-01",
        isRefundable: true,
      },
      {
        stateId: "NM",
        speciesId: "elk",
        amount: 550,
        floatStartDate: "2026-03-20",
        floatEndDate: "2026-07-15",
        isRefundable: true,
      },
    ];

    it("should detect triple overlap with peak = $2,100", () => {
      const result = detectLiquidityBottleneck(tripleOverlap, floatLimit);
      // May 1 - June 1: all three overlap ($700 + $850 + $550 = $2,100)
      expect(result.peakAmount).toBe(2100);
      expect(result.overlappingEvents.length).toBe(3);
      expect(result.deficit).toBe(600);
      expect(result.severity).toBe("critical");
    });
  });
});
