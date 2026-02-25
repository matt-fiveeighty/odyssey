/**
 * Grandfather Clause Engine — Regulatory Epoch Protection
 *
 * States do not always apply new rules to everyone. They often
 * "grandfather" in old applicants. Wyoming is currently debating
 * overhauling their preference point system, but hunters who
 * already hold points will likely be treated differently.
 *
 * This module ensures F&G points are Timestamped Assets, not
 * just integers. Every point carries its acquisition year, enabling
 * rules like: "IF wy_elk_pts.acquired_date < 2026 THEN apply_legacy_rules()"
 *
 * Architecture:
 *   1. Points are stored as TimestampedPoint[] (not a bare integer)
 *   2. Regulatory epochs define when rule changes take effect
 *   3. The engine can route logic based on point acquisition date
 *   4. Legacy vs. modern rules can coexist for the same state/species
 *   5. Transition rules handle partial grandfathering (some points legacy, some modern)
 */

import type { PointAcquisitionRecord } from "./schema-migration";

// ============================================================================
// Timestamped Point Asset
// ============================================================================

export interface TimestampedPoint {
  /** Year this individual point was acquired */
  acquiredYear: number;
  /** How it was acquired */
  method: "application" | "purchase" | "bonus" | "unknown";
}

// ============================================================================
// Regulatory Epoch System
// ============================================================================

export interface RegulatoryEpoch {
  /** Unique ID for this epoch */
  id: string;
  /** State this applies to */
  stateId: string;
  /** Species this applies to (null = all species in state) */
  speciesId: string | null;
  /** Year this regulation took effect */
  effectiveYear: number;
  /** Human-readable description */
  description: string;
  /** Type of point system change */
  changeType: "preference_to_bonus" | "bonus_to_preference" | "random_introduced" | "fee_structure" | "waiting_period" | "point_cap" | "system_overhaul";
  /** How are existing point holders treated? */
  grandfatherRule: GrandfatherRule;
}

export interface GrandfatherRule {
  /** Are points acquired before the epoch grandfathered? */
  grandfathered: boolean;
  /** Cutoff date: points acquired before this year use legacy rules */
  cutoffYear: number;
  /** What happens to legacy points? */
  legacyTreatment: "full_value" | "reduced_value" | "converted" | "frozen";
  /** Conversion ratio if applicable (e.g., 1 preference point = 2 bonus points) */
  conversionRatio?: number;
  /** Max years the grandfather clause applies (null = permanent) */
  sunsetYears?: number | null;
  /** Additional rules text */
  notes: string;
}

// ============================================================================
// Known Regulatory Epochs
// ============================================================================

/**
 * Registry of known and hypothetical regulatory changes.
 * The engine references this during roadmap generation to apply
 * the correct rules based on the user's point acquisition dates.
 */
export const REGULATORY_EPOCHS: RegulatoryEpoch[] = [
  // ── Wyoming Preference Point Overhaul (hypothetical, based on real debate) ──
  {
    id: "wy-pref-overhaul-2027",
    stateId: "WY",
    speciesId: null, // Applies to all species
    effectiveYear: 2027,
    description: "Wyoming preference point system overhaul — switch to modified bonus draw",
    changeType: "preference_to_bonus",
    grandfatherRule: {
      grandfathered: true,
      cutoffYear: 2027,
      legacyTreatment: "full_value",
      conversionRatio: 1, // 1 pref point = 1 bonus point (squared)
      sunsetYears: null, // Permanent grandfather
      notes: "Points acquired before 2027 retain full preference value in the bonus pool. Points acquired 2027+ enter the new bonus-squared system.",
    },
  },
  // ── Colorado Point Cap (hypothetical) ──
  {
    id: "co-point-cap-2028",
    stateId: "CO",
    speciesId: "elk",
    effectiveYear: 2028,
    description: "Colorado elk preference point cap at 25 points",
    changeType: "point_cap",
    grandfatherRule: {
      grandfathered: true,
      cutoffYear: 2028,
      legacyTreatment: "frozen",
      notes: "Hunters with 25+ points before 2028 keep their total. New accumulation is capped at 25. Legacy hunters above the cap cannot gain more but are not reduced.",
    },
  },
  // ── Montana Bonus Point Restructure (hypothetical) ──
  {
    id: "mt-bonus-restructure-2029",
    stateId: "MT",
    speciesId: null,
    effectiveYear: 2029,
    description: "Montana bonus point system restructured to preference-weighted lottery",
    changeType: "system_overhaul",
    grandfatherRule: {
      grandfathered: true,
      cutoffYear: 2029,
      legacyTreatment: "converted",
      conversionRatio: 1.5, // 1 bonus point = 1.5 preference-weighted tickets
      sunsetYears: 5, // Grandfather clause expires after 5 years
      notes: "Existing bonus points converted at 1.5x ratio into the new weighted lottery. Conversion rate grandfathered for 5 years, then decays to 1:1.",
    },
  },
];

// ============================================================================
// Point History Operations
// ============================================================================

/**
 * Build a timestamped point array from an acquisition history.
 */
