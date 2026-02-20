/**
 * Colorado (CPW) Draw Data Scraper
 *
 * Colorado Parks & Wildlife publishes draw statistics as downloadable CSVs
 * and PDFs from species-specific statistics pages.
 *
 * Data sources:
 *   - Elk statistics: https://cpw.state.co.us/hunting/big-game/elk/statistics
 *   - Deer statistics: https://cpw.state.co.us/hunting/big-game/deer/statistics
 *   - Bear statistics: https://cpw.state.co.us/hunting/big-game/bear/statistics
 *   - Moose statistics: https://cpw.state.co.us/hunting/big-game/moose/statistics
 *   - Pronghorn statistics: https://cpw.state.co.us/hunting/big-game/pronghorn/statistics
 *
 * CO draw system:
 *   - True preference (80/20 hybrid): 80% to highest point holders, 20% random
 *   - Apply per unit with 1st and 2nd choice hunt codes
 *   - Second-choice tactic: PP001 as 1st choice, real unit as 2nd
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
// URL constants — UPDATE THESE EACH YEAR when CPW publishes new data
// ---------------------------------------------------------------------------

/** Species statistics pages — scrape these for CSV/PDF download links */
const CPW_SPECIES_STATS: Record<string, { url: string; speciesId: string }> = {
  elk: {
    url: "https://cpw.state.co.us/hunting/big-game/elk/statistics",
    speciesId: "elk",
  },
  deer: {
    url: "https://cpw.state.co.us/hunting/big-game/deer/statistics",
    speciesId: "mule_deer",
  },
  bear: {
    url: "https://cpw.state.co.us/hunting/big-game/bear/statistics",
    speciesId: "black_bear",
  },
  moose: {
    url: "https://cpw.state.co.us/hunting/big-game/moose/statistics",
    speciesId: "moose",
  },
  pronghorn: {
    url: "https://cpw.state.co.us/hunting/big-game/pronghorn/statistics",
    speciesId: "pronghorn",
  },
};

/**
 * Direct CSV URLs — CPW publishes draw data as CSVs at these paths.
 * These URLs follow a pattern CPW has used historically.
 * If they fail, the scraper falls back to scraping stats pages for links.
 *
 * UPDATE THESE ANNUALLY — verify at CPW species stats pages above.
 */
const DIRECT_CSV_URLS: { url: string; speciesId: string }[] = [
  {
    url: "https://cpw.state.co.us/Documents/Hunting/BigGame/Statistics/Elk/ElkDrawRecap.csv",
    speciesId: "elk",
  },
  {
    url: "https://cpw.state.co.us/Documents/Hunting/BigGame/Statistics/Deer/DeerDrawRecap.csv",
    speciesId: "mule_deer",
  },
  {
    url: "https://cpw.state.co.us/Documents/Hunting/BigGame/Statistics/Bear/BearDrawRecap.csv",
    speciesId: "black_bear",
  },
  {
    url: "https://cpw.state.co.us/Documents/Hunting/BigGame/Statistics/Moose/MooseDrawRecap.csv",
    speciesId: "moose",
  },
  {
    url: "https://cpw.state.co.us/Documents/Hunting/BigGame/Statistics/Pronghorn/PronghornDrawRecap.csv",
    speciesId: "pronghorn",
  },
];

/** Alternate CSV URL pattern — CPW sometimes uses "DrawOdds" naming */
const ALT_CSV_URLS: { url: string; speciesId: string }[] = [
  {
    url: "https://cpw.state.co.us/Documents/Hunting/BigGame/Statistics/Elk/ElkDrawOdds.csv",
    speciesId: "elk",
  },
  {
    url: "https://cpw.state.co.us/Documents/Hunting/BigGame/Statistics/Deer/DeerDrawOdds.csv",
    speciesId: "mule_deer",
  },
];

// ---------------------------------------------------------------------------
// Colorado scraper
// ---------------------------------------------------------------------------

