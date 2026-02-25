/**
 * Real-World Chaos Suite — Edge-Case Engine Functions
 *
 * Handles the catastrophic edge cases that separate a toy from
 * infrastructure: broken crawlers, timezone traps, chaotic humans,
 * flaky buddies, and invisible financial friction.
 *
 * PHASE 1: Crawler & Data Ingestion (null detection, anomalous variance)
 * PHASE 2: Temporal & Deadline Stress (48hr warning, timezone, leap year)
 * PHASE 3: Chaotic Human (residency switch, portfolio freeze, roadmap slide)
 * PHASE 4: Multi-Player Destructibility (flaky buddy, mixed residency)
 * PHASE 5: Micro-Financial Reconciliation (CC fees, refund delays)
 */

import type {
  State,
  RoadmapYear,
  RoadmapAction,
  Milestone,
  UserPoints,
  CapitalType,
  FeeLineItem,
} from "@/lib/types";
import type {
  StagingFeeData,
  DiffEntry,
  DiffSeverity,
  AirlockTolerances,
  AirlockVerdict,
} from "./data-airlock";
// Re-export StagingSnapshot so tests can import from this module
export type { StagingSnapshot } from "./data-airlock";
import type { StagingSnapshot } from "./data-airlock";
import { STATES_MAP } from "@/lib/constants/states";
import type {
  CascadeResult,
  FiduciaryAlert,
  ScheduleConflict,
  PointMutation,
  RoadmapInvalidation,
  CapitalReclassification,
} from "./fiduciary-dispatcher";
import {
  POINT_PURGE_RULES,
  computeGroupDrawPoints,
} from "./portfolio-stress";

// ============================================================================
// PHASE 1: CRAWLER & DATA INGESTION FAIL-SAFES
// ============================================================================

/**
 * Crawl validation result — what the crawler should produce before
 * the data ever reaches the staging database.
 */
export interface CrawlValidationResult {
  isValid: boolean;
  errors: CrawlError[];
  warnings: CrawlWarning[];
  lastKnownGoodId?: string;    // Snapshot ID to revert to
  shouldRevert: boolean;
}

export interface CrawlError {
  field: string;
  expected: "number" | "string" | "date" | "array";
  received: string;            // "null" | "NaN" | "string" | etc.
  message: string;
  severity: "p1" | "p2";      // p1 = halt ingestion, p2 = quarantine field
}

export interface CrawlWarning {
  field: string;
  message: string;
  quarantineRequired: boolean;
}

/**
 * Test 1.1: The "Broken DOM" Protocol
 *
 * Validate a staging snapshot for null/zero/garbage values before
 * it enters the staging database. If ANY fee is $0, null, NaN, or
 * a non-numeric string, HALT and revert to Last Known Good.
 */
