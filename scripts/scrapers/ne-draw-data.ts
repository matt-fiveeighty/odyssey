/**
 * Nebraska (NGPC) Draw Data Scraper
 *
 * Nebraska Game and Parks Commission provides draw statistics through
 * their website and downloadable reports.
 *
 * Data sources:
 *   - Big game draw: https://outdoornebraska.gov/big-game-draw/
 *   - Draw results: https://outdoornebraska.gov/hunting/big-game/draw-results/
 *   - Hunting guide: https://outdoornebraska.gov/hunting/
 *   - Fees: https://outdoornebraska.gov/permits-and-licenses/fees/
 *   - Regulations: https://outdoornebraska.gov/hunting/regulations/
 *
 * NE draw system:
 *   - Preference point system for elk, bighorn sheep
 *   - Random draw for most deer/pronghorn
 *   - Limited permits for elk (Sandhills, Pine Ridge)
 *   - River deer/turkey units, and special antlerless permits
 *
 * Species available:
 *   elk, mule_deer, whitetail, pronghorn, bighorn_sheep
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

const NGPC_BASE = "https://outdoornebraska.gov";
const NGPC_BIG_GAME = `${NGPC_BASE}/big-game-draw/`;
const NGPC_DRAW_RESULTS = `${NGPC_BASE}/hunting/big-game/draw-results/`;
const NGPC_HUNTING = `${NGPC_BASE}/hunting/`;
const NGPC_FEES = `${NGPC_BASE}/permits-and-licenses/fees/`;

/** Species available in NE draws */
const NE_SPECIES: { name: string; speciesId: string; keywords: string[] }[] = [
  { name: "Elk", speciesId: "elk", keywords: ["elk"] },
  { name: "Mule Deer", speciesId: "mule_deer", keywords: ["mule deer", "mule"] },
  { name: "Whitetail", speciesId: "whitetail", keywords: ["whitetail", "white-tail", "white tail"] },
  { name: "Pronghorn", speciesId: "pronghorn", keywords: ["pronghorn", "antelope"] },
  { name: "Bighorn Sheep", speciesId: "bighorn_sheep", keywords: ["bighorn", "sheep"] },
];

const QUERY_YEARS = [2025, 2024, 2023];

// ---------------------------------------------------------------------------
// Nebraska scraper
// ---------------------------------------------------------------------------

export class NebraskaScraper extends BaseScraper {
  stateId = "NE";
  stateName = "Nebraska";
  sourceUrl = NGPC_BIG_GAME;

  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    try {
      this.log("Scraping NGPC for hunting units...");

      // Strategy 1: Parse big game draw page
      const html = await this.fetchPage(NGPC_BIG_GAME);
      const tableUnits = this.parseUnitsFromHtml(html);
      for (const u of tableUnits) {
        const key = `${u.speciesId}:${u.unitCode}`;
        if (!seen.has(key)) { seen.add(key); units.push(u); }
      }

      // Strategy 2: Try draw results page
      try {
        const drawHtml = await this.fetchPage(NGPC_DRAW_RESULTS);
        const drawUnits = this.parseUnitsFromHtml(drawHtml);
        for (const u of drawUnits) {
          const key = `${u.speciesId}:${u.unitCode}`;
          if (!seen.has(key)) { seen.add(key); units.push(u); }
        }
      } catch (err) {
        this.log(`Draw results page failed: ${(err as Error).message}`);
      }
    } catch (err) {
      this.log(`Unit scrape failed: ${(err as Error).message}`);
    }

