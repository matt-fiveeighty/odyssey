/**
 * Alaska (ADF&G) Draw Data Scraper
 *
 * Alaska Department of Fish and Game publishes draw permit statistics
 * and a Drawing Permit Hunt Supplement.
 *
 * Data sources:
 *   - Draw info: https://www.adfg.alaska.gov/index.cfm?adfg=huntlicense.draw
 *   - Draw supplements: https://www.adfg.alaska.gov/index.cfm?adfg=huntlicense.drawsupplements
 *   - Draw results: https://www.adfg.alaska.gov/index.cfm?adfg=huntlicense.drawresults
 *   - 2025-26 Supplement PDF: adfg.alaska.gov/static/applications/web/nocache/license/huntlicense/pdfs/2025-2026_draw_supplement.pdf
 *
 * AK draw system:
 *   - Draw permits are pure random lottery — NO point system
 *   - Every application is equal (no preference/bonus)
 *   - Apply for up to 6 hunt numbers per species
 *   - Most hunts are registration or general season (no draw)
 *   - NR locking tags: moose $800, brown bear $650, etc.
 *   - Guide required for NR sheep, goat, and brown/grizzly bear
 *   - Application period: Nov 1 – Dec 15 (very early!)
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

const ADFG_DRAW_PAGE =
  "https://www.adfg.alaska.gov/index.cfm?adfg=huntlicense.draw";

const ADFG_SUPPLEMENTS_PAGE =
  "https://www.adfg.alaska.gov/index.cfm?adfg=huntlicense.drawsupplements";

/**
 * ADF&G Drawing Permit Hunt Supplement PDFs.
 * These contain all draw hunt details including last year's odds.
 * Pattern: /pdfs/{year}-{year+1}_draw_supplement.pdf
 * NOTE: URLs include a hash suffix that changes — we try without it.
 */
const ADFG_SUPPLEMENT_PDFS: { url: string; year: string }[] = [
  {
    url: "https://www.adfg.alaska.gov/static/applications/web/nocache/license/huntlicense/pdfs/2025-2026_draw_supplement.pdf",
    year: "2025-2026",
  },
  {
    url: "https://www.adfg.alaska.gov/static/applications/web/nocache/license/huntlicense/pdfs/2024-2025_draw_supplement.pdf",
    year: "2024-2025",
  },
];

/** AK species mapping (uses GMU-based hunt codes) */
const AK_SPECIES: Record<string, string> = {
  moose: "moose",
  caribou: "caribou",
  "brown bear": "grizzly",
  "grizzly bear": "grizzly",
  "black bear": "black_bear",
  "dall sheep": "dall_sheep",
  sheep: "dall_sheep",
  "mountain goat": "mountain_goat",
  goat: "mountain_goat",
  bison: "bison",
  "wood bison": "bison",
  elk: "elk",
  muskox: "muskox",
  wolf: "wolf",
  deer: "sitka_blacktail",
  "sitka blacktail": "sitka_blacktail",
};

/**
 * AK hunt codes encode species:
 *   DM = draw moose, DC = draw caribou, DB = draw bear,
 *   DS = draw sheep, DG = draw goat, DX = draw bison/muskox
 *   DL = draw elk, DI = draw deer (Sitka blacktail)
 */
const HUNT_CODE_SPECIES: Record<string, string> = {
  DM: "moose",
  DC: "caribou",
  DB: "grizzly",
  DS: "dall_sheep",
  DG: "mountain_goat",
  DX: "bison",
  DL: "elk",
  DI: "sitka_blacktail",
  YM: "moose", // youth moose
};

// ---------------------------------------------------------------------------
// Alaska scraper
// ---------------------------------------------------------------------------