export function validateCrawlData(
  snapshot: StagingSnapshot,
  lastKnownGoodId?: string,
): CrawlValidationResult {
  const errors: CrawlError[] = [];
  const warnings: CrawlWarning[] = [];

  // ── Fee null/zero detection ──
  const { licenseFees, feeSchedule, tagCosts, pointCost } = snapshot.fees;

  // Check flat license fees
  for (const [key, value] of Object.entries(licenseFees)) {
    if (value === null || value === undefined) {
      errors.push({
        field: `licenseFees.${key}`,
        expected: "number",
        received: "null",
        message: `${snapshot.stateId} ${key} is null — possible scrape failure`,
        severity: "p1",
      });
    } else if (typeof value !== "number" || isNaN(value)) {
      errors.push({
        field: `licenseFees.${key}`,
        expected: "number",
        received: typeof value,
        message: `${snapshot.stateId} ${key} is not a valid number: "${value}"`,
        severity: "p1",
      });
    } else if (value < 0) {
      errors.push({
        field: `licenseFees.${key}`,
        expected: "number",
        received: `${value}`,
        message: `${snapshot.stateId} ${key} is negative ($${value}) — invalid`,
        severity: "p1",
      });
    }
    // Note: $0 is valid for some fees (e.g., CO elk point fee = $0)
  }

  // Check tag costs — these should NEVER be $0 for active species
  for (const [speciesId, cost] of Object.entries(tagCosts)) {
    if (cost === null || cost === undefined || isNaN(cost)) {
      errors.push({
        field: `tagCosts.${speciesId}`,
        expected: "number",
        received: cost === null ? "null" : String(cost),
        message: `${snapshot.stateId} ${speciesId} tag cost is ${cost === null ? "null" : "NaN"} — CRITICAL: cannot push $0 tag fee to users`,
        severity: "p1",
      });
    } else if (cost === 0) {
      // $0 tag cost is extremely suspicious (no state gives free tags to NR)
      errors.push({
        field: `tagCosts.${speciesId}`,
        expected: "number",
        received: "0",
        message: `${snapshot.stateId} ${speciesId} tag cost is $0 — no F&G state issues free NR tags. Likely scrape error.`,
        severity: "p1",
      });
    }
  }

  // Check fee schedule items for NaN/null
  for (const item of feeSchedule) {
    if (item.amount === null || item.amount === undefined || isNaN(item.amount)) {
      errors.push({
        field: `feeSchedule.${item.name}`,
        expected: "number",
        received: item.amount === null ? "null" : String(item.amount),
        message: `${snapshot.stateId} fee schedule item "${item.name}" has invalid amount`,
        severity: "p1",
      });
    }
  }

  // Check deadlines for valid date format
  for (const [speciesId, dates] of Object.entries(snapshot.deadlines.applicationDeadlines)) {
    if (!isValidISODate(dates.open)) {
      errors.push({
        field: `applicationDeadlines.${speciesId}.open`,
        expected: "date",
        received: dates.open || "null",
        message: `${snapshot.stateId} ${speciesId} open date is not a valid ISO date: "${dates.open}"`,
        severity: "p1",
      });
    }
    if (!isValidISODate(dates.close)) {
      errors.push({
        field: `applicationDeadlines.${speciesId}.close`,
        expected: "date",
        received: dates.close || "null",
        message: `${snapshot.stateId} ${speciesId} close date is not a valid ISO date: "${dates.close}"`,
        severity: "p1",
      });
    }
  }

  // Check species list is non-empty
  if (!snapshot.species.availableSpecies || snapshot.species.availableSpecies.length === 0) {
    errors.push({
      field: "availableSpecies",
      expected: "array",
      received: "empty",
      message: `${snapshot.stateId} available species list is empty — total scrape failure`,
      severity: "p1",
    });
  }

  const hasP1 = errors.some((e) => e.severity === "p1");

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    lastKnownGoodId: hasP1 ? lastKnownGoodId : undefined,
    shouldRevert: hasP1,
  };
}

/**
 * Test 1.2: Anomalous Variance Checker
 *
 * If a unit's point requirement drops by more than `maxDropThreshold`
 * points in one year, quarantine that unit for human verification.
 * An "8 → 3" drop in one year is almost certainly a parse error.
 */
export interface VarianceCheckResult {
  unitId: string;
  stateId: string;
  speciesId: string;
  field: string;
  oldValue: number;
  newValue: number;
  delta: number;
  quarantined: boolean;
  reason: string;
}

export function checkAnomalousVariance(
  oldData: { pointsRequired: number; unitId: string; stateId: string; speciesId: string }[],
  newData: { pointsRequired: number; unitId: string; stateId: string; speciesId: string }[],
  maxDropThreshold: number = 3,
): VarianceCheckResult[] {
  const results: VarianceCheckResult[] = [];

  for (const newUnit of newData) {
    const oldUnit = oldData.find(
      (o) => o.unitId === newUnit.unitId && o.stateId === newUnit.stateId,
    );
    if (!oldUnit) continue;

    const delta = newUnit.pointsRequired - oldUnit.pointsRequired;

    // A drop greater than the threshold is suspicious
    if (delta < -maxDropThreshold) {
      results.push({
        unitId: newUnit.unitId,
        stateId: newUnit.stateId,
        speciesId: newUnit.speciesId,
        field: "pointsRequired",
        oldValue: oldUnit.pointsRequired,
        newValue: newUnit.pointsRequired,
        delta,
        quarantined: true,
        reason: `Point requirement dropped ${Math.abs(delta)} points (${oldUnit.pointsRequired} → ${newUnit.pointsRequired}) — exceeds ${maxDropThreshold}-point threshold. Likely OCR/parse error.`,
      });
    }

    // A massive increase could also be suspect
    if (delta > maxDropThreshold * 2) {
      results.push({
        unitId: newUnit.unitId,
        stateId: newUnit.stateId,
        speciesId: newUnit.speciesId,
        field: "pointsRequired",
        oldValue: oldUnit.pointsRequired,
        newValue: newUnit.pointsRequired,
        delta,
        quarantined: true,
        reason: `Point requirement jumped ${delta} points (${oldUnit.pointsRequired} → ${newUnit.pointsRequired}) — possible parse error or regulatory change.`,
      });
    }
  }

  return results;
}

// ============================================================================
// PHASE 2: TEMPORAL & DEADLINE STRESS
// ============================================================================

