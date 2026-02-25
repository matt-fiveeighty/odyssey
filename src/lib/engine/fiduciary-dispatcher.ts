/**
 * Fiduciary Event Dispatcher — Centralized Cascade Engine
 *
 * "No tab owns its own math." Every action in Execution or Capital
 * must instantly trigger a recalculation of Strategy.
 *
 * This module contains pure functions that compute the EFFECTS of
 * fiduciary events. The store actions call these functions and then
 * execute the returned mutations across all three stores.
 *
 * Event types:
 *   1. Draw Outcome   — Drew / Didn't Draw → 4-part cascade
 *   2. Budget Change   — Slash/increase budget → Cascading Prune
 *   3. Profile Change  — Anchor variable mutation → Cascading Prune
 *   4. Deadline Missed — Stale deadline → rebalance alert
 *   5. Party Change    — Group composition → averaging cascade
 */

import type {
  Milestone,
  UserPoints,
  RoadmapYear,
  RoadmapAction,
  StrategicAssessment,
  CapitalType,
  ClassifiedFee,
  CostLineItem,
} from "@/lib/types";

import {
  computePostDrawReset,
  computeGroupDrawPoints,
  cascadingPrune,
  detectLiquidityBottleneck,
  type PostDrawReset,
  type PortfolioAsset,
  type FloatEvent,
  type GroupDrawResult,
  WAITING_PERIOD_RULES,
  POINT_PURGE_RULES,
} from "./portfolio-stress";

import { STATES_MAP } from "@/lib/constants/states";

// ============================================================================
// Event Types
// ============================================================================

export interface DrawOutcomeEvent {
  type: "draw_outcome";
  milestoneId: string;
  outcome: "drew" | "didnt_draw";
  stateId: string;
  speciesId: string;
  year: number;
  currentPoints: number;
}

export interface BudgetChangeEvent {
  type: "budget_change";
  oldPointYearBudget: number;
  newPointYearBudget: number;
  oldHuntYearBudget: number;
  newHuntYearBudget: number;
}

export interface ProfileChangeEvent {
  type: "profile_change";
  field: "physicalHorizon" | "weaponType" | "capitalFloatTolerance" | "partySize" | "planningHorizon";
  oldValue: unknown;
  newValue: unknown;
}

export interface DeadlineMissedEvent {
  type: "deadline_missed";
  milestoneId: string;
  stateId: string;
  speciesId: string;
  deadline: string;  // ISO date
  year: number;
}

export interface PartyChangeEvent {
  type: "party_change";
  stateId: string;
  speciesId: string;
  newPartySize: number;
  partyPoints: number[];  // Each member's point total
}

export type FiduciaryEvent =
  | DrawOutcomeEvent
  | BudgetChangeEvent
  | ProfileChangeEvent
  | DeadlineMissedEvent
  | PartyChangeEvent;

// ============================================================================
// Cascade Result — What mutations need to happen across stores
// ============================================================================

export interface PointMutation {
  stateId: string;
  speciesId: string;
  newPoints: number;
  delta: number;           // +1 for didn't draw, -N for drew (zeroed)
  reason: string;
}

export interface CapitalReclassification {
  stateId: string;
  speciesId: string;
  from: CapitalType;
  to: CapitalType;
  amount: number;
  reason: string;
}

export interface RoadmapInvalidation {
  year: number;
  stateId: string;
  speciesId: string;
  reason: string;
  action: "remove" | "recalculate" | "add_waiting_period";
}

export interface ScheduleConflict {
  stateId: string;
  speciesId: string;
  conflictType: "pto_overlap" | "season_overlap" | "success_disaster" | "deadline_clash";
  severity: "critical" | "warning" | "info";
  message: string;
  affectedYear?: number;
}

export interface FiduciaryAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendation?: string;
  stateId?: string;
  speciesId?: string;
  eventType: FiduciaryEvent["type"];
}

export interface CascadeResult {
  pointMutations: PointMutation[];
  capitalReclassifications: CapitalReclassification[];
  roadmapInvalidations: RoadmapInvalidation[];
  alerts: FiduciaryAlert[];
  scheduleConflicts: ScheduleConflict[];
  postDrawReset?: PostDrawReset;
  groupDrawResult?: GroupDrawResult;
}

