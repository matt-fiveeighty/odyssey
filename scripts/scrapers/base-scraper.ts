/**
 * Base scraper class for state fish & game data.
 *
 * All state-specific scrapers extend this class, implementing:
 *   - scrapeUnits()         — fetch/parse hunting unit data
 *   - scrapeDrawHistory()   — fetch/parse historical draw statistics
 *   - scrapeDeadlines()     — fetch application deadlines & key dates  (optional)
 *   - scrapeFees()          — fetch license/application fee schedules  (optional)
 *   - scrapeSeasons()       — fetch season dates by species/weapon     (optional)
 *   - scrapeRegulations()   — fetch regulation changes & announcements (optional)
 *   - scrapeLeftoverTags()  — fetch leftover/2nd draw tag availability (optional)
 *
 * The `run()` method orchestrates all scraping, DB upsert, and logging.
 */

import "dotenv/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ScrapedUnit {
  stateId: string;
  speciesId: string;
  unitCode: string;
  unitName: string;
  successRate?: number;
  trophyRating?: number;
  pointsRequiredResident?: number;
  pointsRequiredNonresident?: number;
  terrainType?: string[];
  pressureLevel?: string;
  elevationRange?: [number, number];
  publicLandPct?: number;
  tagQuotaNonresident?: number;
  notes?: string;
}

export interface ScrapedDrawHistory {
  unitId: string; // composite key: "stateId:speciesId:unitCode"
  year: number;
  applicants: number;
  tags: number;
  odds: number;
  minPointsDrawn: number | null;
}

export interface ScrapedDeadline {
  stateId: string;
  speciesId: string;
  deadlineType: string; // "application_open" | "application_close" | "draw_results" | "leftover"
  date: string; // ISO date string
  year: number;
  notes?: string;
}

export interface ScrapedFee {
  stateId: string;
  feeName: string;
  amount: number;
  residency: "resident" | "nonresident" | "both";
  speciesId?: string;
  frequency: string; // "annual" | "per_species" | "one_time"
  notes?: string;
}

export interface ScrapedSeason {
  stateId: string;
  speciesId: string;
  unitCode?: string;
  seasonType: string; // "archery" | "muzzleloader" | "rifle" | "general" etc.
  startDate: string;
  endDate: string;
  year: number;
  notes?: string;
}

export interface ScrapedRegulation {
  stateId: string;
  title: string;
  summary: string;
  effectiveDate?: string;
  sourceUrl: string;
  category: string; // "rule_change" | "announcement" | "emergency_closure" | "leftover_tags"
}

export interface ScrapedLeftoverTag {
  stateId: string;
  speciesId: string;
  unitCode: string;
  tagsAvailable: number;
  seasonType?: string;
  sourceUrl: string;
}

export interface ScraperResult {
  units: number;
  drawHistory: number;
  deadlines: number;
  fees: number;
  seasons: number;
  regulations: number;
  leftoverTags: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Abstract base class
// ---------------------------------------------------------------------------

export abstract class BaseScraper {
  abstract stateId: string;
  abstract stateName: string;
  abstract sourceUrl: string;

  protected supabase: SupabaseClient;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    this.supabase = createClient(url, key);
  }

  // -------------------------------------------------------------------------
  // Abstract methods — each state scraper MUST implement these
  // -------------------------------------------------------------------------

  abstract scrapeUnits(): Promise<ScrapedUnit[]>;
  abstract scrapeDrawHistory(): Promise<ScrapedDrawHistory[]>;

  // -------------------------------------------------------------------------
  // Optional methods — override per-state for richer data collection
  // -------------------------------------------------------------------------

  async scrapeDeadlines(): Promise<ScrapedDeadline[]> { return []; }
  async scrapeFees(): Promise<ScrapedFee[]> { return []; }
  async scrapeSeasons(): Promise<ScrapedSeason[]> { return []; }
  async scrapeRegulations(): Promise<ScrapedRegulation[]> { return []; }
  async scrapeLeftoverTags(): Promise<ScrapedLeftoverTag[]> { return []; }