export interface DeadlineUrgency {
  stateId: string;
  speciesId: string;
  deadline: string;              // ISO date
  hoursRemaining: number;
  urgencyLevel: "expired" | "critical_48hr" | "urgent_7d" | "upcoming_30d" | "safe";
  message: string;
  serverCrashWarning: boolean;   // True for deadline-day and day-before
}

/**
 * Test 2.1: 48-Hour Critical Deadline Warning
 *
 * F&G servers historically crash on deadline day. Shift from
 * "1 day left" to a RED CRITICAL warning 48 hours out.
 */
export function computeDeadlineUrgency(
  deadlines: { stateId: string; speciesId: string; close: string }[],
  now: Date = new Date(),
): DeadlineUrgency[] {
  const results: DeadlineUrgency[] = [];

  for (const d of deadlines) {
    const deadlineDate = new Date(d.close + "T23:59:59");
    const hoursRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let urgencyLevel: DeadlineUrgency["urgencyLevel"];
    let message: string;
    let serverCrashWarning = false;

    if (hoursRemaining < 0) {
      urgencyLevel = "expired";
      message = `${d.stateId} ${d.speciesId} deadline has passed (${d.close}).`;
    } else if (hoursRemaining <= 48) {
      urgencyLevel = "critical_48hr";
      serverCrashWarning = true;
      message = `CRITICAL: ${d.stateId} ${d.speciesId} deadline in ${Math.ceil(hoursRemaining)} hours. Historically High-Risk: F&G servers frequently crash on deadline day. Apply immediately to avoid lockout.`;
    } else if (hoursRemaining <= 168) { // 7 days
      urgencyLevel = "urgent_7d";
      message = `${d.stateId} ${d.speciesId} deadline in ${Math.ceil(hoursRemaining / 24)} days (${d.close}). Apply this week.`;
    } else if (hoursRemaining <= 720) { // 30 days
      urgencyLevel = "upcoming_30d";
      message = `${d.stateId} ${d.speciesId} deadline in ${Math.ceil(hoursRemaining / 24)} days (${d.close}).`;
    } else {
      urgencyLevel = "safe";
      message = `${d.stateId} ${d.speciesId} deadline on ${d.close}. ${Math.ceil(hoursRemaining / 24)} days away.`;
    }

    results.push({
      stateId: d.stateId,
      speciesId: d.speciesId,
      deadline: d.close,
      hoursRemaining: Math.max(0, hoursRemaining),
      urgencyLevel,
      message,
      serverCrashWarning,
    });
  }

  return results.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
}

/**
 * Test 2.2: Timezone-Aware Deadline Conversion
 *
 * Convert a state's deadline from the state's F&G timezone to the
 * user's local timezone. Arizona does NOT observe DST.
 *
 * Returns the deadline as a Date in UTC, plus the user-local display string.
 */
export interface TimezoneDeadline {
  stateId: string;
  speciesId: string;
  stateTimezone: string;         // IANA: "America/Denver", "America/Phoenix"
  deadlineInStateTz: string;     // "2026-04-07 23:59:59 MST"
  deadlineUtc: Date;             // Absolute UTC moment
  userLocalDisplay: string;      // "April 7, 2026 at 1:59 AM EDT" (for NY user)
  warningNote?: string;          // "Arizona does not observe Daylight Saving Time"
}

export function convertDeadlineToUserTimezone(
  stateId: string,
  speciesId: string,
  deadlineDate: string,          // "2026-04-07"
  stateTimezone: string,         // "America/Phoenix" or "America/Denver"
  userTimezone: string,          // "America/New_York"
): TimezoneDeadline {
  // Build the deadline moment: 11:59 PM on the deadline day in the STATE's timezone
  // We use Intl.DateTimeFormat to handle DST correctly
  const deadlineStr = `${deadlineDate}T23:59:59`;

  // Create a formatter for the state timezone to find the UTC offset
  const stateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: stateTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });

  // Create a formatter for the user's timezone
  const userFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: userTimezone,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    hour12: true,
  });

  // Parse the deadline in the state's timezone
  // JavaScript Date is always UTC internally — we need to compute the correct UTC moment
  const deadlineUtc = parseDateInTimezone(deadlineStr, stateTimezone);

  const stateDisplay = stateFormatter.format(deadlineUtc);
  const userDisplay = userFormatter.format(deadlineUtc);

  // Arizona DST warning
  const isArizona = stateTimezone === "America/Phoenix";
  const warningNote = isArizona
    ? "Arizona does not observe Daylight Saving Time. This deadline is in Mountain Standard Time year-round."
    : undefined;

  return {
    stateId,
    speciesId,
    stateTimezone,
    deadlineInStateTz: stateDisplay,
    deadlineUtc,
    userLocalDisplay: userDisplay,
    warningNote,
  };
}