export class ColoradoScraper extends BaseScraper {
  stateId = "CO";
  stateName = "Colorado";
  sourceUrl = "https://cpw.state.co.us/hunting/big-game";

  /**
   * scrapeUnits — extract unit codes from draw data CSVs.
   * CPW does not publish a standalone unit list, so we derive
   * units from the draw statistics data itself.
   */
  async scrapeUnits(): Promise<ScrapedUnit[]> {
    const units: ScrapedUnit[] = [];
    const seen = new Set<string>();

    for (const { url, speciesId } of [...DIRECT_CSV_URLS, ...ALT_CSV_URLS]) {
      try {
        const rows = await this.fetchCsv(url);
        if (rows.length <= 1) continue;

        const headers = rows[0].map((h) => h.toLowerCase().trim());

        for (let i = 1; i < rows.length; i++) {
          const row = this.parseCsvRow(rows[i], headers);
          const unitCode = this.extractUnitCode(row);
          if (!unitCode) continue;

          const key = `${speciesId}:${unitCode}`;
          if (seen.has(key)) continue;
          seen.add(key);

          units.push({
            stateId: "CO",
            speciesId,
            unitCode,
            unitName: `GMU ${unitCode}`,
          });
        }
      } catch {
        // URL may not exist — try next
      }
    }

    if (units.length === 0) {
      this.log("No units from direct CSVs — scraping stats pages for links...");
      const pageLinks = await this.scrapeStatsPageForLinks();
      for (const { url, speciesId } of pageLinks) {
        try {
          const rows = await this.fetchCsv(url);
          if (rows.length <= 1) continue;
          const headers = rows[0].map((h) => h.toLowerCase().trim());
          for (let i = 1; i < rows.length; i++) {
            const row = this.parseCsvRow(rows[i], headers);
            const unitCode = this.extractUnitCode(row);
            if (!unitCode) continue;
            const key = `${speciesId}:${unitCode}`;
            if (seen.has(key)) continue;
            seen.add(key);
            units.push({ stateId: "CO", speciesId, unitCode, unitName: `GMU ${unitCode}` });
          }
        } catch { /* skip */ }
      }
    }

    this.log(`Extracted ${units.length} unique units from CSV data`);
    return units;
  }