export function buildTimestampedPoints(
  history: PointAcquisitionRecord[],
  stateId: string,
  speciesId: string,
): TimestampedPoint[] {
  return history
    .filter((r) => r.stateId === stateId && r.speciesId === speciesId)
    .map((r) => ({
      acquiredYear: r.acquiredYear,
      method: r.method,
    }))
    .sort((a, b) => a.acquiredYear - b.acquiredYear);
}

/**
 * Count points acquired before a specific year (legacy points).
 */
export function countLegacyPoints(
  points: TimestampedPoint[],
  cutoffYear: number,
): number {
  return points.filter((p) => p.acquiredYear < cutoffYear).length;
}

/**
 * Count points acquired on or after a specific year (modern points).
 */
export function countModernPoints(
  points: TimestampedPoint[],
  cutoffYear: number,
): number {
  return points.filter((p) => p.acquiredYear >= cutoffYear).length;
}

/**
 * Split points into legacy and modern buckets based on an epoch.
 */
export function splitPointsByEpoch(
  points: TimestampedPoint[],
  epoch: RegulatoryEpoch,
): { legacy: TimestampedPoint[]; modern: TimestampedPoint[] } {
  const cutoff = epoch.grandfatherRule.cutoffYear;
  return {
    legacy: points.filter((p) => p.acquiredYear < cutoff),
    modern: points.filter((p) => p.acquiredYear >= cutoff),
  };
}

// ============================================================================
// Regulatory Rule Router
// ============================================================================

export interface EffectivePointValue {
  /** Total effective point value after applying regulatory rules */
  effectivePoints: number;
  /** Points treated under legacy rules */
  legacyPoints: number;
  /** Points treated under modern rules */
  modernPoints: number;
  /** Value of legacy points after conversion/adjustment */
  legacyValue: number;
  /** Value of modern points */
  modernValue: number;
  /** Which epoch (if any) was applied */
  appliedEpoch: RegulatoryEpoch | null;
  /** Whether any grandfather clause was invoked */
  grandfathered: boolean;
  /** Human-readable explanation */
  explanation: string;
}

/**
 * Compute the effective point value for a state/species,
 * accounting for regulatory epochs and grandfather clauses.
 *
 * This is the core routing function:
 *   IF points.acquired_date < epoch.cutoffYear
 *   THEN apply_legacy_rules()
 *   ELSE apply_modern_rules()
 */
export function computeEffectivePoints(
  points: TimestampedPoint[],
  stateId: string,
  speciesId: string,
  currentYear: number = new Date().getFullYear(),
  epochs: RegulatoryEpoch[] = REGULATORY_EPOCHS,
): EffectivePointValue {
  // Find applicable epoch for this state/species
  const epoch = epochs.find(
    (e) =>
      e.stateId === stateId &&
      (e.speciesId === null || e.speciesId === speciesId) &&
      e.effectiveYear <= currentYear,
  );

  // No epoch applies — all points treated at face value
  if (!epoch) {
    return {
      effectivePoints: points.length,
      legacyPoints: points.length,
      modernPoints: 0,
      legacyValue: points.length,
      modernValue: 0,
      appliedEpoch: null,
      grandfathered: false,
      explanation: `No regulatory change applies. All ${points.length} points at face value.`,
    };
  }

  // Split points by epoch cutoff
  const { legacy, modern } = splitPointsByEpoch(points, epoch);
  const rule = epoch.grandfatherRule;

  // Check if grandfather clause has sunset
  const yearsSinceEpoch = currentYear - epoch.effectiveYear;
  const isSunset = rule.sunsetYears !== null &&
    rule.sunsetYears !== undefined &&
    yearsSinceEpoch >= rule.sunsetYears;

  // Compute legacy point value
  let legacyValue: number;
  if (!rule.grandfathered || isSunset) {
    // No grandfathering — legacy points treated same as modern
    legacyValue = legacy.length;
  } else {
    switch (rule.legacyTreatment) {
      case "full_value":
        legacyValue = legacy.length;
        break;
      case "reduced_value":
        legacyValue = legacy.length * (rule.conversionRatio ?? 0.5);
        break;
      case "converted":
        legacyValue = legacy.length * (rule.conversionRatio ?? 1);
        break;
      case "frozen":
        legacyValue = legacy.length; // Keep what you have, can't gain more
        break;
      default:
        legacyValue = legacy.length;
    }
  }

  // Modern points are always at face value (in the new system)
  const modernValue = modern.length;

  const effectivePoints = legacyValue + modernValue;
  const grandfathered = rule.grandfathered && legacy.length > 0 && !isSunset;

  let explanation: string;
  if (grandfathered) {
    explanation = `${epoch.description}. ${legacy.length} legacy points (pre-${rule.cutoffYear}) ` +
      `valued at ${legacyValue.toFixed(1)} under grandfather clause. ` +
      `${modern.length} modern points at face value. ` +
      `Total effective: ${effectivePoints.toFixed(1)}.`;
    if (rule.sunsetYears !== null && rule.sunsetYears !== undefined) {
      const remainingYears = rule.sunsetYears - yearsSinceEpoch;
      explanation += ` Grandfather clause expires in ${remainingYears} year${remainingYears !== 1 ? "s" : ""}.`;
    }
  } else if (isSunset) {
    explanation = `${epoch.description}. Grandfather clause has expired ` +
      `(sunset after ${rule.sunsetYears} years). All ${points.length} points treated under current rules.`;
  } else {
    explanation = `${epoch.description}. All ${points.length} points treated under current rules.`;
  }

  return {
    effectivePoints,
    legacyPoints: legacy.length,
    modernPoints: modern.length,
    legacyValue,
    modernValue,
    appliedEpoch: epoch,
    grandfathered,
    explanation,
  };
}

