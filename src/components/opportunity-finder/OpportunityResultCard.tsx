"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Trophy,
  Mountain,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Timer,
  Zap,
  DollarSign,
  Shuffle,
  AlertTriangle,
} from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import type { OpportunityResult, OpportunityTier } from "@/lib/types";

interface OpportunityResultCardProps {
  result: OpportunityResult;
  rank: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const TIER_STYLES: Record<
  OpportunityTier,
  { label: string; color: string }
> = {
  excellent: {
    label: "Excellent",
    color: "bg-success/15 text-success border-success/30",
  },
  good: {
    label: "Good",
    color: "bg-info/15 text-info border-info/30",
  },
  moderate: {
    label: "Moderate",
    color: "bg-warning/15 text-warning border-warning/30",
  },
  long_term: {
    label: "Long-Term",
    color: "bg-premium/15 text-premium border-premium/30",
  },
};

export function OpportunityResultCard({
  result,
  rank,
  isExpanded,
  onToggleExpand,
}: OpportunityResultCardProps) {
  const state = STATES_MAP[result.stateId];
  const species = SPECIES_MAP[result.speciesId];
  const vis = STATE_VISUALS[result.stateId];
  const tierStyle = TIER_STYLES[result.tier];

  return (
    <Card
      className={`bg-card border-border transition-all ${rank === 0 ? "ring-1 ring-primary/30" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
              rank === 0
                ? "bg-primary text-primary-foreground"
                : rank <= 2
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-muted-foreground"
            }`}
          >
            #{rank + 1}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap">
              <SpeciesAvatar speciesId={result.speciesId} size={20} />
              <h3 className="font-semibold text-sm">
                {species?.name ?? result.speciesId}
              </h3>
              {state && (
                <div
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}
                >
                  {state.abbreviation}
                </div>
              )}
              {result.isOnceInALifetime && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning font-semibold flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  OIAL
                </span>
              )}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ml-auto ${tierStyle.color}`}
              >
                {tierStyle.label}
              </span>
            </div>

            {/* Top reason callout */}
            <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-primary">
                  {result.topReason}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Your points vs required */}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                  result.yearsToUnlock === 0
                    ? "bg-success/10 text-success font-semibold"
                    : result.yearsToUnlock <= 3
                      ? "bg-info/10 text-info"
                      : "bg-secondary/50 text-muted-foreground"
                }`}
              >
                <Timer className="w-3 h-3" />
                {result.pointSystem === "random"
                  ? "Random"
                  : result.yearsToUnlock === 0
                    ? result.pointsRequired === 0
                      ? "No pts needed"
                      : `${result.userPoints}/${result.pointsRequired} pts`
                    : `${result.userPoints}/${result.pointsRequired} pts · ~${result.yearsToUnlock}yr`}
              </div>

              {/* Draw system */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-secondary/50 text-muted-foreground">
                <Shuffle className="w-3 h-3" />
                {result.pointSystemLabel}
              </div>

              {/* Annual cost */}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                  result.annualPointCost === 0
                    ? "bg-success/10 text-success font-semibold"
                    : "bg-secondary/50 text-muted-foreground"
                }`}
              >
                <DollarSign className="w-3 h-3" />
                {result.annualPointCost === 0
                  ? "Free"
                  : `$${result.annualPointCost}/yr`}
              </div>

              {/* Success rate (only if unit data) */}
              {result.bestUnit && (
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                    result.bestUnit.successRate >= 0.25
                      ? "bg-success/10 text-success font-semibold"
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  {Math.round(result.bestUnit.successRate * 100)}%
                </div>
              )}

              {/* Trophy (only if unit data) */}
              {result.bestUnit && result.bestUnit.trophyRating >= 6 && (
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                    result.bestUnit.trophyRating >= 7
                      ? "bg-warning/10 text-warning font-semibold"
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <Trophy className="w-3 h-3" />
                  {result.bestUnit.trophyRating}/10
                </div>
              )}

              {/* Public land (only if unit data) */}
              {result.bestUnit && result.bestUnit.publicLandPct >= 0.4 && (
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                    result.bestUnit.publicLandPct >= 0.5
                      ? "bg-info/10 text-info font-semibold"
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <Mountain className="w-3 h-3" />
                  {Math.round(result.bestUnit.publicLandPct * 100)}% public
                </div>
              )}
            </div>

            {/* No unit data indicator */}
            {!result.hasUnitData && (
              <p className="text-[10px] text-muted-foreground/60 mt-1.5 italic">
                Detailed unit data coming soon
              </p>
            )}

            {/* Unit detail preview when expanded */}
            {result.hasUnitData && result.bestUnit && isExpanded && (
              <div className="mt-2 p-2 rounded-lg bg-secondary/30 border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                  Top Unit: {result.bestUnit.unitCode}{" "}
                  {result.bestUnit.unitName !== result.bestUnit.unitCode &&
                    `(${result.bestUnit.unitName})`}
                </p>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>
                    {Math.round(result.bestUnit.successRate * 100)}% success
                  </span>
                  <span>Trophy {result.bestUnit.trophyRating}/10</span>
                  <span>
                    {Math.round(result.bestUnit.publicLandPct * 100)}% public
                  </span>
                  <span>{result.bestUnit.pressureLevel} pressure</span>
                </div>
                {result.unitCount > 1 && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    +{result.unitCount - 1} more unit
                    {result.unitCount - 1 > 1 ? "s" : ""} with data
                  </p>
                )}
              </div>
            )}

            {/* Why bullets */}
            {result.whyBullets.length > 0 && (
              <div className="mt-2 space-y-1">
                {(isExpanded
                  ? result.whyBullets
                  : result.whyBullets.slice(0, 2)
                ).map((bullet, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                  >
                    <ArrowRight className="w-3 h-3 text-primary/60 shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Expand toggle */}
            {(result.whyBullets.length > 2 || result.hasUnitData) && (
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1 text-[10px] text-primary mt-1.5 hover:underline"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    {result.hasUnitData ? "Show unit details" : "Show more"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
