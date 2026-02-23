# Phase 7: Scraper Enrichment & Data Freshness - Research

**Researched:** 2026-02-22
**Domain:** Web scraping, HTML/PDF parsing, data provenance, change detection
**Confidence:** MEDIUM-HIGH

## Summary

Phase 7 enhances the existing scraper infrastructure to capture richer data (deadlines, fees, seasons, leftover tags) and surfaces data provenance to users via a FreshnessBadge component. The codebase already has a solid foundation: a `BaseScraper` abstract class with CSV parsing, 15 state scrapers with optional method stubs for deadlines/fees/seasons/regulations/leftover tags, Zod validation schemas, a three-tier data-loader (Supabase > Redis > constants), and a `VerifiedDatum<T>` provenance wrapper with factory functions. The `DataSourceBadge` component already shows freshness dots (green/amber/red) and agency attribution.

The primary work is: (1) adding cheerio-based HTML parsing and pdf-parse-based PDF extraction to `BaseScraper`, (2) fully implementing the optional scraping methods for Oregon (CSV) and Utah (REST/HTML), (3) building structural fingerprinting to detect when state websites change format, (4) hardening schema validation to reject implausible values without overwriting good data, and (5) creating a `FreshnessBadge` component that surfaces `VerifiedDatum` provenance metadata with tooltips.

**Primary recommendation:** Use cheerio 1.x for HTML table parsing (already the standard for Node.js scraping), pdf-parse 2.x for PDF text extraction (with awareness of its table-structure limitations), and build a lightweight structural fingerprint system using CSS selector hashing rather than full DOM diffing.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cheerio | ^1.2.0 | Server-side HTML parsing with jQuery-like API | 19,000+ npm dependents, wraps parse5, blazing fast, no browser runtime needed |
| pdf-parse | ^2.4.5 | PDF text extraction for draw reports | Pure TypeScript, zero native deps, works in serverless, supports Node 20-24 |
| zod | ^4.3.6 | Schema validation for scraped data | Already in project, used in `scripts/scrapers/schemas.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdf.js-extract | ^0.2.1 | PDF extraction with x,y coordinates | Fallback if pdf-parse table extraction is insufficient for draw report PDFs |
| crypto (built-in) | Node.js | SHA-256 hashing for structural fingerprints | No extra dependency needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cheerio | htmlparser2 (raw) | Lower-level, no jQuery API; cheerio wraps htmlparser2 internally anyway |
| cheerio | jsdom | Full DOM simulation is overkill for scraping; 10x heavier than cheerio |
| pdf-parse | pdfreader | Better table reconstruction via x,y position grouping, but more complex API and heavier dependency |
| pdf-parse | pdf.js-extract | Provides x,y coordinates for table reconstruction but last published 3 years ago |

**Installation:**
```bash
npm install cheerio pdf-parse
npm install -D @types/cheerio  # if needed; cheerio 1.x has built-in types
```

## Architecture Patterns

### Recommended Project Structure
```
scripts/scrapers/
  base-scraper.ts          # Enhanced: +parseHtml(), +parsePdf(), +fingerprint()
  schemas.ts               # Enhanced: +plausibility guards, +fingerprint schema
  run-all.ts               # Unchanged
  co-draw-data.ts          # Enhanced: implement deadlines/fees/seasons
  or-draw-data.ts          # Enhanced: full CSV+HTML implementation (proof of concept)
  ut-draw-data.ts          # Enhanced: full REST+HTML implementation (proof of concept)
  ...other states...

src/lib/engine/
  verified-datum.ts         # Unchanged (already complete)

src/lib/scrapers/
  fingerprint.ts            # NEW: structural fingerprint storage + comparison
  plausibility.ts           # NEW: domain-specific validation rules

src/components/shared/
  DataSourceBadge.tsx       # EXISTS: already shows freshness dots
  FreshnessBadge.tsx        # NEW: VerifiedDatum-aware badge with provenance tooltip
