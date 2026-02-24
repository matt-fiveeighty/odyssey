/**
 * Change Impact Engine — Master Allocator Blueprint
 *
 * Detects fee mutations between data versions and computes the financial
 * impact on affected user plans. No silent data mutations.
 *
 * When a state raises fees, the engine:
 *   1. Snapshots the change
 *   2. Identifies affected state/species combos in the user's plan
 *   3. Computes the delta on their 10-year projection
 *   4. Returns structured impact items for UI notification
 */

import type { State, StrategicAssessment, FeeLineItem } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { isLotteryPlay } from "./draw-odds";
import { estimatePCV } from "./point-creep";

// ============================================================================
// Types
// ============================================================================

export interface FeeChange {
  stateId: string;
  stateName: string;
  feeName: string;
  previousAmount: number;
  newAmount: number;
  delta: number;                     // newAmount - previousAmount
  percentChange: number;             // (delta / previousAmount) * 100
  affectsSpecies?: string[];         // Which species this fee applies to
}

export interface PlanImpact {
  feeChange: FeeChange;
  annualImpact: number;              // Per-year cost increase/decrease
  tenYearImpact: number;             // Projected 10-year impact
  affectedYears: number[];           // Which roadmap years are affected
}

export interface ChangeImpactReport {
  changes: FeeChange[];
  impacts: PlanImpact[];
  totalAnnualImpact: number;
  totalTenYearImpact: number;
  generatedAt: string;               // ISO date
}

// ============================================================================
// Fee Diffing
// ============================================================================

/**
 * Compare two versions of a state's fee data and return all changes.
 */
export function diffStateFees(
  previous: State,
  current: State,
): FeeChange[] {
  const changes: FeeChange[] = [];

  // Diff flat license fees
  const flatKeys = ["qualifyingLicense", "appFee", "pointFee"] as const;
  for (const key of flatKeys) {
    const prev = previous.licenseFees[key] ?? 0;
    const curr = current.licenseFees[key] ?? 0;
    if (prev !== curr) {
      changes.push({
        stateId: current.id,
        stateName: current.name,
        feeName: key === "qualifyingLicense" ? "Qualifying License"
          : key === "appFee" ? "Application Fee"
          : "Point Fee",
        previousAmount: prev,
        newAmount: curr,
        delta: curr - prev,
        percentChange: prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 100,
      });
    }
  }

  // Diff per-species point costs
  const allSpecies = new Set([
    ...Object.keys(previous.pointCost),
    ...Object.keys(current.pointCost),
  ]);
  for (const sp of allSpecies) {
    const prev = previous.pointCost[sp] ?? 0;
    const curr = current.pointCost[sp] ?? 0;
    if (prev !== curr) {
      changes.push({
        stateId: current.id,
        stateName: current.name,
        feeName: `Point Cost (${sp})`,
        previousAmount: prev,
        newAmount: curr,
        delta: curr - prev,
        percentChange: prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 100,
        affectsSpecies: [sp],
      });
    }
  }

  // Diff tag costs
  const allTagSpecies = new Set([
    ...Object.keys(previous.tagCosts),
    ...Object.keys(current.tagCosts),
  ]);
  for (const sp of allTagSpecies) {
    const prev = previous.tagCosts[sp] ?? 0;
    const curr = current.tagCosts[sp] ?? 0;
    if (prev !== curr) {
      changes.push({
        stateId: current.id,
        stateName: current.name,
        feeName: `Tag Cost (${sp})`,
        previousAmount: prev,
        newAmount: curr,
        delta: curr - prev,
        percentChange: prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 100,
        affectsSpecies: [sp],
      });
    }
  }

  // Diff itemized fee schedule
  const prevScheduleMap = new Map(previous.feeSchedule.map((f) => [f.name, f.amount]));
  for (const fee of current.feeSchedule) {
    const prevAmount = prevScheduleMap.get(fee.name) ?? 0;
    if (prevAmount !== fee.amount && !flatKeys.some((k) => fee.name.toLowerCase().includes(k.toLowerCase()))) {
      changes.push({
        stateId: current.id,
        stateName: current.name,
        feeName: fee.name,
        previousAmount: prevAmount,
        newAmount: fee.amount,
        delta: fee.amount - prevAmount,
        percentChange: prevAmount > 0 ? Math.round(((fee.amount - prevAmount) / prevAmount) * 100) : 100,
      });
    }
  }

  return changes;
}

// ============================================================================
// Impact Calculation
// ============================================================================

/**
 * Given fee changes and a user's assessment, compute the financial impact
 * on their 10-year plan.
 */
