/**
 * ROI Calculator
 *
 * Calculates the return on investment for hunting point accumulation.
 * Treats points as investment currency — cost per point, total investment,
 * and annual subscription cost across all states.
 *
 * v2: Added itemized cost breakdowns for transparent per-line-item visibility.
 */

import { STATES_MAP } from "@/lib/constants/states";
import type { CostEstimate, CostLineItem } from "@/lib/types";

interface ROIInput {
  stateId: string;
  speciesId: string;
  currentPoints: number;
  targetPoints: number;
}

/**
 * Calculate itemized costs for a given state + species combination.
 * Returns individual line items (license, app fee, point fee, tag cost)
 * so the UI can render transparent cost breakdowns.
 */
export function calculateItemizedCost(
  stateId: string,
  speciesId: string,
  isHuntYear: boolean
): CostLineItem[] {
  const state = STATES_MAP[stateId];
  if (!state) return [];

  const items: CostLineItem[] = [];

  // Qualifying license (annual, shared across species for this state)
  if (state.licenseFees.qualifyingLicense && state.licenseFees.qualifyingLicense > 0) {
    items.push({
      label: `${state.abbreviation} ${state.feeSchedule.find(f => f.name.includes("License"))?.name || "Qualifying License"}`,
      amount: state.licenseFees.qualifyingLicense,
      category: "license",
      stateId,
      url: state.fgUrl,
      notes: state.feeSchedule.find(f => f.name.includes("License"))?.notes,
    });
  }

  // Application fee (per species)
  if (state.licenseFees.appFee && state.licenseFees.appFee > 0) {
    items.push({
      label: `${state.abbreviation} ${speciesId.replace("_", " ")} application fee`,
      amount: state.licenseFees.appFee,
      category: "application",
      stateId,
      speciesId,
    });
  }

  // Point fee (per species, only if building points)
  const pointFee = state.pointCost[speciesId] ?? 0;
  if (pointFee > 0 && !isHuntYear) {
    items.push({
      label: `${state.abbreviation} ${speciesId.replace("_", " ")} preference point`,
      amount: pointFee,
      category: "points",
      stateId,
      speciesId,
      url: state.buyPointsUrl,
    });
  }

  // Tag cost (only on hunt years)
  if (isHuntYear) {
    const tagCost = getEstimatedTagCost(stateId, speciesId);
    items.push({
      label: `${state.abbreviation} ${speciesId.replace("_", " ")} tag`,
      amount: tagCost,
      category: "tag",
      stateId,
      speciesId,
    });
  }

  return items;
}

/**
 * Get estimated NR tag cost for a state + species.
 */
export function getEstimatedTagCost(stateId: string, speciesId: string): number {
  const tagCosts: Record<string, Record<string, number>> = {
    CO: { elk: 659, mule_deer: 434, bear: 350, moose: 2500, pronghorn: 434, bighorn_sheep: 2500, mountain_goat: 2500, mountain_lion: 350 },
    WY: { elk: 707, mule_deer: 457, bear: 300, moose: 1750, pronghorn: 457, bighorn_sheep: 2250, mountain_goat: 2250, bison: 4500, mountain_lion: 300 },
    MT: { elk: 1200, mule_deer: 1200, bear: 350, moose: 1250, whitetail: 1200, pronghorn: 200, bighorn_sheep: 1250, mountain_goat: 1250, bison: 1250, mountain_lion: 350 },
    NV: { elk: 1200, mule_deer: 300, pronghorn: 300, bighorn_sheep: 1500, mountain_lion: 300 },
    AZ: { elk: 800, mule_deer: 300, bear: 250, pronghorn: 300, bighorn_sheep: 2000, bison: 2500, mountain_lion: 250 },
    UT: { elk: 558, mule_deer: 400, bear: 250, moose: 1500, pronghorn: 400, bighorn_sheep: 1500, mountain_goat: 1500, bison: 1500, mountain_lion: 250 },
    NM: { elk: 783, mule_deer: 350, bear: 250, pronghorn: 350, bighorn_sheep: 3100, mountain_lion: 250 },
    OR: { elk: 576, mule_deer: 400, bear: 300, pronghorn: 400, bighorn_sheep: 1500, mountain_goat: 1500, mountain_lion: 300 },
    ID: { elk: 600, mule_deer: 400, bear: 250, moose: 2000, whitetail: 400, pronghorn: 300, bighorn_sheep: 2000, mountain_goat: 2000, mountain_lion: 250 },
    KS: { mule_deer: 442, whitetail: 442, pronghorn: 442 },
    WA: { elk: 450, mule_deer: 350, bear: 300, moose: 1500, mountain_goat: 1500, bighorn_sheep: 1500, mountain_lion: 300 },
    NE: { elk: 500, mule_deer: 300, whitetail: 300, pronghorn: 200, bighorn_sheep: 1500 },
    SD: { elk: 600, mule_deer: 350, whitetail: 300, pronghorn: 200, bighorn_sheep: 1500, mountain_goat: 1500, mountain_lion: 350 },
    ND: { elk: 500, mule_deer: 300, whitetail: 300, pronghorn: 200, moose: 1500, bighorn_sheep: 1500 },
    AK: { moose: 800, bear: 650, elk: 600, mountain_goat: 600, dall_sheep: 850, bison: 1000, caribou: 650 },
  };

  return tagCosts[stateId]?.[speciesId] ?? 400;
}