```

### Pattern 1: Cheerio HTML Table Extraction in BaseScraper
**What:** Add `parseHtml()` helper to BaseScraper that wraps cheerio for table extraction
**When to use:** Any state website that publishes data in HTML tables (most states)
**Example:**
```typescript
// In base-scraper.ts
import * as cheerio from "cheerio";

protected parseHtml(html: string): cheerio.CheerioAPI {
  return cheerio.load(html);
}

protected extractTable(html: string, tableSelector: string): Record<string, string>[] {
  const $ = this.parseHtml(html);
  const rows: Record<string, string>[] = [];
  const headers: string[] = [];

  $(tableSelector).find("th").each((_, el) => {
    headers.push($(el).text().trim().toLowerCase());
  });

  $(tableSelector).find("tbody tr").each((_, tr) => {
    const row: Record<string, string> = {};
    $(tr).find("td").each((i, td) => {
      if (headers[i]) row[headers[i]] = $(td).text().trim();
    });
    if (Object.keys(row).length > 0) rows.push(row);
  });

  return rows;
}
```

### Pattern 2: PDF Text Extraction with pdf-parse
**What:** Add `fetchPdf()` / `parsePdfBuffer()` to BaseScraper for binary PDF handling
**When to use:** AZ, WY, CO draw reports published as PDFs
**Example:**
```typescript
// In base-scraper.ts
import pdfParse from "pdf-parse";

protected async fetchPdfBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": "HuntPlannerBot/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

protected async parsePdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

// For table-like data, split by lines and use heuristic column detection
protected parsePdfTableLines(text: string): string[][] {
  return text.split("\n")
    .filter(line => line.trim().length > 0)
    .map(line => line.split(/\s{2,}/).map(s => s.trim()));
}
```

### Pattern 3: Structural Fingerprinting
**What:** Hash the CSS selector paths of key data elements on a state page; compare to last-known fingerprint
**When to use:** Every scrape run, to detect when a state website has changed layout
**Example:**
```typescript
import { createHash } from "crypto";

interface StructuralFingerprint {
  stateId: string;
  url: string;
  selectorHash: string;        // SHA-256 of sorted selector paths
  tableSelectorPaths: string[]; // e.g. ["body > div.content > table.draw-data"]
  scrapedAt: string;
}

function computeFingerprint(html: string, url: string, stateId: string): StructuralFingerprint {
  const $ = cheerio.load(html);
  const paths: string[] = [];

  // Fingerprint key structural elements
  $("table").each((_, el) => {
    const path = getElementPath($, el);
    paths.push(path);
  });
  $("form").each((_, el) => paths.push(getElementPath($, el)));

  paths.sort();
  const hash = createHash("sha256").update(paths.join("|")).digest("hex");

  return { stateId, url, selectorHash: hash, tableSelectorPaths: paths, scrapedAt: new Date().toISOString() };
}
```

### Pattern 4: VerifiedDatum Wrapping at Scraper Output
**What:** Scrapers wrap their outputs in VerifiedDatum before returning to the orchestrator
**When to use:** All scraper outputs that will be displayed in the UI
**Example:**
```typescript
import { verified, type VerifiedDatum } from "@/lib/engine/verified-datum";

// In a state scraper's scrapeDeadlines():
const deadline = verified(
  { speciesId: "elk", type: "application_close", date: "2026-04-07" },
  "https://cpw.state.co.us/hunting/big-game/elk",
  new Date().toISOString(),
  "CPW Big Game Draw"
);
```

### Pattern 5: Schema Validation with Plausibility Guards
**What:** Extend Zod schemas with domain-specific plausibility rules
**When to use:** Before any scraped data is written to the database
**Example:**
```typescript
// Plausibility refinements on top of existing schemas
const PlausibleFeeSchema = ScrapedFeeSchema.refine(
  (fee) => fee.amount > 0 && fee.amount < 10000,
  { message: "Fee amount outside plausible range ($0-$10,000)" }
).refine(
  (fee) => !(fee.amount === 0 && fee.feeName.toLowerCase().includes("tag")),
  { message: "Tag cost of $0 is implausible" }
);

