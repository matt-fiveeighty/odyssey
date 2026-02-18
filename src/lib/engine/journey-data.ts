/**
 * Journey Data Engine
 *
 * Transforms a roadmap + user points + goals into a structured visual
 * data model that the Journey Timeline UI consumes.
 *
 * Responsibilities:
 *   1. Map each RoadmapYear to a JourneyYearData (hunts, apps, costs, phase)
 *   2. Build per-state/species point accumulation tracks
 *   3. Calculate unit unlock thresholds (when points >= pointsRequiredNonresident)
 *   4. Identify key milestones (first hunt, dream draw, point milestones)
 *   5. Sum totals across the full journey
 */

import type { RoadmapYear, UserPoints, UserGoal } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { estimateCreepRate, yearsToDrawWithCreep } from "@/lib/engine/point-creep";

// ============================================================================
// Public Types
// ============================================================================

export interface JourneyYearData {
  year: number;
  phase: "building" | "burn" | "gap" | "trophy";
  activeStates: string[];
  hunts: { stateId: string; speciesId: string; unitCode?: string }[];
  pointPurchases: { stateId: string; speciesId: string }[];
  applications: { stateId: string; speciesId: string; drawOdds?: number }[];
  estimatedCost: number;
  isHuntYear: boolean;
  milestoneLabel?: string;
}

export interface PointTrackData {
  stateId: string;
  speciesId: string;
  stateName: string;
  speciesName: string;
  years: {
    year: number;
    points: number;
    unlockThreshold?: number;
    unlockUnitCode?: string;
  }[];
}

export interface JourneyData {
  years: JourneyYearData[];
  pointTracks: PointTrackData[];
  totalHunts: number;
  totalInvestment: number;
  keyMilestones: { year: number; label: string }[];
}

// ============================================================================
// Constants
// ============================================================================

const JOURNEY_HORIZON = 15;

// ============================================================================
// Main Builder
// ============================================================================

