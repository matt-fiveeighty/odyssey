/**
 * New Mexico (NMDGF) Draw Data Scraper
 *
 * New Mexico Department of Game and Fish publishes drawing odds reports
 * as downloadable documents.
 *
 * Data sources:
 *   - Draw info & odds: https://wildlife.dgf.nm.gov/hunting/applications-and-draw-information/how-new-mexico-draw-works/
 *   - 2025 Drawing Odds Summary: https://wildlife.dgf.nm.gov/download/2025-drawing-odds-summary-report/
 *   - 2025 Drawing Odds Complete: https://wildlife.dgf.nm.gov/download/2025-drawing-odds-complete-report/
 *   - Lucky Lookup: https://onlinesales.wildlife.state.nm.us/public/lucky-lookup
 *   - Big Game & Draw Hunts: https://wildlife.dgf.nm.gov/hunting/applications-and-draw-information/
 *
 * NM draw system:
 *   - Pure random lottery — NO point system
 *   - Equal odds every year for all applicants
 *   - Apply per unit, $12 per species application
 *   - No qualifying license needed to apply
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

const NMDGF_DRAW_INFO =
  "https://wildlife.dgf.nm.gov/hunting/applications-and-draw-information/how-new-mexico-draw-works/";

const NMDGF_BIG_GAME =
  "https://wildlife.dgf.nm.gov/hunting/applications-and-draw-information/";

/**
 * NMDGF drawing odds reports — downloadable from their website.
 * These are typically PDF files. UPDATE ANNUALLY.
 */
const NMDGF_REPORTS: { url: string; label: string; year: number }[] = [
  {
    url: "https://wildlife.dgf.nm.gov/download/2025-drawing-odds-summary-report/",
    label: "2025 Drawing Odds Summary",
    year: 2025,
  },
  {
    url: "https://wildlife.dgf.nm.gov/download/2025-drawing-odds-complete-report/",
    label: "2025 Drawing Odds Complete",
    year: 2025,
  },
];

/** NM species mapping */
const NM_SPECIES: Record<string, string> = {
  elk: "elk",
  deer: "mule_deer",
  "mule deer": "mule_deer",
  "coues deer": "coues_deer",
  "coues whitetail": "coues_deer",
  antelope: "pronghorn",
  pronghorn: "pronghorn",
  "bighorn sheep": "bighorn_sheep",
  sheep: "bighorn_sheep",
  oryx: "oryx",
  ibex: "ibex",
  "barbary sheep": "barbary_sheep",
  "mountain lion": "mountain_lion",
  "black bear": "black_bear",
  bear: "black_bear",
  javelina: "javelina",
};

// ---------------------------------------------------------------------------
// New Mexico scraper
// ---------------------------------------------------------------------------

export class NewMexicoScraper extends BaseScraper {
  stateId = "NM";
  stateName = "New Mexico";
  sourceUrl = NMDGF_DRAW_INFO;

  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    // Scrape the draw information pages for GMU data
    for (const pageUrl of [NMDGF_DRAW_INFO, NMDGF_BIG_GAME]) {
      try {
        this.log(`Scraping: ${pageUrl}`);
        const html = await this.fetchPage(pageUrl);

        // Look for GMU numbers
        const gmuPattern = /GMU\s+(\d+[A-Z]?)/gi;
        let match: RegExpExecArray | null;
        while ((match = gmuPattern.exec(html)) !== null) {
          const code = match[1];
          for (const speciesId of ["elk", "mule_deer", "pronghorn"]) {
            const key = `${speciesId}:${code}`;
            if (!seen.has(key)) {
              seen.add(key);
              units.push({ stateId: "NM", speciesId, unitCode: code, unitName: `GMU ${code}` });
            }
          }
        }

        // Also look for download links with data
        const links = this.extractLinks(html);
        for (const link of links) {
          if (link.url.endsWith(".csv")) {
            try {
              const rows = await this.fetchCsv(link.url);
              if (rows.length > 1) {
                const headers = rows[0].map((h) => h.toLowerCase().trim());
                for (let i = 1; i < rows.length; i++) {
                  const row = this.parseCsvRow(rows[i], headers);
                  const code = row["gmu"] || row["unit"] || row["hunt code"] || "";
                  const species = (row["species"] || "").toLowerCase();
                  const speciesId = this.mapSpecies(species);
                  if (code && speciesId) {
                    const key = `${speciesId}:${code}`;
                    if (!seen.has(key)) {
                      seen.add(key);
                      units.push({ stateId: "NM", speciesId, unitCode: code, unitName: `GMU ${code}` });
                    }
                  }
                }
              }
            } catch { /* skip */ }
          }
        }
      } catch (err) {
        this.log(`Page scrape failed: ${(err as Error).message}`);
      }
    }