/**
 * Test 2.3: Leap Year Safety
 *
 * Validate that a date range across multiple years handles Feb 29 correctly.
 * No reminder should silently shift to March 1 during leap years.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function validateDateAcrossYears(
  baseDate: string,            // "2026-02-28" or "2028-02-29"
  yearsToProject: number,
): { year: number; date: string; isLeapYear: boolean; shifted: boolean }[] {
  const [baseYear, baseMonth, baseDay] = baseDate.split("-").map(Number);
  const results: { year: number; date: string; isLeapYear: boolean; shifted: boolean }[] = [];

  for (let i = 0; i <= yearsToProject; i++) {
    const targetYear = baseYear + i;
    const isLeap = isLeapYear(targetYear);

    let targetDay = baseDay;
    let targetMonth = baseMonth;
    let shifted = false;

    // Handle Feb 29 in non-leap years
    if (baseMonth === 2 && baseDay === 29 && !isLeap) {
      // CORRECT behavior: pin to Feb 28, NOT March 1
      targetDay = 28;
      shifted = true;
    }

    const dateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
    results.push({ year: targetYear, date: dateStr, isLeapYear: isLeap, shifted });
  }

  return results;
}

// ============================================================================
// PHASE 3: CHAOTIC HUMAN EDGE CASES
// ============================================================================

/**
 * Test 3.1: Mid-Stream Residency Switch
 *
 * When a user changes their home state (e.g., FL → WY), cascade:
 * - All fees recalculated (NR → Resident for new state, Resident → NR for old)
 * - Draw odds recalculated (resident pool vs NR pool)
 * - Budget freed from NR fees → available for reallocation
 */
export interface ResidencySwitch {
  oldState: string;
  newState: string;
  feeImpact: {
    stateId: string;
    speciesId: string;
    oldAnnualCost: number;
    newAnnualCost: number;
    delta: number;
    newResidency: "resident" | "nonresident";
  }[];
  totalAnnualSavings: number;
  totalAnnualIncrease: number;
  netBudgetImpact: number;
  alerts: FiduciaryAlert[];
}

export function computeResidencySwitch(
  oldHomeState: string,
  newHomeState: string,
  activeStates: string[],
  activeSpecies: Record<string, string[]>,   // stateId → speciesId[]
): ResidencySwitch {
  const feeImpact: ResidencySwitch["feeImpact"] = [];
  const alerts: FiduciaryAlert[] = [];
  let totalSavings = 0;
  let totalIncrease = 0;

  for (const stateId of activeStates) {
    const stateData = STATES_MAP[stateId];
    if (!stateData) continue;

    const speciesList = activeSpecies[stateId] ?? [];

    for (const speciesId of speciesList) {
      // Old costs (based on old residency)
      const wasResident = stateId === oldHomeState;
      const isNowResident = stateId === newHomeState;

      if (wasResident === isNowResident) continue; // No change for this state

      const nrCost = computeAnnualCost(stateData, speciesId, false);
      const resCost = computeAnnualCost(stateData, speciesId, true);

      const oldCost = wasResident ? resCost : nrCost;
      const newCost = isNowResident ? resCost : nrCost;
      const delta = newCost - oldCost;

      feeImpact.push({
        stateId,
        speciesId,
        oldAnnualCost: oldCost,
        newAnnualCost: newCost,
        delta,
        newResidency: isNowResident ? "resident" : "nonresident",
      });

      if (delta < 0) {
        totalSavings += Math.abs(delta);
      } else {
        totalIncrease += delta;
      }
    }
  }

  // Generate alerts
  if (feeImpact.length > 0) {
    const newResidentState = feeImpact.find((f) => f.newResidency === "resident");
    if (newResidentState) {
      alerts.push({
        id: `residency-switch-${newHomeState}`,
        severity: "info",
        title: `Residency Change: Now ${newHomeState} Resident`,
        description: `Moving to ${newHomeState} makes you a resident applicant. Tag costs drop ~90%, and you enter the higher-quota resident draw pool. Freed budget: $${totalSavings.toFixed(0)}/yr.`,
        recommendation: `Review your roadmap — the freed $${totalSavings.toFixed(0)}/yr can accelerate other state applications.`,
        eventType: "profile_change",
      });
    }

    const newNREntries = feeImpact.filter((f) => f.newResidency === "nonresident" && f.stateId === oldHomeState);
    if (newNREntries.length > 0) {
      alerts.push({
        id: `residency-switch-nr-${oldHomeState}`,
        severity: "warning",
        title: `Now Non-Resident in ${oldHomeState}`,
        description: `Leaving ${oldHomeState} means you're now a non-resident there. Fees increased by $${totalIncrease.toFixed(0)}/yr. You'll also enter the smaller NR quota pool.`,
        recommendation: `Evaluate whether ${oldHomeState} positions are still worth the NR premium.`,
        stateId: oldHomeState,
        eventType: "profile_change",
      });
    }
  }

  return {
    oldState: oldHomeState,
    newState: newHomeState,
    feeImpact,
    totalAnnualSavings: totalSavings,
    totalAnnualIncrease: totalIncrease,
    netBudgetImpact: totalSavings - totalIncrease,
    alerts,
  };
}

