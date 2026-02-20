/**
 * Washington (WDFW) Draw Data Scraper
 *
 * Washington Department of Fish and Wildlife provides special permit hunt
 * draw statistics through their website.
 *
 * Data sources:
 *   - Special permits: https://wdfw.wa.gov/hunting/permits/special-permits
 *   - Draw results: https://wdfw.wa.gov/hunting/permits/special-permits/draw-results
 *   - Hunting seasons: https://wdfw.wa.gov/hunting/seasons
 *   - Licensing fees: https://wdfw.wa.gov/licenses/fees
 *
 * WA draw system:
 *   - Random draw with preference points for some species
 *   - Special permits required for specific GMUs and species
 *   - Spring bear is separate application
 *   - Master Hunter permits available for certain hunts
 *
 * Species available:
 *   elk, mule_deer, blacktail, moose, mountain_goat, bighorn_sheep,
 *   black_bear, mountain_lion
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

const WDFW_BASE = "https://wdfw.wa.gov";
const WDFW_SPECIAL_PERMITS = `${WDFW_BASE}/hunting/permits/special-permits`;
const WDFW_DRAW_RESULTS = `${WDFW_BASE}/hunting/permits/special-permits/draw-results`;
const WDFW_SEASONS = `${WDFW_BASE}/hunting/seasons`;
const WDFW_FEES = `${WDFW_BASE}/licenses/fees`;

/** Species available in WA special permit draws */
const WA_SPECIES: { name: string; speciesId: string; keywords: string[] }[] = [
  { name: "Elk", speciesId: "elk", keywords: ["elk"] },
  { name: "Mule Deer", speciesId: "mule_deer", keywords: ["mule deer", "mule"] },
  { name: "Blacktail Deer", speciesId: "blacktail", keywords: ["blacktail", "black-tail", "black tail"] },
  { name: "Moose", speciesId: "moose", keywords: ["moose"] },
  { name: "Mountain Goat", speciesId: "mountain_goat", keywords: ["mountain goat", "goat"] },
  { name: "Bighorn Sheep", speciesId: "bighorn_sheep", keywords: ["bighorn", "sheep"] },
  { name: "Black Bear", speciesId: "black_bear", keywords: ["bear"] },
  { name: "Mountain Lion", speciesId: "mountain_lion", keywords: ["cougar", "mountain lion", "lion"] },
];

const QUERY_YEARS = [2025, 2024, 2023];

// ---------------------------------------------------------------------------
// Washington scraper
// ---------------------------------------------------------------------------

export class WashingtonScraper extends BaseScraper {
  stateId = "WA";
  stateName = "Washington";
  sourceUrl = WDFW_SPECIAL_PERMITS;

  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    try {
      this.log("Scraping WDFW special permit hunt areas...");

      // Strategy 1: Parse the special permits page for GMU/hunt area info
      const html = await this.fetchPage(WDFW_SPECIAL_PERMITS);
      const tableUnits = this.parseUnitsFromHtml(html);
      for (const u of tableUnits) {
        const key = `${u.speciesId}:${u.unitCode}`;
        if (!seen.has(key)) {
          seen.add(key);
          units.push(u);
        }
      }

      // Strategy 2: Try draw results page for additional units
      try {
        const drawHtml = await this.fetchPage(WDFW_DRAW_RESULTS);
        const drawUnits = this.parseUnitsFromHtml(drawHtml);
        for (const u of drawUnits) {
          const key = `${u.speciesId}:${u.unitCode}`;
          if (!seen.has(key)) {
            seen.add(key);
            units.push(u);
          }
        }
      } catch (err) {
        this.log(`Draw results page fetch failed: ${(err as Error).message}`);
      }
    } catch (err) {
      this.log(`Unit scrape failed: ${(err as Error).message}`);
    }

