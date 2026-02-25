/**
 * Data Airlock — F&G Data Ingestion Quarantine Engine
 *
 * All Fish & Game data updates must flow into a staging snapshot first.
 * They are versioned, timestamped, and immutable. No silent corrections
 * or live mutations are permitted.
 *
 * The diff-checker compares a staging snapshot against the current live
 * data and produces a verdict: PASS, WARN, or BLOCK.
 *
 * Tolerance Thresholds:
 *   - Fee increase >8%        → HARD BLOCK (possible scrape error)
 *   - Fee decrease >1%        → BLOCK (suspicious — F&G rarely reduces fees)
 *   - Deadline shift >3 days  → BLOCK (confirm with source)
 *   - Quota drop >20%         → BLOCK (verify with official regulation)
 *   - Rule mutation            → BLOCK (group_point_logic, preference_type changes)
 *   - New species added        → WARN (confirm availability)
 *   - Species removed          → BLOCK (verify delisting)
 */

import type { State, FeeLineItem } from "@/lib/types";

// ============================================================================
// Staging Snapshot — Immutable versioned capture of F&G data
// ============================================================================

export interface StagingSnapshot {
  id: string;                          // Unique snapshot ID: "staging-{stateId}-{timestamp}"
  stateId: string;                     // Which state this snapshot is for
  capturedAt: string;                  // ISO timestamp of capture
  sourceUrl: string;                   // URL that was scraped/entered
  dataVersion: string;                 // Semver: "2026.2"
  captureMethod: "scrape" | "manual" | "api";  // How the data was captured

  // The actual data fields (mirrors State type fields that can change)
  fees: StagingFeeData;
  deadlines: StagingDeadlineData;
  quotas: StagingQuotaData;
  rules: StagingRuleData;
  species: StagingSpeciesData;

  // Audit trail
  capturedBy: string;                  // User ID or "system"
  notes?: string;                      // Manual entry notes
  previousSnapshotId?: string;         // Links to the snapshot this replaces
}

export interface StagingFeeData {
  licenseFees: {
    qualifyingLicense?: number;
    appFee?: number;
    pointFee?: number;
  };
  feeSchedule: FeeLineItem[];
  tagCosts: Record<string, number>;
  pointCost: Record<string, number>;
  // Resident variants
  residentLicenseFees?: {
    qualifyingLicense?: number;
    appFee?: number;
    pointFee?: number;
  };
  residentFeeSchedule?: FeeLineItem[];
  residentTagCosts?: Record<string, number>;
  residentPointCost?: Record<string, number>;
}

export interface StagingDeadlineData {
  applicationDeadlines: Record<string, { open: string; close: string }>;
  drawResultDates?: Record<string, string>;
}

export interface StagingQuotaData {
  /** Per-species NR tag quota (if available from source) */
  tagQuotas?: Record<string, number>;
}

export interface StagingRuleData {
  pointSystem: string;                 // "preference" | "hybrid" | etc.
  pointSystemDetails: {
    preferencePct?: number;
    randomPct?: number;
    squared?: boolean;
    description: string;
  };
  applicationApproach: string;
  onceInALifetime?: string[];
}

export interface StagingSpeciesData {
  availableSpecies: string[];
}

// ============================================================================
// Diff Result — What changed between staging and live
// ============================================================================

export type DiffSeverity = "pass" | "warn" | "block";
export type DiffFieldCategory = "fee" | "deadline" | "quota" | "rule" | "species";

export interface DiffEntry {
  id: string;                          // "diff-{stateId}-{field}-{timestamp}"
  category: DiffFieldCategory;
  field: string;                       // "licenseFees.qualifyingLicense", "applicationDeadlines.elk.close"
  label: string;                       // Human-readable: "CO NR Qualifying License"
  severity: DiffSeverity;
  oldValue: string | number | null;
  newValue: string | number | null;
  changeDescription: string;           // "Fee increased 12% ($101.54 → $113.72)"
  toleranceRule: string;               // "Fee increase >8% = BLOCK"
  pctChange?: number;                  // Percentage change for numeric fields
  daysDelta?: number;                  // Days shifted for date fields
  speciesId?: string;                  // If species-specific
}