/**
 * Test 3.2: Portfolio Freeze / Suspension
 *
 * When a user is suspended (wildlife violation) or voluntarily freezes:
 * - Stop all point purchase recommendations
 * - MAINTAIN inactivity purge alerts (so they don't lose equity silently)
 * - Show a "Frozen" status on the roadmap
 */
export interface PortfolioFreezeResult {
  isFrozen: boolean;
  freezeReason: string;
  preservedAlerts: FiduciaryAlert[];
  purgeRisks: {
    stateId: string;
    speciesId: string;
    currentPoints: number;
    maxInactiveYears: number;
    description: string;
  }[];
  suppressedActions: string[];    // Actions that should NOT be recommended
}

export function computePortfolioFreeze(
  reason: "violation" | "voluntary" | "medical",
  existingPoints: Record<string, Record<string, number>>,
  roadmap: RoadmapYear[],
): PortfolioFreezeResult {
  const purgeRisks: PortfolioFreezeResult["purgeRisks"] = [];
  const preservedAlerts: FiduciaryAlert[] = [];

  // Scan all point balances for purge-risk states
  for (const [stateId, speciesMap] of Object.entries(existingPoints)) {
    for (const [speciesId, points] of Object.entries(speciesMap)) {
      if (points <= 0) continue;

      const purgeRule = POINT_PURGE_RULES[stateId];
      if (purgeRule) {
        purgeRisks.push({
          stateId,
          speciesId,
          currentPoints: points,
          maxInactiveYears: purgeRule.maxInactiveYears,
          description: purgeRule.description,
        });

        preservedAlerts.push({
          id: `freeze-purge-risk-${stateId}-${speciesId}`,
          severity: "critical",
          title: `Purge Risk While Frozen: ${stateId} ${speciesId}`,
          description: `You have ${points} points in ${stateId} ${speciesId}. ${stateId} purges points after ${purgeRule.maxInactiveYears} year${purgeRule.maxInactiveYears > 1 ? "s" : ""} of inactivity. Even while frozen, you may need to buy a preference point to prevent loss.`,
          recommendation: `Consider purchasing a point-only application for ${stateId} to reset the inactivity counter, even while your portfolio is frozen.`,
          stateId,
          speciesId,
          eventType: "deadline_missed",
        });
      }
    }
  }

  const suppressedActions = [
    "apply",
    "hunt",
    "scout",
  ];

  const reasonLabels: Record<string, string> = {
    violation: "Wildlife violation — Interstate Wildlife Violator Compact suspension",
    voluntary: "Voluntary freeze — user-initiated portfolio hold",
    medical: "Medical suspension — temporary physical limitation",
  };

  return {
    isFrozen: true,
    freezeReason: reasonLabels[reason] ?? reason,
    preservedAlerts,
    purgeRisks,
    suppressedActions,
  };
}

/**
 * Test 3.3: "Missed It" Roadmap Slide
 *
 * When a user misses a deadline, slide the entire roadmap right
 * by one year for the affected state/species. Apply point-loss
 * penalties per state rules.
 */
export interface RoadmapSlideResult {
  slidRoadmap: RoadmapYear[];
  pointPenalties: PointMutation[];
  alerts: FiduciaryAlert[];
  yearsSlid: number;
}

