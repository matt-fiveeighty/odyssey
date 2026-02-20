/**
 * Draw Inflation Risk Index
 *
 * Computes a per-state/species risk label: Low | Moderate | High
 *
 * Based on:
 *   Point Creep Rate      40%
 *   Odds Volatility        25%
 *   Application Growth     20%
 *   Quota Volatility       15%
 *
 * When historical data is unavailable, falls back to heuristic
 * estimates from the existing point-creep model + state metadata.
 */

import type { DrawHistoryEntry } from "@/lib/types";
import { estimateCreepRate } from "./point-creep";

// --- Public types ---

export type InflationRiskLevel = "Low" | "Moderate" | "High";

export interface InflationRiskResult {
  riskScore: number; // 0–1 normalized
  riskLevel: InflationRiskLevel;
  components: {
    pointCreep: number;
    oddsVolatility: number;
    applicationGrowth: number;
    quotaVolatility: number;
  };
}

// --- Stat helpers ---

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function slope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

// --- Core computation ---

/**
 * Compute inflation risk from actual historical draw data.
 */
export function computeInflationRisk(
  history: DrawHistoryEntry[],
): InflationRiskResult {
  // Ensure sorted by year ascending
  const sorted = [...history].sort((a, b) => a.year - b.year);

  // --- Point Creep Rate ---
  const minPointsValues = sorted
    .map((h) => h.minPointsDrawn)
    .filter((v): v is number => v !== null);
  const pointCreepSlope =
    minPointsValues.length >= 2 ? slope(minPointsValues) : 0;
  // Normalize: 1.5+ pts/year = severe (1.0)
  const normalizedPointCreep = Math.min(1, Math.max(0, pointCreepSlope / 1.5));

  // --- Odds Volatility ---
  const oddsValues = sorted
    .map((h) => h.oddsPercent)
    .filter((v): v is number => v !== null);
  const oddsStd = stdDev(oddsValues);
  // Normalize: 5% swing = high
  const normalizedOddsVolatility = Math.min(1, oddsStd / 5);

  // --- Application Growth ---
  const appValues = sorted
    .map((h) => h.applicants)
    .filter((v): v is number => v !== null && v > 0);
  let applicationGrowthRate = 0;
  if (appValues.length >= 2) {
    const first = appValues[0];
    const last = appValues[appValues.length - 1];
    applicationGrowthRate = first > 0 ? (last - first) / first : 0;
  }
  const normalizedAppGrowth = Math.min(
    1,
    Math.max(0, applicationGrowthRate),
  );

  // --- Quota Volatility ---
  const quotaValues = sorted
    .map((h) => h.tagsAvailable ?? h.tagsIssued)
    .filter((v): v is number => v !== null && v > 0);
  let quotaChangePercent = 0;
  if (quotaValues.length >= 2) {
    const first = quotaValues[0];
    const last = quotaValues[quotaValues.length - 1];
    quotaChangePercent = first > 0 ? Math.abs(last - first) / first : 0;
  }
  const normalizedQuotaVolatility = Math.min(1, quotaChangePercent);

  // --- Weighted score ---
  const riskScore =
    normalizedPointCreep * 0.4 +
    normalizedOddsVolatility * 0.25 +
    normalizedAppGrowth * 0.2 +
    normalizedQuotaVolatility * 0.15;

  return {
    riskScore: Math.round(riskScore * 100) / 100,
    riskLevel: riskScoreToLevel(riskScore),
    components: {
      pointCreep: Math.round(normalizedPointCreep * 100) / 100,
      oddsVolatility: Math.round(normalizedOddsVolatility * 100) / 100,
      applicationGrowth: Math.round(normalizedAppGrowth * 100) / 100,
      quotaVolatility: Math.round(normalizedQuotaVolatility * 100) / 100,
    },
  };
}

/**
 * Heuristic fallback when no historical draw data exists.
 * Uses trophy rating as a proxy for competitiveness.
 */
export function estimateInflationRisk(
  trophyRating: number,
): InflationRiskResult {
  const creepRate = estimateCreepRate(trophyRating);

  // Higher trophy rating → more competition → higher risk
  const normalizedCreep = Math.min(1, creepRate / 1.5);
  // Assume moderate growth and volatility for unknown data
  const normalizedOddsVol = trophyRating >= 8 ? 0.6 : trophyRating >= 6 ? 0.4 : 0.2;
  const normalizedAppGrowth = trophyRating >= 8 ? 0.5 : trophyRating >= 6 ? 0.3 : 0.1;
  const normalizedQuotaVol = 0.2; // default low

  const riskScore =
    normalizedCreep * 0.4 +
    normalizedOddsVol * 0.25 +
    normalizedAppGrowth * 0.2 +
    normalizedQuotaVol * 0.15;

  return {
    riskScore: Math.round(riskScore * 100) / 100,
    riskLevel: riskScoreToLevel(riskScore),
    components: {
      pointCreep: Math.round(normalizedCreep * 100) / 100,
      oddsVolatility: Math.round(normalizedOddsVol * 100) / 100,
      applicationGrowth: Math.round(normalizedAppGrowth * 100) / 100,
      quotaVolatility: Math.round(normalizedQuotaVol * 100) / 100,
    },
  };
}

// --- Helpers ---

function riskScoreToLevel(score: number): InflationRiskLevel {
  if (score < 0.33) return "Low";
  if (score <= 0.66) return "Moderate";
  return "High";
}