export interface AirlockVerdict {
  snapshotId: string;
  stateId: string;
  evaluatedAt: string;                 // ISO timestamp
  overallVerdict: DiffSeverity;        // Worst severity across all diffs
  diffs: DiffEntry[];
  blockCount: number;
  warnCount: number;
  passCount: number;
  summary: string;                     // "3 blocked changes, 1 warning, 12 passed"
  canAutoPromote: boolean;             // True only if all diffs are "pass"
  /** If blocked, what action the user must take */
  requiredAction?: string;
}

// ============================================================================
// Tolerance Configuration — Tunable thresholds
// ============================================================================

export interface AirlockTolerances {
  feeIncreaseMaxPct: number;           // Default: 8 (percent)
  feeDecreaseMaxPct: number;           // Default: 1 (percent) — F&G rarely reduces fees
  deadlineShiftMaxDays: number;        // Default: 3
  quotaDropMaxPct: number;             // Default: 20 (percent)
  blockOnRuleMutation: boolean;        // Default: true
  blockOnSpeciesRemoval: boolean;      // Default: true
  warnOnSpeciesAdded: boolean;         // Default: true
}

export const DEFAULT_TOLERANCES: AirlockTolerances = {
  feeIncreaseMaxPct: 8,
  feeDecreaseMaxPct: 1,
  deadlineShiftMaxDays: 3,
  quotaDropMaxPct: 20,
  blockOnRuleMutation: true,
  blockOnSpeciesRemoval: true,
  warnOnSpeciesAdded: true,
};

// ============================================================================
// Diff Checker — Core Engine
// ============================================================================

/**
 * Compare a staging snapshot against the current live state data.
 * Returns an AirlockVerdict with every detected change classified
 * as PASS, WARN, or BLOCK.
 */
export function evaluateSnapshot(
  snapshot: StagingSnapshot,
  liveState: State,
  tolerances: AirlockTolerances = DEFAULT_TOLERANCES,
): AirlockVerdict {
  const diffs: DiffEntry[] = [];
  const ts = snapshot.capturedAt;

  // ── 1. Fee Diffs ──
  diffs.push(...diffFees(snapshot, liveState, tolerances, ts));

  // ── 2. Deadline Diffs ──
  diffs.push(...diffDeadlines(snapshot, liveState, tolerances, ts));

  // ── 3. Quota Diffs ──
  diffs.push(...diffQuotas(snapshot, liveState, tolerances, ts));

  // ── 4. Rule Diffs ──
  diffs.push(...diffRules(snapshot, liveState, tolerances, ts));

  // ── 5. Species Diffs ──
  diffs.push(...diffSpecies(snapshot, liveState, tolerances, ts));

  // Compute verdict
  const blockCount = diffs.filter((d) => d.severity === "block").length;
  const warnCount = diffs.filter((d) => d.severity === "warn").length;
  const passCount = diffs.filter((d) => d.severity === "pass").length;

  const overallVerdict: DiffSeverity =
    blockCount > 0 ? "block" : warnCount > 0 ? "warn" : "pass";

  const summary = [
    blockCount > 0 ? `${blockCount} blocked` : null,
    warnCount > 0 ? `${warnCount} warning${warnCount > 1 ? "s" : ""}` : null,
    passCount > 0 ? `${passCount} passed` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    snapshotId: snapshot.id,
    stateId: snapshot.stateId,
    evaluatedAt: new Date().toISOString(),
    overallVerdict,
    diffs,
    blockCount,
    warnCount,
    passCount,
    summary: summary || "No changes detected",
    canAutoPromote: overallVerdict === "pass",
    requiredAction:
      blockCount > 0
        ? `Review ${blockCount} blocked change${blockCount > 1 ? "s" : ""} before promoting to live data. Verify against official F&G source.`
        : undefined,
  };
}

// ============================================================================
// Fee Diff — Check all fee fields
// ============================================================================