const PlausibleDeadlineSchema = ScrapedDeadlineSchema.refine(
  (dl) => {
    const year = new Date(dl.date).getFullYear();
    return year >= 2024 && year <= 2030;
  },
  { message: "Deadline date outside plausible range (2024-2030)" }
);
```

### Anti-Patterns to Avoid
- **Regex-only HTML parsing:** The existing scrapers use regex for HTML table extraction (e.g., `/<table[\s\S]*?<\/table>/gi`). Replace with cheerio for reliability. Regex breaks on nested tables, malformed HTML, and attribute-containing tags.
- **Overwriting good data with failed scrapes:** If a scraper returns 0 rows for deadlines but previous scrape returned 15, that is likely a scraper failure, not "no deadlines." Never delete existing rows when new scrape returns empty.
- **Silent failure on PDF structure changes:** PDFs change format annually. If pdf-parse returns empty/garbage text, log the failure and keep existing data rather than writing empty rows.
- **Hardcoded column indices:** State CSVs change column order. Always match by header name, never by column index.
- **Unbounded retry on state servers:** The existing 3-retry with exponential backoff is good. Do not increase retries -- state servers may rate-limit.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML parsing | Regex-based table extraction | cheerio | Handles malformed HTML, nested elements, encoding issues |
| PDF text extraction | Custom PDF binary parser | pdf-parse | PDF format is complex; 14 object types, compression, fonts |
| CSV parsing | Custom CSV parser | Existing `parseCsvText()` in BaseScraper | Already handles quoted fields with commas and newlines |
| Schema validation | Manual if/else checks | Zod schemas (already in schemas.ts) | Composable, type-safe, good error messages |
| Hash computation | Manual string comparison for fingerprints | Node.js crypto.createHash | Consistent, fast, collision-resistant |

**Key insight:** The existing scraper infrastructure is well-designed. The enhancement is about adding parsing capabilities and safety guards, not rebuilding the architecture.

## Common Pitfalls

### Pitfall 1: pdf-parse Does Not Preserve Table Structure
**What goes wrong:** pdf-parse extracts text as a flat string. A table that visually shows "Unit 11 | Elk | 250 applicants | 50 tags" comes out as "Unit 11 Elk 250 applicants 50 tags" with no column delimiters.
**Why it happens:** PDFs don't have a "table" concept -- they position text at x,y coordinates. pdf-parse joins text in reading order.
**How to avoid:** For structured tabular PDFs (AZ/WY/CO draw reports), use line-based heuristic parsing: split text by newlines, then split each line by 2+ whitespace characters. Validate with known header patterns. If quality is insufficient, fall back to pdf.js-extract which provides x,y coordinates for positional table reconstruction.
**Warning signs:** Scraper returns 0 rows from a PDF that definitely has data, or values are scrambled between columns.

### Pitfall 2: State Website Redesigns Breaking Scrapers Silently
**What goes wrong:** A state agency redesigns their website. The scraper still runs without errors but returns 0 rows or garbage data because selectors no longer match.
**Why it happens:** HTML scraping is inherently fragile. Selectors break on class name changes, DOM restructuring, or SPA migrations.
**How to avoid:** Structural fingerprinting detects DOM changes. Additionally, implement "row count sanity checks" -- if a scraper that previously returned 200 rows now returns 0, flag it as "structure changed" instead of writing empty data.
**Warning signs:** Row count drops >80% between consecutive scrapes.

### Pitfall 3: Overwriting Good Data with Bad Scrapes
**What goes wrong:** A transient network error or website maintenance causes a scraper to return 0 results. The upsert logic overwrites existing good data with nothing.
**Why it happens:** The current `run()` method in BaseScraper upserts whatever the scraper returns without comparing to existing data.
**How to avoid:** Add a "never overwrite good data" guard: before upserting, check existing row count. If new scrape returns significantly fewer rows (>50% drop), log a warning and skip the upsert. Store the failed scrape separately for debugging.
**Warning signs:** Dashboard shows data gaps for states that had data last week.

### Pitfall 4: Plausibility Failures Letting Bad Data Through
**What goes wrong:** A scraper misparses a fee page and returns a tag cost of $0, or a deadline year of 1970. This bad data flows through to the UI.
**Why it happens:** Existing Zod schemas validate types but not domain plausibility. A `number` passes Zod validation even if it's 0 when it should be $500.
**How to avoid:** Add plausibility refinements to Zod schemas: fees must be > $0 and < $10,000; dates must be between 2024-2030; success rates between 0-100%. Reject implausible values and log them, but never block the rest of the scrape.
**Warning signs:** Fee of $0 shows up in the cost calculator, or a 1970 deadline appears on the calendar.

### Pitfall 5: Cheerio Memory Usage on Large Pages
**What goes wrong:** Some state websites have very large HTML pages (multiple MB). Loading entire pages into cheerio can spike memory in the GitHub Actions runner.
**Why it happens:** cheerio builds a full in-memory DOM tree.
**How to avoid:** For very large pages, use htmlparser2's streaming mode (cheerio supports this via `cheerio.load(html, { xmlMode: false })` options). In practice, state F&G pages are typically < 500KB so this is unlikely to be an issue, but set a 5MB guard on `fetchPage()` response size.
**Warning signs:** GitHub Actions runner OOM-kills the scraper process.

### Pitfall 6: FreshnessBadge Flicker on Client Hydration
**What goes wrong:** The FreshnessBadge shows "Verified" on server render, then flashes to "Stale" on client hydration because the client clock differs from the server.
**Why it happens:** Staleness computation uses `Date.now()`. Server time and client time may differ.
**How to avoid:** Mark FreshnessBadge as `"use client"` (already the pattern for DataSourceBadge) and compute freshness purely on the client side. Or use relative timestamps ("3 days ago") instead of absolute threshold comparisons.
**Warning signs:** Badge flashes between states on page load.

## Code Examples

### Cheerio Table Extraction
```typescript
import * as cheerio from "cheerio";

