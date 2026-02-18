/**
 * Unit Alternates Engine
 *
 * Given a primary unit, finds 3-5 alternate units that offer meaningful
 * tradeoffs. Each alternate includes a plain-English summary of what
 * you gain and what you give up.
 *
 * Tradeoff types:
 *   - higher_success:    Better odds of filling your tag
 *   - fewer_points:      Faster/cheaper to draw
 *   - lower_pressure:    Less crowded hunting experience
 *   - different_terrain: Different landscape / hunting style
 *   - nearby_state:      Similar opportunity in a different state
 */

import type { Unit, TerrainType } from "@/lib/types";

// ============================================================================
// Types
// ============================================================================

export interface AlternateUnit {
  unit: Unit;
  tradeoffSummary: string;
  tradeoffType:
    | "higher_success"
    | "fewer_points"
    | "lower_pressure"
    | "different_terrain"
    | "nearby_state";
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate terrain similarity as a 0-1 score.
 * 1 = identical terrain sets, 0 = no overlap.
 */
function terrainSimilarity(a: TerrainType[], b: TerrainType[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const intersection = b.filter((t) => setA.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Determine the primary tradeoff this candidate offers vs. the primary unit.
 * Returns the tradeoff type and a human-readable summary string.
 */
function determineTradeoff(
  primary: Unit,
  candidate: Unit
): { type: AlternateUnit["tradeoffType"]; summary: string } {
  // Different state is always the "nearby_state" tradeoff
  if (candidate.stateId !== primary.stateId) {
    const successDiff = candidate.successRate - primary.successRate;
    const pointsDiff =
      primary.pointsRequiredNonresident - candidate.pointsRequiredNonresident;
    const extras: string[] = [];

    if (successDiff > 0.05) {
      extras.push(
        `${Math.round(successDiff * 100)}% higher success rate`
      );
    }
    if (pointsDiff > 0) {
      extras.push(`${pointsDiff} fewer points needed`);
    }

    const extrasStr = extras.length > 0 ? ` with ${extras.join(" and ")}` : "";
    return {
      type: "nearby_state",
      summary: `Similar opportunity in ${candidate.stateId}${extrasStr}.`,
    };
  }

  // Check success rate advantage (most impactful tradeoff)
  const successDiff = candidate.successRate - primary.successRate;
  if (successDiff > 0.05) {
    const pointsDiff =
      candidate.pointsRequiredNonresident - primary.pointsRequiredNonresident;
    const caveat =
      pointsDiff > 0
        ? ` but ${pointsDiff} more points needed`
        : pointsDiff < 0
          ? ` and ${Math.abs(pointsDiff)} fewer points needed`
          : "";
    return {
      type: "higher_success",
      summary: `${Math.round(successDiff * 100)}% higher success rate${caveat}.`,
    };
  }

  // Check points advantage (faster to draw)
  const pointsDiff =
    primary.pointsRequiredNonresident - candidate.pointsRequiredNonresident;
  if (pointsDiff > 0) {
    const trophyDiff = primary.trophyRating - candidate.trophyRating;
    const caveat =
      trophyDiff > 1
        ? ` but ${trophyDiff.toFixed(1)} lower trophy rating`
        : "";
    return {
      type: "fewer_points",
      summary: `${pointsDiff} fewer points to draw${caveat}.`,
    };
  }

  // Check pressure advantage
  const pressureRank: Record<string, number> = {
    Low: 0,
    Moderate: 1,
    High: 2,
  };
  const primaryPressure = pressureRank[primary.pressureLevel] ?? 1;
  const candidatePressure = pressureRank[candidate.pressureLevel] ?? 1;
  if (candidatePressure < primaryPressure) {
    return {
      type: "lower_pressure",
      summary: `${candidate.pressureLevel} pressure vs ${primary.pressureLevel} — less crowded experience.`,
    };
  }

  // Check terrain difference
  const terrainSim = terrainSimilarity(primary.terrainType, candidate.terrainType);
  if (terrainSim < 0.5) {
    const newTerrain = candidate.terrainType
      .filter((t) => !primary.terrainType.includes(t))
      .join(", ");
    return {
      type: "different_terrain",
      summary: `Different terrain (${newTerrain || candidate.terrainType.join(", ")}) for a change of scenery.`,
    };
  }

  // Fallback: pick the most notable difference
  if (successDiff > 0) {
    return {
      type: "higher_success",
      summary: `Slightly higher success rate (${Math.round(candidate.successRate * 100)}% vs ${Math.round(primary.successRate * 100)}%).`,
    };
  }

  return {
    type: "fewer_points",
    summary: `Similar unit with comparable draw requirements.`,
  };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Find 3-5 alternate units that offer meaningful tradeoffs vs. a primary unit.
 *
 * Prioritizes diversity of tradeoff types so the user sees a range of
 * options rather than 5 variations of the same advantage.
 *
 * @param primaryUnit - The unit the user is currently looking at
 * @param allUnits - Full pool of candidate units
 * @param maxResults - Maximum alternates to return (default 5)
 * @returns Alternate units with tradeoff summaries, sorted by tradeoff diversity
 */
export function findAlternateUnits(
  primaryUnit: Unit,
  allUnits: Unit[],
  maxResults: number = 5
): AlternateUnit[] {
  // 1. Filter to same species, exclude the primary unit itself
  const candidates = allUnits.filter(
    (u) => u.speciesId === primaryUnit.speciesId && u.id !== primaryUnit.id
  );

  if (candidates.length === 0) return [];

  // 2. Score each candidate for similarity + value
  const scored = candidates.map((candidate) => {
    let similarityScore = 0;

    // Same state bonus (more relevant for comparison)
    if (candidate.stateId === primaryUnit.stateId) {
      similarityScore += 3;
    }

    // Similar trophy rating (within 2 points)
    const trophyDiff = Math.abs(
      candidate.trophyRating - primaryUnit.trophyRating
    );
    if (trophyDiff <= 2) {
      similarityScore += 2;
    } else if (trophyDiff <= 4) {
      similarityScore += 1;
    }

    // Similar terrain
    const terrainSim = terrainSimilarity(
      primaryUnit.terrainType,
      candidate.terrainType
    );
    similarityScore += terrainSim * 2;

    // Determine the tradeoff
    const tradeoff = determineTradeoff(primaryUnit, candidate);

    return {
      candidate,
      similarityScore,
      tradeoff,
    };
  });

  // 3. Sort by similarity score descending (most relevant first)
  scored.sort((a, b) => b.similarityScore - a.similarityScore);

  // 4. Select results prioritizing diversity of tradeoff types
  const selected: AlternateUnit[] = [];
  const usedTypes = new Set<string>();

  // First pass: pick one of each tradeoff type (diversity)
  for (const item of scored) {
    if (selected.length >= maxResults) break;
    if (!usedTypes.has(item.tradeoff.type)) {
      usedTypes.add(item.tradeoff.type);
      selected.push({
        unit: item.candidate,
        tradeoffSummary: item.tradeoff.summary,
        tradeoffType: item.tradeoff.type,
      });
    }
  }

  // Second pass: fill remaining slots with best-scoring candidates
  for (const item of scored) {
    if (selected.length >= maxResults) break;
    if (selected.some((s) => s.unit.id === item.candidate.id)) continue;
    selected.push({
      unit: item.candidate,
      tradeoffSummary: item.tradeoff.summary,
      tradeoffType: item.tradeoff.type,
    });
  }

  return selected;
}
