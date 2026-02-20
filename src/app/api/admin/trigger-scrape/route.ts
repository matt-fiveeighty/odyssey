import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/admin/trigger-scrape — Manual scraper trigger.
 *
 * Dispatches the GitHub Actions scraper workflow for all states or a
 * specific subset. Same underlying mechanism as the Vercel cron, but
 * callable on-demand via admin key.
 *
 * Body (optional):
 *   { "states": ["CO", "WY", "MT"] }   — specific states (empty or omitted = all)
 *
 * Auth:
 *   x-admin-key header matching SUPABASE_SERVICE_ROLE_KEY
 *
 * Required env vars:
 *   GITHUB_PAT   — GitHub personal access token (workflow scope)
 *   GITHUB_REPO  — e.g. "user/odyssey-outdoors"
 */
export async function POST(request: NextRequest) {
  // --- Auth ---
  const adminKey = request.headers.get("x-admin-key");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || adminKey !== serviceKey) {
    return NextResponse.json(
      { error: "Unauthorized — invalid admin key" },
      { status: 401 }
    );
  }

  // --- Parse body ---
  let states: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.states)) {
      states = body.states.map((s: string) => s.toUpperCase());
    }
  } catch {
    // No body or invalid JSON — run all states
  }

  // --- Trigger GitHub Actions ---
  const githubPat = process.env.GITHUB_PAT;
  const githubRepo = process.env.GITHUB_REPO;

  if (!githubPat || !githubRepo) {
    return NextResponse.json(
      { error: "Missing GITHUB_PAT or GITHUB_REPO env vars" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${githubRepo}/actions/workflows/scrape-draw-data.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            states: states.join(" "), // empty string = run all
          },
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[trigger-scrape] GitHub API error:", res.status, text);
      return NextResponse.json(
        { error: `GitHub API ${res.status}: ${text}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: states.length > 0
        ? `Scraper triggered for: ${states.join(", ")}`
        : "Scraper triggered for all states",
      states: states.length > 0 ? states : "all",
      triggeredAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[trigger-scrape] Error:", err);
    return NextResponse.json(
      { error: "Failed to trigger scraper workflow" },
      { status: 500 }
    );
  }
}
