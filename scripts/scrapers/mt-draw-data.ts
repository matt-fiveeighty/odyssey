/**
 * Montana (FWP) Draw Data Scraper
 *
 * Montana Fish, Wildlife & Parks publishes draw statistics through an
 * interactive AJAX-powered tool and as downloadable reports.
 *
 * Data sources:
 *   - Drawing Statistics Search: https://myfwp.mt.gov/fwpPub/drawingStatistics
 *   - AJAX endpoint: https://myfwp.mt.gov/fwpPub/repositoryList_input.action
 *   - Draw stats info: https://fwp.mt.gov/buyandapply/hunting-licenses/drawing-statistics
 *   - Application dates: https://fwp.mt.gov/buyandapply/hunting-licenses/application-drawing-dates
 *
 * MT draw system:
 *   - Combo license: 75% preference / 25% random for NR
 *   - Special permits (moose, sheep, goat): bonus points squared
 *   - District selection happens after combo license is drawn
 *   - NR cap: 10% of drawing quota for most species
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

const FWP_DRAW_STATS_SEARCH = "https://myfwp.mt.gov/fwpPub/drawingStatistics";

/**
 * FWP AJAX endpoint for drawing statistics.
 * The interactive tool posts form data to this endpoint and returns HTML fragments.
 * Parameters: animalType (Elk, Deer, etc.), lpt (license/permit type)
 */
const FWP_STATS_ACTION =
  "https://myfwp.mt.gov/fwpPub/repositoryList_input.action";

/** Animal types available in the FWP drawing statistics tool */
const FWP_ANIMAL_TYPES: { label: string; speciesId: string; param: string }[] = [
  { label: "Elk", speciesId: "elk", param: "Elk" },
  { label: "Mule Deer", speciesId: "mule_deer", param: "White-tailed/Mule Deer" },
  { label: "Moose", speciesId: "moose", param: "Moose" },
  { label: "Bighorn Sheep", speciesId: "bighorn_sheep", param: "Sheep" },
  { label: "Mountain Goat", speciesId: "mountain_goat", param: "Goat" },
  { label: "Antelope", speciesId: "pronghorn", param: "Antelope" },
  { label: "Black Bear", speciesId: "black_bear", param: "Other" },
];

// ---------------------------------------------------------------------------
// Montana scraper
// ---------------------------------------------------------------------------

export class MontanaScraper extends BaseScraper {
  stateId = "MT";
  stateName = "Montana";
  sourceUrl = FWP_DRAW_STATS_SEARCH;

  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    // Try to extract unit/district data from the drawing statistics tool
    for (const animal of FWP_ANIMAL_TYPES) {
      try {
        this.log(`Querying FWP drawing statistics for ${animal.label}...`);
        const html = await this.queryFwpStats(animal.param);

        // Parse HTML for district/permit area data
        const districts = this.extractDistricts(html);

        for (const dist of districts) {
          const key = `${animal.speciesId}:${dist.code}`;
          if (seen.has(key)) continue;
          seen.add(key);

          units.push({
            stateId: "MT",
            speciesId: animal.speciesId,
            unitCode: dist.code,
            unitName: dist.name || `District ${dist.code}`,
          });
        }
      } catch (err) {
        this.log(`  ${animal.label} query failed: ${(err as Error).message}`);
      }
    }

    // If AJAX failed, try scraping the main draw stats page
    if (units.length === 0) {
      this.log("AJAX queries failed — scraping main stats page...");
      try {
        const html = await this.fetchPage(FWP_DRAW_STATS_SEARCH);
        const districts = this.extractDistricts(html);

        for (const dist of districts) {
          for (const animal of FWP_ANIMAL_TYPES) {
            const key = `${animal.speciesId}:${dist.code}`;
            if (seen.has(key)) continue;
            seen.add(key);
            units.push({
              stateId: "MT",
              speciesId: animal.speciesId,
              unitCode: dist.code,
              unitName: dist.name || `District ${dist.code}`,
            });
          }
        }
      } catch (err) {
        this.log(`Main page scrape failed: ${(err as Error).message}`);
      }
    }

