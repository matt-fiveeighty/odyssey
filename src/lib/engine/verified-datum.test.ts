import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  type DataConfidence,
  type VerifiedDatum,
  verified,
  estimated,
  userReported,
  unwrap,
  verifyBatch,
  deriveConfidence,
  STALE_THRESHOLDS,
} from "./verified-datum";

// Pin "now" to 2026-02-21T00:00:00Z for deterministic staleness math
const FAKE_NOW = new Date("2026-02-21T00:00:00Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FAKE_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("VerifiedDatum", () => {
  // ---------------------------------------------------------------
  // verified() factory
  // ---------------------------------------------------------------
  describe("verified()", () => {
    it("wraps a raw value with source URL, scrape date, label, and 'verified' confidence", () => {
      const datum = verified(42, "https://cpw.state.co.us", "2026-02-15", "CPW");

      expect(datum.value).toBe(42);
      expect(datum.confidence).toBe("verified");
      expect(datum.source.url).toBe("https://cpw.state.co.us");
      expect(datum.source.scrapedAt).toBe("2026-02-15");
      expect(datum.source.label).toBe("CPW");
    });

    it("computes staleDays from scrapedAt relative to now", () => {
      // 2026-02-15 is 6 days before 2026-02-21
      const datum = verified(42, "https://cpw.state.co.us", "2026-02-15", "CPW");
      expect(datum.staleDays).toBe(6);
    });

    it("marks isStale = true when staleDays exceeds default threshold (10 days)", () => {
      // 2026-02-06 is 15 days before 2026-02-21
      const datum = verified(100, "https://example.com", "2026-02-06", "Example");
      expect(datum.staleDays).toBe(15);
      expect(datum.isStale).toBe(true);
    });

    it("marks isStale = false when staleDays is within default threshold", () => {
      // 2026-02-18 is 3 days before 2026-02-21
      const datum = verified(100, "https://example.com", "2026-02-18", "Example");
      expect(datum.staleDays).toBe(3);
      expect(datum.isStale).toBe(false);
    });

    it("works with string values", () => {
      const datum = verified("hello", "https://example.com", "2026-02-20", "Test");
      expect(datum.value).toBe("hello");
      expect(datum.confidence).toBe("verified");
    });

    it("works with object values", () => {
      const obj = { name: "elk", count: 5 };
      const datum = verified(obj, "https://example.com", "2026-02-20", "Test");
      expect(datum.value).toEqual(obj);
    });
  });

  // ---------------------------------------------------------------
  // estimated() factory
  // ---------------------------------------------------------------
  describe("estimated()", () => {
    it("wraps a value with 'estimated' confidence and a basis string as the source label", () => {
      const datum = estimated(0.03, "Historical 10-year CPI average");

      expect(datum.value).toBe(0.03);
      expect(datum.confidence).toBe("estimated");
      expect(datum.source.label).toBe("Historical 10-year CPI average");
      expect(datum.source.url).toBe("");
    });

    it("has isStale = false since estimated data has no scrape date to go stale", () => {
      const datum = estimated(0.03, "Historical 10-year CPI average");
      expect(datum.isStale).toBe(false);
      expect(datum.staleDays).toBeNull();
    });
  });

  // ---------------------------------------------------------------
  // userReported() factory
  // ---------------------------------------------------------------
  describe("userReported()", () => {
    it("wraps a value with 'user_reported' confidence and a reported-at date", () => {
      const datum = userReported(5, "2026-01-10");

      expect(datum.value).toBe(5);
      expect(datum.confidence).toBe("user_reported");
      expect(datum.source.scrapedAt).toBe("2026-01-10");
      expect(datum.source.url).toBe("");
    });

    it("has isStale = false since user-reported data does not go stale", () => {
      const datum = userReported(5, "2026-01-10");
      expect(datum.isStale).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // unwrap()
  // ---------------------------------------------------------------
  describe("unwrap()", () => {
    it("extracts the raw value from a verified datum", () => {
      const result = unwrap(verified(42, "https://cpw.state.co.us", "2026-02-15", "CPW"));
      expect(result).toBe(42);
    });

    it("extracts the raw value from an estimated datum", () => {
      const result = unwrap(estimated("hello", "basis"));
      expect(result).toBe("hello");
    });

    it("extracts the raw value from a userReported datum", () => {
      const result = unwrap(userReported({ points: 5 }, "2026-01-10"));
      expect(result).toEqual({ points: 5 });
    });
  });

  // ---------------------------------------------------------------
  // verifyBatch()
  // ---------------------------------------------------------------
  describe("verifyBatch()", () => {
    it("wraps an array of values sharing the same source into VerifiedDatum[]", () => {
      const items = [1, 2, 3];
      const result = verifyBatch(items, "https://example.com", "2026-02-20", "Batch Source");

      expect(result).toHaveLength(3);
      for (let i = 0; i < result.length; i++) {
        expect(result[i].value).toBe(items[i]);
        expect(result[i].confidence).toBe("verified");
        expect(result[i].source.url).toBe("https://example.com");
        expect(result[i].source.scrapedAt).toBe("2026-02-20");
        expect(result[i].source.label).toBe("Batch Source");
      }
    });
  });

  // ---------------------------------------------------------------
  // deriveConfidence()
  // ---------------------------------------------------------------
  describe("deriveConfidence()", () => {
    it("returns 'estimated' when mixing verified and estimated (lowest wins)", () => {
      const v = verified(1, "https://example.com", "2026-02-20", "A");
      const e = estimated(2, "basis");
      expect(deriveConfidence(v, e)).toBe("estimated");
    });

    it("returns 'user_reported' when mixing verified and user_reported", () => {
      const v = verified(1, "https://example.com", "2026-02-20", "A");
      const u = userReported(2, "2026-01-10");
      expect(deriveConfidence(v, u)).toBe("user_reported");
    });

    it("returns 'verified' when all inputs are verified", () => {
      const v1 = verified(1, "https://example.com", "2026-02-20", "A");
      const v2 = verified(2, "https://example.com", "2026-02-20", "B");
      expect(deriveConfidence(v1, v2)).toBe("verified");
    });

    it("returns 'stale' when any input is stale", () => {
      const v = verified(1, "https://example.com", "2026-02-20", "A");
      // Create a stale datum: manually build one with stale confidence
      const s: VerifiedDatum<number> = {
        value: 2,
        source: { url: "https://old.com", scrapedAt: "2025-01-01", label: "Old" },
        confidence: "stale",
        staleDays: 400,
        isStale: true,
      };
      expect(deriveConfidence(v, s)).toBe("stale");
    });

    it("returns 'stale' as lowest when mixing all confidence levels", () => {
      const v = verified(1, "https://example.com", "2026-02-20", "A");
      const e = estimated(2, "basis");
      const u = userReported(3, "2026-01-10");
      const s: VerifiedDatum<number> = {
        value: 4,
        source: { url: "", scrapedAt: "2025-01-01", label: "stale" },
        confidence: "stale",
        staleDays: 400,
        isStale: true,
      };
      expect(deriveConfidence(v, e, u, s)).toBe("stale");
    });
  });

  // ---------------------------------------------------------------
  // STALE_THRESHOLDS
  // ---------------------------------------------------------------
  describe("STALE_THRESHOLDS", () => {
    it("has a default threshold of 10 days", () => {
      expect(STALE_THRESHOLDS.default).toBe(10);
    });

    it("has category-specific thresholds", () => {
      expect(STALE_THRESHOLDS.flight_prices).toBe(1);
      expect(STALE_THRESHOLDS.cpi_data).toBe(45);
      expect(STALE_THRESHOLDS.deadlines).toBe(30);
    });
  });
});
