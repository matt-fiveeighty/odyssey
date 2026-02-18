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
} from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";

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

export function OddsResultCard({
  result,
  rank,
  isExpanded,
  onToggleExpand,
}: OddsResultCardProps) {
  const state = STATES_MAP[result.stateId];

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

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                Unit {result.unitCode}
              </h3>
              <span className="text-xs text-muted-foreground">
                {result.unitName}
              </span>
              {state && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded text-white font-bold ml-auto shrink-0"
                  style={{ backgroundColor: state.color }}
                >
                  {state.abbreviation}
                </span>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-xs">
                  {Math.round(result.successRate * 100)}% success
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span className="text-xs">
                  {result.trophyRating}/10 trophy
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Mountain className="w-3 h-3 text-blue-400" />
                <span className="text-xs">
                  {Math.round(result.publicLandPct * 100)}% public
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Timer className="w-3 h-3 text-purple-400" />
                <span className="text-xs">
                  {result.yearsToUnlock === 0
                    ? "Draw now"
                    : `~${result.yearsToUnlock}yr wait`}
                </span>
              </div>
            </div>

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
                    <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
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
                    <ChevronDown className="w-3 h-3" /> +
                    {result.whyBullets.length - 2} more reasons
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
