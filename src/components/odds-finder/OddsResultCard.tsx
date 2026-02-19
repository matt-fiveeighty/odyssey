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
  Target,
} from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";

interface OddsResult {
  unitCode: string;
  unitName: string;
  stateId: string;
  speciesId: string;
  successRate: number;
  trophyRating: number;
  pointsRequired: number;
  yearsToUnlock: number;
  publicLandPct: number;
  pressureLevel: string;
  compositeScore: number;
  whyBullets: string[];
}

interface OddsResultCardProps {
  result: OddsResult;
  rank: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

/** Get a human-readable draw chance label */
function getDrawChanceLabel(yearsToUnlock: number, successRate: number): { label: string; color: string; explanation: string } {
  if (yearsToUnlock === 0 && successRate >= 0.25) {
    return {
      label: "High Odds",
      color: "bg-success/15 text-success border-success/30",
      explanation: "Drawable now with strong success rate — this is your best bet",
    };
  }
  if (yearsToUnlock === 0) {
    return {
      label: "Drawable Now",
      color: "bg-success/15 text-success border-success/30",
      explanation: "You have enough points to draw this tag right now",
    };
  }
  if (yearsToUnlock <= 2) {
    return {
      label: "Short Wait",
      color: "bg-info/15 text-info border-info/30",
      explanation: `Just ${yearsToUnlock} year${yearsToUnlock > 1 ? "s" : ""} of point building and you're in`,
    };
  }
  if (yearsToUnlock <= 5) {
    return {
      label: "Medium Wait",
      color: "bg-warning/15 text-warning border-warning/30",
      explanation: `~${yearsToUnlock} years to accumulate enough points — good medium-term investment`,
    };
  }
  return {
    label: "Long-Term",
    color: "bg-premium/15 text-premium border-premium/30",
    explanation: `${yearsToUnlock}+ year point investment — a trophy play worth building toward`,
  };
}

/** Get the top reason this unit ranks where it does */
function getTopReason(result: OddsResult): string {
  if (result.yearsToUnlock === 0 && result.successRate >= 0.3) {
    return "Highest odds: drawable now with excellent success rate";
  }
  if (result.yearsToUnlock === 0 && result.trophyRating >= 7) {
    return "Drawable now with premium trophy quality — rare combo";
  }
  if (result.yearsToUnlock === 0) {
    return "Drawable now — no point wait required";
  }
  if (result.successRate >= 0.3 && result.trophyRating >= 7) {
    return "Top-tier success rate AND trophy quality — worth the wait";
  }
  if (result.successRate >= 0.3) {
    return "Above-average success rate gives you the best chance to fill your tag";
  }
  if (result.trophyRating >= 8) {
    return "Premium trophy potential — one of the best units for quality animals";
  }
  if (result.publicLandPct >= 0.6 && result.pressureLevel === "Low") {
    return "Lots of public land with low pressure — quality DIY opportunity";
  }
  return result.whyBullets[0] ?? "Good overall match for your criteria";
}

export function OddsResultCard({
  result,
  rank,
  isExpanded,
  onToggleExpand,
}: OddsResultCardProps) {
  const state = STATES_MAP[result.stateId];
  const vis = STATE_VISUALS[result.stateId];
  const drawChance = getDrawChanceLabel(result.yearsToUnlock, result.successRate);
  const topReason = getTopReason(result);

  return (
    <Card className={`bg-card border-border transition-all ${rank === 0 ? "ring-1 ring-primary/30" : ""}`}>
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

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">Unit {result.unitCode}</h3>
              <span className="text-xs text-muted-foreground">{result.unitName}</span>
              {state && (
                <div className={`text-[10px] px-1.5 py-0.5 rounded font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
                  {state.abbreviation}
                </div>
              )}
              {/* Draw chance badge — prominent */}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ml-auto ${drawChance.color}`}>
                {drawChance.label}
              </span>
            </div>

            {/* TOP REASON — the key "why" callout */}
            <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-primary">{topReason}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{drawChance.explanation}</p>
                </div>
              </div>
            </div>

            {/* Stats row — metrics as visual badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${result.successRate >= 0.25 ? "bg-success/10 text-success font-semibold" : "bg-secondary/50 text-muted-foreground"}`}>
                <TrendingUp className="w-3 h-3" />
                {Math.round(result.successRate * 100)}% success
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${result.trophyRating >= 7 ? "bg-warning/10 text-warning font-semibold" : "bg-secondary/50 text-muted-foreground"}`}>
                <Trophy className="w-3 h-3" />
                {result.trophyRating}/10 trophy
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${result.publicLandPct >= 0.5 ? "bg-info/10 text-info font-semibold" : "bg-secondary/50 text-muted-foreground"}`}>
                <Mountain className="w-3 h-3" />
                {Math.round(result.publicLandPct * 100)}% public
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${result.yearsToUnlock === 0 ? "bg-success/10 text-success font-semibold" : result.yearsToUnlock <= 3 ? "bg-info/10 text-info" : "bg-secondary/50 text-muted-foreground"}`}>
                <Timer className="w-3 h-3" />
                {result.yearsToUnlock === 0 ? "Draw now" : `~${result.yearsToUnlock}yr wait`}
              </div>
              {result.pressureLevel === "Low" && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-chart-3/10 text-chart-3 font-semibold">
                  <Target className="w-3 h-3" />
                  Low pressure
                </div>
              )}
            </div>

            {/* Additional why bullets */}
            {result.whyBullets.length > 0 && (
              <div className="mt-2 space-y-1">
                {(isExpanded ? result.whyBullets : result.whyBullets.slice(0, 2)).map((bullet, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <ArrowRight className="w-3 h-3 text-primary/60 shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            )}

            {result.whyBullets.length > 2 && (
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
                    <ChevronDown className="w-3 h-3" /> +{result.whyBullets.length - 2} more reasons
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

export type { OddsResult };
