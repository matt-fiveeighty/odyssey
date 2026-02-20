/**
 * North Dakota (NDGF) Draw Data Scraper
 *
 * North Dakota Game and Fish Department provides lottery/draw statistics
 * through their website and online application system.
 *
 * Data sources:
 *   - Hunting: https://gf.nd.gov/hunting
 *   - Lottery info: https://gf.nd.gov/hunting/lottery
 *   - Draw results: https://gf.nd.gov/hunting/lottery/results
 *   - Big game: https://gf.nd.gov/hunting/big-game
 *   - Licenses/fees: https://gf.nd.gov/licenses
 *   - Regulations: https://gf.nd.gov/hunting/regulations
 *
 * ND draw system:
 *   - Lottery system with preference points for some species
 *   - Elk is once-in-lifetime draw for NR
 *   - Moose and bighorn are ultra-limited
 *   - Deer lottery separate from elk/moose
 *   - "Any-legal-weapon" deer is the primary draw
 *
 * Species available:
 *   elk, mule_deer, whitetail, pronghorn, moose, bighorn_sheep
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

const NDGF_BASE = "https://gf.nd.gov";
const NDGF_HUNTING = `${NDGF_BASE}/hunting`;
const NDGF_LOTTERY = `${NDGF_BASE}/hunting/lottery`;
const NDGF_LOTTERY_RESULTS = `${NDGF_BASE}/hunting/lottery/results`;
const NDGF_BIG_GAME = `${NDGF_BASE}/hunting/big-game`;
const NDGF_LICENSES = `${NDGF_BASE}/licenses`;

/** Species available in ND lottery draws */
const ND_SPECIES: { name: string; speciesId: string; keywords: string[] }[] = [
  { name: "Elk", speciesId: "elk", keywords: ["elk"] },
  { name: "Mule Deer", speciesId: "mule_deer", keywords: ["mule deer", "mule"] },
  { name: "Whitetail", speciesId: "whitetail", keywords: ["whitetail", "white-tail", "white tail"] },
  { name: "Pronghorn", speciesId: "pronghorn", keywords: ["pronghorn", "antelope"] },
  { name: "Moose", speciesId: "moose", keywords: ["moose"] },
  { name: "Bighorn Sheep", speciesId: "bighorn_sheep", keywords: ["bighorn", "sheep"] },
];

const QUERY_YEARS = [2025, 2024, 2023];

// ---------------------------------------------------------------------------
// North Dakota scraper
// ---------------------------------------------------------------------------

export class NorthDakotaScraper extends BaseScraper {
  stateId = "ND";
  stateName = "North Dakota";
  sourceUrl = NDGF_LOTTERY;

  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    try {
      this.log("Scraping NDGF for hunting units...");

      // Strategy 1: Parse lottery page
      const html = await this.fetchPage(NDGF_LOTTERY);
      const tableUnits = this.parseUnitsFromHtml(html);
      for (const u of tableUnits) {
        const key = `${u.speciesId}:${u.unitCode}`;
        if (!seen.has(key)) { seen.add(key); units.push(u); }
      }

      // Strategy 2: Big game page
      try {
        const bgHtml = await this.fetchPage(NDGF_BIG_GAME);
        const bgUnits = this.parseUnitsFromHtml(bgHtml);
        for (const u of bgUnits) {
          const key = `${u.speciesId}:${u.unitCode}`;
          if (!seen.has(key)) { seen.add(key); units.push(u); }
        }
      } catch (err) {
        this.log(`Big game page failed: ${(err as Error).message}`);
      }

      // Strategy 3: Lottery results page
      try {
        const resHtml = await this.fetchPage(NDGF_LOTTERY_RESULTS);
        const resUnits = this.parseUnitsFromHtml(resHtml);
        for (const u of resUnits) {
          const key = `${u.speciesId}:${u.unitCode}`;
          if (!seen.has(key)) { seen.add(key); units.push(u); }
        }
      } catch (err) {
        this.log(`Lottery results page failed: ${(err as Error).message}`);
      }
    } catch (err) {
      this.log(`Unit scrape failed: ${(err as Error).message}`);
    }