export class AlaskaScraper extends BaseScraper {
  stateId = "AK";
  stateName = "Alaska";
  sourceUrl = ADFG_DRAW_PAGE;

  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    // Scrape the draw supplements page for hunt code data
    try {
      this.log("Scraping ADF&G draw supplements page...");
      const html = await this.fetchPage(ADFG_SUPPLEMENTS_PAGE);

      // Look for GMU numbers and hunt codes
      const gmuPattern = /GMU\s+(\d{1,2}[A-D]?)/gi;
      let match: RegExpExecArray | null;
      while ((match = gmuPattern.exec(html)) !== null) {
        const code = match[1];
        for (const speciesId of ["moose", "caribou", "grizzly", "dall_sheep"]) {
          const key = `${speciesId}:${code}`;
          if (!seen.has(key)) {
            seen.add(key);
            units.push({ stateId: "AK", speciesId, unitCode: code, unitName: `GMU ${code}` });
          }
        }
      }

      // Look for hunt codes like DM514, DC505, etc.
      const huntCodePattern = /(D[MCBSGXLI])\s*(\d{3})/gi;
      while ((match = huntCodePattern.exec(html)) !== null) {
        const prefix = match[1].toUpperCase();
        const huntNum = match[2];
        const speciesId = HUNT_CODE_SPECIES[prefix];
        if (speciesId) {
          const key = `${speciesId}:${prefix}${huntNum}`;
          if (!seen.has(key)) {
            seen.add(key);
            units.push({ stateId: "AK", speciesId, unitCode: `${prefix}${huntNum}`, unitName: `Hunt ${prefix}${huntNum}` });
          }
        }
      }
    } catch (err) {
      this.log(`Supplements page scrape failed: ${(err as Error).message}`);
    }

    // Scrape the main draw page
    try {
      this.log("Scraping ADF&G main draw page...");
      const html = await this.fetchPage(ADFG_DRAW_PAGE);

      const huntCodePattern = /(D[MCBSGXLI])\s*(\d{3})/gi;
      let match: RegExpExecArray | null;
      while ((match = huntCodePattern.exec(html)) !== null) {
        const prefix = match[1].toUpperCase();
        const huntNum = match[2];
        const speciesId = HUNT_CODE_SPECIES[prefix];
        if (speciesId) {
          const key = `${speciesId}:${prefix}${huntNum}`;
          if (!seen.has(key)) {
            seen.add(key);
            units.push({ stateId: "AK", speciesId, unitCode: `${prefix}${huntNum}`, unitName: `Hunt ${prefix}${huntNum}` });
          }
        }
      }
    } catch { /* skip */ }

