/**
 * Bureau of Labor Statistics CPI API Client
 *
 * Fetches Consumer Price Index data (CPI-U, All Items, US City Average)
 * and computes annual inflation rates. Results are cached in Redis for
 * 30 days via the existing cacheGet/cacheSet helpers.
 *
 * Never throws -- all errors return empty arrays or a 3.5% fallback rate.
 */

import { cacheGet, cacheSet } from "@/lib/redis";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

/** CPI-U, All Items, US City Average, Not Seasonally Adjusted */
const CPI_SERIES_ID = "CUUR0000SA0";

const CPI_CACHE_KEY = "bls:cpi_annual_rate";

/**
 * Fallback inflation rate (3.5%) used when the BLS API is unreachable
 * or returns insufficient data. Matches the hardcoded value used in
 * PortfolioOverview.tsx and HeroSummary.tsx.
 */
export const FALLBACK_INFLATION_RATE = 0.035;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CpiDataPoint {
  year: string;
  period: string;
  value: number;
  periodName: string;
}

// ---------------------------------------------------------------------------
// CPI Data Fetch
// ---------------------------------------------------------------------------

/**
 * Fetch CPI time series data from the BLS API v2.
 *
 * If BLS_API_KEY is not set, the request omits the registration key and
 * falls back to v1 rate limits (25 queries/day -- still functional).
 *
 * Returns an empty array on any failure.
 */
export async function fetchCpiData(
  startYear: number,
  endYear: number,
): Promise<CpiDataPoint[]> {
  try {
    const body: Record<string, unknown> = {
      seriesid: [CPI_SERIES_ID],
      startyear: String(startYear),
      endyear: String(endYear),
    };

    // Include registration key if available (v2 limits: 500 queries/day)
    if (process.env.BLS_API_KEY) {
      body.registrationkey = process.env.BLS_API_KEY;
    }

    const res = await fetch(BLS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) return [];

    const json = await res.json();

    if (json.status !== "REQUEST_SUCCEEDED") return [];

    const series = json.Results?.series?.[0];
    if (!series?.data) return [];

    return series.data.map(
      (d: { year: string; period: string; value: string; periodName: string }) => ({
        year: d.year,
        period: d.period,
        value: parseFloat(d.value),
        periodName: d.periodName,
      }),
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Inflation Rate Computation
// ---------------------------------------------------------------------------

/**
 * Compute year-over-year inflation rate from CPI data points.
 *
 * Resolution chain:
 * 1. Annual averages (period "M13") -- most accurate
 * 2. December values (period "M12") -- fallback for current year
 * 3. FALLBACK_INFLATION_RATE (3.5%) -- ultimate fallback
 */
export function computeAnnualInflationRate(data: CpiDataPoint[]): number {
  // Try annual averages first (M13 = annual average period)
  const annuals = data
    .filter((d) => d.period === "M13")
    .sort((a, b) => parseInt(b.year) - parseInt(a.year));

  if (annuals.length >= 2) {
    const current = annuals[0].value;
    const previous = annuals[1].value;
    return (current - previous) / previous;
  }

  // Fallback: December values
  const decembers = data
    .filter((d) => d.period === "M12")
    .sort((a, b) => parseInt(b.year) - parseInt(a.year));

  if (decembers.length >= 2) {
    return (decembers[0].value - decembers[1].value) / decembers[1].value;
  }

  // Ultimate fallback
  return FALLBACK_INFLATION_RATE;
}

// ---------------------------------------------------------------------------
// Cached Inflation Rate Accessor
// ---------------------------------------------------------------------------

/**
 * Get the latest annual inflation rate, with a three-tier resolution:
 *
 * 1. Redis cache (30-day TTL via "cpi_data" preset)
 * 2. Live BLS API fetch + cache write
 * 3. Hardcoded 3.5% fallback
 *
 * Source field indicates where the value came from.
 */
export async function getLatestInflationRate(): Promise<{
  rate: number;
  source: "bls_api" | "cached" | "fallback";
  queriedAt: string | null;
}> {
  // 1. Check Redis cache
  const cached = await cacheGet<{ rate: number; queriedAt: string }>(
    CPI_CACHE_KEY,
  );
  if (cached) {
    return { rate: cached.rate, source: "cached", queriedAt: cached.queriedAt };
  }

  // 2. Try live fetch
  try {
    const currentYear = new Date().getFullYear();
    const data = await fetchCpiData(currentYear - 1, currentYear);

    if (data.length > 0) {
      const rate = computeAnnualInflationRate(data);
      const queriedAt = new Date().toISOString();

      // Cache for 30 days (cpi_data preset)
      await cacheSet(CPI_CACHE_KEY, { rate, queriedAt }, "cpi_data");

      return { rate, source: "bls_api", queriedAt };
    }
  } catch {
    // Fall through to fallback
  }

  // 3. Fallback
  return { rate: FALLBACK_INFLATION_RATE, source: "fallback", queriedAt: null };
}
