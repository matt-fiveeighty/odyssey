/**
 * Fee Resolver — R vs NR fee switching
 *
 * Given a hunter's homeState and a target hunting state, resolves the correct
 * fee schedule (resident vs non-resident). Falls back to NR fees if resident
 * data is not populated.
 */

import type { State, FeeLineItem } from "@/lib/types";

export interface ResolvedFees {
  isResident: boolean;
  qualifyingLicense: number;
  appFee: number;
  pointFee: number;
  feeSchedule: FeeLineItem[];
  pointCost: Record<string, number>;
  tagCosts: Record<string, number>;
  label: string; // "Resident" or "Non-Resident"
}

/**
 * Determine if a hunter is a resident of the target state.
 */
export function isResident(homeState: string, targetStateId: string): boolean {
  if (!homeState || !targetStateId) return false;
  return homeState.toUpperCase() === targetStateId.toUpperCase();
}

/**
 * Resolve the appropriate fee schedule based on homeState vs targetState.
 * If the hunter is a resident AND resident fees exist, use those.
 * Otherwise fall back to the NR fee schedule (which is the default).
 */
export function resolveFees(state: State, homeState: string): ResolvedFees {
  const resident = isResident(homeState, state.id);

  if (resident && state.residentLicenseFees) {
    return {
      isResident: true,
      qualifyingLicense: state.residentLicenseFees.qualifyingLicense ?? 0,
      appFee: state.residentLicenseFees.appFee ?? 0,
      pointFee: state.residentLicenseFees.pointFee ?? 0,
      feeSchedule: state.residentFeeSchedule ?? state.feeSchedule,
      pointCost: state.residentPointCost ?? state.pointCost,
      tagCosts: state.residentTagCosts ?? state.tagCosts,
      label: "Resident",
    };
  }

  return {
    isResident: false,
    qualifyingLicense: state.licenseFees.qualifyingLicense ?? 0,
    appFee: state.licenseFees.appFee ?? 0,
    pointFee: state.licenseFees.pointFee ?? 0,
    feeSchedule: state.feeSchedule,
    pointCost: state.pointCost,
    tagCosts: state.tagCosts,
    label: "Non-Resident",
  };
}
