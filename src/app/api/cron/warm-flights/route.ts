import { NextResponse, type NextRequest } from "next/server";
import {
  searchFlightOffers,
  checkQuotaRemaining,
} from "@/lib/api/amadeus";
import { cacheSet } from "@/lib/redis";
import { HUNTING_ROUTES } from "@/lib/constants/flight-hubs";

/**
 * GET /api/cron/warm-flights — Batch flight price warming cron.
 *
 * Pre-caches Amadeus flight prices for all unique HUNTING_ROUTES airport
 * pairs. Runs on the 1st of each month (vercel.json schedule).
 *
 * - Deduplicates airport pairs from HUNTING_ROUTES (~35-40 unique)
 * - Batches in groups of 10 with 1s delay between groups
 * - Checks quota before starting (skips entirely if exhausted)
 * - Caches results with 6h TTL (flight_prices preset)
 *
 * Protected by CRON_SECRET (Vercel auto-injects for cron routes).
 */

/** Allow up to 60s for batch processing on Vercel Pro */
export const maxDuration = 60;

/** Pairs per batch and delay between batches */
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

/**
 * Compute a reasonable search date for flight warming.
 *
 * Strategy:
 * - If current month is Sep-Nov (hunting season), use 6 weeks from now
 * - Otherwise, use October 1 of the current or next year
 */
function getSearchDate(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed

  if (month >= 8 && month <= 10) {
    // Sep (8), Oct (9), Nov (10) — in hunting season, search 6 weeks out
    const sixWeeks = new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000);
    return sixWeeks.toISOString().split("T")[0];
  }

  // Off-season: target October 1
  const year = month >= 11 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-10-01`;
}

/** Small delay helper */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  // --- Auth ---
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Check quota before starting ---
  const quota = await checkQuotaRemaining();
  if (quota.exhausted) {
    return NextResponse.json({
      skipped: true,
      reason: "Quota exhausted",
      quota,
    });
  }

  // --- Build unique airport pairs ---
  const seen = new Set<string>();
  const pairs: { from: string; to: string }[] = [];

  for (const route of HUNTING_ROUTES) {
    const key = `${route.from}:${route.to}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ from: route.from, to: route.to });
    }
  }

  const searchDate = getSearchDate();
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  // --- Process in batches ---
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    // Check quota before each batch
    const batchQuota = await checkQuotaRemaining();
    if (batchQuota.exhausted) {
      skipCount += pairs.length - i;
      break;
    }

    const batch = pairs.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (pair) => {
        const result = await searchFlightOffers(
          pair.from,
          pair.to,
          searchDate,
        );

        if (result) {
          await cacheSet(
            `flight:${pair.from}:${pair.to}`,
            {
              price: result.price,
              currency: result.currency,
              airline: result.airline,
              queriedAt: result.queriedAt,
            },
            "flight_prices",
          );
          return true;
        }
        return false;
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        successCount++;
      } else {
        failCount++;
      }
    }

    // Delay between batches (skip after last batch)
    if (i + BATCH_SIZE < pairs.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const finalQuota = await checkQuotaRemaining();

  return NextResponse.json({
    success: true,
    cached: successCount,
    failed: failCount,
    skipped: skipCount,
    totalPairs: pairs.length,
    searchDate,
    quota: finalQuota,
  });
}