    this.log(`Extracted ${units.length} MT units`);
    return units;
  }

  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    for (const animal of FWP_ANIMAL_TYPES) {
      try {
        this.log(`Fetching ${animal.label} draw statistics...`);
        const html = await this.queryFwpStats(animal.param);
        const parsed = this.parseDrawStatsHtml(html, animal.speciesId);
        this.log(`  Parsed ${parsed.length} ${animal.label} rows`);
        results.push(...parsed);
      } catch (err) {
        this.log(`  ${animal.label} failed: ${(err as Error).message}`);
      }
    }

    // Fallback: scrape the main stats page HTML
    if (results.length === 0) {
      this.log("AJAX failed — scraping main stats page for any embedded data...");
      try {
        const html = await this.fetchPage(FWP_DRAW_STATS_SEARCH);
        for (const animal of FWP_ANIMAL_TYPES) {
          const parsed = this.parseDrawStatsHtml(html, animal.speciesId);
          results.push(...parsed);
        }
      } catch (err) {
        this.log(`Fallback failed: ${(err as Error).message}`);
      }
    }

    // If still no data, try the FWP info page for downloadable links
    if (results.length === 0) {
      this.log("Trying FWP info page for download links...");
      try {
        const html = await this.fetchPage(
          "https://fwp.mt.gov/buyandapply/hunting-licenses/drawing-statistics"
        );
        const csvLinks = this.extractCsvLinks(html);
        for (const link of csvLinks) {
          try {
            const rows = await this.fetchCsv(link.url);
            if (rows.length > 1) {
              const headers = rows[0].map((h) => h.toLowerCase().trim());
              for (let i = 1; i < rows.length; i++) {
                const row = this.parseCsvRow(rows[i], headers);
                const parsed = this.parseFwpCsvRow(row);
                if (parsed) results.push(parsed);
              }
            }
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }

    this.log(`Total MT draw history rows: ${results.length}`);
    return results;
  }

  // -------------------------------------------------------------------------
  // Internal: query the FWP AJAX endpoint
  // -------------------------------------------------------------------------

  private async queryFwpStats(animalType: string): Promise<string> {
    const params = new URLSearchParams({
      animalType,
      lpt: "",
    });

    const res = await fetch(FWP_STATS_ACTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "HuntPlannerBot/1.0",
        Accept: "text/html,*/*",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: params.toString(),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }

  // -------------------------------------------------------------------------
  // Internal: extract district/area codes from HTML
  // -------------------------------------------------------------------------

  private extractDistricts(html: string): { code: string; name: string }[] {
    const districts: { code: string; name: string }[] = [];
    const seen = new Set<string>();

    // Look for district numbers in various patterns
    const patterns = [
      /District\s+(\d{3})/gi,
      /Permit\s+Area\s+(\d+)/gi,
      /HD\s+(\d{3})/gi,
      /<td[^>]*>\s*(\d{3})\s*<\/td>/gi,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(html)) !== null) {
        const code = match[1];
        if (!seen.has(code)) {
          seen.add(code);
          districts.push({ code, name: `HD ${code}` });
        }
      }
    }

    return districts;
  }

  // -------------------------------------------------------------------------
  // Internal: parse draw statistics from HTML response
  // -------------------------------------------------------------------------

  private parseDrawStatsHtml(
    html: string,
    speciesId: string
  ): ScrapedDrawHistory[] {
    const results: ScrapedDrawHistory[] = [];

    // Look for HTML tables with draw data
    const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];

    for (const table of tables) {
      const headers: string[] = [];
      const thMatches = table.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
      for (const th of thMatches) {
        headers.push(th.replace(/<[^>]*>/g, "").trim().toLowerCase());
      }

      if (headers.length < 3) continue;

      const trMatches = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      for (const tr of trMatches) {
        const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (tdMatches.length < 3) continue;

        const cells = tdMatches.map((td) => td.replace(/<[^>]*>/g, "").trim());
        const row: Record<string, string> = {};
        for (let i = 0; i < headers.length && i < cells.length; i++) {
          row[headers[i]] = cells[i];
        }

        const district =
          row["district"] || row["permit area"] || row["hd"] ||
          row["hunting district"] || row["area"] || "";
        if (!district) continue;

        const applicants = this.num(
          row["applicants"] || row["nr applicants"] || row["total applicants"] ||
          row["number of applicants"]
        );
        const successful = this.num(
          row["successful"] || row["nr successful"] || row["number successful"] ||
          row["permits"] || row["drawn"]
        );
        const successPct = parseFloat(
          (row["success %"] || row["success percentage"] || row["pct"] || "0")
            .replace("%", "")
        ) || 0;

        if (applicants > 0 || successful > 0) {
          results.push({
            unitId: `MT:${speciesId}:${district}`,
            year: parseInt(row["year"] || "2025", 10),
            applicants,
            tags: successful,
            odds: successPct || (applicants > 0 ? Math.round((successful / applicants) * 10000) / 100 : 0),
            minPointsDrawn: row["bonus points"] ? parseInt(row["bonus points"], 10) : null,
          });
        }
      }
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Internal: extract CSV download links from page
  // -------------------------------------------------------------------------

  private extractCsvLinks(html: string): { url: string }[] {
    const links: { url: string }[] = [];
    const pattern = /href=["']([^"']*\.csv[^"']*)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      let href = match[1];
      if (!href.startsWith("http")) href = `https://fwp.mt.gov${href}`;
      links.push({ url: href });
    }
    return links;
  }

  // -------------------------------------------------------------------------
  // Internal: parse FWP CSV row
  // -------------------------------------------------------------------------

  private parseFwpCsvRow(row: Record<string, string>): ScrapedDrawHistory | null {
    const district =
      row["district"] || row["permit area"] || row["hd"] || row["hunting district"] || "";
    if (!district) return null;

    const species = (row["species"] || row["animal"] || "").toLowerCase();
    let speciesId = "elk";
    if (species.includes("deer")) speciesId = "mule_deer";
    else if (species.includes("moose")) speciesId = "moose";
    else if (species.includes("sheep")) speciesId = "bighorn_sheep";
    else if (species.includes("goat")) speciesId = "mountain_goat";
    else if (species.includes("antelope")) speciesId = "pronghorn";
    else if (species.includes("bear")) speciesId = "black_bear";

    const year = parseInt(row["year"] || "0", 10);
    if (!year || year < 2000) return null;

    const applicants = this.num(row["applicants"] || row["nr applicants"]);
    const tags = this.num(row["successful"] || row["drawn"] || row["permits"]);

    return {
      unitId: `MT:${speciesId}:${district}`,
      year,
      applicants,
      tags,
      odds: applicants > 0 ? Math.round((tags / applicants) * 10000) / 100 : 0,
      minPointsDrawn: row["bonus points"] ? parseInt(row["bonus points"], 10) : null,
    };
  }

  private num(val: string | undefined): number {
    if (!val) return 0;
    return parseInt(val.replace(/,/g, "").replace(/\s/g, ""), 10) || 0;
  }

  // =========================================================================
  // FULL-SPECTRUM DATA: Deadlines, Fees, Seasons, Regulations, Leftovers
  // =========================================================================

  /**
   * scrapeDeadlines — pull application deadlines from FWP.
   * FWP publishes application and drawing dates at:
   * https://fwp.mt.gov/buyandapply/hunting-licenses/application-drawing-dates
   */
  async scrapeDeadlines(): Promise<ScrapedDeadline[]> {
    const deadlines: ScrapedDeadline[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping FWP for application deadlines...");
      const urls = [
        "https://fwp.mt.gov/buyandapply/hunting-licenses/application-drawing-dates",
        "https://fwp.mt.gov/buyandapply/hunting-licenses",
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
              if (context.includes("result") || context.includes("drawing date")) deadlineType = "draw_results";
              if (context.includes("leftover") || context.includes("remaining")) deadlineType = "leftover";

              const speciesIds = this.detectSpeciesFromContext(context);
              for (const speciesId of speciesIds) {
                deadlines.push({
                  stateId: "MT",
                  speciesId,
                  deadlineType,
                  date: dateStr,
                  year,
                  notes: context.trim().substring(0, 200),
                });
              }
            }
          }

          // Also parse HTML tables for structured deadline data
          const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
          for (const table of tables) {

            const trs = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
            for (const tr of trs) {
              const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
              if (tds.length < 2) continue;
              const cells = tds.map((td) => td.replace(/<[^>]*>/g, "").trim());

              // Look for rows with date content
              for (const cell of cells) {
                const dateMatch = cell.match(/(\w+\s+\d{1,2},?\s+\d{4})/);
                if (dateMatch) {
                  const rowText = cells.join(" ").toLowerCase();
                  let deadlineType = "application_close";
                  if (rowText.includes("open")) deadlineType = "application_open";
                  if (rowText.includes("result")) deadlineType = "draw_results";

                  const speciesIds = this.detectSpeciesFromContext(rowText);
                  for (const speciesId of speciesIds) {
                    deadlines.push({
                      stateId: "MT",
                      speciesId,
                      deadlineType,
                      date: dateMatch[1],
                      year,
                      notes: rowText.substring(0, 200),
                    });
                  }
                }
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

    this.log(`Found ${deadlines.length} MT deadlines`);
    return deadlines;
  }

  /**
   * scrapeFees — pull license/application fees from FWP.
   * FWP publishes fees on the buy & apply page.
   */
  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    try {
      this.log("Scraping FWP for fee data...");
      const urls = [
        "https://fwp.mt.gov/buyandapply/hunting-licenses",
        "https://fwp.mt.gov/buyandapply",
      ];

      const seen = new Set<string>();

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);

          // Look for dollar amounts with fee labels
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
                : lower.includes("resident") ? "resident" as const
                : "both" as const;

              const speciesId = this.detectSingleSpecies(lower);

              fees.push({
                stateId: "MT",
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

          // Parse HTML tables for structured fee data
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
                        stateId: "MT",
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
          this.log(`  Fee page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Fee scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${fees.length} MT fee entries`);
    return fees;
  }

  /**
   * scrapeSeasons — pull season dates from FWP regulations.
   * FWP publishes regulations with season dates by species.
   */
  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping FWP for season dates...");
      const html = await this.fetchPage("https://fwp.mt.gov/hunt/regulations");

      // Look for season date patterns: "Archery: Sep 1 - Oct 15" or similar
      const seasonPattern = /(archery|muzzleloader|rifle|general|backcountry|shoulder)[^:]*?:\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
      let match: RegExpExecArray | null;

      while ((match = seasonPattern.exec(html)) !== null) {
        const seasonType = match[1].toLowerCase().trim();
        const startDate = match[2];
        const endDate = match[3];
        const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();

        const speciesIds = this.detectSpeciesFromContext(context);
        for (const speciesId of speciesIds) {
          seasons.push({
            stateId: "MT",
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
          : context.includes("general") ? "general"
          : context.includes("backcountry") ? "backcountry"
          : null;

        if (seasonType) {
          const speciesIds = this.detectSpeciesFromContext(context);
          for (const speciesId of speciesIds) {
            seasons.push({
              stateId: "MT",
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

    this.log(`Found ${seasons.length} MT season entries`);
    return seasons;
  }

  /**
   * scrapeRegulations — pull news/announcements from FWP.
   */
  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping FWP for regulation updates...");
      const urls = [
        "https://fwp.mt.gov/hunt/regulations",
        "https://fwp.mt.gov/buyandapply/hunting-licenses",
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
              lower.includes("permit") || lower.includes("quota")
            ) {
              let category = "announcement";
              if (lower.includes("regulation") || lower.includes("rule")) category = "rule_change";
              if (lower.includes("closure") || lower.includes("emergency")) category = "emergency_closure";
              if (lower.includes("leftover")) category = "leftover_tags";

              regs.push({
                stateId: "MT",
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

    this.log(`Found ${regs.length} MT regulation entries`);
    return regs;
  }

  /**
   * scrapeLeftoverTags — pull leftover/remaining tag data from FWP.
   * FWP publishes leftover permits after the main draw.
   */
  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking FWP for leftover tag data...");
      const urls = [
        "https://fwp.mt.gov/buyandapply/hunting-licenses",
        "https://fwp.mt.gov/hunt",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);

          // Look for leftover/remaining permits in HTML tables
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

              const unitCode =
                row["district"] || row["hunting district"] || row["hd"] ||
                row["permit area"] || row["area"] || row["unit"] || "";
              const species = (row["species"] || row["animal"] || "").toLowerCase();
              const speciesId = this.mapMtSpecies(species);
              const tagsAvailable = this.num(
                row["available"] || row["remaining"] || row["leftover"] ||
                row["permits"] || row["tags"]
              );

              if (unitCode && speciesId && tagsAvailable > 0) {
                leftovers.push({
                  stateId: "MT",
                  speciesId,
                  unitCode,
                  tagsAvailable,
                  seasonType: row["season"] || row["type"] || undefined,
                  sourceUrl: url,
                });
              }
            }
          }

          // Look for links to leftover/remaining permit pages
          const linkPattern = /href=["']([^"']*(?:leftover|remaining|unfilled)[^"']*)["']/gi;
          let linkMatch: RegExpExecArray | null;
          while ((linkMatch = linkPattern.exec(html)) !== null) {
            let href = linkMatch[1];
            if (!href.startsWith("http")) href = `https://fwp.mt.gov${href}`;
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

                  const unitCode =
                    row["district"] || row["hd"] || row["permit area"] || row["unit"] || "";
                  const species = (row["species"] || "").toLowerCase();
                  const speciesId = this.mapMtSpecies(species);
                  const tagsAvailable = this.num(row["available"] || row["remaining"] || row["permits"]);

                  if (unitCode && speciesId && tagsAvailable > 0) {
                    leftovers.push({
                      stateId: "MT",
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

    this.log(`Found ${leftovers.length} MT leftover tag entries`);
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
    if (text.includes("bear")) species.push("black_bear");
    // Default to elk if no species detected
    if (species.length === 0) species.push("elk");
    return species;
  }

  private detectSingleSpecies(text: string): string | null {
    if (text.includes("elk")) return "elk";
    if (text.includes("deer") || text.includes("mule")) return "mule_deer";
    if (text.includes("antelope") || text.includes("pronghorn")) return "pronghorn";
    if (text.includes("moose")) return "moose";
    if (text.includes("sheep") || text.includes("bighorn")) return "bighorn_sheep";
    if (text.includes("goat")) return "mountain_goat";
    if (text.includes("bear")) return "black_bear";
    return null;
  }

  private mapMtSpecies(name: string): string | null {
    if (name.includes("elk")) return "elk";
    if (name.includes("deer")) return "mule_deer";
    if (name.includes("moose")) return "moose";
    if (name.includes("sheep")) return "bighorn_sheep";
    if (name.includes("goat")) return "mountain_goat";
    if (name.includes("antelope") || name.includes("pronghorn")) return "pronghorn";
    if (name.includes("bear")) return "black_bear";
    return null;
  }
}