export function slideRoadmapForMissedDeadline(
  roadmap: RoadmapYear[],
  missedStateId: string,
  missedSpeciesId: string,
  missedYear: number,
  currentPoints: number,
): RoadmapSlideResult {
  const alerts: FiduciaryAlert[] = [];
  const pointPenalties: PointMutation[] = [];

  // Slide all actions for this state/species after the missed year right by 1 year
  // Strategy: collect all affected actions with their original years first,
  // then strip them, then re-insert at year+1. This avoids cascading mutation.
  const maxYear = Math.max(...roadmap.map((y) => y.year));
  const slidRoadmap = roadmap.map((yr) => {
    const newActions = yr.actions.map((action) => ({ ...action }));
    return { ...yr, actions: newActions };
  });

  // 1. Collect all affected actions with their original year
  const collected: { year: number; action: RoadmapAction }[] = [];
  for (const yr of slidRoadmap) {
    if (yr.year < missedYear) continue;
    const affected = yr.actions.filter(
      (a) => a.stateId === missedStateId && a.speciesId === missedSpeciesId,
    );
    for (const a of affected) {
      collected.push({ year: yr.year, action: a });
    }
  }

  // 2. Strip all affected actions from their original years
  for (const yr of slidRoadmap) {
    if (yr.year < missedYear) continue;
    yr.actions = yr.actions.filter(
      (a) => !(a.stateId === missedStateId && a.speciesId === missedSpeciesId),
    );
  }

  // 3. Re-insert at year+1
  for (const { year, action } of collected) {
    const targetYear = year + 1;
    let targetYr = slidRoadmap.find((y) => y.year === targetYear);
    if (!targetYr && targetYear <= maxYear + 1) {
      targetYr = {
        year: targetYear,
        phase: "build",
        actions: [],
        estimatedCost: 0,
        isHuntYear: false,
        pointYearCost: 0,
        huntYearCost: 0,
      };
      slidRoadmap.push(targetYr);
    }
    if (targetYr) {
      targetYr.actions.push(action);
    }
  }

  // Sort by year
  slidRoadmap.sort((a, b) => a.year - b.year);

  // Apply point-loss penalty per state rules
  const purgeRule = POINT_PURGE_RULES[missedStateId];
  // Missing a year doesn't immediately lose points — it increments the inactivity counter
  // The penalty is informational: "you're one year closer to purge"
  if (purgeRule && currentPoints > 0) {
    alerts.push({
      id: `missed-slide-purge-${missedStateId}-${missedSpeciesId}`,
      severity: "warning",
      title: `Inactivity Warning: ${missedStateId} ${missedSpeciesId}`,
      description: `Missing the ${missedYear} application moves you closer to the ${purgeRule.maxInactiveYears}-year inactivity purge for ${missedStateId}. You have ${currentPoints} points at risk.`,
      recommendation: `Apply or buy points before the next ${missedStateId} deadline to reset the inactivity counter.`,
      stateId: missedStateId,
      speciesId: missedSpeciesId,
      eventType: "deadline_missed",
    });
  }

  alerts.push({
    id: `roadmap-slide-${missedStateId}-${missedSpeciesId}-${missedYear}`,
    severity: "info",
    title: `Roadmap Adjusted: ${missedStateId} ${missedSpeciesId} Slid +1 Year`,
    description: `Your ${missedStateId} ${missedSpeciesId} timeline has been pushed out by 1 year due to the missed ${missedYear} deadline. All downstream milestones shifted accordingly.`,
    recommendation: `Review your updated roadmap timeline for conflicts with other state deadlines.`,
    stateId: missedStateId,
    speciesId: missedSpeciesId,
    eventType: "deadline_missed",
  });

  return {
    slidRoadmap,
    pointPenalties,
    alerts,
    yearsSlid: 1,
  };
}

// ============================================================================
// PHASE 4: MULTI-PLAYER DESTRUCTIBILITY
// ============================================================================

/**
 * Test 4.1: Flaky Buddy Recompute
 *
 * When a party member bails, instantly recalculate group average
 * and surface the odds impact.
 */
export interface FlakeBuddyResult {
  oldGroupSize: number;
  newGroupSize: number;
  oldEffectivePoints: number;
  newEffectivePoints: number;
  pointsDrop: number;
  oddsImpact: "severe" | "moderate" | "minimal";
  alert: FiduciaryAlert;
}

export function computeFlakeBuddyImpact(
  stateId: string,
  speciesId: string,
  oldPartyPoints: number[],       // e.g., [6, 4, 2]
  removedMemberIndex: number,     // Who bailed (0-indexed)
): FlakeBuddyResult {
  const oldResult = computeGroupDrawPoints(stateId, speciesId, oldPartyPoints);
  const newPartyPoints = oldPartyPoints.filter((_, i) => i !== removedMemberIndex);
  const newResult = computeGroupDrawPoints(stateId, speciesId, newPartyPoints);

  const pointsDrop = oldResult.effectivePoints - newResult.effectivePoints;
  let oddsImpact: FlakeBuddyResult["oddsImpact"];

  if (pointsDrop >= 3) {
    oddsImpact = "severe";
  } else if (pointsDrop >= 1) {
    oddsImpact = "moderate";
  } else {
    oddsImpact = "minimal";
  }

  const alert: FiduciaryAlert = {
    id: `flake-buddy-${stateId}-${speciesId}-${Date.now()}`,
    severity: oddsImpact === "severe" ? "critical" : oddsImpact === "moderate" ? "warning" : "info",
    title: `Group Dynamics Altered: ${stateId} ${speciesId}`,
    description: `Party reduced from ${oldPartyPoints.length} to ${newPartyPoints.length} members. Effective points dropped from ${oldResult.effectivePoints} to ${newResult.effectivePoints} (−${pointsDrop}). ${oddsImpact === "severe" ? "Your F&G draw odds have significantly decreased." : ""}`,
    recommendation: oddsImpact === "severe"
      ? `Rebalance recommended before deadline. Consider applying solo to preserve your individual points (${Math.max(...newPartyPoints)}).`
      : `Monitor group composition. Your effective points are now ${newResult.effectivePoints}.`,
    stateId,
    speciesId,
    eventType: "party_change",
  };

  return {
    oldGroupSize: oldPartyPoints.length,
    newGroupSize: newPartyPoints.length,
    oldEffectivePoints: oldResult.effectivePoints,
    newEffectivePoints: newResult.effectivePoints,
    pointsDrop,
    oddsImpact,
    alert,
  };
}

