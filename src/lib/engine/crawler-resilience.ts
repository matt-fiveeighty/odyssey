/**
 * Crawler Resilience Engine — F&G Website Chaos Defense
 *
 * State F&G websites are archaic. They redesign portals without warning,
 * publish draw odds in unreadable PDFs, and implement CAPTCHAs to block bots.
 *
 * This module ensures the crawler fails GRACEFULLY when:
 *   1. The target HTML structure changes (broken DOM)
 *   2. PDF OCR misreads values (hallucination)
 *   3. A network timeout or CAPTCHA blocks the scrape
 *
 * Architecture:
 *   Crawler → DOM Validator → Sanity Constraints → Anomaly Detector → Data Airlock
 *
 * If ANY stage fails, the pipeline:
 *   1. Freezes ingestion for that state
 *   2. Reverts to "Last Known Good Data" snapshot
 *   3. Fires a P1 alert to engineering
 *   4. NEVER writes bad data to the production database
 */

// ============================================================================
// Types
// ============================================================================

export type AlertSeverity = "P1" | "P2" | "P3";
export type CrawlStatus = "success" | "dom_failure" | "ocr_anomaly" | "network_error" | "captcha_blocked" | "sanity_failure";

export interface CrawlResult {
  stateId: string;
  status: CrawlStatus;
  /** The raw extracted data (null on failure) */
  data: CrawlerExtractedData | null;
  /** Errors encountered during crawl */
  errors: CrawlError[];
  /** Timestamp of this crawl attempt */
  attemptedAt: string;
  /** Duration in ms */
  durationMs: number;
  /** Source URL that was crawled */
  sourceUrl: string;
}

export interface CrawlerExtractedData {
  fees: Record<string, number>;      // speciesId → NR tag fee
  pointCosts: Record<string, number>; // speciesId → point purchase cost
  deadlines: Record<string, { open: string; close: string }>;
  drawOdds?: Record<string, number>;  // speciesId → draw probability (0-1)
  licenseFees: {
    qualifyingLicense?: number;
    appFee?: number;
  };
}

export interface CrawlError {
  code: string;
  message: string;
  field?: string;
  expectedSelector?: string;
  severity: AlertSeverity;
}

export interface P1Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  stateId: string;
  source: "crawler" | "sanity" | "anomaly" | "security";
  firedAt: string;
  acknowledged: boolean;
  /** The specific field(s) that triggered the alert */
  affectedFields: string[];
}

// ============================================================================
// Last Known Good Snapshot Registry
// ============================================================================

export interface LastKnownGoodSnapshot {
  stateId: string;
  data: CrawlerExtractedData;
  capturedAt: string;
  sourceUrl: string;
  /** Hash of the data for quick comparison */
  dataHash: string;
}

/** In-memory registry of last known good snapshots (in production: Redis/DB) */
const lastKnownGoodRegistry = new Map<string, LastKnownGoodSnapshot>();

/** Alert log (in production: Slack webhook + PagerDuty) */
const alertLog: P1Alert[] = [];

export function setLastKnownGood(stateId: string, snapshot: LastKnownGoodSnapshot): void {
  lastKnownGoodRegistry.set(stateId, snapshot);
}

export function getLastKnownGood(stateId: string): LastKnownGoodSnapshot | null {
  return lastKnownGoodRegistry.get(stateId) ?? null;
}

export function getAlertLog(): P1Alert[] {
  return [...alertLog];
}

export function clearAlertLog(): void {
  alertLog.length = 0;
}

export function clearLastKnownGoodRegistry(): void {
  lastKnownGoodRegistry.clear();
}

// ============================================================================
// 1. DOM Structure Validator — "Broken F&G DOM" Defense
// ============================================================================

/**
 * Schema definition for what the crawler expects to find on an F&G page.
 * If any required selector is missing, the crawl fails immediately.
 */
