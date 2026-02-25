/**
 * Portfolio Stress Engine — Fiduciary Logic Tests
 *
 * Five adversarial stress-test modules for the strategy engine:
 *   1. Cascading Prune (hierarchical asset liquidation on budget cuts)
 *   2. Intra-Year Liquidity Bottleneck (monthly cash-flow overlap)
 *   3. F&G Inactivity Purge (use-it-or-lose-it point deletion)
 *   4. Post-Draw Reset & Recalculation (success event cascading)
 *   5. Fractional Averaging in Group Draws (state-specific rounding)
 */

import type {
  StrategicAssessment,
  RoadmapYear,
  RoadmapAction,
  PointSystemType,
} from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";

// ============================================================================
// 1. CASCADING PRUNE — Hierarchical Asset Liquidation
// ============================================================================

export interface PortfolioAsset {
  stateId: string;
  speciesId: string;
  currentPoints: number;
  annualCost: number;            // Cost to maintain this position per year
  sunkCost: number;              // Total historical investment (points × cost/yr)
  drawType: "preference" | "lottery" | "bonus";
  estimatedDrawYear: number;     // Absolute year of expected draw
  isCloseToBurn: boolean;        // Within 2 years of burn
}

export interface PruneResult {
  kept: PortfolioAsset[];
  pruned: PortfolioAsset[];
  totalSaved: number;
  reasoning: string[];
}

/**
 * Asset Preservation Hierarchy:
 *
 *   Priority 1 (NEVER prune): Assets within 2 years of burn
 *   Priority 2 (Preserve):    Preference-point assets with high sunk cost
 *   Priority 3 (Trim first):  Lottery/random draws with zero equity
 *   Priority 4 (Drop first):  Highest annual cost with lowest equity
 *
 * When budget is slashed, this function determines which positions to
 * liquidate in order, preserving the most valuable invested positions.
 */
export function cascadingPrune(
  assets: PortfolioAsset[],
  newBudget: number,
): PruneResult {
  const reasoning: string[] = [];

  // Score each asset: higher = more worth keeping
  const scored = assets.map((asset) => {
    let preservationScore = 0;

    // 1. Close-to-burn assets are nearly untouchable (1000+ points)
    if (asset.isCloseToBurn) {
      preservationScore += 1000;
      reasoning.push(
        `${asset.stateId} ${asset.speciesId}: PROTECTED — within 2 years of burn year`,
      );
    }

    // 2. Sunk cost: every dollar invested raises the floor
    preservationScore += asset.sunkCost * 0.5;

    // 3. Preference points have compounding equity; lottery draws don't
    if (asset.drawType === "preference") {
      preservationScore += asset.currentPoints * 50;
    } else if (asset.drawType === "bonus") {
      preservationScore += asset.currentPoints * 20;
    }
    // Lottery draws get zero equity bonus — they're pure coin flips

    // 4. Efficiency ratio: how cheap is this to maintain per point of value?
    const efficiency =
      asset.annualCost > 0 ? asset.sunkCost / asset.annualCost : 0;
    preservationScore += efficiency * 10;

    return { asset, preservationScore };
  });

  // Sort by preservation score ascending → lowest-value assets first (pruned first)
  scored.sort((a, b) => a.preservationScore - b.preservationScore);

  const kept: PortfolioAsset[] = [];
  const pruned: PortfolioAsset[] = [];
  let remainingBudget = newBudget;

  // Greedily fill from highest-preservation assets down
  // Reverse iterate: highest score first gets budget allocation
  const reversed = [...scored].reverse();
  for (const item of reversed) {
    if (remainingBudget >= item.asset.annualCost) {
      kept.push(item.asset);
      remainingBudget -= item.asset.annualCost;
    } else {
      pruned.push(item.asset);
      reasoning.push(
        `PRUNED: ${item.asset.stateId} ${item.asset.speciesId} (${item.asset.drawType}, ${item.asset.currentPoints} pts, $${item.asset.annualCost}/yr) — insufficient budget`,
      );
    }
  }

  return {
    kept,
    pruned,
    totalSaved: assets.reduce((s, a) => s + a.annualCost, 0) - newBudget + remainingBudget,
    reasoning,
  };
}

// ============================================================================
// 2. INTRA-YEAR LIQUIDITY BOTTLENECK — Monthly Cash Flow Overlap
// ============================================================================

export interface FloatEvent {
  stateId: string;
  speciesId: string;
  amount: number;                    // $ amount floated
  floatStartDate: string;           // ISO date when $ leaves (application deadline)
  floatEndDate: string;             // ISO date when $ returns (refund date)
  isRefundable: boolean;
}