export function computePlanImpact(
  changes: FeeChange[],
  assessment: StrategicAssessment,
): ChangeImpactReport {
  const impacts: PlanImpact[] = [];

  for (const change of changes) {
    // Find roadmap years that involve this state
    const affectedYears: number[] = [];
    let annualHits = 0;

    for (const yr of assessment.roadmap) {
      const hasState = yr.actions.some((a) => {
        if (a.stateId !== change.stateId) return false;
        // If change affects specific species, check those
        if (change.affectsSpecies && change.affectsSpecies.length > 0) {
          return change.affectsSpecies.includes(a.speciesId);
        }
        return true;
      });
      if (hasState) {
        affectedYears.push(yr.year);
        annualHits++;
      }
    }

    if (affectedYears.length === 0) continue;

    const annualImpact = change.delta;
    const tenYearImpact = change.delta * annualHits;

    impacts.push({
      feeChange: change,
      annualImpact,
      tenYearImpact,
      affectedYears,
    });
  }

  return {
    changes,
    impacts,
    totalAnnualImpact: impacts.reduce((s, i) => s + i.annualImpact, 0),
    totalTenYearImpact: impacts.reduce((s, i) => s + i.tenYearImpact, 0),
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Contextual Alert System
// ============================================================================

export type AlertType =
  | "lottery_play"
  | "dead_asset"
  | "fee_increase"
  | "plateau_reclassified"
  | "physical_horizon_exceeded";

export interface ContextualAlert {
  id: string;
  type: AlertType;
  severity: "info" | "warning" | "critical";
  stateId?: string;
  speciesId?: string;
  headline: string;
  detail: string;
  recommendation: string;
}

/**
 * Generate contextual alerts for a strategic assessment.
 * Fixes the NM popup issue: random draws get "Lottery Play" badges
 * instead of misleading "plateau detected" warnings.
 */
export function generateContextualAlerts(
  assessment: StrategicAssessment,
  existingPoints: Record<string, Record<string, number>>,
  physicalHorizon?: number,
): ContextualAlert[] {
  const alerts: ContextualAlert[] = [];

  for (const rec of assessment.stateRecommendations) {
    const state = STATES_MAP[rec.stateId];
    if (!state) continue;

    // Lottery Play badge — pure random states should NOT trigger plateau warnings
    if (isLotteryPlay(state.pointSystem)) {
      alerts.push({
        id: `lottery-${rec.stateId}`,
        type: "lottery_play",
        severity: "info",
        stateId: rec.stateId,
        headline: `${state.abbreviation}: Lottery Play`,
        detail: `${state.name} uses a pure random draw. Multiple years without drawing is statistically expected, not a plateau.`,
        recommendation: `Do not rely on ${state.abbreviation} for your annual hunt. Treat it as a bonus opportunity alongside your point-building states.`,
      });
    }

    // Dead Asset detection
    for (const unit of rec.bestUnits) {
      const pcvResult = estimatePCV(unit.trophyRating);
      if (pcvResult.isDeadAsset) {
        const speciesId = assessment.roadmap
          .flatMap((yr) => yr.actions)
          .find((a) => a.stateId === rec.stateId)?.speciesId ?? "unknown";

        alerts.push({
          id: `dead-asset-${rec.stateId}-${unit.unitCode}`,
          type: "dead_asset",
          severity: "critical",
          stateId: rec.stateId,
          speciesId,
          headline: `Dead Asset: ${state.abbreviation} ${unit.unitCode}`,
          detail: `Point creep (${pcvResult.pcv.toFixed(1)} pts/yr) outpaces your accumulation rate (1 pt/yr). You will never catch up.`,
          recommendation: `Reallocate this investment. Consider lower-tier units in ${state.abbreviation} or redirect to a different state entirely.`,
        });
      }
    }

    // Physical horizon exceeded — demanding hunts scheduled beyond physical capability
    if (physicalHorizon) {
      const currentYear = new Date().getFullYear();
      const cutoffYear = currentYear + physicalHorizon;
      const demandingSpecies = new Set(["dall_sheep", "bighorn_sheep", "mountain_goat", "grizzly"]);

      for (const yr of assessment.roadmap) {
        if (yr.year > cutoffYear) {
          const demandingActions = yr.actions.filter(
            (a) => a.stateId === rec.stateId && demandingSpecies.has(a.speciesId) && a.type === "hunt"
          );
          for (const action of demandingActions) {
            alerts.push({
              id: `horizon-${rec.stateId}-${action.speciesId}-${yr.year}`,
              type: "physical_horizon_exceeded",
              severity: "warning",
              stateId: rec.stateId,
              speciesId: action.speciesId,
              headline: `${state.abbreviation} ${action.speciesId} hunt in ${yr.year} exceeds physical horizon`,
              detail: `You indicated ${physicalHorizon} years of extreme backcountry capability. This hunt is scheduled ${yr.year - currentYear} years out.`,
              recommendation: `Move this hunt earlier in the timeline, switch to a guided/drop-camp style, or target a more accessible unit.`,
            });
          }
        }
      }
    }
  }

  // Reclassify plateau violations for lottery states
  if (assessment.disciplineViolations) {
    for (const violation of assessment.disciplineViolations) {
      if (violation.ruleId === "plateau_detected" && violation.affectedStates) {
        for (const stateId of violation.affectedStates) {
          const state = STATES_MAP[stateId];
          if (state && isLotteryPlay(state.pointSystem)) {
            alerts.push({
              id: `plateau-reclassified-${stateId}`,
              type: "plateau_reclassified",
              severity: "info",
              stateId,
              headline: `${state.abbreviation}: Plateau Reclassified`,
              detail: `"Plateau Detected" is misleading for ${state.name}. This is a pure random draw — 9 consecutive years without drawing a 2% tag is a statistical certainty, not a problem.`,
              recommendation: `No action needed. Continue applying if the hunt is worth the annual fee. Do not increase investment based on a false plateau signal.`,
            });
          }
        }
      }
    }
  }

  return alerts;
}
