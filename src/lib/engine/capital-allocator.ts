/**
 * Capital Allocator — Master Allocator Blueprint
 *
 * Classifies every dollar in the portfolio by its liquidity state:
 *   - Sunk Capital: Non-refundable (app fees, preference points, qualifying licenses)
 *   - Floated Capital: Money tied up but refundable if unsuccessful (e.g., NM/ID upfront tag fees)
 *   - Contingent Capital: Tag costs IF drawn (not yet committed)
 *
 * Also generates the Burn Rate Matrix and annual Status Ticker.
 */

import type {
  StrategicAssessment,
  CapitalSummary,
  ClassifiedFee,
  CapitalType,
  BurnRateEntry,
  YearStatusTicker,
  AnnualStatusEntry,
  AnnualStatusTag,
  PointSystemType,
  RoadmapYear,
  State,
} from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { resolveFees } from "./fee-resolver";
import { computePCV, estimatePCV, computeTTD } from "./point-creep";
import { computeMonteCarloOdds, classifyDrawType, isLotteryPlay } from "./draw-odds";

// ============================================================================
// Fee Refund Policies — which states refund upfront tag fees on unsuccessful draw
// ============================================================================

/**
 * States that require upfront tag fees with full/partial refund if not drawn.
 * Source: Individual state F&G regulations.
 */
const REFUNDABLE_TAG_STATES: Set<string> = new Set([
  "NM", // NM refunds tag fee if not drawn
  "ID", // ID refunds tag fee if not drawn
]);

/**
 * Classify a fee item by its capital type based on state refund policy.
 */
function classifyFee(
  label: string,
  amount: number,
  stateId: string,
  speciesId: string | undefined,
  category: "license" | "application" | "points" | "tag" | "travel",
): ClassifiedFee {
  let capitalType: CapitalType;
  let refundPolicy: string | undefined;

  switch (category) {
    case "license":
    case "application":
    case "points":
      // These are always non-refundable
      capitalType = "sunk";
      refundPolicy = "Non-refundable";
      break;
    case "tag":
      if (REFUNDABLE_TAG_STATES.has(stateId)) {
        capitalType = "floated";
        refundPolicy = "Full refund if not drawn";
      } else {
        // Most states don't charge tag fees until drawn — these are contingent
        capitalType = "contingent";
        refundPolicy = "Only charged if drawn";
      }
      break;
    case "travel":
      capitalType = "contingent";
      refundPolicy = "Trip cost — only if hunting";
      break;
    default:
      capitalType = "sunk";
  }

  return { label, amount, stateId, speciesId, capitalType, refundPolicy };
}

// ============================================================================
// Capital Summary — classify all fees in the portfolio
// ============================================================================

/**
 * Compute the full capital summary for a strategic assessment.
 * Walks through every year's actions and classifies each cost item.
 */
export function computeCapitalSummary(
  assessment: StrategicAssessment,
  homeState: string = "",
): CapitalSummary {
  const classifiedFees: ClassifiedFee[] = [];
  const byStateMap = new Map<string, { sunk: number; floated: number; contingent: number }>();

  for (const yr of assessment.roadmap) {
    for (const action of yr.actions) {
      for (const cost of action.costs) {
        const classified = classifyFee(
          cost.label,
          cost.amount,
          cost.stateId,
          cost.speciesId,
          cost.category,
        );
        classifiedFees.push(classified);

        // Accumulate by state
        if (!byStateMap.has(cost.stateId)) {
          byStateMap.set(cost.stateId, { sunk: 0, floated: 0, contingent: 0 });
        }
        const entry = byStateMap.get(cost.stateId)!;
        entry[classified.capitalType] += cost.amount;
      }
    }
  }

  const sunkCapital = classifiedFees
    .filter((f) => f.capitalType === "sunk")
    .reduce((s, f) => s + f.amount, 0);
  const floatedCapital = classifiedFees
    .filter((f) => f.capitalType === "floated")
    .reduce((s, f) => s + f.amount, 0);
  const contingentCapital = classifiedFees
    .filter((f) => f.capitalType === "contingent")
    .reduce((s, f) => s + f.amount, 0);

  return {
    sunkCapital: Math.round(sunkCapital),
    floatedCapital: Math.round(floatedCapital),
    contingentCapital: Math.round(contingentCapital),
    totalDeployed: Math.round(sunkCapital + floatedCapital),
    totalExposure: Math.round(sunkCapital + floatedCapital + contingentCapital),
    byState: [...byStateMap.entries()].map(([stateId, v]) => ({
      stateId,
      sunk: Math.round(v.sunk),
      floated: Math.round(v.floated),
      contingent: Math.round(v.contingent),
    })),
    classifiedFees,
  };
}

// ============================================================================
// Burn Rate Matrix — per state/species point position snapshot
// ============================================================================

/**
 * Build the burn rate matrix: for each state+species the user is invested in,
 * show current points, required points, PCV, and ETA.
 */