// Load HTML and extract first data table
const $ = cheerio.load(html);
const headers: string[] = [];
const rows: Record<string, string>[] = [];

// Get headers from first <thead> or first row of <th>
$("table.draw-data thead th, table.draw-data tr:first-child th").each((_, el) => {
  headers.push($(el).text().trim().toLowerCase());
});

// Get data rows
$("table.draw-data tbody tr").each((_, tr) => {
  const row: Record<string, string> = {};
  $(tr).find("td").each((i, td) => {
    if (headers[i]) {
      row[headers[i]] = $(td).text().trim();
    }
  });
  if (Object.keys(row).length > 0) rows.push(row);
});
```

### PDF Binary Fetch + Text Extraction
```typescript
import pdfParse from "pdf-parse";

// Fetch PDF as binary buffer (not text!)
const res = await fetch(url, {
  headers: { "User-Agent": "HuntPlannerBot/1.0", Accept: "application/pdf" },
});
const buffer = Buffer.from(await res.arrayBuffer());

// Extract text
const data = await pdfParse(buffer);
// data.text: full text content
// data.numpages: page count
// data.info: PDF metadata

// Parse table-like content via line splitting
const lines = data.text.split("\n").filter(l => l.trim());
for (const line of lines) {
  const columns = line.split(/\s{2,}/); // 2+ spaces = column separator
  // columns[0] = unit code, columns[1] = species, etc.
}
```

### Structural Fingerprint Computation
```typescript
import * as cheerio from "cheerio";
import { createHash } from "crypto";