    this.log(`Extracted ${units.length} WA units`);
    return units;
  }

  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    try {
      this.log("Scraping WDFW draw results...");

      // Strategy 1: Parse draw results page
      const html = await this.fetchPage(WDFW_DRAW_RESULTS);
      const tableResults = this.parseDrawFromHtml(html);
      results.push(...tableResults);

      // Strategy 2: Try year-specific pages
      if (results.length === 0) {
        for (const year of QUERY_YEARS) {
          try {
            const yearUrl = `${WDFW_DRAW_RESULTS}/${year}`;
            const yearHtml = await this.fetchPage(yearUrl);
            const yearResults = this.parseDrawFromHtml(yearHtml, year);
            results.push(...yearResults);
            if (yearResults.length > 0) break;
          } catch { /* try next year */ }
        }
      }

      // Strategy 3: Look for downloadable CSV/Excel files
      if (results.length === 0) {
        this.log("Trying to find CSV/Excel downloads...");
        const html2 = await this.fetchPage(WDFW_DRAW_RESULTS);
        const csvLinks = this.extractDownloadLinks(html2, [".csv", ".xlsx", ".xls"]);
        for (const link of csvLinks.slice(0, 5)) {
          try {
            if (link.endsWith(".csv")) {
              const rows = await this.fetchCsv(link);
              if (rows.length > 1) {
                const parsed = this.parseCsvDrawData(rows);
                results.push(...parsed);
              }
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      this.log(`Draw history scrape failed: ${(err as Error).message}`);
    }

    this.log(`Total WA draw history rows: ${results.length}`);
    return results;
  }

  // =========================================================================
  // Optional: Deadlines, Fees, Seasons, Regulations, Leftovers
  // =========================================================================

  async scrapeDeadlines(): Promise<ScrapedDeadline[]> {
    const deadlines: ScrapedDeadline[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping WDFW deadlines...");
      const urls = [WDFW_SPECIAL_PERMITS, `${WDFW_BASE}/hunting`];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const found = this.extractDeadlinesFromHtml(html, year);
          deadlines.push(...found);
        } catch (err) {
          this.log(`  Deadline page failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Deadline scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${deadlines.length} WA deadlines`);
    return deadlines;
  }

  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    // -------------------------------------------------------------------
    // 1. Structured, verified fee data (primary source of truth)
    //    Source: https://wdfw.wa.gov/licenses/fees
    // -------------------------------------------------------------------

    // License-level fees (no speciesId)
    fees.push(
      { stateId: "WA", feeName: "NR Big Game Combo License", amount: 1188.04, residency: "nonresident", frequency: "annual" },
      { stateId: "WA", feeName: "Application Fee", amount: 152.30, residency: "nonresident", frequency: "per_species" },
      { stateId: "WA", feeName: "Preference Point Fee", amount: 0, residency: "nonresident", frequency: "per_species", notes: "No separate point fee in WA" },
    );

    // NR per-species tag costs
    const nrTags: Record<string, number> = {
      elk: 685.60, mule_deer: 599.07, whitetail: 599.07, black_bear: 461.10,
      moose: 2279, pronghorn: 599.07, bighorn_sheep: 2279, mountain_goat: 2279,
    };
    for (const [speciesId, amount] of Object.entries(nrTags)) {
      fees.push({
        stateId: "WA", feeName: `NR ${speciesId.replace(/_/g, " ")} tag`, amount,
        residency: "nonresident", speciesId, frequency: "per_species",
      });
    }

    // R per-species tag costs
    const rTags: Record<string, number> = {
      elk: 79.40, mule_deer: 44.90, whitetail: 44.90, black_bear: 24.50,
      moose: 326, pronghorn: 44.90, bighorn_sheep: 326, mountain_goat: 326,
    };
    for (const [speciesId, amount] of Object.entries(rTags)) {
      fees.push({
        stateId: "WA", feeName: `R ${speciesId.replace(/_/g, " ")} tag`, amount,
        residency: "resident", speciesId, frequency: "per_species",
      });
    }

    this.log(`Emitted ${fees.length} structured WA fee entries`);

    // -------------------------------------------------------------------
    // 2. Fallback: scrape the WDFW fees page for any additional fees
    // -------------------------------------------------------------------
    try {
      this.log("Scraping WDFW fees page for additional data...");
      const html = await this.fetchPage(WDFW_FEES);
      const feePattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:[-–]|for|per)?\s*([^<\n]{5,80})/gi;
      let match: RegExpExecArray | null;
      const seen = new Set<string>(fees.map((f) => `${f.amount}:${f.feeName.substring(0, 30)}`));

      while ((match = feePattern.exec(html)) !== null) {
        const amount = parseFloat(match[1].replace(/,/g, ""));
        const label = match[2].replace(/<[^>]*>/g, "").trim();

        if (amount > 0 && amount < 10000 && label.length > 3) {
          const key = `${amount}:${label.substring(0, 30)}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const lower = label.toLowerCase();
          fees.push({
            stateId: "WA",
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

      // Also parse tables on the fees page
      const tableFees = this.parseFeeTablesFromHtml(html);
      for (const f of tableFees) {
        const key = `${f.amount}:${f.feeName.substring(0, 30)}`;
        if (!seen.has(key)) {
          seen.add(key);
          fees.push(f);
        }
      }
    } catch (err) {
      this.log(`Fee page scrape failed (fallback): ${(err as Error).message}`);
    }

    this.log(`Found ${fees.length} total WA fee entries`);
    return fees;
  }

  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping WDFW season dates...");
      const html = await this.fetchPage(WDFW_SEASONS);

      const seasonPattern = /(archery|muzzleloader|rifle|modern|general|any\s+weapon)[^:]*?:\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
      let match: RegExpExecArray | null;

      while ((match = seasonPattern.exec(html)) !== null) {
        const seasonType = match[1].toLowerCase().trim();
        const startDate = match[2];
        const endDate = match[3];
        const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();

        const speciesIds = this.detectSpeciesFromContext(context);
        for (const speciesId of speciesIds) {
          seasons.push({ stateId: "WA", speciesId, seasonType, startDate, endDate, year });
        }
      }
    } catch (err) {
      this.log(`Season scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${seasons.length} WA season entries`);
    return seasons;
  }

  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping WDFW regulation updates...");
      const urls = [WDFW_SPECIAL_PERMITS, `${WDFW_BASE}/hunting`];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const found = this.extractRegulationsFromHtml(html, url);
          regs.push(...found);
        } catch (err) {
          this.log(`  Regulation page failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Regulation scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${regs.length} WA regulation entries`);
    return regs;
  }

  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking WDFW for leftover permits...");
      const urls = [
        `${WDFW_BASE}/hunting/permits/special-permits/leftover`,
        WDFW_DRAW_RESULTS,
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const found = this.extractLeftoversFromHtml(html, url);
          leftovers.push(...found);
        } catch (err) {
          this.log(`  Leftover page failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Leftover scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${leftovers.length} WA leftover permits`);
    return leftovers;
  }

  // =========================================================================
  // Internal parsing helpers
  // =========================================================================

  private parseUnitsFromHtml(html: string): ScrapedUnit[] {
    const units: ScrapedUnit[] = [];
    const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];

    for (const table of tables) {
      const headers: string[] = [];
      const ths = table.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
      for (const th of ths) headers.push(th.replace(/<[^>]*>/g, "").trim().toLowerCase());
      if (headers.length < 2) continue;

      const trs = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      for (const tr of trs) {
        const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (tds.length < 2) continue;
        const cells = tds.map((td) => td.replace(/<[^>]*>/g, "").trim());
        const row: Record<string, string> = {};
        for (let i = 0; i < headers.length && i < cells.length; i++) row[headers[i]] = cells[i];

        const unitCode = row["gmu"] || row["unit"] || row["area"] || row["hunt"] || row["permit"] || cells[0] || "";
        if (!unitCode || unitCode.length > 30) continue;

        const context = (Object.values(row).join(" ") + " " + tr).toLowerCase();
        const speciesId = this.detectSingleSpecies(context) || "elk";

        units.push({
          stateId: "WA",
          speciesId,
          unitCode: unitCode.trim(),
          unitName: row["name"] || row["description"] || row["area name"] || `GMU ${unitCode}`,
        });
      }
    }

    return units;
  }

  private parseDrawFromHtml(html: string, defaultYear?: number): ScrapedDrawHistory[] {
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

        const unitCode = row["gmu"] || row["unit"] || row["hunt"] || row["area"] || row["permit"] || cells[0] || "";
        if (!unitCode) continue;

        const context = Object.values(row).join(" ").toLowerCase();
        const speciesId = this.detectSingleSpecies(context) || "elk";
        const year = this.num(row["year"]) || defaultYear || new Date().getFullYear();
        const applicants = this.num(row["applicants"] || row["applications"] || row["total applicants"]);
        const tags = this.num(row["permits"] || row["tags"] || row["available"] || row["quota"]);
        const oddsStr = row["odds"] || row["success"] || row["draw odds"] || row["percent"] || "";
        const odds = parseFloat(oddsStr.replace(/%/g, "")) || (applicants > 0 ? Math.round((tags / applicants) * 10000) / 100 : 0);

        if (applicants > 0 || tags > 0) {
          results.push({
            unitId: `WA:${speciesId}:${unitCode}`,
            year,
            applicants,
            tags,
            odds,
            minPointsDrawn: null,
          });
        }
      }
    }

    return results;
  }

  private parseCsvDrawData(rows: string[][]): ScrapedDrawHistory[] {
    const results: ScrapedDrawHistory[] = [];
    if (rows.length < 2) return results;

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    for (let i = 1; i < rows.length; i++) {
      const row = this.parseCsvRow(rows[i], headers);
      const unitCode = row["gmu"] || row["unit"] || row["hunt area"] || row["hunt"] || "";
      if (!unitCode) continue;

      const species = (row["species"] || row["animal"] || "").toLowerCase();
      const speciesId = this.detectSingleSpecies(species) || "elk";

      results.push({
        unitId: `WA:${speciesId}:${unitCode}`,
        year: this.num(row["year"]) || new Date().getFullYear(),
        applicants: this.num(row["applicants"] || row["applications"]),
        tags: this.num(row["permits"] || row["tags"]),
        odds: parseFloat(row["odds"] || row["success rate"] || "0") || 0,
        minPointsDrawn: null,
      });
    }

    return results;
  }

  private extractDownloadLinks(html: string, extensions: string[]): string[] {
    const links: string[] = [];
    const pattern = /href=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const href = match[1];
      if (extensions.some((ext) => href.toLowerCase().endsWith(ext))) {
        links.push(href.startsWith("http") ? href : `${WDFW_BASE}${href}`);
      }
    }
    return links;
  }

  private extractDeadlinesFromHtml(html: string, year: number): ScrapedDeadline[] {
    const deadlines: ScrapedDeadline[] = [];
    const datePatterns = [
      /(?:application|deadline|opens?|closes?|due|draw\s+results?|special\s+permit)[^.]*?(\w+\s+\d{1,2},?\s+\d{4})/gi,
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
          deadlines.push({ stateId: "WA", speciesId, deadlineType, date: dateStr, year, notes: context.trim().substring(0, 200) });
        }
      }
    }

    return deadlines;
  }

  private parseFeeTablesFromHtml(html: string): ScrapedFee[] {
    const fees: ScrapedFee[] = [];
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
              fees.push({
                stateId: "WA", feeName: feeName.substring(0, 100), amount: amt,
                residency: feeName.toLowerCase().includes("nonresident") ? "nonresident" : "both",
                frequency: "annual",
              });
            }
          }
        }
      }
    }

    return fees;
  }

  private extractRegulationsFromHtml(html: string, sourceUrl: string): ScrapedRegulation[] {
    const regs: ScrapedRegulation[] = [];
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
        lower.includes("season") || lower.includes("emergency")
      ) {
        let category = "announcement";
        if (lower.includes("regulation") || lower.includes("rule")) category = "rule_change";
        if (lower.includes("closure") || lower.includes("emergency")) category = "emergency_closure";
        if (lower.includes("leftover")) category = "leftover_tags";

        regs.push({ stateId: "WA", title: text.substring(0, 200), summary: text, sourceUrl, category });
      }
    }

    return regs;
  }

  private extractLeftoversFromHtml(html: string, sourceUrl: string): ScrapedLeftoverTag[] {
    const leftovers: ScrapedLeftoverTag[] = [];
    const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];

    for (const table of tables) {
      const lower = table.toLowerCase();
      if (!lower.includes("leftover") && !lower.includes("remaining") && !lower.includes("available")) continue;

      const ths = table.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
      const headers = ths.map((th) => th.replace(/<[^>]*>/g, "").trim().toLowerCase());
      const trs = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

      for (const tr of trs) {
        const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (tds.length < 2) continue;
        const cells = tds.map((td) => td.replace(/<[^>]*>/g, "").trim());
        const row: Record<string, string> = {};
        for (let i = 0; i < headers.length && i < cells.length; i++) row[headers[i]] = cells[i];

        const unitCode = row["gmu"] || row["unit"] || row["hunt"] || cells[0] || "";
        const available = parseInt((row["available"] || row["remaining"] || row["permits"] || "0").replace(/,/g, ""), 10);
        const context = Object.values(row).join(" ").toLowerCase();
        const speciesId = this.detectSingleSpecies(context) || "elk";

        if (unitCode && available > 0) {
          leftovers.push({ stateId: "WA", speciesId, unitCode, tagsAvailable: available, sourceUrl });
        }
      }
    }

    return leftovers;
  }

  // =========================================================================
  // Species detection helpers
  // =========================================================================

  private detectSpeciesFromContext(text: string): string[] {
    const species: string[] = [];
    for (const s of WA_SPECIES) {
      if (s.keywords.some((kw) => text.includes(kw))) species.push(s.speciesId);
    }
    if (species.length === 0) species.push("elk");
    return species;
  }

  private detectSingleSpecies(text: string): string | null {
    for (const s of WA_SPECIES) {
      if (s.keywords.some((kw) => text.includes(kw))) return s.speciesId;
    }
    return null;
  }

  private num(val: string | number | undefined): number {
    if (!val) return 0;
    return parseInt(String(val).replace(/,/g, "").replace(/\s/g, ""), 10) || 0;
  }
}
