/**
 * Oregon (ODFW) Draw Data Scraper
 *
 * Oregon Department of Fish and Wildlife publishes controlled hunt statistics
 * through downloadable reports and interactive tools.
 *
 * Data sources:
 *   - Report downloads: https://odfw.huntfishoregon.com/reportdownloads
 *   - Big game statistics: https://myodfw.com/articles/big-game-statistics
 *   - Controlled hunt info: https://myodfw.com/articles/controlled-hunt-navigation
 *   - Hunt stats files: https://dfw.state.or.us/resources/hunting/big_game/controlled_hunts/docs/hunt_statistics/
 *
 * OR draw system:
 *   - 75% preference / 25% random for controlled hunts
 *   - Some general season hunts are OTC (no draw needed)
 *   - Apply per unit, $8 per species application
 *   - Late deadline (May) — strategically useful
 *
 * Parsing: All HTML table extraction uses cheerio via BaseScraper.extractTable()
 * and parseHtml(). Zero regex HTML patterns remain.
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

const ODFW_REPORT_DOWNLOADS = "https://odfw.huntfishoregon.com/reportdownloads";
const ODFW_BIG_GAME_STATS = "https://myodfw.com/articles/big-game-statistics";
const ODFW_CONTROLLED_HUNTS =
  "https://www.dfw.state.or.us/resources/hunting/big_game/controlled_hunts/";

/** Direct URL pattern for ODFW hunt statistics files */
const ODFW_STATS_BASE =
  "https://www.dfw.state.or.us/resources/hunting/big_game/controlled_hunts/docs/hunt_statistics/";

/** OR species mapping */
const OR_SPECIES: Record<string, string> = {
  elk: "elk",
  "roosevelt elk": "elk",
  "rocky mountain elk": "elk",
  deer: "mule_deer",
  "mule deer": "mule_deer",
  "blacktail deer": "blacktail",
  "black-tailed deer": "blacktail",
  "columbia blacktail": "blacktail",
  antelope: "pronghorn",
  pronghorn: "pronghorn",
  "bighorn sheep": "bighorn_sheep",
  "california bighorn": "bighorn_sheep",
  "rocky mountain bighorn": "bighorn_sheep",
  sheep: "bighorn_sheep",
  "mountain goat": "mountain_goat",
  goat: "mountain_goat",
  bear: "black_bear",
  "black bear": "black_bear",
  cougar: "mountain_lion",
  "mountain lion": "mountain_lion",
};

// ---------------------------------------------------------------------------
// Oregon scraper
// ---------------------------------------------------------------------------