export function computeBurnRateMatrix(
  assessment: StrategicAssessment,
  existingPoints: Record<string, Record<string, number>>,
): BurnRateEntry[] {
  const entries: BurnRateEntry[] = [];
  const currentYear = new Date().getFullYear();

  for (const rec of assessment.stateRecommendations) {
    const state = STATES_MAP[rec.stateId];
    if (!state) continue;

    const drawType = classifyDrawType(state.pointSystem);

    for (const unit of rec.bestUnits) {
      const speciesIds = [...new Set(
        assessment.roadmap.flatMap((yr) =>
          yr.actions
            .filter((a) => a.stateId === rec.stateId)
            .map((a) => a.speciesId)
        )
      )];

      for (const speciesId of speciesIds) {
        const userPoints = existingPoints[rec.stateId]?.[speciesId] ?? 0;
        const requiredPoints = unit.drawYears; // Best proxy for points needed

        // Use estimated PCV (no historical data array available at this level)
        const pcvResult = estimatePCV(unit.trophyRating);

        // Calculate TTD
        const ttdResult = computeTTD(userPoints, requiredPoints, pcvResult.pcv);

        // For lottery states, compute cumulative odds
        let cumulativeOdds: number | undefined;
        if (drawType === "lottery" && unit.successRate > 0) {
          // Use success rate as proxy for single-year odds
          const odds = Math.min(unit.successRate / 100, 0.5);
          const mc = computeMonteCarloOdds(odds, 10);
          cumulativeOdds = mc.cumulativeOdds;
        }

        entries.push({
          stateId: rec.stateId,
          speciesId,
          currentPoints: userPoints,
          requiredPoints,
          pcv: pcvResult.pcv,
          pcvTrend: pcvResult.trend,
          etaYear: ttdResult.targetYear === Infinity ? currentYear + 30 : ttdResult.targetYear,
          isDeadAsset: pcvResult.isDeadAsset,
          drawType,
          cumulativeOdds,
        });

        break; // One entry per species per state (use best unit)
      }
    }
  }

  // Deduplicate by stateId+speciesId
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${e.stateId}:${e.speciesId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================================
// Status Ticker — annual status classification
// ============================================================================

/**
 * Classify each state's role in a given year into a status tag.
 *
 * BUILD: Buying points, no hunt expected
 * LOTTERY: Pure random draw state (NM, ID)
 * DIVIDEND: OTC or high-odds opportunity (e.g., MT OTC elk)
 * BURN: Drawing down built-up points for a hunt
 * RECOVERY: Gap year after a big hunt spend
 */
export function computeStatusTicker(
  roadmap: RoadmapYear[],
): YearStatusTicker[] {
  const tickers: YearStatusTicker[] = [];

  for (const yr of roadmap) {
    const entries: AnnualStatusEntry[] = [];

    for (const action of yr.actions) {
      const state = STATES_MAP[action.stateId];
      if (!state) continue;

      let tag: AnnualStatusTag;
      const abbr = state.abbreviation;

      if (action.type === "hunt") {
        // Is this an OTC/high-odds state?
        const isOTC = action.estimatedDrawOdds !== undefined && action.estimatedDrawOdds > 0.8;
        tag = isOTC ? "dividend" : "burn";
      } else if (action.type === "buy_points") {
        if (isLotteryPlay(state.pointSystem)) {
          tag = "lottery";
        } else {
          tag = "build";
        }
      } else if (action.type === "apply") {
        if (isLotteryPlay(state.pointSystem)) {
          tag = "lottery";
        } else {
          tag = "build";
        }
      } else {
        tag = "build";
      }

      entries.push({
        stateId: action.stateId,
        tag,
        label: abbr,
      });
    }

    // Deduplicate: one entry per state (prefer hunt > apply > buy_points)
    const deduped = new Map<string, AnnualStatusEntry>();
    const priority: Record<AnnualStatusTag, number> = { burn: 4, dividend: 3, lottery: 2, build: 1, recovery: 0 };
    for (const e of entries) {
      const existing = deduped.get(e.stateId);
      if (!existing || priority[e.tag] > priority[existing.tag]) {
        deduped.set(e.stateId, e);
      }
    }

    const dedupedEntries = [...deduped.values()];

    // Build summary string: "BUILD (WY, CO) + LOTTERY (NM) + DIVIDEND (MT OTC)"
    const grouped: Record<string, string[]> = {};
    for (const e of dedupedEntries) {
      if (!grouped[e.tag]) grouped[e.tag] = [];
      grouped[e.tag].push(e.label);
    }

    const summaryParts: string[] = [];
    const tagOrder: AnnualStatusTag[] = ["burn", "dividend", "lottery", "build", "recovery"];
    for (const t of tagOrder) {
      if (grouped[t]?.length) {
        summaryParts.push(`${t.toUpperCase()} (${grouped[t].join(", ")})`);
      }
    }

    tickers.push({
      year: yr.year,
      entries: dedupedEntries,
      summary: summaryParts.join(" + ") || "—",
    });
  }

  return tickers;
}
