/**
 * Plausibility Guards for Scraper Data
 *
 * Provides the "never overwrite good data" guard and row count sanity checks.
 * These are pure utility functions callable from any scraper -- they check
 * existing DB state before allowing potentially destructive operations.
 *
 * - guardAgainstDataLoss: prevents 0-row scrape results from wiping existing data
 * - checkRowCountSanity: flags >80% row count drops as likely scraper failures
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// guardAgainstDataLoss
// ---------------------------------------------------------------------------

/**
 * Never-overwrite-good-data guard.
 *
 * If a scraper returns 0 rows but the DB already has data for this state,
 * the upsert is skipped with a warning. This prevents transient failures
 * (network errors, website changes, etc.) from wiping good data.
 */
export async function guardAgainstDataLoss(
  table: string,
  stateId: string,
  newRowCount: number,
  supabase: SupabaseClient,
  log: (msg: string) => void
): Promise<{ safe: boolean; reason: string }> {
  // If we have new data, always safe to proceed
  if (newRowCount > 0) {
    return { safe: true, reason: "Has data" };
  }

  // New row count is 0 -- check if DB has existing data
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("state_id", stateId);

  if (error) {
    log(
      `  [data-loss-guard] Could not check existing ${table} for ${stateId}: ${error.message}`
    );
    // Err on the side of caution: don't overwrite
    return {
      safe: false,
      reason: `Could not verify existing data: ${error.message}`,
    };
  }

  const existingCount = count ?? 0;

  if (existingCount === 0) {
    return { safe: true, reason: "No existing data to protect" };
  }

  const reason = `Scraper returned 0 rows but DB has ${existingCount} existing rows. Skipping upsert to protect data.`;
  log(`  [data-loss-guard] ${reason}`);

  return { safe: false, reason };
}

// ---------------------------------------------------------------------------
// checkRowCountSanity
// ---------------------------------------------------------------------------

/**
 * Row count sanity check.
 *
 * If the new scrape returns >80% fewer rows than the DB already has,
 * it's likely a scraper failure rather than a genuine data reduction.
 * Flags the result as implausible so callers can log a warning.
 */
export async function checkRowCountSanity(
  table: string,
  stateId: string,
  newCount: number,
  supabase: SupabaseClient,
  log: (msg: string) => void
): Promise<{ plausible: boolean; dropPercent: number }> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("state_id", stateId);

  if (error) {
    log(
      `  [row-sanity] Could not check existing ${table} for ${stateId}: ${error.message}`
    );
    // Can't compare -- assume plausible
    return { plausible: true, dropPercent: 0 };
  }

  const existingCount = count ?? 0;

  if (existingCount === 0) {
    return { plausible: true, dropPercent: 0 };
  }

  const dropPercent =
    ((existingCount - newCount) / existingCount) * 100;

  if (dropPercent > 80) {
    log(
      `  [row-sanity] WARNING: ${table} for ${stateId} dropped from ${existingCount} to ${newCount} rows (${dropPercent.toFixed(1)}% drop). Likely scraper failure, not real data change.`
    );
    return { plausible: false, dropPercent };
  }

  return { plausible: true, dropPercent };
}