  // -------------------------------------------------------------------------
  // Helper: fetch a page with retry and user-agent
  // -------------------------------------------------------------------------

  async fetchPage(url: string, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "HuntPlannerBot/1.0 (research; contact: admin@odysseyoutdoors.com)",
            Accept: "text/html,application/xhtml+xml,text/csv,*/*",
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        return await res.text();
      } catch (err) {
        this.log(
          `fetchPage attempt ${attempt}/${retries} failed: ${(err as Error).message}`
        );
        if (attempt === retries) throw err;
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }

    // Unreachable, but TypeScript wants a return
    throw new Error("fetchPage exhausted retries");
  }

  // -------------------------------------------------------------------------
  // Helper: fetch and parse a CSV file
  // -------------------------------------------------------------------------

  async fetchCsv(url: string): Promise<string[][]> {
    const text = await this.fetchPage(url);
    return this.parseCsvText(text);
  }

  /**
   * Parse raw CSV text into a 2D array of strings.
   * Handles quoted fields containing commas and newlines.
   */
  private parseCsvText(text: string): string[][] {
    const rows: string[][] = [];
    let current: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          field += '"';
          i++; // skip escaped quote
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          current.push(field.trim());
          field = "";
        } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
          current.push(field.trim());
          if (current.some((f) => f.length > 0)) {
            rows.push(current);
          }
          current = [];
          field = "";
          if (ch === "\r") i++; // skip \n after \r
        } else {
          field += ch;
        }
      }
    }

    // Push last field/row
    if (field.length > 0 || current.length > 0) {
      current.push(field.trim());
      if (current.some((f) => f.length > 0)) {
        rows.push(current);
      }
    }

    return rows;
  }

  // -------------------------------------------------------------------------
  // Helper: convert a CSV row + header array into a keyed object
  // -------------------------------------------------------------------------

  parseCsvRow(
    row: string[],
    headers: string[]
  ): Record<string, string> {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] ?? "";
    }
    return obj;
  }

  // -------------------------------------------------------------------------
  // Helper: console log with state prefix
  // -------------------------------------------------------------------------

  log(msg: string): void {
    console.log(`[${this.stateId}] ${msg}`);
  }

  // -------------------------------------------------------------------------
  // Fee → ref_states sync: push scraped fee data into the ref_states table
  // so the app's State objects stay current with real F&G fee data.
  // -------------------------------------------------------------------------

  protected async syncFeesToRefStates(
    fees: ScrapedFee[],
    now: string
  ): Promise<void> {
    if (fees.length === 0) return;

    // Separate NR tag costs, R tag costs, and license-level fees
    const tagCosts: Record<string, number> = {};
    const residentTagCosts: Record<string, number> = {};
    let appFee = 0;
    let qualifyingLicense = 0;
    let pointFee = 0;

    for (const fee of fees) {
      const nameLower = fee.feeName.toLowerCase();

      // Per-species tag costs
      if (fee.speciesId) {
        if (fee.residency === "nonresident" || fee.residency === "both") {
          tagCosts[fee.speciesId] = fee.amount;
        }
        if (fee.residency === "resident") {
          residentTagCosts[fee.speciesId] = fee.amount;
        }
        continue;
      }

      // License-level fees (no speciesId)
      if (nameLower.match(/app(lication)?\s*(fee|cost)/)) {
        appFee = fee.amount;
      } else if (nameLower.match(/point\s*(fee|cost)|preference\s*(fee|cost)/)) {
        pointFee = fee.amount;
      } else if (
        nameLower.match(
          /license|qualifying|sportsman|conservation|habitat|combo/
        )
      ) {
        qualifyingLicense = fee.amount;
      }
    }

    // Only sync if we got meaningful per-species data
    if (Object.keys(tagCosts).length === 0) {
      this.log("  No NR tag costs found in scraped fees — skipping ref_states sync");
      return;
    }

    const updatePayload: Record<string, unknown> = {
      tag_costs: tagCosts,
      license_fees: { qualifyingLicense, appFee, pointFee },
      source_url: this.sourceUrl,
      source_pulled_at: now,
      updated_at: now,
    };

    // Only include resident tag costs if we actually scraped them
    if (Object.keys(residentTagCosts).length > 0) {
      updatePayload.resident_tag_costs = residentTagCosts;
    }

    const { error } = await this.supabase
      .from("ref_states")
      .update(updatePayload)
      .eq("id", this.stateId);

    if (error) {
      this.log(`  ref_states sync error: ${error.message}`);
    } else {
      this.log(
        `  Synced ${Object.keys(tagCosts).length} NR tag costs + license fees to ref_states`
      );
    }
  }

  // -------------------------------------------------------------------------
  // run() — full orchestrator (units + draw history + deadlines + fees + etc.)
  // -------------------------------------------------------------------------

  async run(): Promise<ScraperResult> {
    const errors: string[] = [];
    let unitCount = 0;
    let drawHistoryCount = 0;
    let deadlineCount = 0;
    let feeCount = 0;
    let seasonCount = 0;
    let regulationCount = 0;
    let leftoverTagCount = 0;

    const now = new Date().toISOString();

    // --- 1. Scrape & upsert units ---
    try {
      this.log("Scraping units...");
      const units = await this.scrapeUnits();
      this.log(`  Found ${units.length} units`);

      if (units.length > 0) {
        const rows = units.map((u) => ({
          state_id: u.stateId,
          species_id: u.speciesId,
          unit_code: u.unitCode,
          unit_name: u.unitName,
          success_rate: u.successRate ?? null,
          trophy_rating: u.trophyRating ?? null,
          points_required_resident: u.pointsRequiredResident ?? null,
          points_required_nonresident: u.pointsRequiredNonresident ?? null,
          terrain_type: u.terrainType ?? [],
          pressure_level: u.pressureLevel ?? null,
          elevation_range: u.elevationRange ?? [],
          public_land_pct: u.publicLandPct ?? null,
          tag_quota_nonresident: u.tagQuotaNonresident ?? null,
          notes: u.notes ?? null,
          source_url: this.sourceUrl,
          source_pulled_at: now,
          updated_at: now,
        }));

        const { data, error } = await this.supabase
          .from("ref_units")
          .upsert(rows, { onConflict: "state_id,species_id,unit_code" })
          .select("id");

        if (error) {
          errors.push(`units upsert: ${error.message}`);
          this.log(`  Unit upsert error: ${error.message}`);
        }

        unitCount = data?.length ?? 0;
        this.log(`  Upserted ${unitCount} units`);
      }
    } catch (err) {
      const msg = `scrapeUnits failed: ${(err as Error).message}`;
      errors.push(msg);
      this.log(`  ${msg}`);
    }

    // --- 2. Scrape & upsert draw history ---
    try {
      this.log("Scraping draw history...");
      const history = await this.scrapeDrawHistory();
      this.log(`  Found ${history.length} draw history rows`);

      if (history.length > 0) {
        for (const h of history) {
          const [stateId, speciesId, unitCode] = h.unitId.split(":");

          const { data: unitRows } = await this.supabase
            .from("ref_units")
            .select("id")
            .eq("state_id", stateId)
            .eq("species_id", speciesId)
            .eq("unit_code", unitCode)
            .limit(1);

          if (!unitRows || unitRows.length === 0) {
            errors.push(
              `No ref_units row for ${h.unitId} — skipping`
            );
            continue;
          }

          const unitDbId = unitRows[0].id;

          const { error } = await this.supabase
            .from("ref_unit_draw_history")
            .upsert(
              {
                unit_id: unitDbId,
                year: h.year,
                applicants: h.applicants,
                tags_available: h.tags,
                tags_issued: h.tags,
                odds_percent: h.odds,
                min_points_drawn: h.minPointsDrawn,
                source_url: this.sourceUrl,
                source_pulled_at: now,
              },
              { onConflict: "unit_id,year" }
            );

          if (error) {
            errors.push(`draw history upsert: ${error.message}`);
          } else {
            drawHistoryCount++;
          }
        }

        this.log(`  Upserted ${drawHistoryCount} draw history rows`);
      }
    } catch (err) {
      const msg = `scrapeDrawHistory failed: ${(err as Error).message}`;
      errors.push(msg);
      this.log(`  ${msg}`);
    }

    // --- 3. Scrape & upsert deadlines ---
    try {
      this.log("Scraping deadlines...");
      const deadlines = await this.scrapeDeadlines();
      if (deadlines.length > 0) {
        this.log(`  Found ${deadlines.length} deadlines`);
        const rows = deadlines.map((d) => ({
          state_id: d.stateId,
          species_id: d.speciesId,
          deadline_type: d.deadlineType,
          date: d.date,
          year: d.year,
          notes: d.notes ?? null,
          source_url: this.sourceUrl,
          source_pulled_at: now,
        }));

        const { error } = await this.supabase
          .from("scraped_deadlines")
          .upsert(rows, { onConflict: "state_id,species_id,deadline_type,year" });

        if (error) {
          errors.push(`deadlines upsert: ${error.message}`);
        } else {
          deadlineCount = deadlines.length;
        }
        this.log(`  Upserted ${deadlineCount} deadlines`);
      }
    } catch (err) {
      const msg = `scrapeDeadlines failed: ${(err as Error).message}`;
      errors.push(msg);
      this.log(`  ${msg}`);
    }

    // --- 4. Scrape & upsert fees ---
    let scrapedFees: ScrapedFee[] = [];
    try {
      this.log("Scraping fees...");
      scrapedFees = await this.scrapeFees();
      if (scrapedFees.length > 0) {
        this.log(`  Found ${scrapedFees.length} fee entries`);
        const rows = scrapedFees.map((f) => ({
          state_id: f.stateId,
          fee_name: f.feeName,
          amount: f.amount,
          residency: f.residency,
          species_id: f.speciesId ?? null,
          frequency: f.frequency,
          notes: f.notes ?? null,
          source_url: this.sourceUrl,
          source_pulled_at: now,
        }));

        const { error } = await this.supabase
          .from("scraped_fees")
          .upsert(rows, { onConflict: "state_id,fee_name,residency" });

        if (error) {
          errors.push(`fees upsert: ${error.message}`);
        } else {
          feeCount = scrapedFees.length;
        }
        this.log(`  Upserted ${feeCount} fees`);
      }
    } catch (err) {
      const msg = `scrapeFees failed: ${(err as Error).message}`;
      errors.push(msg);
      this.log(`  ${msg}`);
    }

    // --- 4b. Sync fee data → ref_states (keeps app State objects current) ---
    try {
      await this.syncFeesToRefStates(scrapedFees, now);
    } catch (err) {
      const msg = `syncFeesToRefStates failed: ${(err as Error).message}`;
      errors.push(msg);
      this.log(`  ${msg}`);
    }

    // --- 5. Scrape & upsert seasons ---
    try {
      this.log("Scraping seasons...");
      const seasons = await this.scrapeSeasons();
      if (seasons.length > 0) {
        this.log(`  Found ${seasons.length} season entries`);
        const rows = seasons.map((s) => ({
          state_id: s.stateId,
          species_id: s.speciesId,
          unit_code: s.unitCode ?? null,
          season_type: s.seasonType,
          start_date: s.startDate,
          end_date: s.endDate,
          year: s.year,
          notes: s.notes ?? null,
          source_url: this.sourceUrl,
          source_pulled_at: now,
        }));

        const { error } = await this.supabase
          .from("scraped_seasons")
          .upsert(rows, { onConflict: "state_id,species_id,season_type,year" });

        if (error) {
          errors.push(`seasons upsert: ${error.message}`);
        } else {
          seasonCount = seasons.length;
        }
        this.log(`  Upserted ${seasonCount} seasons`);
      }
    } catch (err) {
      const msg = `scrapeSeasons failed: ${(err as Error).message}`;
      errors.push(msg);
      this.log(`  ${msg}`);
    }

    // --- 6. Scrape & upsert regulations / announcements ---
    try {
      this.log("Scraping regulations...");
      const regs = await this.scrapeRegulations();
      if (regs.length > 0) {
        this.log(`  Found ${regs.length} regulation entries`);
        const rows = regs.map((r) => ({
          state_id: r.stateId,
          title: r.title,
          summary: r.summary,
          effective_date: r.effectiveDate ?? null,
          source_url: r.sourceUrl,
          category: r.category,
          scraped_at: now,
        }));

        const { error } = await this.supabase
          .from("scraped_regulations")
          .upsert(rows, { onConflict: "state_id,title" });

        if (error) {
          errors.push(`regulations upsert: ${error.message}`);
        } else {
          regulationCount = regs.length;
        }
        this.log(`  Upserted ${regulationCount} regulations`);
      }
    } catch (err) {
      const msg = `scrapeRegulations failed: ${(err as Error).message}`;
      errors.push(msg);
      this.log(`  ${msg}`);
    }

    // --- 7. Scrape & upsert leftover tags ---
    try {
      this.log("Scraping leftover tags...");
      const leftovers = await this.scrapeLeftoverTags();
      if (leftovers.length > 0) {
        this.log(`  Found ${leftovers.length} leftover tag entries`);
        const rows = leftovers.map((l) => ({
          state_id: l.stateId,
          species_id: l.speciesId,
          unit_code: l.unitCode,
          tags_available: l.tagsAvailable,
          season_type: l.seasonType ?? null,
          source_url: l.sourceUrl,
          scraped_at: now,
        }));

        const { error } = await this.supabase
          .from("scraped_leftover_tags")
          .upsert(rows, { onConflict: "state_id,species_id,unit_code" });

        if (error) {
          errors.push(`leftover tags upsert: ${error.message}`);
        } else {
          leftoverTagCount = leftovers.length;
        }
        this.log(`  Upserted ${leftoverTagCount} leftover tags`);
      }
    } catch (err) {
      const msg = `scrapeLeftoverTags failed: ${(err as Error).message}`;
      errors.push(msg);
      this.log(`  ${msg}`);
    }

    // --- Log to data_import_log ---
    const totalRows = unitCount + drawHistoryCount + deadlineCount +
      feeCount + seasonCount + regulationCount + leftoverTagCount;

    await this.supabase.from("data_import_log").insert({
      import_type: "scraper",
      state_id: this.stateId,
      rows_imported: totalRows,
      rows_skipped: 0,
      errors: errors.length > 0 ? errors : [],
      source_file: `scrapers/${this.stateId.toLowerCase()}-draw-data.ts`,
      source_url: this.sourceUrl,
    });

    this.log(
      `Done. Units: ${unitCount}, Draw: ${drawHistoryCount}, Deadlines: ${deadlineCount}, ` +
      `Fees: ${feeCount}, Seasons: ${seasonCount}, Regs: ${regulationCount}, Leftover: ${leftoverTagCount}, ` +
      `Errors: ${errors.length}`
    );

    return {
      units: unitCount,
      drawHistory: drawHistoryCount,
      deadlines: deadlineCount,
      fees: feeCount,
      seasons: seasonCount,
      regulations: regulationCount,
      leftoverTags: leftoverTagCount,
      errors,
    };
  }
}
