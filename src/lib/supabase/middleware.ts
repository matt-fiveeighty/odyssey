import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { limiters, checkRateLimit } from "@/lib/rate-limit";
import { verifyGuestToken } from "@/lib/guest-token";

// Map path prefixes to rate limiter factories
function getLimiterForPath(pathname: string) {
  if (pathname === "/auth/sign-in" || pathname.startsWith("/auth/sign-in/"))
    return limiters.signIn;
  if (pathname === "/auth/sign-up" || pathname.startsWith("/auth/sign-up/"))
    return limiters.signUp;
  if (pathname.startsWith("/auth/callback")) return limiters.authCallback;
  if (pathname.startsWith("/auth/guest")) return limiters.guest;
  if (pathname.startsWith("/auth/reset-password"))
    return limiters.passwordReset;
  if (pathname.startsWith("/api/")) return limiters.api;
  return null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // ── Rate limiting ────────────────────────────────────────────────
  const limiterFactory = getLimiterForPath(pathname);
  if (limiterFactory) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const result = await checkRateLimit(limiterFactory(), ip);
    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((result.reset - Date.now()) / 1000)
            ),
          },
        }
      );
    }
  }

  // ── Guest mode: signed JWT verification ──────────────────────────
  const guestToken = request.cookies.get("guest-token")?.value;
  let isValidGuest = false;
  if (guestToken) {
    const payload = await verifyGuestToken(guestToken);
    isValidGuest = payload !== null;
  }

  // Clear legacy insecure guest cookie if present
  const legacyGuest = request.cookies.get("guest-session")?.value;
  if (legacyGuest) {
    supabaseResponse.cookies.delete("guest-session");
  }

  // ── Supabase session ─────────────────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip auth checks if Supabase isn't configured yet
  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Route protection ─────────────────────────────────────────────
  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/plan-builder") ||
    pathname.startsWith("/goals") ||
    pathname.startsWith("/units") ||
    pathname.startsWith("/calculator") ||
    pathname.startsWith("/points") ||
    pathname.startsWith("/settings");

  // Allow valid guest users through to app routes
  if (isValidGuest && isAppRoute) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users away from app routes
  if (!user && isAppRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/sign-in";
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages and marketing landing
  if (
    user &&
    (pathname.startsWith("/auth/") || pathname === "/")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
