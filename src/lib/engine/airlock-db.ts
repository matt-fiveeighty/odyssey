/**
 * Airlock DB Bridge — Connects the pure-logic data-airlock engine to Supabase.
 *
 * This module provides the functions that API routes and crons use to:
 * 1. Build StagingSnapshot objects from flat DB rows
 * 2. Evaluate staging data against live production state
 * 3. Promote or reject scraped batches
 *
 * The actual diff/tolerance logic lives in data-airlock.ts (untouched).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { State, FeeLineItem } from "@/lib/types";
import {
  type StagingSnapshot,
  type StagingFeeData,
  type StagingDeadlineData,
  type StagingQuotaData,
  type StagingRuleData,
  type StagingSpeciesData,
  type AirlockVerdict,
  evaluateSnapshot,
} from "./data-airlock";
import { STATES_MAP } from "@/lib/constants/states";

// =============================================================================
// DB Row Types (mirror supabase-scraper-tables.sql columns)
// =============================================================================

export interface DbScrapedFee {
  id: string;
  state_id: string;
  fee_name: string;
  amount: number;
  residency: "resident" | "nonresident" | "both";
  species_id: string | null;
  frequency: string;
  notes: string | null;
  source_url: string | null;
  source_pulled_at: string;
  scrape_batch_id: string | null;
  status: string;
}

export interface DbScrapedDeadline {
  id: string;
  state_id: string;
  species_id: string;
  deadline_type: string;
  date: string;
  year: number;
  notes: string | null;
  source_url: string | null;
  source_pulled_at: string;
  scrape_batch_id: string | null;
  status: string;
}

export interface DbScrapedSeason {
  id: string;
  state_id: string;
  species_id: string;
  unit_code: string | null;
  season_type: string;
  start_date: string;
  end_date: string;
  year: number;
  notes: string | null;
  source_url: string | null;
  source_pulled_at: string;
  scrape_batch_id: string | null;
  status: string;
}

// =============================================================================
// Build StagingSnapshot from DB rows
// =============================================================================

/**
 * Transform flat scraped_fees + scraped_deadlines DB rows into a StagingSnapshot
 * that data-airlock.ts can evaluate.
 */
export function buildSnapshotFromScrapedData(
  fees: DbScrapedFee[],
  deadlines: DbScrapedDeadline[],
  stateId: string,
  batchId: string,
): StagingSnapshot {
  const liveState = STATES_MAP[stateId];
  const sourceUrl = fees[0]?.source_url ?? deadlines[0]?.source_url ?? liveState?.fgUrl ?? "";
  const now = new Date().toISOString();

  return {
    id: `staging-${stateId}-${Date.now()}`,
    stateId,
    capturedAt: now,
    sourceUrl,
    dataVersion: `${new Date().getFullYear()}.${batchId.slice(-4)}`,
    captureMethod: "scrape",
    fees: buildFeeData(fees),
    deadlines: buildDeadlineData(deadlines),
    quotas: buildQuotaData(),
    rules: buildRuleData(stateId),
    species: buildSpeciesData(stateId),
    capturedBy: "system",
    notes: `Batch: ${batchId}`,
  };
}

// ── Fee mapping ─────────────────────────────────────────────────────────────