/**
 * Test 4.2: Mixed Residency Party Warning
 *
 * Many states force the ENTIRE party into the NR quota cap
 * if any member is a non-resident. Warn the resident.
 */
export interface MixedResidencyWarning {
  stateId: string;
  hasWarning: boolean;
  residencyMix: { memberId: string; isResident: boolean }[];
  impactDescription: string;
  alert?: FiduciaryAlert;
}

export function checkMixedResidencyParty(
  stateId: string,
  speciesId: string,
  partyMembers: { memberId: string; homeState: string }[],
): MixedResidencyWarning {
  const residencyMix = partyMembers.map((m) => ({
    memberId: m.memberId,
    isResident: m.homeState === stateId,
  }));

  const hasResidents = residencyMix.some((m) => m.isResident);
  const hasNonResidents = residencyMix.some((m) => !m.isResident);
  const isMixed = hasResidents && hasNonResidents;

  // States where mixed parties get forced into NR pool
  // Most western states enforce this rule
  const mixedPartyStates = new Set(["CO", "WY", "MT", "NV", "AZ", "UT", "NM", "OR", "ID", "KS"]);
  const enforced = mixedPartyStates.has(stateId) && isMixed;

  const residentMembers = residencyMix.filter((m) => m.isResident).length;

  let impactDescription: string;
  let alert: FiduciaryAlert | undefined;

  if (!isMixed) {
    impactDescription = hasResidents
      ? "All party members are residents. Full resident quota access."
      : "All party members are non-residents. Standard NR quota.";
  } else if (enforced) {
    impactDescription = `Mixed party (${residentMembers} resident, ${residencyMix.length - residentMembers} NR). In ${stateId}, the entire party enters the Non-Resident quota — resident members lose their resident advantage.`;

    alert = {
      id: `mixed-party-${stateId}-${speciesId}`,
      severity: "warning",
      title: `Mixed Residency Warning: ${stateId} ${speciesId}`,
      description: `Applying with a Non-Resident subjects the entire party to the ${stateId} Non-Resident cap (~10% of tags). Resident member(s) lose access to the larger resident quota.`,
      recommendation: `Consider applying separately: residents in the resident pool, non-residents in the NR pool. This maximizes combined draw probability.`,
      stateId,
      speciesId,
      eventType: "party_change",
    };
  } else {
    impactDescription = "Mixed party but state allows mixed-residency applications without penalty.";
  }

  return {
    stateId,
    hasWarning: enforced,
    residencyMix,
    impactDescription,
    alert,
  };
}

// ============================================================================
// PHASE 5: MICRO-FINANCIAL RECONCILIATION
// ============================================================================

/**
 * Test 5.1: CC Fee Segregation
 *
 * NM charges $790 upfront but also takes ~$13 non-refundable app fee
 * + 2.5% CC processing fee on the $790. User gets ~$777 back, not $790.
 * Segregate the friction costs into Sunk Capital.
 */
export interface RefinedCapitalBreakdown {
  stateId: string;
  speciesId: string;
  grossFloat: number;            // The "headline" float amount (e.g., $790)
  applicationFee: number;        // Non-refundable app fee (sunk)
  ccProcessingFee: number;       // CC surcharge (sunk)
  netRefundable: number;         // What user actually gets back
  totalSunk: number;             // App fee + CC fee + other non-refundable
  totalFloated: number;          // Net refundable only
}