function fingerprint(html: string): string {
  const $ = cheerio.load(html);

  // Collect structural "skeleton" -- tag names and classes at depth 3
  const skeleton: string[] = [];
  $("body *").each((_, el) => {
    const tag = $(el).prop("tagName")?.toLowerCase();
    const classes = $(el).attr("class")?.split(/\s+/).sort().join(".") || "";
    const depth = $(el).parents().length;
    if (depth <= 5 && tag) {
      skeleton.push(`${depth}:${tag}${classes ? "." + classes : ""}`);
    }
  });

  return createHash("sha256").update(skeleton.join("|")).digest("hex").slice(0, 16);
}
```

### FreshnessBadge with VerifiedDatum
```typescript
"use client";
import type { VerifiedDatum, DataConfidence } from "@/lib/engine/verified-datum";

interface FreshnessBadgeProps {
  datum: VerifiedDatum<unknown>;
  className?: string;
}

const CONFIDENCE_COLORS: Record<DataConfidence, string> = {
  verified: "bg-emerald-500",
  user_reported: "bg-blue-500",
  estimated: "bg-amber-500",
  stale: "bg-red-500",
};

const CONFIDENCE_LABELS: Record<DataConfidence, string> = {
  verified: "Verified",
  user_reported: "User Reported",
  estimated: "Estimated",
  stale: "Stale",
};

export function FreshnessBadge({ datum, className = "" }: FreshnessBadgeProps) {
  const effective = datum.isStale ? "stale" : datum.confidence;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_COLORS[effective]}`} />
      <span className="text-[9px] text-muted-foreground/60">
        {CONFIDENCE_LABELS[effective]}
      </span>
      {/* Tooltip trigger for provenance details */}
    </span>
  );
}
```

