/**
 * VerifiedDatum<T> — Provenance wrapper for any data value.
 *
 * Every number, string, or object flowing through the engine can be wrapped
 * with source attribution, confidence level, and staleness tracking. This is
 * the foundation for trustworthy data display: freshness badges, advisor voice
 * confidence, and three-tier resolution all attach to VerifiedDatum metadata.
 *
 * Standalone module — no dependencies on existing app types.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Confidence ordering: verified > user_reported > estimated > stale */
export type DataConfidence = "verified" | "estimated" | "stale" | "user_reported";

export interface VerifiedDatum<T> {
  value: T;
  source: {
    url: string;
    scrapedAt: string;
    label: string;
  };
  confidence: DataConfidence;
  /** Days since scrapedAt, or null for estimated data */
  staleDays: number | null;
  /** Whether staleDays exceeds the applicable threshold */
  isStale: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Confidence ordering — higher number = lower confidence */
export const CONFIDENCE_ORDER: Record<DataConfidence, number> = {
  verified: 0,
  user_reported: 1,
  estimated: 2,
  stale: 3,
};

/** Staleness thresholds in days, by data category */
export const STALE_THRESHOLDS = {
  /** Default threshold aligned with weekly crawl cadence + buffer */
  default: 10,
  /** Flight prices change daily */
  flight_prices: 1,
  /** CPI data updates less frequently */
  cpi_data: 45,
  /** Application deadlines: monthly refresh is fine */
  deadlines: 30,
} as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Compute days between a date string (ISO/YYYY-MM-DD) and now */
function computeStaleDays(scrapedAt: string): number {
  const scraped = new Date(scrapedAt).getTime();
  const now = Date.now();
  return Math.floor((now - scraped) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Wrap a value with "verified" confidence from a known source.
 * staleDays is computed from scrapedAt vs now.
 * isStale is true when staleDays exceeds the default threshold.
 */
export function verified<T>(
  value: T,
  sourceUrl: string,
  scrapedAt: string,
  label: string,
): VerifiedDatum<T> {
  const staleDays = computeStaleDays(scrapedAt);
  return {
    value,
    source: { url: sourceUrl, scrapedAt, label },
    confidence: "verified",
    staleDays,
    isStale: staleDays > STALE_THRESHOLDS.default,
  };
}

/**
 * Wrap a value with "estimated" confidence based on a computation/heuristic.
 * No scrape date — estimated data doesn't go stale.
 */
export function estimated<T>(value: T, basis: string): VerifiedDatum<T> {
  return {
    value,
    source: { url: "", scrapedAt: "", label: basis },
    confidence: "estimated",
    staleDays: null,
    isStale: false,
  };
}

/**
 * Wrap a value with "user_reported" confidence from user input.
 * staleDays computed from reportedAt but isStale is always false
 * (user data doesn't go "stale" — they chose to report it).
 */
export function userReported<T>(value: T, reportedAt: string): VerifiedDatum<T> {
  return {
    value,
    source: { url: "", scrapedAt: reportedAt, label: "User reported" },
    confidence: "user_reported",
    staleDays: computeStaleDays(reportedAt),
    isStale: false,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the raw value from a VerifiedDatum. */
export function unwrap<T>(datum: VerifiedDatum<T>): T {
  return datum.value;
}

/**
 * Wrap an array of values sharing the same source into VerifiedDatum[].
 * Each item gets its own VerifiedDatum with identical provenance.
 */
export function verifyBatch<T>(
  items: T[],
  sourceUrl: string,
  scrapedAt: string,
  label: string,
): VerifiedDatum<T>[] {
  return items.map((item) => verified(item, sourceUrl, scrapedAt, label));
}

/**
 * Derive the lowest confidence from multiple VerifiedDatum inputs.
 * Uses ordering: verified (0) > user_reported (1) > estimated (2) > stale (3).
 * Returns the confidence with the highest order number (= lowest trust).
 */
export function deriveConfidence(
  ...datums: VerifiedDatum<unknown>[]
): DataConfidence {
  let maxOrder = 0;
  let result: DataConfidence = "verified";

  for (const datum of datums) {
    const order = CONFIDENCE_ORDER[datum.confidence];
    if (order > maxOrder) {
      maxOrder = order;
      result = datum.confidence;
    }
  }

  return result;
}
