# Stack Research: Data Pipeline + API Integration Layer

**Domain:** Web scraping pipeline, API integrations, calendar generation, shareable URLs
**Researched:** 2026-02-21
**Confidence:** MEDIUM-HIGH (npm registry verified, existing codebase patterns confirmed; no web search or Context7 available for community sentiment verification)

## Existing Stack (Do Not Change)

These are already in the project and stay as-is. Listed for context so pipeline choices integrate cleanly.

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | App Router, API routes, Vercel cron endpoint |
| TypeScript | ^5 | Type safety everywhere |
| Zod | ^4.3.6 | Schema validation (already used in `schemas.ts` for scrapers) |
| Supabase | ^2.95.3 | Database for scraped data (service-role key for scraper writes) |
| Upstash Redis | ^1.36.2 | Rate limiting (already installed) |
| date-fns | ^4.1.0 | Date manipulation |
| tsx | ^4.19.0 | TypeScript execution for scraper scripts |

## Existing Pipeline Infrastructure (Already Built)

The project already has a substantial scraping system. This research covers what to **add** to it, not replace.

**Already built:**
- `BaseScraper` abstract class with retry logic, CSV parsing, Supabase upserts
- 15 state-specific scrapers (CO, WY, MT, NV, AZ, UT, NM, OR, ID, KS, AK, WA, NE, SD, ND)
- `run-all.ts` orchestrator with sequential execution, 2s polite delay, summary table
- Zod schemas for all scraped data types (`schemas.ts`)
- GitHub Actions weekly cron (`scrape-draw-data.yml` - Sundays 6AM UTC)
- Vercel cron backup trigger (`/api/cron/scrape` -> dispatches GitHub Actions)
- Admin endpoints: `/api/admin/trigger-scrape`, `/api/admin/scraper-status`
- Data import logging to `data_import_log` table
- Fee-to-ref_states sync pipeline

**Gaps this stack research addresses:**
1. PDF parsing (Arizona S3 PDFs, regulation booklets)
2. HTML scraping (state F&G websites with structured HTML tables)
3. Flight pricing API (Amadeus)
4. Inflation data API (BLS)
5. Calendar subscription generation (.ics)
6. Shareable plan URLs (compression + unique tokens)
7. Data provenance tracking (`VerifiedDatum<T>` wrapper)

---

## Recommended Stack Additions

### HTML Scraping

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| cheerio | ^1.2.0 | HTML parsing with jQuery-like API | The standard for server-side HTML parsing in Node. Updated Feb 2026 (actively maintained). Built-in TypeScript types. No browser dependency -- pure HTML parsing. Your existing scrapers use `fetchPage()` + string manipulation; cheerio replaces the manual parsing with `$('table tr td')` selectors. 10x faster than Playwright/Puppeteer for static HTML. |

**Confidence: HIGH** -- verified via npm registry (v1.2.0 published 2026-02-21, `time.modified`). cheerio has been the Node.js HTML parsing standard for 10+ years and shows no signs of being displaced.

**Integration pattern:** Add `cheerio` as a method on `BaseScraper`:

```typescript
import * as cheerio from "cheerio";

// In BaseScraper:
async fetchAndParse(url: string): Promise<cheerio.CheerioAPI> {
  const html = await this.fetchPage(url);
  return cheerio.load(html);
}
```

### PDF Parsing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| pdf-parse | ^2.4.5 | Extract text + table data from state F&G PDFs | Complete rewrite to pure TypeScript in v2 (Oct 2025). Cross-platform. Wraps pdfjs-dist 5.4 internally. Supports text extraction AND tabular data extraction (critical for draw odds PDFs). Description says "extracting text, images, and tabular data." Active development with many v2.x releases. |

**Confidence: MEDIUM** -- version and description verified via npm registry. The v2 rewrite (pure TypeScript, table extraction) is confirmed by npm metadata. However, I could not verify community adoption of v2 vs v1 without web search. The "tabular data" claim in the description needs validation during implementation -- if table extraction proves unreliable, fall back to `pdfjs-dist` directly.