    this.log(`Extracted ${units.length} ND units`);
    return units;
  }

  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    try {
      this.log("Scraping NDGF lottery results...");

      // Strategy 1: Parse lottery results page
      const html = await this.fetchPage(NDGF_LOTTERY_RESULTS);
      const tableResults = this.parseDrawFromHtml(html);
      results.push(...tableResults);

      // Strategy 2: Try the main lottery page
      if (results.length === 0) {
        const lottoHtml = await this.fetchPage(NDGF_LOTTERY);
        const lottoResults = this.parseDrawFromHtml(lottoHtml);
        results.push(...lottoResults);
      }

      // Strategy 3: Look for year-specific result pages
      if (results.length === 0) {
        for (const year of QUERY_YEARS) {
          try {
            const yearUrl = `${NDGF_LOTTERY_RESULTS}/${year}`;
            const yearHtml = await this.fetchPage(yearUrl);
            const yearResults = this.parseDrawFromHtml(yearHtml, year);
            results.push(...yearResults);
            if (yearResults.length > 0) break;
          } catch { /* try next year */ }
        }
      }

      // Strategy 4: CSV downloads
      if (results.length === 0) {
        this.log("Trying to find downloadable data...");
        const allHtml = await this.fetchPage(NDGF_LOTTERY_RESULTS);
        const csvLinks = this.extractDownloadLinks(allHtml, [".csv", ".xlsx", ".xls"]);
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

    this.log(`Total ND draw history rows: ${results.length}`);
    return results;
  }

  // =========================================================================
  // Optional data collection methods
  // =========================================================================

  async scrapeDeadlines(): Promise<ScrapedDeadline[]> {
    const deadlines: ScrapedDeadline[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping NDGF deadlines...");
      const urls = [NDGF_LOTTERY, NDGF_HUNTING, NDGF_BIG_GAME];

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

    this.log(`Found ${deadlines.length} ND deadlines`);
    return deadlines;
  }

  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    // -------------------------------------------------------------------
    // 1. Structured, verified fee data (primary source of truth)
    //    Source: https://gf.nd.gov/licenses
    //    Note: elk, moose, pronghorn are RESIDENT-ONLY in ND.
    //    NR tag cost is set to $0 for those species.
    // -------------------------------------------------------------------

    // License-level fees (no speciesId)
    fees.push(
      { stateId: "ND", feeName: "NR Hunting License", amount: 220, residency: "nonresident", frequency: "annual" },
      { stateId: "ND", feeName: "Application Fee", amount: 5, residency: "nonresident", frequency: "per_species" },
      { stateId: "ND", feeName: "Preference Point Fee", amount: 0, residency: "nonresident", frequency: "per_species", notes: "No separate point fee in ND" },
    );

    // NR per-species tag costs (elk/moose/pronghorn = $0 because resident-only)
    const nrTags: Record<string, number> = {
      mule_deer: 355, whitetail: 355, bighorn_sheep: 600,
      elk: 0, moose: 0, pronghorn: 0,
    };
    for (const [speciesId, amount] of Object.entries(nrTags)) {
      fees.push({
        stateId: "ND", feeName: `NR ${speciesId.replace(/_/g, " ")} tag`, amount,
        residency: "nonresident", speciesId, frequency: "per_species",
        notes: amount === 0 ? "Resident-only draw; NR not eligible" : undefined,
      });
    }

    // R per-species tag costs
    const rTags: Record<string, number> = {
      mule_deer: 30, whitetail: 30, bighorn_sheep: 200,
      elk: 30, moose: 30, pronghorn: 30,
    };
    for (const [speciesId, amount] of Object.entries(rTags)) {
      fees.push({
        stateId: "ND", feeName: `R ${speciesId.replace(/_/g, " ")} tag`, amount,
        residency: "resident", speciesId, frequency: "per_species",
      });
    }

    this.log(`Emitted ${fees.length} structured ND fee entries`);

    // -------------------------------------------------------------------
    // 2. Fallback: scrape the NDGF licenses page for any additional fees
    // -------------------------------------------------------------------
    try {
      this.log("Scraping NDGF licenses page for additional data...");
      const html = await this.fetchPage(NDGF_LICENSES);
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
            stateId: "ND",
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

      const tableFees = this.parseFeeTablesFromHtml(html);
      for (const f of tableFees) {
        const key = `${f.amount}:${f.feeName.substring(0, 30)}`;
        if (!seen.has(key)) { seen.add(key); fees.push(f); }
      }
    } catch (err) {
      this.log(`Fee page scrape failed (fallback): ${(err as Error).message}`);
    }

    this.log(`Found ${fees.length} total ND fee entries`);
    return fees;
  }

  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping NDGF season dates...");
      const html = await this.fetchPage(NDGF_HUNTING);

      const seasonPattern = /(archery|muzzleloader|rifle|firearm|general|any.?legal)[^:]*?:\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
      let match: RegExpExecArray | null;

      while ((match = seasonPattern.exec(html)) !== null) {
        const seasonType = match[1].toLowerCase().trim();
        const startDate = match[2];
        const endDate = match[3];
        const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();

        const speciesIds = this.detectSpeciesFromContext(context);
        for (const speciesId of speciesIds) {
          seasons.push({ stateId: "ND", speciesId, seasonType, startDate, endDate, year });
        }
      }
    } catch (err) {
      this.log(`Season scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${seasons.length} ND season entries`);
    return seasons;
  }

  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping NDGF regulation updates...");
      const url = `${NDGF_BASE}/hunting/regulations`;
      const html = await this.fetchPage(url);
      const found = this.extractRegulationsFromHtml(html, url);
      regs.push(...found);
    } catch (err) {
      this.log(`Regulation scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${regs.length} ND regulation entries`);
    return regs;
  }

  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking NDGF for leftover tags...");
      const urls = [NDGF_LOTTERY_RESULTS, NDGF_LOTTERY];

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

    this.log(`Found ${leftovers.length} ND leftover tags`);
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

        const unitCode = row["unit"] || row["area"] || row["zone"] || row["permit"] || cells[0] || "";
        if (!unitCode || unitCode.length > 30) continue;

        const context = Object.values(row).join(" ").toLowerCase();
        const speciesId = this.detectSingleSpecies(context) || "mule_deer";

        units.push({
          stateId: "ND",
          speciesId,
          unitCode: unitCode.trim(),
          unitName: row["name"] || row["description"] || `Unit ${unitCode}`,
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

        const unitCode = row["unit"] || row["area"] || row["zone"] || cells[0] || "";
        if (!unitCode) continue;

        const context = Object.values(row).join(" ").toLowerCase();
        const speciesId = this.detectSingleSpecies(context) || "mule_deer";
        const year = this.num(row["year"]) || defaultYear || new Date().getFullYear();
        const applicants = this.num(row["applicants"] || row["applications"] || row["1st choice"]);
        const tags = this.num(row["permits"] || row["tags"] || row["licenses"]);
        const oddsStr = row["odds"] || row["success"] || row["draw odds"] || "";
        const odds = parseFloat(oddsStr.replace(/%/g, "")) || (applicants > 0 ? Math.round((tags / applicants) * 10000) / 100 : 0);

        if (applicants > 0 || tags > 0) {
          results.push({ unitId: `ND:${speciesId}:${unitCode}`, year, applicants, tags, odds, minPointsDrawn: null });
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
      const unitCode = row["unit"] || row["area"] || row["zone"] || "";
      if (!unitCode) continue;

      const species = (row["species"] || row["animal"] || "").toLowerCase();
      const speciesId = this.detectSingleSpecies(species) || "mule_deer";

      results.push({
        unitId: `ND:${speciesId}:${unitCode}`,
        year: this.num(row["year"]) || new Date().getFullYear(),
        applicants: this.num(row["applicants"] || row["applications"]),
        tags: this.num(row["permits"] || row["tags"]),
        odds: parseFloat(row["odds"] || "0") || 0,
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
        links.push(href.startsWith("http") ? href : `${NDGF_BASE}${href}`);
      }
    }
    return links;
  }

  private extractDeadlinesFromHtml(html: string, year: number): ScrapedDeadline[] {
    const deadlines: ScrapedDeadline[] = [];
    const datePatterns = [
      /(?:application|deadline|opens?|closes?|due|draw\s+results?|lottery)[^.]*?(\w+\s+\d{1,2},?\s+\d{4})/gi,
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
          deadlines.push({ stateId: "ND", speciesId, deadlineType, date: dateStr, year, notes: context.trim().substring(0, 200) });
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
                stateId: "ND", feeName: feeName.substring(0, 100), amount: amt,
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
        lower.includes("update") || lower.includes("draw") ||
        lower.includes("lottery") || lower.includes("season") ||
        lower.includes("emergency")
      ) {
        let category = "announcement";
        if (lower.includes("regulation") || lower.includes("rule")) category = "rule_change";
        if (lower.includes("closure") || lower.includes("emergency")) category = "emergency_closure";
        if (lower.includes("leftover")) category = "leftover_tags";

        regs.push({ stateId: "ND", title: text.substring(0, 200), summary: text, sourceUrl, category });
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

        const unitCode = row["unit"] || row["area"] || row["zone"] || cells[0] || "";
        const available = parseInt((row["available"] || row["remaining"] || "0").replace(/,/g, ""), 10);
        const context = Object.values(row).join(" ").toLowerCase();
        const speciesId = this.detectSingleSpecies(context) || "mule_deer";

        if (unitCode && available > 0) {
          leftovers.push({ stateId: "ND", speciesId, unitCode, tagsAvailable: available, sourceUrl });
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
    for (const s of ND_SPECIES) {
      if (s.keywords.some((kw) => text.includes(kw))) species.push(s.speciesId);
    }
    if (species.length === 0) species.push("mule_deer");
    return species;
  }

  private detectSingleSpecies(text: string): string | null {
    for (const s of ND_SPECIES) {
      if (s.keywords.some((kw) => text.includes(kw))) return s.speciesId;
    }
    return null;
  }

  private num(val: string | number | undefined): number {
    if (!val) return 0;
    return parseInt(String(val).replace(/,/g, "").replace(/\s/g, ""), 10) || 0;
  }
}
