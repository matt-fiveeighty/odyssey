/**
 * LLM Prompt Templates
 *
 * Each template:
 * - Passes only structured data (never raw user content)
 * - Instructs the model to reference only provided data
 * - Produces a specific output format
 */

import type { Unit } from "@/lib/types";

interface DrawHistoryEntry {
  year: number;
  applicants: number;
  tags: number;
  odds: number;
  minPointsDrawn: number | null;
}

interface UnitScoreFactor {
  label: string;
  score: number;
  maxScore: number;
  explanation: string;
}

/**
 * Explain a unit to a user — personalized "why this unit for you" narrative.
 */
export function buildExplainUnitPrompt(
  unit: Unit,
  drawHistory: DrawHistoryEntry[],
  scoreFactors: UnitScoreFactor[],
  userContext: {
    experienceLevel?: string;
    huntStyle?: string;
    existingPoints?: number;
  }
): string {
  return `Explain why the following hunt unit would be a good fit for this hunter. Reference ONLY the data provided below.

UNIT DATA:
- Unit: ${unit.unitCode} "${unit.unitName}" in ${unit.stateId}
- Species: ${unit.speciesId}
- Success Rate: ${Math.round(unit.successRate * 100)}%
- Trophy Rating: ${unit.trophyRating}/10
- Points Required (NR): ${unit.pointsRequiredNonresident}
- Terrain: ${unit.terrainType.join(", ")}
- Pressure: ${unit.pressureLevel}
- Public Land: ${Math.round(unit.publicLandPct * 100)}%
- Elevation: ${unit.elevationRange[0]}-${unit.elevationRange[1]} ft

${drawHistory.length > 0 ? `DRAW HISTORY (last ${drawHistory.length} years):\n${drawHistory.map((d) => `- ${d.year}: ${d.applicants} applicants, ${d.tags} tags, ${Math.round(d.odds * 100)}% odds${d.minPointsDrawn !== null ? `, min ${d.minPointsDrawn} pts` : ""}`).join("\n")}` : ""}

SCORING BREAKDOWN:
${scoreFactors.map((f) => `- ${f.label}: ${f.score}/${f.maxScore} — ${f.explanation}`).join("\n")}

HUNTER PROFILE:
- Experience: ${userContext.experienceLevel ?? "Unknown"}
- Hunt Style: ${userContext.huntStyle ?? "Unknown"}
- Existing Points: ${userContext.existingPoints ?? 0}

Write 2-3 short paragraphs explaining why this unit fits this hunter. Be specific with numbers from the data above.`;
}

/**
 * Compare a primary unit to an alternate — tradeoff narrative.
 */
export function buildTradeoffPrompt(
  primaryUnit: Unit,
  alternateUnit: Unit,
  tradeoffType: string,
  tradeoffSummary: string
): string {
  return `Compare these two hunt units and explain the tradeoff. Reference ONLY the data provided.

PRIMARY UNIT:
- ${primaryUnit.unitCode} "${primaryUnit.unitName}" in ${primaryUnit.stateId}
- Success: ${Math.round(primaryUnit.successRate * 100)}% | Trophy: ${primaryUnit.trophyRating}/10
- Points: ${primaryUnit.pointsRequiredNonresident} NR | Pressure: ${primaryUnit.pressureLevel}
- Public Land: ${Math.round(primaryUnit.publicLandPct * 100)}% | Terrain: ${primaryUnit.terrainType.join(", ")}

ALTERNATE UNIT:
- ${alternateUnit.unitCode} "${alternateUnit.unitName}" in ${alternateUnit.stateId}
- Success: ${Math.round(alternateUnit.successRate * 100)}% | Trophy: ${alternateUnit.trophyRating}/10
- Points: ${alternateUnit.pointsRequiredNonresident} NR | Pressure: ${alternateUnit.pressureLevel}
- Public Land: ${Math.round(alternateUnit.publicLandPct * 100)}% | Terrain: ${alternateUnit.terrainType.join(", ")}

TRADEOFF TYPE: ${tradeoffType}
SUMMARY: ${tradeoffSummary}

Write 1-2 short paragraphs comparing these units. Focus on what the hunter gains and gives up by choosing the alternate. Be concrete with numbers.`;
}

/**
 * Generate a plan narrative — season coaching summary.
 */
export function buildPlanNarrativePrompt(
  planItems: Array<{
    type: string;
    title: string;
    month: number;
    stateId?: string;
    speciesId?: string;
  }>,
  year: number
): string {
  const itemList = planItems
    .map(
      (item) =>
        `- [${item.type}] ${item.title} (Month ${item.month})${item.stateId ? ` in ${item.stateId}` : ""}`
    )
    .join("\n");

  return `Write a brief season coaching summary for this hunter's ${year} plan. Reference ONLY the items listed.

PLAN ITEMS:
${itemList}

Write 2-3 paragraphs covering: what this year looks like overall, key preparation milestones, and a direct summary of what to prioritize. Be specific about timing and activities from the plan. Use a calm, direct tone — no hype or romance.`;
}

/**
 * Summarize a goal's strategy.
 */
export function buildGoalSummaryPrompt(
  goal: {
    stateId: string;
    speciesId: string;
    targetYear?: number;
    notes?: string;
  },
  suggestedUnit: Unit,
  yearsToUnlock: number,
  currentPoints: number
): string {
  return `Write a brief strategy summary for achieving this hunting goal. Reference ONLY the data provided.

GOAL:
- State: ${goal.stateId} | Species: ${goal.speciesId}
- Target Year: ${goal.targetYear ?? "Flexible"}
- Notes: ${goal.notes ?? "None"}
- Current Points: ${currentPoints}

SUGGESTED UNIT:
- ${suggestedUnit.unitCode} "${suggestedUnit.unitName}"
- Success: ${Math.round(suggestedUnit.successRate * 100)}% | Trophy: ${suggestedUnit.trophyRating}/10
- Points Required: ${suggestedUnit.pointsRequiredNonresident} NR
- Est. Years to Unlock: ${yearsToUnlock}

Write 1-2 paragraphs outlining the strategy: when to expect to draw, what to do in the meantime, and why this unit is the right target. Be specific with numbers. Use a calm, direct tone.`;
}