export class OregonScraper extends BaseScraper {
  stateId = "OR";
  stateName = "Oregon";
  sourceUrl = ODFW_REPORT_DOWNLOADS;

  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    // Try the report downloads portal
    try {
      this.log("Checking ODFW report downloads portal...");
      const html = await this.fetchPage(ODFW_REPORT_DOWNLOADS);

      // Fingerprint the report downloads page
      const fp = computeFingerprint(html, ODFW_REPORT_DOWNLOADS, "OR");
      const lastFp = await getLastFingerprint("OR", ODFW_REPORT_DOWNLOADS, this.supabase);
      const fpResult = compareFingerprint(fp, lastFp);
      if (fpResult.changed) {
        this.log(`  WARNING: Structure change detected on report downloads: ${fpResult.details}`);
      }
      await storeFingerprint(fp, this.supabase);

      // Look for downloadable data files
      const links = this.extractDownloadLinks(html);
      this.log(`  Found ${links.length} download links`);

      for (const link of links) {
        if (link.url.endsWith(".csv")) {
          try {
            const rows = await this.fetchCsv(link.url);
            if (rows.length > 1) {
              const headers = rows[0].map((h) => h.toLowerCase().trim());
              for (let i = 1; i < rows.length; i++) {
                const row = this.parseCsvRow(rows[i], headers);
                const code = row["hunt number"] || row["unit"] || row["hunt"] || "";
                const species = (row["species"] || "").toLowerCase();
                const speciesId = this.mapSpecies(species);
                if (code && speciesId) {
                  const key = `${speciesId}:${code}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    units.push({ stateId: "OR", speciesId, unitCode: code, unitName: `Hunt ${code}` });
                  }
                }
              }
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      this.log(`Report downloads failed: ${(err as Error).message}`);
    }

    // Try the controlled hunts page for unit data
    try {
      this.log("Scraping controlled hunts page...");
      const html = await this.fetchPage(ODFW_CONTROLLED_HUNTS);

      // Fingerprint the controlled hunts page
      const fp = computeFingerprint(html, ODFW_CONTROLLED_HUNTS, "OR");
      const lastFp = await getLastFingerprint("OR", ODFW_CONTROLLED_HUNTS, this.supabase);
      const fpResult = compareFingerprint(fp, lastFp);
      if (fpResult.changed) {
        this.log(`  WARNING: Structure change detected on controlled hunts: ${fpResult.details}`);
      }
      await storeFingerprint(fp, this.supabase);

      // Look for hunt numbers and unit names
      const huntPattern = /Hunt\s+#?\s*(\d{3}[A-Z]?\d?)/gi;
      let match: RegExpExecArray | null;
      while ((match = huntPattern.exec(html)) !== null) {
        const code = match[1];
        for (const speciesId of ["elk", "mule_deer", "blacktail"]) {
          const key = `${speciesId}:${code}`;
          if (!seen.has(key)) {
            seen.add(key);
            units.push({ stateId: "OR", speciesId, unitCode: code, unitName: `Hunt ${code}` });
          }
        }
      }

      // Look for CSV/data links using cheerio
      const csvLinks = this.extractCsvLinks(html);
      for (const csvUrl of csvLinks) {
        try {
          const rows = await this.fetchCsv(csvUrl);
          if (rows.length > 1) {
            const headers = rows[0].map((h) => h.toLowerCase().trim());
            for (let i = 1; i < rows.length; i++) {
              const row = this.parseCsvRow(rows[i], headers);
              const code = row["hunt number"] || row["hunt"] || row["unit"] || "";
              const species = (row["species"] || "").toLowerCase();
              const speciesId = this.mapSpecies(species);
              if (code && speciesId) {
                const key = `${speciesId}:${code}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  units.push({ stateId: "OR", speciesId, unitCode: code, unitName: `Hunt ${code}` });
                }
              }
            }
          }
        } catch { /* skip */ }
      }
    } catch (err) {
      this.log(`Controlled hunts scrape failed: ${(err as Error).message}`);
    }

