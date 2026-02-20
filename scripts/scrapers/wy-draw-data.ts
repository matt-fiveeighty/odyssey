/**
 * Wyoming (WGF) Draw Data Scraper
 *
 * Wyoming Game & Fish publishes draw odds as PDF reports and through
 * an interactive draw results portal.
 *
 * Data sources:
 *   - Draw results & odds: https://wgfd.wyo.gov/licenses-applications/draw-results-odds
 *   - Interactive draw results: https://gfdrawresults.wyo.gov/frmSearch.aspx
 *   - PDF draw odds by species: https://wgfd.wyo.gov/media/{id}/download?inline
 *   - Hunt Planner: https://wgfd.wyo.gov/HuntPlanner
 *
 * WY draw system:
 *   - 75% preference / 25% random for most species
 *   - Region-based for elk, area-based for deer
 *   - Separate preference points per species
 *   - NR quota: ~20% of licenses for most species
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

const WGF_DRAW_ODDS_PAGE =
  "https://wgfd.wyo.gov/licenses-applications/draw-results-odds";

/**
 * WGF PDF media IDs for NR draw odds — UPDATE ANNUALLY.
 * Find new IDs by inspecting links on the draw odds page.
 */
const WGF_DRAW_PDFS: {
  label: string;
  speciesId: string;
  nrMediaId: number;
  year: number;
}[] = [
  { label: "Elk Random", speciesId: "elk", nrMediaId: 32693, year: 2025 },
  { label: "Elk Preference", speciesId: "elk", nrMediaId: 32694, year: 2025 },
  { label: "Deer Random", speciesId: "mule_deer", nrMediaId: 32691, year: 2025 },
  { label: "Deer Preference", speciesId: "mule_deer", nrMediaId: 32692, year: 2025 },
  { label: "Moose", speciesId: "moose", nrMediaId: 32690, year: 2025 },
  { label: "Bighorn Sheep", speciesId: "bighorn_sheep", nrMediaId: 32689, year: 2025 },
  { label: "Mountain Goat", speciesId: "mountain_goat", nrMediaId: 32696, year: 2025 },
  { label: "Antelope Random", speciesId: "pronghorn", nrMediaId: 32687, year: 2025 },
  { label: "Antelope Preference", speciesId: "pronghorn", nrMediaId: 32688, year: 2025 },
  { label: "Bison", speciesId: "bison", nrMediaId: 32686, year: 2025 },
];

// ---------------------------------------------------------------------------
// Wyoming scraper
// ---------------------------------------------------------------------------

export class WyomingScraper extends BaseScraper {
  stateId = "WY";
  stateName = "Wyoming";
  sourceUrl = WGF_DRAW_ODDS_PAGE;

  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    // Create unit entries per species from PDF configs
    for (const pdf of WGF_DRAW_PDFS) {
      const key = pdf.speciesId;
      if (seen.has(key)) continue;
      seen.add(key);
      units.push({
        stateId: "WY",
        speciesId: pdf.speciesId,
        unitCode: "statewide",
        unitName: `Wyoming ${pdf.label.replace(/ (Random|Preference)/, "")}`,
      });
    }

    // Try to scrape the draw odds page for actual hunt area data
    try {
      const html = await this.fetchPage(WGF_DRAW_ODDS_PAGE);
      const areaPattern = /Hunt\s+Area\s+(\d+)/gi;
      let match: RegExpExecArray | null;

      while ((match = areaPattern.exec(html)) !== null) {
        const code = match[1];
        for (const pdf of WGF_DRAW_PDFS) {
          const key2 = `${pdf.speciesId}:${code}`;
          if (!seen.has(key2)) {
            seen.add(key2);
            units.push({
              stateId: "WY",
              speciesId: pdf.speciesId,
              unitCode: code,
              unitName: `Hunt Area ${code}`,
            });
          }
        }
      }
    } catch (err) {
      this.log(`Draw odds page scrape failed: ${(err as Error).message}`);
    }