function buildFeeData(fees: DbScrapedFee[]): StagingFeeData {
  const tagCosts: Record<string, number> = {};
  const residentTagCosts: Record<string, number> = {};
  const pointCost: Record<string, number> = {};
  const residentPointCost: Record<string, number> = {};
  const feeSchedule: FeeLineItem[] = [];
  const residentFeeSchedule: FeeLineItem[] = [];

  let appFee = 0;
  let qualifyingLicense = 0;
  let pointFee = 0;
  let resAppFee = 0;
  let resQualifyingLicense = 0;
  let resPointFee = 0;

  for (const fee of fees) {
    const nameLower = fee.fee_name.toLowerCase();
    const isResident = fee.residency === "resident";
    const isNR = fee.residency === "nonresident" || fee.residency === "both";

    // Per-species tag costs
    if (fee.species_id) {
      // Check if this is a point cost vs tag cost
      if (nameLower.match(/point\s*(fee|cost)|preference\s*(fee|cost)/)) {
        if (isNR) pointCost[fee.species_id] = fee.amount;
        if (isResident) residentPointCost[fee.species_id] = fee.amount;
      } else {
        if (isNR) tagCosts[fee.species_id] = fee.amount;
        if (isResident) residentTagCosts[fee.species_id] = fee.amount;
      }
      continue;
    }

    // License-level fees (no speciesId)
    if (nameLower.match(/app(lication)?\s*(fee|cost)/)) {
      if (isNR) appFee = fee.amount;
      if (isResident) resAppFee = fee.amount;
    } else if (nameLower.match(/point\s*(fee|cost)|preference\s*(fee|cost)/)) {
      if (isNR) pointFee = fee.amount;
      if (isResident) resPointFee = fee.amount;
    } else if (nameLower.match(/license|qualifying|sportsman|conservation|habitat|combo/)) {
      if (isNR) qualifyingLicense = fee.amount;
      if (isResident) resQualifyingLicense = fee.amount;
    }

    // Add to fee schedule
    const item: FeeLineItem = {
      name: fee.fee_name,
      amount: fee.amount,
      frequency: fee.frequency as FeeLineItem["frequency"],
      required: true,
      notes: fee.notes ?? undefined,
    };
    if (isNR) feeSchedule.push(item);
    if (isResident) residentFeeSchedule.push(item);
  }

  return {
    licenseFees: { qualifyingLicense, appFee, pointFee },
    feeSchedule,
    tagCosts,
    pointCost,
    residentLicenseFees: { qualifyingLicense: resQualifyingLicense, appFee: resAppFee, pointFee: resPointFee },
    residentFeeSchedule: residentFeeSchedule.length > 0 ? residentFeeSchedule : undefined,
    residentTagCosts: Object.keys(residentTagCosts).length > 0 ? residentTagCosts : undefined,
    residentPointCost: Object.keys(residentPointCost).length > 0 ? residentPointCost : undefined,
  };
}

// ── Deadline mapping ────────────────────────────────────────────────────────

function buildDeadlineData(deadlines: DbScrapedDeadline[]): StagingDeadlineData {
  const applicationDeadlines: Record<string, { open: string; close: string }> = {};
  const drawResultDates: Record<string, string> = {};

  for (const d of deadlines) {
    if (d.deadline_type === "application_open") {
      if (!applicationDeadlines[d.species_id]) {
        applicationDeadlines[d.species_id] = { open: d.date, close: "" };
      } else {
        applicationDeadlines[d.species_id].open = d.date;
      }
    } else if (d.deadline_type === "application_close") {
      if (!applicationDeadlines[d.species_id]) {
        applicationDeadlines[d.species_id] = { open: "", close: d.date };
      } else {
        applicationDeadlines[d.species_id].close = d.date;
      }
    } else if (d.deadline_type === "draw_results") {
      drawResultDates[d.species_id] = d.date;
    }
  }

  return { applicationDeadlines, drawResultDates };
}

// ── Quota / Rule / Species placeholders ─────────────────────────────────────
// Scrapers don't currently capture quotas or rule changes.
// These return data from the live constants so the airlock can diff against them.

function buildQuotaData(): StagingQuotaData {
  return { tagQuotas: undefined };
}

function buildRuleData(stateId: string): StagingRuleData {
  const live = STATES_MAP[stateId];
  if (!live) {
    return {
      pointSystem: "unknown",
      pointSystemDetails: { description: "Unknown state" },
      applicationApproach: "per_unit",
    };
  }
  return {
    pointSystem: live.pointSystem,
    pointSystemDetails: { ...live.pointSystemDetails },
    applicationApproach: live.applicationApproach,
    onceInALifetime: live.onceInALifetime ? [...live.onceInALifetime] : undefined,
  };
}

function buildSpeciesData(stateId: string): StagingSpeciesData {
  const live = STATES_MAP[stateId];
  return {
    availableSpecies: live ? [...live.availableSpecies] : [],
  };
}

// =============================================================================
// Live State Loader — for airlock comparison baseline
// =============================================================================