// ============================================================================
// 1. DRAW OUTCOME DISPATCH — The 4-Part Cascade
// ============================================================================

/**
 * Compute the cascading effects of a draw outcome.
 *
 * IF DREW:
 *   1. Zero out point balance for state/species
 *   2. Run computePostDrawReset() for OIL waiting period checks
 *   3. Reclassify floated capital → sunk (tag cost now committed)
 *   4. Generate schedule conflicts (PTO block, success disaster check)
 *
 * IF DIDN'T DRAW:
 *   1. Increment points +1 (or state-specific increment)
 *   2. Release floated capital → available
 *   3. Update roadmap for next year (push out timeline)
 *   4. Run point creep check (dead asset detection)
 */
export function dispatchDrawOutcome(
  event: DrawOutcomeEvent,
  roadmap: RoadmapYear[],
  allUserPoints: UserPoints[],
  allMilestones: Milestone[],
  huntDaysPerYear: number,
  huntYearBudget: number,
): CascadeResult {
  const result: CascadeResult = {
    pointMutations: [],
    capitalReclassifications: [],
    roadmapInvalidations: [],
    alerts: [],
    scheduleConflicts: [],
  };

  if (event.outcome === "drew") {
    return computeDrewCascade(event, roadmap, allUserPoints, allMilestones, huntDaysPerYear, huntYearBudget);
  } else {
    return computeDidntDrawCascade(event, roadmap, allUserPoints);
  }
}

