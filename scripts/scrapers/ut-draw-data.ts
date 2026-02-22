/**
 * Utah (DWR) Draw Data Scraper
 *
 * Utah Division of Wildlife Resources publishes draw odds as PDF reports
 * and through an interactive draw odds tool.
 *
 * Data sources:
 *   - Draw odds reports (PDF): https://wildlife.utah.gov/bg-odds.html
 *   - Interactive draw odds: https://wildlife.utah.gov/draw-odds.html
 *   - Big game harvest data: https://wildlife.utah.gov/hunting/main-hunting-page/big-game/big-game-harvest-data.html
 *   - PDF patterns: wildlife.utah.gov/pdf/bg/{year}/{yy}_bg-odds.pdf
 *
 * UT draw system:
 *   - Dual system: preference points for general season,
 *     bonus points for limited-entry and once-in-a-lifetime
 *   - Apply per unit
 *   - Moose, goat, bison are OIAL (once-in-a-lifetime)
 *
 * Parsing: All HTML table extraction uses cheerio via BaseScraper.extractTable()
 * and parseHtml(). PDF extraction uses fetchPdfBuffer() + extractPdfText().
 * Zero regex HTML patterns remain.
 */

import {
  BaseScraper,
  ScrapedUnit,
  ScrapedDrawHistory,
  ScrapedDeadline,
  ScrapedFee,
  ScrapedSeason,
  ScrapedRegulation,
  ScrapedLeftoverTag,
} from "./base-scraper";
import {
  validateBatch,
  PlausibleDeadlineSchema,
  PlausibleFeeSchema,
  PlausibleSeasonSchema,
  PlausibleLeftoverTagSchema,
} from "./schemas";
import {
  computeFingerprint,
  compareFingerprint,
  storeFingerprint,
  getLastFingerprint,
} from "../../src/lib/scrapers/fingerprint";

// ---------------------------------------------------------------------------
// URL constants
// ---------------------------------------------------------------------------

const DWR_ODDS_PAGE = "https://wildlife.utah.gov/bg-odds.html";
const DWR_DRAW_ODDS_TOOL = "https://wildlife.utah.gov/draw-odds.html";

/**
 * DWR PDF reports follow a predictable pattern.
 * Key reports: bg-odds (limited entry/OIAL), deer_odds (general), antlerless
 *
 * UPDATE THESE ANNUALLY.
 */
const DWR_PDF_REPORTS: { url: string; label: string; speciesIds: string[] }[] = [
  {
    url: "https://wildlife.utah.gov/pdf/bg/2025/25_bg-odds.pdf",
    label: "2025 LE & OIAL Big Game",
    speciesIds: ["elk", "mule_deer", "moose", "bighorn_sheep", "mountain_goat", "bison", "pronghorn"],
  },
  {
    url: "https://wildlife.utah.gov/pdf/bg/2025/25_deer_odds.pdf",
    label: "2025 General Deer",
    speciesIds: ["mule_deer"],
  },
  {
    url: "https://wildlife.utah.gov/pdf/bg/2025/25_antlerless_drawing_odds_report.pdf",
    label: "2025 Antlerless",
    speciesIds: ["elk", "mule_deer", "pronghorn"],
  },
  {
    url: "https://wildlife.utah.gov/pdf/bg/2024/24_bg-odds.pdf",
    label: "2024 LE & OIAL Big Game",
    speciesIds: ["elk", "mule_deer", "moose", "bighorn_sheep", "mountain_goat", "bison", "pronghorn"],
  },
  {
    url: "https://wildlife.utah.gov/pdf/bg/2024/24_deer_odds.pdf",
    label: "2024 General Deer",
    speciesIds: ["mule_deer"],
  },
];

/** UT species mapping */
const UT_SPECIES: Record<string, string> = {
  elk: "elk",
  deer: "mule_deer",
  "mule deer": "mule_deer",
  moose: "moose",
  pronghorn: "pronghorn",
  antelope: "pronghorn",
  "bighorn sheep": "bighorn_sheep",
  "rocky mountain bighorn": "bighorn_sheep",
  "desert bighorn": "bighorn_sheep",
  sheep: "bighorn_sheep",
  "mountain goat": "mountain_goat",
  goat: "mountain_goat",
  bison: "bison",
  buffalo: "bison",
  "black bear": "black_bear",
  bear: "black_bear",
  cougar: "mountain_lion",
  "mountain lion": "mountain_lion",
};