    this.log(`Extracted ${units.length} NM units`);
    return units;
  }

  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    // Try the drawing odds report download pages
    for (const report of NMDGF_REPORTS) {
      try {
        this.log(`Fetching ${report.label}: ${report.url}`);
        const html = await this.fetchPage(report.url);

        // Look for the actual download link in the page
        const downloadPattern = /href=["']([^"']*\.(pdf|csv|xlsx?)[^"']*)["']/gi;
        let match: RegExpExecArray | null;
        const downloadLinks: string[] = [];

        while ((match = downloadPattern.exec(html)) !== null) {
          let href = match[1];
          if (!href.startsWith("http")) href = `https://wildlife.dgf.nm.gov${href}`;
          downloadLinks.push(href);
        }

        // Also check for WordPress download manager links
        const wpdmPattern = /data-downloadurl=["']([^"']+)["']/gi;
        while ((match = wpdmPattern.exec(html)) !== null) {
          downloadLinks.push(match[1]);
        }

        for (const downloadUrl of downloadLinks) {
          if (downloadUrl.endsWith(".csv")) {
            try {
              const rows = await this.fetchCsv(downloadUrl);
              if (rows.length > 1) {
                const headers = rows[0].map((h) => h.toLowerCase().trim());
                this.log(`  CSV headers: ${headers.join(", ")}`);
                for (let i = 1; i < rows.length; i++) {
                  const row = this.parseCsvRow(rows[i], headers);
                  const parsed = this.parseNmRow(row, report.year);
                  if (parsed) results.push(parsed);
                }
              }
            } catch { /* skip */ }
          }
        }

        // Try to parse text from the download page itself (may contain table data)
        const tableData = this.parseHtmlTables(html, report.year);
        results.push(...tableData);
      } catch (err) {
        this.log(`  ${report.label} failed: ${(err as Error).message}`);
      }
    }

    // Scrape draw info pages for any embedded data
    for (const pageUrl of [NMDGF_DRAW_INFO, NMDGF_BIG_GAME]) {
      try {
        const html = await this.fetchPage(pageUrl);
        const tableData = this.parseHtmlTables(html, 2025);
        results.push(...tableData);
      } catch { /* skip */ }
    }

    this.log(`Total NM draw history rows: ${results.length}`);
    return results;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private extractLinks(html: string): { url: string; label: string }[] {
    const links: { url: string; label: string }[] = [];
    const pattern = /href=["']([^"']*\.(csv|xlsx?|pdf)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      let href = match[1];
      const label = match[3].replace(/<[^>]*>/g, "").trim();
      if (!href.startsWith("http")) href = `https://wildlife.dgf.nm.gov${href}`;
      links.push({ url: href, label });
    }
    return links;
  }

  private parseNmRow(row: Record<string, string>, defaultYear: number): ScrapedDrawHistory | null {
    const unitCode = row["gmu"] || row["unit"] || row["hunt code"] || row["area"] || "";
    if (!unitCode) return null;

    const species = (row["species"] || row["animal"] || "").toLowerCase();
    const speciesId = this.mapSpecies(species);
    if (!speciesId) return null;

    const year = parseInt(row["year"] || String(defaultYear), 10);
    if (year < 2000) return null;

    const applicants = this.num(row["applicants"] || row["total applicants"] || row["total apps"]);
    const tags = this.num(row["tags"] || row["permits"] || row["licenses issued"]);
    const odds = parseFloat((row["odds"] || row["draw odds"] || row["success%"] || "0").replace("%", "")) || 0;

    return {
      unitId: `NM:${speciesId}:${unitCode}`,
      year,
      applicants,
      tags,
      odds: odds || (applicants > 0 ? Math.round((tags / applicants) * 10000) / 100 : 0),
      minPointsDrawn: null, // NM is pure random — no points
    };
  }

  private parseHtmlTables(html: string, defaultYear: number): ScrapedDrawHistory[] {
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
        const parsed = this.parseNmRow(row, defaultYear);
        if (parsed) results.push(parsed);
      }
    }
    return results;
  }

  private mapSpecies(name: string): string | null {
    for (const [key, id] of Object.entries(NM_SPECIES)) {
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
      this.log("Scraping NMDGF for application deadlines...");
      const urls = [
        "https://www.wildlife.state.nm.us/hunting/drawing-results/",
        "https://www.wildlife.state.nm.us/hunting/",
        "https://www.wildlife.state.nm.us/hunting/big-game/",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
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
              if (context.includes("leftover") || context.includes("unclaimed")) deadlineType = "leftover";

              const speciesIds = this.detectSpeciesFromContext(context);
              for (const speciesId of speciesIds) {
                deadlines.push({ stateId: "NM", speciesId, deadlineType, date: dateStr, year, notes: context.trim().substring(0, 200) });
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

    this.log(`Found ${deadlines.length} NM deadlines (pre-validation)`);
    return validateBatch(deadlines, PlausibleDeadlineSchema, "NM deadlines", this.log.bind(this));
  }

  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    // -----------------------------------------------------------------
    // 1. Structured / verified fee data (primary source of truth)
    //    Source: wildlife.state.nm.us — NM big game fee schedule
    // -----------------------------------------------------------------

    this.log("Emitting structured NM fee data...");

    // License-level fees (no speciesId) — NM has no point system
    fees.push(
      { stateId: "NM", feeName: "Nonresident Game Hunting License", amount: 418, residency: "nonresident", frequency: "annual" },
      { stateId: "NM", feeName: "Application Fee", amount: 12, residency: "both", frequency: "per_species" },
    );

    // Per-species tag costs — nonresident
    const nrTags: [string, string, number][] = [
      ["elk", "Elk Tag", 548],
      ["mule_deer", "Deer Tag", 283],
      ["coues_deer", "Coues Deer Tag", 283],
      ["black_bear", "Black Bear Tag", 260],
      ["pronghorn", "Pronghorn Tag", 283],
      ["bighorn_sheep", "Bighorn Sheep Tag", 3173],
      ["mountain_lion", "Mountain Lion Tag", 290],
    ];
    for (const [speciesId, name, amount] of nrTags) {
      fees.push({ stateId: "NM", feeName: `NR ${name}`, amount, residency: "nonresident", speciesId, frequency: "one_time" });
    }

    // Per-species tag costs — resident
    const rTags: [string, string, number][] = [
      ["elk", "Elk Tag", 90],
      ["mule_deer", "Deer Tag", 47],
      ["coues_deer", "Coues Deer Tag", 47],
      ["black_bear", "Black Bear Tag", 47],
      ["pronghorn", "Pronghorn Tag", 47],
      ["bighorn_sheep", "Bighorn Sheep Tag", 163],
      ["mountain_lion", "Mountain Lion Tag", 47],
    ];
    for (const [speciesId, name, amount] of rTags) {
      fees.push({ stateId: "NM", feeName: `R ${name}`, amount, residency: "resident", speciesId, frequency: "one_time" });
    }

    this.log(`  Emitted ${fees.length} structured fee entries`);

    // -----------------------------------------------------------------
    // 2. Fallback: scrape the NMDGF website for any additional / updated fees
    // -----------------------------------------------------------------

    try {
      this.log("Scraping NMDGF for supplemental fee data...");
      const urls = [
        "https://www.wildlife.state.nm.us/hunting/licenses-permits/",
        "https://www.wildlife.state.nm.us/hunting/",
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
              fees.push({
                stateId: "NM",
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

    this.log(`Found ${fees.length} NM fee entries total (pre-validation)`);
    return validateBatch(fees, PlausibleFeeSchema, "NM fees", this.log.bind(this));
  }

  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping NMDGF for season dates...");
      const urls = [
        "https://www.wildlife.state.nm.us/hunting/big-game/",
        "https://www.wildlife.state.nm.us/hunting/rules-regulations/",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const seasonPattern = /(archery|muzzleloader|rifle|general|youth|any\s+legal\s+weapon)[^:]*?:\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
          let match: RegExpExecArray | null;

          while ((match = seasonPattern.exec(html)) !== null) {
            const seasonType = match[1].toLowerCase().trim();
            const startDate = match[2];
            const endDate = match[3];
            const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();

            const speciesIds = this.detectSpeciesFromContext(context);
            for (const speciesId of speciesIds) {
              seasons.push({ stateId: "NM", speciesId, seasonType, startDate, endDate, year });
            }
          }
        } catch (err) {
          this.log(`  Season page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Season scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${seasons.length} NM season entries (pre-validation)`);
    return validateBatch(seasons, PlausibleSeasonSchema, "NM seasons", this.log.bind(this));
  }

  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping NMDGF for regulation updates...");
      const urls = [
        "https://www.wildlife.state.nm.us/hunting/rules-regulations/",
        "https://www.wildlife.state.nm.us/hunting/",
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
              if (lower.includes("leftover") || lower.includes("unclaimed")) category = "leftover_tags";

              regs.push({ stateId: "NM", title: text.substring(0, 200), summary: text, sourceUrl: url, category });
            }
          }
        } catch (err) {
          this.log(`  Regulation page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Regulation scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${regs.length} NM regulation entries`);
    return regs;
  }

  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking NMDGF for leftover tag data...");
      const html = await this.fetchPage("https://www.wildlife.state.nm.us/hunting/drawing-results/");

      const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
      for (const table of tables) {
        const lower = table.toLowerCase();
        if (!lower.includes("leftover") && !lower.includes("unclaimed") && !lower.includes("available")) continue;

        const ths = table.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
        const headers = ths.map((th) => th.replace(/<[^>]*>/g, "").trim().toLowerCase());
        const trs = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

        for (const tr of trs) {
          const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
          if (tds.length < 2) continue;
          const cells = tds.map((td) => td.replace(/<[^>]*>/g, "").trim());
          const row: Record<string, string> = {};
          for (let i = 0; i < headers.length && i < cells.length; i++) row[headers[i]] = cells[i];

          const unitCode = row["unit"] || row["hunt"] || row["area"] || cells[0] || "";
          const available = parseInt((row["available"] || row["remaining"] || row["permits"] || "0").replace(/,/g, ""), 10);
          const species = (row["species"] || "").toLowerCase();
          const speciesId = this.detectSingleSpecies(species) || "elk";

          if (unitCode && available > 0) {
            leftovers.push({
              stateId: "NM", speciesId, unitCode, tagsAvailable: available,
              sourceUrl: "https://www.wildlife.state.nm.us/hunting/drawing-results/",
            });
          }
        }
      }
    } catch (err) {
      this.log(`Leftover tag scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${leftovers.length} NM leftover tags`);
    return leftovers;
  }

  private detectSpeciesFromContext(text: string): string[] {
    const species: string[] = [];
    if (text.includes("elk")) species.push("elk");
    if (text.includes("deer") || text.includes("mule")) species.push("mule_deer");
    if (text.includes("pronghorn") || text.includes("antelope")) species.push("pronghorn");
    if (text.includes("sheep") || text.includes("bighorn")) species.push("bighorn_sheep");
    if (text.includes("goat")) species.push("mountain_goat");
    if (text.includes("bear")) species.push("black_bear");
    if (text.includes("lion") || text.includes("cougar")) species.push("mountain_lion");
    if (species.length === 0) species.push("elk");
    return species;
  }

  private detectSingleSpecies(text: string): string | null {
    if (text.includes("elk")) return "elk";
    if (text.includes("deer") || text.includes("mule")) return "mule_deer";
    if (text.includes("pronghorn") || text.includes("antelope")) return "pronghorn";
    if (text.includes("sheep")) return "bighorn_sheep";
    if (text.includes("goat")) return "mountain_goat";
    if (text.includes("bear")) return "black_bear";
    if (text.includes("lion")) return "mountain_lion";
    return null;
  }
}