function computeDrewCascade(
  event: DrawOutcomeEvent,
  roadmap: RoadmapYear[],
  allUserPoints: UserPoints[],
  allMilestones: Milestone[],
  huntDaysPerYear: number,
  huntYearBudget: number,
): CascadeResult {
  const result: CascadeResult = {
    pointMutations: [],
    capitalReclassifications: [],
    roadmapInvalidations: [],
    alerts: [],
    scheduleConflicts: [],
  };

  // ── Part 1: Zero out points ──
  result.pointMutations.push({
    stateId: event.stateId,
    speciesId: event.speciesId,
    newPoints: 0,
    delta: -event.currentPoints,
    reason: `Drew ${event.stateId} ${event.speciesId} in ${event.year} — points zeroed`,
  });

  // ── Part 2: Post-draw reset (waiting period, horizon, affected years) ──
  const postDraw = computePostDrawReset(
    event.stateId,
    event.speciesId,
    event.year,
    event.currentPoints,
    roadmap,
  );
  result.postDrawReset = postDraw;

  // Mark affected roadmap years for recalculation
  for (const affectedYear of postDraw.affectedRoadmapYears) {
    result.roadmapInvalidations.push({
      year: affectedYear,
      stateId: event.stateId,
      speciesId: event.speciesId,
      reason: postDraw.isOnceInALifetime
        ? `Permanently ineligible for ${event.stateId} ${event.speciesId} (once-in-a-lifetime)`
        : postDraw.waitingPeriodYears > 0
          ? `${postDraw.waitingPeriodYears}-year waiting period after drawing ${event.stateId} ${event.speciesId}`
          : `Points reset to 0 — recalculate timeline`,
      action: postDraw.isOnceInALifetime ? "remove" : "recalculate",
    });
  }

  // Generate OIL waiting period alert
  if (postDraw.waitingPeriodYears > 0 && !postDraw.isOnceInALifetime) {
    result.alerts.push({
      id: `oil-wait-${event.stateId}-${event.speciesId}`,
      severity: "warning",
      title: `${event.stateId} ${event.speciesId}: ${postDraw.waitingPeriodYears}-Year Waiting Period`,
      description: `After drawing ${event.stateId} ${event.speciesId}, you cannot re-apply until ${postDraw.nextEligibleYear}. Your roadmap has been updated to reflect this restriction.`,
      recommendation: `Focus on other state/species combinations during the waiting period.`,
      stateId: event.stateId,
      speciesId: event.speciesId,
      eventType: "draw_outcome",
    });
  }

  if (postDraw.isOnceInALifetime) {
    result.alerts.push({
      id: `oil-permanent-${event.stateId}-${event.speciesId}`,
      severity: "critical",
      title: `${event.stateId} ${event.speciesId}: Once-in-a-Lifetime Tag Drawn`,
      description: `Congratulations! You've drawn a once-in-a-lifetime tag for ${event.stateId} ${event.speciesId}. You are permanently ineligible to re-apply for this species in this state.`,
      recommendation: `All future ${event.speciesId} entries for ${event.stateId} have been removed from your roadmap.`,
      stateId: event.stateId,
      speciesId: event.speciesId,
      eventType: "draw_outcome",
    });
  }

  // ── Part 3: Reclassify floated capital → sunk ──
  const stateData = STATES_MAP[event.stateId];
  if (stateData) {
    const tagCost = stateData.tagCosts?.[event.speciesId] ?? 0;
    if (tagCost > 0) {
      result.capitalReclassifications.push({
        stateId: event.stateId,
        speciesId: event.speciesId,
        from: "floated",
        to: "sunk",
        amount: tagCost,
        reason: `Drew tag — $${tagCost} tag fee is now a committed (sunk) cost`,
      });
    }
  }

  // ── Part 4: Schedule conflict detection ──

  // 4a. PTO collision: does this drawn hunt overlap with another hunt in the same season?
  const drawnHuntActions = roadmap
    .filter((yr) => yr.year === event.year)
    .flatMap((yr) => yr.actions.filter((a) =>
      a.type === "hunt" && a.stateId !== event.stateId,
    ));

  if (drawnHuntActions.length > 0) {
    const otherHunts = drawnHuntActions.map((a) => `${a.stateId} ${a.speciesId}`).join(", ");
    result.scheduleConflicts.push({
      stateId: event.stateId,
      speciesId: event.speciesId,
      conflictType: "pto_overlap",
      severity: "warning",
      message: `You drew ${event.stateId} ${event.speciesId} and also have hunts planned for ${otherHunts} in ${event.year}. Verify your PTO can accommodate both.`,
      affectedYear: event.year,
    });
  }

  // 4b. Success Disaster: drew an expensive tag while also having other commitments
  // Calculate total hunt-year cost if this draw + others are all drawn
  const thisYearHuntCosts = roadmap
    .filter((yr) => yr.year === event.year)
    .flatMap((yr) => yr.actions.filter((a) => a.type === "hunt" || a.type === "apply"))
    .reduce((sum, a) => sum + a.cost, 0);

  if (thisYearHuntCosts > huntYearBudget * 1.2) {
    result.scheduleConflicts.push({
      stateId: event.stateId,
      speciesId: event.speciesId,
      conflictType: "success_disaster",
      severity: "critical",
      message: `Success Disaster: Drawing ${event.stateId} ${event.speciesId} pushes your ${event.year} costs to ~$${thisYearHuntCosts.toLocaleString()}, exceeding your $${huntYearBudget.toLocaleString()} hunt-year budget by ${Math.round(((thisYearHuntCosts / huntYearBudget) - 1) * 100)}%.`,
      affectedYear: event.year,
    });

    result.alerts.push({
      id: `success-disaster-${event.stateId}-${event.speciesId}-${event.year}`,
      severity: "critical",
      title: `Success Disaster: Over Budget`,
      description: `Drawing ${event.stateId} ${event.speciesId} puts you ~$${(thisYearHuntCosts - huntYearBudget).toLocaleString()} over your hunt-year budget. You may need to defer another planned hunt.`,
      recommendation: `Review your ${event.year} hunt schedule in the Planner and consider deferring lower-priority hunts.`,
      stateId: event.stateId,
      speciesId: event.speciesId,
      eventType: "draw_outcome",
    });
  }

  // 4c. PTO days check
  const huntActionsThisYear = roadmap
    .filter((yr) => yr.year === event.year)
    .flatMap((yr) => yr.actions.filter((a) => a.type === "hunt"));

  // Rough estimate: each hunt = ~5-7 days
  const estimatedDaysNeeded = huntActionsThisYear.length * 6;
  if (huntDaysPerYear > 0 && estimatedDaysNeeded > huntDaysPerYear) {
    result.scheduleConflicts.push({
      stateId: event.stateId,
      speciesId: event.speciesId,
      conflictType: "pto_overlap",
      severity: "warning",
      message: `With ${huntActionsThisYear.length} hunts planned in ${event.year}, you'll need ~${estimatedDaysNeeded} days but only have ${huntDaysPerYear} days available.`,
      affectedYear: event.year,
    });
  }

  return result;
}