// ---------------------------------------------------------------------------
// Utah scraper
// ---------------------------------------------------------------------------

export class UtahScraper extends BaseScraper {
  stateId = "UT";
  stateName = "Utah";
  sourceUrl = DWR_ODDS_PAGE;

  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    // Scrape the draw odds page for PDF links and any embedded data
    try {
      this.log("Scraping DWR draw odds page...");
      const html = await this.fetchPage(DWR_ODDS_PAGE);

      // Fingerprint the draw odds page
      const fp = computeFingerprint(html, DWR_ODDS_PAGE, "UT");
      const lastFp = await getLastFingerprint("UT", DWR_ODDS_PAGE, this.supabase);
      const fpResult = compareFingerprint(fp, lastFp);
      if (fpResult.changed) {
        this.log(`  WARNING: Structure change detected on draw odds page: ${fpResult.details}`);
      }
      await storeFingerprint(fp, this.supabase);

      // Extract PDF report links using cheerio
      const pdfLinks = this.extractPdfLinks(html);
      this.log(`  Found ${pdfLinks.length} PDF report links`);

      // Also check for any CSV/data links using cheerio
      const csvLinks = this.extractCsvLinks(html);
      for (const href of csvLinks) {
        try {
          const rows = await this.fetchCsv(href);
          if (rows.length > 1) {
            const headers = rows[0].map((h) => h.toLowerCase().trim());
            for (let i = 1; i < rows.length; i++) {
              const row = this.parseCsvRow(rows[i], headers);
              const unit = row["unit"] || row["hunt unit"] || row["area"] || "";
              const species = (row["species"] || "").toLowerCase();
              const speciesId = this.mapSpecies(species);
              if (unit && speciesId) {
                const key = `${speciesId}:${unit}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  units.push({ stateId: "UT", speciesId, unitCode: unit, unitName: `Unit ${unit}` });
                }
              }
            }
          }
        } catch { /* skip */ }
      }

      // Extract unit numbers from page text
      const unitPattern = /Unit\s+(\d+[A-Z]?)/gi;
      let match: RegExpExecArray | null;
      while ((match = unitPattern.exec(html)) !== null) {
        const code = match[1];
        for (const speciesId of ["elk", "mule_deer", "moose"]) {
          const key = `${speciesId}:${code}`;
          if (!seen.has(key)) {
            seen.add(key);
            units.push({ stateId: "UT", speciesId, unitCode: code, unitName: `Unit ${code}` });
          }
        }
      }
    } catch (err) {
      this.log(`Draw odds page scrape failed: ${(err as Error).message}`);
    }

    // Try the interactive draw odds tool
    try {
      this.log("Checking DWR draw odds tool...");
      const html = await this.fetchPage(DWR_DRAW_ODDS_TOOL);

      // Look for API endpoints or data URLs
      const apiPattern = /(?:url|endpoint|api)\s*[:=]\s*["']([^"']+)["']/gi;
      let match: RegExpExecArray | null;
      while ((match = apiPattern.exec(html)) !== null) {
        this.log(`  Found potential API: ${match[1]}`);
      }
    } catch { /* skip */ }

    this.log(`Extracted ${units.length} UT units`);
    return units;
  }

  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    // Download PDF reports using binary fetch + pdf-parse extraction
    for (const report of DWR_PDF_REPORTS) {
      try {
        this.log(`Fetching ${report.label}: ${report.url}`);
        const buffer = await this.fetchPdfBuffer(report.url);
        const text = await this.extractPdfText(buffer);

        // Parse extracted text for draw data
        const parsed = this.parsePdfDrawData(text, report.speciesIds);
        if (parsed.length > 0) {
          results.push(...parsed);
          this.log(`  Parsed ${parsed.length} rows from ${report.label}`);
        } else {
          this.log(`  No parseable data from ${report.label}`);
        }
      } catch (err) {
        this.log(`  ${report.label} fetch failed: ${(err as Error).message}`);
      }
    }

    // Try scraping the draw odds page for any embedded HTML tables using cheerio
    try {
      this.log("Scraping DWR pages for HTML table data...");
      for (const url of [DWR_ODDS_PAGE, DWR_DRAW_ODDS_TOOL]) {
        const html = await this.fetchPage(url);

        // Fingerprint the page
        const fp = computeFingerprint(html, url, "UT");
        const lastFp = await getLastFingerprint("UT", url, this.supabase);
        const fpResult = compareFingerprint(fp, lastFp);
        if (fpResult.changed) {
          this.log(`  WARNING: Structure change detected: ${fpResult.details}`);
        }
        await storeFingerprint(fp, this.supabase);

        const tableData = this.parseHtmlTables(html);
        results.push(...tableData);
      }
    } catch { /* skip */ }

    // Try to find CSV download links using cheerio
    try {
      const html = await this.fetchPage(DWR_ODDS_PAGE);
      const csvLinks = this.extractCsvLinks(html);

      for (const csvUrl of csvLinks) {
        try {
          const rows = await this.fetchCsv(csvUrl);
          if (rows.length > 1) {
            const headers = rows[0].map((h) => h.toLowerCase().trim());
            for (let i = 1; i < rows.length; i++) {
              const row = this.parseCsvRow(rows[i], headers);
              const parsed = this.parseUtRow(row);
              if (parsed) results.push(parsed);
            }
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }

    this.log(`Total UT draw history rows: ${results.length}`);
    return results;
  }

  // -------------------------------------------------------------------------
  // Internal helpers — all HTML parsing via cheerio (zero regex patterns)
  // -------------------------------------------------------------------------

  /**
   * Extract PDF links from HTML using cheerio.
   * Resolves relative URLs against wildlife.utah.gov.
   */
  private extractPdfLinks(html: string): string[] {
    const $ = this.parseHtml(html);
    const links: string[] = [];

    $('a[href$=".pdf"]').each((_, el) => {
      let href = $(el).attr("href") || "";
      if (!href.startsWith("http")) href = `https://wildlife.utah.gov${href}`;
      links.push(href);
    });

    return links;
  }

  /**
   * Extract CSV links from HTML using cheerio.
   * Resolves relative URLs against wildlife.utah.gov.
   */
  private extractCsvLinks(html: string): string[] {
    const $ = this.parseHtml(html);
    const links: string[] = [];

    $('a[href$=".csv"]').each((_, el) => {
      let href = $(el).attr("href") || "";
      if (!href.startsWith("http")) href = `https://wildlife.utah.gov${href}`;
      links.push(href);
    });

    return links;
  }

  /**
   * Parse PDF text for draw data (renamed from parsePdfText to avoid
   * collision with inherited BaseScraper.extractPdfText).
   */
  private parsePdfDrawData(text: string, speciesIds: string[]): ScrapedDrawHistory[] {
    const results: ScrapedDrawHistory[] = [];
    const lines = text.split("\n");
    const defaultSpecies = speciesIds[0] || "elk";

    // Look for lines with unit numbers and numeric data
    const unitLine = /(?:Unit|Area)\s*(\d+[A-Z]?)/i;

    for (const line of lines) {
      const unitMatch = unitLine.exec(line);
      if (!unitMatch) continue;

      const unitCode = unitMatch[1];
      const nums = line.match(/\d+/g);
      if (!nums || nums.length < 3) continue;

      // Detect species from context
      let speciesId = defaultSpecies;
      const lower = line.toLowerCase();
      for (const [key, id] of Object.entries(UT_SPECIES)) {
        if (lower.includes(key)) { speciesId = id; break; }
      }

      results.push({
        unitId: `UT:${speciesId}:${unitCode}`,
        year: 2025,
        applicants: parseInt(nums[nums.length - 3] || "0", 10),
        tags: parseInt(nums[nums.length - 2] || "0", 10),
        odds: 0,
        minPointsDrawn: null,
      });
    }

    return results;
  }

  /**
   * Parse HTML tables for draw history data using cheerio extractTable().
   * Replaces the old regex-based table parsing.
   */
  private parseHtmlTables(html: string): ScrapedDrawHistory[] {
    const results: ScrapedDrawHistory[] = [];
    const $ = this.parseHtml(html);

    $("table").each((_, tableEl) => {
      const tableHtml = $.html(tableEl);
      const rows = this.extractTable(tableHtml, "table");
      if (rows.length === 0) return;

      // Check that table has enough columns to be useful
      const firstRow = rows[0];
      if (Object.keys(firstRow).length < 3) return;

      for (const row of rows) {
        const parsed = this.parseUtRow(row);
        if (parsed) results.push(parsed);
      }
    });

    return results;
  }

  private parseUtRow(row: Record<string, string>): ScrapedDrawHistory | null {
    const unitCode = row["unit"] || row["hunt unit"] || row["area"] || "";
    if (!unitCode) return null;

    const species = (row["species"] || row["animal"] || "").toLowerCase();
    const speciesId = this.mapSpecies(species);
    if (!speciesId) return null;

    const year = parseInt(row["year"] || "0", 10);
    if (!year || year < 2000) return null;

    const applicants = this.num(row["applicants"] || row["total applicants"]);
    const tags = this.num(row["permits"] || row["tags"] || row["issued"]);

    return {
      unitId: `UT:${speciesId}:${unitCode}`,
      year,
      applicants,
      tags,
      odds: applicants > 0 ? Math.round((tags / applicants) * 10000) / 100 : 0,
      minPointsDrawn: row["min points"] ? parseInt(row["min points"], 10) : null,
    };
  }

  private mapSpecies(name: string): string | null {
    for (const [key, id] of Object.entries(UT_SPECIES)) {
      if (name.includes(key)) return id;
    }
    return null;
  }

  private num(val: string | undefined): number {
    if (!val) return 0;
    return parseInt(val.replace(/,/g, "").replace(/\s/g, ""), 10) || 0;
  }

  // =========================================================================
  // FULL-SPECTRUM DATA: Deadlines, Fees, Seasons, Regulations, Leftovers
  // =========================================================================

  async scrapeDeadlines(): Promise<ScrapedDeadline[]> {
    const deadlines: ScrapedDeadline[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping Utah DWR for application deadlines...");
      const urls = [
        "https://wildlife.utah.gov/hunting/drawing-odds.html",
        "https://wildlife.utah.gov/hunting.html",
        "https://wildlife.utah.gov/guidebooks/big-game.html",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const datePatterns = [
            /(?:application|deadline|opens?|closes?|due|draw\s+results?|bonus\s+point)[^.]*?(\w+\s+\d{1,2},?\s+\d{4})/gi,
            /(\d{1,2}\/\d{1,2}\/\d{4})/g,
          ];

          for (const pattern of datePatterns) {
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(html)) !== null) {
              const context = html.substring(Math.max(0, match.index - 150), match.index + 150)
                .replace(/<[^>]*>/g, " ").toLowerCase();
              const dateStr = match[1];

              let deadlineType = "application_close";
              if (context.includes("open")) deadlineType = "application_open";
              if (context.includes("result")) deadlineType = "draw_results";
              if (context.includes("leftover") || context.includes("remaining")) deadlineType = "leftover";
              if (context.includes("bonus point")) deadlineType = "bonus_point";

              const speciesIds = this.detectSpeciesFromContext(context);
              for (const speciesId of speciesIds) {
                deadlines.push({ stateId: "UT", speciesId, deadlineType, date: dateStr, year, notes: context.trim().substring(0, 200) });
              }
            }
          }
        } catch (err) {
          this.log(`  Deadline page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Deadline scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${deadlines.length} UT deadlines (pre-validation)`);
    return validateBatch(deadlines, PlausibleDeadlineSchema, "UT deadlines", this.log.bind(this));
  }

  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    // -----------------------------------------------------------------
    // 1. Structured / verified fee data (primary source of truth)
    //    Source: wildlife.utah.gov — UT big game fee schedule
    // -----------------------------------------------------------------

    this.log("Emitting structured UT fee data...");

    // License-level fees (no speciesId)
    fees.push(
      { stateId: "UT", feeName: "Nonresident Hunting License", amount: 65, residency: "nonresident", frequency: "annual" },
      { stateId: "UT", feeName: "Application Fee", amount: 10, residency: "both", frequency: "per_species" },
      { stateId: "UT", feeName: "Preference/Bonus Point Fee", amount: 10, residency: "both", frequency: "per_species", notes: "Fee to purchase a preference or bonus point" },
    );

    // Per-species tag costs — nonresident
    const nrTags: [string, string, number][] = [
      ["elk", "Elk Tag", 849],
      ["mule_deer", "Deer Tag", 599],
      ["black_bear", "Black Bear Tag", 600],
      ["moose", "Moose Tag", 3488],
      ["pronghorn", "Pronghorn Tag", 571],
      ["bighorn_sheep", "Bighorn Sheep Tag", 3988],
      ["mountain_goat", "Mountain Goat Tag", 3488],
      ["bison", "Bison Tag", 4840],
      ["mountain_lion", "Mountain Lion Tag", 253],
    ];
    for (const [speciesId, name, amount] of nrTags) {
      fees.push({ stateId: "UT", feeName: `NR ${name}`, amount, residency: "nonresident", speciesId, frequency: "one_time" });
    }

    // Per-species tag costs — resident
    const rTags: [string, string, number][] = [
      ["elk", "Elk Tag", 50],
      ["mule_deer", "Deer Tag", 40],
      ["black_bear", "Black Bear Tag", 83],
      ["moose", "Moose Tag", 408],
      ["pronghorn", "Pronghorn Tag", 50],
      ["bighorn_sheep", "Bighorn Sheep Tag", 508],
      ["mountain_goat", "Mountain Goat Tag", 408],
      ["bison", "Bison Tag", 608],
      ["mountain_lion", "Mountain Lion Tag", 30],
    ];
    for (const [speciesId, name, amount] of rTags) {
      fees.push({ stateId: "UT", feeName: `R ${name}`, amount, residency: "resident", speciesId, frequency: "one_time" });
    }

    this.log(`  Emitted ${fees.length} structured fee entries`);

    // -----------------------------------------------------------------
    // 2. Fallback: scrape the DWR website for any additional / updated fees
    // -----------------------------------------------------------------

    try {
      this.log("Scraping Utah DWR for supplemental fee data...");
      const urls = [
        "https://wildlife.utah.gov/licenses-permits.html",
        "https://wildlife.utah.gov/hunting.html",
      ];

      const seen = new Set<string>(fees.map((f) => `${f.amount}:${f.feeName.substring(0, 30)}`));

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const feePattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:[-–]|for|per)?\s*([^<\n]{5,80})/gi;
          let match: RegExpExecArray | null;

          while ((match = feePattern.exec(html)) !== null) {
            const amount = parseFloat(match[1].replace(/,/g, ""));
            const label = match[2].replace(/<[^>]*>/g, "").trim();

            if (amount > 0 && amount < 10000 && label.length > 3) {
              const key = `${amount}:${label.substring(0, 30)}`;
              if (seen.has(key)) continue;
              seen.add(key);

              const lower = label.toLowerCase();
              const residency = lower.includes("nonresident") || lower.includes("non-resident")
                ? "nonresident" as const
                : lower.includes("resident") ? "resident" as const : "both" as const;

              fees.push({
                stateId: "UT",
                feeName: label.substring(0, 100),
                amount,
                residency,
                speciesId: this.detectSingleSpecies(lower) ?? undefined,
                frequency: lower.includes("per species") ? "per_species"
                  : lower.includes("annual") ? "annual" : "one_time",
                notes: `Scraped from ${url}`,
              });
            }
          }
        } catch (err) {
          this.log(`  Fee page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Supplemental fee scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${fees.length} UT fee entries total (pre-validation)`);
    return validateBatch(fees, PlausibleFeeSchema, "UT fees", this.log.bind(this));
  }

  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping Utah DWR for season dates...");
      const html = await this.fetchPage("https://wildlife.utah.gov/guidebooks/big-game.html");

      const seasonPattern = /(archery|muzzleloader|rifle|general|any\s+legal\s+weapon|any\s+weapon)[^:]*?:\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
      let match: RegExpExecArray | null;

      while ((match = seasonPattern.exec(html)) !== null) {
        const seasonType = match[1].toLowerCase().trim();
        const startDate = match[2];
        const endDate = match[3];
        const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();

        const speciesIds = this.detectSpeciesFromContext(context);
        for (const speciesId of speciesIds) {
          seasons.push({ stateId: "UT", speciesId, seasonType, startDate, endDate, year });
        }
      }
    } catch (err) {
      this.log(`Season scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${seasons.length} UT season entries (pre-validation)`);
    return validateBatch(seasons, PlausibleSeasonSchema, "UT seasons", this.log.bind(this));
  }

  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping Utah DWR for regulation updates...");
      const urls = [
        "https://wildlife.utah.gov/hunting/big-game.html",
        "https://wildlife.utah.gov/hunting.html",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          // Use cheerio for heading/link extraction instead of regex
          const $ = this.parseHtml(html);

          $("h2, h3, h4, a").each((_, el) => {
            const text = $(el).text().trim();
            if (text.length < 10 || text.length > 300) return;

            const lower = text.toLowerCase();
            if (
              lower.includes("regulation") || lower.includes("change") ||
              lower.includes("update") || lower.includes("announcement") ||
              lower.includes("closure") || lower.includes("leftover") ||
              lower.includes("new rule") || lower.includes("draw") ||
              lower.includes("season") || lower.includes("emergency")
            ) {
              let category = "announcement";
              if (lower.includes("regulation") || lower.includes("rule")) category = "rule_change";
              if (lower.includes("closure") || lower.includes("emergency")) category = "emergency_closure";
              if (lower.includes("leftover")) category = "leftover_tags";

              regs.push({
                stateId: "UT",
                title: text.substring(0, 200),
                summary: text,
                sourceUrl: url,
                category,
              });
            }
          });
        } catch (err) {
          this.log(`  Regulation page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Regulation scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${regs.length} UT regulation entries`);
    return regs;
  }

  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking Utah DWR for leftover tag data...");
      const html = await this.fetchPage("https://wildlife.utah.gov/hunting/drawing-odds.html");
      const $ = this.parseHtml(html);

      $("table").each((_, tableEl) => {
        const tableText = $(tableEl).text().toLowerCase();
        if (!tableText.includes("leftover") && !tableText.includes("remaining") && !tableText.includes("available")) return;

        const tableHtml = $.html(tableEl);
        const rows = this.extractTable(tableHtml, "table");

        for (const row of rows) {
          const unitCode = row["unit"] || row["hunt"] || row["area"] || Object.values(row)[0] || "";
          const availableStr = row["available"] || row["remaining"] || row["permits"] || Object.values(row).pop() || "0";
          const available = parseInt(availableStr.replace(/,/g, ""), 10);

          if (unitCode && available > 0) {
            const species = (row["species"] || "").toLowerCase();
            leftovers.push({
              stateId: "UT",
              speciesId: this.detectSingleSpecies(species) || "elk",
              unitCode,
              tagsAvailable: available,
              sourceUrl: "https://wildlife.utah.gov/hunting/drawing-odds.html",
            });
          }
        }
      });
    } catch (err) {
      this.log(`Leftover tag scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${leftovers.length} UT leftover tags (pre-validation)`);
    return validateBatch(leftovers, PlausibleLeftoverTagSchema, "UT leftover tags", this.log.bind(this));
  }

