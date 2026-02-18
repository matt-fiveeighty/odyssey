/**
 * Arizona (AZGFD) Draw Data Scraper
 *
 * Arizona Game and Fish Department publishes draw statistics and hunt data.
 *
 * Data sources:
 *   - Harvest & Draw Data: https://www.azgfd.com/hunting/hunt-draw-and-licenses/harvest-reporting/
 *   - Draw portal: https://draw.azgfd.com/
 *   - Hunt guidelines: https://www.azgfd.com/hunting/
 *
 * AZ draw system:
 *   - Bonus point system (NOT squared) — linear odds improvement
 *   - Apply per unit with up to 5 ranked choices
 *   - Hunting license ($160 NR) IS your point entry
 *   - Bear hunts are a separate draw with different deadline
 *   - Spring and fall draw cycles
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

const AZGFD_HARVEST_PAGE =
  "https://www.azgfd.com/hunting/hunt-draw-and-licenses/harvest-reporting/";

const AZGFD_DRAW_PORTAL = "https://draw.azgfd.com/";

/** AZ species mapping */
const AZ_SPECIES: Record<string, string> = {
  elk: "elk",
  deer: "mule_deer",
  "mule deer": "mule_deer",
  "coues deer": "coues_deer",
  "coues whitetail": "coues_deer",
  antelope: "pronghorn",
  pronghorn: "pronghorn",
  "bighorn sheep": "bighorn_sheep",
  sheep: "bighorn_sheep",
  "mountain goat": "mountain_goat",
  javelina: "javelina",
  bear: "black_bear",
  "black bear": "black_bear",
  "mountain lion": "mountain_lion",
  buffalo: "bison",
  bison: "bison",
};

// ---------------------------------------------------------------------------
// Arizona scraper
// ---------------------------------------------------------------------------

