import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/cron/scrape — Vercel Cron backup trigger.
 *
 * Triggers the GitHub Actions scraper workflow via the GitHub API.
 * This is a lightweight edge-compatible endpoint — it doesn't run scrapers
 * inline, just fires a `workflow_dispatch` event.
 *
 * Protected by:
 *   1. Vercel CRON_SECRET (auto-injected by Vercel for cron routes)
 *   2. x-admin-key fallback for manual triggers
 *
 * Required env vars:
 *   CRON_SECRET        — set by Vercel for cron endpoints
 *   GITHUB_PAT         — GitHub personal access token (workflow scope)
 *   GITHUB_REPO        — e.g. "user/odyssey-outdoors"
 */
export async function GET(request: NextRequest) {
  // --- Auth ---
  const cronSecret = process.env.CRON_SECRET;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = request.headers.get("authorization");
  const xAdminKey = request.headers.get("x-admin-key");

  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isAdminKey = adminKey && xAdminKey === adminKey;

  if (!isVercelCron && !isAdminKey) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
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
          inputs: { states: "" }, // empty = run all states
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("GitHub API error:", res.status, text);
      return NextResponse.json(
        { error: `GitHub API ${res.status}: ${text}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Scraper workflow triggered via GitHub Actions",
      triggeredAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron trigger error:", err);
    return NextResponse.json(
      { error: "Failed to trigger scraper workflow" },
      { status: 500 }
    );
  }
}
