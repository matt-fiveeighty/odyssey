import { NextResponse, type NextRequest } from "next/server";
import {
  fetchCpiData,
  computeAnnualInflationRate,
  FALLBACK_INFLATION_RATE,
} from "@/lib/api/bls";
import { cacheSet } from "@/lib/redis";

/**
 * GET /api/cron/refresh-cpi — Monthly CPI data refresh cron.
 *
 * Fetches the latest CPI-U data from the BLS API and caches the
 * computed annual inflation rate in Redis (30-day TTL).
 *
 * Runs on the 15th of each month (vercel.json schedule).
 * Protected by CRON_SECRET (Vercel auto-injects for cron routes).
 */
export async function GET(request: NextRequest) {
  // --- Auth ---
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentYear = new Date().getFullYear();
    const data = await fetchCpiData(currentYear - 1, currentYear);

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch CPI data",
        fallbackRate: FALLBACK_INFLATION_RATE,
      });
    }

    const rate = computeAnnualInflationRate(data);
    const queriedAt = new Date().toISOString();

    // Cache with 30-day TTL (cpi_data preset)
    await cacheSet(
      "bls:cpi_annual_rate",
      { rate, queriedAt },
      "cpi_data",
    );

    return NextResponse.json({
      success: true,
      rate,
      dataPoints: data.length,
      queriedAt,
    });
  } catch (err) {
    // Cron failures logged, not alerted — never return 500
    console.error("CPI refresh cron error:", err);

    return NextResponse.json({
      success: false,
      error: "Failed to fetch CPI data",
      fallbackRate: FALLBACK_INFLATION_RATE,
    });
  }
}