function diffFees(
  snapshot: StagingSnapshot,
  live: State,
  tolerances: AirlockTolerances,
  ts: string,
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const stateId = snapshot.stateId;

  // NR license fees (flat)
  const feeFields: Array<{ key: keyof NonNullable<State["licenseFees"]>; label: string }> = [
    { key: "qualifyingLicense", label: "NR Qualifying License" },
    { key: "appFee", label: "NR Application Fee" },
    { key: "pointFee", label: "NR Point Fee" },
  ];

  for (const { key, label } of feeFields) {
    const oldVal = live.licenseFees?.[key] ?? null;
    const newVal = snapshot.fees.licenseFees?.[key] ?? null;
    if (oldVal !== null && newVal !== null && oldVal !== newVal) {
      diffs.push(classifyFeeChange(
        `${stateId}-licenseFees-${key}`,
        `${stateId} ${label}`,
        oldVal,
        newVal,
        tolerances,
        ts,
      ));
    }
  }

  // Tag costs per species
  for (const [speciesId, newCost] of Object.entries(snapshot.fees.tagCosts)) {
    const oldCost = live.tagCosts?.[speciesId];
    if (oldCost !== undefined && oldCost !== newCost) {
      diffs.push(classifyFeeChange(
        `${stateId}-tagCost-${speciesId}`,
        `${stateId} ${speciesId} NR Tag Cost`,
        oldCost,
        newCost,
        tolerances,
        ts,
        speciesId,
      ));
    }
  }

  // Point costs per species
  for (const [speciesId, newCost] of Object.entries(snapshot.fees.pointCost)) {
    const oldCost = live.pointCost?.[speciesId];
    if (oldCost !== undefined && oldCost !== newCost) {
      diffs.push(classifyFeeChange(
        `${stateId}-pointCost-${speciesId}`,
        `${stateId} ${speciesId} Point Cost`,
        oldCost,
        newCost,
        tolerances,
        ts,
        speciesId,
      ));
    }
  }

  // Fee schedule items (compare by name match)
  for (const newItem of snapshot.fees.feeSchedule) {
    const oldItem = live.feeSchedule?.find((f) => f.name === newItem.name);
    if (oldItem && oldItem.amount !== newItem.amount) {
      diffs.push(classifyFeeChange(
        `${stateId}-feeSchedule-${newItem.name.replace(/\s+/g, "_")}`,
        `${stateId} ${newItem.name}`,
        oldItem.amount,
        newItem.amount,
        tolerances,
        ts,
      ));
    }
  }

  return diffs;
}

function classifyFeeChange(
  id: string,
  label: string,
  oldVal: number,
  newVal: number,
  tolerances: AirlockTolerances,
  ts: string,
  speciesId?: string,
): DiffEntry {
  const pctChange = oldVal === 0 ? (newVal > 0 ? 100 : 0) : ((newVal - oldVal) / oldVal) * 100;
  const isIncrease = newVal > oldVal;
  const isDecrease = newVal < oldVal;

  let severity: DiffSeverity = "pass";
  let toleranceRule = "Within tolerance";

  if (isIncrease && Math.abs(pctChange) > tolerances.feeIncreaseMaxPct) {
    severity = "block";
    toleranceRule = `Fee increase ${Math.abs(pctChange).toFixed(1)}% exceeds ${tolerances.feeIncreaseMaxPct}% threshold`;
  } else if (isDecrease && Math.abs(pctChange) > tolerances.feeDecreaseMaxPct) {
    severity = "block";
    toleranceRule = `Fee decrease ${Math.abs(pctChange).toFixed(1)}% exceeds ${tolerances.feeDecreaseMaxPct}% threshold (suspicious)`;
  }

  const direction = isIncrease ? "increased" : "decreased";
  return {
    id: `diff-${id}-${ts}`,
    category: "fee",
    field: id,
    label,
    severity,
    oldValue: oldVal,
    newValue: newVal,
    changeDescription: `Fee ${direction} ${Math.abs(pctChange).toFixed(1)}% ($${oldVal.toFixed(2)} → $${newVal.toFixed(2)})`,
    toleranceRule,
    pctChange,
    speciesId,
  };
}

// ============================================================================
// Deadline Diff — Check application deadline shifts
// ============================================================================