function computeDidntDrawCascade(
  event: DrawOutcomeEvent,
  roadmap: RoadmapYear[],
  allUserPoints: UserPoints[],
): CascadeResult {
  const result: CascadeResult = {
    pointMutations: [],
    capitalReclassifications: [],
    roadmapInvalidations: [],
    alerts: [],
    scheduleConflicts: [],
  };

  // ── Part 1: Increment points +1 ──
  const stateData = STATES_MAP[event.stateId];
  const pointSystem = stateData?.pointSystem;

  // Most states award a point for unsuccessful application
  // Random draw states (ID, NM) don't accumulate points
  const isRandomDraw = pointSystem === "random";
  const pointIncrement = isRandomDraw ? 0 : 1;

  result.pointMutations.push({
    stateId: event.stateId,
    speciesId: event.speciesId,
    newPoints: event.currentPoints + pointIncrement,
    delta: pointIncrement,
    reason: isRandomDraw
      ? `${event.stateId} is a random draw state — no point accumulation`
      : `Didn't draw ${event.stateId} ${event.speciesId} — earned +1 preference point (now ${event.currentPoints + 1})`,
  });

  // ── Part 2: Release floated capital ──
  if (stateData) {
    const tagCost = stateData.tagCosts?.[event.speciesId] ?? 0;
    // States with upfront tag fees that get refunded on unsuccessful draw
    const upfrontStates = ["NM", "ID", "WY"];
    if (upfrontStates.includes(event.stateId) && tagCost > 0) {
      result.capitalReclassifications.push({
        stateId: event.stateId,
        speciesId: event.speciesId,
        from: "floated",
        to: "sunk", // The float is released — money returns to user
        amount: -tagCost, // Negative = capital flowing back to user
        reason: `Didn't draw — $${tagCost} upfront tag fee refunded`,
      });
    }
  }

  // ── Part 3: Roadmap update — push timeline ──
  // The year they were supposed to hunt now becomes a build/apply year
  const nextYear = event.year + 1;
  const hasNextYearInRoadmap = roadmap.some((yr) => yr.year === nextYear);

  if (!hasNextYearInRoadmap) {
    result.roadmapInvalidations.push({
      year: nextYear,
      stateId: event.stateId,
      speciesId: event.speciesId,
      reason: `Didn't draw in ${event.year} — roadmap needs ${nextYear} entry for continued pursuit`,
      action: "recalculate",
    });
  }

  // ── Part 4: Dead asset check ──
  // If user has been building points for 5+ years and still not drawing,
  // check if point creep is outpacing their accumulation
  if (event.currentPoints >= 5) {
    result.alerts.push({
      id: `creep-check-${event.stateId}-${event.speciesId}`,
      severity: "info",
      title: `${event.stateId} ${event.speciesId}: ${event.currentPoints + pointIncrement} Points Accumulated`,
      description: `You now have ${event.currentPoints + pointIncrement} points in ${event.stateId} ${event.speciesId}. Review the Burn Rate Matrix to check if point creep is eroding your position.`,
      recommendation: `Open the Calculator to verify your projected draw year hasn't shifted.`,
      stateId: event.stateId,
      speciesId: event.speciesId,
      eventType: "draw_outcome",
    });
  }

  return result;
}

// ============================================================================
// 2. BUDGET CHANGE DISPATCH — Cascading Prune Trigger
// ============================================================================

/**
 * When the user slashes their budget, determine which positions to liquidate.
 *
 * Uses the Asset Preservation Hierarchy:
 *   1. NEVER prune assets within 2 years of burn
 *   2. Preserve high sunk-cost preference positions
 *   3. Trim lottery/random draws first
 *   4. Drop highest annual-cost / lowest-equity positions
 */
