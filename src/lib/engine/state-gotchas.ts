/**
 * State-Specific "Gotcha" Hooks — Mandatory Logic Rules
 *
 * These are state-specific F&G rules that the engine must enforce.
 * Each gotcha returns alerts/modifications that the engine applies
 * to the roadmap before finalization.
 */

import type { RoadmapYear, RoadmapAction, StrategicAssessment } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";

// ── Alert types ──

export interface GotchaAlert {
  id: string;
  stateId: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendation?: string;
}

// ── CO: 25% Random Pool + License Amortization ──

/**
 * Colorado allocates 25% of tags via random draw for units requiring 4+ points.
 * This means even low-point holders have a shot at premium units.
 * Also: CO requires a $98 qualifying license — amortize across species.
 */
export function checkColorado25Percent(
  assessment: StrategicAssessment,
  userPoints: Record<string, number>,
): GotchaAlert[] {
  const alerts: GotchaAlert[] = [];
  const coActions = assessment.roadmap.flatMap((yr) =>
    yr.actions.filter((a) => a.stateId === "CO"),
  );
  if (coActions.length === 0) return [];

  // Check if user has CO points for any species
  const coPointEntries = Object.entries(userPoints).filter(([k]) => k.startsWith("CO"));
  const hasHighPoints = coPointEntries.some(([, pts]) => pts >= 4);

  if (hasHighPoints) {
    alerts.push({
      id: "co-25-random",
      stateId: "CO",
      severity: "info",
      title: "CO 25% Random Pool",
      description:
        "Colorado allocates 25% of tags in units requiring 4+ points via random draw. You qualify for the preference pool AND the random pool simultaneously.",
      recommendation:
        "Apply for your top-choice premium unit. Even if you don't have max points, you have a ~25% random chance each year.",
    });
  }

  // License amortization: if applying for only 1 species, warn about the $98 qualifying license
  const coSpecies = new Set(coActions.map((a) => a.speciesId));
  if (coSpecies.size === 1) {
    alerts.push({
      id: "co-license-amortize",
      stateId: "CO",
      severity: "warning",
      title: "CO License Amortization",
      description:
        "Colorado requires a $98 qualifying license for nonresidents. Applying for only 1 species means $98 per tag opportunity.",
      recommendation:
        "Apply for multiple species (elk + deer, or elk + antelope) to amortize the $98 license across more draw opportunities.",
    });
  }

  return alerts;
}

// ── WY: Special Draw ROI ──

/**
 * Wyoming's Special Draw costs $500+ premium but increases odds.
 * Only worth it mathematically if the percentage increase justifies the cost.
 */
export function checkWyomingSpecialDraw(
  assessment: StrategicAssessment,
  huntYearBudget: number,
): GotchaAlert[] {
  const alerts: GotchaAlert[] = [];
  const wyActions = assessment.roadmap.flatMap((yr) =>
    yr.actions.filter((a) => a.stateId === "WY" && a.type === "apply"),
  );
  if (wyActions.length === 0) return [];

  // Special draw premium is ~$500 for most species
  const specialDrawPremium = 500;
  const budgetRatio = huntYearBudget > 0 ? specialDrawPremium / huntYearBudget : 1;

  if (budgetRatio > 0.15) {
    alerts.push({
      id: "wy-special-draw-roi",
      stateId: "WY",
      severity: "warning",
      title: "WY Special Draw ROI",
      description:
        `Wyoming's Special Draw adds ~$${specialDrawPremium} per application. At your budget, this is ${Math.round(budgetRatio * 100)}% of annual hunt capital.`,
      recommendation:
        "Special Draw is only worthwhile for premium units where the odds increase is >5%. For general units, save the $500.",
    });
  } else {
    alerts.push({
      id: "wy-special-draw-consider",
      stateId: "WY",
      severity: "info",
      title: "WY Special Draw Available",
      description:
        "Wyoming offers a Special Draw for an additional ~$500. This gives you extra chances at premium units.",
      recommendation:
        "Consider the Special Draw for your top-priority WY unit if you can afford the premium.",
    });
  }

  return alerts;
}

// ── NM: Outfitter Pool Multiplier ──

/**
 * New Mexico has separate draw pools: DIY (~6%) vs Outfitter (~10%).
 * If user selects guided hunting, switch to outfitter pool odds.
 */