    this.log(`Extracted ${units.length} AK units`);
    return units;
  }

  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    // Try downloading and parsing the draw supplement PDFs
    for (const supplement of ADFG_SUPPLEMENT_PDFS) {
      try {
        this.log(`Fetching ${supplement.year} supplement: ${supplement.url}`);
        const text = await this.fetchPage(supplement.url);
        const parsed = this.parseSupplementText(text, supplement.year);
        if (parsed.length > 0) {
          results.push(...parsed);
          this.log(`  Parsed ${parsed.length} rows from ${supplement.year} supplement`);
        } else {
          this.log(`  No parseable data (PDF binary — needs pdf-parse library)`);
        }
      } catch (err) {
        this.log(`  Supplement fetch failed: ${(err as Error).message}`);
      }
    }

    // Try scraping the draw page and supplements page for HTML tables
    for (const url of [ADFG_DRAW_PAGE, ADFG_SUPPLEMENTS_PAGE]) {
      try {
        const html = await this.fetchPage(url);
        const tableData = this.parseHtmlTables(html);
        results.push(...tableData);
      } catch { /* skip */ }
    }

    // Try to find downloadable CSV/Excel files
    try {
      this.log("Looking for CSV downloads on supplements page...");
      const html = await this.fetchPage(ADFG_SUPPLEMENTS_PAGE);

      const links: string[] = [];
      const pattern = /href=["']([^"']*\.(csv|xlsx?)[^"']*)["']/gi;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(html)) !== null) {
        let href = match[1];
        if (!href.startsWith("http")) href = `https://www.adfg.alaska.gov${href}`;
        links.push(href);
      }

      for (const csvUrl of links) {
        try {
          const rows = await this.fetchCsv(csvUrl);
          if (rows.length > 1) {
            const headers = rows[0].map((h) => h.toLowerCase().trim());
            for (let i = 1; i < rows.length; i++) {
              const row = this.parseCsvRow(rows[i], headers);
              const parsed = this.parseAkRow(row);
              if (parsed) results.push(parsed);
            }
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }

    this.log(`Total AK draw history rows: ${results.length}`);
    return results;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private parseSupplementText(text: string, yearRange: string): ScrapedDrawHistory[] {
    const results: ScrapedDrawHistory[] = [];
    const year = parseInt(yearRange.split("-")[0], 10);
    const lines = text.split("\n");

    // ADF&G supplement format: hunt code, GMU, permits, applicants, odds
    for (const line of lines) {
      // Look for hunt codes
      const huntMatch = /(D[MCBSGXLI])(\d{3})/i.exec(line);
      if (!huntMatch) continue;

      const prefix = huntMatch[1].toUpperCase();
      const huntNum = huntMatch[2];
      const speciesId = HUNT_CODE_SPECIES[prefix];
      if (!speciesId) continue;

      // Extract numbers
      const nums = line.match(/\d+/g);
      if (!nums || nums.length < 3) continue;

      const cleanNums = nums.map((n) => parseInt(n, 10));
      // Skip the hunt code number itself
      const dataNums = cleanNums.filter((n) => n !== parseInt(huntNum, 10));

      if (dataNums.length >= 2) {
        const permits = dataNums[0];
        const apps = dataNums[1];

        results.push({
          unitId: `AK:${speciesId}:${prefix}${huntNum}`,
          year,
          applicants: apps,
          tags: permits,
          odds: apps > 0 ? Math.round((permits / apps) * 10000) / 100 : 0,
          minPointsDrawn: null, // AK has no point system
        });
      }
    }

    return results;
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
        const parsed = this.parseAkRow(row);
        if (parsed) results.push(parsed);
      }
    }
    return results;
  }

  private parseAkRow(row: Record<string, string>): ScrapedDrawHistory | null {
    const huntCode = row["hunt"] || row["hunt code"] || row["hunt number"] || row["permit hunt"] || "";
    if (!huntCode) return null;

    // Determine species from hunt code prefix
    let speciesId: string | null = null;
    for (const [prefix, sid] of Object.entries(HUNT_CODE_SPECIES)) {
      if (huntCode.toUpperCase().startsWith(prefix)) {
        speciesId = sid;
        break;
      }
    }

    // Fall back to species column
    if (!speciesId) {
      const species = (row["species"] || row["animal"] || "").toLowerCase();
      for (const [key, id] of Object.entries(AK_SPECIES)) {
        if (species.includes(key)) { speciesId = id; break; }
      }
    }

    if (!speciesId) return null;

    const year = parseInt(row["year"] || row["reg year"] || "2025", 10);
    const applicants = this.num(row["applicants"] || row["total applicants"]);
    const tags = this.num(row["permits"] || row["tags"] || row["issued"]);

    return {
      unitId: `AK:${speciesId}:${huntCode}`,
      year,
      applicants,
      tags,
      odds: applicants > 0 ? Math.round((tags / applicants) * 10000) / 100 : 0,
      minPointsDrawn: null, // AK has no point system
    };
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
      this.log("Scraping ADF&G for application deadlines...");
      const urls = [
        ADFG_DRAW_PAGE,
        ADFG_SUPPLEMENTS_PAGE,
        "https://www.adfg.alaska.gov/index.cfm?adfg=hunting.main",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const datePatterns = [
            /(?:application|deadline|opens?|closes?|due|draw\s+results?|drawing\s+permit)[^.]*?(\w+\s+\d{1,2},?\s+\d{4})/gi,
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
              if (context.includes("registration")) deadlineType = "registration_open";

              const speciesIds = this.detectSpeciesFromContext(context);
              for (const speciesId of speciesIds) {
                deadlines.push({ stateId: "AK", speciesId, deadlineType, date: dateStr, year, notes: context.trim().substring(0, 200) });
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

    this.log(`Found ${deadlines.length} AK deadlines`);
    return deadlines;
  }

  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    // -------------------------------------------------------------------
    // 1. Structured, verified fee data (primary source of truth)
    //    Source: https://www.adfg.alaska.gov
    //    AK has NO point system — pure random lottery.
    //    NR "locking tags" must be purchased before the hunt.
    // -------------------------------------------------------------------

    // License-level fees (no speciesId)
    fees.push(
      { stateId: "AK", feeName: "NR Hunting License", amount: 265, residency: "nonresident", frequency: "annual" },
      { stateId: "AK", feeName: "Application Fee", amount: 0, residency: "nonresident", frequency: "per_species", notes: "No separate application fee in AK" },
      { stateId: "AK", feeName: "Preference Point Fee", amount: 0, residency: "nonresident", frequency: "per_species", notes: "AK has no point system" },
    );

    // NR per-species tag costs (locking tags)
    const nrTags: Record<string, number> = {
      elk: 800, mule_deer: 450, sitka_blacktail: 450, black_bear: 550,
      grizzly: 1000, moose: 1000, caribou: 850, dall_sheep: 850,
      mountain_goat: 600, bison: 1100, muskox: 2200, wolf: 60,
    };
    for (const [speciesId, amount] of Object.entries(nrTags)) {
      fees.push({
        stateId: "AK", feeName: `NR ${speciesId.replace(/_/g, " ")} tag`, amount,
        residency: "nonresident", speciesId, frequency: "per_species",
      });
    }

    // R per-species tag costs
    const rTags: Record<string, number> = {
      elk: 30, mule_deer: 30, sitka_blacktail: 30, black_bear: 25,
      grizzly: 25, moose: 30, caribou: 30, dall_sheep: 30,
      mountain_goat: 25, bison: 250, muskox: 500, wolf: 10,
    };
    for (const [speciesId, amount] of Object.entries(rTags)) {
      fees.push({
        stateId: "AK", feeName: `R ${speciesId.replace(/_/g, " ")} tag`, amount,
        residency: "resident", speciesId, frequency: "per_species",
      });
    }

    this.log(`Emitted ${fees.length} structured AK fee entries`);

    // -------------------------------------------------------------------
    // 2. Fallback: scrape ADF&G pages for any additional fees
    // -------------------------------------------------------------------
    try {
      this.log("Scraping ADF&G fee pages for additional data...");
      const urls = [
        "https://www.adfg.alaska.gov/index.cfm?adfg=license.main",
        ADFG_DRAW_PAGE,
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
                stateId: "AK",
                feeName: label.substring(0, 100),
                amount,
                residency: lower.includes("nonresident") || lower.includes("non-resident")
                  ? "nonresident" : lower.includes("resident") ? "resident" : "both",
                speciesId: this.detectSingleSpecies(lower) ?? undefined,
                frequency: lower.includes("per species") ? "per_species"
                  : lower.includes("annual") ? "annual"
                  : lower.includes("locking") ? "per_tag" : "one_time",
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
                        stateId: "AK", feeName: feeName.substring(0, 100), amount: amt,
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
      this.log(`Fee page scrape failed (fallback): ${(err as Error).message}`);
    }

    this.log(`Found ${fees.length} total AK fee entries`);
    return fees;
  }

  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping ADF&G for season dates...");
      const urls = [
        "https://www.adfg.alaska.gov/index.cfm?adfg=wildliferegulations.main",
        "https://www.adfg.alaska.gov/index.cfm?adfg=hunting.main",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          // AK has different season format: "Aug 10 - Sep 20" or "August 10 - September 20"
          const seasonPattern = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2})/gi;
          let match: RegExpExecArray | null;

          while ((match = seasonPattern.exec(html)) !== null) {
            const context = html.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();
            // Only include if context mentions a species or hunt type
            const speciesIds = this.detectSpeciesFromContext(context);
            if (speciesIds.length === 1 && speciesIds[0] === "moose" && !context.includes("moose")) continue;

            const seasonType = context.includes("archery") ? "archery"
              : context.includes("registration") ? "registration"
              : context.includes("drawing") || context.includes("draw") ? "draw_permit"
              : "general";

            for (const speciesId of speciesIds) {
              seasons.push({ stateId: "AK", speciesId, seasonType, startDate: match[1], endDate: match[2], year });
            }
          }
        } catch (err) {
          this.log(`  Season page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Season scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${seasons.length} AK season entries`);
    return seasons;
  }

  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping ADF&G for regulation updates...");
      const urls = [
        "https://www.adfg.alaska.gov/index.cfm?adfg=wildliferegulations.main",
        "https://www.adfg.alaska.gov/index.cfm?adfg=hunting.main",
        ADFG_DRAW_PAGE,
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
              lower.includes("closure") || lower.includes("emergency") ||
              lower.includes("rule") || lower.includes("draw") ||
              lower.includes("season") || lower.includes("guide")
            ) {
              let category = "announcement";
              if (lower.includes("regulation") || lower.includes("rule")) category = "rule_change";
              if (lower.includes("closure") || lower.includes("emergency")) category = "emergency_closure";
              if (lower.includes("guide")) category = "guide_requirement";

              regs.push({ stateId: "AK", title: text.substring(0, 200), summary: text, sourceUrl: url, category });
            }
          }
        } catch (err) {
          this.log(`  Regulation page fetch failed (${url}): ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Regulation scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${regs.length} AK regulation entries`);
    return regs;
  }

  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking ADF&G for leftover/registration hunt data...");
      const urls = [
        ADFG_DRAW_PAGE,
        ADFG_SUPPLEMENTS_PAGE,
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
          for (const table of tables) {
            const lower = table.toLowerCase();
            if (!lower.includes("available") && !lower.includes("remaining") && !lower.includes("registration")) continue;

            const ths = table.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
            const headers = ths.map((th) => th.replace(/<[^>]*>/g, "").trim().toLowerCase());
            const trs = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

            for (const tr of trs) {
              const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
              if (tds.length < 2) continue;
              const cells = tds.map((td) => td.replace(/<[^>]*>/g, "").trim());
              const row: Record<string, string> = {};
              for (let i = 0; i < headers.length && i < cells.length; i++) row[headers[i]] = cells[i];

              const unitCode = row["hunt"] || row["hunt code"] || row["gmu"] || cells[0] || "";
              const available = parseInt((row["available"] || row["remaining"] || row["permits"] || "0").replace(/,/g, ""), 10);

              // Determine species from hunt code prefix
              let speciesId = "moose";
              const huntUpper = unitCode.toUpperCase();
              for (const [prefix, sid] of Object.entries(HUNT_CODE_SPECIES)) {
                if (huntUpper.startsWith(prefix)) { speciesId = sid; break; }
              }

              if (unitCode && available > 0) {
                leftovers.push({ stateId: "AK", speciesId, unitCode, tagsAvailable: available, sourceUrl: url });
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

    this.log(`Found ${leftovers.length} AK leftover tags`);
    return leftovers;
  }

  private detectSpeciesFromContext(text: string): string[] {
    const species: string[] = [];
    if (text.includes("moose")) species.push("moose");
    if (text.includes("caribou")) species.push("caribou");
    if (text.includes("brown bear") || text.includes("grizzly")) species.push("grizzly");
    if (text.includes("black bear")) species.push("black_bear");
    if (text.includes("dall sheep") || text.includes("sheep")) species.push("dall_sheep");
    if (text.includes("mountain goat") || text.includes("goat")) species.push("mountain_goat");
    if (text.includes("bison")) species.push("bison");
    if (text.includes("elk")) species.push("elk");
    if (text.includes("muskox")) species.push("muskox");
    if (text.includes("deer") || text.includes("sitka") || text.includes("blacktail")) species.push("sitka_blacktail");
    if (text.includes("wolf")) species.push("wolf");
    if (species.length === 0) species.push("moose"); // AK default
    return species;
  }

  private detectSingleSpecies(text: string): string | null {
    if (text.includes("moose")) return "moose";
    if (text.includes("caribou")) return "caribou";
    if (text.includes("brown bear") || text.includes("grizzly")) return "grizzly";
    if (text.includes("black bear")) return "black_bear";
    if (text.includes("sheep")) return "dall_sheep";
    if (text.includes("goat")) return "mountain_goat";
    if (text.includes("bison")) return "bison";
    if (text.includes("elk")) return "elk";
    if (text.includes("muskox")) return "muskox";
    if (text.includes("deer") || text.includes("sitka")) return "sitka_blacktail";
    if (text.includes("wolf")) return "wolf";
    return null;
  }
}
