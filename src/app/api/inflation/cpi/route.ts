import { NextResponse } from "next/server";
import {
  getLatestInflationRate,
  FALLBACK_INFLATION_RATE,
} from "@/lib/api/bls";
import { verified, estimated } from "@/lib/engine/verified-datum";

/**
 * GET /api/inflation/cpi — Cache-first inflation rate endpoint.
 *
 * Uses the three-tier resolution chain in bls.ts:
 *   1. Redis cache (populated by refresh-cpi cron)
 *   2. Live BLS API fetch (writes through to cache)
 *   3. Hardcoded 3.5% fallback
 *
 * Returns VerifiedDatum-wrapped inflation rate:
 *   - "verified" confidence for BLS API or cached data
 *   - "estimated" confidence for fallback
 */
export async function GET() {
  try {
    const result = await getLatestInflationRate();

    if (result.source === "bls_api" || result.source === "cached") {
      return NextResponse.json({
        data: verified(
          result.rate,
          "https://api.bls.gov/publicAPI/v2/timeseries/data/",
          result.queriedAt!,
          "BLS CPI-U Annual Rate",
        ),
        meta: { source: result.source },
      });
    }

    // Fallback source
    return NextResponse.json({
      data: estimated(result.rate, "Historical 10-year CPI average"),
      meta: { source: "fallback" },
    });
  } catch (err) {
    // Never return 500 — degrade to fallback
    console.error("CPI endpoint error:", err);

    return NextResponse.json({
      data: estimated(
        FALLBACK_INFLATION_RATE,
        "Historical 10-year CPI average",
      ),
      meta: { source: "error_fallback" },
    });
  }
}