function diffDeadlines(
  snapshot: StagingSnapshot,
  live: State,
  tolerances: AirlockTolerances,
  ts: string,
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const stateId = snapshot.stateId;

  for (const [speciesId, newDates] of Object.entries(snapshot.deadlines.applicationDeadlines)) {
    const oldDates = live.applicationDeadlines?.[speciesId];
    if (!oldDates) continue;

    // Check close date shift
    if (oldDates.close !== newDates.close) {
      const daysDelta = dateDiffDays(oldDates.close, newDates.close);
      const absDays = Math.abs(daysDelta);
      const direction = daysDelta > 0 ? "later" : "earlier";

      let severity: DiffSeverity = "pass";
      let toleranceRule = "Within tolerance";

      if (absDays > tolerances.deadlineShiftMaxDays) {
        severity = "block";
        toleranceRule = `Deadline shifted ${absDays} days (>${tolerances.deadlineShiftMaxDays} day threshold)`;
      }

      diffs.push({
        id: `diff-${stateId}-deadline-${speciesId}-close-${ts}`,
        category: "deadline",
        field: `applicationDeadlines.${speciesId}.close`,
        label: `${stateId} ${speciesId} Application Close`,
        severity,
        oldValue: oldDates.close,
        newValue: newDates.close,
        changeDescription: `Deadline moved ${absDays} days ${direction} (${oldDates.close} → ${newDates.close})`,
        toleranceRule,
        daysDelta,
        speciesId,
      });
    }

    // Check open date shift
    if (oldDates.open !== newDates.open) {
      const daysDelta = dateDiffDays(oldDates.open, newDates.open);
      const absDays = Math.abs(daysDelta);
      const direction = daysDelta > 0 ? "later" : "earlier";

      let severity: DiffSeverity = "pass";
      let toleranceRule = "Within tolerance";

      if (absDays > tolerances.deadlineShiftMaxDays) {
        severity = "block";
        toleranceRule = `Open date shifted ${absDays} days (>${tolerances.deadlineShiftMaxDays} day threshold)`;
      }

      diffs.push({
        id: `diff-${stateId}-deadline-${speciesId}-open-${ts}`,
        category: "deadline",
        field: `applicationDeadlines.${speciesId}.open`,
        label: `${stateId} ${speciesId} Application Open`,
        severity,
        oldValue: oldDates.open,
        newValue: newDates.open,
        changeDescription: `Open date moved ${absDays} days ${direction} (${oldDates.open} → ${newDates.open})`,
        toleranceRule,
        daysDelta,
        speciesId,
      });
    }
  }

  // Draw result date shifts
  if (snapshot.deadlines.drawResultDates && live.drawResultDates) {
    for (const [speciesId, newDate] of Object.entries(snapshot.deadlines.drawResultDates)) {
      const oldDate = live.drawResultDates[speciesId];
      if (oldDate && oldDate !== newDate) {
        const daysDelta = dateDiffDays(oldDate, newDate);
        const absDays = Math.abs(daysDelta);

        diffs.push({
          id: `diff-${stateId}-drawResult-${speciesId}-${ts}`,
          category: "deadline",
          field: `drawResultDates.${speciesId}`,
          label: `${stateId} ${speciesId} Draw Result Date`,
          severity: absDays > tolerances.deadlineShiftMaxDays ? "warn" : "pass",
          oldValue: oldDate,
          newValue: newDate,
          changeDescription: `Draw result date shifted ${absDays} days (${oldDate} → ${newDate})`,
          toleranceRule: absDays > tolerances.deadlineShiftMaxDays
            ? `Draw result shifted ${absDays} days (>${tolerances.deadlineShiftMaxDays} day threshold)`
            : "Within tolerance",
          daysDelta,
          speciesId,
        });
      }
    }
  }

  return diffs;
}

// ============================================================================
// Quota Diff — Check tag quota changes
// ============================================================================