export interface LiquidityBottleneck {
  peakDate: string;                  // Date of maximum float exposure
  peakAmount: number;                // Maximum $ floated simultaneously
  floatLimit: number;                // User's stated tolerance
  deficit: number;                   // Amount over limit (0 = no issue)
  overlappingEvents: FloatEvent[];   // Events active during peak
  severity: "ok" | "warning" | "critical";
}

/**
 * Scans a set of float events to find the peak monthly cash-flow exposure.
 * The key insight: just because annual totals fit the budget doesn't mean
 * there isn't a 2-week window where all deadlines overlap.
 */
export function detectLiquidityBottleneck(
  events: FloatEvent[],
  floatLimit: number,
): LiquidityBottleneck {
  if (events.length === 0) {
    return {
      peakDate: "",
      peakAmount: 0,
      floatLimit,
      deficit: 0,
      overlappingEvents: [],
      severity: "ok",
    };
  }

  // Build a timeline of all "boundary" dates
  const boundaries = new Set<string>();
  for (const ev of events) {
    boundaries.add(ev.floatStartDate);
    boundaries.add(ev.floatEndDate);
  }

  const sortedDates = [...boundaries].sort();

  let peakDate = "";
  let peakAmount = 0;
  let peakEvents: FloatEvent[] = [];

  for (const date of sortedDates) {
    // Find all events where this date is within [start, end)
    const active = events.filter((ev) => {
      return ev.floatStartDate <= date && date < ev.floatEndDate;
    });

    const totalFloat = active.reduce((sum, ev) => sum + ev.amount, 0);

    if (totalFloat > peakAmount) {
      peakAmount = totalFloat;
      peakDate = date;
      peakEvents = active;
    }
  }

  const deficit = Math.max(0, peakAmount - floatLimit);

  return {
    peakDate,
    peakAmount,
    floatLimit,
    deficit,
    overlappingEvents: peakEvents,
    severity: deficit === 0 ? "ok" : deficit > floatLimit * 0.25 ? "critical" : "warning",
  };
}

// ============================================================================
// 3. F&G INACTIVITY PURGE — "Use It or Lose It" Point Deletion
// ============================================================================

/**
 * State-specific point purge rules.
 * Key: stateId → years of inactivity before points are permanently deleted.
 *
 * Sources:
 * - WY: Points expire after missing 2 consecutive years of applying
 * - CO: Points expire after 10 consecutive years of not applying
 * - MT: No expiration (preference/bonus points don't expire)
 * - AZ: No expiration
 * - NV: Must apply or buy points annually or lose all points
 * - UT: Must apply or buy points annually or lose all points
 * - ID: Random draw, no point accumulation (N/A)
 * - NM: Random draw, no point accumulation (N/A)
 * - OR: Must apply or buy points annually or lose all points
 * - KS: Must apply annually for NR deer or lose points
 */
export const POINT_PURGE_RULES: Record<
  string,
  { maxInactiveYears: number; description: string } | null
> = {
  CO: { maxInactiveYears: 10, description: "Colorado deletes all preference points after 10 consecutive years of not applying." },
  WY: { maxInactiveYears: 2, description: "Wyoming deletes all preference points after missing 2 consecutive application cycles." },
  MT: null, // No expiration
  AZ: null, // No expiration
  NV: { maxInactiveYears: 1, description: "Nevada deletes all bonus points if you fail to apply or buy points in any single year." },
  UT: { maxInactiveYears: 1, description: "Utah deletes all bonus/preference points if you fail to apply or buy points in any single year." },
  OR: { maxInactiveYears: 1, description: "Oregon deletes all preference points if you don't apply or buy points annually." },
  KS: { maxInactiveYears: 1, description: "Kansas deletes NR deer preference points if you don't apply annually." },
  ID: null, // Pure lottery, no points
  NM: null, // Pure lottery, no points
  AK: null, // No point system
};

export interface InactivityPurgeAlert {
  stateId: string;
  speciesId: string;
  currentPoints: number;
  sunkValue: number;                 // $ value of points that would be lost
  consecutiveSkipYears: number;      // How many years skipped so far in the plan
  maxAllowed: number;                // From POINT_PURGE_RULES
  yearOfPurge: number | null;        // Year when points will be deleted (null = safe)
  severity: "critical" | "warning" | "info";
  message: string;
}

/**
 * Scans a roadmap for gaps where a user stops applying/buying points in a state,
 * then checks if that gap exceeds the state's purge threshold.
 *
 * Returns alerts for each state/species combo at risk of point deletion.
 */
