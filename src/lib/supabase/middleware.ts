import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Guest mode: cookie-based bypass — no Supabase needed
  const isGuest = request.cookies.get("guest-session")?.value === "true";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip auth checks if Supabase isn't configured yet
  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    url,
    key,
    {
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
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected app routes
  const isAppRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/plan-builder") ||
    request.nextUrl.pathname.startsWith("/goals") ||
    request.nextUrl.pathname.startsWith("/units") ||
    request.nextUrl.pathname.startsWith("/calculator") ||
    request.nextUrl.pathname.startsWith("/points");

  // Allow guest users through to app routes
  if (isGuest && isAppRoute) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users away from app routes
  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages and marketing landing
  if (user && (request.nextUrl.pathname.startsWith("/auth/") || request.nextUrl.pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