function diffQuotas(
  snapshot: StagingSnapshot,
  live: State,
  tolerances: AirlockTolerances,
  ts: string,
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const stateId = snapshot.stateId;

  if (!snapshot.quotas.tagQuotas) return diffs;

  // We don't have per-state quotas on the live State type directly,
  // but we can check against unit-level data if available.
  // For now, compare staging quotas against themselves (when we have
  // previous snapshot data this becomes meaningful).
  // This structure is ready for when we add state-level quotas.

  return diffs;
}

// ============================================================================
// Rule Diff — Check structural rule mutations
// ============================================================================

function diffRules(
  snapshot: StagingSnapshot,
  live: State,
  tolerances: AirlockTolerances,
  ts: string,
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const stateId = snapshot.stateId;

  // Point system type change
  if (snapshot.rules.pointSystem !== live.pointSystem) {
    diffs.push({
      id: `diff-${stateId}-pointSystem-${ts}`,
      category: "rule",
      field: "pointSystem",
      label: `${stateId} Point System Type`,
      severity: tolerances.blockOnRuleMutation ? "block" : "warn",
      oldValue: live.pointSystem,
      newValue: snapshot.rules.pointSystem,
      changeDescription: `Point system changed from "${live.pointSystem}" to "${snapshot.rules.pointSystem}"`,
      toleranceRule: "Rule mutation = BLOCK (structural change)",
    });
  }

  // Preference/random percentage changes
  if (
    snapshot.rules.pointSystemDetails.preferencePct !== undefined &&
    live.pointSystemDetails.preferencePct !== undefined &&
    snapshot.rules.pointSystemDetails.preferencePct !== live.pointSystemDetails.preferencePct
  ) {
    diffs.push({
      id: `diff-${stateId}-preferencePct-${ts}`,
      category: "rule",
      field: "pointSystemDetails.preferencePct",
      label: `${stateId} Preference Pool %`,
      severity: tolerances.blockOnRuleMutation ? "block" : "warn",
      oldValue: live.pointSystemDetails.preferencePct,
      newValue: snapshot.rules.pointSystemDetails.preferencePct,
      changeDescription: `Preference pool changed from ${live.pointSystemDetails.preferencePct}% to ${snapshot.rules.pointSystemDetails.preferencePct}%`,
      toleranceRule: "Rule mutation = BLOCK (draw odds fundamentally changed)",
    });
  }

  // Application approach change
  if (snapshot.rules.applicationApproach !== live.applicationApproach) {
    diffs.push({
      id: `diff-${stateId}-applicationApproach-${ts}`,
      category: "rule",
      field: "applicationApproach",
      label: `${stateId} Application Approach`,
      severity: tolerances.blockOnRuleMutation ? "block" : "warn",
      oldValue: live.applicationApproach,
      newValue: snapshot.rules.applicationApproach,
      changeDescription: `Application approach changed from "${live.applicationApproach}" to "${snapshot.rules.applicationApproach}"`,
      toleranceRule: "Rule mutation = BLOCK (application strategy may need rebuild)",
    });
  }

  // Once-in-a-lifetime species changes
  const oldOIL = new Set(live.onceInALifetime ?? []);
  const newOIL = new Set(snapshot.rules.onceInALifetime ?? []);

  // Species added to OIL list
  for (const species of newOIL) {
    if (!oldOIL.has(species)) {
      diffs.push({
        id: `diff-${stateId}-oil-added-${species}-${ts}`,
        category: "rule",
        field: `onceInALifetime.${species}`,
        label: `${stateId} ${species} Now Once-in-a-Lifetime`,
        severity: "block",
        oldValue: null,
        newValue: species,
        changeDescription: `${species} added to once-in-a-lifetime list — drawing this species now means permanent ineligibility`,
        toleranceRule: "OIL list mutation = BLOCK (fundamentally changes strategy)",
        speciesId: species,
      });
    }
  }

  // Species removed from OIL list
  for (const species of oldOIL) {
    if (!newOIL.has(species)) {
      diffs.push({
        id: `diff-${stateId}-oil-removed-${species}-${ts}`,
        category: "rule",
        field: `onceInALifetime.${species}`,
        label: `${stateId} ${species} No Longer Once-in-a-Lifetime`,
        severity: "block",
        oldValue: species,
        newValue: null,
        changeDescription: `${species} removed from once-in-a-lifetime list — verify with official regulation`,
        toleranceRule: "OIL list mutation = BLOCK (verify official source)",
        speciesId: species,
      });
    }
  }

  // Squared bonus point change
  if (
    snapshot.rules.pointSystemDetails.squared !== undefined &&
    live.pointSystemDetails.squared !== undefined &&
    snapshot.rules.pointSystemDetails.squared !== live.pointSystemDetails.squared
  ) {
    diffs.push({
      id: `diff-${stateId}-squared-${ts}`,
      category: "rule",
      field: "pointSystemDetails.squared",
      label: `${stateId} Bonus Point Squaring`,
      severity: "block",
      oldValue: live.pointSystemDetails.squared ? "squared" : "linear",
      newValue: snapshot.rules.pointSystemDetails.squared ? "squared" : "linear",
      changeDescription: `Bonus point calculation changed from ${live.pointSystemDetails.squared ? "squared" : "linear"} to ${snapshot.rules.pointSystemDetails.squared ? "squared" : "linear"}`,
      toleranceRule: "Rule mutation = BLOCK (draw odds calculation fundamentally changed)",
    });
  }

  return diffs;
}

