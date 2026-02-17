import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// Allowed redirect paths after auth (prevent open redirect attacks)
const ALLOWED_PATHS = ["/dashboard", "/plan-builder", "/goals", "/calculator", "/points", "/units"];

function getSafeRedirect(next: string | null): string {
  if (!next) return "/dashboard";
  // Only allow relative paths that start with / and match known routes
  if (next.startsWith("/") && !next.startsWith("//") && ALLOWED_PATHS.some(p => next.startsWith(p))) {
    return next;
  }
  return "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirect(searchParams.get("next"));

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to sign-in on error
  return NextResponse.redirect(`${origin}/auth/sign-in`);
}