export function buildJourneyData(
  roadmap: RoadmapYear[],
  userPoints: UserPoints[],
  goals?: UserGoal[]
): JourneyData {
  const currentYear = new Date().getFullYear();

  // Index roadmap years for fast lookup
  const roadmapByYear = new Map<number, RoadmapYear>();
  for (const ry of roadmap) {
    roadmapByYear.set(ry.year, ry);
  }

  // Build base point map from user portfolio
  const basePoints = new Map<string, number>();
  for (const pt of userPoints) {
    const key = `${pt.stateId}-${pt.speciesId}`;
    basePoints.set(key, pt.points);
  }

  // Also seed keys from roadmap actions so we track everything
  for (const ry of roadmap) {
    for (const action of ry.actions) {
      const key = `${action.stateId}-${action.speciesId}`;
      if (!basePoints.has(key)) {
        basePoints.set(key, 0);
      }
    }
  }

  // -----------------------------------------------------------------------
  // 1. Build JourneyYearData for each year in the horizon
  // -----------------------------------------------------------------------
  const years: JourneyYearData[] = [];
  const milestones: { year: number; label: string }[] = [];
  let totalHunts = 0;
  let totalInvestment = 0;
  let firstHuntRecorded = false;

  for (let offset = 0; offset < JOURNEY_HORIZON; offset++) {
    const year = currentYear + offset;
    const ry = roadmapByYear.get(year);

    const hunts: JourneyYearData["hunts"] = [];
    const pointPurchases: JourneyYearData["pointPurchases"] = [];
    const applications: JourneyYearData["applications"] = [];
    const activeStatesSet = new Set<string>();

    if (ry) {
      for (const action of ry.actions) {
        activeStatesSet.add(action.stateId);

        if (action.type === "hunt") {
          hunts.push({
            stateId: action.stateId,
            speciesId: action.speciesId,
            unitCode: action.unitCode,
          });
        } else if (action.type === "apply") {
          applications.push({
            stateId: action.stateId,
            speciesId: action.speciesId,
            drawOdds: action.estimatedDrawOdds,
          });
        } else if (action.type === "buy_points") {
          pointPurchases.push({
            stateId: action.stateId,
            speciesId: action.speciesId,
          });
        }
      }
    }

    const isHuntYear = ry?.isHuntYear ?? hunts.length > 0;
    const estimatedCost = ry?.estimatedCost ?? 0;
    const phase = ry?.phase ?? (hunts.length > 0 ? "burn" : "building");

    // Milestone: first hunt
    if (hunts.length > 0 && !firstHuntRecorded) {
      firstHuntRecorded = true;
      const species = SPECIES_MAP[hunts[0].speciesId];
      const label = `First ${species?.name ?? hunts[0].speciesId} hunt!`;
      milestones.push({ year, label });
    }

    // Milestone: trophy phase starts
    if (phase === "trophy" && (offset === 0 || years[offset - 1]?.phase !== "trophy")) {
      milestones.push({ year, label: "Trophy draw year" });
    }

    totalHunts += hunts.length;
    totalInvestment += estimatedCost;

    const milestoneLabel =
      milestones.find((m) => m.year === year)?.label ?? undefined;

    years.push({
      year,
      phase,
      activeStates: Array.from(activeStatesSet),
      hunts,
      pointPurchases,
      applications,
      estimatedCost,
      isHuntYear,
      milestoneLabel,
    });
  }

  // -----------------------------------------------------------------------
  // 2 & 3. Build point accumulation tracks with unlock thresholds
  // -----------------------------------------------------------------------
  const pointTracks: PointTrackData[] = [];

  for (const [key, basePts] of basePoints) {
    const [stateId, speciesId] = key.split("-");
    const state = STATES_MAP[stateId];
    const species = SPECIES_MAP[speciesId];

    // Find relevant units for this state/species combo
    const relevantUnits = SAMPLE_UNITS.filter(
      (u) => u.stateId === stateId && u.speciesId === speciesId
    );

    // Build the year-by-year point progression
    const trackYears: PointTrackData["years"] = [];

    for (let offset = 0; offset < JOURNEY_HORIZON; offset++) {
      const year = currentYear + offset;
      const projectedPoints = basePts + offset;

      // Check if any unit crosses its unlock threshold at this point level
      let unlockThreshold: number | undefined;
      let unlockUnitCode: string | undefined;

      for (const unit of relevantUnits) {
        const required = unit.pointsRequiredNonresident;
        if (required <= 0) continue;

        const creepRate = estimateCreepRate(unit.trophyRating);
        const prevPts = projectedPoints - 1;
        const prevYears = yearsToDrawWithCreep(
          prevPts > 0 ? prevPts : 0,
          required,
          creepRate
        );
        const nowYears = yearsToDrawWithCreep(
          projectedPoints,
          required,
          creepRate
        );

        // Unit becomes drawable at this point level
        if (prevYears > 0 && nowYears === 0) {
          unlockThreshold = required;
          unlockUnitCode = unit.unitCode;
          // Also record as a milestone
          const unitLabel = unit.unitName ?? unit.unitCode;
          milestones.push({
            year,
            label: `${state?.abbreviation ?? stateId} ${unitLabel} unlocked`,
          });
          break; // one unlock per year per track is enough
        }
      }

      trackYears.push({
        year,
        points: projectedPoints,
        unlockThreshold,
        unlockUnitCode,
      });
    }

    pointTracks.push({
      stateId,
      speciesId,
      stateName: state?.name ?? stateId,
      speciesName: species?.name ?? speciesId,
      years: trackYears,
    });
  }

  // -----------------------------------------------------------------------
  // 4. Goal-driven milestones
  // -----------------------------------------------------------------------
  if (goals) {
    for (const goal of goals) {
      if (goal.targetYear >= currentYear && goal.targetYear < currentYear + JOURNEY_HORIZON) {
        const species = SPECIES_MAP[goal.speciesId];
        milestones.push({
          year: goal.targetYear,
          label: goal.title || `${species?.name ?? goal.speciesId} goal`,
        });
      }
    }
  }

  // De-duplicate milestones by year+label
  const seen = new Set<string>();
  const uniqueMilestones = milestones.filter((m) => {
    const k = `${m.year}:${m.label}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Sort milestones chronologically
  uniqueMilestones.sort((a, b) => a.year - b.year);

  return {
    years,
    pointTracks,
    totalHunts,
    totalInvestment,
    keyMilestones: uniqueMilestones,
  };
}
