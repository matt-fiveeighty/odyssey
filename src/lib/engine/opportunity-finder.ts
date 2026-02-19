/**
 * Opportunity Finder Engine
 *
 * Scans for OTC tags, leftover openings, high-odds draws, and gap fillers
 * matching the user's profile. Surfaces "low-hanging fruit" hunts the user
 * may not have considered.
 */

import type { Unit, UserPoints } from "@/lib/types";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { resolveFees } from "./fee-resolver";

// ============================================================================
// Types
// ============================================================================

export interface OpportunityInput {
  species: string[];
  homeState: string;
  userPoints: UserPoints[];
  existingStates: string[]; // States already in their plan
  huntStyle: string;
  year: number;
}

export interface Opportunity {
  type: "otc" | "leftover" | "gap_filler" | "underrated";
  title: string;
  description: string;
  stateId: string;
  speciesId: string;
  unitCode?: string;
  estimatedCost: number;
  confidence: "high" | "medium" | "low";
  reason: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Format species ID to human-readable: "mule_deer" -> "Mule Deer" */
function formatSpecies(speciesId: string): string {
  return speciesId
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Get user's current points for a state+species combo */
function getUserPoints(
  userPoints: UserPoints[],
  stateId: string,
  speciesId: string
): number {
  const match = userPoints.find(
    (p) => p.stateId === stateId && p.speciesId === speciesId
  );
  return match?.points ?? 0;
}

/** Estimate base cost for a hunt in a state (license + app + tag) */
function estimateHuntCost(stateId: string, homeState?: string): number {
  const state = STATES_MAP[stateId];
  if (!state) return 1000;
  const fees = resolveFees(state, homeState ?? "");
  const license = fees.qualifyingLicense;
  const appFee = fees.appFee;
  // Rough tag estimate
  const tagEstimate = stateId === "CO" ? 700 : stateId === "ID" ? 600 : 800;
  return license + appFee + tagEstimate;
}

// ============================================================================
// OTC Unit Detection
// ============================================================================

/** Units with 0 points required NR are effectively OTC / guaranteed draw */
function findOtcUnits(units: Unit[], species: string[]): Unit[] {
  return units.filter(
    (u) =>
      species.includes(u.speciesId) &&
      u.pointsRequiredNonresident === 0 &&
      u.tagQuotaNonresident > 50 // High quota = effectively OTC
  );
}

// ============================================================================
// High-Odds Draw Detection
// ============================================================================

/** Units where latest draw odds > 50% — "near guaranteed" draws */
function findHighOddsUnits(units: Unit[], species: string[]): Unit[] {
  return units.filter((u) => {
    if (!species.includes(u.speciesId)) return false;
    if (!u.drawData || u.drawData.length === 0) return false;
    const latest = u.drawData[u.drawData.length - 1];
    return latest.oddsPercent > 50;
  });
}

// ============================================================================
// Core Finder
// ============================================================================

export function findOpportunities(input: OpportunityInput): Opportunity[] {
  const { species, userPoints, existingStates, huntStyle, year } = input;
  const opportunities: Opportunity[] = [];
  const units = SAMPLE_UNITS;

  // 1. Check for OTC units where no draw is needed
  const otcUnits = findOtcUnits(units, species);
  for (const unit of otcUnits) {
    const state = STATES_MAP[unit.stateId];
    if (!state) continue;

    // Prefer units that match hunt style
    const styleMatch =
      huntStyle === "diy_backpack"
        ? unit.publicLandPct > 0.4
        : huntStyle === "diy_truck"
          ? unit.pressureLevel !== "High"
          : true;

    if (!styleMatch) continue;

    opportunities.push({
      type: "otc",
      title: `OTC ${formatSpecies(unit.speciesId)} — ${state.abbreviation} Unit ${unit.unitCode}`,
      description: `Over-the-counter tag available. ${Math.round(unit.successRate * 100)}% success rate, ${Math.round(unit.publicLandPct * 100)}% public land.${unit.unitName ? ` (${unit.unitName})` : ""}`,
      stateId: unit.stateId,
      speciesId: unit.speciesId,
      unitCode: unit.unitCode,
      estimatedCost: estimateHuntCost(unit.stateId, input.homeState),
      confidence: unit.successRate > 0.25 ? "high" : "medium",
      reason: `No draw required. ${unit.tagQuotaNonresident} NR tags available. Good for ${year} planning.`,
    });
  }

  // 2. Find units with very high draw odds (>50%) as "near-guaranteed" options
  const highOddsUnits = findHighOddsUnits(units, species);
  for (const unit of highOddsUnits) {
    const state = STATES_MAP[unit.stateId];
    if (!state) continue;

    // Skip if already covered as OTC
    if (otcUnits.some((o) => o.id === unit.id)) continue;

    const latest = unit.drawData![unit.drawData!.length - 1];
    const pts = getUserPoints(userPoints, unit.stateId, unit.speciesId);

    opportunities.push({
      type: "leftover",
      title: `High-Odds ${formatSpecies(unit.speciesId)} — ${state.abbreviation} Unit ${unit.unitCode}`,
      description: `${latest.oddsPercent}% draw odds last year. You have ${pts} points.${unit.unitName ? ` (${unit.unitName})` : ""}`,
      stateId: unit.stateId,
      speciesId: unit.speciesId,
      unitCode: unit.unitCode,
      estimatedCost: estimateHuntCost(unit.stateId, input.homeState),
      confidence: latest.oddsPercent > 75 ? "high" : "medium",
      reason: `Near-guaranteed draw with strong recent odds. Apply in ${year} for a solid shot.`,
    });
  }

  // 3. Look for states not in their plan that match their species interests
  for (const state of STATES) {
    if (existingStates.includes(state.id)) continue;

    const matchingSpecies = species.filter((s) => state.availableSpecies.includes(s));
    if (matchingSpecies.length === 0) continue;

    // Only suggest states with random or easy point systems
    const easyEntry =
      state.pointSystem === "random" ||
      state.pointSystem === "bonus" ||
      state.pointSystem === "bonus_squared";

    if (easyEntry) {
      const topSpecies = matchingSpecies[0];
      opportunities.push({
        type: "gap_filler",
        title: `Consider ${state.abbreviation} for ${formatSpecies(topSpecies)}`,
        description: `${state.name} uses a ${state.pointSystem} system — every applicant has a chance regardless of points. ${state.pointSystemDetails.description}`,
        stateId: state.id,
        speciesId: topSpecies,
        estimatedCost: estimateHuntCost(state.id, input.homeState),
        confidence: "medium",
        reason: `${state.abbreviation} is not in your current plan but offers ${matchingSpecies.length} of your target species with a lottery-friendly draw system.`,
      });
    }
  }

  // 4. Suggest underrated units in existing states
  for (const stateId of existingStates) {
    const stateUnits = units.filter((u) => u.stateId === stateId && species.includes(u.speciesId));

    // Find units with good success but low pressure
    const underrated = stateUnits.filter(
      (u) =>
        u.successRate > 0.2 &&
        u.pressureLevel === "Low" &&
        u.publicLandPct > 0.3
    );

    for (const unit of underrated) {
      const state = STATES_MAP[unit.stateId];
      if (!state) continue;

      // Skip if already surfaced as OTC or high-odds
      if (
        opportunities.some(
          (o) =>
            o.stateId === unit.stateId &&
            o.speciesId === unit.speciesId &&
            o.unitCode === unit.unitCode
        )
      ) {
        continue;
      }

      opportunities.push({
        type: "underrated",
        title: `Underrated: ${state.abbreviation} Unit ${unit.unitCode} ${formatSpecies(unit.speciesId)}`,
        description: `Low pressure, ${Math.round(unit.successRate * 100)}% success, ${Math.round(unit.publicLandPct * 100)}% public land.${unit.unitName ? ` (${unit.unitName})` : ""}`,
        stateId: unit.stateId,
        speciesId: unit.speciesId,
        unitCode: unit.unitCode,
        estimatedCost: estimateHuntCost(unit.stateId, input.homeState),
        confidence: "medium",
        reason: `Under-the-radar unit in a state you're already investing in. Good trophy-to-pressure ratio.`,
      });
    }
  }

  // 5. Sort by confidence then estimated cost
  const confidenceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  opportunities.sort((a, b) => {
    const confDiff = (confidenceOrder[a.confidence] ?? 2) - (confidenceOrder[b.confidence] ?? 2);
    if (confDiff !== 0) return confDiff;
    return a.estimatedCost - b.estimatedCost;
  });

  return opportunities;
}