export function dispatchBudgetChange(
  event: BudgetChangeEvent,
  roadmap: RoadmapYear[],
  userPoints: UserPoints[],
): CascadeResult {
  const result: CascadeResult = {
    pointMutations: [],
    capitalReclassifications: [],
    roadmapInvalidations: [],
    alerts: [],
    scheduleConflicts: [],
  };

  const budgetDecreased = event.newPointYearBudget < event.oldPointYearBudget;
  if (!budgetDecreased) {
    // Budget increased — no pruning needed, just inform
    if (event.newPointYearBudget > event.oldPointYearBudget) {
      result.alerts.push({
        id: "budget-increase",
        severity: "info",
        title: "Budget Increased",
        description: `Point-year budget increased from $${event.oldPointYearBudget.toLocaleString()} to $${event.newPointYearBudget.toLocaleString()}. Review your roadmap for new opportunities.`,
        recommendation: "Consider adding lottery plays or accelerating your timeline.",
        eventType: "budget_change",
      });
    }
    return result;
  }

  // Build portfolio assets from roadmap + user points
  const currentYear = new Date().getFullYear();
  const assets: PortfolioAsset[] = [];
  const seen = new Set<string>();

  for (const yr of roadmap) {
    for (const action of yr.actions) {
      const key = `${action.stateId}-${action.speciesId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const stateData = STATES_MAP[action.stateId];
      if (!stateData) continue;

      const pts = userPoints.find(
        (p) => p.stateId === action.stateId && p.speciesId === action.speciesId,
      )?.points ?? 0;

      const annualCost = (stateData.pointCost?.[action.speciesId] ?? 0) +
        (stateData.licenseFees?.appFee ?? 0) +
        (stateData.licenseFees?.qualifyingLicense ?? 0);

      // Determine draw type
      const pointSystem = stateData.pointSystem;
      const drawType: "preference" | "lottery" | "bonus" =
        pointSystem === "random" ? "lottery" :
        pointSystem === "bonus" || pointSystem === "bonus_squared" ? "bonus" :
        "preference";

      // Estimate draw year from roadmap
      const huntYear = roadmap.find(
        (y) => y.actions.some((a) => a.stateId === action.stateId && a.speciesId === action.speciesId && a.type === "hunt"),
      )?.year ?? currentYear + 10;

      assets.push({
        stateId: action.stateId,
        speciesId: action.speciesId,
        currentPoints: pts,
        annualCost,
        sunkCost: pts * annualCost,
        drawType,
        estimatedDrawYear: huntYear,
        isCloseToBurn: huntYear - currentYear <= 2,
      });
    }
  }

  if (assets.length === 0) return result;

  const pruneResult = cascadingPrune(assets, event.newPointYearBudget);

  // Convert pruned assets to roadmap invalidations
  for (const pruned of pruneResult.pruned) {
    // Find all years with actions for this state/species
    for (const yr of roadmap) {
      const hasAction = yr.actions.some(
        (a) => a.stateId === pruned.stateId && a.speciesId === pruned.speciesId,
      );
      if (hasAction) {
        result.roadmapInvalidations.push({
          year: yr.year,
          stateId: pruned.stateId,
          speciesId: pruned.speciesId,
          reason: `Budget pruned: ${pruned.stateId} ${pruned.speciesId} (${pruned.drawType}, ${pruned.currentPoints} pts)`,
          action: "remove",
        });
      }
    }

    result.alerts.push({
      id: `prune-${pruned.stateId}-${pruned.speciesId}`,
      severity: pruned.currentPoints > 0 ? "warning" : "info",
      title: `Pruned: ${pruned.stateId} ${pruned.speciesId}`,
      description: pruned.currentPoints > 0
        ? `${pruned.stateId} ${pruned.speciesId} removed from roadmap to meet new budget. You have ${pruned.currentPoints} points invested — consider maintaining activity to avoid purge.`
        : `${pruned.stateId} ${pruned.speciesId} (${pruned.drawType}) removed from roadmap to meet new budget.`,
      recommendation: pruned.currentPoints > 0
        ? `Buy a preference point ($${pruned.annualCost}/yr) to preserve your ${pruned.currentPoints}-point investment, even if not in the active roadmap.`
        : undefined,
      stateId: pruned.stateId,
      speciesId: pruned.speciesId,
      eventType: "budget_change",
    });
  }

  // Summary alert
  if (pruneResult.pruned.length > 0) {
    result.alerts.unshift({
      id: "budget-prune-summary",
      severity: "critical",
      title: `Budget Cut: ${pruneResult.pruned.length} Position${pruneResult.pruned.length > 1 ? "s" : ""} Pruned`,
      description: `Budget reduced from $${event.oldPointYearBudget.toLocaleString()} to $${event.newPointYearBudget.toLocaleString()}. Removed ${pruneResult.pruned.length} position${pruneResult.pruned.length > 1 ? "s" : ""}, saving $${pruneResult.totalSaved.toLocaleString()}/yr. ${pruneResult.kept.length} position${pruneResult.kept.length > 1 ? "s" : ""} preserved.`,
      recommendation: "Review the roadmap to confirm the preserved positions match your priorities.",
      eventType: "budget_change",
    });
  }

  return result;
}

// ============================================================================
// 3. PROFILE CHANGE DISPATCH — Anchor Variable Cascade
// ============================================================================

/**
 * When a permanent anchor variable changes (age/horizon/weapon/float),
 * trigger the Endless Loop.
 *
 * Physical Horizon change: If shortened, run Cascading Prune to
 * remove positions that can't be reached within the new horizon.
 */
export function dispatchProfileChange(
  event: ProfileChangeEvent,
  roadmap: RoadmapYear[],
  userPoints: UserPoints[],
  currentBudget: number,
): CascadeResult {
  const result: CascadeResult = {
    pointMutations: [],
    capitalReclassifications: [],
    roadmapInvalidations: [],
    alerts: [],
    scheduleConflicts: [],
  };

  if (event.field === "physicalHorizon") {
    const oldHorizon = event.oldValue as number | null;
    const newHorizon = event.newValue as number | null;

    if (newHorizon !== null && (oldHorizon === null || newHorizon < oldHorizon)) {
      // Horizon shortened — prune positions beyond reach
      const currentYear = new Date().getFullYear();
      const cutoffYear = currentYear + newHorizon;

      // Find roadmap entries beyond the new horizon
      for (const yr of roadmap) {
        if (yr.year > cutoffYear) {
          for (const action of yr.actions) {
            result.roadmapInvalidations.push({
              year: yr.year,
              stateId: action.stateId,
              speciesId: action.speciesId,
              reason: `Beyond new ${newHorizon}-year horizon (cutoff: ${cutoffYear})`,
              action: "remove",
            });
          }
        }
      }

      if (result.roadmapInvalidations.length > 0) {
        result.alerts.push({
          id: "horizon-prune",
          severity: "warning",
          title: `Horizon Shortened: ${result.roadmapInvalidations.length} Actions Affected`,
          description: `Physical horizon changed from ${oldHorizon ?? "unlimited"} to ${newHorizon} years. ${result.roadmapInvalidations.length} roadmap actions fall beyond the new ${cutoffYear} cutoff.`,
          recommendation: "Review pruned positions — some may be reclassified from long-term plays to lottery plays.",
          eventType: "profile_change",
        });
      }
    }
  }

  if (event.field === "capitalFloatTolerance") {
    const newTolerance = event.newValue as number;
    const oldTolerance = event.oldValue as number;

    if (newTolerance < oldTolerance) {
      result.alerts.push({
        id: "float-tolerance-reduced",
        severity: "warning",
        title: `Float Tolerance Reduced to $${newTolerance.toLocaleString()}`,
        description: `Reducing your capital float tolerance from $${oldTolerance.toLocaleString()} to $${newTolerance.toLocaleString()} may trigger liquidity bottlenecks during application season.`,
        recommendation: "Check the Liquidity Bottleneck analysis on your Roadmap for potential conflicts.",
        eventType: "profile_change",
      });
    }
  }

  if (event.field === "planningHorizon") {
    const oldHorizon = event.oldValue as number;
    const newHorizon = event.newValue as number;

    if (newHorizon < oldHorizon) {
      const currentYear = new Date().getFullYear();
      const cutoffYear = currentYear + newHorizon;

      for (const yr of roadmap) {
        if (yr.year > cutoffYear) {
          for (const action of yr.actions) {
            result.roadmapInvalidations.push({
              year: yr.year,
              stateId: action.stateId,
              speciesId: action.speciesId,
              reason: `Beyond new ${newHorizon}-year planning horizon`,
              action: "remove",
            });
          }
        }
      }
    }
  }

  if (event.field === "weaponType") {
    result.alerts.push({
      id: "weapon-change",
      severity: "info",
      title: `Weapon Changed to ${String(event.newValue)}`,
      description: `Switching weapon type affects season availability and draw odds. Your roadmap may need rebuilding to reflect ${String(event.newValue)}-specific seasons.`,
      recommendation: "Rebuild your strategy in the Plan Builder to optimize for the new weapon type.",
      eventType: "profile_change",
    });
  }

  return result;
}

// ============================================================================
// 4. MISSED DEADLINE DISPATCH — Auto-Rebalance Trigger
// ============================================================================

/**
 * When today passes a deadline and the milestone isn't marked "Applied",
 * trigger an alert and compute the consequences.
 */
export function dispatchDeadlineMissed(
  event: DeadlineMissedEvent,
  roadmap: RoadmapYear[],
  existingPoints: Record<string, Record<string, number>>,
): CascadeResult {
  const result: CascadeResult = {
    pointMutations: [],
    capitalReclassifications: [],
    roadmapInvalidations: [],
    alerts: [],
    scheduleConflicts: [],
  };

  const stateData = STATES_MAP[event.stateId];
  const purgeRule = POINT_PURGE_RULES[event.stateId];
  const currentPoints = existingPoints[event.stateId]?.[event.speciesId] ?? 0;

  // Alert: deadline missed
  result.alerts.push({
    id: `missed-deadline-${event.stateId}-${event.speciesId}-${event.year}`,
    severity: currentPoints > 0 ? "critical" : "warning",
    title: `Missed Deadline: ${event.stateId} ${event.speciesId}`,
    description: `The ${event.stateId} ${event.speciesId} application deadline (${event.deadline}) has passed without an "Applied" status recorded. ${currentPoints > 0 ? `You have ${currentPoints} points at risk.` : ""}`,
    recommendation: currentPoints > 0 && purgeRule
      ? `This counts as an inactive year for ${event.stateId}. ${purgeRule.description}`
      : `Update your milestone status if you did apply, or adjust your roadmap.`,
    stateId: event.stateId,
    speciesId: event.speciesId,
    eventType: "deadline_missed",
  });

  // If this state has purge rules and user has points, warn about inactivity
  if (purgeRule && currentPoints > 0) {
    result.alerts.push({
      id: `purge-risk-${event.stateId}-${event.speciesId}`,
      severity: "critical",
      title: `Inactivity Counter: ${event.stateId} ${event.speciesId}`,
      description: `Missing the ${event.year} application counts toward the ${purgeRule.maxInactiveYears}-year inactivity purge threshold. ${purgeRule.description}`,
      recommendation: `Ensure you apply or buy points before the next deadline to reset the inactivity counter.`,
      stateId: event.stateId,
      speciesId: event.speciesId,
      eventType: "deadline_missed",
    });
  }

  // Roadmap invalidation: this year's apply action is now void
  result.roadmapInvalidations.push({
    year: event.year,
    stateId: event.stateId,
    speciesId: event.speciesId,
    reason: `Deadline missed — cannot apply for ${event.stateId} ${event.speciesId} in ${event.year}`,
    action: "recalculate",
  });

  return result;
}

// ============================================================================
// 5. PARTY CHANGE DISPATCH — Group Averaging Cascade
// ============================================================================

/**
 * When party composition changes, re-run group averaging for all
 * state/species combinations and cascade the effective point changes
 * to odds calculations and roadmap projections.
 */
export function dispatchPartyChange(
  event: PartyChangeEvent,
  allStatesInPlan: string[],
): CascadeResult {
  const result: CascadeResult = {
    pointMutations: [],
    capitalReclassifications: [],
    roadmapInvalidations: [],
    alerts: [],
    scheduleConflicts: [],
  };

  // Compute group draw result for the specified state/species
  const groupResult = computeGroupDrawPoints(
    event.stateId,
    event.speciesId,
    event.partyPoints,
  );
  result.groupDrawResult = groupResult;

  // If rounding causes significant point loss, alert
  if (groupResult.warning) {
    result.alerts.push({
      id: `group-rounding-${event.stateId}-${event.speciesId}`,
      severity: "warning",
      title: `Group Draw Rounding: ${event.stateId} ${event.speciesId}`,
      description: groupResult.warning,
      recommendation: `${event.stateId} uses ${groupResult.roundingMethod} rounding. Your effective points are ${groupResult.effectivePoints} (raw average: ${groupResult.rawAverage.toFixed(1)}).`,
      stateId: event.stateId,
      speciesId: event.speciesId,
      eventType: "party_change",
    });
  }

  // Solo → group or group → solo transition
  if (event.partyPoints.length > 1) {
    const maxPts = Math.max(...event.partyPoints);
    const minPts = Math.min(...event.partyPoints);
    const spread = maxPts - minPts;

    if (spread >= 3) {
      result.alerts.push({
        id: `party-spread-${event.stateId}-${event.speciesId}`,
        severity: "warning",
        title: `Large Point Spread in Party`,
        description: `Your party has a ${spread}-point spread (${minPts} to ${maxPts} points). In ${event.stateId}, this reduces your effective points from ${maxPts} to ${groupResult.effectivePoints}.`,
        recommendation: `Consider applying solo for ${event.stateId} if you're the high-point member.`,
        stateId: event.stateId,
        speciesId: event.speciesId,
        eventType: "party_change",
      });
    }
  }

  return result;
}

