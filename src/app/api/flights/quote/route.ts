import { NextResponse, type NextRequest } from "next/server";
import { cacheGet } from "@/lib/redis";
import { verified, estimated } from "@/lib/engine/verified-datum";
import { HUNTING_ROUTES } from "@/lib/constants/flight-hubs";

/**
 * GET /api/flights/quote — Cache-first flight price endpoint.
 *
 * Reads from Redis cache populated by the warm-flights cron job.
 * NEVER calls the Amadeus API directly — falls back to static
 * estimates from flight-hubs.ts when cache misses.
 *
 * Query params:
 *   origin      — IATA airport code (required)
 *   destination — IATA airport code (required)
 *
 * Returns VerifiedDatum-wrapped price:
 *   - "verified" confidence for cached Amadeus data
 *   - "estimated" confidence for static fallback
 */

interface CachedFlightData {
  price: number;
  currency: string;
  airline: string;
  queriedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const origin = searchParams.get("origin")?.toUpperCase();
    const destination = searchParams.get("destination")?.toUpperCase();

    // Validate required params
    if (!origin || !destination) {
      return NextResponse.json(
        { error: "Missing origin or destination" },
        { status: 400 },
      );
    }

    // 1. Cache lookup
    const cacheKey = `flight:${origin}:${destination}`;
    const cached = await cacheGet<CachedFlightData>(cacheKey);

    if (cached) {
      return NextResponse.json({
        data: verified(
          cached.price,
          "https://api.amadeus.com/v2/shopping/flight-offers",
          cached.queriedAt,
          "Amadeus Flight Offers Search",
        ),
        meta: {
          source: "amadeus_cached",
          airline: cached.airline,
          currency: cached.currency,
        },
      });
    }

    // 2. Static fallback — look up route in HUNTING_ROUTES
    const route = HUNTING_ROUTES.find(
      (r) => r.from === origin && r.to === destination,
    );
    const fallbackPrice = route?.avgCost ?? 250;

    return NextResponse.json({
      data: estimated(
        fallbackPrice,
        route
          ? "Historical average from flight-hubs.ts"
          : "Generic fallback estimate",
      ),
      meta: { source: "static_fallback" },
    });
  } catch (err) {
    // Never return 500 — degrade to fallback
    console.error("Flight quote error:", err);

    return NextResponse.json({
      data: estimated(250, "Error fallback estimate"),
      meta: { source: "error_fallback" },
    });
  }
}
