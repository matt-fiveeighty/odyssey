/**
 * Draw Odds Calculator
 *
 * Calculates probability of drawing a tag based on each state's unique
 * point system, the user's current points, and historical draw data.
 */

import { STATES_MAP } from "@/lib/constants/states";
import type { Unit } from "@/lib/types";

interface DrawOddsInput {
  stateId: string;
  userPoints: number;
  unit: Unit;
}

interface DrawOddsResult {
  currentOdds: number; // 0-1 probability
  yearsToLikelyDraw: number;
  pointsAtDraw: number;
  system: string;
  explanation: string;
}

export function calculateDrawOdds(input: DrawOddsInput): DrawOddsResult {
  const state = STATES_MAP[input.stateId];
  if (!state) {
    return {
      currentOdds: 0,
      yearsToLikelyDraw: 99,
      pointsAtDraw: 0,
      system: "unknown",
      explanation: "Unknown state",
    };
  }

  const required = input.unit.pointsRequiredNonresident;
  const userPts = input.userPoints;

  switch (state.pointSystem) {
    case "preference": {
      // Colorado: True preference. 80% to highest points, 20% random.
      // If you have >= required points, you draw in the preference pool.
      const prefPct = (state.pointSystemDetails.preferencePct ?? 80) / 100;
      if (userPts >= required) {
        return {
          currentOdds: prefPct,
          yearsToLikelyDraw: 0,
          pointsAtDraw: userPts,
          system: "True Preference (80/20)",
          explanation: `You have enough points (${userPts} >= ${required}). ${prefPct * 100}% chance in preference pool.`,
        };
      }
      const yearsNeeded = required - userPts;
      return {
        currentOdds: 0.2 / (input.unit.tagQuotaNonresident || 50), // small random chance
        yearsToLikelyDraw: yearsNeeded,
        pointsAtDraw: required,
        system: "True Preference (80/20)",
        explanation: `Need ${yearsNeeded} more year(s) to reach ${required} points. Small random chance (20% pool) each year.`,
      };
    }

    case "hybrid": {
      // Wyoming/Oregon: 75% preference, 25% random
      const prefPct = (state.pointSystemDetails.preferencePct ?? 75) / 100;
      const randPct = 1 - prefPct;
      const tags = input.unit.tagQuotaNonresident || 50;

      if (userPts >= required) {
        return {
          currentOdds: prefPct + randPct * (1 / Math.max(tags, 1)),
          yearsToLikelyDraw: 0,
          pointsAtDraw: userPts,
          system: `Hybrid (${prefPct * 100}/${randPct * 100})`,
          explanation: `You have enough points (${userPts} >= ${required}). Draw in preference pool + random chance.`,
        };
      }
      const randomOdds = randPct / Math.max(tags, 1);
      const yearsNeeded = required - userPts;
      return {
        currentOdds: randomOdds,
        yearsToLikelyDraw: yearsNeeded,
        pointsAtDraw: required,
        system: `Hybrid (${prefPct * 100}/${randPct * 100})`,
        explanation: `Need ${yearsNeeded} more year(s). ${(randomOdds * 100).toFixed(1)}% random chance each year.`,
      };
    }

    case "bonus_squared": {
      // Nevada: (points + 1)^2 chances
      const tags = input.unit.tagQuotaNonresident || 5;
      // Estimate total applicants as ~20x tags for trophy units
      const estApplicants = tags * 20;
      const userChances = Math.pow(userPts + 1, 2);
      // Average chances per applicant (rough estimate)
      const avgChances = Math.pow(required / 2 + 1, 2);
      const totalChances = estApplicants * avgChances;
      const odds = Math.min(1, (userChances * tags) / Math.max(totalChances, 1));

      // Years until odds become favorable (>50%)
      let yearsToLikely = 0;
      let pts = userPts;
      while (yearsToLikely < 30) {
        const chances = Math.pow(pts + 1, 2);
        const estOdds = (chances * tags) / Math.max(totalChances, 1);
        if (estOdds >= 0.5) break;
        pts++;
        yearsToLikely++;
      }

      return {
        currentOdds: odds,
        yearsToLikelyDraw: yearsToLikely,
        pointsAtDraw: pts,
        system: "Bonus Squared",
        explanation: `(${userPts}+1)^2 = ${userChances} chances. ${(odds * 100).toFixed(1)}% estimated odds this year.`,
      };
    }

    case "bonus": {
      // Arizona: (points + 1) chances, NOT squared
      const tags = input.unit.tagQuotaNonresident || 15;
      const estApplicants = tags * 15;
      const userChances = userPts + 1;
      const avgChances = required / 2 + 1;
      const totalChances = estApplicants * avgChances;
      const odds = Math.min(1, (userChances * tags) / Math.max(totalChances, 1));

      let yearsToLikely = 0;
      let pts = userPts;
      while (yearsToLikely < 30) {
        const chances = pts + 1;
        const estOdds = (chances * tags) / Math.max(totalChances, 1);
        if (estOdds >= 0.5) break;
        pts++;
        yearsToLikely++;
      }

      return {
        currentOdds: odds,
        yearsToLikelyDraw: yearsToLikely,
        pointsAtDraw: pts,
        system: "Bonus (Not Squared)",
        explanation: `${userPts}+1 = ${userChances} chances. ${(odds * 100).toFixed(1)}% estimated odds this year.`,
      };
    }

    case "dual": {
      // Montana/Utah: preference for general, bonus for special
      // Treat as preference for this calculation
      if (userPts >= required) {
        return {
          currentOdds: 0.75,
          yearsToLikelyDraw: 0,
          pointsAtDraw: userPts,
          system: "Dual (Preference + Bonus)",
          explanation: `Enough preference points for general draw. Bonus points accumulating for special permits.`,
        };
      }
      return {
        currentOdds: 0.25 / (input.unit.tagQuotaNonresident || 50),
        yearsToLikelyDraw: required - userPts,
        pointsAtDraw: required,
        system: "Dual (Preference + Bonus)",
        explanation: `Need ${required - userPts} more preference point(s). Bonus points squaring in background.`,
      };
    }

    case "random": {
      // Idaho, New Mexico: Pure random, everyone equal
      const tags = input.unit.tagQuotaNonresident || 50;
      const estApplicants = tags * 10;
      const odds = tags / Math.max(estApplicants, 1);
      return {
        currentOdds: odds,
        yearsToLikelyDraw: Math.ceil(1 / Math.max(odds, 0.01)),
        pointsAtDraw: 0,
        system: "Pure Random",
        explanation: `${(odds * 100).toFixed(1)}% chance every year. No points needed — equal odds for all.`,
      };
    }

    case "preference_nr": {
      // Kansas: NR deer only
      if (userPts >= required) {
        return {
          currentOdds: 0.9,
          yearsToLikelyDraw: 0,
          pointsAtDraw: userPts,
          system: "NR Preference",
          explanation: `Enough preference points (${userPts} >= ${required}).`,
        };
      }
      return {
        currentOdds: 0.05,
        yearsToLikelyDraw: required - userPts,
        pointsAtDraw: required,
        system: "NR Preference",
        explanation: `Need ${required - userPts} more year(s) of NR preference points.`,
      };
    }

    default:
      return {
        currentOdds: 0,
        yearsToLikelyDraw: 99,
        pointsAtDraw: 0,
        system: "unknown",
        explanation: "Unknown point system",
      };
  }
}