export function detectInactivityPurges(
  roadmap: RoadmapYear[],
  existingPoints: Record<string, Record<string, number>>,
  annualPointCosts: Record<string, Record<string, number>>,
): InactivityPurgeAlert[] {
  const alerts: InactivityPurgeAlert[] = [];
  const currentYear = roadmap[0]?.year ?? new Date().getFullYear();
  const maxYear = roadmap[roadmap.length - 1]?.year ?? currentYear + 10;

  for (const [stateId, speciesMap] of Object.entries(existingPoints)) {
    const rule = POINT_PURGE_RULES[stateId];
    if (!rule) continue; // No purge rule for this state

    for (const [speciesId, points] of Object.entries(speciesMap)) {
      if (points <= 0) continue;

      // Find all years with activity for this state+species
      const activeYears = new Set<number>();
      for (const yr of roadmap) {
        for (const action of yr.actions) {
          if (
            action.stateId === stateId &&
            action.speciesId === speciesId &&
            (action.type === "apply" || action.type === "buy_points" || action.type === "hunt")
          ) {
            activeYears.add(yr.year);
          }
        }
      }

      // Walk year by year and count consecutive gaps
      let consecutiveSkips = 0;
      let purgeYear: number | null = null;

      for (let year = currentYear; year <= maxYear; year++) {
        if (activeYears.has(year)) {
          consecutiveSkips = 0;
        } else {
          consecutiveSkips++;
          if (consecutiveSkips >= rule.maxInactiveYears) {
            purgeYear = year;
            break;
          }
        }
      }

      const annualCost = annualPointCosts[stateId]?.[speciesId] ?? 0;
      const sunkValue = points * annualCost;

      if (purgeYear !== null) {
        // Points WILL be purged
        alerts.push({
          stateId,
          speciesId,
          currentPoints: points,
          sunkValue,
          consecutiveSkipYears: rule.maxInactiveYears,
          maxAllowed: rule.maxInactiveYears,
          yearOfPurge: purgeYear,
          severity: "critical",
          message:
            `Point Deletion Imminent: Skipping ${stateId} for ${rule.maxInactiveYears} consecutive years will permanently delete ${points} preference points (Sunk Value: $${sunkValue}). Points will be purged in ${purgeYear}.`,
        });
      } else if (consecutiveSkips > 0 && consecutiveSkips >= rule.maxInactiveYears - 1) {
        // One year away from purge
        alerts.push({
          stateId,
          speciesId,
          currentPoints: points,
          sunkValue,
          consecutiveSkipYears: consecutiveSkips,
          maxAllowed: rule.maxInactiveYears,
          yearOfPurge: null,
          severity: "warning",
          message:
            `Point Abandonment Risk: You have ${points} points in ${stateId} ${speciesId} and are ${rule.maxInactiveYears - consecutiveSkips} year(s) from the inactivity purge threshold.`,
        });
      }
    }
  }

  return alerts;
}

// ============================================================================
// 4. POST-DRAW RESET — Success Event Cascading
// ============================================================================

/**
 * Waiting period rules after drawing a premium/OIL tag.
 * Some states ban re-application for 3-5 years after drawing a
 * once-in-a-lifetime (OIL) species.
 */
export const WAITING_PERIOD_RULES: Record<
  string,
  { oilSpecies: string[]; waitingYears: number; description: string }
> = {
  CO: {
    oilSpecies: ["moose", "bighorn_sheep", "mountain_goat"],
    waitingYears: 5,
    description: "Colorado bans re-application for moose/sheep/goat for 5 years after drawing.",
  },
  WY: {
    oilSpecies: ["moose", "bighorn_sheep", "mountain_goat", "bison"],
    waitingYears: 3,
    description: "Wyoming enforces a 3-year waiting period after drawing moose/sheep/goat/bison.",
  },
  MT: {
    oilSpecies: ["moose", "bighorn_sheep", "mountain_goat"],
    waitingYears: 7,
    description: "Montana enforces a 7-year waiting period after drawing moose/sheep/goat.",
  },
  ID: {
    oilSpecies: ["moose", "bighorn_sheep", "mountain_goat"],
    waitingYears: 0, // Idaho: once-in-a-lifetime means literally once
    description: "Idaho once-in-a-lifetime tags are permanent — you can never draw again for that species.",
  },
  AZ: {
    oilSpecies: ["bighorn_sheep", "bison"],
    waitingYears: 0,
    description: "Arizona once-in-a-lifetime: you are permanently ineligible after drawing.",
  },
};

export interface PostDrawReset {
  stateId: string;
  speciesId: string;
  drawYear: number;
  pointsZeroed: number;             // Points reset to 0
  waitingPeriodYears: number;        // 0 = no restriction, N = banned for N years
  nextEligibleYear: number | null;   // Year they can re-apply (null = permanently banned)
  newHorizonStart: number;           // Year to start new point accumulation
  affectedRoadmapYears: number[];    // Years that need recalculation
  isOnceInALifetime: boolean;        // Permanently banned from re-application
}

/**
 * When a user draws a tag, compute the cascading effects:
 *   1. Zero out point balance for that state/species for next year
 *   2. Check for waiting period rules (OIL species)
 *   3. Compute the new target horizon from 0 points
 */