    this.log(`Extracted ${units.length} WY units`);
    return units;
  }

  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    // First: try fetching the draw odds page and extracting any embedded tables
    try {
      this.log("Scraping WGF draw odds page for embedded data...");
      const html = await this.fetchPage(WGF_DRAW_ODDS_PAGE);
      const tableRows = this.parseHtmlTables(html);
      this.log(`  Found ${tableRows.length} table rows from page`);

      for (const row of tableRows) {
        if (row.unitId && row.year) {
          results.push(row);
        }
      }
    } catch (err) {
      this.log(`Page scrape failed: ${(err as Error).message}`);
    }

    // Second: try downloading and parsing PDF data
    for (const pdf of WGF_DRAW_PDFS) {
      const url = `https://wgfd.wyo.gov/media/${pdf.nrMediaId}/download?inline`;
      try {
        this.log(`Fetching ${pdf.label} NR odds: ${url}`);
        const text = await this.fetchPage(url);
        const parsed = this.extractDrawDataFromText(text, pdf.speciesId, pdf.year);
        this.log(`  Extracted ${parsed.length} rows from ${pdf.label}`);
        results.push(...parsed);
      } catch (err) {
        this.log(`  ${pdf.label} fetch failed: ${(err as Error).message}`);
        // Create placeholder entry
        results.push({
          unitId: `WY:${pdf.speciesId}:statewide`,
          year: pdf.year,
          applicants: 0,
          tags: 0,
          odds: 0,
          minPointsDrawn: null,
        });
      }
    }

    this.log(`Total WY draw history rows: ${results.length}`);
    return results;
  }

  // -------------------------------------------------------------------------
  // Internal: extract draw data from text content (PDF or HTML)
  // -------------------------------------------------------------------------

  private extractDrawDataFromText(
    text: string,
    speciesId: string,
    year: number
  ): ScrapedDrawHistory[] {
    const results: ScrapedDrawHistory[] = [];
    const lines = text.split("\n");

    // Pattern: lines starting with a number (hunt area), followed by numeric data
    // WGF PDFs typically: Area | LicType | Quota | 1stChoice | TotalApps | Drawn | Odds | MinPts
    const areaLine = /^\s*(\d{1,3})\s+/;

    for (const line of lines) {
      const match = areaLine.exec(line);
      if (!match) continue;

      const nums = line.match(/[\d,]+\.?\d*/g);
      if (!nums || nums.length < 3) continue;

      const area = match[1];
      const cleanNums = nums.map((n) => parseInt(n.replace(/,/g, ""), 10));

      // Skip if area number is impossibly large (probably not a hunt area)
      if (cleanNums[0] > 999) continue;

      // Heuristic: look for applicants/tags pattern
      // Usually: area, quota, apps, drawn
      const apps = cleanNums.length >= 4 ? cleanNums[3] : cleanNums[2];
      const tags = cleanNums.length >= 4 ? cleanNums[2] : cleanNums[1];

      if (apps > 0) {
        results.push({
          unitId: `WY:${speciesId}:${area}`,
          year,
          applicants: apps,
          tags: tags,
          odds: apps > 0 ? Math.round((tags / apps) * 10000) / 100 : 0,
          minPointsDrawn: cleanNums.length >= 6 ? cleanNums[5] : null,
        });
      }
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Internal: parse HTML tables from the draw odds page
  // -------------------------------------------------------------------------

  private parseHtmlTables(
    html: string
  ): ScrapedDrawHistory[] {
    const results: ScrapedDrawHistory[] = [];

    // Look for <table> elements with draw data
    const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];

    for (const table of tables) {
      // Extract headers
      const headers: string[] = [];
      const thMatches = table.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
      for (const th of thMatches) {
        headers.push(th.replace(/<[^>]*>/g, "").trim().toLowerCase());
      }

      if (headers.length < 3) continue;

      // Extract rows
      const trMatches = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      for (const tr of trMatches) {
        const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (tdMatches.length < 3) continue;

        const cells = tdMatches.map((td) => td.replace(/<[^>]*>/g, "").trim());
        const row: Record<string, string> = {};
        for (let i = 0; i < headers.length && i < cells.length; i++) {
          row[headers[i]] = cells[i];
        }

        // Try to identify species and area from the row
        const area = row["hunt area"] || row["area"] || row["unit"] || "";
        const species = (row["species"] || row["animal"] || "").toLowerCase();
        const speciesId = this.mapSpecies(species);

        if (area && speciesId) {
          const year = parseInt(row["year"] || "2025", 10);
          results.push({
            unitId: `WY:${speciesId}:${area}`,
            year,
            applicants: this.num(row["applicants"] || row["nr apps"] || row["total apps"]),
            tags: this.num(row["tags"] || row["licenses"] || row["drawn"]),
            odds: parseFloat(row["odds"] || row["success"] || "0") || 0,
            minPointsDrawn: row["min points"] ? parseInt(row["min points"], 10) : null,
          });
        }
      }
    }

    return results;
  }

  private mapSpecies(name: string): string | null {
    if (name.includes("elk")) return "elk";
    if (name.includes("deer")) return "mule_deer";
    if (name.includes("antelope") || name.includes("pronghorn")) return "pronghorn";
    if (name.includes("moose")) return "moose";
    if (name.includes("sheep")) return "bighorn_sheep";
    if (name.includes("goat")) return "mountain_goat";
    if (name.includes("bison")) return "bison";
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
   * scrapeDeadlines — pull application deadlines from WGF.
   * WGF publishes key dates on the preference points and draw pages.
   */
  async scrapeDeadlines(): Promise<ScrapedDeadline[]> {
    const deadlines: ScrapedDeadline[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping WGF for application deadlines...");
      const urls = [
        "https://wgfd.wyo.gov/hunting-trapping/preference-points",
        WGF_DRAW_ODDS_PAGE,
        "https://wgfd.wyo.gov/licenses-applications",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);

          // Look for date patterns (Month Day, Year or MM/DD/YYYY)
          const datePatterns = [
            /(?:application|deadline|opens?|closes?|due|draw\s+results?|preference\s+point)[^.]*?(\w+\s+\d{1,2},?\s+\d{4})/gi,
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
              if (context.includes("leftover") || context.includes("remaining"))
                deadlineType = "leftover";

              const speciesIds = this.detectSpeciesFromContext(context);
              for (const speciesId of speciesIds) {
                deadlines.push({
                  stateId: "WY",
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

    this.log(`Found ${deadlines.length} WY deadlines`);
    return deadlines;
  }

  /**
   * scrapeFees — pull license/application fees from WGF.
   *
   * Strategy:
   *   1. Emit structured per-species tag costs (with speciesId) from verified data
   *   2. Emit license-level fees (app fee, qualifying license, point fees) without speciesId
   *   3. Fall back to generic regex scraping if live page fetch succeeds
   *
   * WGF fee pages:
   *   - wgfd.wyo.gov/hunting-trapping/fees
   *   - eRegulations: wyoming.huntinfoweb.com
   */
  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    // -----------------------------------------------------------------
    // 1. Structured per-species tag costs (verified from WGF fee tables)
    // -----------------------------------------------------------------
    const nrTagCosts: { speciesId: string; label: string; amount: number }[] = [
      { speciesId: "elk", label: "NR Elk Tag", amount: 692 },
      { speciesId: "mule_deer", label: "NR Deer Tag", amount: 374 },
      { speciesId: "black_bear", label: "NR Bear Tag", amount: 373 },
      { speciesId: "moose", label: "NR Moose Tag", amount: 2752 },
      { speciesId: "pronghorn", label: "NR Pronghorn Tag", amount: 326 },
      { speciesId: "bighorn_sheep", label: "NR Bighorn Sheep Tag", amount: 3002 },
      { speciesId: "mountain_goat", label: "NR Mountain Goat Tag", amount: 2752 },
      { speciesId: "bison", label: "NR Bison Tag", amount: 6002 },
      { speciesId: "mountain_lion", label: "NR Mountain Lion Tag", amount: 373 },
      { speciesId: "wolf", label: "NR Wolf Tag", amount: 187 },
    ];

    const rTagCosts: { speciesId: string; label: string; amount: number }[] = [
      { speciesId: "elk", label: "Resident Elk Tag", amount: 56 },
      { speciesId: "mule_deer", label: "Resident Deer Tag", amount: 42 },
      { speciesId: "black_bear", label: "Resident Bear Tag", amount: 42 },
      { speciesId: "moose", label: "Resident Moose Tag", amount: 375 },
      { speciesId: "pronghorn", label: "Resident Pronghorn Tag", amount: 32 },
      { speciesId: "bighorn_sheep", label: "Resident Bighorn Sheep Tag", amount: 402 },
      { speciesId: "mountain_goat", label: "Resident Mountain Goat Tag", amount: 375 },
      { speciesId: "bison", label: "Resident Bison Tag", amount: 402 },
      { speciesId: "mountain_lion", label: "Resident Mountain Lion Tag", amount: 32 },
      { speciesId: "wolf", label: "Resident Wolf Tag", amount: 19 },
    ];

    for (const tag of nrTagCosts) {
      fees.push({
        stateId: "WY",
        feeName: tag.label,
        amount: tag.amount,
        residency: "nonresident",
        speciesId: tag.speciesId,
        frequency: "per_species",
        notes: "WGF nonresident tag cost",
      });
    }

    for (const tag of rTagCosts) {
      fees.push({
        stateId: "WY",
        feeName: tag.label,
        amount: tag.amount,
        residency: "resident",
        speciesId: tag.speciesId,
        frequency: "per_species",
        notes: "WGF resident tag cost",
      });
    }

    // -----------------------------------------------------------------
    // 2. License-level fees (no speciesId)
    // -----------------------------------------------------------------
    fees.push({
      stateId: "WY",
      feeName: "NR Qualifying License",
      amount: 315,
      residency: "nonresident",
      frequency: "annual",
      notes: "Required NR conservation stamp / game & fish license",
    });

    fees.push({
      stateId: "WY",
      feeName: "Application Fee",
      amount: 15,
      residency: "both",
      frequency: "per_species",
      notes: "Per-species application processing fee",
    });

    // WY has per-species preference point fees (no speciesId here — these are
    // informational and the point fee in syncFeesToRefStates uses the general one)
    fees.push({
      stateId: "WY",
      feeName: "Preference Point Fee",
      amount: 52,
      residency: "nonresident",
      frequency: "per_species",
      notes: "NR elk PP $52, deer $41, pronghorn $31, moose/sheep/goat $150",
    });

    // -----------------------------------------------------------------
    // 3. Live-scrape fallback: try to extract updated fees from WGF pages
    // -----------------------------------------------------------------
    try {
      this.log("Attempting live fee scrape from WGF pages...");
      const seen = new Set<string>();
      for (const f of fees) {
        seen.add(`${f.amount}:${f.feeName.substring(0, 30)}`);
      }

      const urls = [
        "https://wgfd.wyo.gov/hunting-trapping/fees",
        "https://wgfd.wyo.gov/licenses-applications",
      ];

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
                : lower.includes("resident") ? "resident" as const
                : "both" as const;

              const speciesId = this.detectSingleSpecies(lower);

              fees.push({
                stateId: "WY",
                feeName: label.substring(0, 100),
                amount,
                residency,
                speciesId: speciesId ?? undefined,
                frequency: lower.includes("per species") ? "per_species"
                  : lower.includes("annual") ? "annual" : "one_time",
                notes: `Live-scraped from ${url}`,
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
                        stateId: "WY",
                        feeName: feeName.substring(0, 100),
                        amount,
                        residency: lower.includes("nonresident") ? "nonresident"
                          : lower.includes("resident") ? "resident" : "both",
                        speciesId: this.detectSingleSpecies(lower) ?? undefined,
                        frequency: "annual",
                        notes: `Live-scraped from ${url}`,
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          this.log(`  Live scrape failed for ${url}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Live fee scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${fees.length} WY fee entries`);
    return fees;
  }

  /**
   * scrapeSeasons — pull season dates from WGF regulations.
   * WGF publishes season dates in hunting regulations PDFs and on species pages.
   */
  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping WGF for season dates...");
      const html = await this.fetchPage("https://wgfd.wyo.gov/hunting-trapping/regulations");

      // Look for season date patterns: "Archery: Sep 1-30" or "September 1 - October 31"
      const seasonPattern = /(archery|muzzleloader|rifle|general|any\s+weapon)[^:]*?:\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
      let match: RegExpExecArray | null;

      while ((match = seasonPattern.exec(html)) !== null) {
        const seasonType = match[1].toLowerCase().trim();
        const startDate = match[2];
        const endDate = match[3];
        const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();

        const speciesIds = this.detectSpeciesFromContext(context);
        for (const speciesId of speciesIds) {
          seasons.push({
            stateId: "WY",
            speciesId,
            seasonType,
            startDate,
            endDate,
            year,
          });
        }
      }

      // Also look for date ranges in table cells (Month DD - Month DD format)
      const rangePat = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
      while ((match = rangePat.exec(html)) !== null) {
        const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();
        // Only include if context mentions a season type
        const seasonType = context.includes("archery") ? "archery"
          : context.includes("muzzleloader") ? "muzzleloader"
          : context.includes("rifle") ? "rifle"
          : context.includes("general") ? "general"
          : null;

        if (seasonType) {
          const speciesIds = this.detectSpeciesFromContext(context);
          for (const speciesId of speciesIds) {
            seasons.push({
              stateId: "WY",
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

    this.log(`Found ${seasons.length} WY season entries`);
    return seasons;
  }

  /**
   * scrapeRegulations — pull news/announcements from WGF.
   */
  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping WGF for regulation updates...");
      const urls = [
        "https://wgfd.wyo.gov/hunting-trapping",
        "https://wgfd.wyo.gov/hunting-trapping/regulations",
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
              lower.includes("season") || lower.includes("emergency")
            ) {
              let category = "announcement";
              if (lower.includes("regulation") || lower.includes("rule")) category = "rule_change";
              if (lower.includes("closure") || lower.includes("emergency")) category = "emergency_closure";
              if (lower.includes("leftover")) category = "leftover_tags";

              regs.push({
                stateId: "WY",
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

    this.log(`Found ${regs.length} WY regulation entries`);
    return regs;
  }

  /**
   * scrapeLeftoverTags — pull leftover/remaining tag data from WGF.
   * WGF publishes leftover licenses on the draw results page after the draw.
   */
  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking WGF for leftover tag data...");
      const urls = [
        "https://wgfd.wyo.gov/licenses-applications/draw-results-odds",
        "https://wgfd.wyo.gov/licenses-applications",
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

              const unitCode = row["hunt area"] || row["area"] || row["unit"] || "";
              const species = (row["species"] || row["animal"] || "").toLowerCase();
              const speciesId = this.mapSpecies(species);
              const tagsAvailable = this.num(
                row["available"] || row["remaining"] || row["leftover"] || row["tags"]
              );

              if (unitCode && speciesId && tagsAvailable > 0) {
                leftovers.push({
                  stateId: "WY",
                  speciesId,
                  unitCode,
                  tagsAvailable,
                  seasonType: row["season"] || row["type"] || undefined,
                  sourceUrl: url,
                });
              }
            }
          }

          // Also look for links to leftover/remaining license lists
          const linkPattern = /href=["']([^"']*(?:leftover|remaining)[^"']*)["']/gi;
          let linkMatch: RegExpExecArray | null;
          while ((linkMatch = linkPattern.exec(html)) !== null) {
            let href = linkMatch[1];
            if (!href.startsWith("http")) href = `https://wgfd.wyo.gov${href}`;
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

                  const unitCode = row["hunt area"] || row["area"] || row["unit"] || "";
                  const species = (row["species"] || "").toLowerCase();
                  const speciesId = this.mapSpecies(species);
                  const tagsAvailable = this.num(row["available"] || row["remaining"] || row["tags"]);

                  if (unitCode && speciesId && tagsAvailable > 0) {
                    leftovers.push({
                      stateId: "WY",
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

    this.log(`Found ${leftovers.length} WY leftover tag entries`);
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
    if (text.includes("bison") || text.includes("buffalo")) species.push("bison");
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
    if (text.includes("bison") || text.includes("buffalo")) return "bison";
    return null;
  }
}
