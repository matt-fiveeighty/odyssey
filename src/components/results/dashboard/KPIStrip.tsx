"use client";

import { useMemo } from "react";
import type { StrategicAssessment } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { formatSpeciesName } from "@/lib/utils";
import { YEAR_TYPE_LABELS } from "@/lib/types";
import type { YearType } from "@/lib/types";
import { computeCapitalSummary } from "@/lib/engine/capital-allocator";
import { useWizardStore } from "@/lib/store";
import { Lock, Unlock, Crosshair, TrendingUp, DollarSign } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KPIStripProps {
  assessment: StrategicAssessment;
}

export function KPIStrip({ assessment }: KPIStripProps) {
  const { financialSummary, stateRecommendations, macroSummary, roadmap } = assessment;
  const homeState = useWizardStore((s) => s.homeState);

  const capitalSummary = useMemo(
    () => computeCapitalSummary(assessment, homeState),
    [assessment, homeState],
  );

  // Build per-year phase data for sparkline
  const yearPhases = useMemo(() => roadmap.map((yr) => ({
    year: yr.year,
    phase: yr.phase as YearType,
    isHuntYear: yr.isHuntYear,
    cost: yr.estimatedCost,
  })), [roadmap]);

  const currentYear = new Date().getFullYear();
  const maxCost = Math.max(...yearPhases.map((y) => y.cost), 1);

  // First hunt info
  const firstHunt = roadmap.find((yr) => yr.actions.some((a) => a.type === "hunt"));
  const huntAction = firstHunt?.actions.find((a) => a.type === "hunt");

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Card 1: Sunk Capital — non-refundable fees */}
        <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Sunk Capital</span>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-[10px] text-muted-foreground/40 cursor-help">[?]</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                Non-refundable fees: application fees, preference points, qualifying licenses.
                This money is committed regardless of draw outcome.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            <AnimatedCounter value={capitalSummary.sunkCapital} prefix="$" />
          </p>
          {/* Mini per-state breakdown bars */}
          <div className="flex items-end gap-1 mt-3 h-7">
            {capitalSummary.byState
              .filter((s) => s.sunk > 0)
              .sort((a, b) => b.sunk - a.sunk)
              .map((cs) => {
                const maxSunk = Math.max(...capitalSummary.byState.map((s) => s.sunk), 1);
                const hPct = Math.max(15, (cs.sunk / maxSunk) * 100);
                const state = STATES_MAP[cs.stateId];
                return (
                  <Tooltip key={cs.stateId}>
                    <TooltipTrigger asChild>
                      <div className="flex-1 flex flex-col items-center gap-0.5 cursor-default">
                        <div className="w-full rounded-t bg-red-400/30" style={{ height: `${hPct}%` }} />
                        <span className="text-[8px] text-muted-foreground/60">{state?.abbreviation ?? cs.stateId}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {state?.name}: ${cs.sunk.toLocaleString()} sunk
                    </TooltipContent>
                  </Tooltip>
                );
              })}
          </div>
        </div>

        {/* Card 2: Floated Capital — refundable if unsuccessful */}
        <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Unlock className="w-3.5 h-3.5 text-chart-2" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Floated</span>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-[10px] text-muted-foreground/40 cursor-help">[?]</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                Money tied up in states that require upfront tag fees but offer refunds
                if unsuccessful (e.g., New Mexico, Idaho). Recoverable capital.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-2xl font-bold text-chart-2 tracking-tight tabular-nums">
            <AnimatedCounter value={capitalSummary.floatedCapital} prefix="$" />
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1 tabular-nums">
            Total deployed: ${capitalSummary.totalDeployed.toLocaleString()}
          </p>
          {/* Sunk vs Floated ratio bar */}
          <div className="mt-3">
            <div className="h-2 rounded-full bg-secondary overflow-hidden flex">
              {capitalSummary.totalDeployed > 0 && (
                <>
                  <div
                    className="h-full bg-red-400/40 rounded-l-full"
                    style={{ width: `${(capitalSummary.sunkCapital / capitalSummary.totalDeployed) * 100}%` }}
                  />
                  <div
                    className="h-full bg-chart-2/50 rounded-r-full"
                    style={{ width: `${(capitalSummary.floatedCapital / capitalSummary.totalDeployed) * 100}%` }}
                  />
                </>
              )}
            </div>
            <div className="flex justify-between text-[8px] text-muted-foreground/50 mt-0.5">
              <span>Locked</span>
              <span>Recoverable</span>
            </div>
          </div>
        </div>

        {/* Card 3: First Hunt — when and what */}
        <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Crosshair className="w-3.5 h-3.5 text-chart-3" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">First Hunt</span>
          </div>
          <p className="text-2xl font-bold text-chart-3 tracking-tight tabular-nums">
            {firstHunt ? firstHunt.year : "—"}
          </p>
          {huntAction && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <SpeciesAvatar speciesId={huntAction.speciesId} size={18} />
              <span className="text-[10px] text-muted-foreground">
                {formatSpeciesName(huntAction.speciesId)} · {STATES_MAP[huntAction.stateId]?.abbreviation ?? huntAction.stateId}
              </span>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-1 tabular-nums">
            {macroSummary.plannedHunts} hunts / {roadmap.length} years
          </p>
        </div>

        {/* Card 4: 10-Year Total — sparkline cost per year */}
        <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-chart-4" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">10-Year Total</span>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-[10px] text-muted-foreground/40 cursor-help">[?]</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                Total portfolio cost over your planning horizon.
                Includes all application fees, licenses, points, and projected hunt costs.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-2xl font-bold text-chart-4 tracking-tight tabular-nums">
            <AnimatedCounter value={financialSummary.tenYearTotal} prefix="$" />
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5 tabular-nums">
            ~${Math.round(financialSummary.tenYearTotal / roadmap.length).toLocaleString()}/yr avg
          </p>
          {/* Sparkline */}
          <div className="flex items-end gap-0.5 mt-2.5 h-6">
            {yearPhases.map((yp) => {
              const hPct = Math.max(12, (yp.cost / maxCost) * 100);
              return (
                <Tooltip key={yp.year}>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex-1 rounded-t transition-all cursor-default ${
                        yp.year === currentYear
                          ? "bg-primary"
                          : yp.isHuntYear
                            ? "bg-chart-3/60"
                            : "bg-chart-4/30"
                      }`}
                      style={{ height: `${hPct}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs tabular-nums">
                    {yp.year}: ${yp.cost.toLocaleString()} {yp.isHuntYear ? "(hunt)" : "(build)"}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