    this.log(`Extracted ${units.length} NE units`);
    return units;
  }

  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    try {
      this.log("Scraping NGPC draw results...");

      // Strategy 1: Parse draw results page
      const html = await this.fetchPage(NGPC_DRAW_RESULTS);
      const tableResults = this.parseDrawFromHtml(html);
      results.push(...tableResults);

      // Strategy 2: Try big game draw page
      if (results.length === 0) {
        const bgHtml = await this.fetchPage(NGPC_BIG_GAME);
        const bgResults = this.parseDrawFromHtml(bgHtml);
        results.push(...bgResults);
      }

      // Strategy 3: Look for CSV downloads
      if (results.length === 0) {
        this.log("Trying to find downloadable data...");
        const allHtml = await this.fetchPage(NGPC_DRAW_RESULTS);
        const csvLinks = this.extractDownloadLinks(allHtml, [".csv", ".xlsx", ".pdf"]);
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

    this.log(`Total NE draw history rows: ${results.length}`);
    return results;
  }

  // =========================================================================
  // Optional data collection methods
  // =========================================================================

  async scrapeDeadlines(): Promise<ScrapedDeadline[]> {
    const deadlines: ScrapedDeadline[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping NGPC deadlines...");
      const urls = [NGPC_BIG_GAME, NGPC_HUNTING];

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

    this.log(`Found ${deadlines.length} NE deadlines`);
    return deadlines;
  }

  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    // -------------------------------------------------------------------
    // 1. Structured, verified fee data (primary source of truth)
    //    Source: https://outdoornebraska.gov/permits-and-licenses/fees/
    // -------------------------------------------------------------------

    // License-level fees (no speciesId)
    fees.push(
      { stateId: "NE", feeName: "NR Hunting License", amount: 120, residency: "nonresident", frequency: "annual" },
      { stateId: "NE", feeName: "Application Fee", amount: 8, residency: "nonresident", frequency: "per_species" },
      { stateId: "NE", feeName: "Preference Point Fee", amount: 0, residency: "nonresident", frequency: "per_species", notes: "No separate point fee in NE" },
    );

    // NR per-species tag costs
    const nrTags: Record<string, number> = {
      elk: 542, mule_deer: 335, whitetail: 335, pronghorn: 241, bighorn_sheep: 1500,
    };
    for (const [speciesId, amount] of Object.entries(nrTags)) {
      fees.push({
        stateId: "NE", feeName: `NR ${speciesId.replace(/_/g, " ")} tag`, amount,
        residency: "nonresident", speciesId, frequency: "per_species",
      });
    }

    // R per-species tag costs
    const rTags: Record<string, number> = {
      elk: 30, mule_deer: 25, whitetail: 25, pronghorn: 25, bighorn_sheep: 200,
    };
    for (const [speciesId, amount] of Object.entries(rTags)) {
      fees.push({
        stateId: "NE", feeName: `R ${speciesId.replace(/_/g, " ")} tag`, amount,
        residency: "resident", speciesId, frequency: "per_species",
      });
    }

    this.log(`Emitted ${fees.length} structured NE fee entries`);

    // -------------------------------------------------------------------
    // 2. Fallback: scrape the NGPC fees page for any additional fees
    // -------------------------------------------------------------------
    try {
      this.log("Scraping NGPC fees page for additional data...");
      const html = await this.fetchPage(NGPC_FEES);
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
            stateId: "NE",
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

      // Parse table-based fee data
      const tableFees = this.parseFeeTablesFromHtml(html);
      for (const f of tableFees) {
        const key = `${f.amount}:${f.feeName.substring(0, 30)}`;
        if (!seen.has(key)) { seen.add(key); fees.push(f); }
      }
    } catch (err) {
      this.log(`Fee page scrape failed (fallback): ${(err as Error).message}`);
    }

    this.log(`Found ${fees.length} total NE fee entries`);
    return fees;
  }

  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping NGPC season dates...");
      const html = await this.fetchPage(NGPC_HUNTING);

      const seasonPattern = /(archery|muzzleloader|rifle|firearm|general|november)[^:]*?:\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
      let match: RegExpExecArray | null;

      while ((match = seasonPattern.exec(html)) !== null) {
        const seasonType = match[1].toLowerCase().trim();
        const startDate = match[2];
        const endDate = match[3];
        const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();

        const speciesIds = this.detectSpeciesFromContext(context);
        for (const speciesId of speciesIds) {
          seasons.push({ stateId: "NE", speciesId, seasonType, startDate, endDate, year });
        }
      }
    } catch (err) {
      this.log(`Season scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${seasons.length} NE season entries`);
    return seasons;
  }

  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping NGPC regulation updates...");
      const url = `${NGPC_BASE}/hunting/regulations/`;
      const html = await this.fetchPage(url);
      const found = this.extractRegulationsFromHtml(html, url);
      regs.push(...found);
    } catch (err) {
      this.log(`Regulation scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${regs.length} NE regulation entries`);
    return regs;
  }

  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking NGPC for leftover permits...");
      const urls = [NGPC_BIG_GAME, NGPC_DRAW_RESULTS];

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

    this.log(`Found ${leftovers.length} NE leftover permits`);
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

        const unitCode = row["unit"] || row["area"] || row["permit"] || row["hunt"] || cells[0] || "";
        if (!unitCode || unitCode.length > 30) continue;

        const context = Object.values(row).join(" ").toLowerCase();
        const speciesId = this.detectSingleSpecies(context) || "mule_deer";

        units.push({
          stateId: "NE",
          speciesId,
          unitCode: unitCode.trim(),
          unitName: row["name"] || row["description"] || row["unit name"] || `Unit ${unitCode}`,
        });
      }
    }

    return units;
  }

  private parseDrawFromHtml(html: string): ScrapedDrawHistory[] {
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

        const unitCode = row["unit"] || row["area"] || row["permit"] || cells[0] || "";
        if (!unitCode) continue;

        const context = Object.values(row).join(" ").toLowerCase();
        const speciesId = this.detectSingleSpecies(context) || "mule_deer";
        const year = this.num(row["year"]) || new Date().getFullYear();
        const applicants = this.num(row["applicants"] || row["applications"]);
        const tags = this.num(row["permits"] || row["tags"] || row["available"]);
        const oddsStr = row["odds"] || row["success"] || row["draw odds"] || "";
        const odds = parseFloat(oddsStr.replace(/%/g, "")) || (applicants > 0 ? Math.round((tags / applicants) * 10000) / 100 : 0);

        if (applicants > 0 || tags > 0) {
          results.push({ unitId: `NE:${speciesId}:${unitCode}`, year, applicants, tags, odds, minPointsDrawn: null });
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
      const unitCode = row["unit"] || row["area"] || row["hunt"] || "";
      if (!unitCode) continue;

      const species = (row["species"] || row["animal"] || "").toLowerCase();
      const speciesId = this.detectSingleSpecies(species) || "mule_deer";

      results.push({
        unitId: `NE:${speciesId}:${unitCode}`,
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
        links.push(href.startsWith("http") ? href : `${NGPC_BASE}${href}`);
      }
    }
    return links;
  }

  private extractDeadlinesFromHtml(html: string, year: number): ScrapedDeadline[] {
    const deadlines: ScrapedDeadline[] = [];
    const datePatterns = [
      /(?:application|deadline|opens?|closes?|due|draw\s+results?)[^.]*?(\w+\s+\d{1,2},?\s+\d{4})/gi,
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
          deadlines.push({ stateId: "NE", speciesId, deadlineType, date: dateStr, year, notes: context.trim().substring(0, 200) });
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
                stateId: "NE", feeName: feeName.substring(0, 100), amount: amt,
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
        lower.includes("season") || lower.includes("emergency")
      ) {
        let category = "announcement";
        if (lower.includes("regulation") || lower.includes("rule")) category = "rule_change";
        if (lower.includes("closure") || lower.includes("emergency")) category = "emergency_closure";
        if (lower.includes("leftover")) category = "leftover_tags";

        regs.push({ stateId: "NE", title: text.substring(0, 200), summary: text, sourceUrl, category });
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

        const unitCode = row["unit"] || row["area"] || cells[0] || "";
        const available = parseInt((row["available"] || row["remaining"] || "0").replace(/,/g, ""), 10);
        const context = Object.values(row).join(" ").toLowerCase();
        const speciesId = this.detectSingleSpecies(context) || "mule_deer";

        if (unitCode && available > 0) {
          leftovers.push({ stateId: "NE", speciesId, unitCode, tagsAvailable: available, sourceUrl });
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
    for (const s of NE_SPECIES) {
      if (s.keywords.some((kw) => text.includes(kw))) species.push(s.speciesId);
    }
    if (species.length === 0) species.push("mule_deer");
    return species;
  }

  private detectSingleSpecies(text: string): string | null {
    for (const s of NE_SPECIES) {
      if (s.keywords.some((kw) => text.includes(kw))) return s.speciesId;
    }
    return null;
  }

  private num(val: string | number | undefined): number {
    if (!val) return 0;
    return parseInt(String(val).replace(/,/g, "").replace(/\s/g, ""), 10) || 0;
  }
}