// ============================================================================
// Species Diff — Check species list changes
// ============================================================================

function diffSpecies(
  snapshot: StagingSnapshot,
  live: State,
  tolerances: AirlockTolerances,
  ts: string,
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const stateId = snapshot.stateId;
  const oldSpecies = new Set(live.availableSpecies);
  const newSpecies = new Set(snapshot.species.availableSpecies);

  // New species added
  for (const species of newSpecies) {
    if (!oldSpecies.has(species)) {
      diffs.push({
        id: `diff-${stateId}-species-added-${species}-${ts}`,
        category: "species",
        field: `availableSpecies.${species}`,
        label: `${stateId} New Species: ${species}`,
        severity: tolerances.warnOnSpeciesAdded ? "warn" : "pass",
        oldValue: null,
        newValue: species,
        changeDescription: `${species} added to ${stateId} available species list`,
        toleranceRule: "New species = WARN (confirm availability and fee data)",
        speciesId: species,
      });
    }
  }

  // Species removed
  for (const species of oldSpecies) {
    if (!newSpecies.has(species)) {
      diffs.push({
        id: `diff-${stateId}-species-removed-${species}-${ts}`,
        category: "species",
        field: `availableSpecies.${species}`,
        label: `${stateId} Species Removed: ${species}`,
        severity: tolerances.blockOnSpeciesRemoval ? "block" : "warn",
        oldValue: species,
        newValue: null,
        changeDescription: `${species} removed from ${stateId} available species list — verify official delisting`,
        toleranceRule: "Species removal = BLOCK (may affect active roadmap positions)",
        speciesId: species,
      });
    }
  }

  return diffs;
}

// ============================================================================
// Change Impact — What does this staging snapshot mean for the user?
// ============================================================================

export interface ChangeImpactNotification {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affectedStates: string[];
  affectedSpecies: string[];
  category: DiffFieldCategory;
  actionRequired: boolean;
  cta?: { label: string; href: string };
}

/**
 * Given an AirlockVerdict, produce user-facing change impact notifications.
 * These are surfaced in the UI to inform users about upcoming data changes.
 */
