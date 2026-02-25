/**
 * FIDUCIARY TEST 7: Missed Deadline Detection & Success Disaster
 *
 * Scenario 1 — Missed Deadline:
 *   User has a CO elk application deadline of 2026-04-07.
 *   Today is 2026-04-10. The milestone is NOT marked as completed.
 *   The dispatcher MUST surface a critical alert.
 *
 * Scenario 2 — Success Disaster:
 *   User drew 3 tags in the same year. Total cost = $12,000.
 *   Hunt-year budget = $5,000.
 *   The dispatcher MUST surface a critical over-budget alert.
 *
 * FAILURE STATE: System allows stale deadlines to pass silently,
 *               or fails to warn when multiple draws exceed budget.
 */

import { describe, it, expect } from "vitest";
import {
  detectMissedDeadlines,
  detectSuccessDisaster,
} from "@/lib/engine/fiduciary-dispatcher";
import type { Milestone } from "@/lib/types";

// ── Helpers ──

function makeMilestone(overrides: Partial<Milestone>): Milestone {
  return {
    id: overrides.id ?? `m-${Math.random().toString(36).slice(2)}`,
    title: "",
    description: "",
    type: overrides.type ?? "apply",
    stateId: overrides.stateId ?? "CO",
    speciesId: overrides.speciesId ?? "elk",
    year: overrides.year ?? 2026,
    costs: [],
    totalCost: overrides.totalCost ?? 0,
    completed: overrides.completed ?? false,
    ...overrides,
  };
}

// ── Tests ──

describe("Fiduciary Test 7a: Missed Deadline Detection", () => {
  describe("Deadline in the past, not completed", () => {
    const milestones: Milestone[] = [
      makeMilestone({
        id: "m-co-elk",
        stateId: "CO",
        speciesId: "elk",
        type: "apply",
        dueDate: "2026-04-07",
        completed: false,
        year: 2026,
      }),
    ];

    const missed = detectMissedDeadlines(milestones, "2026-04-10");

    it("should detect 1 missed deadline", () => {
      expect(missed.length).toBe(1);
    });

    it("should identify CO elk as the missed deadline", () => {
      expect(missed[0].stateId).toBe("CO");
      expect(missed[0].speciesId).toBe("elk");
    });

    it("should report the correct deadline date", () => {
      expect(missed[0].deadline).toBe("2026-04-07");
    });
  });

  describe("Deadline in the past, but completed (applied)", () => {
    const milestones: Milestone[] = [
      makeMilestone({
        id: "m-co-elk",
        stateId: "CO",
        speciesId: "elk",
        type: "apply",
        dueDate: "2026-04-07",
        completed: true, // User marked as applied
        year: 2026,
      }),
    ];

    it("should NOT flag completed milestones as missed", () => {
      const missed = detectMissedDeadlines(milestones, "2026-04-10");
      expect(missed.length).toBe(0);
    });
  });

  describe("Deadline in the future", () => {
    const milestones: Milestone[] = [
      makeMilestone({
        id: "m-wy-elk",
        stateId: "WY",
        speciesId: "elk",
        type: "apply",
        dueDate: "2026-06-01",
        completed: false,
        year: 2026,
      }),
    ];

    it("should NOT flag future deadlines as missed", () => {
      const missed = detectMissedDeadlines(milestones, "2026-04-10");
      expect(missed.length).toBe(0);
    });
  });

  describe("Multiple missed deadlines", () => {
    const milestones: Milestone[] = [
      makeMilestone({
        id: "m-co",
        stateId: "CO",
        speciesId: "elk",
        type: "apply",
        dueDate: "2026-04-07",
        completed: false,
        year: 2026,
      }),
      makeMilestone({
        id: "m-nv",
        stateId: "NV",
        speciesId: "mule_deer",
        type: "apply",
        dueDate: "2026-04-01",
        completed: false,
        year: 2026,
      }),
      makeMilestone({
        id: "m-wy",
        stateId: "WY",
        speciesId: "elk",
        type: "apply",
        dueDate: "2026-06-01", // Future — should not be missed
        completed: false,
        year: 2026,
      }),
    ];

    const missed = detectMissedDeadlines(milestones, "2026-04-10");

    it("should detect exactly 2 missed deadlines", () => {
      expect(missed.length).toBe(2);
    });

    it("should include CO and NV but not WY", () => {
      const states = missed.map((m) => m.stateId);
      expect(states).toContain("CO");
      expect(states).toContain("NV");
      expect(states).not.toContain("WY");
    });
  });

  describe("Buy_points milestones are NOT deadlines", () => {
    const milestones: Milestone[] = [
      makeMilestone({
        id: "m-buy",
        stateId: "CO",
        speciesId: "elk",
        type: "buy_points",
        dueDate: "2026-04-07",
        completed: false,
        year: 2026,
      }),
    ];

    it("should NOT flag buy_points milestones", () => {
      const missed = detectMissedDeadlines(milestones, "2026-04-10");
      expect(missed.length).toBe(0);
    });
  });
});

