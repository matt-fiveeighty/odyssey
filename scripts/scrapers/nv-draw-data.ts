/**
 * Nevada (NDOW) Draw Data Scraper
 *
 * Nevada Department of Wildlife publishes hunt statistics as Excel worksheets
 * and draw results/bonus point data as PDFs.
 *
 * Data sources:
 *   - Hunt Statistics: https://www.ndow.org/blog/hunt-statistics/
 *   - Bonus Point Data: https://www.ndow.org/blog/bonus-point-data/
 *   - Big Game Status Book: https://www.ndow.org/wp-content/uploads/...Big-Game-Status-Book...pdf
 *   - Draw Results: https://www.ndow.org/wp-content/uploads/...Draw-Public-List...pdf
 *   - HuntNV tool: interactive hunt data with draw odds & bonus points
 *
 * NV draw system:
 *   - Bonus point squared: (points+1)^2 chances in the draw
 *   - Apply per unit with up to 5 ranked choices
 *   - Hunting license ($142 NR) IS your point entry
 *   - Entirely draw-based for big game (no OTC tags)
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

// ---------------------------------------------------------------------------
// URL constants
// ---------------------------------------------------------------------------

const NDOW_HUNT_STATS = "https://www.ndow.org/blog/hunt-statistics/";
const NDOW_BONUS_POINTS = "https://www.ndow.org/blog/bonus-point-data/";

/**
 * NDOW publishes hunt stats as a filterable Excel file.
 * The URL changes annually — UPDATE THIS EACH YEAR.
 * Find the latest by visiting NDOW_HUNT_STATS page.
 */
const NDOW_EXCEL_URLS: string[] = [
  "https://www.ndow.org/wp-content/uploads/2025/06/2024-Big-Game-Hunt-Stats.xlsx",
  "https://www.ndow.org/wp-content/uploads/2024/06/2023-Big-Game-Hunt-Stats.xlsx",
];

/** NDOW species mapping */
const NDOW_SPECIES: Record<string, string> = {
  "mule deer": "mule_deer",
  deer: "mule_deer",
  elk: "elk",
  moose: "moose",
  pronghorn: "pronghorn",
  antelope: "pronghorn",
  "bighorn sheep": "bighorn_sheep",
  sheep: "bighorn_sheep",
  "mountain goat": "mountain_goat",
  goat: "mountain_goat",
  "mountain lion": "mountain_lion",
  "black bear": "black_bear",
  bear: "black_bear",
};

// ---------------------------------------------------------------------------
// Nevada scraper
// ---------------------------------------------------------------------------