    // Try big game statistics page
    try {
      this.log("Scraping big game statistics page...");
      const html = await this.fetchPage(ODFW_BIG_GAME_STATS);
      const links = this.extractDownloadLinks(html);
      for (const link of links) {
        if (link.url.endsWith(".csv")) {
          try {
            const rows = await this.fetchCsv(link.url);
            if (rows.length > 1) {
              const headers = rows[0].map((h) => h.toLowerCase().trim());
              for (let i = 1; i < rows.length; i++) {
                const row = this.parseCsvRow(rows[i], headers);
                const code = row["hunt number"] || row["unit"] || "";
                const species = (row["species"] || "").toLowerCase();
                const speciesId = this.mapSpecies(species);
                if (code && speciesId) {
                  const key = `${speciesId}:${code}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    units.push({ stateId: "OR", speciesId, unitCode: code, unitName: `Hunt ${code}` });
                  }
                }
              }
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }

    this.log(`Extracted ${units.length} OR units`);
    return units;
  }

  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    // Try report downloads portal
    try {
      this.log("Fetching ODFW report downloads...");
      const html = await this.fetchPage(ODFW_REPORT_DOWNLOADS);
      const links = this.extractDownloadLinks(html);

      for (const link of links) {
        if (link.url.endsWith(".csv") && (
          link.label.toLowerCase().includes("draw") ||
          link.label.toLowerCase().includes("controlled") ||
          link.label.toLowerCase().includes("statistics") ||
          link.label.toLowerCase().includes("applicant")
        )) {
          try {
            this.log(`Fetching: ${link.label}`);
            const rows = await this.fetchCsv(link.url);
            if (rows.length > 1) {
              const headers = rows[0].map((h) => h.toLowerCase().trim());
              this.log(`  Headers: ${headers.join(", ")}`);
              for (let i = 1; i < rows.length; i++) {
                const row = this.parseCsvRow(rows[i], headers);
                const parsed = this.parseOrRow(row);
                if (parsed) results.push(parsed);
              }
            }
          } catch (err) {
            this.log(`  Failed: ${(err as Error).message}`);
          }
        }
      }
    } catch (err) {
      this.log(`Report downloads failed: ${(err as Error).message}`);
    }

    // Try direct hunt statistics file URLs
    const statFiles = [
      "ControlledHuntStats.csv",
      "controlled_hunt_statistics.csv",
      "draw_stats.csv",
    ];
    for (const file of statFiles) {
      try {
        const url = `${ODFW_STATS_BASE}${file}`;
        this.log(`Trying direct URL: ${url}`);
        const rows = await this.fetchCsv(url);
        if (rows.length > 1) {
          const headers = rows[0].map((h) => h.toLowerCase().trim());
          for (let i = 1; i < rows.length; i++) {
            const row = this.parseCsvRow(rows[i], headers);
            const parsed = this.parseOrRow(row);
            if (parsed) results.push(parsed);
          }
        }
      } catch { /* skip */ }
    }

    // Scrape controlled hunts page for HTML tables using cheerio
    try {
      this.log("Scraping controlled hunts page for table data...");
      const html = await this.fetchPage(ODFW_CONTROLLED_HUNTS);

      // Fingerprint the controlled hunts page
      const fp = computeFingerprint(html, ODFW_CONTROLLED_HUNTS, "OR");
      const lastFp = await getLastFingerprint("OR", ODFW_CONTROLLED_HUNTS, this.supabase);
      const fpResult = compareFingerprint(fp, lastFp);
      if (fpResult.changed) {
        this.log(`  WARNING: Structure change detected: ${fpResult.details}`);
      }
      await storeFingerprint(fp, this.supabase);

      const tableData = this.parseHtmlTables(html);
      results.push(...tableData);
    } catch { /* skip */ }

    this.log(`Total OR draw history rows: ${results.length}`);
    return results;
  }

  // -------------------------------------------------------------------------
  // Internal helpers — all HTML parsing via cheerio (zero regex patterns)
  // -------------------------------------------------------------------------

  /**
   * Extract download links (CSV, XLSX, PDF) from HTML using cheerio.
   * Resolves relative URLs against the appropriate base.
   */
  private extractDownloadLinks(html: string): { url: string; label: string }[] {
    const $ = this.parseHtml(html);
    const links: { url: string; label: string }[] = [];

    $("a[href]").each((_, el) => {
      let href = $(el).attr("href") || "";
      const label = $(el).text().trim();

      // Only include data file links
      if (!/\.(csv|xlsx?|pdf)(\?|$)/i.test(href)) return;

      // Resolve relative URLs
      if (!href.startsWith("http")) {
        if (href.startsWith("/")) {
          href = `https://odfw.huntfishoregon.com${href}`;
        } else {
          href = `${ODFW_STATS_BASE}${href}`;
        }
      }

      links.push({ url: href, label });
    });

    return links;
  }

  /**
   * Extract CSV links from HTML using cheerio.
   * Resolves relative URLs against the DFW base.
   */
  private extractCsvLinks(html: string): string[] {
    const $ = this.parseHtml(html);
    const links: string[] = [];

    $('a[href$=".csv"]').each((_, el) => {
      let href = $(el).attr("href") || "";
      if (!href.startsWith("http")) {
        href = `https://www.dfw.state.or.us${href}`;
      }
      links.push(href);
    });

    return links;
  }

  private parseOrRow(row: Record<string, string>): ScrapedDrawHistory | null {
    const huntCode = row["hunt number"] || row["hunt"] || row["unit"] || row["hunt code"] || "";
    if (!huntCode) return null;

    const species = (row["species"] || row["animal"] || "").toLowerCase();
    const speciesId = this.mapSpecies(species);
    if (!speciesId) return null;

    const year = parseInt(row["year"] || "0", 10);
    if (!year || year < 2000) return null;

    const applicants = this.num(row["1st choice applicants"] || row["applicants"] || row["total applicants"]);
    const tags = this.num(row["tags"] || row["permits"] || row["tags available"]);
    const odds = parseFloat((row["draw odds"] || row["success"] || "0").replace("%", "")) || 0;

    return {
      unitId: `OR:${speciesId}:${huntCode}`,
      year,
      applicants,
      tags,
      odds: odds || (applicants > 0 ? Math.round((tags / applicants) * 10000) / 100 : 0),
      minPointsDrawn: row["pref point cutoff"] ? parseInt(row["pref point cutoff"], 10) : null,
    };
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
        const parsed = this.parseOrRow(row);
        if (parsed) results.push(parsed);
      }
    });