  /**
   * scrapeDrawHistory — parse CPW draw statistics CSVs.
   * Tries direct CSV URLs first, then alternate patterns, then
   * falls back to scraping stats pages for download links.
   */
  async scrapeDrawHistory(): Promise<ScrapedDrawHistory[]> {
    const results: ScrapedDrawHistory[] = [];

    for (const { url, speciesId } of [...DIRECT_CSV_URLS, ...ALT_CSV_URLS]) {
      try {
        this.log(`Fetching ${speciesId} draw data: ${url}`);
        const rows = await this.fetchCsv(url);
        if (rows.length > 1) {
          const headers = rows[0].map((h) => h.toLowerCase().trim());
          this.log(`  Headers: ${headers.join(", ")}`);
          let count = 0;
          for (let i = 1; i < rows.length; i++) {
            const row = this.parseCsvRow(rows[i], headers);
            const parsed = this.parseCpwRow(row, speciesId);
            if (parsed) { results.push(parsed); count++; }
          }
          this.log(`  Parsed ${count} ${speciesId} rows`);
        }
      } catch (err) {
        this.log(`  ${speciesId} CSV failed: ${(err as Error).message}`);
      }
    }

    // Fallback: scrape stats pages for download links
    if (results.length === 0) {
      this.log("No CSV data at direct URLs — trying stats pages...");
      const pageLinks = await this.scrapeStatsPageForLinks();
      for (const { url, speciesId } of pageLinks) {
        try {
          const rows = await this.fetchCsv(url);
          if (rows.length > 1) {
            const headers = rows[0].map((h) => h.toLowerCase().trim());
            for (let i = 1; i < rows.length; i++) {
              const row = this.parseCsvRow(rows[i], headers);
              const parsed = this.parseCpwRow(row, speciesId);
              if (parsed) results.push(parsed);
            }
          }
        } catch { /* skip */ }
      }
    }

    this.log(`Total CO draw history rows: ${results.length}`);
    return results;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private extractUnitCode(row: Record<string, string>): string {
    return (
      row["gmu"] || row["unit"] || row["hunt code"] || row["hunt_code"] ||
      row["game management unit"] || row["hunt area"] || ""
    ).trim();
  }

  private parseCpwRow(
    row: Record<string, string>,
    speciesId: string
  ): ScrapedDrawHistory | null {
    const unitCode = this.extractUnitCode(row);
    if (!unitCode) return null;

    const year = parseInt(row["year"] || row["draw year"] || row["season year"] || "0", 10);
    if (!year || year < 2000) return null;

    const applicants = this.num(
      row["nr apps"] || row["nr applicants"] || row["nonresident apps"] ||
      row["nr 1st choice apps"] || row["total apps"] || row["total applicants"]
    );

    const tags = this.num(
      row["nr tags"] || row["nr licenses"] || row["nonresident tags"] ||
      row["nr licenses issued"] || row["total tags"] || row["total licenses"]
    );

    const oddsStr =
      row["nr succ%"] || row["nr success"] || row["nr success%"] ||
      row["nonresident success%"] || row["nr draw%"] || row["total succ%"] ||
      row["draw odds"] || "0";
    const odds = parseFloat(oddsStr.replace("%", "").replace(",", "")) || 0;

    const minPtsStr =
      row["min pts drawn (nr)"] || row["min points drawn"] || row["min pts"] ||
      row["min pref pts"] || row["nr min pts"] || row["pref pts required"] || "";
    const minPointsDrawn = minPtsStr ? parseInt(minPtsStr, 10) : null;

    return {
      unitId: `CO:${speciesId}:${unitCode}`,
      year,
      applicants: isNaN(applicants) ? 0 : applicants,
      tags: isNaN(tags) ? 0 : tags,
      odds: isNaN(odds) ? 0 : odds,
      minPointsDrawn: minPointsDrawn !== null && isNaN(minPointsDrawn) ? null : minPointsDrawn,
    };
  }

  private async scrapeStatsPageForLinks(): Promise<{ url: string; speciesId: string }[]> {
    const links: { url: string; speciesId: string }[] = [];
    for (const [, config] of Object.entries(CPW_SPECIES_STATS)) {
      try {
        const html = await this.fetchPage(config.url);
        const csvPattern = /href=["']([^"']*\.csv[^"']*)["']/gi;
        let match: RegExpExecArray | null;
        while ((match = csvPattern.exec(html)) !== null) {
          let href = match[1];
          if (!href.startsWith("http")) href = `https://cpw.state.co.us${href}`;
          links.push({ url: href, speciesId: config.speciesId });
        }
      } catch (err) {
        this.log(`Stats page scrape failed for ${config.speciesId}: ${(err as Error).message}`);
      }
    }
    this.log(`Found ${links.length} CSV links from stats pages`);
    return links;
  }

  private num(val: string | undefined): number {
    if (!val) return 0;
    return parseInt(val.replace(/,/g, "").replace(/\s/g, ""), 10) || 0;
  }

  // =========================================================================
  // FULL-SPECTRUM DATA: Deadlines, Fees, Seasons, Regulations, Leftovers
  // =========================================================================

  /**
   * scrapeDeadlines — pull application deadlines from CPW primary draw page.
   * CPW publishes deadlines at: cpw.state.co.us/hunting/big-game/primary-draw
   */
  async scrapeDeadlines(): Promise<ScrapedDeadline[]> {
    const deadlines: ScrapedDeadline[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping CPW primary draw page for deadlines...");
      const html = await this.fetchPage("https://cpw.state.co.us/hunting/big-game/primary-draw");

      // Look for date patterns (Month Day, Year or MM/DD/YYYY)
      const datePatterns = [
        /(?:application|deadline|opens?|closes?|due|draw\s+results?)[^.]*?(\w+\s+\d{1,2},?\s+\d{4})/gi,
        /(\d{1,2}\/\d{1,2}\/\d{4})/g,
      ];

      for (const pattern of datePatterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(html)) !== null) {
          const context = html.substring(Math.max(0, match.index - 100), match.index + 100).toLowerCase();
          const dateStr = match[1];

          let deadlineType = "application_close";
          if (context.includes("open")) deadlineType = "application_open";
          if (context.includes("result")) deadlineType = "draw_results";
          if (context.includes("leftover") || context.includes("secondary")) deadlineType = "leftover";

          // Determine species from context
          const speciesIds = this.detectSpeciesFromContext(context);
          for (const speciesId of speciesIds) {
            deadlines.push({
              stateId: "CO",
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
      this.log(`Deadline scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${deadlines.length} CO deadlines`);
    return deadlines;
  }

  /**
   * scrapeFees — pull license/application fees from CPW.
   *
   * Strategy:
   *   1. Emit structured per-species tag costs (with speciesId) from verified data
   *   2. Emit license-level fees (app fee, qualifying license, point fee) without speciesId
   *   3. Fall back to generic regex scraping if live page fetch succeeds
   *
   * CPW fee pages:
   *   - cpw.state.co.us/hunting/big-game/primary-draw
   *   - cpw.state.co.us/hunting/licenses-and-fees
   *   - eRegulations: colorado.huntinfoweb.com
   */
  async scrapeFees(): Promise<ScrapedFee[]> {
    const fees: ScrapedFee[] = [];

    // -----------------------------------------------------------------
    // 1. Structured per-species tag costs (verified from CPW fee tables)
    // -----------------------------------------------------------------
    const nrTagCosts: { speciesId: string; label: string; amount: number }[] = [
      { speciesId: "elk", label: "NR Elk License", amount: 825.03 },
      { speciesId: "mule_deer", label: "NR Deer License", amount: 494.47 },
      { speciesId: "black_bear", label: "NR Bear License", amount: 294.75 },
      { speciesId: "moose", label: "NR Moose License", amount: 2758.49 },
      { speciesId: "pronghorn", label: "NR Pronghorn License", amount: 494.47 },
      { speciesId: "bighorn_sheep", label: "NR Bighorn Sheep License", amount: 2758.49 },
      { speciesId: "mountain_goat", label: "NR Mountain Goat License", amount: 2758.49 },
      { speciesId: "mountain_lion", label: "NR Mountain Lion License", amount: 825.03 },
    ];

    const rTagCosts: { speciesId: string; label: string; amount: number }[] = [
      { speciesId: "elk", label: "Resident Elk License", amount: 54.08 },
      { speciesId: "mule_deer", label: "Resident Deer License", amount: 35.08 },
      { speciesId: "black_bear", label: "Resident Bear License", amount: 35.08 },
      { speciesId: "moose", label: "Resident Moose License", amount: 303.08 },
      { speciesId: "pronghorn", label: "Resident Pronghorn License", amount: 35.08 },
      { speciesId: "bighorn_sheep", label: "Resident Bighorn Sheep License", amount: 303.08 },
      { speciesId: "mountain_goat", label: "Resident Mountain Goat License", amount: 303.08 },
      { speciesId: "mountain_lion", label: "Resident Mountain Lion License", amount: 35.08 },
    ];

    for (const tag of nrTagCosts) {
      fees.push({
        stateId: "CO",
        feeName: tag.label,
        amount: tag.amount,
        residency: "nonresident",
        speciesId: tag.speciesId,
        frequency: "per_species",
        notes: "CPW nonresident tag/license cost",
      });
    }

    for (const tag of rTagCosts) {
      fees.push({
        stateId: "CO",
        feeName: tag.label,
        amount: tag.amount,
        residency: "resident",
        speciesId: tag.speciesId,
        frequency: "per_species",
        notes: "CPW resident tag/license cost",
      });
    }

    // -----------------------------------------------------------------
    // 2. License-level fees (no speciesId)
    // -----------------------------------------------------------------
    fees.push({
      stateId: "CO",
      feeName: "NR Qualifying License",
      amount: 101.49,
      residency: "nonresident",
      frequency: "annual",
      notes: "Required NR hunting license to apply in the draw",
    });

    fees.push({
      stateId: "CO",
      feeName: "Application Fee",
      amount: 11,
      residency: "both",
      frequency: "per_species",
      notes: "Per-species application fee for the primary draw",
    });

    fees.push({
      stateId: "CO",
      feeName: "Preference Point Fee",
      amount: 0,
      residency: "both",
      frequency: "per_species",
      notes: "$0 for common species; $100 for OIAL (moose, sheep, goat)",
    });

    // -----------------------------------------------------------------
    // 3. Live-scrape fallback: try to extract updated fees from CPW pages
    // -----------------------------------------------------------------
    try {
      this.log("Attempting live fee scrape from CPW pages...");
      const seen = new Set<string>();
      // Mark structured fees as seen so we don't duplicate
      for (const f of fees) {
        seen.add(`${f.amount}:${f.feeName.substring(0, 30)}`);
      }

      const urls = [
        "https://cpw.state.co.us/hunting/big-game/primary-draw",
        "https://cpw.state.co.us/hunting/licenses-and-fees",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);
          const feePattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:[-–]|for|per)?\s*([^<\n]{5,60})/gi;
          let match: RegExpExecArray | null;

          while ((match = feePattern.exec(html)) !== null) {
            const amount = parseFloat(match[1].replace(/,/g, ""));
            const label = match[2].replace(/<[^>]*>/g, "").trim();

            if (amount > 0 && amount < 5000 && label.length > 3) {
              const key = `${amount}:${label.substring(0, 30)}`;
              if (seen.has(key)) continue;
              seen.add(key);

              const lower = label.toLowerCase();
              const residency = lower.includes("nonresident") ? "nonresident" as const
                : lower.includes("resident") ? "resident" as const
                : "both" as const;

              const speciesId = this.detectSingleSpecies(lower);

              fees.push({
                stateId: "CO",
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
        } catch (err) {
          this.log(`  Live scrape failed for ${url}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.log(`Live fee scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${fees.length} CO fee entries`);
    return fees;
  }

  private detectSingleSpecies(text: string): string | null {
    if (text.includes("elk")) return "elk";
    if (text.includes("deer") || text.includes("mule")) return "mule_deer";
    if (text.includes("bear")) return "black_bear";
    if (text.includes("moose")) return "moose";
    if (text.includes("pronghorn") || text.includes("antelope")) return "pronghorn";
    if (text.includes("sheep")) return "bighorn_sheep";
    if (text.includes("goat")) return "mountain_goat";
    if (text.includes("lion") || text.includes("cougar")) return "mountain_lion";
    return null;
  }

  /**
   * scrapeSeasons — pull season dates from CPW.
   * CPW publishes season dates in the Big Game Brochure and on species pages.
   */
  async scrapeSeasons(): Promise<ScrapedSeason[]> {
    const seasons: ScrapedSeason[] = [];
    const year = new Date().getFullYear();

    try {
      this.log("Scraping CPW for season dates...");
      const html = await this.fetchPage("https://cpw.state.co.us/hunting/big-game");

      // Look for season date patterns: "Archery: Sep 2-30" or similar
      const seasonPattern = /(archery|muzzleloader|rifle|1st rifle|2nd rifle|3rd rifle|4th rifle|general)[^:]*:\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2})/gi;
      let match: RegExpExecArray | null;

      while ((match = seasonPattern.exec(html)) !== null) {
        const seasonType = match[1].toLowerCase();
        const startDate = match[2];
        const endDate = match[3];

        for (const speciesId of ["elk", "mule_deer"]) {
          seasons.push({
            stateId: "CO",
            speciesId,
            seasonType,
            startDate,
            endDate,
            year,
          });
        }
      }
    } catch (err) {
      this.log(`Season scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${seasons.length} CO season entries`);
    return seasons;
  }

  /**
   * scrapeRegulations — pull news/announcements from CPW.
   */
  async scrapeRegulations(): Promise<ScrapedRegulation[]> {
    const regs: ScrapedRegulation[] = [];

    try {
      this.log("Scraping CPW for regulation updates...");
      const html = await this.fetchPage("https://cpw.state.co.us/hunting/big-game");

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
          lower.includes("new rule") || lower.includes("draw")
        ) {
          let category = "announcement";
          if (lower.includes("regulation") || lower.includes("rule")) category = "rule_change";
          if (lower.includes("closure") || lower.includes("emergency")) category = "emergency_closure";
          if (lower.includes("leftover")) category = "leftover_tags";

          regs.push({
            stateId: "CO",
            title: text.substring(0, 200),
            summary: text,
            sourceUrl: "https://cpw.state.co.us/hunting/big-game",
            category,
          });
        }
      }
    } catch (err) {
      this.log(`Regulation scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${regs.length} CO regulation entries`);
    return regs;
  }

  /**
   * scrapeLeftoverTags — pull leftover/secondary draw tag data from CPW.
   */
  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> {
    const leftovers: ScrapedLeftoverTag[] = [];

    try {
      this.log("Checking CPW for leftover tag data...");
      // CPW publishes a secondary/leftover draw page
      const urls = [
        "https://cpw.state.co.us/hunting/big-game/leftover-licenses",
        "https://cpw.state.co.us/hunting/big-game/secondary-draw",
      ];

      for (const url of urls) {
        try {
          const html = await this.fetchPage(url);

          // Look for unit + species + tags available patterns in tables
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

              const unitCode = row["gmu"] || row["unit"] || row["hunt code"] || "";
              const species = (row["species"] || "elk").toLowerCase();
              const tagsAvailable = this.num(row["available"] || row["remaining"] || row["tags"]);

              if (unitCode && tagsAvailable > 0) {
                const speciesId = species.includes("deer") ? "mule_deer"
                  : species.includes("bear") ? "black_bear"
                  : species.includes("moose") ? "moose"
                  : "elk";

                leftovers.push({
                  stateId: "CO",
                  speciesId,
                  unitCode,
                  tagsAvailable,
                  sourceUrl: url,
                });
              }
            }
          }
        } catch { /* URL may not exist outside leftover season */ }
      }
    } catch (err) {
      this.log(`Leftover tag scrape failed: ${(err as Error).message}`);
    }

    this.log(`Found ${leftovers.length} CO leftover tag entries`);
    return leftovers;
  }

  // -------------------------------------------------------------------------
  // Helper: detect species from surrounding text context
  // -------------------------------------------------------------------------

  private detectSpeciesFromContext(text: string): string[] {
    const species: string[] = [];
    if (text.includes("elk")) species.push("elk");
    if (text.includes("deer") || text.includes("mule")) species.push("mule_deer");
    if (text.includes("bear")) species.push("black_bear");
    if (text.includes("moose")) species.push("moose");
    if (text.includes("pronghorn") || text.includes("antelope")) species.push("pronghorn");
    if (text.includes("sheep")) species.push("bighorn_sheep");
    if (text.includes("goat")) species.push("mountain_goat");
    // Default to elk if no species detected
    if (species.length === 0) species.push("elk");
    return species;
  }
}