**Why not alternatives:**

| Alternative | Why Not |
|-------------|---------|
| `unpdf` (v1.4.0) | Thinner wrapper. No dependencies listed -- unclear what it wraps. Less adoption signals. pdf-parse v2 has more features (table extraction). |
| `pdfjs-dist` (v5.4.624) | Low-level. pdf-parse wraps it and adds convenience. Only use directly if pdf-parse table extraction fails. |
| `pdf2json` (v4.0.2) | Fork of PDF.JS ported to Node. More complex API. pdf-parse v2 is the simpler path. |
| Playwright PDF rendering | Massive dependency (browser binary). Overkill for text extraction. |

**Integration pattern:** Add `fetchPdf()` to `BaseScraper`:

```typescript
import pdfParse from "pdf-parse";

// In BaseScraper:
async fetchPdf(url: string): Promise<{ text: string; numpages: number }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "HuntPlannerBot/1.0 ..." },
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  return pdfParse(buffer);
}
```

### CSV Parsing (Upgrade)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Built-in `parseCsvText()` | n/a | CSV parsing | **Keep the existing hand-rolled parser in `BaseScraper`.** It handles quoted fields, commas in fields, and CRLF. It works. For the 11 state scrapers processing small CSV files (hundreds of rows, not millions), a dependency like `papaparse` or `csv-parse` adds complexity with no benefit. The existing parser is ~50 lines, well-tested in production, and has zero dependencies. |

**Confidence: HIGH** -- existing code reviewed, works for the use case.

**When to reconsider:** If a state publishes multi-megabyte CSVs (unlikely for draw data), streaming CSV parsing via `csv-parse` (v6.1.0) would be worth adding. Not now.

### Flight Pricing API

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `amadeus` | ^11.0.0 | Amadeus flight search API SDK | Official Node.js SDK. Simple API: `amadeus.shopping.flightOffers.get()`. Free tier: 2,000 calls/month. Only dependency is `qs`. Last published Oct 2024 -- not bleeding edge, but official SDKs don't need frequent updates since they wrap a stable REST API. |

**Confidence: MEDIUM** -- version verified via npm. SDK wraps REST API, so staleness is less concerning. The 2K/month free tier limit is the real constraint -- need aggressive caching (Upstash Redis, already installed).

**Alternative considered:** Raw `fetch()` to Amadeus REST API. The SDK saves OAuth token management boilerplate. Use the SDK.

**Caching strategy (critical for 2K/month limit):**

```typescript
// Cache flight prices in Upstash Redis with 7-day TTL
// Key: `flight:${origin}:${destination}:${month}`
// Value: { price: number, fetchedAt: string, source: "amadeus" }
// 11 states * 12 months * ~3 hub airports = ~396 lookups/year
// Well within 2K/month even with weekly refreshes
```

### Inflation Data API

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Native `fetch()` | n/a | BLS API v2 (public data) | No SDK needed. BLS API is a simple JSON REST endpoint. `fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0")` returns CPI data. Free tier: 500 calls/day (massive headroom). An SDK would be over-engineering for a single endpoint. |

**Confidence: HIGH** -- BLS API is a stable government endpoint. JSON response format. Already confirmed working in project context.

**Integration pattern:**

```typescript
// Fetch latest CPI-U (All Items) annual average
const res = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    seriesid: ["CUUR0000SA0"],
    startyear: "2020",
    endyear: "2026",
    registrationkey: process.env.BLS_API_KEY, // optional but raises limit
  }),
});
```

### Calendar Subscription (.ics)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `ics` | ^3.8.1 | Generate .ics calendar files | The dominant Node.js iCal generator. 779+ stars. Clean API: `createEvents([...])` returns an .ics string. Supports alarms (reminders), recurrence, and all iCalendar spec features needed for deadline calendars. Dependencies: nanoid, runes2, yup (small footprint). Last published Sep 2024. |

