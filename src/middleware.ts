import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (svg, png, jpg, etc.)
     * - /api/share (public share link creation)
     * - /shared/ (public shared plan viewing)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/share|shared/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
