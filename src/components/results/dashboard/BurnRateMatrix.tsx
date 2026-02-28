"use client";

import { useMemo } from "react";
import type { StrategicAssessment, BurnRateEntry } from "@/lib/types";
import { computeBurnRateMatrix } from "@/lib/engine/capital-allocator";
import { useWizardStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { formatSpeciesName } from "@/lib/utils";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Dice5 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BurnRateMatrixProps {
  assessment: StrategicAssessment;
}

const TREND_ICONS = {
  accelerating: TrendingUp,
  stable: Minus,
  decelerating: TrendingDown,
};

const TREND_COLORS = {
  accelerating: "text-red-400",
  stable: "text-muted-foreground",
  decelerating: "text-green-400",
};

export function BurnRateMatrix({ assessment }: BurnRateMatrixProps) {
  const existingPoints = useWizardStore((s) => s.existingPoints);

  const entries = useMemo(
    () => computeBurnRateMatrix(assessment, existingPoints),
    [assessment, existingPoints],
  );

  if (entries.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="magic-card magic-card--glow rounded-xl border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 bg-secondary/40 border-b border-border/30 flex items-center justify-between">
          <span className="label-uppercase">
            Burn Rate Matrix
          </span>
          <Tooltip>
            <TooltipTrigger>
              <span className="text-[10px] text-muted-foreground/50 cursor-help">[?]</span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-xs">
              Shows your point position vs requirements for each state and species.
              PCV is Point Creep Velocity — how fast requirements inflate per year.
              Red entries are "dead assets" where creep outpaces your accumulation.
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground/60">
                <th className="text-left px-4 py-2 font-medium">State / Species</th>
                <th className="text-center px-2 py-2 font-medium">Pts</th>
                <th className="text-center px-2 py-2 font-medium">Req</th>
                <th className="text-center px-2 py-2 font-medium">
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="cursor-help border-b border-dotted border-muted-foreground/40">PCV</span>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs">
                      Point Creep Velocity: average points/year the requirement increases.
                      Above 1.0 = dead asset (you can never catch up at 1 pt/year).
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th className="text-center px-2 py-2 font-medium">ETA</th>
                <th className="text-center px-2 py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const state = STATES_MAP[entry.stateId];
                const TrendIcon = TREND_ICONS[entry.pcvTrend];
                const trendColor = TREND_COLORS[entry.pcvTrend];
                const currentYear = new Date().getFullYear();

                return (
                  <tr
                    key={`${entry.stateId}-${entry.speciesId}`}
                    className={`border-b border-border/20 hover:bg-secondary/20 transition-colors ${
                      entry.isDeadAsset ? "bg-red-500/5" : ""
                    }`}
                  >
                    {/* State + Species */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <SpeciesAvatar speciesId={entry.speciesId} size={22} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {state?.abbreviation ?? entry.stateId} {formatSpeciesName(entry.speciesId)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Current Points */}
                    <td className="text-center px-2 py-2.5 font-financial font-semibold">
                      {entry.currentPoints}
                    </td>

                    {/* Required Points */}
                    <td className="text-center px-2 py-2.5 font-financial">
                      {entry.drawType === "lottery" ? "—" : entry.requiredPoints}
                    </td>

                    {/* PCV with trend arrow */}
                    <td className="text-center px-2 py-2.5">
                      {entry.drawType === "lottery" ? (
                        <span className="text-muted-foreground/40">—</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                          <span className={`font-financial ${entry.pcv >= 1 ? "text-red-400 font-semibold" : ""}`}>
                            {entry.pcv.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* ETA Year */}
                    <td className="text-center px-2 py-2.5">
                      {entry.isDeadAsset ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 mx-auto" />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            Dead Asset: Point creep outpaces accumulation. Consider reallocating.
                          </TooltipContent>
                        </Tooltip>
                      ) : entry.drawType === "lottery" ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="font-financial text-chart-4">
                              {entry.cumulativeOdds !== undefined
                                ? `${Math.round(entry.cumulativeOdds * 100)}%`
                                : "—"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs max-w-xs">
                            10-year cumulative probability of drawing at least once.
                            Do not rely on this state for your annual hunt.
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className={`font-financial ${entry.etaYear - currentYear <= 2 ? "text-chart-3 font-semibold" : ""}`}>
                          {entry.etaYear}
                        </span>
                      )}
                    </td>

                    {/* Draw Type badge */}
                    <td className="text-center px-2 py-2.5">
                      {entry.drawType === "lottery" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-chart-4/15 text-chart-4 text-[9px] font-medium">
                          <Dice5 className="w-3 h-3" />
                          Lottery
                        </span>
                      ) : entry.drawType === "bonus" ? (
                        <span className="px-1.5 py-0.5 rounded bg-chart-2/15 text-chart-2 text-[9px] font-medium">
                          Bonus
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[9px] font-medium">
                          Pref
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