export interface DOMSchema {
  stateId: string;
  /** Required CSS selectors that must be present */
  requiredSelectors: string[];
  /** Expected data fields and their extraction selectors */
  fieldSelectors: Record<string, string>;
  /** Minimum number of data rows expected (e.g., species fee table) */
  minExpectedRows: number;
}

/**
 * Validate that the raw HTML matches the expected DOM structure.
 * Returns errors for every missing/changed selector.
 *
 * This is the FIRST gate — if the DOM doesn't match,
 * we don't even try to extract data.
 */
export function validateDOMStructure(
  html: string,
  schema: DOMSchema,
): { valid: boolean; errors: CrawlError[] } {
  const errors: CrawlError[] = [];

  // Check each required selector
  for (const selector of schema.requiredSelectors) {
    // Simple check: look for the selector's key identifier in HTML
    // In production, this would use a real DOM parser (cheerio/jsdom)
    const selectorPattern = selectorToPattern(selector);
    if (!selectorPattern.test(html)) {
      errors.push({
        code: "DOM_SELECTOR_MISSING",
        message: `Required selector "${selector}" not found in ${schema.stateId} F&G page`,
        expectedSelector: selector,
        severity: "P1",
      });
    }
  }

  // Check minimum data rows
  const tableRowPattern = /<tr[\s>]/gi;
  const rowCount = (html.match(tableRowPattern) || []).length;
  if (rowCount < schema.minExpectedRows) {
    errors.push({
      code: "DOM_INSUFFICIENT_ROWS",
      message: `Expected at least ${schema.minExpectedRows} data rows but found ${rowCount}`,
      severity: "P1",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert a CSS selector into a regex pattern for HTML matching.
 * This is intentionally simplified — in production we'd use a real parser.
 */
function selectorToPattern(selector: string): RegExp {
  // Handle class selectors: .fee-table → class="...fee-table..."
  if (selector.startsWith(".")) {
    const className = selector.slice(1);
    return new RegExp(`class="[^"]*${escapeRegex(className)}[^"]*"`, "i");
  }
  // Handle ID selectors: #elk-fees → id="elk-fees"
  if (selector.startsWith("#")) {
    const id = selector.slice(1);
    return new RegExp(`id="${escapeRegex(id)}"`, "i");
  }
  // Handle tag selectors: table → <table
  return new RegExp(`<${escapeRegex(selector)}[\\s>]`, "i");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// 2. Anomalous Variance Checker — "PDF OCR Hallucination" Defense
// ============================================================================

export interface HistoricalDataPoint {
  year: number;
  value: number;
}

export interface AnomalyCheckResult {
  field: string;
  speciesId?: string;
  isAnomaly: boolean;
  newValue: number;
  historicalMean: number;
  historicalStdDev: number;
  /** How many standard deviations from the mean */
  zScore: number;
  /** The threshold that was applied */
  threshold: number;
  explanation: string;
}

/**
 * Check if a newly extracted value is an anomaly compared to historical data.
 *
 * Uses a z-score approach:
 *   - If the new value is >3 standard deviations from the historical mean,
 *     it's flagged as an anomaly and quarantined.
 *   - Draw odds anomaly: if historical is 8-12% and crawler reads 90%, BLOCK.
 *   - Fee anomaly: if historical is $800 and crawler reads $55, BLOCK.
 */
export function checkAnomaly(
  field: string,
  newValue: number,
  historicalData: HistoricalDataPoint[],
  thresholdSigma: number = 3,
  speciesId?: string,
): AnomalyCheckResult {
  if (historicalData.length < 2) {
    // Not enough history to detect anomalies
    return {
      field,
      speciesId,
      isAnomaly: false,
      newValue,
      historicalMean: newValue,
      historicalStdDev: 0,
      zScore: 0,
      threshold: thresholdSigma,
      explanation: "Insufficient historical data for anomaly detection (need ≥2 data points)",
    };
  }

  const values = historicalData.map((d) => d.value);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Prevent division by zero (all historical values identical)
  if (stdDev === 0) {
    const isAnomaly = newValue !== mean;
    return {
      field,
      speciesId,
      isAnomaly,
      newValue,
      historicalMean: mean,
      historicalStdDev: 0,
      zScore: isAnomaly ? Infinity : 0,
      threshold: thresholdSigma,
      explanation: isAnomaly
        ? `Historical values are constant (${mean}). New value ${newValue} is a departure.`
        : `New value matches historical constant (${mean}).`,
    };
  }

  const zScore = Math.abs((newValue - mean) / stdDev);
  const isAnomaly = zScore > thresholdSigma;

  return {
    field,
    speciesId,
    isAnomaly,
    newValue,
    historicalMean: mean,
    historicalStdDev: stdDev,
    zScore,
    threshold: thresholdSigma,
    explanation: isAnomaly
      ? `ANOMALY: ${newValue} is ${zScore.toFixed(1)}σ from historical mean ${mean.toFixed(1)} (threshold: ${thresholdSigma}σ). Historical range: ${Math.min(...values)}-${Math.max(...values)}. Quarantined for human review.`
      : `Within normal range: ${newValue} is ${zScore.toFixed(1)}σ from mean ${mean.toFixed(1)}.`,
  };
}

// ============================================================================
// 3. Sanity Constraint Engine — Hardcoded Fiduciary Guardrails
// ============================================================================

export interface SanityConstraint {
  stateId: string;
  speciesId?: string;
  field: string;
  residency: "NR" | "R" | "any";
  minValue: number;
  maxValue: number;
  description: string;
}

/**
 * Hardcoded sanity constraints for known F&G fee ranges.
 *
 * These are absolute guardrails — if the crawler extracts a value outside
 * these bounds, it's REJECTED immediately. No exceptions.
 *
 * Example: WY NR elk tag fee is historically $600-$2,500.
 *          If the crawler reads $55 (the resident fee), REJECT.
 */
export const SANITY_CONSTRAINTS: SanityConstraint[] = [
  // ── Wyoming ──
  { stateId: "WY", speciesId: "elk", field: "tagCost", residency: "NR", minValue: 500, maxValue: 3000, description: "WY NR elk tag" },
  { stateId: "WY", speciesId: "mule_deer", field: "tagCost", residency: "NR", minValue: 300, maxValue: 2000, description: "WY NR mule deer tag" },
  { stateId: "WY", speciesId: "elk", field: "tagCost", residency: "R", minValue: 30, maxValue: 200, description: "WY R elk tag" },
  { stateId: "WY", field: "qualifyingLicense", residency: "NR", minValue: 200, maxValue: 1000, description: "WY NR qualifying license" },

  // ── Colorado ──
  { stateId: "CO", speciesId: "elk", field: "tagCost", residency: "NR", minValue: 500, maxValue: 2000, description: "CO NR elk tag" },
  { stateId: "CO", speciesId: "mule_deer", field: "tagCost", residency: "NR", minValue: 200, maxValue: 1500, description: "CO NR mule deer tag" },
  { stateId: "CO", speciesId: "moose", field: "tagCost", residency: "NR", minValue: 1500, maxValue: 5000, description: "CO NR moose tag" },
  { stateId: "CO", field: "qualifyingLicense", residency: "NR", minValue: 50, maxValue: 500, description: "CO NR qualifying license" },

  // ── Montana ──
  { stateId: "MT", speciesId: "elk", field: "tagCost", residency: "NR", minValue: 500, maxValue: 2500, description: "MT NR elk tag" },
  { stateId: "MT", speciesId: "mule_deer", field: "tagCost", residency: "NR", minValue: 200, maxValue: 1500, description: "MT NR mule deer tag" },
  { stateId: "MT", field: "qualifyingLicense", residency: "NR", minValue: 100, maxValue: 800, description: "MT NR qualifying license" },

  // ── Arizona ──
  { stateId: "AZ", speciesId: "elk", field: "tagCost", residency: "NR", minValue: 300, maxValue: 2000, description: "AZ NR elk tag" },

  // ── Nevada ──
  { stateId: "NV", speciesId: "elk", field: "tagCost", residency: "NR", minValue: 500, maxValue: 3000, description: "NV NR elk tag" },
  { stateId: "NV", speciesId: "mule_deer", field: "tagCost", residency: "NR", minValue: 200, maxValue: 1500, description: "NV NR mule deer tag" },

  // ── Draw odds universal constraints ──
  { stateId: "*", field: "drawOdds", residency: "any", minValue: 0, maxValue: 1, description: "Draw odds must be 0-100% (0.0-1.0)" },

  // ── Application fee universal constraints ──
  { stateId: "*", field: "appFee", residency: "any", minValue: 0, maxValue: 200, description: "Application fee reasonable range" },
];

export interface SanityViolation {
  constraint: SanityConstraint;
  actualValue: number;
  violation: "below_min" | "above_max";
  severity: "P1";
  message: string;
}

/**
 * Validate extracted data against hardcoded sanity constraints.
 *
 * If ANY constraint is violated, the write is REJECTED and a P1 alert fires.
 * The system reverts to Last Known Good data.
 */
export function validateSanityConstraints(
  stateId: string,
  data: CrawlerExtractedData,
  residency: "NR" | "R" = "NR",
): { valid: boolean; violations: SanityViolation[] } {
  const violations: SanityViolation[] = [];

  // Check tag costs
  for (const [speciesId, fee] of Object.entries(data.fees)) {
    const constraints = SANITY_CONSTRAINTS.filter(
      (c) =>
        (c.stateId === stateId || c.stateId === "*") &&
        (c.speciesId === speciesId || c.speciesId === undefined) &&
        c.field === "tagCost" &&
        (c.residency === residency || c.residency === "any"),
    );

    // NaN guard — "TBD", empty string, or bad OCR coerced to NaN must fail hard
    if (!Number.isFinite(fee)) {
      violations.push({
        constraint: constraints[0] ?? { stateId, speciesId, field: "tagCost", minValue: 0, maxValue: 0, residency, description: `${stateId} ${speciesId} tag cost` },
        actualValue: fee,
        violation: "below_min",
        severity: "P1",
        message: `${stateId} ${speciesId} tag cost is NaN/Infinity — crawler returned non-numeric value. Rejected.`,
      });
      continue; // Skip range checks — NaN comparisons always return false
    }

    for (const constraint of constraints) {
      if (fee < constraint.minValue) {
        violations.push({
          constraint,
          actualValue: fee,
          violation: "below_min",
          severity: "P1",
          message: `${constraint.description}: $${fee} is below minimum $${constraint.minValue}. Possible resident/NR mixup.`,
        });
      }
      if (fee > constraint.maxValue) {
        violations.push({
          constraint,
          actualValue: fee,
          violation: "above_max",
          severity: "P1",
          message: `${constraint.description}: $${fee} exceeds maximum $${constraint.maxValue}. Possible scrape error.`,
        });
      }
    }
  }

  // Check qualifying license
  if (data.licenseFees.qualifyingLicense !== undefined) {
    const constraints = SANITY_CONSTRAINTS.filter(
      (c) =>
        (c.stateId === stateId || c.stateId === "*") &&
        c.field === "qualifyingLicense" &&
        (c.residency === residency || c.residency === "any"),
    );

    for (const constraint of constraints) {
      const fee = data.licenseFees.qualifyingLicense;
      if (fee < constraint.minValue) {
        violations.push({
          constraint,
          actualValue: fee,
          violation: "below_min",
          severity: "P1",
          message: `${constraint.description}: $${fee} below minimum $${constraint.minValue}.`,
        });
      }
      if (fee > constraint.maxValue) {
        violations.push({
          constraint,
          actualValue: fee,
          violation: "above_max",
          severity: "P1",
          message: `${constraint.description}: $${fee} exceeds maximum $${constraint.maxValue}.`,
        });
      }
    }
  }

  // Check app fee
  if (data.licenseFees.appFee !== undefined) {
    const constraints = SANITY_CONSTRAINTS.filter(
      (c) =>
        (c.stateId === stateId || c.stateId === "*") &&
        c.field === "appFee" &&
        (c.residency === residency || c.residency === "any"),
    );

    for (const constraint of constraints) {
      const fee = data.licenseFees.appFee;
      if (fee < constraint.minValue || fee > constraint.maxValue) {
        violations.push({
          constraint,
          actualValue: fee,
          violation: fee < constraint.minValue ? "below_min" : "above_max",
          severity: "P1",
          message: `${constraint.description}: $${fee} outside range $${constraint.minValue}-$${constraint.maxValue}.`,
        });
      }
    }
  }

  // Check draw odds
  if (data.drawOdds) {
    for (const [speciesId, odds] of Object.entries(data.drawOdds)) {
      if (odds < 0 || odds > 1) {
        violations.push({
          constraint: SANITY_CONSTRAINTS.find((c) => c.field === "drawOdds")!,
          actualValue: odds,
          violation: odds < 0 ? "below_min" : "above_max",
          severity: "P1",
          message: `${stateId} ${speciesId} draw odds: ${(odds * 100).toFixed(1)}% is impossible (must be 0-100%).`,
        });
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

// ============================================================================
// 4. Full Crawl Pipeline — Orchestrates the entire ingestion flow
// ============================================================================

export interface CrawlPipelineResult {
  crawlResult: CrawlResult;
  /** Data that made it through all gates (null if any gate failed) */
  cleanData: CrawlerExtractedData | null;
  /** Whether the last known good was used as fallback */
  usedFallback: boolean;
  /** Alerts fired during this pipeline run */
  alerts: P1Alert[];
  /** Anomaly check results */
  anomalies: AnomalyCheckResult[];
  /** Sanity violations */
  sanityViolations: SanityViolation[];
  /** Final status */
  pipelineStatus: "clean" | "quarantined" | "fallback" | "failed";
}

/**
 * Run the full crawl pipeline for a state.
 *
 * Gate 1: DOM Structure Validation
 * Gate 2: Data Extraction
 * Gate 3: Sanity Constraints
 * Gate 4: Anomalous Variance Detection
 * Gate 5: Data Airlock (downstream — not called here, feeds into evaluateSnapshot)
 *
 * If ANY gate fails:
 *   1. Pipeline halts
 *   2. Last Known Good snapshot is used
 *   3. P1 alert fires
 *   4. Nothing reaches the production database
 */
export function runCrawlPipeline(
  crawlResult: CrawlResult,
  historicalData: Record<string, HistoricalDataPoint[]>,
  residency: "NR" | "R" = "NR",
): CrawlPipelineResult {
  const alerts: P1Alert[] = [];
  const anomalies: AnomalyCheckResult[] = [];
  const now = new Date().toISOString();

  // ── Gate 1: Crawl status check ──
  if (crawlResult.status !== "success" || !crawlResult.data) {
    const alert: P1Alert = {
      id: `crawl-failure-${crawlResult.stateId}-${now}`,
      severity: "P1",
      title: `Crawler Failed: ${crawlResult.stateId} ${crawlResult.status.replace(/_/g, " ")}`,
      description: crawlResult.errors.map((e) => e.message).join(". ") ||
        `Crawl failed with status: ${crawlResult.status}`,
      stateId: crawlResult.stateId,
      source: "crawler",
      firedAt: now,
      acknowledged: false,
      affectedFields: crawlResult.errors.map((e) => e.field ?? "unknown"),
    };
    alerts.push(alert);
    alertLog.push(alert);

    // Fallback to last known good
    const fallback = getLastKnownGood(crawlResult.stateId);
    return {
      crawlResult,
      cleanData: fallback?.data ?? null,
      usedFallback: fallback !== null,
      alerts,
      anomalies: [],
      sanityViolations: [],
      pipelineStatus: fallback ? "fallback" : "failed",
    };
  }

  const data = crawlResult.data;

  // ── Gate 2: Sanity Constraints ──
  const sanityResult = validateSanityConstraints(crawlResult.stateId, data, residency);
  if (!sanityResult.valid) {
    for (const violation of sanityResult.violations) {
      const alert: P1Alert = {
        id: `sanity-${crawlResult.stateId}-${violation.constraint.field}-${now}`,
        severity: "P1",
        title: `Sanity Violation: ${violation.message}`,
        description: `Crawler extracted value $${violation.actualValue} for ${violation.constraint.description}. ` +
          `Expected range: $${violation.constraint.minValue}-$${violation.constraint.maxValue}. ` +
          `Data REJECTED — using last known good snapshot.`,
        stateId: crawlResult.stateId,
        source: "sanity",
        firedAt: now,
        acknowledged: false,
        affectedFields: [violation.constraint.field],
      };
      alerts.push(alert);
      alertLog.push(alert);
    }

    const fallback = getLastKnownGood(crawlResult.stateId);
    return {
      crawlResult,
      cleanData: fallback?.data ?? null,
      usedFallback: fallback !== null,
      alerts,
      anomalies: [],
      sanityViolations: sanityResult.violations,
      pipelineStatus: fallback ? "fallback" : "failed",
    };
  }

  // ── Gate 3: Anomalous Variance Detection ──
  let hasAnomalies = false;

  // Check fees against historical data
  for (const [speciesId, fee] of Object.entries(data.fees)) {
    const histKey = `${crawlResult.stateId}-${speciesId}-fee`;
    const hist = historicalData[histKey];
    if (hist) {
      const result = checkAnomaly(`tagCost`, fee, hist, 3, speciesId);
      anomalies.push(result);
      if (result.isAnomaly) hasAnomalies = true;
    }
  }

  // Check draw odds against historical data
  if (data.drawOdds) {
    for (const [speciesId, odds] of Object.entries(data.drawOdds)) {
      const histKey = `${crawlResult.stateId}-${speciesId}-odds`;
      const hist = historicalData[histKey];
      if (hist) {
        const result = checkAnomaly(`drawOdds`, odds, hist, 3, speciesId);
        anomalies.push(result);
        if (result.isAnomaly) hasAnomalies = true;
      }
    }
  }

  if (hasAnomalies) {
    const anomalyFields = anomalies.filter((a) => a.isAnomaly);
    const alert: P1Alert = {
      id: `anomaly-${crawlResult.stateId}-${now}`,
      severity: "P1",
      title: `Anomalous Data Detected: ${crawlResult.stateId} — ${anomalyFields.length} field(s) quarantined`,
      description: anomalyFields
        .map((a) => `${a.speciesId ?? ""} ${a.field}: ${a.explanation}`)
        .join(" | "),
      stateId: crawlResult.stateId,
      source: "anomaly",
      firedAt: now,
      acknowledged: false,
      affectedFields: anomalyFields.map((a) => `${a.speciesId ?? ""}-${a.field}`),
    };
    alerts.push(alert);
    alertLog.push(alert);

    // Quarantine — data goes to the airlock dashboard for human review
    return {
      crawlResult,
      cleanData: data, // Data is available but QUARANTINED, not promoted
      usedFallback: false,
      alerts,
      anomalies,
      sanityViolations: [],
      pipelineStatus: "quarantined",
    };
  }

  // ── All gates passed — data is clean ──
  // Update last known good
  setLastKnownGood(crawlResult.stateId, {
    stateId: crawlResult.stateId,
    data,
    capturedAt: now,
    sourceUrl: crawlResult.sourceUrl,
    dataHash: simpleHash(JSON.stringify(data)),
  });

  return {
    crawlResult,
    cleanData: data,
    usedFallback: false,
    alerts,
    anomalies,
    sanityViolations: [],
    pipelineStatus: "clean",
  };
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}