// ============================================================================
// Point Cap Enforcement
// ============================================================================

/**
 * Check if a point cap epoch applies and enforce it.
 * Returns the maximum points allowed for new accumulation.
 */
export function enforcePointCap(
  currentPoints: TimestampedPoint[],
  stateId: string,
  speciesId: string,
  epochs: RegulatoryEpoch[] = REGULATORY_EPOCHS,
): { capped: boolean; maxAllowed: number | null; reason: string | null } {
  const capEpoch = epochs.find(
    (e) =>
      e.stateId === stateId &&
      (e.speciesId === null || e.speciesId === speciesId) &&
      e.changeType === "point_cap",
  );

  if (!capEpoch) {
    return { capped: false, maxAllowed: null, reason: null };
  }

  const rule = capEpoch.grandfatherRule;

  // If grandfathered and user had points before cutoff, they keep everything
  if (rule.grandfathered) {
    const legacyCount = countLegacyPoints(currentPoints, rule.cutoffYear);
    if (legacyCount > 0) {
      return {
        capped: false,
        maxAllowed: null,
        reason: `Grandfathered: ${legacyCount} points acquired before ${rule.cutoffYear}. No cap applied.`,
      };
    }
  }

  // Extract cap from epoch description (simplified — in production this would be a field)
  // For now, point_cap epochs define the cap in their notes
  const capMatch = capEpoch.description.match(/cap at (\d+)/);
  const cap = capMatch ? parseInt(capMatch[1]) : null;

  if (cap !== null && currentPoints.length >= cap) {
    return {
      capped: true,
      maxAllowed: cap,
      reason: `${stateId} ${speciesId}: Point cap of ${cap} reached. No additional points can be accumulated.`,
    };
  }

  return { capped: false, maxAllowed: cap, reason: null };
}

// ============================================================================
// Transition Impact Analysis
// ============================================================================

export interface TransitionImpact {
  stateId: string;
  speciesId: string;
  epoch: RegulatoryEpoch;
  /** Points before the transition */
  pointsBefore: number;
  /** Effective value after transition */
  effectiveAfter: number;
  /** Net change in effective value */
  netChange: number;
  /** Impact severity */
  severity: "positive" | "neutral" | "negative" | "critical";
  /** Human-readable advisory */
  advisory: string;
}

/**
 * Analyze the impact of a regulatory transition on a user's portfolio.
 * Returns advisories for each affected state/species position.
 */
export function analyzeTransitionImpact(
  history: PointAcquisitionRecord[],
  currentYear: number = new Date().getFullYear(),
  epochs: RegulatoryEpoch[] = REGULATORY_EPOCHS,
): TransitionImpact[] {
  const impacts: TransitionImpact[] = [];

  // Group history by state/species
  const positions = new Map<string, PointAcquisitionRecord[]>();
  for (const record of history) {
    const key = `${record.stateId}:${record.speciesId}`;
    const arr = positions.get(key) ?? [];
    arr.push(record);
    positions.set(key, arr);
  }

  for (const [key, records] of positions) {
    const [stateId, speciesId] = key.split(":");
    const points = buildTimestampedPoints(records, stateId, speciesId);

    // Check each epoch that applies
    for (const epoch of epochs) {
      if (
        epoch.stateId !== stateId ||
        (epoch.speciesId !== null && epoch.speciesId !== speciesId) ||
        epoch.effectiveYear > currentYear
      ) continue;

      const effective = computeEffectivePoints(
        points,
        stateId,
        speciesId,
        currentYear,
        [epoch],
      );

      const pointsBefore = points.length;
      const netChange = effective.effectivePoints - pointsBefore;

      let severity: TransitionImpact["severity"];
      if (netChange > 0) severity = "positive";
      else if (netChange === 0) severity = "neutral";
      else if (netChange > -2) severity = "negative";
      else severity = "critical";

      let advisory: string;
      if (effective.grandfathered) {
        advisory = `Your ${effective.legacyPoints} points acquired before ${epoch.grandfatherRule.cutoffYear} ` +
          `are grandfathered under the ${epoch.description.split("—")[0].trim()} change. ` +
          `Effective value: ${effective.effectivePoints.toFixed(1)} (was ${pointsBefore}).`;
      } else {
        advisory = `All ${pointsBefore} points treated under current rules. ` +
          `No grandfather clause applies.`;
      }

      impacts.push({
        stateId,
        speciesId,
        epoch,
        pointsBefore,
        effectiveAfter: effective.effectivePoints,
        netChange,
        severity,
        advisory,
      });
    }
  }

  return impacts;
}