export function computePostDrawReset(
  stateId: string,
  speciesId: string,
  drawYear: number,
  currentPoints: number,
  roadmap: RoadmapYear[],
): PostDrawReset {
  const waitRule = WAITING_PERIOD_RULES[stateId];
  const isOIL = waitRule?.oilSpecies.includes(speciesId) ?? false;
  const waitYears = isOIL ? waitRule!.waitingYears : 0;
  const isPermanent = isOIL && waitYears === 0;

  const nextEligible = isPermanent ? null : drawYear + 1 + waitYears;
  const newHorizonStart = nextEligible ?? drawYear + 100; // Effectively never

  // Find all roadmap years after draw that have actions for this state/species
  const affectedYears = roadmap
    .filter(
      (yr) =>
        yr.year > drawYear &&
        yr.actions.some(
          (a) => a.stateId === stateId && a.speciesId === speciesId,
        ),
    )
    .map((yr) => yr.year);

  return {
    stateId,
    speciesId,
    drawYear,
    pointsZeroed: currentPoints,
    waitingPeriodYears: isPermanent ? Infinity : waitYears,
    nextEligibleYear: nextEligible,
    newHorizonStart,
    affectedRoadmapYears: affectedYears,
    isOnceInALifetime: isPermanent,
  };
}

// ============================================================================
// 5. FRACTIONAL AVERAGING — State-Specific Group Draw Rounding
// ============================================================================

/**
 * State-specific rounding rules for party (group) applications.
 *
 * When a party of hunters apply together, their point totals are averaged.
 * But HOW the average is used varies dramatically by state:
 *
 * - Colorado: FLOOR (rounds down to nearest integer)
 * - Wyoming: EXACT DECIMAL (uses fractional points)
 * - Montana: FLOOR (rounds down)
 * - Nevada: EXACT (squared after averaging)
 * - Arizona: FLOOR (rounds down)
 * - Oregon: FLOOR (rounds down)
 * - Utah: FLOOR (rounds down)
 */
export type GroupRoundingMethod = "floor" | "exact" | "ceiling" | "round";

export const GROUP_DRAW_ROUNDING: Record<string, GroupRoundingMethod> = {
  CO: "floor",
  WY: "exact",
  MT: "floor",
  NV: "exact",   // NV squares the averaged value
  AZ: "floor",
  OR: "floor",
  UT: "floor",
  ID: "exact",   // Random draw, but group apps use exact average for tiebreakers
  NM: "exact",   // Random, but exact average used for preference in outfitter pool
  KS: "floor",
};

export interface GroupDrawResult {
  stateId: string;
  speciesId: string;
  partyPoints: number[];              // Individual member point totals
  rawAverage: number;                 // Arithmetic mean
  effectivePoints: number;            // After state-specific rounding
  roundingMethod: GroupRoundingMethod;
  pointLoss: number;                  // rawAverage - effectivePoints (rounding cost)
  warning: string | null;             // Alert if rounding significantly hurts odds
}

/**
 * Compute effective group draw points for a party application.
 * The key fiduciary check: CO treating 3.5 as 3 (floor) vs WY treating 3.5 as 3.5 (exact).
 *
 * If computeMonteCarloOdds receives 3.5 for CO, it's producing a falsely elevated probability.
 */
export function computeGroupDrawPoints(
  stateId: string,
  speciesId: string,
  partyPoints: number[],
): GroupDrawResult {
  if (partyPoints.length === 0) {
    return {
      stateId,
      speciesId,
      partyPoints: [],
      rawAverage: 0,
      effectivePoints: 0,
      roundingMethod: "floor",
      pointLoss: 0,
      warning: null,
    };
  }

  const rawAverage =
    partyPoints.reduce((sum, pts) => sum + pts, 0) / partyPoints.length;

  const method = GROUP_DRAW_ROUNDING[stateId] ?? "floor";

  let effectivePoints: number;
  switch (method) {
    case "floor":
      effectivePoints = Math.floor(rawAverage);
      break;
    case "ceiling":
      effectivePoints = Math.ceil(rawAverage);
      break;
    case "round":
      effectivePoints = Math.round(rawAverage);
      break;
    case "exact":
      effectivePoints = rawAverage;
      break;
    default:
      effectivePoints = Math.floor(rawAverage);
  }

  const pointLoss = rawAverage - effectivePoints;

  let warning: string | null = null;
  if (pointLoss >= 0.5) {
    warning = `Group rounding in ${stateId} costs ${pointLoss.toFixed(1)} effective points. ` +
      `${stateId} uses ${method} rounding — your party average of ${rawAverage.toFixed(1)} ` +
      `becomes ${effectivePoints} effective points.`;
  }

  return {
    stateId,
    speciesId,
    partyPoints,
    rawAverage,
    effectivePoints,
    roundingMethod: method,
    pointLoss,
    warning,
  };
}