/**
 * Build the current "live" State object by merging hardcoded constants with
 * previously approved DB data. This is the baseline the airlock diffs against.
 */
export async function getLiveStateForAirlock(
  supabase: SupabaseClient,
  stateId: string,
): Promise<State | null> {
  const base = STATES_MAP[stateId];
  if (!base) return null;

  // Merge in any previously-approved scraped fees
  const { data: approvedFees } = await supabase
    .from("scraped_fees")
    .select("*")
    .eq("state_id", stateId)
    .eq("status", "approved")
    .limit(500);

  if (approvedFees && approvedFees.length > 0) {
    const feeData = buildFeeData(approvedFees as DbScrapedFee[]);
    const merged: State = {
      ...base,
      licenseFees: {
        qualifyingLicense: feeData.licenseFees.qualifyingLicense || base.licenseFees.qualifyingLicense,
        appFee: feeData.licenseFees.appFee || base.licenseFees.appFee,
        pointFee: feeData.licenseFees.pointFee || base.licenseFees.pointFee,
      },
      tagCosts: { ...base.tagCosts, ...feeData.tagCosts },
      pointCost: { ...base.pointCost, ...feeData.pointCost },
    };
    if (feeData.residentTagCosts) {
      merged.residentTagCosts = { ...(base.residentTagCosts ?? {}), ...feeData.residentTagCosts };
    }
    return merged;
  }

  return base;
}

// =============================================================================
// Batch Evaluation — run the airlock on a staging batch
// =============================================================================

export interface EvaluationResult {
  verdict: AirlockVerdict;
  autoPromoted: boolean;
  queueId: string;
}

/**
 * Evaluate a staging batch: load scraped rows, build snapshot, run airlock,
 * auto-promote or quarantine.
 */
export async function evaluateStagingBatch(
  supabase: SupabaseClient,
  stateId: string,
  batchId: string,
): Promise<EvaluationResult> {
  // 1. Load staging rows for this batch
  const [feesResult, deadlinesResult] = await Promise.all([
    supabase
      .from("scraped_fees")
      .select("*")
      .eq("scrape_batch_id", batchId)
      .eq("status", "staging"),
    supabase
      .from("scraped_deadlines")
      .select("*")
      .eq("scrape_batch_id", batchId)
      .eq("status", "staging"),
  ]);

  const fees = (feesResult.data ?? []) as DbScrapedFee[];
  const deadlines = (deadlinesResult.data ?? []) as DbScrapedDeadline[];

  // 2. Build the snapshot
  const snapshot = buildSnapshotFromScrapedData(fees, deadlines, stateId, batchId);

  // 3. Load live state for comparison
  const liveState = await getLiveStateForAirlock(supabase, stateId);
  if (!liveState) {
    throw new Error(`Unknown state: ${stateId}`);
  }

  // 4. Run the airlock evaluation
  const verdict = evaluateSnapshot(snapshot, liveState);
  const now = new Date().toISOString();

  // 5. Insert queue entry
  const autoPromoted = verdict.canAutoPromote;
  const queueStatus = autoPromoted ? "auto_approved" : "quarantined";

  const { data: queueEntry, error: queueError } = await supabase
    .from("airlock_queue")
    .insert({
      state_id: stateId,
      scrape_batch_id: batchId,
      status: queueStatus,
      verdict_json: verdict,
      diffs_json: verdict.diffs,
      block_count: verdict.blockCount,
      warn_count: verdict.warnCount,
      pass_count: verdict.passCount,
      summary: verdict.summary,
      evaluated_at: now,
      resolved_at: autoPromoted ? now : null,
      resolved_by: autoPromoted ? "system" : null,
    })
    .select("id")
    .single();

  if (queueError) {
    throw new Error(`Failed to insert airlock_queue: ${queueError.message}`);
  }

  const queueId = queueEntry.id as string;

  // 6. If auto-promote, update staging rows and sync fees
  if (autoPromoted) {
    await promoteScrapedBatch(supabase, batchId, stateId);

    // Log to audit
    await supabase.from("airlock_audit_log").insert({
      queue_id: queueId,
      state_id: stateId,
      action: "auto_promote",
      diffs_promoted: verdict.diffs,
      promoted_by: "system",
    });
  }

  return { verdict, autoPromoted, queueId };
}

