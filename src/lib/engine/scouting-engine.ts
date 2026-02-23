/**
 * Scouting Strategy Engine
 *
 * Detects OTC/high-odds units near trophy draw targets and scores them as
 * dual-purpose scouting opportunities. Pure functions — no React, no store.
 *
 * Phase 10: Scouting Strategy
 */

import type { StrategicAssessment, Unit, StateRecommendation, ScoutingTarget } from "@/lib/types";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { UNIT_CENTROIDS, getUnitDistance } from "@/lib/constants/unit-centroids";
import { STATES_MAP } from "@/lib/constants/states";

// ============================================================================
// Types
// ============================================================================

export interface ScoutingOpportunity {
  scoutUnit: Unit;
  scoutUnitId: string;
  targetUnit: { unitCode: string; unitName: string; stateId: string; speciesId: string };
  targetYearsAway: number;
  proximityScore: number;   // 0-40
  terrainScore: number;     // 0-25
  seasonScore: number;      // 0-20
  costScore: number;        // 0-15
  totalScore: number;       // 0-100
  distanceMiles: number | null;
  terrainOverlap: string[];
  strategicReason: string;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_SCORE_THRESHOLD = 45;
const MAX_PER_TARGET = 2;
const MAX_TOTAL = 5;
const SAME_STATE_PROXIMITY_DISCOUNT = 0.7; // 30% reduction for same-state

// ============================================================================
// Main Function
// ============================================================================

/**
 * Detect scouting opportunities for a user's strategic assessment.
 *
 * Finds OTC/high-odds units near the user's trophy draw targets and scores
 * them by geographic proximity, terrain similarity, season overlap, and cost.
 */
export function detectScoutingOpportunities(
  assessment: StrategicAssessment,
): ScoutingOpportunity[] {
  // 1. Extract trophy targets (multi-year draw units)
  const trophyTargets = extractTrophyTargets(assessment.stateRecommendations);
  if (trophyTargets.length === 0) return []; // All-OTC suppression

  // 2. Get IDs of all units already in the user's plan
  const planUnitIds = new Set(
    assessment.stateRecommendations.flatMap((sr) =>
      sr.bestUnits.map((u) => `${sr.stateId.toLowerCase()}-${findUnitSpecies(sr, u.unitCode)}-${u.unitCode.toLowerCase().replace(/\s+/g, "-")}`)
    ),
  );

  // 3. Build scouting candidate pool
  const candidates = SAMPLE_UNITS.filter((u) => {
    if (u.pointsRequiredNonresident > 1) return false;  // Must be accessible now/next year
    if (u.tagQuotaNonresident < 50) return false;        // Reasonable tag supply
    if (u.successRate < 0.15) return false;              // Must produce encounters
    if (planUnitIds.has(u.id)) return false;              // Not already in plan
    return true;
  });

  // 4. Score each candidate against each trophy target
  const allOpportunities: ScoutingOpportunity[] = [];

  for (const target of trophyTargets) {
    const targetOpps: ScoutingOpportunity[] = [];

    for (const candidate of candidates) {
      const opp = scoreCandidate(candidate, target);
      if (opp && opp.totalScore >= MIN_SCORE_THRESHOLD) {
        targetOpps.push(opp);
      }
    }

    // Keep top N per target
    targetOpps.sort((a, b) => b.totalScore - a.totalScore);
    allOpportunities.push(...targetOpps.slice(0, MAX_PER_TARGET));
  }

  // 5. Deduplicate (same scout unit for different targets → keep highest score)
  const deduped = new Map<string, ScoutingOpportunity>();
  for (const opp of allOpportunities) {
    const existing = deduped.get(opp.scoutUnitId);
    if (!existing || opp.totalScore > existing.totalScore) {
      deduped.set(opp.scoutUnitId, opp);
    }
  }

  // 6. Sort by score, cap at MAX_TOTAL
  return Array.from(deduped.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, MAX_TOTAL);
}

// ============================================================================
// Trophy Target Extraction
// ============================================================================

interface TrophyTarget {
  unitCode: string;
  unitName: string;
  stateId: string;
  speciesId: string;
  yearsAway: number;
  sampleUnit: Unit | undefined;
}

function extractTrophyTargets(stateRecs: StateRecommendation[]): TrophyTarget[] {
  const targets: TrophyTarget[] = [];

  for (const rec of stateRecs) {
    for (const bestUnit of rec.bestUnits) {
      // Find matching sample unit to check points required
      const sampleUnit = SAMPLE_UNITS.find(
        (u) => u.stateId === rec.stateId && u.unitCode === bestUnit.unitCode,
      );

      const pointsNeeded = sampleUnit?.pointsRequiredNonresident ?? 0;
      if (pointsNeeded < 2) continue; // Not a multi-year draw — skip

      const speciesId = findUnitSpecies(rec, bestUnit.unitCode);

      targets.push({
        unitCode: bestUnit.unitCode,
        unitName: bestUnit.unitName,
        stateId: rec.stateId,
        speciesId,
        yearsAway: pointsNeeded,
        sampleUnit,
      });
    }
  }

  return targets;
}

/** Infer species from a state recommendation's context */
function findUnitSpecies(rec: StateRecommendation, unitCode: string): string {
  // Match from SAMPLE_UNITS using stateId + unitCode
  const match = SAMPLE_UNITS.find(
    (u) => u.stateId === rec.stateId && u.unitCode === unitCode,
  );
  if (match) return match.speciesId;

  // Fallback: extract from the state's first available species
  const state = STATES_MAP[rec.stateId];
  return state?.availableSpecies?.[0] ?? "elk";
}

// ============================================================================
// Scoring
// ============================================================================

function scoreCandidate(
  candidate: Unit,
  target: TrophyTarget,
): ScoutingOpportunity | null {
  const targetUnit = target.sampleUnit;

  // Proximity score (0-40)
  const { proximityScore, distanceMiles } = scoreProximity(
    candidate, target.stateId, targetUnit,
  );

  // Terrain score (0-25)
  const { terrainScore, terrainOverlap } = scoreTerrain(
    candidate, targetUnit, candidate.speciesId !== target.speciesId,
  );

  // Season score (0-20)
  const seasonScore = scoreSeason(candidate, targetUnit);

  // Cost score (0-15)
  const costScore = scoreCost(candidate);

  const totalScore = proximityScore + terrainScore + seasonScore + costScore;

  const strategicReason = buildStrategicReason(
    candidate, target, distanceMiles, terrainOverlap,
  );

  return {
    scoutUnit: candidate,
    scoutUnitId: candidate.id,
    targetUnit: {
      unitCode: target.unitCode,
      unitName: target.unitName,
      stateId: target.stateId,
      speciesId: target.speciesId,
    },
    targetYearsAway: target.yearsAway,
    proximityScore,
    terrainScore,
    seasonScore,
    costScore,
    totalScore,
    distanceMiles,
    terrainOverlap,
    strategicReason,
  };
}

function scoreProximity(
  candidate: Unit,
  targetStateId: string,
  targetUnit: Unit | undefined,
): { proximityScore: number; distanceMiles: number | null } {
  const targetId = targetUnit?.id;
  let distanceMiles: number | null = null;
  let rawScore: number;

  if (targetId) {
    const result = getUnitDistance(candidate.id, targetId, candidate.stateId, targetStateId);
    if (result.source === "centroid") {
      distanceMiles = result.distanceMiles;
      if (distanceMiles <= 50) rawScore = 40;
      else if (distanceMiles <= 100) rawScore = 30;
      else if (distanceMiles <= 200) rawScore = 20;
      else if (distanceMiles <= 400) rawScore = 10;
      else rawScore = 5;
    } else {
      rawScore = result.proximity === "close" ? 25 : result.proximity === "medium" ? 15 : 5;
    }
  } else {
    // No target sample unit — use state fallback
    const result = getUnitDistance(candidate.id, "", candidate.stateId, targetStateId);
    rawScore = result.source === "state_region"
      ? (result.proximity === "close" ? 25 : result.proximity === "medium" ? 15 : 5)
      : 15;
  }

  // Same-state novelty discount: cross-state scouting is more valuable
  if (candidate.stateId === targetStateId) {
    rawScore = Math.round(rawScore * SAME_STATE_PROXIMITY_DISCOUNT);
  }

  return { proximityScore: rawScore, distanceMiles };
}

function scoreTerrain(
  candidate: Unit,
  targetUnit: Unit | undefined,
  crossSpecies: boolean,
): { terrainScore: number; terrainOverlap: string[] } {
  if (!targetUnit) return { terrainScore: 12, terrainOverlap: [] }; // Neutral

  const scoutTerrain = candidate.terrainType;
  const targetTerrain = targetUnit.terrainType;
  const overlap = scoutTerrain.filter((t) => targetTerrain.includes(t));
  const union = new Set([...scoutTerrain, ...targetTerrain]).size;

  let score = union > 0 ? Math.round((overlap.length / union) * 25) : 12;

  // Cross-species discount: different species use terrain differently
  if (crossSpecies) {
    score = Math.round(score * 0.8);
  }

  return { terrainScore: score, terrainOverlap: overlap };
}

function scoreSeason(candidate: Unit, targetUnit: Unit | undefined): number {
  if (!targetUnit) return 8; // Neutral

  const candidateSeason = candidate.tacticalNotes?.bestSeasonTier ?? "";
  const targetSeason = targetUnit.tacticalNotes?.bestSeasonTier ?? "";

  // Season tier keyword match
  if (candidateSeason && targetSeason) {
    const cWords = candidateSeason.toLowerCase().split(/\s+/);
    const tWords = targetSeason.toLowerCase().split(/\s+/);
    const commonKeywords = cWords.filter((w) => tWords.includes(w));
    if (commonKeywords.length > 0) return 20;
  }

  // Arrival date proximity
  const candidateArrival = candidate.tacticalNotes?.bestArrivalDate ?? "";
  const targetArrival = targetUnit.tacticalNotes?.bestArrivalDate ?? "";

  if (candidateArrival && targetArrival) {
    const cMonth = extractMonth(candidateArrival);
    const tMonth = extractMonth(targetArrival);
    if (cMonth !== null && tMonth !== null) {
      const diff = Math.abs(cMonth - tMonth);
      if (diff === 0) return 20;
      if (diff <= 1) return 12;
      return 8;
    }
  }

  return 8; // Neutral
}

function scoreCost(candidate: Unit): number {
  const state = STATES_MAP[candidate.stateId];
  const tagCosts = state?.tagCosts as Record<string, number> | undefined;
  const cost = tagCosts?.[candidate.speciesId] ?? 500;

  if (cost <= 200) return 15;
  if (cost <= 500) return 10;
  if (cost <= 1000) return 7;
  return 3;
}

// ============================================================================
// Strategic Reason Builder
// ============================================================================

function buildStrategicReason(
  candidate: Unit,
  target: TrophyTarget,
  distanceMiles: number | null,
  terrainOverlap: string[],
): string {
  const parts: string[] = [];

  // Terrain overlap
  if (terrainOverlap.length > 0) {
    parts.push(`Similar terrain (${terrainOverlap.join(", ")})`);
  }

  // Elevation comparison
  if (target.sampleUnit) {
    const [cLow, cHigh] = candidate.elevationRange;
    const [tLow, tHigh] = target.sampleUnit.elevationRange;
    const overlap = Math.max(0, Math.min(cHigh, tHigh) - Math.max(cLow, tLow));
    if (overlap > 500) {
      parts.push(
        `at comparable elevation (${cLow.toLocaleString()}-${cHigh.toLocaleString()} ft)`,
      );
    }
  }

  // Distance
  if (distanceMiles !== null) {
    parts.push(`~${distanceMiles} miles from your trophy unit`);
  }

  // Season context
  if (candidate.tacticalNotes?.bestSeasonTier) {
    parts.push(`${candidate.tacticalNotes.bestSeasonTier} season`);
  }

  if (parts.length === 0) {
    return `Accessible OTC/high-odds unit while you build points for ${target.stateId} ${target.speciesId}`;
  }

  return parts.join(". ") + ".";
}

// ============================================================================
// Helpers
// ============================================================================

/** Extract month number (1-12) from strings like "Arrive Oct 20" or "mid-September" */
function extractMonth(dateStr: string): number | null {
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  const lower = dateStr.toLowerCase();
  for (const [key, val] of Object.entries(months)) {
    if (lower.includes(key)) return val;
  }
  return null;
}