export function generateChangeImpactNotifications(
  verdict: AirlockVerdict,
  userActiveStates: string[],
  userActiveSpecies: Record<string, string[]>,  // stateId → speciesId[]
): ChangeImpactNotification[] {
  const notifications: ChangeImpactNotification[] = [];

  // Only notify about changes that affect the user's active portfolio
  const relevantDiffs = verdict.diffs.filter((d) => {
    if (!userActiveStates.includes(verdict.stateId)) return false;
    if (d.speciesId && userActiveSpecies[verdict.stateId]) {
      return userActiveSpecies[verdict.stateId].includes(d.speciesId);
    }
    return true; // State-level changes affect all species in that state
  });

  // Group by category for cleaner notifications
  const feeChanges = relevantDiffs.filter((d) => d.category === "fee");
  const deadlineChanges = relevantDiffs.filter((d) => d.category === "deadline");
  const ruleChanges = relevantDiffs.filter((d) => d.category === "rule");
  const speciesChanges = relevantDiffs.filter((d) => d.category === "species");

  // Fee change notifications
  if (feeChanges.length > 0) {
    const blockedFees = feeChanges.filter((d) => d.severity === "block");
    const severity = blockedFees.length > 0 ? "critical" : "warning";
    const totalImpact = feeChanges.reduce((sum, d) => {
      if (typeof d.newValue === "number" && typeof d.oldValue === "number") {
        return sum + (d.newValue - d.oldValue);
      }
      return sum;
    }, 0);

    notifications.push({
      id: `impact-fee-${verdict.stateId}-${verdict.evaluatedAt}`,
      severity: severity as "critical" | "warning",
      title: `${verdict.stateId} Fee Update: ${feeChanges.length} change${feeChanges.length > 1 ? "s" : ""} detected`,
      description: totalImpact > 0
        ? `Net fee increase of $${totalImpact.toFixed(2)} detected across ${feeChanges.length} fee${feeChanges.length > 1 ? "s" : ""}. ${blockedFees.length > 0 ? `${blockedFees.length} change${blockedFees.length > 1 ? "s" : ""} exceed${blockedFees.length === 1 ? "s" : ""} tolerance thresholds.` : ""}`
        : `Fee adjustments detected. ${blockedFees.length > 0 ? `${blockedFees.length} change${blockedFees.length > 1 ? "s" : ""} blocked for review.` : "All within tolerance."}`,
      affectedStates: [verdict.stateId],
      affectedSpecies: [...new Set(feeChanges.map((d) => d.speciesId).filter(Boolean) as string[])],
      category: "fee",
      actionRequired: blockedFees.length > 0,
      cta: { label: "Review Budget", href: "/budget" },
    });
  }

  // Deadline change notifications
  if (deadlineChanges.length > 0) {
    const blockedDeadlines = deadlineChanges.filter((d) => d.severity === "block");
    notifications.push({
      id: `impact-deadline-${verdict.stateId}-${verdict.evaluatedAt}`,
      severity: blockedDeadlines.length > 0 ? "critical" : "info",
      title: `${verdict.stateId} Deadline Update`,
      description: deadlineChanges.map((d) => d.changeDescription).join(". "),
      affectedStates: [verdict.stateId],
      affectedSpecies: [...new Set(deadlineChanges.map((d) => d.speciesId).filter(Boolean) as string[])],
      category: "deadline",
      actionRequired: blockedDeadlines.length > 0,
      cta: { label: "Check Deadlines", href: "/deadlines" },
    });
  }

  // Rule change notifications — always critical
  if (ruleChanges.length > 0) {
    notifications.push({
      id: `impact-rule-${verdict.stateId}-${verdict.evaluatedAt}`,
      severity: "critical",
      title: `${verdict.stateId} Rule Change Detected`,
      description: `Structural rule change: ${ruleChanges.map((d) => d.changeDescription).join(". ")}. This may fundamentally affect your strategy.`,
      affectedStates: [verdict.stateId],
      affectedSpecies: [...new Set(ruleChanges.map((d) => d.speciesId).filter(Boolean) as string[])],
      category: "rule",
      actionRequired: true,
      cta: { label: "Review Strategy", href: "/roadmap" },
    });
  }

  // Species change notifications
  if (speciesChanges.length > 0) {
    const removals = speciesChanges.filter((d) => d.newValue === null);
    notifications.push({
      id: `impact-species-${verdict.stateId}-${verdict.evaluatedAt}`,
      severity: removals.length > 0 ? "critical" : "warning",
      title: `${verdict.stateId} Species List Updated`,
      description: speciesChanges.map((d) => d.changeDescription).join(". "),
      affectedStates: [verdict.stateId],
      affectedSpecies: [...new Set(speciesChanges.map((d) => d.speciesId).filter(Boolean) as string[])],
      category: "species",
      actionRequired: removals.length > 0,
      cta: { label: "Review Portfolio", href: "/portfolio" },
    });
  }

  return notifications;
}

