/**
 * Idaho (IDFG) Draw Data Scraper
 *
 * Idaho Department of Fish and Game provides controlled hunt draw odds
 * through a REST API at their Hunt Planner tool.
 *
 * Data sources:
 *   - Hunt Planner: https://idfg.idaho.gov/ifwis/huntplanner/
 *   - Drawing Odds API: https://idfg.idaho.gov/ifwis/huntplanner/api/1.1/odds/
 *   - Controlled hunt info: https://idfg.idaho.gov/hunt/controlled
 *   - Draw results: https://idfg.idaho.gov/licenses/tag/controlled/results
 *   - GIS data: https://data-idfggis.opendata.arcgis.com/
 *
 * ID draw system:
 *   - Pure random draw for controlled hunts — NO point system
 *   - General season: NR hunting license IS your tag for most zones
 *   - Controlled hunts are per-unit draw
 *   - Very early deadline (December!) — easiest to miss
 *   - Spring bear is a separate application window (April)
 *
 * API Details:
 *   Endpoint: /api/1.1/odds/
 *   Params: GameAnimal, Year, DrawChoice
 *   Response: { response, msg, total, rows: [...] }
 *   Export: JSON, XML, CSV, TXT, Excel
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
// URL & API constants
// ---------------------------------------------------------------------------

const IDFG_HUNT_PLANNER = "https://idfg.idaho.gov/ifwis/huntplanner/";
const IDFG_ODDS_API = "https://idfg.idaho.gov/ifwis/huntplanner/api/1.1/odds/";

/** Game animals available in the IDFG API */
const IDFG_ANIMALS: { apiName: string; speciesId: string }[] = [
  { apiName: "Elk", speciesId: "elk" },
  { apiName: "Deer", speciesId: "mule_deer" },
  { apiName: "Moose", speciesId: "moose" },
  { apiName: "Bighorn Sheep", speciesId: "bighorn_sheep" },
  { apiName: "Mountain Goat", speciesId: "mountain_goat" },
  { apiName: "Pronghorn", speciesId: "pronghorn" },
  { apiName: "Black Bear", speciesId: "black_bear" },
  { apiName: "Mountain Lion", speciesId: "mountain_lion" },
  { apiName: "Wolf", speciesId: "wolf" },
];

/** Years to query (most recent data available) */
const QUERY_YEARS = [2025, 2024, 2023];

// ---------------------------------------------------------------------------
// Idaho scraper
// ---------------------------------------------------------------------------

export class IdahoScraper extends BaseScraper {
  stateId = "ID";
  stateName = "Idaho";
  sourceUrl = IDFG_HUNT_PLANNER;

  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    // Query the API for each species to discover hunt areas
    for (const animal of IDFG_ANIMALS) {
      for (const year of QUERY_YEARS) {
        try {
          const data = await this.queryOddsApi(animal.apiName, year);
          if (!data.rows || data.rows.length === 0) continue;

          for (const row of data.rows) {
            const unitCode = this.extractUnitCode(row);
            if (!unitCode) continue;

            const key = `${animal.speciesId}:${unitCode}`;
            if (seen.has(key)) continue;
            seen.add(key);

            units.push({
              stateId: "ID",
              speciesId: animal.speciesId,
              unitCode,
              unitName: row.HuntAreaDescription || row.HuntArea || `Zone ${unitCode}`,
            });
          }

          // If we got data for this year, no need to try older years
          if (data.rows.length > 0) break;
        } catch (err) {
          this.log(`API query failed for ${animal.apiName} ${year}: ${(err as Error).message}`);
        }
      }
    }