export class ArizonaScraper extends BaseScraper {
  stateId = "AZ";
  stateName = "Arizona";
  sourceUrl = AZGFD_HARVEST_PAGE;

  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    try {
      this.log("Scraping AZGFD harvest/draw data page...");
      const html = await this.fetchPage(AZGFD_HARVEST_PAGE);

      // Extract download links for draw odds data files
      const links = this.extractDataLinks(html);
      this.log(`  Found ${links.length} data file links`);

      for (const link of links) {
        if (link.url.endsWith(".csv")) {
          try {
            const rows = await this.fetchCsv(link.url);
            if (rows.length > 1) {
              const headers = rows[0].map((h) => h.toLowerCase().trim());
              for (let i = 1; i < rows.length; i++) {
                const row = this.parseCsvRow(rows[i], headers);
                const unitCode = row["unit"] || row["hunt number"] || row["hunt_no"] || "";
                const species = (row["species"] || "").toLowerCase();
                const speciesId = this.mapSpecies(species);
                if (unitCode && speciesId) {
                  const key = `${speciesId}:${unitCode}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    units.push({ stateId: "AZ", speciesId, unitCode, unitName: `Unit ${unitCode}` });
                  }
                }
              }
            }
          } catch { /* skip */ }
        }
      }

      // Also look for unit numbers in the page HTML
      const unitPattern = /Unit\s+(\d+[A-Z]?)/gi;
      let match: RegExpExecArray | null;
      while ((match = unitPattern.exec(html)) !== null) {
        const code = match[1];
        for (const speciesId of ["elk", "mule_deer", "pronghorn", "coues_deer"]) {
          const key = `${speciesId}:${code}`;
          if (!seen.has(key)) {
            seen.add(key);
            units.push({ stateId: "AZ", speciesId, unitCode: code, unitName: `Unit ${code}` });
          }
        }
      }
    } catch (err) {
      this.log(`Harvest page scrape failed: ${(err as Error).message}`);
    }

    // Try the draw portal
    try {
      this.log("Checking AZGFD draw portal...");
      const html = await this.fetchPage(AZGFD_DRAW_PORTAL);
      const unitPattern = /\b(\d{1,2}[A-Z]?)\b/g;
      let match: RegExpExecArray | null;
      while ((match = unitPattern.exec(html)) !== null) {
        const code = match[1];
        if (parseInt(code, 10) >= 1 && parseInt(code, 10) <= 46) {
          for (const speciesId of ["elk", "mule_deer"]) {
            const key = `${speciesId}:${code}`;
            if (!seen.has(key)) {
              seen.add(key);
              units.push({ stateId: "AZ", speciesId, unitCode: code, unitName: `Unit ${code}` });
            }
          }
        }
      }
    } catch { /* skip */ }

    this.log(`Extracted ${units.length} AZ units`);
    return units;
  }

  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    try {
      this.log("Scraping AZGFD harvest/draw data page for files...");
      const html = await this.fetchPage(AZGFD_HARVEST_PAGE);
      const links = this.extractDataLinks(html);

      // Try CSV links first
      for (const link of links) {
        if (link.url.endsWith(".csv") && link.label.toLowerCase().includes("draw")) {
          try {
            this.log(`Fetching: ${link.label} — ${link.url}`);
            const rows = await this.fetchCsv(link.url);
            if (rows.length > 1) {
              const headers = rows[0].map((h) => h.toLowerCase().trim());
              this.log(`  Headers: ${headers.join(", ")}`);
              for (let i = 1; i < rows.length; i++) {
                const row = this.parseCsvRow(rows[i], headers);
                const parsed = this.parseAzRow(row);
                if (parsed) results.push(parsed);
              }
              this.log(`  Parsed ${results.length} rows`);
            }
          } catch (err) {
            this.log(`  Failed: ${(err as Error).message}`);
          }
        }
      }

      // Try all other data file links if no CSV worked
      if (results.length === 0) {
        for (const link of links) {
          if (link.url.endsWith(".csv")) {
            try {
              this.log(`Trying: ${link.url}`);
              const rows = await this.fetchCsv(link.url);
              if (rows.length > 1) {
                const headers = rows[0].map((h) => h.toLowerCase().trim());
                for (let i = 1; i < rows.length; i++) {
                  const row = this.parseCsvRow(rows[i], headers);
                  const parsed = this.parseAzRow(row);
                  if (parsed) results.push(parsed);
                }
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (err) {
      this.log(`Harvest page scrape failed: ${(err as Error).message}`);
    }

    // Try the draw portal for embedded data
    try {
      this.log("Checking draw portal for embedded data...");
      const html = await this.fetchPage(AZGFD_DRAW_PORTAL);
      const tableData = this.parseHtmlTables(html);
      results.push(...tableData);
    } catch { /* skip */ }

    this.log(`Total AZ draw history rows: ${results.length}`);
    return results;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private extractDataLinks(html: string): { url: string; label: string }[] {
    const links: { url: string; label: string }[] = [];
    const pattern = /href=["']([^"']*\.(csv|xlsx?|xls|pdf)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      let href = match[1];
      const label = match[3].replace(/<[^>]*>/g, "").trim();
      if (!href.startsWith("http")) href = `https://www.azgfd.com${href}`;
      links.push({ url: href, label });
    }
    return links;
  }

  private parseAzRow(row: Record<string, string>): ScrapedDrawHistory | null {
    const unitCode =
      row["unit"] || row["hunt number"] || row["hunt_no"] || row["hunt no"] ||
      row["gmu"] || row["area"] || "";
    if (!unitCode) return null;

    const species = (row["species"] || row["animal"] || "").toLowerCase();
    const speciesId = this.mapSpecies(species);
    if (!speciesId) return null;

    const year = parseInt(row["year"] || row["season"] || "0", 10);
    if (!year || year < 2000) return null;

    const applicants = this.num(row["1st choice applicants"] || row["applicants"] || row["nr applicants"] || row["total apps"]);
    const tags = this.num(row["permits available"] || row["tags"] || row["permits"] || row["issued"]);
    const odds = parseFloat((row["success%"] || row["odds"] || row["draw odds"] || "0").replace("%", "")) || 0;

    return {
      unitId: `AZ:${speciesId}:${unitCode}`,
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
        const parsed = this.parseAzRow(row);
        if (parsed) results.push(parsed);
      }
    }
    return results;
  }

  private mapSpecies(name: string): string | null {
    for (const [key, id] of Object.entries(AZ_SPECIES)) {
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
   * scrapeDeadlines — pull application deadlines from AZGFD.
   * AZGFD publishes draw deadlines on the draw information page.
   */
  async scrapeDeadlines(): Promise<ScrapedDeadline[]> {
    const deadlines: ScrapedDeadline[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping AZGFD for application deadlines...");
      const urls = [
        "https://www.azgfd.com/hunting/draw-information/",
        "https://www.azgfd.com/hunting/",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);

          // Look for date patterns (Month Day, Year or MM/DD/YYYY)
          const datePatterns = [
            /(?:application|deadline|opens?|closes?|due|draw\s+results?)[^.]*?(\w+\s+\d{1,2},?\s+\d{4})/gi,
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
              if (context.includes("open")) deadlineType = "application_open";
              if (context.includes("result")) deadlineType = "draw_results";
              if (context.includes("leftover") || context.includes("first-come"))
                deadlineType = "leftover";

              const speciesIds = this.detectSpeciesFromContext(context);
              for (const speciesId of speciesIds) {
                deadlines.push({
                  stateId: "AZ",
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

    this.log(`Found ${deadlines.length} AZ deadlines`);
    return deadlines;
  }

  /**
   * scrapeFees — pull license/application fees from AZGFD.
   * AZGFD publishes fee schedules on the licenses & permits page.
   */
  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    try {
      this.log("Scraping AZGFD fee schedule...");
      const html = await this.fetchPage(
        "https://www.azgfd.com/hunting/licenses-permits-stamps/"
      );

      // Look for dollar amounts with fee labels
      const feePattern =
        /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:[-–]|for|per)?\s*([^<\n]{5,80})/gi;
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
          const residency =
            lower.includes("nonresident") || lower.includes("non-resident")
              ? ("nonresident" as const)
              : lower.includes("resident")
                ? ("resident" as const)
                : ("both" as const);

          const speciesId = this.detectSingleSpecies(lower);

          fees.push({
            stateId: "AZ",
            feeName: label.substring(0, 100),
            amount,
            residency,
            speciesId: speciesId ?? undefined,
            frequency: lower.includes("per species")
              ? "per_species"
              : lower.includes("annual")
                ? "annual"
                : "one_time",
            notes: label,
          });
        }
      }

      // Also parse HTML tables on the fee page
      const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
      for (const table of tables) {

        const trs = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        for (const tr of trs) {
          const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
          if (tds.length < 2) continue;
          const cells = tds.map((td) => td.replace(/<[^>]*>/g, "").trim());

          // Look for a cell containing a dollar amount
          for (const cell of cells) {
            const dollarMatch = cell.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            if (dollarMatch) {
              const amount = parseFloat(dollarMatch[1].replace(/,/g, ""));
              const feeName =
                cells.filter((c) => c !== cell && c.length > 3)[0] || "";
              if (amount > 0 && feeName) {
                const key = `${amount}:${feeName.substring(0, 30)}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  const lower = feeName.toLowerCase();
                  fees.push({
                    stateId: "AZ",
                    feeName: feeName.substring(0, 100),
                    amount,
                    residency: lower.includes("nonresident")
                      ? "nonresident"
                      : lower.includes("resident")
                        ? "resident"
                        : "both",
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

    this.log(`Found ${fees.length} AZ fee entries`);
    return fees;
  }

  /**
   * scrapeSeasons — pull season dates from AZGFD hunt guidelines.
   * AZGFD publishes season dates in the hunting guidelines pages.
   */
  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping AZGFD for season dates...");
      const html = await this.fetchPage(
        "https://www.azgfd.com/hunting/guidelines/"
      );

      // Look for season date patterns: "Archery: Sep 1-30" or "September 1 - October 31"
      const seasonPattern =
        /(archery|muzzleloader|rifle|general|juniors?|youth|any\s+weapon)[^:]*?:\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
      let match: RegExpExecArray | null;

      while ((match = seasonPattern.exec(html)) !== null) {
        const seasonType = match[1].toLowerCase().trim();
        const startDate = match[2];
        const endDate = match[3];
        const context = html
          .substring(Math.max(0, match.index - 200), match.index + 200)
          .toLowerCase();

        const speciesIds = this.detectSpeciesFromContext(context);
        for (const speciesId of speciesIds) {
          seasons.push({
            stateId: "AZ",
            speciesId,
            seasonType,
            startDate,
            endDate,
            year,
          });
        }
      }

      // Also look for date ranges in table cells (Month DD - Month DD format)
      const rangePat =
        /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
      while ((match = rangePat.exec(html)) !== null) {
        const context = html
          .substring(Math.max(0, match.index - 200), match.index + 200)
          .toLowerCase();
        // Only include if context mentions a season type
        const seasonType = context.includes("archery")
          ? "archery"
          : context.includes("muzzleloader")
            ? "muzzleloader"
            : context.includes("rifle")
              ? "rifle"
              : context.includes("general")
                ? "general"
                : context.includes("youth") || context.includes("junior")
                  ? "youth"
                  : null;

        if (seasonType) {
          const speciesIds = this.detectSpeciesFromContext(context);
          for (const speciesId of speciesIds) {
            seasons.push({
              stateId: "AZ",
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

    this.log(`Found ${seasons.length} AZ season entries`);
    return seasons;
  }

  /**
   * scrapeRegulations — pull news/announcements from AZGFD.
   */
  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping AZGFD for regulation updates...");
      const urls = [
        "https://www.azgfd.com/hunting/regulations/",
        "https://www.azgfd.com/hunting/",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);

          // Look for news items, announcements, and regulation changes
          const newsPattern =
            /<(?:h[2-4]|a)[^>]*>([\s\S]*?)<\/(?:h[2-4]|a)>/gi;
          let match: RegExpExecArray | null;

          while ((match = newsPattern.exec(html)) !== null) {
            const text = match[1].replace(/<[^>]*>/g, "").trim();
            if (text.length < 10 || text.length > 300) continue;

            const lower = text.toLowerCase();
            if (
              lower.includes("regulation") ||
              lower.includes("change") ||
              lower.includes("update") ||
              lower.includes("announcement") ||
              lower.includes("closure") ||
              lower.includes("leftover") ||
              lower.includes("new rule") ||
              lower.includes("draw") ||
              lower.includes("season") ||
              lower.includes("emergency")
            ) {
              let category = "announcement";
              if (lower.includes("regulation") || lower.includes("rule"))
                category = "rule_change";
              if (lower.includes("closure") || lower.includes("emergency"))
                category = "emergency_closure";
              if (lower.includes("leftover")) category = "leftover_tags";

              regs.push({
                stateId: "AZ",
                title: text.substring(0, 200),
                summary: text,
                sourceUrl: url,
                category,
              });
            }
          }
        } catch (err) {
          this.log(
            `  Regulation page fetch failed (${url}): ${(err as Error).message}`
          );
        }
      }
    } catch (err) {
      this.log(`Regulation scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${regs.length} AZ regulation entries`);
    return regs;
  }

  /**
   * scrapeLeftoverTags — pull first-come-first-served tag data from AZGFD.
   * AZGFD publishes leftover tags on the first-come-first-served page after the draw.
   */
  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking AZGFD for leftover/FCFS tag data...");
      const urls = [
        "https://www.azgfd.com/hunting/draw-information/first-come-first-served/",
        "https://www.azgfd.com/hunting/draw-information/",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);

          // Look for unit + species + tags available patterns in HTML tables
          const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
          for (const table of tables) {
            const ths = table.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
            const headers = ths.map((th) =>
              th.replace(/<[^>]*>/g, "").trim().toLowerCase()
            );

            const trs = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
            for (const tr of trs) {
              const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
              if (tds.length < 2) continue;
              const cells = tds.map((td) =>
                td.replace(/<[^>]*>/g, "").trim()
              );
              const row: Record<string, string> = {};
              for (let i = 0; i < headers.length && i < cells.length; i++)
                row[headers[i]] = cells[i];

              const unitCode =
                row["unit"] ||
                row["hunt number"] ||
                row["hunt no"] ||
                row["hunt code"] ||
                row["area"] ||
                "";
              const species = (
                row["species"] || row["animal"] || ""
              ).toLowerCase();
              const speciesId = this.mapSpecies(species);
              const tagsAvailable = this.num(
                row["available"] ||
                  row["remaining"] ||
                  row["tags"] ||
                  row["permits"]
              );

              if (unitCode && tagsAvailable > 0) {
                leftovers.push({
                  stateId: "AZ",
                  speciesId: speciesId || "elk",
                  unitCode,
                  tagsAvailable,
                  seasonType: row["season"] || row["type"] || undefined,
                  sourceUrl: url,
                });
              }
            }
          }

          // Also look for links to FCFS/leftover tag lists
          const linkPattern =
            /href=["']([^"']*(?:leftover|first-come|fcfs)[^"']*)["']/gi;
          let linkMatch: RegExpExecArray | null;
          while ((linkMatch = linkPattern.exec(html)) !== null) {
            let href = linkMatch[1];
            if (!href.startsWith("http"))
              href = `https://www.azgfd.com${href}`;
            // Skip if it's the same URL we're already processing
            if (href === url) continue;
            try {
              const subHtml = await this.fetchPage(href);
              const subTables =
                subHtml.match(/<table[\s\S]*?<\/table>/gi) || [];
              for (const table of subTables) {
                const ths =
                  table.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
                const headers = ths.map((th) =>
                  th.replace(/<[^>]*>/g, "").trim().toLowerCase()
                );
                const trs =
                  table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
                for (const tr of trs) {
                  const tds =
                    tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
                  if (tds.length < 2) continue;
                  const cells = tds.map((td) =>
                    td.replace(/<[^>]*>/g, "").trim()
                  );
                  const row: Record<string, string> = {};
                  for (
                    let i = 0;
                    i < headers.length && i < cells.length;
                    i++
                  )
                    row[headers[i]] = cells[i];

                  const unitCode =
                    row["unit"] ||
                    row["hunt number"] ||
                    row["hunt no"] ||
                    row["area"] ||
                    "";
                  const species = (row["species"] || "").toLowerCase();
                  const speciesId = this.mapSpecies(species);
                  const tagsAvailable = this.num(
                    row["available"] ||
                      row["remaining"] ||
                      row["tags"] ||
                      row["permits"]
                  );

                  if (unitCode && tagsAvailable > 0) {
                    leftovers.push({
                      stateId: "AZ",
                      speciesId: speciesId || "elk",
                      unitCode,
                      tagsAvailable,
                      sourceUrl: href,
                    });
                  }
                }
              }
            } catch {
              /* linked page may not exist */
            }
          }
        } catch (err) {
          this.log(
            `  Leftover page fetch failed (${url}): ${(err as Error).message}`
          );
        }
      }
    } catch (err) {
      this.log(`Leftover tag scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${leftovers.length} AZ leftover tag entries`);
    return leftovers;
  }

  // -------------------------------------------------------------------------
  // Helper: detect species from surrounding text context
  // -------------------------------------------------------------------------

  private detectSpeciesFromContext(text: string): string[] {
    const species: string[] = [];
    if (text.includes("elk")) species.push("elk");
    if (text.includes("mule deer") || text.includes("mule")) species.push("mule_deer");
    if (text.includes("coues") || text.includes("whitetail")) species.push("coues_deer");
    if (text.includes("pronghorn") || text.includes("antelope")) species.push("pronghorn");
    if (text.includes("sheep") || text.includes("bighorn")) species.push("bighorn_sheep");
    if (text.includes("bear")) species.push("black_bear");
    if (text.includes("lion") || text.includes("cougar")) species.push("mountain_lion");
    if (text.includes("bison") || text.includes("buffalo")) species.push("bison");
    if (text.includes("goat")) species.push("mountain_goat");
    // Default to elk if no species detected
    if (species.length === 0) species.push("elk");
    return species;
  }

  private detectSingleSpecies(text: string): string | null {
    if (text.includes("elk")) return "elk";
    if (text.includes("mule deer")) return "mule_deer";
    if (text.includes("coues")) return "coues_deer";
    if (text.includes("pronghorn") || text.includes("antelope")) return "pronghorn";
    if (text.includes("sheep")) return "bighorn_sheep";
    if (text.includes("bear")) return "black_bear";
    if (text.includes("lion")) return "mountain_lion";
    if (text.includes("bison")) return "bison";
    if (text.includes("goat")) return "mountain_goat";
    return null;
  }
}
