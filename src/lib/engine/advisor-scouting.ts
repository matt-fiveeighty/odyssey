/**
 * Advisor Scouting Sub-Generator
 *
 * Produces advisor insights for scouting opportunities. 8th sub-generator
 * in the advisor pipeline.
 *
 * Phase 10: Scouting Strategy
 */

import type { AdvisorInsight, StrategicAssessment } from "@/lib/types";
import type { ScoutingOpportunity } from "@/lib/engine/scouting-engine";
import { STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName } from "@/lib/utils";

/**
 * Generate scouting-specific advisor insights.
 * Cap at 2 insights (most compelling first).
 */
export function generateScoutingInsights(
  _assessment: StrategicAssessment,
  scoutingOpps: ScoutingOpportunity[],
): AdvisorInsight[] {
  if (scoutingOpps.length === 0) return [];

  const sorted = [...scoutingOpps].sort((a, b) => b.totalScore - a.totalScore);

  return sorted.slice(0, 2).map((opp) => {
    const scoutState = STATES_MAP[opp.scoutUnit.stateId]?.abbreviation ?? opp.scoutUnit.stateId;
    const targetState = STATES_MAP[opp.targetUnit.stateId]?.abbreviation ?? opp.targetUnit.stateId;
    const scoutSpecies = formatSpeciesName(opp.scoutUnit.speciesId);
    const targetSpecies = formatSpeciesName(opp.targetUnit.speciesId);

    const drawAccessLabel = opp.scoutUnit.pointsRequiredNonresident === 0 ? "OTC" : "high-odds";
    const terrainContext = opp.terrainOverlap.length > 0
      ? `Same terrain (${opp.terrainOverlap.join(", ")})`
      : "Nearby hunting";

    return {
      id: `scouting-${opp.scoutUnit.stateId.toLowerCase()}-${opp.scoutUnit.speciesId}`,
      signal: {
        type: "positive" as const,
        message: `Scouting move: ${scoutState} ${scoutSpecies}`,
      },
      category: "scouting" as const,
      urgency: "informational" as const,
      interpretation: `While you build ${opp.targetYearsAway} more years toward ${targetState} Unit ${opp.targetUnit.unitCode}, hunt ${scoutState} Unit ${opp.scoutUnit.unitCode} for scouting intel. ${opp.strategicReason}`,
      recommendation: `Apply for the ${drawAccessLabel} ${scoutState} ${scoutSpecies} tag. ${terrainContext}, fraction of the wait.`,
      cta: { label: "View Scouting Move", href: "/plan-builder" },
      portfolioContext: `Your ${targetState} ${targetSpecies} is ${opp.targetYearsAway} years away`,
    };
  });
}