    this.log(`Extracted ${units.length} ID units from API`);
    return units;
  }

  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    for (const animal of IDFG_ANIMALS) {
      for (const year of QUERY_YEARS) {
        try {
          this.log(`Querying IDFG API: ${animal.apiName} ${year}...`);
          const data = await this.queryOddsApi(animal.apiName, year);

          if (!data.rows || data.rows.length === 0) {
            this.log(`  No data for ${animal.apiName} ${year}`);
            continue;
          }

          this.log(`  Got ${data.rows.length} rows for ${animal.apiName} ${year}`);

          for (const row of data.rows) {
            const unitCode = this.extractUnitCode(row);
            if (!unitCode) continue;

            const applicants = this.num(row.TotalApplicants || row.Applicants || row.NumApplicants);
            const tags = this.num(row.Tags || row.Permits || row.NumPermits || row.Quota);
            const odds = parseFloat(row.DrawOdds || row.Odds || row.PercentDrawn || "0") || 0;

            results.push({
              unitId: `ID:${animal.speciesId}:${unitCode}`,
              year,
              applicants,
              tags,
              odds: odds || (applicants > 0 ? Math.round((tags / applicants) * 10000) / 100 : 0),
              minPointsDrawn: null, // ID has no point system
            });
          }
        } catch (err) {
          this.log(`  API error for ${animal.apiName} ${year}: ${(err as Error).message}`);
        }
      }
    }

    // Fallback: try CSV export from the API
    if (results.length === 0) {
      this.log("API JSON queries returned no data — trying CSV export...");
      for (const animal of IDFG_ANIMALS) {
        for (const year of QUERY_YEARS) {
          try {
            const csvUrl = `${IDFG_ODDS_API}?GameAnimal=${encodeURIComponent(animal.apiName)}&Year=${year}&format=csv`;
            const rows = await this.fetchCsv(csvUrl);
            if (rows.length > 1) {
              const headers = rows[0].map((h) => h.toLowerCase().trim());
              for (let i = 1; i < rows.length; i++) {
                const row = this.parseCsvRow(rows[i], headers);
                const unitCode = row["hunt area"] || row["zone"] || row["unit"] || "";
                if (!unitCode) continue;

                results.push({
                  unitId: `ID:${animal.speciesId}:${unitCode}`,
                  year,
                  applicants: this.num(row["applicants"] || row["total applicants"]),
                  tags: this.num(row["tags"] || row["permits"]),
                  odds: parseFloat(row["draw odds"] || row["odds"] || "0") || 0,
                  minPointsDrawn: null,
                });
              }
            }
          } catch { /* skip */ }
        }
      }
    }

    // Last resort: scrape the HTML hunt planner page
    if (results.length === 0) {
      this.log("Trying HTML scrape of hunt planner...");
      try {
        const html = await this.fetchPage(IDFG_HUNT_PLANNER);
        const tableData = this.parseHtmlTables(html);
        results.push(...tableData);
      } catch { /* skip */ }
    }

    this.log(`Total ID draw history rows: ${results.length}`);
    return results;
  }

  // -------------------------------------------------------------------------
  // Internal: query the IDFG odds API
  // -------------------------------------------------------------------------

  private async queryOddsApi(
    gameAnimal: string,
    year: number
  ): Promise<{ response: string; total: number; rows: Record<string, string>[] }> {
    const url = `${IDFG_ODDS_API}?GameAnimal=${encodeURIComponent(gameAnimal)}&Year=${year}&DrawChoice=1st+Choice`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "HuntPlannerBot/1.0",
        Accept: "application/json",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data;
  }

  // -------------------------------------------------------------------------
  // Internal: extract unit/zone code from API row
  // -------------------------------------------------------------------------

  private extractUnitCode(row: Record<string, string>): string {
    return (
      row.HuntArea ||
      row.Zone ||
      row.Unit ||
      row.ControlledHuntNumber ||
      row.HuntNumber ||
      ""
    ).trim();
  }

  // -------------------------------------------------------------------------
  // Internal: parse HTML tables
  // -------------------------------------------------------------------------

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
        const unit = row["hunt area"] || row["zone"] || row["unit"] || "";
        if (!unit) continue;
        const species = (row["species"] || row["animal"] || "elk").toLowerCase();
        let speciesId = "elk";
        if (species.includes("deer")) speciesId = "mule_deer";
        else if (species.includes("moose")) speciesId = "moose";
        else if (species.includes("sheep")) speciesId = "bighorn_sheep";
        else if (species.includes("goat")) speciesId = "mountain_goat";
        else if (species.includes("pronghorn")) speciesId = "pronghorn";
        else if (species.includes("bear")) speciesId = "black_bear";

        results.push({
          unitId: `ID:${speciesId}:${unit}`,
          year: parseInt(row["year"] || "2025", 10),
          applicants: this.num(row["applicants"]),
          tags: this.num(row["tags"] || row["permits"]),
          odds: parseFloat(row["odds"] || "0") || 0,
          minPointsDrawn: null,
        });
      }
    }
    return results;
  }

  private num(val: string | number | undefined): number {
    if (!val) return 0;
    return parseInt(String(val).replace(/,/g, "").replace(/\s/g, ""), 10) || 0;
  }

  // =========================================================================
  // FULL-SPECTRUM DATA: Deadlines, Fees, Seasons, Regulations, Leftovers
  // =========================================================================

  async scrapeDeadlines(): Promise<ScrapedDeadline[]> {
    const deadlines: ScrapedDeadline[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping IDFG for application deadlines...");
      const urls = [
        "https://idfg.idaho.gov/hunt/controlled",
        "https://idfg.idaho.gov/hunt",
        IDFG_HUNT_PLANNER,
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
              if (context.includes("spring bear")) deadlineType = "spring_bear_close";

              const speciesIds = this.detectSpeciesFromContext(context);
              for (const speciesId of speciesIds) {
                deadlines.push({ stateId: "ID", speciesId, deadlineType, date: dateStr, year, notes: context.trim().substring(0, 200) });
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

    this.log(`Found ${deadlines.length} ID deadlines`);
    return deadlines;
  }

  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    try {
      this.log("Scraping IDFG for fee data...");
      const urls = [
        "https://idfg.idaho.gov/licenses",
        "https://idfg.idaho.gov/hunt",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
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
              fees.push({
                stateId: "ID",
                feeName: label.substring(0, 100),
                amount,
                residency: lower.includes("nonresident") || lower.includes("non-resident")
                  ? "nonresident" : lower.includes("resident") ? "resident" : "both",
                speciesId: this.detectSingleSpecies(lower) ?? undefined,
                frequency: lower.includes("per species") ? "per_species"
                  : lower.includes("annual") ? "annual" : "one_time",
                notes: label,
              });
            }
          }

          // Parse HTML tables
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
                  const amt = parseFloat(dollarMatch[1].replace(/,/g, ""));
                  const feeName = cells.filter((c) => c !== cell && c.length > 3)[0] || "";
                  if (amt > 0 && feeName) {
                    const key = `${amt}:${feeName.substring(0, 30)}`;
                    if (!seen.has(key)) {
                      seen.add(key);
                      fees.push({
                        stateId: "ID", feeName: feeName.substring(0, 100), amount: amt,
                        residency: feeName.toLowerCase().includes("nonresident") ? "nonresident" : "both",
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

    this.log(`Found ${fees.length} ID fee entries`);
    return fees;
  }

  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping IDFG for season dates...");
      const html = await this.fetchPage("https://idfg.idaho.gov/hunt");

      const seasonPattern = /(archery|muzzleloader|rifle|general|any\s+weapon|short\s+range)[^:]*?:\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
      let match: RegExpExecArray | null;

      while ((match = seasonPattern.exec(html)) !== null) {
        const seasonType = match[1].toLowerCase().trim();
        const startDate = match[2];
        const endDate = match[3];
        const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();

        const speciesIds = this.detectSpeciesFromContext(context);
        for (const speciesId of speciesIds) {
          seasons.push({ stateId: "ID", speciesId, seasonType, startDate, endDate, year });
        }
      }
    } catch (err) {
      this.log(`Season scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${seasons.length} ID season entries`);
    return seasons;
  }

  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping IDFG for regulation updates...");
      const urls = [
        "https://idfg.idaho.gov/hunt",
        "https://idfg.idaho.gov/hunt/controlled",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
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
              lower.includes("rule") || lower.includes("draw") ||
              lower.includes("season") || lower.includes("emergency")
            ) {
              let category = "announcement";
              if (lower.includes("regulation") || lower.includes("rule")) category = "rule_change";
              if (lower.includes("closure") || lower.includes("emergency")) category = "emergency_closure";
              if (lower.includes("leftover")) category = "leftover_tags";

              regs.push({ stateId: "ID", title: text.substring(0, 200), summary: text, sourceUrl: url, category });
            }
          }
        } catch (err) {
          this.log(`  Regulation page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Regulation scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${regs.length} ID regulation entries`);
    return regs;
  }

  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking IDFG for leftover tag data...");
      const urls = [
        "https://idfg.idaho.gov/licenses/tag/controlled/results",
        "https://idfg.idaho.gov/hunt/controlled",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
          for (const table of tables) {
            const lower = table.toLowerCase();
            if (!lower.includes("leftover") && !lower.includes("remaining") && !lower.includes("available") && !lower.includes("second")) continue;

            const ths = table.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
            const headers = ths.map((th) => th.replace(/<[^>]*>/g, "").trim().toLowerCase());
            const trs = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

            for (const tr of trs) {
              const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
              if (tds.length < 2) continue;
              const cells = tds.map((td) => td.replace(/<[^>]*>/g, "").trim());
              const row: Record<string, string> = {};
              for (let i = 0; i < headers.length && i < cells.length; i++) row[headers[i]] = cells[i];

              const unitCode = row["hunt area"] || row["zone"] || row["unit"] || row["hunt"] || cells[0] || "";
              const available = parseInt((row["available"] || row["remaining"] || row["tags"] || "0").replace(/,/g, ""), 10);
              const species = (row["species"] || row["animal"] || "").toLowerCase();
              const speciesId = this.detectSingleSpecies(species) || "elk";

              if (unitCode && available > 0) {
                leftovers.push({ stateId: "ID", speciesId, unitCode, tagsAvailable: available, sourceUrl: url });
              }
            }
          }
        } catch (err) {
          this.log(`  Leftover page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Leftover tag scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${leftovers.length} ID leftover tags`);
    return leftovers;
  }

  private detectSpeciesFromContext(text: string): string[] {
    const species: string[] = [];
    if (text.includes("elk")) species.push("elk");
    if (text.includes("deer") || text.includes("mule")) species.push("mule_deer");
    if (text.includes("moose")) species.push("moose");
    if (text.includes("sheep") || text.includes("bighorn")) species.push("bighorn_sheep");
    if (text.includes("goat")) species.push("mountain_goat");
    if (text.includes("pronghorn") || text.includes("antelope")) species.push("pronghorn");
    if (text.includes("bear")) species.push("black_bear");
    if (text.includes("lion") || text.includes("cougar")) species.push("mountain_lion");
    if (text.includes("wolf")) species.push("wolf");
    if (species.length === 0) species.push("elk");
    return species;
  }

  private detectSingleSpecies(text: string): string | null {
    if (text.includes("elk")) return "elk";
    if (text.includes("deer") || text.includes("mule")) return "mule_deer";
    if (text.includes("moose")) return "moose";
    if (text.includes("sheep")) return "bighorn_sheep";
    if (text.includes("goat")) return "mountain_goat";
    if (text.includes("pronghorn") || text.includes("antelope")) return "pronghorn";
    if (text.includes("bear")) return "black_bear";
    if (text.includes("lion")) return "mountain_lion";
    if (text.includes("wolf")) return "wolf";
    return null;
  }
}