### Plausibility Guard (Never Overwrite Good Data)
```typescript
// In base-scraper.ts run() method, before upserting deadlines:
if (deadlines.length === 0) {
  // Check if we had data before
  const { count } = await this.supabase
    .from("scraped_deadlines")
    .select("*", { count: "exact", head: true })
    .eq("state_id", this.stateId);

  if (count && count > 0) {
    this.log(`  WARNING: Scraper returned 0 deadlines but DB has ${count}. Skipping upsert to protect existing data.`);
    errors.push(`deadlines: 0 scraped vs ${count} existing -- skipped to protect data`);
    // Skip the upsert
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Regex HTML parsing | cheerio (jQuery-like DOM API) | cheerio 1.0 stable 2023 | Reliable table extraction, handles malformed HTML |
| pdf-parse v1 (text only) | pdf-parse v2.4 (text + basic tables) | 2024-2025 | getTable() method added, but still limited for complex tables |
| Manual staleness checks | VerifiedDatum provenance wrapping | Already built (Phase 1) | Systematic confidence + staleness tracking |
| No change detection | Structural fingerprinting | Phase 7 (new) | Proactive detection of website redesigns |

**Deprecated/outdated:**
- **request + cheerio pattern:** The `request` npm package is deprecated. Use native `fetch()` (already the pattern in BaseScraper).
- **pdf2table:** Abandoned, last updated 2018. Use pdf-parse v2 instead.

## Existing Codebase Analysis

### What Already Exists (DO NOT rebuild)
1. **BaseScraper** (`scripts/scrapers/base-scraper.ts`): Abstract class with `fetchPage()`, `fetchCsv()`, `parseCsvText()`, `parseCsvRow()`, `syncFeesToRefStates()`, `run()` orchestrator, and 7 abstract/optional methods.
2. **15 state scrapers**: All extend BaseScraper. Most implement `scrapeUnits()` + `scrapeDrawHistory()`. OR and UT already have partial implementations of deadlines/fees/seasons/regulations/leftover tags.
3. **Zod schemas** (`scripts/scrapers/schemas.ts`): `ScrapedUnitSchema`, `ScrapedDrawHistorySchema`, `ScrapedDeadlineSchema`, `ScrapedFeeSchema`, `ScrapedSeasonSchema`, `ScrapedRegulationSchema`, `ScrapedLeftoverTagSchema` + `validateBatch()` helper.
4. **VerifiedDatum** (`src/lib/engine/verified-datum.ts`): `verified()`, `estimated()`, `userReported()`, `unwrap()`, `verifyBatch()`, `deriveConfidence()`, `STALE_THRESHOLDS`, `CONFIDENCE_ORDER`.
5. **DataSourceBadge** (`src/components/shared/DataSourceBadge.tsx`): Already shows freshness dots (green/amber/red), agency name, scrape date, "Verify" link to F&G. Has `DataSourceInline` compact variant.
6. **Data loader** (`src/lib/engine/data-loader.ts`): Three-tier resolution (Supabase > Redis > constants). Already merges scraped deadlines into state constants. Has `getDataStatus()` for staleness indicators.
7. **Redis cache** (`src/lib/redis.ts`): `cacheGet()`, `cacheSet()`, `cacheDel()`, `CACHE_TTLS` with graceful degradation.
8. **Supabase tables**: `scraped_deadlines`, `scraped_fees`, `scraped_seasons`, `scraped_regulations`, `scraped_leftover_tags` all exist with proper indexes and unique constraints.
9. **GitHub Actions workflow** (`.github/workflows/scrape-draw-data.yml`): Weekly cron, manual dispatch, artifact upload, auto-issue on failure.

### What Needs Enhancement
1. **BaseScraper**: Add `parseHtml()` (cheerio), `fetchPdfBuffer()` + `parsePdfText()` (pdf-parse), `computeFingerprint()` (structural change detection).
2. **OR scraper**: Currently uses regex for HTML tables. Replace with cheerio. Already has full method implementations but quality is regex-dependent.
3. **UT scraper**: Currently tries to fetch PDFs as text (wrong). Needs binary PDF fetch + pdf-parse extraction. Already has fee/deadline/season stubs.
4. **Schema validation**: Add plausibility refinements (fee ranges, date ranges, row count guards). Currently validates types but not domain semantics.
5. **FreshnessBadge**: New component that takes a `VerifiedDatum` and shows confidence + provenance tooltip. Extends the existing DataSourceBadge pattern.
6. **Data loader**: Currently only merges deadlines from scraped data into state constants. Extend to merge fees and seasons as well.

### Key Integration Points
- Scrapers run in GitHub Actions (`scripts/scrapers/`) -- they write to Supabase
- Data loader (`src/lib/engine/data-loader.ts`) reads from Supabase and falls back to Redis/constants
- UI components read from the engine's DataContext or directly from state constants
- VerifiedDatum wrapping happens at the API boundary (see `/api/flights/quote` and `/api/inflation/cpi` for existing patterns)

## Open Questions

1. **pdf-parse v2 table extraction quality for state draw PDFs**
   - What we know: pdf-parse 2.4 has a `getTable()` method, but documentation is sparse and the prior-decisions note flags this as an unvalidated blocker.
   - What's unclear: Whether AZ/WY/CO draw report PDFs produce usable table data via pdf-parse, or if the column alignment heuristic breaks on multi-page tables.
   - Recommendation: Start with pdf-parse for the OR/UT proof of concept (where primary data is CSV/HTML, not PDF). For PDF-heavy states (AZ, WY, CO), defer to a follow-up task that manually downloads sample PDFs and benchmarks pdf-parse vs pdf.js-extract vs positional heuristics. This derisks Phase 7 by keeping PDF extraction as a non-blocking enhancement.

2. **Fingerprint storage location**
   - What we know: Fingerprints need to persist between scrape runs to detect changes.
   - What's unclear: Whether to store in Supabase (alongside other scraper data) or in Redis (ephemeral but faster).
   - Recommendation: Store in Supabase in a new `scraper_fingerprints` table with columns `(state_id, url, selector_hash, selector_paths, scraped_at)`. This preserves history and allows querying "when did state X's website last change?"

3. **FreshnessBadge vs DataSourceBadge: merge or separate?**
   - What we know: DataSourceBadge already shows freshness dots and agency attribution. FreshnessBadge is specified as a new component showing VerifiedDatum confidence.
   - What's unclear: Whether these should be unified or kept separate for different use cases.
   - Recommendation: Keep both. DataSourceBadge is state-level ("Colorado data last updated Feb 20"). FreshnessBadge is datum-level ("This fee amount is verified, scraped 3 days ago from CPW"). They serve different granularities and can coexist.

4. **Scope of "all active states" for deadline/fee/season scraping**
   - What we know: 11 active states (CO, WY, MT, NV, AZ, UT, NM, OR, ID, KS, AK). Requirements say "all active states" for SCRP-03, 04, 05.
   - What's unclear: Whether "fully implemented" means every state has bespoke scraping logic, or if some states can use hardcoded data with a "last verified" date.
   - Recommendation: Focus OR and UT as the proof-of-concept scrapers with full cheerio/pdf-parse implementation. For other states, enhance the existing stubs with hardcoded structured data (like OR/UT already do for fees) and mark with `source: "manual_verification"`. True automated scraping for all 11 states is a multi-sprint effort.

5. **Scraper output wrapping in VerifiedDatum at what layer?**
   - What we know: Currently scrapers return plain typed objects (ScrapedDeadline, ScrapedFee, etc.) that are written to Supabase. VerifiedDatum wrapping happens at API response time.
   - What's unclear: Should scrapers return VerifiedDatum-wrapped objects, or should wrapping happen when data is read from Supabase?
   - Recommendation: Keep scrapers returning plain objects (they write to DB). Wrap in VerifiedDatum when reading from Supabase or constants in the data-loader layer. This keeps scrapers simple and the provenance layer at the read boundary. The `source_url` and `source_pulled_at` columns in Supabase provide the raw provenance that gets wrapped.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `scripts/scrapers/base-scraper.ts`, `schemas.ts`, `or-draw-data.ts`, `ut-draw-data.ts`, `co-draw-data.ts`, `az-draw-data.ts`
- Codebase analysis: `src/lib/engine/verified-datum.ts`, `src/lib/redis.ts`, `src/lib/engine/data-loader.ts`
- Codebase analysis: `src/components/shared/DataSourceBadge.tsx`
- Codebase analysis: `supabase-scraper-tables.sql`
- [cheerio npm](https://www.npmjs.com/package/cheerio) - v1.2.0, 19k+ dependents
- [cheerio official site](https://cheerio.js.org/) - API documentation, jQuery-like interface

### Secondary (MEDIUM confidence)
- [pdf-parse npm](https://www.npmjs.com/package/pdf-parse) - v2.4.5, pure TypeScript, supports Node 20-24
- [pdf-parse docs](https://mehmet-kozan.github.io/pdf-parse/) - getTable() method documented
- [7 PDF Parsing Libraries for Node.js](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025) - comparison of pdf-parse vs alternatives
- [npm trends: cheerio vs htmlparser2 vs jsdom](https://npmtrends.com/cheerio-vs-htmlparser2-vs-jsdom-vs-linkedom) - download statistics comparison
- [Change detection for web scraping](https://substack.thewebscraping.club/p/change-detection-for-web-scraping) - structural fingerprinting patterns

### Tertiary (LOW confidence)
- [pdf.js-extract](https://www.npmjs.com/package/pdf.js-extract) - v0.2.1, last published 3 years ago, x,y coordinate extraction (may be stale)
- pdf-parse v2 getTable() quality for complex multi-page tables -- unvalidated against actual state draw PDFs (blocker from prior decisions)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - cheerio and pdf-parse are well-established, verified via npm
- Architecture: HIGH - building on existing well-designed BaseScraper + VerifiedDatum patterns
- Pitfalls: MEDIUM-HIGH - common scraping pitfalls are well-documented; PDF table extraction quality is the main uncertainty
- State website structures: MEDIUM - websites change; current URL patterns verified in codebase but may shift

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (30 days - stable domain, libraries unlikely to break)
