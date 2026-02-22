import { NextRequest, NextResponse } from "next/server";
import { cacheSet, isCacheAvailable, CACHE_TTLS } from "@/lib/redis";
import { limiters, checkRateLimit } from "@/lib/rate-limit";
import type { StrategicAssessment } from "@/lib/types";

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
      { error: "Too many calendar subscription requests. Please try again later." },
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
      { error: "Calendar service temporarily unavailable" },
      { status: 503 },
    );
  }

  // 3. Request validation
  let body: { assessment: StrategicAssessment };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.assessment || !body.assessment.id) {
    return NextResponse.json(
      { error: "Missing assessment data" },
      { status: 400 },
    );
  }

  // 4. Token generation
  const token = crypto.randomUUID();
  const calKey = `cal:${token}`;

  // 5. Store snapshot in Redis with 365-day TTL (ICS-05)
  const createdAt = new Date().toISOString();
  await cacheSet(calKey, { assessment: body.assessment, createdAt }, "calendar_plans");

  // 6. Build response URLs
  const httpURL = `${req.nextUrl.origin}/api/cal/${token}`;
  const webcalURL = httpURL.replace(/^https?:/, "webcal:");

  const expiresAt = new Date(
    new Date(createdAt).getTime() + CACHE_TTLS.calendar_plans * 1000,
  ).toISOString();

  return NextResponse.json(
    { webcalURL, httpURL, token, expiresAt },
    { status: 201 },
  );
}