describe("Fiduciary Test 7b: Success Disaster Detection", () => {
  describe("Multiple drew tags exceeding budget", () => {
    const milestones: Milestone[] = [
      makeMilestone({
        id: "m-co",
        stateId: "CO",
        speciesId: "elk",
        type: "apply",
        year: 2026,
        drawOutcome: "drew",
        totalCost: 4000,
        completed: true,
      }),
      makeMilestone({
        id: "m-wy",
        stateId: "WY",
        speciesId: "elk",
        type: "apply",
        year: 2026,
        drawOutcome: "drew",
        totalCost: 5000,
        completed: true,
      }),
      makeMilestone({
        id: "m-mt",
        stateId: "MT",
        speciesId: "elk",
        type: "apply",
        year: 2026,
        drawOutcome: "drew",
        totalCost: 3000,
        completed: true,
      }),
    ];

    const alerts = detectSuccessDisaster(milestones, 5000, 14, 2026);

    it("should detect success disaster when 3 draws exceed $5,000 budget", () => {
      expect(alerts.length).toBeGreaterThan(0);
      const budgetAlert = alerts.find((a) => a.id.includes("success-disaster-2026"));
      expect(budgetAlert).toBeDefined();
      expect(budgetAlert!.severity).toBe("critical");
    });

    it("should report the correct over-budget amount ($7,000)", () => {
      const budgetAlert = alerts.find((a) => a.id.includes("success-disaster-2026"));
      expect(budgetAlert!.description).toContain("$7,000");
    });

    it("should also flag PTO shortage for 3 hunts", () => {
      const ptoAlert = alerts.find((a) => a.id.includes("pto"));
      // 3 hunts × 6 days = 18 days > 14 available
      expect(ptoAlert).toBeDefined();
    });
  });

  describe("Single drew tag within budget", () => {
    const milestones: Milestone[] = [
      makeMilestone({
        id: "m-co",
        stateId: "CO",
        speciesId: "elk",
        type: "apply",
        year: 2026,
        drawOutcome: "drew",
        totalCost: 3000,
        completed: true,
      }),
    ];

    it("should NOT flag success disaster for a single draw within budget", () => {
      const alerts = detectSuccessDisaster(milestones, 5000, 14, 2026);
      expect(alerts.length).toBe(0);
    });
  });

  describe("Multiple draws but within budget", () => {
    const milestones: Milestone[] = [
      makeMilestone({
        id: "m-co",
        stateId: "CO",
        speciesId: "elk",
        type: "apply",
        year: 2026,
        drawOutcome: "drew",
        totalCost: 2000,
        completed: true,
      }),
      makeMilestone({
        id: "m-wy",
        stateId: "WY",
        speciesId: "elk",
        type: "apply",
        year: 2026,
        drawOutcome: "drew",
        totalCost: 2500,
        completed: true,
      }),
    ];

    it("should NOT flag when total is under budget", () => {
      const alerts = detectSuccessDisaster(milestones, 5000, 14, 2026);
      const budgetAlerts = alerts.filter((a) => a.id.includes("success-disaster-2026"));
      expect(budgetAlerts.length).toBe(0);
    });
  });

  describe("Mixed outcomes — only 'drew' should count", () => {
    const milestones: Milestone[] = [
      makeMilestone({
        id: "m-co",
        stateId: "CO",
        speciesId: "elk",
        type: "apply",
        year: 2026,
        drawOutcome: "drew",
        totalCost: 3000,
        completed: true,
      }),
      makeMilestone({
        id: "m-wy",
        stateId: "WY",
        speciesId: "elk",
        type: "apply",
        year: 2026,
        drawOutcome: "didnt_draw", // Didn't draw — should not count toward budget
        totalCost: 4000,
        completed: true,
      }),
    ];

    it("should only count 'drew' milestones toward budget", () => {
      const alerts = detectSuccessDisaster(milestones, 5000, 14, 2026);
      // Only $3,000 (CO) counts — under budget
      expect(alerts.length).toBe(0);
    });
  });
});
