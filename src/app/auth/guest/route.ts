import { NextResponse } from "next/server";
import { createGuestToken } from "@/lib/guest-token";
import { limiters, checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate limit guest token generation
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const result = await checkRateLimit(limiters.guest(), ip);

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)) } }
    );
  }

  const token = await createGuestToken();

  const response = NextResponse.json({ ok: true });
  response.cookies.set("guest-token", token, {
    path: "/",
    maxAge: 86400, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return response;
}
