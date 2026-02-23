import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateMonthlySavingsTarget,
  calculateFundedDate,
  calculateSavingsStatus,
  calculateCatchUpDelta,
  deriveTargetCost,
  calculateAnnualSpendForecast,
  type AnnualSpendForecast,
} from "../savings-calculator";
import type { Milestone, UserGoal } from "@/lib/types";

// Pin "now" for deterministic date math
const NOW = new Date("2026-03-01T00:00:00Z");

describe("savings-calculator", () => {
  // ==========================================================================
  // calculateMonthlySavingsTarget
  // ==========================================================================
  describe("calculateMonthlySavingsTarget", () => {
    it("divides remaining cost by months remaining", () => {
      // $5000 target, $1000 saved, 18 months away => $4000 / 18 = ~222.22
      const target = new Date("2027-09-01T00:00:00Z");
      const result = calculateMonthlySavingsTarget(5000, target, 1000, NOW);
      expect(result).toBeCloseTo(4000 / 18, 0);
    });

    it("returns 0 when already fully funded", () => {
      const target = new Date("2026-03-15T00:00:00Z");
      const result = calculateMonthlySavingsTarget(5000, target, 5000, NOW);
      expect(result).toBe(0);
    });

    it("returns 0 when overfunded", () => {
      const target = new Date("2027-01-01T00:00:00Z");
      const result = calculateMonthlySavingsTarget(5000, target, 6000, NOW);
      expect(result).toBe(0);
    });

    it("uses Math.max(1, months) when target date is now", () => {
      // Target date is NOW: months remaining -> Math.max(1, ~0) = 1
      const result = calculateMonthlySavingsTarget(5000, NOW, 0, NOW);
      expect(result).toBe(5000);
    });

    it("uses Math.max(1, months) when target date is in the past", () => {
      const pastDate = new Date("2025-01-01T00:00:00Z");
      const result = calculateMonthlySavingsTarget(3000, pastDate, 0, NOW);
      // Past date -> negative ms -> Math.max(1,...) = 1 -> 3000 / 1 = 3000
      expect(result).toBe(3000);
    });

    it("handles targetCost of 0", () => {
      const target = new Date("2027-01-01T00:00:00Z");
      const result = calculateMonthlySavingsTarget(0, target, 0, NOW);
      expect(result).toBe(0);
    });

    it("never returns NaN or Infinity", () => {
      const cases = [
        { targetCost: 0, targetDate: NOW, currentSaved: 0 },
        { targetCost: 100, targetDate: NOW, currentSaved: 0 },
        { targetCost: 100, targetDate: new Date("2020-01-01"), currentSaved: 0 },
        { targetCost: 5000, targetDate: NOW, currentSaved: 5000 },
      ];
      for (const c of cases) {
        const result = calculateMonthlySavingsTarget(
          c.targetCost,
          c.targetDate,
          c.currentSaved,
          NOW,
        );
        expect(Number.isFinite(result)).toBe(true);
        expect(Number.isNaN(result)).toBe(false);
      }
    });

    it("defaults now to current time when not provided", () => {
      const target = new Date("2030-01-01T00:00:00Z");
      const result = calculateMonthlySavingsTarget(1000, target, 0);
      expect(result).toBeGreaterThan(0);
      expect(Number.isFinite(result)).toBe(true);
    });
  });

  // ==========================================================================
  // calculateFundedDate
  // ==========================================================================
  describe("calculateFundedDate", () => {
    it("projects funded date based on monthly savings", () => {
      // $5000 target, $1000 saved, $200/mo -> ceil(4000/200) = 20 months from now
      const result = calculateFundedDate(5000, 1000, 200, NOW);
      expect(result).not.toBeNull();
      // Verify the funded date is approximately 20 months from NOW
      const monthsDiff =
        (result!.getFullYear() - NOW.getFullYear()) * 12 +
        (result!.getMonth() - NOW.getMonth());
      expect(monthsDiff).toBe(20);
    });

    it("returns now when already funded", () => {
      const result = calculateFundedDate(5000, 5000, 200, NOW);
      expect(result).not.toBeNull();
      expect(result!.getTime()).toBe(NOW.getTime());
    });

    it("returns now when overfunded", () => {
      const result = calculateFundedDate(5000, 7000, 200, NOW);
      expect(result).not.toBeNull();
      expect(result!.getTime()).toBe(NOW.getTime());
    });

    it("returns null when monthlySavings is 0", () => {
      const result = calculateFundedDate(5000, 0, 0, NOW);
      expect(result).toBeNull();
    });

    it("returns null when monthlySavings is negative", () => {
      const result = calculateFundedDate(5000, 0, -10, NOW);
      expect(result).toBeNull();
    });

    it("handles targetCost of 0", () => {
      const result = calculateFundedDate(0, 0, 200, NOW);
      expect(result).not.toBeNull();
      expect(result!.getTime()).toBe(NOW.getTime());
    });

    it("uses Math.ceil for months needed (rounds up)", () => {
      // $5000 target, $0 saved, $3000/mo -> ceil(5000/3000) = ceil(1.67) = 2 months
      const result = calculateFundedDate(5000, 0, 3000, NOW);
      expect(result).not.toBeNull();
      // Verify 2 months ahead of NOW
      const monthsDiff =
        (result!.getFullYear() - NOW.getFullYear()) * 12 +
        (result!.getMonth() - NOW.getMonth());
      expect(monthsDiff).toBe(2);
    });

    it("defaults now to current time when not provided", () => {
      const result = calculateFundedDate(1000, 0, 100);
      expect(result).not.toBeNull();
      expect(result!.getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  // ==========================================================================
  // calculateSavingsStatus
  // ==========================================================================
  describe("calculateSavingsStatus", () => {
    const targetDate = new Date("2027-09-01T00:00:00Z");

    it("returns green when funded date is before target date", () => {
      // $5000 target, $1000 saved, $500/mo -> funded in 8 months (2026-11)
      // Target is 2027-09 -> well before -> green
      const result = calculateSavingsStatus(5000, 1000, 500, targetDate, NOW);
      expect(result).toBe("green");
    });

    it("returns green when already fully funded", () => {
      const result = calculateSavingsStatus(5000, 5000, 0, targetDate, NOW);
      expect(result).toBe("green");
    });

    it("returns green when overfunded", () => {
      const result = calculateSavingsStatus(5000, 7000, 0, targetDate, NOW);
      expect(result).toBe("green");
    });

    it("returns amber when funded date is 1-3 months after target", () => {
      // Need to find monthlySavings that puts funded date 1-3 months after target
      // Target = 2027-09-01, NOW = 2026-03-01 -> 18 months remaining
      // Need $4000 remaining. If $200/mo -> 20 months -> funded 2027-11 -> ~2 months late -> amber
      const result = calculateSavingsStatus(5000, 1000, 200, targetDate, NOW);
      expect(result).toBe("amber");
    });

    it("returns red when funded date is >3 months after target", () => {
      // $5000 target, $0 saved, $50/mo -> 100 months -> funded ~2034 -> way after target -> red
      const result = calculateSavingsStatus(5000, 0, 50, targetDate, NOW);
      expect(result).toBe("red");
    });

    it("returns red when monthlySavings is 0 and not yet funded", () => {
      const result = calculateSavingsStatus(5000, 1000, 0, targetDate, NOW);
      expect(result).toBe("red");
    });

    it("returns green when currentSaved >= targetCost regardless of other params", () => {
      // Even with $0/mo savings and past target date
      const pastDate = new Date("2020-01-01T00:00:00Z");
      const result = calculateSavingsStatus(5000, 5000, 0, pastDate, NOW);
      expect(result).toBe("green");
    });

    it("returns green for targetCost of 0", () => {
      const result = calculateSavingsStatus(0, 0, 0, targetDate, NOW);
      expect(result).toBe("green");
    });

    it("defaults now to current time when not provided", () => {
      const farFuture = new Date("2040-01-01T00:00:00Z");
      const result = calculateSavingsStatus(1000, 0, 100, farFuture);
      expect(["green", "amber", "red"]).toContain(result);
    });
  });

  // ==========================================================================
  // calculateCatchUpDelta
  // ==========================================================================
  describe("calculateCatchUpDelta", () => {
    const targetDate = new Date("2027-09-01T00:00:00Z");

    it("returns 0 when already on track", () => {
      // $5000 target, $1000 saved, 18 months -> need ~$222/mo
      // If saving $300/mo -> already ahead -> delta = 0
      const result = calculateCatchUpDelta(5000, 1000, 300, targetDate, NOW);
      expect(result).toBe(0);
    });

    it("returns extra amount needed to catch up", () => {
      // Need ~$222/mo, currently saving $172/mo -> delta = ~$50
      const neededTarget = 4000 / 18; // ~222.22
      const result = calculateCatchUpDelta(5000, 1000, 172, targetDate, NOW);
      expect(result).toBeCloseTo(neededTarget - 172, 0);
    });

    it("returns 0 when already fully funded", () => {
      const result = calculateCatchUpDelta(5000, 5000, 0, targetDate, NOW);
      expect(result).toBe(0);
    });

    it("returns full needed amount when saving $0", () => {
      const result = calculateCatchUpDelta(5000, 1000, 0, targetDate, NOW);
      const neededTarget = 4000 / 18; // ~222.22
      expect(result).toBeCloseTo(neededTarget, 0);
    });

    it("never returns negative", () => {
      const result = calculateCatchUpDelta(5000, 1000, 1000, targetDate, NOW);
      expect(result).toBe(0);
    });

    it("handles past target date without NaN", () => {
      const pastDate = new Date("2025-01-01T00:00:00Z");
      const result = calculateCatchUpDelta(5000, 0, 100, pastDate, NOW);
      expect(Number.isFinite(result)).toBe(true);
      expect(Number.isNaN(result)).toBe(false);
    });
  });

  // ==========================================================================
  // deriveTargetCost
  // ==========================================================================
  describe("deriveTargetCost", () => {
    const milestones: Milestone[] = [
      {
        id: "m1",
        planId: "goal-1",
        title: "Buy CO elk point",
        description: "",
        type: "buy_points",
        stateId: "CO",
        speciesId: "elk",
        year: 2026,
        costs: [],
        totalCost: 100,
        completed: false,
      },
      {
        id: "m2",
        planId: "goal-1",
        title: "Apply CO elk",
        description: "",
        type: "apply",
        stateId: "CO",
        speciesId: "elk",
        year: 2027,
        costs: [],
        totalCost: 250,
        completed: false,
      },
      {
        id: "m3",
        planId: "goal-2",
        title: "Buy WY mule deer point",
        description: "",
        type: "buy_points",
        stateId: "WY",
        speciesId: "mule_deer",
        year: 2026,
        costs: [],
        totalCost: 500,
        completed: false,
      },
    ];

    it("sums totalCost for milestones matching goalId", () => {
      const result = deriveTargetCost(milestones, "goal-1");
      expect(result).toBe(350); // 100 + 250
    });

    it("returns 0 when no milestones match", () => {
      const result = deriveTargetCost(milestones, "nonexistent");
      expect(result).toBe(0);
    });

    it("returns 0 for empty milestones array", () => {
      const result = deriveTargetCost([], "goal-1");
      expect(result).toBe(0);
    });

    it("only includes milestones where planId === goalId", () => {
      const result = deriveTargetCost(milestones, "goal-2");
      expect(result).toBe(500);
    });

    it("handles milestones with undefined planId", () => {
      const msWithUndefined: Milestone[] = [
        {
          id: "m4",
          title: "No planId",
          description: "",
          type: "deadline",
          stateId: "CO",
          speciesId: "elk",
          year: 2026,
          costs: [],
          totalCost: 999,
          completed: false,
        },
      ];
      const result = deriveTargetCost(msWithUndefined, "goal-1");
      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // calculateAnnualSpendForecast
  // ==========================================================================
  describe("calculateAnnualSpendForecast", () => {
    const userGoals: UserGoal[] = [
      {
        id: "goal-1",
        userId: "u1",
        title: "CO Elk Hunt",
        speciesId: "elk",
        stateId: "CO",
        targetYear: 2028,
        status: "active",
        milestones: [],
      },
    ];

    const milestones: Milestone[] = [
      {
        id: "m1",
        planId: "goal-1",
        title: "Buy CO elk point",
        description: "",
        type: "buy_points",
        stateId: "CO",
        speciesId: "elk",
        year: 2026,
        costs: [],
        totalCost: 100,
        completed: false,
      },
      {
        id: "m2",
        planId: "goal-1",
        title: "Apply CO elk",
        description: "",
        type: "apply",
        stateId: "CO",
        speciesId: "elk",
        year: 2027,
        costs: [],
        totalCost: 250,
        completed: false,
      },
      {
        id: "m3",
        planId: "goal-1",
        title: "Hunt CO elk",
        description: "",
        type: "hunt",
        stateId: "CO",
        speciesId: "elk",
        year: 2028,
        costs: [],
        totalCost: 3000,
        completed: false,
      },
      {
        id: "m4",
        planId: "goal-1",
        title: "Already done",
        description: "",
        type: "buy_points",
        stateId: "CO",
        speciesId: "elk",
        year: 2026,
        costs: [],
        totalCost: 50,
        completed: true, // Should be excluded
      },
    ];

    // Use fake timers so new Date().getFullYear() is deterministic
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("groups incomplete milestones by year", () => {
      const result = calculateAnnualSpendForecast(userGoals, milestones);
      // Year 2026 should have 1 incomplete milestone ($100), not the completed one ($50)
      const year2026 = result.find((f) => f.year === 2026);
      expect(year2026).toBeDefined();
      expect(year2026!.items).toHaveLength(1);
      expect(year2026!.totalCost).toBe(100);
    });

    it("defaults to 5 years ahead", () => {
      const result = calculateAnnualSpendForecast(userGoals, milestones);
      expect(result).toHaveLength(5);
      expect(result[0].year).toBe(2026);
      expect(result[4].year).toBe(2030);
    });

    it("respects yearsAhead parameter", () => {
      const result = calculateAnnualSpendForecast(userGoals, milestones, 3);
      expect(result).toHaveLength(3);
    });

    it("returns empty items for years with no milestones", () => {
      const result = calculateAnnualSpendForecast(userGoals, milestones);
      const year2029 = result.find((f) => f.year === 2029);
      expect(year2029).toBeDefined();
      expect(year2029!.items).toHaveLength(0);
      expect(year2029!.totalCost).toBe(0);
    });

    it("includes goalTitle, stateId, speciesId, cost in items", () => {
      const result = calculateAnnualSpendForecast(userGoals, milestones);
      const year2027 = result.find((f) => f.year === 2027);
      expect(year2027).toBeDefined();
      expect(year2027!.items[0]).toEqual({
        goalTitle: "CO Elk Hunt",
        stateId: "CO",
        speciesId: "elk",
        cost: 250,
      });
    });

    it("falls back to milestone title when no matching goal", () => {
      const orphanMilestones: Milestone[] = [
        {
          id: "m5",
          planId: "orphan-goal",
          title: "Orphan milestone",
          description: "",
          type: "buy_points",
          stateId: "WY",
          speciesId: "mule_deer",
          year: 2026,
          costs: [],
          totalCost: 200,
          completed: false,
        },
      ];
      const result = calculateAnnualSpendForecast([], orphanMilestones, 1);
      expect(result[0].items[0].goalTitle).toBe("Orphan milestone");
    });

    it("excludes completed milestones", () => {
      const allCompleted: Milestone[] = [
        {
          id: "m6",
          planId: "goal-1",
          title: "Done",
          description: "",
          type: "buy_points",
          stateId: "CO",
          speciesId: "elk",
          year: 2026,
          costs: [],
          totalCost: 999,
          completed: true,
        },
      ];
      const result = calculateAnnualSpendForecast(userGoals, allCompleted, 1);
      expect(result[0].totalCost).toBe(0);
      expect(result[0].items).toHaveLength(0);
    });

    it("returns correct AnnualSpendForecast shape", () => {
      const result = calculateAnnualSpendForecast(userGoals, milestones, 1);
      expect(result[0]).toHaveProperty("year");
      expect(result[0]).toHaveProperty("items");
      expect(result[0]).toHaveProperty("totalCost");
      expect(typeof result[0].year).toBe("number");
      expect(Array.isArray(result[0].items)).toBe(true);
      expect(typeof result[0].totalCost).toBe("number");
    });
  });
});