// =============================================================================
// Promote / Reject Batches
// =============================================================================

/**
 * Promote all staging rows in a batch to 'approved' and sync fees to ref_states.
 */
export async function promoteScrapedBatch(
  supabase: SupabaseClient,
  batchId: string,
  stateId: string,
): Promise<void> {
  // Update all scraped tables for this batch
  const tables = [
    "scraped_fees",
    "scraped_deadlines",
    "scraped_seasons",
    "scraped_regulations",
    "scraped_leftover_tags",
  ] as const;

  await Promise.all(
    tables.map((table) =>
      supabase
        .from(table)
        .update({ status: "approved" })
        .eq("scrape_batch_id", batchId)
        .eq("status", "staging")
    )
  );

  // Sync approved fees to ref_states (the production table the app reads from)
  const { data: approvedFees } = await supabase
    .from("scraped_fees")
    .select("*")
    .eq("scrape_batch_id", batchId)
    .eq("status", "approved");

  if (approvedFees && approvedFees.length > 0) {
    const feeData = buildFeeData(approvedFees as DbScrapedFee[]);
    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      tag_costs: feeData.tagCosts,
      license_fees: feeData.licenseFees,
      source_pulled_at: now,
      updated_at: now,
    };

    if (feeData.residentTagCosts && Object.keys(feeData.residentTagCosts).length > 0) {
      updatePayload.resident_tag_costs = feeData.residentTagCosts;
    }

    await supabase
      .from("ref_states")
      .update(updatePayload)
      .eq("id", stateId);
  }
}

/**
 * Reject all staging rows in a batch.
 */
export async function rejectScrapedBatch(
  supabase: SupabaseClient,
  batchId: string,
): Promise<void> {
  const tables = [
    "scraped_fees",
    "scraped_deadlines",
    "scraped_seasons",
    "scraped_regulations",
    "scraped_leftover_tags",
  ] as const;

  await Promise.all(
    tables.map((table) =>
      supabase
        .from(table)
        .update({ status: "rejected" })
        .eq("scrape_batch_id", batchId)
        .eq("status", "staging")
    )
  );
}

// =============================================================================
// Unevaluated Batch Discovery — for cron safety net
// =============================================================================

export interface UnevaluatedBatch {
  stateId: string;
  batchId: string;
}

/**
 * Find staging batches that haven't been evaluated yet (webhook didn't fire).
 */
export async function getUnevaluatedBatches(
  supabase: SupabaseClient,
): Promise<UnevaluatedBatch[]> {
  // Get distinct batch IDs from staging rows
  const { data: stagingFees } = await supabase
    .from("scraped_fees")
    .select("state_id, scrape_batch_id")
    .eq("status", "staging")
    .not("scrape_batch_id", "is", null)
    .limit(200);

  const { data: stagingDeadlines } = await supabase
    .from("scraped_deadlines")
    .select("state_id, scrape_batch_id")
    .eq("status", "staging")
    .not("scrape_batch_id", "is", null)
    .limit(200);

  // Combine unique batches
  const batchMap = new Map<string, string>();
  for (const row of [...(stagingFees ?? []), ...(stagingDeadlines ?? [])]) {
    if (row.scrape_batch_id && !batchMap.has(row.scrape_batch_id)) {
      batchMap.set(row.scrape_batch_id, row.state_id);
    }
  }

  // Check which are already in the queue
  const batchIds = [...batchMap.keys()];
  if (batchIds.length === 0) return [];

  const { data: existingQueue } = await supabase
    .from("airlock_queue")
    .select("scrape_batch_id")
    .in("scrape_batch_id", batchIds);

  const evaluated = new Set(
    (existingQueue ?? []).map((q: { scrape_batch_id: string }) => q.scrape_batch_id)
  );

  return batchIds
    .filter((id) => !evaluated.has(id))
    .map((batchId) => ({ stateId: batchMap.get(batchId)!, batchId }));
}
