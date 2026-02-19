/**
 * Scraper Orchestrator — runs all state scrapers and prints a comprehensive summary.
 *
 * Collects: units, draw history, deadlines, fees, seasons, regulations, leftover tags
 *
 * Usage:
 *   npx tsx scripts/scrapers/run-all.ts         # Run all 11 states
 *   npx tsx scripts/scrapers/run-all.ts CO       # Run Colorado only
 *   npx tsx scripts/scrapers/run-all.ts CO WY MT # Run specific states
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL  — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (bypasses RLS)
 */

import "dotenv/config";
import { BaseScraper, ScraperResult } from "./base-scraper";

// Import all state scrapers
import { ColoradoScraper } from "./co-draw-data";
import { WyomingScraper } from "./wy-draw-data";
import { MontanaScraper } from "./mt-draw-data";
import { NevadaScraper } from "./nv-draw-data";
import { ArizonaScraper } from "./az-draw-data";
import { UtahScraper } from "./ut-draw-data";
import { NewMexicoScraper } from "./nm-draw-data";
import { OregonScraper } from "./or-draw-data";
import { IdahoScraper } from "./id-draw-data";
import { KansasScraper } from "./ks-draw-data";
import { AlaskaScraper } from "./ak-draw-data";
import { WashingtonScraper } from "./wa-draw-data";
import { NebraskaScraper } from "./ne-draw-data";
import { SouthDakotaScraper } from "./sd-draw-data";
import { NorthDakotaScraper } from "./nd-draw-data";

// ---------------------------------------------------------------------------
// Scraper registry
// ---------------------------------------------------------------------------

const ALL_SCRAPERS: BaseScraper[] = [
  new ColoradoScraper(),
  new WyomingScraper(),
  new MontanaScraper(),
  new NevadaScraper(),
  new ArizonaScraper(),
  new UtahScraper(),
  new NewMexicoScraper(),
  new OregonScraper(),
  new IdahoScraper(),
  new KansasScraper(),
  new AlaskaScraper(),
  new WashingtonScraper(),
  new NebraskaScraper(),
  new SouthDakotaScraper(),
  new NorthDakotaScraper(),
];

// ---------------------------------------------------------------------------
// Summary table
// ---------------------------------------------------------------------------

interface SummaryRow {
  state: string;
  stateId: string;
  units: number;
  drawHistory: number;
  deadlines: number;
  fees: number;
  seasons: number;
  regulations: number;
  leftoverTags: number;
  errors: number;
  errorMessages: string[];
}

function printSummaryTable(rows: SummaryRow[]): void {
  console.log("\n" + "=".repeat(110));
  console.log("SCRAPER SUMMARY");
  console.log("=".repeat(110));

  // Header
  console.log(
    pad("State", 16) + pad("ID", 5) + pad("Units", 7) + pad("Draw", 7) +
    pad("Deadl", 7) + pad("Fees", 7) + pad("Seasn", 7) + pad("Regs", 7) +
    pad("Left", 7) + pad("Errs", 7)
  );
  console.log("-".repeat(77));

  const totals = { units: 0, drawHistory: 0, deadlines: 0, fees: 0, seasons: 0, regulations: 0, leftoverTags: 0, errors: 0 };

  for (const row of rows) {
    totals.units += row.units;
    totals.drawHistory += row.drawHistory;
    totals.deadlines += row.deadlines;
    totals.fees += row.fees;
    totals.seasons += row.seasons;
    totals.regulations += row.regulations;
    totals.leftoverTags += row.leftoverTags;
    totals.errors += row.errors;

    console.log(
      pad(row.state, 16) + pad(row.stateId, 5) +
      pad(String(row.units), 7) + pad(String(row.drawHistory), 7) +
      pad(String(row.deadlines), 7) + pad(String(row.fees), 7) +
      pad(String(row.seasons), 7) + pad(String(row.regulations), 7) +
      pad(String(row.leftoverTags), 7) + pad(String(row.errors), 7)
    );

    for (const errMsg of row.errorMessages) {
      console.log(`  -> ${errMsg}`);
    }
  }

  console.log("-".repeat(77));
  console.log(
    pad("TOTAL", 16) + pad("", 5) +
    pad(String(totals.units), 7) + pad(String(totals.drawHistory), 7) +
    pad(String(totals.deadlines), 7) + pad(String(totals.fees), 7) +
    pad(String(totals.seasons), 7) + pad(String(totals.regulations), 7) +
    pad(String(totals.leftoverTags), 7) + pad(String(totals.errors), 7)
  );
  console.log("=".repeat(110));
}

function pad(str: string, len: number): string {
  return str.padEnd(len);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Odyssey Outdoors: State Data Scraper ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Total scrapers registered: ${ALL_SCRAPERS.length}`);

  // Support running specific states: npx tsx run-all.ts CO WY MT
  const targetStates = process.argv.slice(2).map((s) => s.toUpperCase());

  const scrapers = targetStates.length > 0
    ? ALL_SCRAPERS.filter((s) => targetStates.includes(s.stateId))
    : ALL_SCRAPERS;

  if (targetStates.length > 0 && scrapers.length === 0) {
    console.error(`No matching states: ${targetStates.join(", ")}`);
    console.error(`Available: ${ALL_SCRAPERS.map((s) => s.stateId).join(", ")}`);
    process.exit(1);
  }

  console.log(
    targetStates.length > 0
      ? `Running ${scrapers.length} state(s): ${scrapers.map((s) => s.stateId).join(", ")}`
      : `Running all ${scrapers.length} scrapers`
  );

  console.log("Collecting: units, draw history, deadlines, fees, seasons, regulations, leftover tags\n");

  const summaryRows: SummaryRow[] = [];

  // Run scrapers sequentially to be respectful to state websites
  for (const scraper of scrapers) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Running: ${scraper.stateName} (${scraper.stateId})`);
    console.log("=".repeat(60));

    let result: ScraperResult;

    try {
      result = await scraper.run();
    } catch (err) {
      result = {
        units: 0,
        drawHistory: 0,
        deadlines: 0,
        fees: 0,
        seasons: 0,
        regulations: 0,
        leftoverTags: 0,
        errors: [`Fatal: ${(err as Error).message}`],
      };
    }

    summaryRows.push({
      state: scraper.stateName,
      stateId: scraper.stateId,
      units: result.units,
      drawHistory: result.drawHistory,
      deadlines: result.deadlines,
      fees: result.fees,
      seasons: result.seasons,
      regulations: result.regulations,
      leftoverTags: result.leftoverTags,
      errors: result.errors.length,
      errorMessages: result.errors.slice(0, 5),
    });

    // Polite delay between states (2 seconds)
    if (scrapers.indexOf(scraper) < scrapers.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Print summary table
  printSummaryTable(summaryRows);

  const totalErrors = summaryRows.reduce((sum, r) => sum + r.errors, 0);
  console.log(`\nDone. ${totalErrors > 0 ? `⚠ ${totalErrors} errors — check logs above.` : "✓ All clean."}`);

  // Exit with error code if any fatal errors
  if (summaryRows.some((r) => r.errors > 0 && r.units === 0 && r.drawHistory === 0)) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