export function computeRefinedCapital(
  stateId: string,
  speciesId: string,
  grossFloat: number,            // The full upfront amount charged
  applicationFee: number,        // Non-refundable portion
  ccRate: number = 0.025,        // Default 2.5% CC processing fee
): RefinedCapitalBreakdown {
  const ccProcessingFee = Math.round(grossFloat * ccRate * 100) / 100;
  const netRefundable = grossFloat - applicationFee - ccProcessingFee;

  return {
    stateId,
    speciesId,
    grossFloat,
    applicationFee,
    ccProcessingFee,
    netRefundable: Math.max(0, netRefundable),
    totalSunk: applicationFee + ccProcessingFee,
    totalFloated: Math.max(0, netRefundable),
  };
}

/**
 * Test 5.2: Refund Delay Tracking
 *
 * States have legally mandated refund windows. Until the user
 * clicks "Funds Received," floated capital is "Pending F&G Refund"
 * — not available for reallocation.
 */
export type RefundStatus = "applied" | "draw_pending" | "not_drawn_refund_pending" | "refund_received" | "drawn_committed";

export interface RefundTracker {
  stateId: string;
  speciesId: string;
  amount: number;
  status: RefundStatus;
  statusLabel: string;
  drawDate?: string;              // When draw results come out
  estimatedRefundDate?: string;   // drawDate + refund window
  refundWindowWeeks: number;
  isAvailableForBudget: boolean;
}

/** State-specific refund delay windows (weeks after draw) */
const REFUND_DELAY_WEEKS: Record<string, number> = {
  NM: 4,    // New Mexico: ~4 weeks
  ID: 6,    // Idaho: up to 6 weeks
  WY: 3,    // Wyoming: ~3 weeks
  MT: 4,    // Montana: ~4 weeks
};

export function computeRefundStatus(
  stateId: string,
  speciesId: string,
  amount: number,
  drawOutcome: "drew" | "didnt_draw" | null,
  drawResultDate?: string,
  fundsReceivedByUser: boolean = false,
): RefundTracker {
  const refundWindowWeeks = REFUND_DELAY_WEEKS[stateId] ?? 4;

  let status: RefundStatus;
  let statusLabel: string;
  let isAvailableForBudget: boolean;
  let estimatedRefundDate: string | undefined;

  if (drawOutcome === "drew") {
    status = "drawn_committed";
    statusLabel = "Drawn — Committed (Sunk)";
    isAvailableForBudget = false;
  } else if (drawOutcome === "didnt_draw") {
    if (fundsReceivedByUser) {
      status = "refund_received";
      statusLabel = "Refund Received — Available";
      isAvailableForBudget = true;
    } else {
      status = "not_drawn_refund_pending";
      statusLabel = `Pending F&G Refund (~${refundWindowWeeks} weeks)`;
      isAvailableForBudget = false;

      // Calculate estimated refund date
      if (drawResultDate) {
        const drawDate = new Date(drawResultDate);
        drawDate.setDate(drawDate.getDate() + refundWindowWeeks * 7);
        estimatedRefundDate = drawDate.toISOString().slice(0, 10);
      }
    }
  } else if (drawResultDate) {
    // Check if draw date has passed
    const today = new Date().toISOString().slice(0, 10);
    if (drawResultDate <= today) {
      status = "draw_pending";
      statusLabel = "Draw results expected — check F&G site";
      isAvailableForBudget = false;
    } else {
      status = "applied";
      statusLabel = "Applied — Awaiting Draw";
      isAvailableForBudget = false;
    }
  } else {
    status = "applied";
    statusLabel = "Applied — Awaiting Draw";
    isAvailableForBudget = false;
  }

  return {
    stateId,
    speciesId,
    amount,
    status,
    statusLabel,
    drawDate: drawResultDate,
    estimatedRefundDate,
    refundWindowWeeks,
    isAvailableForBudget,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function isValidISODate(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  const match = str.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

function parseDateInTimezone(dateStr: string, timezone: string): Date {
  // Create a date and adjust for timezone offset
  // This is a simplified approach — in production, use a library like date-fns-tz
  const date = new Date(dateStr);

  // Get the offset for the target timezone at this date
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  const offset = utcDate.getTime() - tzDate.getTime();

  return new Date(date.getTime() + offset);
}

function computeAnnualCost(state: State, speciesId: string, isResident: boolean): number {
  if (isResident) {
    const resFees = state.residentLicenseFees ?? { qualifyingLicense: 0, appFee: 0, pointFee: 0 };
    const resPointCost = state.residentPointCost?.[speciesId] ?? state.pointCost?.[speciesId] ?? 0;
    return (resFees.qualifyingLicense ?? 0) + (resFees.appFee ?? 0) + resPointCost;
  }
  return (state.licenseFees?.qualifyingLicense ?? 0) +
    (state.licenseFees?.appFee ?? 0) +
    (state.pointCost?.[speciesId] ?? 0);
}
