import { NextRequest, NextResponse } from "next/server";
import { cacheSet, isCacheAvailable, CACHE_TTLS } from "@/lib/redis";
import { limiters, checkRateLimit } from "@/lib/rate-limit";
import type { PlanItem } from "@/components/planner/PlanItemCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SharePlannerBody {
  items: PlanItem[];
  year: number;
  planName?: string;
}

// ---------------------------------------------------------------------------
// POST — generate a share link for a planner snapshot
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const limiter = limiters.guest();
  const identifier =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const rateLimit = await checkRateLimit(limiter, identifier);

  if (!rateLimit.success) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rateLimit.reset - Date.now()) / 1000),
    );
    return NextResponse.json(
      { error: "Too many share link requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      },
    );
  }

  // 2. Cache availability check
  if (!isCacheAvailable()) {
    return NextResponse.json(
      { error: "Share service temporarily unavailable" },
      { status: 503 },
    );
  }

  // 3. Request validation
  let body: SharePlannerBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty planner items" },
      { status: 400 },
    );
  }

  if (!body.year || typeof body.year !== "number") {
    return NextResponse.json(
      { error: "Missing or invalid year" },
      { status: 400 },
    );
  }

  // 4. Token generation
  const token = crypto.randomUUID();
  const shareKey = `planner_share:${token}`;

  // 5. Store in Redis with 90-day TTL (immutable snapshot)
  const createdAt = new Date().toISOString();
  await cacheSet(
    shareKey,
    {
      items: body.items,
      year: body.year,
      planName: body.planName ?? null,
      createdAt,
    },
    "share_links",
  );

  // 6. Build response
  const shareUrl = `${req.nextUrl.origin}/shared/planner/${token}`;
  const expiresAt = new Date(
    new Date(createdAt).getTime() + CACHE_TTLS.share_links * 1000,
  ).toISOString();

  return NextResponse.json(
    { url: shareUrl, token, expiresAt },
    { status: 201 },
  );
}