export function checkNewMexicoOutfitter(
  assessment: StrategicAssessment,
  isGuidedForNM: boolean,
): GotchaAlert[] {
  const alerts: GotchaAlert[] = [];
  const nmActions = assessment.roadmap.flatMap((yr) =>
    yr.actions.filter((a) => a.stateId === "NM"),
  );
  if (nmActions.length === 0) return [];

  if (isGuidedForNM) {
    alerts.push({
      id: "nm-outfitter-pool",
      stateId: "NM",
      severity: "info",
      title: "NM Outfitter Pool Active",
      description:
        "You're applying through the NM Outfitter pool (~10% allocation) instead of the DIY pool (~6%). Higher odds but requires booking with a licensed outfitter.",
      recommendation:
        "Budget $3,000–$7,000+ for NM guided elk hunts. Book your outfitter BEFORE draw results — popular outfitters fill up fast.",
    });
  } else {
    alerts.push({
      id: "nm-outfitter-option",
      stateId: "NM",
      severity: "info",
      title: "NM Outfitter Pool Option",
      description:
        "New Mexico offers a separate Outfitter pool with ~10% allocation (vs ~6% DIY). Guided hunts get better odds.",
      recommendation:
        "If you're open to guided hunting for NM, switching to the Outfitter pool can nearly double your draw odds.",
    });
  }

  return alerts;
}

// ── ID: OIL Lockouts (Once-In-A-Lifetime Mutual Exclusivity) ──

/**
 * Idaho enforces mutual exclusivity for Sheep, Moose, and Mountain Goat.
 * Users cannot apply for more than one of these species in the same year.
 */
export function checkIdahoOILLockouts(
  assessment: StrategicAssessment,
): GotchaAlert[] {
  const alerts: GotchaAlert[] = [];
  const oilSpecies = ["bighorn_sheep", "moose", "mountain_goat"];

  for (const yr of assessment.roadmap) {
    const idOILActions = yr.actions.filter(
      (a) => a.stateId === "ID" && oilSpecies.includes(a.speciesId),
    );
    if (idOILActions.length > 1) {
      const speciesNames = idOILActions.map((a) => a.speciesId).join(", ");
      alerts.push({
        id: `id-oil-conflict-${yr.year}`,
        stateId: "ID",
        severity: "critical",
        title: `ID OIL Conflict (${yr.year})`,
        description:
          `Idaho enforces mutual exclusivity for Sheep/Moose/Goat. You cannot apply for ${speciesNames} in the same year (${yr.year}).`,
        recommendation:
          "Choose one OIL species per year. Prioritize the species with better draw odds or more accumulated points.",
      });
    }
  }

  return alerts;
}

// ── MT: Combo License Dependency ──

/**
 * Montana requires a $1,000+ Elk Combo license for nonresidents.
 * This must be auto-injected when elk is in the portfolio.
 */
export function checkMontanaComboLicense(
  assessment: StrategicAssessment,
  homeState: string,
): GotchaAlert[] {
  const alerts: GotchaAlert[] = [];
  if (homeState === "MT") return []; // Residents don't need combo

  const mtElkActions = assessment.roadmap.flatMap((yr) =>
    yr.actions.filter(
      (a) => a.stateId === "MT" && a.speciesId === "elk",
    ),
  );
  if (mtElkActions.length === 0) return [];

  // Check if any MT elk action already accounts for the combo license cost
  const hasComboInCosts = mtElkActions.some((a) =>
    a.costs.some((c) => c.label.toLowerCase().includes("combo")),
  );

  if (!hasComboInCosts) {
    alerts.push({
      id: "mt-combo-license",
      stateId: "MT",
      severity: "warning",
      title: "MT Elk Combo License Required",
      description:
        "Montana requires a nonresident Elk Combo license ($1,052+) that includes elk, deer, and fishing. This is floated capital — charged upfront but refundable if you don't draw.",
      recommendation:
        "Budget $1,052 as floated capital for each year you apply for MT elk. This license also covers deer — apply for both to maximize value.",
    });
  }

  return alerts;
}

// ── Master Gotcha Runner ──

/**
 * Runs all state-specific gotcha checks and returns combined alerts.
 */
export function runAllGotchaChecks(
  assessment: StrategicAssessment,
  options: {
    userPoints: Record<string, number>;
    huntYearBudget: number;
    homeState: string;
    guidedForSpecies: string[];
  },
): GotchaAlert[] {
  const isGuidedForNM = options.guidedForSpecies.some(
    (s) => assessment.roadmap.some((yr) =>
      yr.actions.some((a) => a.stateId === "NM" && a.speciesId === s),
    ),
  );

  return [
    ...checkColorado25Percent(assessment, options.userPoints),
    ...checkWyomingSpecialDraw(assessment, options.huntYearBudget),
    ...checkNewMexicoOutfitter(assessment, isGuidedForNM),
    ...checkIdahoOILLockouts(assessment),
    ...checkMontanaComboLicense(assessment, options.homeState),
  ];
}