  // -------------------------------------------------------------------------
  // Helper: detect species from surrounding text context
  // -------------------------------------------------------------------------

  private detectSpeciesFromContext(text: string): string[] {
    const species: string[] = [];
    if (text.includes("elk")) species.push("elk");
    if (text.includes("deer") || text.includes("mule")) species.push("mule_deer");
    if (text.includes("pronghorn") || text.includes("antelope")) species.push("pronghorn");
    if (text.includes("moose")) species.push("moose");
    if (text.includes("sheep") || text.includes("bighorn")) species.push("bighorn_sheep");
    if (text.includes("goat")) species.push("mountain_goat");
    if (text.includes("bison") || text.includes("buffalo")) species.push("bison");
    if (text.includes("bear")) species.push("black_bear");
    if (species.length === 0) species.push("elk");
    return species;
  }

  private detectSingleSpecies(text: string): string | null {
    if (text.includes("elk")) return "elk";
    if (text.includes("deer") || text.includes("mule")) return "mule_deer";
    if (text.includes("pronghorn") || text.includes("antelope")) return "pronghorn";
    if (text.includes("moose")) return "moose";
    if (text.includes("sheep")) return "bighorn_sheep";
    if (text.includes("goat")) return "mountain_goat";
    if (text.includes("bison")) return "bison";
    if (text.includes("bear")) return "black_bear";
    return null;
  }
}