/**
 * Calculate total annual point-year cost for a state across all species.
 */
export function calculatePointYearCost(
  stateId: string,
  speciesIds: string[]
): { total: number; items: CostLineItem[] } {
  const allItems: CostLineItem[] = [];
  let total = 0;

  // License is shared — only count once
  const state = STATES_MAP[stateId];
  if (!state) return { total: 0, items: [] };

  const licenseFee = state.licenseFees.qualifyingLicense ?? 0;
  if (licenseFee > 0) {
    allItems.push({
      label: `${state.abbreviation} ${state.feeSchedule.find(f => f.name.includes("License"))?.name || "Qualifying License"}`,
      amount: licenseFee,
      category: "license",
      stateId,
      url: state.fgUrl,
    });
    total += licenseFee;
  }

  for (const speciesId of speciesIds) {
    const appFee = state.licenseFees.appFee ?? 0;
    if (appFee > 0) {
      allItems.push({
        label: `${state.abbreviation} ${speciesId.replace("_", " ")} application fee`,
        amount: appFee,
        category: "application",
        stateId,
        speciesId,
      });
      total += appFee;
    }

    const pointFee = state.pointCost[speciesId] ?? 0;
    if (pointFee > 0) {
      allItems.push({
        label: `${state.abbreviation} ${speciesId.replace("_", " ")} preference point`,
        amount: pointFee,
        category: "points",
        stateId,
        speciesId,
        url: state.buyPointsUrl,
      });
      total += pointFee;
    }
  }

  return { total, items: allItems };
}

export function calculateCostEstimate(input: ROIInput): CostEstimate {
  const state = STATES_MAP[input.stateId];
  if (!state) {
    return {
      pointCostPerYear: 0,
      totalPointCost: 0,
      estimatedTagCost: 0,
      estimatedLicenseFees: 0,
      totalEstimatedCost: 0,
      yearsToAccumulate: 0,
      annualSubscriptionCost: 0,
    };
  }

  const pointCost = state.pointCost[input.speciesId] ?? 0;
  const appFee = state.licenseFees.appFee ?? 0;
  const licenseFee = state.licenseFees.qualifyingLicense ?? 0;
  const pointsNeeded = Math.max(0, input.targetPoints - input.currentPoints);

  // Annual cost = point fee + app fee + qualifying license (if required)
  const annualSubscriptionCost = pointCost + appFee + (licenseFee > 0 ? licenseFee : 0);

  // Total point cost = pointsNeeded * (point fee + app fee)
  const totalPointCost = pointsNeeded * (pointCost + appFee);

  const estimatedTagCost = getEstimatedTagCost(input.stateId, input.speciesId);
  const estimatedLicenseFees = licenseFee;

  const totalEstimatedCost =
    totalPointCost + estimatedTagCost + estimatedLicenseFees;

  return {
    pointCostPerYear: annualSubscriptionCost,
    totalPointCost,
    estimatedTagCost,
    estimatedLicenseFees,
    totalEstimatedCost,
    yearsToAccumulate: pointsNeeded,
    annualSubscriptionCost,
  };
}

/**
 * Calculate the total annual "subscription" cost across multiple states.
 * This is the "Point Subscription Model" — annual investment to maintain
 * eligibility across the portfolio.
 */
export function calculateAnnualSubscription(
  stateIds: string[],
  speciesIds: string[]
): { total: number; breakdown: { stateId: string; cost: number; items: CostLineItem[] }[] } {
  const breakdown: { stateId: string; cost: number; items: CostLineItem[] }[] = [];
  let total = 0;

  for (const stateId of stateIds) {
    const state = STATES_MAP[stateId];
    if (!state) continue;

    // Only include species this state actually offers
    const relevantSpecies = speciesIds.filter(s => state.availableSpecies.includes(s));
    if (relevantSpecies.length === 0) continue;

    const result = calculatePointYearCost(stateId, relevantSpecies);
    breakdown.push({ stateId, cost: result.total, items: result.items });
    total += result.total;
  }

  return { total, breakdown };
}