**Confidence: MEDIUM** -- version verified. Sep 2024 last publish is fine for a stable library (iCalendar spec doesn't change). The project context already confirmed this library works. LOW risk.

**Integration pattern:**
Serve from a Next.js API route so users get a subscribable calendar URL:

```typescript
// /api/calendar/[planToken]/route.ts
import { createEvents } from "ics";

export async function GET(request, { params }) {
  const events = buildEventsFromPlan(params.planToken);
  const { value } = createEvents(events);

  return new Response(value, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=hunt-plan.ics",
    },
  });
}
```

### Shareable Plan URLs

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `nanoid` | ^5.1.6 | Generate short, URL-safe unique tokens | Already a transitive dependency (via `ics`). 118 bytes. Collision-resistant. `nanoid(12)` gives 12-char tokens like `V1StGXR8_Z5j`. ESM-only in v5 (fine for Next.js 16). |
| `lz-string` | ^1.5.0 | Compress plan state for URL embedding | LZ-based compression for storing plan snapshots in URLs or KV. Compresses JSON to URL-safe strings via `compressToEncodedURIComponent()`. 1.5.0 is the latest (stable, not actively developed -- but compression algorithms don't need updates). |

**Confidence: MEDIUM** -- nanoid verified via npm, well-known library. lz-string is stable but old (Mar 2023 last publish). For the share URL pattern (compress Zustand state -> store in Upstash Redis keyed by nanoid token), both are battle-tested.

**Architecture decision -- two sharing approaches:**

1. **Token-based (recommended):** `nanoid(12)` -> store compressed plan in Upstash Redis -> share URL is `/plan/V1StGXR8_Z5j`. Simple, short URLs, plan data lives in KV with TTL.

2. **URL-embedded (fallback):** `lz-string.compressToEncodedURIComponent(JSON.stringify(plan))` -> entire plan state in URL. No server storage needed. URLs are long but self-contained. Good for no-database constraint.

**Recommendation:** Use approach 1 (token + Upstash Redis) since Redis is already installed. Approach 2 as progressive enhancement for offline/no-KV scenarios.

### Data Provenance Tracking

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript generics | n/a | `VerifiedDatum<T>` wrapper type | No library needed. This is a type-level pattern. Wrap every data point that comes from scraped/API sources with provenance metadata. |

**Confidence: HIGH** -- pure TypeScript pattern, no external dependencies.

```typescript
interface VerifiedDatum<T> {
  value: T;
  source: "scraped" | "api" | "calculated" | "estimated" | "user_reported";
  sourceUrl?: string;
  scrapedAt?: string;        // ISO date
  confidence: "verified" | "estimated" | "stale";
  staleDays?: number;        // days since last verification
}

// Usage:
interface UnitData {
  successRate: VerifiedDatum<number>;
  tagCost: VerifiedDatum<number>;
  drawOdds: VerifiedDatum<number>;
}
```

---

## Scheduling & Cron Infrastructure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel Cron | (built-in) | Weekly scrape trigger | **Already configured** in `vercel.json`. Triggers `/api/cron/scrape` which dispatches GitHub Actions. Keep this pattern. |
| GitHub Actions | (built-in) | Heavy scraper execution | **Already configured** in `scrape-draw-data.yml`. 45-minute timeout. Runs 15 state scrapers sequentially. This is the right pattern -- scrapers are too heavy for Vercel serverless functions (10s hobby / 60s pro timeout). |
| `@upstash/qstash` | ^2.9.0 | Fan-out scheduling for API refresh jobs | Consider for Amadeus/BLS refresh scheduling. QStash can schedule delayed/recurring HTTP calls to your API routes. Already in the Upstash ecosystem (Redis already installed). Good for "refresh flight prices for CO on Monday, WY on Tuesday" fan-out patterns. |

**Confidence: MEDIUM** for QStash recommendation. The existing Vercel Cron + GitHub Actions pattern works. QStash adds value only if you need per-state, per-API granular scheduling (likely in Phase 2 of the pipeline, not Phase 1).

**When you need QStash vs when you don't:**

- **Don't need it for:** Weekly scraping (GitHub Actions handles this), BLS API (one call/week is enough)
- **Need it for:** Staggered Amadeus API calls (spread 2K calls across the month), per-state scrape retries, webhook-style "data changed" notifications

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `tsx` (^4.19.0) | Run TypeScript scraper scripts directly | Already installed. `npx tsx scripts/scrapers/run-all.ts CO` |
| `dotenv` (^16.5.0) | Load env vars for local scraper runs | Already installed. Used via `import "dotenv/config"` in base-scraper |
| Zod (^4.3.6) | Validate scraped data before DB writes | Already installed. Schemas in `schemas.ts`. Extend for new data types. |

---

## Installation

```bash
# New scraping/parsing dependencies
npm install cheerio pdf-parse

# API integrations
npm install amadeus

# Calendar generation (may already be transitively available)
npm install ics

# Shareable URLs
npm install nanoid lz-string

# Type definitions (if needed)
npm install -D @types/lz-string

# Optional: QStash for advanced scheduling (Phase 2)
# npm install @upstash/qstash
```

**Total new dependencies: 5 runtime + 1 dev type definition**

---

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| HTML parsing | cheerio | Playwright | Only if a state website requires JavaScript rendering (SPA). None of the 15 current states need this. Add Playwright only for that specific state. |
| HTML parsing | cheerio | jsdom | If you need a full DOM (document.querySelector, DOM mutation). Heavier than cheerio. Unnecessary for table scraping. |
| PDF parsing | pdf-parse v2 | pdfjs-dist directly | If pdf-parse v2's table extraction proves unreliable for a specific state's PDFs. pdfjs-dist gives lower-level control. |
| PDF parsing | pdf-parse v2 | Playwright PDF render | If a state publishes "PDFs" that are actually rendered web pages. Extremely unlikely. |
| CSV parsing | Built-in parser | papaparse / csv-parse | If a state publishes multi-MB CSV files requiring streaming. Oregon's CSV is small. Keep the hand-rolled parser. |
| Flight API | amadeus SDK | Raw fetch | If the SDK proves too stale or has breaking issues. The REST API is well-documented for manual integration. |
| Calendar | ics | ical-generator | If `ics` package proves limiting for subscription-based calendars. `ical-generator` is an alternative but `ics` is simpler. |
| Share tokens | nanoid | sqids / cuid | nanoid is simpler, already a transitive dep. sqids encodes numbers (not our use case). cuid is heavier. |
| Compression | lz-string | pako / fflate | If you need gzip compatibility. lz-string's `compressToEncodedURIComponent` is purpose-built for URL embedding. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Puppeteer / Playwright for scraping | 300MB+ browser binary. Overkill for static HTML. Slow. Expensive on CI. None of the 15 states require JS rendering. | cheerio for HTML parsing |
| `pdf-parse` v1.x (1.1.1) | Abandoned original. v2 is a complete TypeScript rewrite with table extraction. The old v1 wraps an ancient pdfjs-dist. | pdf-parse ^2.4.5 |
| `pdf-lib` | For **creating** PDFs, not parsing them. Wrong tool. | pdf-parse for reading |
| `node-cron` | In-process cron scheduler. Pointless on Vercel (functions are ephemeral). You already have Vercel Cron + GitHub Actions. | Vercel Cron + GitHub Actions |
| `axios` | `fetch()` is native in Node 18+/Next.js 16. Axios adds 15KB for zero benefit. Your existing `fetchPage()` already uses native fetch with retry logic. | Native `fetch()` |
| `bull` / `bullmq` | Redis-backed job queue. Requires a persistent Node.js process. Incompatible with Vercel serverless. | GitHub Actions for heavy jobs, QStash for fan-out |
| `selenium-webdriver` | Java-era browser automation. Inferior to Playwright in every way. Never use in a Node.js project. | Playwright (if ever needed) |
| Full database (Postgres) | Project constraint: no database migration this milestone. Supabase is already the scraper target. Plan state stays in Zustand + Redis. | Upstash Redis for KV, Zustand for client state |

---

## Stack Integration Patterns

### How Scraping Fits Into Next.js App Router

```
Vercel Cron (weekly)
    |
    v
/api/cron/scrape (lightweight API route)
    |
    v
GitHub Actions workflow_dispatch
    |
    v
scripts/scrapers/run-all.ts (heavy lifting, 45min timeout)
    |
    +-- BaseScraper.fetchPage() -> cheerio.load() -> parse HTML tables
    +-- BaseScraper.fetchPdf() -> pdf-parse -> extract text/tables
    +-- BaseScraper.fetchCsv() -> built-in parser -> structured data
    |
    v
Supabase upsert (ref_units, ref_unit_draw_history, scraped_fees, etc.)
```

### How API Integrations Fit Into Next.js App Router

```
API Routes (on-demand, cached):
    /api/flights/[origin]/[destination]  -> Amadeus SDK -> Redis cache (7d TTL)
    /api/inflation                       -> BLS API     -> Redis cache (30d TTL)

API Routes (subscription endpoints):
    /api/calendar/[planToken]            -> ics package  -> .ics file response
    /api/plan/[shareToken]               -> Redis lookup -> plan JSON

Cron-triggered refresh (monthly):
    /api/cron/refresh-flights            -> batch Amadeus calls -> Redis
    /api/cron/refresh-inflation          -> BLS CPI call       -> Redis
```

### How Shareable URLs Work Without a Database

```
User clicks "Share Plan":
    1. Serialize Zustand state to JSON
    2. Compress with lz-string
    3. Generate nanoid(12) token
    4. Store in Upstash Redis: SET plan:{token} {compressed} EX 2592000 (30d)
    5. Return URL: /plan/{token}

Recipient visits /plan/{token}:
    1. API route reads from Redis
    2. Decompress with lz-string
    3. Hydrate read-only plan view
    4. No auth needed -- token IS the auth
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| cheerio@1.2.0 | Node 18+, Next.js 16 | ESM and CJS exports. No compatibility issues. |
| pdf-parse@2.4.5 | Node 18+ | Depends on pdfjs-dist@5.4.296. May need `--experimental-vm-modules` flag in some Node configs. Test in GitHub Actions (Node 20). |
| amadeus@11.0.0 | Node 14+ | Depends only on `qs`. No compatibility concerns. |
| ics@3.8.1 | Node 16+ | Depends on nanoid@3 (not v5). If you also install nanoid@5 separately, npm will handle the dual versions. |
| nanoid@5.1.6 | Node 18+, ESM only | ESM-only in v5. Next.js 16 handles ESM natively. No issues. |
| lz-string@1.5.0 | Universal | Pure JavaScript. No compatibility concerns. |

---

## Sources

- npm registry (`npm view [package]`) -- all version numbers, publish dates, and dependency trees verified directly
- Existing codebase: `scripts/scrapers/base-scraper.ts`, `run-all.ts`, `schemas.ts`, `vercel.json`, `.github/workflows/scrape-draw-data.yml`
- Existing API routes: `/api/cron/scrape/route.ts`, `/api/admin/trigger-scrape/route.ts`, `/api/admin/scraper-status/route.ts`
- `.planning/PROJECT.md` -- project constraints and data landscape

**Verification gaps (flagged for later validation):**
- pdf-parse v2 table extraction quality -- needs hands-on testing with actual Arizona draw PDFs (LOW confidence on table parsing specifically)
- Amadeus SDK v11 compatibility with Next.js 16 server components -- likely fine but unverified
- cheerio v1.2.0 was published today (2026-02-21) -- this is either a coincidence or npm registry cache; verify the actual release is stable before adoption

---
*Stack research for: Hunt Planner Data Pipeline + API Integration Layer*
*Researched: 2026-02-21*