export class NevadaScraper extends BaseScraper {
  stateId = "NV";
  stateName = "Nevada";
  sourceUrl = NDOW_HUNT_STATS;

  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    // Scrape the hunt statistics page for unit/area data
    try {
      this.log("Scraping NDOW hunt statistics page...");
      const html = await this.fetchPage(NDOW_HUNT_STATS);

      // Look for hunt unit numbers in the HTML
      const unitPattern = /Unit\s+(\d{3})/gi;
      let match: RegExpExecArray | null;

      while ((match = unitPattern.exec(html)) !== null) {
        const code = match[1];
        for (const [, speciesId] of Object.entries(NDOW_SPECIES)) {
          const key = `${speciesId}:${code}`;
          if (!seen.has(key)) {
            seen.add(key);
            units.push({
              stateId: "NV",
              speciesId,
              unitCode: code,
              unitName: `Unit ${code}`,
            });
          }
        }
      }

      // Also look for download links (Excel/CSV)
      const downloadLinks = this.extractDownloadLinks(html);
      this.log(`  Found ${downloadLinks.length} download links`);

      for (const link of downloadLinks) {
        if (link.endsWith(".csv")) {
          try {
            const rows = await this.fetchCsv(link);
            if (rows.length > 1) {
              const headers = rows[0].map((h) => h.toLowerCase().trim());
              for (let i = 1; i < rows.length; i++) {
                const row = this.parseCsvRow(rows[i], headers);
                const unitCode = row["unit"] || row["hunt unit"] || row["area"] || "";
                const species = (row["species"] || "").toLowerCase();
                const speciesId = this.mapSpecies(species);
                if (unitCode && speciesId) {
                  const key = `${speciesId}:${unitCode}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    units.push({
                      stateId: "NV",
                      speciesId,
                      unitCode,
                      unitName: `Unit ${unitCode}`,
                    });
                  }
                }
              }
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      this.log(`Hunt stats page scrape failed: ${(err as Error).message}`);
    }

    // Scrape bonus point data page for additional unit info
    try {
      const html = await this.fetchPage(NDOW_BONUS_POINTS);
      const unitPattern = /(\d{3})/g;
      let match: RegExpExecArray | null;
      while ((match = unitPattern.exec(html)) !== null) {
        const code = match[1];
        if (parseInt(code, 10) >= 100 && parseInt(code, 10) <= 300) {
          for (const speciesId of ["mule_deer", "elk", "pronghorn"]) {
            const key = `${speciesId}:${code}`;
            if (!seen.has(key)) {
              seen.add(key);
              units.push({ stateId: "NV", speciesId, unitCode: code, unitName: `Unit ${code}` });
            }
          }
        }
      }
    } catch { /* skip */ }

    this.log(`Extracted ${units.length} NV units`);
    return units;
  }

  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    // Try to find and download Excel/CSV files from hunt stats page
    try {
      this.log("Scraping NDOW hunt statistics for download links...");
      const html = await this.fetchPage(NDOW_HUNT_STATS);
      const links = this.extractDownloadLinks(html);

      for (const link of links) {
        if (link.endsWith(".csv") || link.includes("Hunt-Stats")) {
          try {
            this.log(`Trying download: ${link}`);
            const rows = await this.fetchCsv(link);
            if (rows.length > 1) {
              const headers = rows[0].map((h) => h.toLowerCase().trim());
              this.log(`  Headers: ${headers.join(", ")}`);
              for (let i = 1; i < rows.length; i++) {
                const row = this.parseCsvRow(rows[i], headers);
                const parsed = this.parseNdowRow(row);
                if (parsed) results.push(parsed);
              }
              this.log(`  Parsed ${results.length} rows`);
            }
          } catch (err) {
            this.log(`  Download failed: ${(err as Error).message}`);
          }
        }
      }
    } catch (err) {
      this.log(`Stats page scrape failed: ${(err as Error).message}`);
    }

    // Try direct Excel URL downloads
    for (const url of NDOW_EXCEL_URLS) {
      try {
        this.log(`Trying NDOW Excel: ${url}`);
        // Excel files can't be parsed as CSV, but try in case NDOW
        // also publishes as CSV at similar URLs
        const csvUrl = url.replace(".xlsx", ".csv").replace(".xls", ".csv");
        const rows = await this.fetchCsv(csvUrl);
        if (rows.length > 1) {
          const headers = rows[0].map((h) => h.toLowerCase().trim());
          for (let i = 1; i < rows.length; i++) {
            const row = this.parseCsvRow(rows[i], headers);
            const parsed = this.parseNdowRow(row);
            if (parsed) results.push(parsed);
          }
        }
      } catch {
        this.log(`  Excel/CSV download failed (expected — Excel parsing needs xlsx library)`);
      }
    }

    // Try bonus point page for draw-related data
    try {
      this.log("Scraping bonus point data page...");
      const html = await this.fetchPage(NDOW_BONUS_POINTS);
      const tableData = this.parseHtmlTables(html);
      results.push(...tableData);
      this.log(`  Extracted ${tableData.length} rows from bonus point tables`);
    } catch (err) {
      this.log(`Bonus point scrape failed: ${(err as Error).message}`);
    }

    this.log(`Total NV draw history rows: ${results.length}`);
    return results;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private extractDownloadLinks(html: string): string[] {
    const links: string[] = [];
    const pattern = /href=["']([^"']*\.(csv|xlsx?|xls)[^"']*)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      let href = match[1];
      if (!href.startsWith("http")) href = `https://www.ndow.org${href}`;
      links.push(href);
    }
    return links;
  }

  private parseNdowRow(row: Record<string, string>): ScrapedDrawHistory | null {
    const unitCode = row["unit"] || row["hunt unit"] || row["area"] || row["hunt number"] || "";
    if (!unitCode) return null;

    const species = (row["species"] || row["animal"] || "").toLowerCase();
    const speciesId = this.mapSpecies(species);
    if (!speciesId) return null;

    const year = parseInt(row["year"] || row["season"] || "0", 10);
    if (!year || year < 2000) return null;

    const applicants = this.num(row["applicants"] || row["total applicants"] || row["nr applicants"]);
    const tags = this.num(row["tags"] || row["permits"] || row["issued"] || row["quota"]);
    const oddsStr = row["odds"] || row["success"] || row["draw odds"] || "0";
    const odds = parseFloat(oddsStr.replace("%", "")) || 0;

    return {
      unitId: `NV:${speciesId}:${unitCode}`,
      year,
      applicants,
      tags,
      odds: odds || (applicants > 0 ? Math.round((tags / applicants) * 10000) / 100 : 0),
      minPointsDrawn: row["min bonus pts"] ? parseInt(row["min bonus pts"], 10) : null,
    };
  }

  private parseHtmlTables(html: string): ScrapedDrawHistory[] {
    const results: ScrapedDrawHistory[] = [];
    const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];

    for (const table of tables) {
      const headers: string[] = [];
      const ths = table.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
      for (const th of ths) headers.push(th.replace(/<[^>]*>/g, "").trim().toLowerCase());
      if (headers.length < 3) continue;

      const trs = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      for (const tr of trs) {
        const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (tds.length < 3) continue;
        const cells = tds.map((td) => td.replace(/<[^>]*>/g, "").trim());
        const row: Record<string, string> = {};
        for (let i = 0; i < headers.length && i < cells.length; i++) row[headers[i]] = cells[i];
        const parsed = this.parseNdowRow(row);
        if (parsed) results.push(parsed);
      }
    }
    return results;
  }

  private mapSpecies(name: string): string | null {
    for (const [key, id] of Object.entries(NDOW_SPECIES)) {
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

  /**
   * scrapeDeadlines — pull application deadlines from NDOW.
   * NDOW publishes key dates on the licenses and blog pages.
   */
  async scrapeDeadlines(): Promise<ScrapedDeadline[]> {
    const deadlines: ScrapedDeadline[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping NDOW for application deadlines...");
      const urls = [
        "https://www.ndow.org/licenses/",
        "https://www.ndow.org/blog/hunt-statistics/",
        "https://www.ndow.org/hunt/",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);

          // Look for date patterns (Month Day, Year or MM/DD/YYYY)
          const datePatterns = [
            /(?:application|deadline|opens?|closes?|due|draw\s+results?|bonus\s+point)[^.]*?(\w+\s+\d{1,2},?\s+\d{4})/gi,
            /(\d{1,2}\/\d{1,2}\/\d{4})/g,
          ];

          for (const pattern of datePatterns) {
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(html)) !== null) {
              const context = html
                .substring(Math.max(0, match.index - 150), match.index + 150)
                .replace(/<[^>]*>/g, " ")
                .toLowerCase();
              const dateStr = match[1];

              let deadlineType = "application_close";
              if (context.includes("open") || context.includes("begin")) deadlineType = "application_open";
              if (context.includes("result")) deadlineType = "draw_results";
              if (context.includes("leftover") || context.includes("remaining") || context.includes("first come"))
                deadlineType = "leftover";

              const speciesIds = this.detectSpeciesFromContext(context);
              for (const speciesId of speciesIds) {
                deadlines.push({
                  stateId: "NV",
                  speciesId,
                  deadlineType,
                  date: dateStr,
                  year,
                  notes: context.trim().substring(0, 200),
                });
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

    this.log(`Found ${deadlines.length} NV deadlines`);
    return deadlines;
  }

  /**
   * scrapeFees — pull license/application fees from NDOW.
   * NDOW publishes license fees on the licenses page.
   */
  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    try {
      this.log("Scraping NDOW for fee data...");
      const html = await this.fetchPage("https://www.ndow.org/licenses/");

      // Look for dollar amounts with fee labels
      const feePattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:[-–]|for|per)?\s*([^<\n]{5,80})/gi;
      let match: RegExpExecArray | null;
      const seen = new Set<string>();

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
            : lower.includes("resident") ? "resident" as const
            : "both" as const;

          const speciesId = this.detectSingleSpecies(lower);

          fees.push({
            stateId: "NV",
            feeName: label.substring(0, 100),
            amount,
            residency,
            speciesId: speciesId ?? undefined,
            frequency: lower.includes("per species") ? "per_species"
              : lower.includes("annual") ? "annual" : "one_time",
            notes: label,
          });
        }
      }

      // Also parse HTML tables on the license page
      const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
      for (const table of tables) {

        const trs = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        for (const tr of trs) {
          const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
          if (tds.length < 2) continue;
          const cells = tds.map((td) => td.replace(/<[^>]*>/g, "").trim());

          for (const cell of cells) {
            const dollarMatch = cell.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            if (dollarMatch) {
              const amount = parseFloat(dollarMatch[1].replace(/,/g, ""));
              const feeName = cells.filter((c) => c !== cell && c.length > 3)[0] || "";
              if (amount > 0 && feeName) {
                const key = `${amount}:${feeName.substring(0, 30)}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  const lower = feeName.toLowerCase();
                  fees.push({
                    stateId: "NV",
                    feeName: feeName.substring(0, 100),
                    amount,
                    residency: lower.includes("nonresident") ? "nonresident"
                      : lower.includes("resident") ? "resident" : "both",
                    frequency: "annual",
                  });
                }
              }
            }
          }
        }
      }
    } catch (err) {
      this.log(`Fee scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${fees.length} NV fee entries`);
    return fees;
  }

  /**
   * scrapeSeasons — pull season dates from NDOW regulations.
   * NDOW publishes season dates on the regulations page.
   */
  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping NDOW for season dates...");
      const html = await this.fetchPage("https://www.ndow.org/regulations/");

      // Look for season date patterns: "Archery: Aug 10 - Sep 5" or similar
      const seasonPattern = /(archery|muzzleloader|rifle|any\s+legal\s+weapon|general|early|late)[^:]*?:\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
      let match: RegExpExecArray | null;

      while ((match = seasonPattern.exec(html)) !== null) {
        const seasonType = match[1].toLowerCase().trim();
        const startDate = match[2];
        const endDate = match[3];
        const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();

        const speciesIds = this.detectSpeciesFromContext(context);
        for (const speciesId of speciesIds) {
          seasons.push({
            stateId: "NV",
            speciesId,
            seasonType,
            startDate,
            endDate,
            year,
          });
        }
      }

      // Also look for date ranges anywhere on the page
      const rangePat = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
      while ((match = rangePat.exec(html)) !== null) {
        const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();
        const seasonType = context.includes("archery") ? "archery"
          : context.includes("muzzleloader") ? "muzzleloader"
          : context.includes("rifle") ? "rifle"
          : context.includes("any legal weapon") ? "any_legal_weapon"
          : context.includes("general") ? "general"
          : null;

        if (seasonType) {
          const speciesIds = this.detectSpeciesFromContext(context);
          for (const speciesId of speciesIds) {
            seasons.push({
              stateId: "NV",
              speciesId,
              seasonType,
              startDate: match[1],
              endDate: match[2],
              year,
            });
          }
        }
      }
    } catch (err) {
      this.log(`Season scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${seasons.length} NV season entries`);
    return seasons;
  }

  /**
   * scrapeRegulations — pull news/announcements from NDOW.
   */
  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping NDOW for regulation updates...");
      const urls = [
        "https://www.ndow.org/regulations/",
        "https://www.ndow.org/hunt/",
        "https://www.ndow.org/blog/hunt-statistics/",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);

          // Look for news items, announcements, and regulation changes
          const newsPattern = /<(?:h[2-4]|a)[^>]*>([\s\S]*?)<\/(?:h[2-4]|a)>/gi;
          let match: RegExpExecArray | null;

          while ((match = newsPattern.exec(html)) !== null) {
            const text = match[1].replace(/<[^>]*>/g, "").trim();
            if (text.length < 10 || text.length > 300) continue;

            const lower = text.toLowerCase();
            if (
              lower.includes("regulation") || lower.includes("change") ||
              lower.includes("update") || lower.includes("announcement") ||
              lower.includes("closure") || lower.includes("leftover") ||
              lower.includes("new rule") || lower.includes("draw") ||
              lower.includes("season") || lower.includes("emergency") ||
              lower.includes("tag") || lower.includes("quota")
            ) {
              let category = "announcement";
              if (lower.includes("regulation") || lower.includes("rule")) category = "rule_change";
              if (lower.includes("closure") || lower.includes("emergency")) category = "emergency_closure";
              if (lower.includes("leftover")) category = "leftover_tags";

              regs.push({
                stateId: "NV",
                title: text.substring(0, 200),
                summary: text,
                sourceUrl: url,
                category,
              });
            }
          }
        } catch (err) {
          this.log(`  Regulation page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Regulation scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${regs.length} NV regulation entries`);
    return regs;
  }

  /**
   * scrapeLeftoverTags — pull leftover/remaining tag data from NDOW.
   * NV is entirely draw-based, so leftover tags go to a first-come first-served process.
   */
  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking NDOW for leftover tag data...");
      const urls = [
        "https://www.ndow.org/licenses/",
        "https://www.ndow.org/hunt/",
        "https://www.ndow.org/blog/hunt-statistics/",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);

          // Look for leftover/remaining tags in HTML tables
          const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
          for (const table of tables) {
            const ths = table.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
            const headers = ths.map((th) => th.replace(/<[^>]*>/g, "").trim().toLowerCase());

            const trs = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
            for (const tr of trs) {
              const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
              if (tds.length < 2) continue;
              const cells = tds.map((td) => td.replace(/<[^>]*>/g, "").trim());
              const row: Record<string, string> = {};
              for (let i = 0; i < headers.length && i < cells.length; i++) row[headers[i]] = cells[i];

              const unitCode = row["unit"] || row["hunt unit"] || row["area"] || row["hunt number"] || "";
              const species = (row["species"] || row["animal"] || "").toLowerCase();
              const speciesId = this.mapSpecies(species);
              const tagsAvailable = this.num(
                row["available"] || row["remaining"] || row["leftover"] ||
                row["tags"] || row["quota"]
              );

              if (unitCode && speciesId && tagsAvailable > 0) {
                leftovers.push({
                  stateId: "NV",
                  speciesId,
                  unitCode,
                  tagsAvailable,
                  seasonType: row["season"] || row["weapon"] || undefined,
                  sourceUrl: url,
                });
              }
            }
          }

          // Look for links to leftover/remaining tag pages
          const linkPattern = /href=["']([^"']*(?:leftover|remaining|first.come)[^"']*)["']/gi;
          let linkMatch: RegExpExecArray | null;
          while ((linkMatch = linkPattern.exec(html)) !== null) {
            let href = linkMatch[1];
            if (!href.startsWith("http")) href = `https://www.ndow.org${href}`;
            try {
              const subHtml = await this.fetchPage(href);
              const subTables = subHtml.match(/<table[\s\S]*?<\/table>/gi) || [];
              for (const table of subTables) {
                const ths = table.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
                const headers = ths.map((th) => th.replace(/<[^>]*>/g, "").trim().toLowerCase());
                const trs = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
                for (const tr of trs) {
                  const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
                  if (tds.length < 2) continue;
                  const cells = tds.map((td) => td.replace(/<[^>]*>/g, "").trim());
                  const row: Record<string, string> = {};
                  for (let i = 0; i < headers.length && i < cells.length; i++) row[headers[i]] = cells[i];

                  const unitCode = row["unit"] || row["hunt unit"] || row["area"] || "";
                  const species = (row["species"] || "").toLowerCase();
                  const speciesId = this.mapSpecies(species);
                  const tagsAvailable = this.num(row["available"] || row["remaining"] || row["tags"]);

                  if (unitCode && speciesId && tagsAvailable > 0) {
                    leftovers.push({
                      stateId: "NV",
                      speciesId,
                      unitCode,
                      tagsAvailable,
                      sourceUrl: href,
                    });
                  }
                }
              }
            } catch { /* linked page may not exist */ }
          }
        } catch (err) {
          this.log(`  Leftover page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Leftover tag scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${leftovers.length} NV leftover tag entries`);
    return leftovers;
  }

  // -------------------------------------------------------------------------
  // Helper: detect species from surrounding text context
  // -------------------------------------------------------------------------

  private detectSpeciesFromContext(text: string): string[] {
    const species: string[] = [];
    if (text.includes("elk")) species.push("elk");
    if (text.includes("deer") || text.includes("mule")) species.push("mule_deer");
    if (text.includes("antelope") || text.includes("pronghorn")) species.push("pronghorn");
    if (text.includes("moose")) species.push("moose");
    if (text.includes("sheep") || text.includes("bighorn")) species.push("bighorn_sheep");
    if (text.includes("goat")) species.push("mountain_goat");
    if (text.includes("mountain lion") || text.includes("cougar")) species.push("mountain_lion");
    if (text.includes("bear")) species.push("black_bear");
    // Default to mule_deer if no species detected (NV's primary big game)
    if (species.length === 0) species.push("mule_deer");
    return species;
  }

  private detectSingleSpecies(text: string): string | null {
    if (text.includes("elk")) return "elk";
    if (text.includes("deer") || text.includes("mule")) return "mule_deer";
    if (text.includes("antelope") || text.includes("pronghorn")) return "pronghorn";
    if (text.includes("moose")) return "moose";
    if (text.includes("sheep") || text.includes("bighorn")) return "bighorn_sheep";
    if (text.includes("goat")) return "mountain_goat";
    if (text.includes("mountain lion") || text.includes("cougar")) return "mountain_lion";
    if (text.includes("bear")) return "black_bear";
    return null;
  }
}