// ============================================================================
// Snapshot Promotion — Apply staging data to live state
// ============================================================================

/**
 * Create a promoted state object by applying the staging snapshot
 * to the current live state. Only call this after the verdict is
 * approved (either auto-promoted for "pass" or manually approved).
 *
 * Returns a new State object — does NOT mutate the original.
 */
export function promoteSnapshot(
  snapshot: StagingSnapshot,
  liveState: State,
): State {
  return {
    ...liveState,
    // Overwrite fee data
    licenseFees: { ...liveState.licenseFees, ...snapshot.fees.licenseFees },
    feeSchedule: snapshot.fees.feeSchedule.length > 0 ? snapshot.fees.feeSchedule : liveState.feeSchedule,
    tagCosts: { ...liveState.tagCosts, ...snapshot.fees.tagCosts },
    pointCost: { ...liveState.pointCost, ...snapshot.fees.pointCost },
    ...(snapshot.fees.residentLicenseFees ? { residentLicenseFees: snapshot.fees.residentLicenseFees } : {}),
    ...(snapshot.fees.residentFeeSchedule ? { residentFeeSchedule: snapshot.fees.residentFeeSchedule } : {}),
    ...(snapshot.fees.residentTagCosts ? { residentTagCosts: snapshot.fees.residentTagCosts } : {}),
    ...(snapshot.fees.residentPointCost ? { residentPointCost: snapshot.fees.residentPointCost } : {}),
    // Overwrite deadlines
    applicationDeadlines: { ...liveState.applicationDeadlines, ...snapshot.deadlines.applicationDeadlines },
    ...(snapshot.deadlines.drawResultDates ? { drawResultDates: { ...liveState.drawResultDates, ...snapshot.deadlines.drawResultDates } } : {}),
    // Overwrite rules
    pointSystem: snapshot.rules.pointSystem as State["pointSystem"],
    pointSystemDetails: snapshot.rules.pointSystemDetails,
    applicationApproach: snapshot.rules.applicationApproach as State["applicationApproach"],
    ...(snapshot.rules.onceInALifetime ? { onceInALifetime: snapshot.rules.onceInALifetime } : {}),
    // Overwrite species
    availableSpecies: snapshot.species.availableSpecies,
    // Update metadata
    lastScrapedAt: snapshot.capturedAt,
    sourceUrl: snapshot.sourceUrl,
    dataVersion: snapshot.dataVersion,
  };
}

// ============================================================================
// Snapshot-to-Snapshot Diff (for historical comparison)
// ============================================================================

/**
 * Compare two snapshots directly (e.g., for showing what changed
 * between the last import and the new one). Uses the same tolerance
 * engine but compares snapshot-to-snapshot rather than snapshot-to-live.
 */
export function diffSnapshots(
  oldSnapshot: StagingSnapshot,
  newSnapshot: StagingSnapshot,
  tolerances: AirlockTolerances = DEFAULT_TOLERANCES,
): DiffEntry[] {
  // Build a pseudo-State from the old snapshot for the existing diff functions
  const pseudoState = {
    licenseFees: oldSnapshot.fees.licenseFees,
    feeSchedule: oldSnapshot.fees.feeSchedule,
    tagCosts: oldSnapshot.fees.tagCosts,
    pointCost: oldSnapshot.fees.pointCost,
    applicationDeadlines: oldSnapshot.deadlines.applicationDeadlines,
    drawResultDates: oldSnapshot.deadlines.drawResultDates,
    pointSystem: oldSnapshot.rules.pointSystem,
    pointSystemDetails: oldSnapshot.rules.pointSystemDetails,
    applicationApproach: oldSnapshot.rules.applicationApproach,
    onceInALifetime: oldSnapshot.rules.onceInALifetime,
    availableSpecies: oldSnapshot.species.availableSpecies,
  } as State;

  const verdict = evaluateSnapshot(newSnapshot, pseudoState, tolerances);
  return verdict.diffs;
}

// ============================================================================
// Helpers
// ============================================================================

/** Calculate the number of days between two ISO date strings */
function dateDiffDays(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diffMs = b.getTime() - a.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
