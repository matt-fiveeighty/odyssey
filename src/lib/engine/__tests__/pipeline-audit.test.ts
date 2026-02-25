/**
 * Data Pipeline & Frequency Audit — "Zero-Stale Data" Tests
 *
 * 5 pillars that must pass before launch:
 *   1. Adaptive Frequency Routing ("Smart Pulse")
 *   2. Evasion & Infrastructure Resilience ("Ghost Protocol")
 *   3. Silent DOM Shift Tripwire (Anti-Garbage Defense)
 *   4. Data Provenance / Freshness Stamps
 *   5. Autonomous Push Reporting (AI Fiduciary)
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  computeOptimalFrequency,
  buildCrawlSchedule,
  computeBackoff,
  computeFreshnessStamp,
  compileWeeklyDigest,
  FREQUENCY_MS,
  type StateDeadlineContext,
  type DataCategory,
  type CrawlFrequency,
} from "../adaptive-scheduler";

import {
  validateDOMStructure,
  validateSanityConstraints,
  checkAnomaly,
  runCrawlPipeline,
  clearAlertLog,
  clearLastKnownGoodRegistry,
  setLastKnownGood,
  type DOMSchema,
  type CrawlerExtractedData,
} from "../crawler-resilience";

// ============================================================================
// HELPERS
// ============================================================================

function makeContext(
  stateId: string,
  daysUntilDeadline: number | null,
  windowOpen: boolean = false,
): StateDeadlineContext {
  const now = new Date();
  let closestDeadline: string | null = null;
  if (daysUntilDeadline !== null) {
    const deadline = new Date(now.getTime() + daysUntilDeadline * 24 * 60 * 60 * 1000);
    closestDeadline = deadline.toISOString().slice(0, 10);
  }
  return {
    stateId,
    species: ["elk", "mule_deer"],
    closestDeadline,
    windowOpen,
    daysUntilDeadline,
    fgUrl: `https://fgd.state.${stateId.toLowerCase()}.us`,
    regulatoryUrl: `https://fgd.state.${stateId.toLowerCase()}.us/commission`,
  };
}

// ============================================================================
// PILLAR 1: Adaptive Frequency Routing ("Smart Pulse")
// ============================================================================

describe("PILLAR 1 — Adaptive Frequency Routing (Smart Pulse)", () => {
  it("deadline ≤48 hours → 6-hour pings", () => {
    const ctx = makeContext("WY", 1); // 1 day out
    const result = computeOptimalFrequency(ctx, "deadlines");

    expect(result.frequency).toBe("6_hours");
    expect(result.priority).toBe(1);
    expect(result.reason).toContain("CRITICAL");
    expect(result.reason).toContain("6-hour");
  });

  it("deadline ≤48 hours (2 days) → 6-hour pings", () => {
    const ctx = makeContext("CO", 2);
    const result = computeOptimalFrequency(ctx, "deadlines");
    expect(result.frequency).toBe("6_hours");
  });

  it("deadline ≤30 days → daily pings", () => {
    const ctx = makeContext("MT", 15);
    const result = computeOptimalFrequency(ctx, "deadlines");

    expect(result.frequency).toBe("daily");
    expect(result.priority).toBe(2);
    expect(result.reason).toContain("Daily monitoring");
  });

  it("deadline ≤7 days → twice per week (elevated)", () => {
    const ctx = makeContext("AZ", 5);
    const result = computeOptimalFrequency(ctx, "deadlines");

    expect(result.frequency).toBe("twice_week");
    expect(result.priority).toBe(2);
  });

  it("window closed (deadline passed) → weekly pings", () => {
    const ctx = makeContext("NV", -30); // 30 days past
    const result = computeOptimalFrequency(ctx, "deadlines");

    expect(result.frequency).toBe("weekly");
    expect(result.priority).toBe(5);
    expect(result.reason).toContain("closed");
  });

  it("window open, deadline >30 days → weekly", () => {
    const ctx = makeContext("UT", 90);
    const result = computeOptimalFrequency(ctx, "deadlines");

    expect(result.frequency).toBe("weekly");
  });

  it("fees/regulations → weekly legislative monitoring", () => {
    const ctx = makeContext("CO", 90);
    const fees = computeOptimalFrequency(ctx, "fees");
    const regs = computeOptimalFrequency(ctx, "regulations");

    expect(fees.frequency).toBe("weekly");
    expect(regs.frequency).toBe("weekly");
    expect(fees.reason).toContain("legislative");
  });

  it("fees elevate to daily when deadline ≤30 days", () => {
    const ctx = makeContext("WY", 20);
    const result = computeOptimalFrequency(ctx, "fees");

    expect(result.frequency).toBe("daily");
    expect(result.reason).toContain("elevated");
  });

  it("draw odds → on_trigger (annual, awaiting press release)", () => {
    const ctx = makeContext("MT", 60);
    const result = computeOptimalFrequency(ctx, "draw_odds");

    expect(result.frequency).toBe("on_trigger");
    expect(result.priority).toBe(5);
    expect(result.reason).toContain("press release");
  });

  it("builds a complete schedule across all states and categories", () => {
    const contexts = [
      makeContext("WY", 2),   // Imminent deadline
      makeContext("CO", 45),  // Approaching
      makeContext("MT", -10), // Closed
    ];

    const schedule = buildCrawlSchedule(contexts);

    // 3 states × 4 categories = 12 tasks
    expect(schedule.tasks).toHaveLength(12);

    // WY deadlines should be highest priority (6-hour)
    const wyDeadline = schedule.tasks.find(
      (t) => t.stateId === "WY" && t.category === "deadlines"
    );
    expect(wyDeadline!.frequency).toBe("6_hours");
    expect(wyDeadline!.priority).toBe(1);

    // MT should be lowest priority (weekly, closed)
    const mtDeadline = schedule.tasks.find(
      (t) => t.stateId === "MT" && t.category === "deadlines"
    );
    expect(mtDeadline!.frequency).toBe("weekly");

    // First task in sorted schedule should be highest priority
    expect(schedule.tasks[0].priority).toBeLessThanOrEqual(schedule.tasks[schedule.tasks.length - 1].priority);

    // Frequency distribution should be populated
    expect(schedule.frequencyDistribution["6_hours"]).toBeGreaterThan(0);
    expect(schedule.nextDue).not.toBeNull();
  });

  it("no deadline data → conservative weekly fallback", () => {
    const ctx = makeContext("KS", null);
    const result = computeOptimalFrequency(ctx, "deadlines");

    expect(result.frequency).toBe("weekly");
    expect(result.reason).toContain("no deadline data");
  });
});

// ============================================================================
// PILLAR 2: Evasion & Infrastructure Resilience ("Ghost Protocol")
// ============================================================================

describe("PILLAR 2 — Ghost Protocol (Evasion & Resilience)", () => {
  it("exponential backoff: 5min → 10min → 20min → 40min", () => {
    const b1 = computeBackoff("WY", 1);
    const b2 = computeBackoff("WY", 2);
    const b3 = computeBackoff("WY", 3);
    const b4 = computeBackoff("WY", 4);

    expect(b1.currentDelayMs).toBe(5 * 60 * 1000);   // 5 min
    expect(b2.currentDelayMs).toBe(10 * 60 * 1000);  // 10 min
    expect(b3.currentDelayMs).toBe(20 * 60 * 1000);  // 20 min
    expect(b4.currentDelayMs).toBe(40 * 60 * 1000);  // 40 min

    expect(b1.paused).toBe(false);
    expect(b2.paused).toBe(false);
  });

  it("backoff caps at 24 hours (never goes silent)", () => {
    const b8 = computeBackoff("CO", 8);
    const maxMs = 24 * 60 * 60 * 1000;

    expect(b8.currentDelayMs).toBeLessThanOrEqual(maxMs);
  });

  it("pauses crawling after 10 consecutive failures", () => {
    const b10 = computeBackoff("MT", 10);

    expect(b10.paused).toBe(true);
    expect(b10.nextRetryAt).toBe("paused");
    expect(b10.currentDelayMs).toBe(Infinity);
    expect(b10.reason).toContain("PAUSED");
    expect(b10.reason).toContain("manual investigation");
  });

  it("does NOT pause before 10 failures", () => {
    const b9 = computeBackoff("AZ", 9);
    expect(b9.paused).toBe(false);
  });

  it("computes valid nextRetryAt timestamps", () => {
    const now = new Date("2026-03-01T12:00:00Z");
    const b1 = computeBackoff("WY", 1, now);

    const nextRetry = new Date(b1.nextRetryAt);
    const expectedRetry = new Date("2026-03-01T12:05:00Z"); // +5 min

    expect(nextRetry.getTime()).toBe(expectedRetry.getTime());
  });

  it("reason message includes failure count and delay", () => {
    const b3 = computeBackoff("NV", 3);

    expect(b3.reason).toContain("NV");
    expect(b3.reason).toContain("Failure #3");
    expect(b3.reason).toContain("20 minutes");
  });
});

// ============================================================================
// PILLAR 3: Silent DOM Shift Tripwire (strengthened)
// ============================================================================

describe("PILLAR 3 — Silent DOM Shift Tripwire (Anti-Garbage)", () => {
  beforeEach(() => {
    clearAlertLog();
    clearLastKnownGoodRegistry();
  });

  it("rejects string values where float expected (TBD → must fail)", () => {
    // Simulate crawler extracting "TBD" which gets coerced to NaN → 0
    const badData: CrawlerExtractedData = {
      fees: { elk: NaN }, // "TBD" coerced to NaN
      pointCosts: { elk: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    // NaN fails sanity (not >= minValue)
    const result = validateSanityConstraints("WY", badData, "NR");
    expect(result.valid).toBe(false);
  });

  it("rejects null/undefined fees (crawler returned empty)", () => {
    const badData: CrawlerExtractedData = {
      fees: { elk: 0 }, // null coerced to 0
      pointCosts: { elk: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    const result = validateSanityConstraints("WY", badData, "NR");
    expect(result.valid).toBe(false);
    expect(result.violations[0].violation).toBe("below_min");
  });

  it("P1 alert includes exact missing selector name", () => {
    const schema: DOMSchema = {
      stateId: "WY",
      requiredSelectors: [".nr-elk-fee", "#fee-table-2026"],
      fieldSelectors: {},
      minExpectedRows: 1,
    };

    const brokenHtml = "<html><body><div class='new-layout'></div></body></html>";
    const result = validateDOMStructure(brokenHtml, schema);

    expect(result.valid).toBe(false);
    const selectorErrors = result.errors.filter((e) => e.code === "DOM_SELECTOR_MISSING");
    expect(selectorErrors.length).toBe(2);
    expect(selectorErrors[0].expectedSelector).toBe(".nr-elk-fee");
    expect(selectorErrors[1].expectedSelector).toBe("#fee-table-2026");
  });

  it("zero chance of $0 or null reaching production — full pipeline proof", () => {
    // Set up fallback
    const goodData: CrawlerExtractedData = {
      fees: { elk: 828 },
      pointCosts: { elk: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };
    setLastKnownGood("WY", {
      stateId: "WY",
      data: goodData,
      capturedAt: "2026-02-20T12:00:00Z",
      sourceUrl: "https://wgfd.wyo.gov",
      dataHash: "good",
    });

    // Crawler extracts $0 (null coerced)
    const zeroData: CrawlerExtractedData = {
      fees: { elk: 0 },
      pointCosts: { elk: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    const crawl = {
      stateId: "WY",
      status: "success" as const,
      data: zeroData,
      errors: [],
      attemptedAt: new Date().toISOString(),
      durationMs: 1000,
      sourceUrl: "https://wgfd.wyo.gov",
    };

    const result = runCrawlPipeline(crawl, {});

    // $0 REJECTED → fallback to Last Known Good
    expect(result.pipelineStatus).toBe("fallback");
    expect(result.cleanData!.fees.elk).toBe(828); // Good data, not $0
    expect(result.alerts[0].severity).toBe("P1");
  });
});

// ============================================================================
// PILLAR 4: Data Provenance / Freshness Stamps
// ============================================================================

describe("PILLAR 4 — Data Provenance (Freshness Stamps)", () => {
  it("verified 2 hours ago → fresh, correct label", () => {
    const now = new Date("2026-03-01T14:00:00Z");
    const verified = "2026-03-01T12:00:00Z"; // 2 hours ago

    const stamp = computeFreshnessStamp("WY", "elk-tag-cost", verified, "https://wgfd.wyo.gov", "crawl", now);

    expect(stamp.stalenessLevel).toBe("fresh");
    expect(stamp.isStale).toBe(false);
    expect(stamp.freshnessLabel).toContain("2 hours ago");
    expect(stamp.freshnessLabel).toContain("WY G&F");
  });

  it("verified just now → fresh", () => {
    const now = new Date("2026-03-01T14:00:00Z");
    const verified = "2026-03-01T13:59:30Z"; // 30 seconds ago

    const stamp = computeFreshnessStamp("CO", "elk-fee", verified, "https://cpw.state.co.us", "crawl", now);

    expect(stamp.stalenessLevel).toBe("fresh");
    expect(stamp.freshnessLabel).toContain("just now");
  });

  it("verified 3 days ago → aging", () => {
    const now = new Date("2026-03-04T14:00:00Z");
    const verified = "2026-03-01T14:00:00Z"; // 3 days ago

    const stamp = computeFreshnessStamp("MT", "deadline", verified, "https://fwp.mt.gov", "crawl", now);

    expect(stamp.stalenessLevel).toBe("aging");
    expect(stamp.isStale).toBe(false);
    expect(stamp.freshnessLabel).toContain("3 days ago");
  });

  it("verified 8 days ago → stale", () => {
    const now = new Date("2026-03-09T14:00:00Z");
    const verified = "2026-03-01T14:00:00Z"; // 8 days ago

    const stamp = computeFreshnessStamp("AZ", "draw-odds", verified, "https://azgfd.com", "crawl", now);

    expect(stamp.stalenessLevel).toBe("stale");
    expect(stamp.isStale).toBe(true);
    expect(stamp.freshnessLabel).toContain("8 days ago");
  });

  it("verified 30+ days ago → critical", () => {
    const now = new Date("2026-04-01T14:00:00Z");
    const verified = "2026-03-01T14:00:00Z"; // 31 days ago

    const stamp = computeFreshnessStamp("NV", "elk-fee", verified, "https://ndow.org", "manual", now);

    expect(stamp.stalenessLevel).toBe("critical");
    expect(stamp.isStale).toBe(true);
    expect(stamp.freshnessLabel).toContain("STALE");
    expect(stamp.verificationMethod).toBe("manual");
  });

  it("tracks verification method (crawl vs manual vs lkg_fallback)", () => {
    const now = new Date();
    const verified = now.toISOString();

    const crawlStamp = computeFreshnessStamp("WY", "fee", verified, "url", "crawl", now);
    const manualStamp = computeFreshnessStamp("WY", "fee", verified, "url", "manual", now);
    const fallbackStamp = computeFreshnessStamp("WY", "fee", verified, "url", "lkg_fallback", now);

    expect(crawlStamp.verificationMethod).toBe("crawl");
    expect(manualStamp.verificationMethod).toBe("manual");
    expect(fallbackStamp.verificationMethod).toBe("lkg_fallback");
  });
});

// ============================================================================
// PILLAR 5: Autonomous Push Reporting (AI Fiduciary)
// ============================================================================

describe("PILLAR 5 — Autonomous Push Reporting (Weekly Digest)", () => {
  it("compiles a complete weekly digest with all sections", () => {
    const digest = compileWeeklyDigest(
      // Successful updates
      [
        { stateId: "WY", field: "elk-fees", verifiedAt: "2026-03-01T10:00:00Z", summary: "WY Elk NR tag fee verified: $828" },
        { stateId: "CO", field: "deadlines", verifiedAt: "2026-03-01T11:00:00Z", summary: "CO deadline confirmed: Apr 7" },
      ],
      // Quarantined anomalies
      [
        { stateId: "MT", field: "elk-odds", detectedAt: "2026-03-02T09:00:00Z", summary: "MT elk odds read 90% (historical: 8%)", awaitingApproval: true },
      ],
      // Frequency changes
      [
        { stateId: "WY", category: "deadlines" as DataCategory, oldFrequency: "weekly" as CrawlFrequency, newFrequency: "6_hours" as CrawlFrequency, reason: "Deadline in 48 hours" },
      ],
      // Crawler failures
      [
        { stateId: "NV", failureCount: 3, lastError: "DOM shift detected", status: "backing_off" as const },
      ],
      // Self-healed blocks
      [
        { stateId: "AZ", field: "elk-fee", method: "llm_vision" as const, confidence: 0.85, awaitingApproval: true, summary: "LLM vision extracted $650 from redesigned AZ page" },
      ],
    );

    expect(digest.successfulUpdates).toHaveLength(2);
    expect(digest.quarantinedAnomalies).toHaveLength(1);
    expect(digest.frequencyChanges).toHaveLength(1);
    expect(digest.crawlerFailures).toHaveLength(1);
    expect(digest.selfHealedBlocks).toHaveLength(1);
  });

  it("health score: 100 for clean week, degrades for failures", () => {
    // Perfect week
    const cleanDigest = compileWeeklyDigest(
      [{ stateId: "WY", field: "fees", verifiedAt: "2026-03-01", summary: "ok" }],
      [], [], [], [],
    );
    expect(cleanDigest.healthScore).toBe(100);

    // Week with paused crawler (-15) and pending anomaly (-10)
    const badDigest = compileWeeklyDigest(
      [],
      [{ stateId: "MT", field: "odds", detectedAt: "2026-03-01", summary: "bad", awaitingApproval: true }],
      [],
      [{ stateId: "NV", failureCount: 10, lastError: "paused", status: "paused" as const }],
      [],
    );
    expect(badDigest.healthScore).toBe(75); // 100 - 15 (paused) - 10 (anomaly)
  });

  it("summary line includes key metrics for Slack", () => {
    const digest = compileWeeklyDigest(
      [{ stateId: "WY", field: "fees", verifiedAt: "2026-03-01", summary: "ok" }],
      [{ stateId: "MT", field: "odds", detectedAt: "2026-03-01", summary: "bad", awaitingApproval: true }],
      [],
      [],
      [{ stateId: "AZ", field: "fee", method: "llm_vision" as const, confidence: 0.85, awaitingApproval: true, summary: "self-healed" }],
    );

    expect(digest.summaryLine).toContain("1 updates verified");
    expect(digest.summaryLine).toContain("quarantined");
    expect(digest.summaryLine).toContain("self-healed");
    expect(digest.summaryLine).toContain("Health:");
  });

  it("self-healed blocks are flagged for human approval", () => {
    const digest = compileWeeklyDigest(
      [], [], [], [],
      [{ stateId: "AZ", field: "elk-fee", method: "llm_vision" as const, confidence: 0.85, awaitingApproval: true, summary: "LLM extracted fee" }],
    );

    expect(digest.selfHealedBlocks[0].awaitingApproval).toBe(true);
    expect(digest.selfHealedBlocks[0].method).toBe("llm_vision");
    expect(digest.selfHealedBlocks[0].confidence).toBe(0.85);
  });

  it("period covers exactly 7 days", () => {
    const now = new Date("2026-03-08T08:00:00Z");
    const digest = compileWeeklyDigest([], [], [], [], [], now);

    const start = new Date(digest.periodStart);
    const end = new Date(digest.periodEnd);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    expect(Math.round(diffDays)).toBe(7);
  });

  it("health score never goes below 0 or above 100", () => {
    // 10 paused crawlers = -150, but clamped to 0
    const disasterDigest = compileWeeklyDigest(
      [], [], [],
      Array.from({ length: 10 }, (_, i) => ({
        stateId: `STATE${i}`, failureCount: 10, lastError: "dead", status: "paused" as const,
      })),
      [],
    );

    expect(disasterDigest.healthScore).toBe(0);
    expect(disasterDigest.healthScore).toBeGreaterThanOrEqual(0);
    expect(disasterDigest.healthScore).toBeLessThanOrEqual(100);
  });
});