// ============================================================================
// 6. DEADLINE SCANNER — Detect All Missed Deadlines
// ============================================================================

/**
 * Scan all milestones to find deadlines that have passed without completion.
 * Call this on app load to surface any missed deadlines since last visit.
 */
export function detectMissedDeadlines(
  milestones: Milestone[],
  today: string = new Date().toISOString().slice(0, 10),
): DeadlineMissedEvent[] {
  const missed: DeadlineMissedEvent[] = [];

  for (const m of milestones) {
    if (
      m.type === "apply" &&
      m.dueDate &&
      m.dueDate < today &&
      !m.completed &&
      !m.drawOutcome
    ) {
      missed.push({
        type: "deadline_missed",
        milestoneId: m.id,
        stateId: m.stateId,
        speciesId: m.speciesId,
        deadline: m.dueDate,
        year: m.year,
      });
    }
  }

  return missed;
}

// ============================================================================
// 7. SUCCESS DISASTER DETECTOR
// ============================================================================

/**
 * Detect "Success Disaster" scenarios where drawing multiple tags
 * in the same year exceeds the hunt-year budget.
 *
 * Call this from the Rebalance tab to surface warnings.
 */
export function detectSuccessDisaster(
  milestones: Milestone[],
  huntYearBudget: number,
  huntDaysPerYear: number,
  currentYear: number = new Date().getFullYear(),
): FiduciaryAlert[] {
  const alerts: FiduciaryAlert[] = [];

  // Find all "drew" outcomes for this year
  const drewMilestones = milestones.filter(
    (m) => m.year === currentYear && m.drawOutcome === "drew" && m.type === "apply",
  );

  if (drewMilestones.length <= 1) return alerts;

  // Sum up total costs for drawn tags
  const totalCost = drewMilestones.reduce((sum, m) => sum + m.totalCost, 0);

  if (totalCost > huntYearBudget) {
    const overBy = totalCost - huntYearBudget;
    alerts.push({
      id: `success-disaster-${currentYear}`,
      severity: "critical",
      title: `Success Disaster: $${overBy.toLocaleString()} Over Budget`,
      description: `You drew ${drewMilestones.length} tags in ${currentYear} totaling ~$${totalCost.toLocaleString()}, exceeding your $${huntYearBudget.toLocaleString()} hunt-year budget by $${overBy.toLocaleString()}.`,
      recommendation: `Consider deferring one hunt to next year, or adjusting your budget. Tags drawn: ${drewMilestones.map((m) => `${m.stateId} ${m.speciesId}`).join(", ")}.`,
      eventType: "draw_outcome",
    });
  }

  // PTO check
  const estimatedDays = drewMilestones.length * 6; // ~6 days per hunt
  if (huntDaysPerYear > 0 && estimatedDays > huntDaysPerYear) {
    alerts.push({
      id: `success-disaster-pto-${currentYear}`,
      severity: "warning",
      title: `PTO Shortage: ${estimatedDays} Days Needed`,
      description: `Drawing ${drewMilestones.length} tags requires ~${estimatedDays} hunt days, but you only have ${huntDaysPerYear} days available per year.`,
      recommendation: `Review your hunt calendar in the Planner to prioritize which tags to use this year.`,
      eventType: "draw_outcome",
    });
  }

  return alerts;
}