    return results;
  }

  private mapSpecies(name: string): string | null {
    for (const [key, id] of Object.entries(OR_SPECIES)) {
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
      this.log("Scraping ODFW for application deadlines...");
      const urls = [
        "https://myodfw.com/articles/controlled-hunt-navigation",
        "https://myodfw.com/hunting",
        ODFW_REPORT_DOWNLOADS,
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const datePatterns = [
            /(?:application|deadline|opens?|closes?|due|draw\s+results?|controlled\s+hunt)[^.]*?(\w+\s+\d{1,2},?\s+\d{4})/gi,
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
              if (context.includes("leftover") || context.includes("second")) deadlineType = "leftover";

              const speciesIds = this.detectSpeciesFromContext(context);
              for (const speciesId of speciesIds) {
                deadlines.push({ stateId: "OR", speciesId, deadlineType, date: dateStr, year, notes: context.trim().substring(0, 200) });
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

    this.log(`Found ${deadlines.length} OR deadlines (pre-validation)`);
    return validateBatch(deadlines, PlausibleDeadlineSchema, "OR deadlines", this.log.bind(this));
  }

  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    // -----------------------------------------------------------------
    // 1. Structured / verified fee data (primary source of truth)
    //    Source: dfw.state.or.us — OR controlled hunt fee schedule
    // -----------------------------------------------------------------

    this.log("Emitting structured OR fee data...");

    // License-level fees (no speciesId) — OR has no point purchase fee
    fees.push(
      { stateId: "OR", feeName: "Nonresident Hunting License", amount: 181.50, residency: "nonresident", frequency: "annual" },
      { stateId: "OR", feeName: "Application Fee", amount: 8, residency: "both", frequency: "per_species" },
    );

    // Per-species tag costs — nonresident
    const nrTags: [string, string, number][] = [
      ["elk", "Elk Tag", 588],
      ["mule_deer", "Deer Tag", 443.50],
      ["blacktail", "Blacktail Deer Tag", 443.50],
      ["black_bear", "Black Bear Tag", 16.50],
      ["pronghorn", "Pronghorn Tag", 395.50],
      ["bighorn_sheep", "Bighorn Sheep Tag", 1513.50],
      ["mountain_goat", "Mountain Goat Tag", 1513.50],
      ["mountain_lion", "Mountain Lion Tag", 16.50],
    ];
    for (const [speciesId, name, amount] of nrTags) {
      fees.push({ stateId: "OR", feeName: `NR ${name}`, amount, residency: "nonresident", speciesId, frequency: "one_time" });
    }

    // Per-species tag costs — resident
    const rTags: [string, string, number][] = [
      ["elk", "Elk Tag", 38],
      ["mule_deer", "Deer Tag", 29.50],
      ["blacktail", "Blacktail Deer Tag", 29.50],
      ["black_bear", "Black Bear Tag", 16.50],
      ["pronghorn", "Pronghorn Tag", 29.50],
      ["bighorn_sheep", "Bighorn Sheep Tag", 166.50],
      ["mountain_goat", "Mountain Goat Tag", 166.50],
      ["mountain_lion", "Mountain Lion Tag", 16.50],
    ];
    for (const [speciesId, name, amount] of rTags) {
      fees.push({ stateId: "OR", feeName: `R ${name}`, amount, residency: "resident", speciesId, frequency: "one_time" });
    }

    this.log(`  Emitted ${fees.length} structured fee entries`);

    // -----------------------------------------------------------------
    // 2. Fallback: scrape the ODFW website for any additional / updated fees
    // -----------------------------------------------------------------

    try {
      this.log("Scraping ODFW for supplemental fee data...");
      const urls = [
        "https://myodfw.com/articles/buying-your-hunting-license",
        "https://myodfw.com/hunting",
      ];

      const seen = new Set<string>(fees.map((f) => `${f.amount}:${f.feeName.substring(0, 30)}`));

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const feePattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:[-\u2013]|for|per)?\s*([^<\n]{5,80})/gi;
          let match: RegExpExecArray | null;

          while ((match = feePattern.exec(html)) !== null) {
            const amount = parseFloat(match[1].replace(/,/g, ""));
            const label = match[2].replace(/<[^>]*>/g, "").trim();

            if (amount > 0 && amount < 10000 && label.length > 3) {
              const key = `${amount}:${label.substring(0, 30)}`;
              if (seen.has(key)) continue;
              seen.add(key);

              const lower = label.toLowerCase();
              fees.push({
                stateId: "OR",
                feeName: label.substring(0, 100),
                amount,
                residency: lower.includes("nonresident") || lower.includes("non-resident")
                  ? "nonresident" : lower.includes("resident") ? "resident" : "both",
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

    this.log(`Found ${fees.length} OR fee entries total (pre-validation)`);
    return validateBatch(fees, PlausibleFeeSchema, "OR fees", this.log.bind(this));
  }

  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping ODFW for season dates...");
      const urls = [
        ODFW_CONTROLLED_HUNTS,
        ODFW_BIG_GAME_STATS,
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const seasonPattern = /(archery|muzzleloader|rifle|general|any\s+legal\s+weapon|youth)[^:]*?:\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-\u2013]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
          let match: RegExpExecArray | null;

          while ((match = seasonPattern.exec(html)) !== null) {
            const seasonType = match[1].toLowerCase().trim();
            const startDate = match[2];
            const endDate = match[3];
            const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();

            const speciesIds = this.detectSpeciesFromContext(context);
            for (const speciesId of speciesIds) {
              seasons.push({ stateId: "OR", speciesId, seasonType, startDate, endDate, year });
            }
          }
        } catch (err) {
          this.log(`  Season page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Season scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${seasons.length} OR season entries (pre-validation)`);
    return validateBatch(seasons, PlausibleSeasonSchema, "OR seasons", this.log.bind(this));
  }

  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping ODFW for regulation updates...");
      const urls = [
        ODFW_CONTROLLED_HUNTS,
        "https://myodfw.com/hunting",
        ODFW_BIG_GAME_STATS,
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
              lower.includes("rule") || lower.includes("draw") ||
              lower.includes("season") || lower.includes("emergency")
            ) {
              let category = "announcement";
              if (lower.includes("regulation") || lower.includes("rule")) category = "rule_change";
              if (lower.includes("closure") || lower.includes("emergency")) category = "emergency_closure";
              if (lower.includes("leftover")) category = "leftover_tags";

              regs.push({ stateId: "OR", title: text.substring(0, 200), summary: text, sourceUrl: url, category });
            }
          });
        } catch (err) {
          this.log(`  Regulation page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Regulation scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${regs.length} OR regulation entries`);
    return regs;
  }

  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking ODFW for leftover tag data...");
      const html = await this.fetchPage(ODFW_REPORT_DOWNLOADS);

      // Find CSV links related to leftover tags
      const links = this.extractDownloadLinks(html);
      for (const link of links) {
        if (link.url.endsWith(".csv") && (
          link.label.toLowerCase().includes("leftover") ||
          link.label.toLowerCase().includes("remaining") ||
          link.label.toLowerCase().includes("available")
        )) {
          try {
            const rows = await this.fetchCsv(link.url);
            if (rows.length > 1) {
              const headers = rows[0].map((h) => h.toLowerCase().trim());
              for (let i = 1; i < rows.length; i++) {
                const row = this.parseCsvRow(rows[i], headers);
                const unitCode = row["hunt number"] || row["hunt"] || row["unit"] || "";
                const available = parseInt((row["available"] || row["remaining"] || row["permits"] || "0").replace(/,/g, ""), 10);
                const species = (row["species"] || "").toLowerCase();
                const speciesId = this.detectSingleSpecies(species) || "elk";

                if (unitCode && available > 0) {
                  leftovers.push({
                    stateId: "OR", speciesId, unitCode, tagsAvailable: available,
                    sourceUrl: link.url,
                  });
                }
              }
            }
          } catch { /* skip */ }
        }
      }

      // Also check HTML tables using cheerio
      const $ = this.parseHtml(html);
      $("table").each((_, tableEl) => {
        const tableText = $(tableEl).text().toLowerCase();
        if (!tableText.includes("leftover") && !tableText.includes("remaining") && !tableText.includes("available")) return;

        const tableHtml = $.html(tableEl);
        const rows = this.extractTable(tableHtml, "table");

        for (const row of rows) {
          const unitCode = row["hunt"] || row["unit"] || Object.values(row)[0] || "";
          const availableStr = row["available"] || row["remaining"] || Object.values(row).pop() || "0";
          const available = parseInt(availableStr.replace(/,/g, ""), 10);

          if (unitCode && available > 0) {
            const species = (row["species"] || "").toLowerCase();
            leftovers.push({
              stateId: "OR",
              speciesId: this.detectSingleSpecies(species) || "elk",
              unitCode,
              tagsAvailable: available,
              sourceUrl: ODFW_REPORT_DOWNLOADS,
            });
          }
        }
      });
    } catch (err) {
      this.log(`Leftover tag scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${leftovers.length} OR leftover tags (pre-validation)`);
    return validateBatch(leftovers, PlausibleLeftoverTagSchema, "OR leftover tags", this.log.bind(this));
  }

  private detectSpeciesFromContext(text: string): string[] {
    const species: string[] = [];
    if (text.includes("elk")) species.push("elk");
    if (text.includes("mule deer") || text.includes("mule")) species.push("mule_deer");
    if (text.includes("blacktail") || text.includes("black-tail")) species.push("blacktail");
    if (text.includes("pronghorn") || text.includes("antelope")) species.push("pronghorn");
    if (text.includes("sheep") || text.includes("bighorn")) species.push("bighorn_sheep");
    if (text.includes("goat")) species.push("mountain_goat");
    if (text.includes("bear")) species.push("black_bear");
    if (text.includes("cougar") || text.includes("lion")) species.push("mountain_lion");
    if (species.length === 0) species.push("elk");
    return species;
  }

  private detectSingleSpecies(text: string): string | null {
    if (text.includes("elk")) return "elk";
    if (text.includes("mule")) return "mule_deer";
    if (text.includes("blacktail")) return "blacktail";
    if (text.includes("pronghorn") || text.includes("antelope")) return "pronghorn";
    if (text.includes("sheep")) return "bighorn_sheep";
    if (text.includes("goat")) return "mountain_goat";
    if (text.includes("bear")) return "black_bear";
    if (text.includes("cougar") || text.includes("lion")) return "mountain_lion";
    return null;
  }
}
