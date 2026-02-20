"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ExternalLink, Calendar, Download } from "lucide-react";
import { MoveTagBadge } from "./MoveTagBadge";
import type { RoadmapYear, YearType } from "@/lib/types";
import { YEAR_TYPE_LABELS, migratePhaseToYearType } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName, cn } from "@/lib/utils";
import { exportDeadline } from "@/lib/calendar-export";

const YEAR_TYPE_COLORS: Record<YearType, string> = {
  build: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  positioning: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  burn: "bg-primary/15 text-primary border-primary/30",
  recovery: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  youth_window: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

/** Format YYYY-MM-DD → "April 7, 2026" (NAM) */
function formatNAM(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface RoadmapTimelineProps {
  roadmap: RoadmapYear[];
}

export function RoadmapTimeline({ roadmap }: RoadmapTimelineProps) {
  const currentYear = new Date().getFullYear();
  const [expandedYear, setExpandedYear] = useState<number | null>(currentYear);

  const totalCost = roadmap.reduce((s, y) => s + y.estimatedCost, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {roadmap.length}-Year Roadmap
        </p>
        <p className="text-xs text-muted-foreground">
          ${totalCost.toLocaleString()} total
        </p>
      </div>

      {/* Compact grid of year tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {roadmap.map((year) => {
          const yearType = migratePhaseToYearType(year.phase);
          const label = year.phaseLabel ?? YEAR_TYPE_LABELS[yearType];
          const colors = YEAR_TYPE_COLORS[yearType];
          const huntCount = year.actions.filter((a) => a.type === "hunt").length;
          const applyCount = year.actions.filter((a) => a.type === "apply").length;
          const pointsCount = year.actions.filter((a) => a.type === "buy_points").length;
          const isCurrent = year.year === currentYear;
          const isExpanded = expandedYear === year.year;

          return (
            <button
              key={year.year}
              onClick={() => setExpandedYear(isExpanded ? null : year.year)}
              className={cn(
                "relative text-left p-3 rounded-xl border transition-all cursor-pointer",
                isExpanded
                  ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                  : isCurrent
                    ? "bg-card border-primary/20 hover:border-primary/40"
                    : "bg-card border-border/50 hover:border-border hover:bg-card/80",
              )}
            >
              {/* Year + phase */}
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-lg font-bold tabular-nums",
                  isCurrent ? "text-primary" : "text-foreground/80",
                )}>
                  {year.year}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
                )}
              </div>

              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold border mb-2",
                  colors,
                )}
              >
                {label}
              </span>

              {/* Action summary dots */}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {huntCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {huntCount}
                  </span>
                )}
                {applyCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    {applyCount}
                  </span>
                )}
                {pointsCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {pointsCount}
                  </span>
                )}
              </div>

              {/* Cost */}
              <p className="text-xs font-medium tabular-nums mt-1.5 text-muted-foreground">
                ${year.estimatedCost.toLocaleString()}
              </p>
            </button>
          );
        })}
      </div>

      {/* Legend for the dots */}
      <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground/70">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Hunts</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>Draw Applications</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Build Points</span>
        </div>
      </div>

      {/* Expanded year detail */}
      {expandedYear && (() => {
        const year = roadmap.find((y) => y.year === expandedYear);
        if (!year || year.actions.length === 0) return null;

        const yearType = migratePhaseToYearType(year.phase);
        const label = year.phaseLabel ?? YEAR_TYPE_LABELS[yearType];
        const colors = YEAR_TYPE_COLORS[yearType];

        // Group actions by state
        const byState: Record<string, typeof year.actions> = {};
        for (const a of year.actions) {
          if (!byState[a.stateId]) byState[a.stateId] = [];
          byState[a.stateId].push(a);
        }

        return (
          <Card className="border-border/50 fade-in-up">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl font-bold tabular-nums">{year.year}</span>
                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold border", colors)}>
                  {label}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {year.actions.length} moves &middot; ${year.estimatedCost.toLocaleString()}
                </span>
              </div>

              <div className="space-y-4">
                {Object.entries(byState).map(([stateId, actions]) => {
                  const state = STATES_MAP[stateId];
                  return (
                    <div key={stateId}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className="text-[10px] font-bold px-1.5 py-0"
                          style={{ backgroundColor: state?.color ?? "#666", color: "white" }}
                        >
                          {state?.abbreviation ?? stateId}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{state?.name}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-1">
                        {actions.map((action, i) => (
                          <div
                            key={`${action.stateId}-${action.speciesId}-${action.type}-${i}`}
                            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="text-xs font-medium">
                                  {formatSpeciesName(action.speciesId)}
                                </span>
                                {action.moveTag && (
                                  <MoveTagBadge tag={action.moveTag} locked={action.locked} />
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {action.description}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                {action.cost > 0 && (
                                  <span className="font-medium">${Math.round(action.cost).toLocaleString()}</span>
                                )}
                                {action.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-2.5 h-2.5" />
                                    {formatNAM(action.dueDate)}
                                  </span>
                                )}
                                {action.dueDate && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      exportDeadline({
                                        stateName: state?.name ?? action.stateId,
                                        species: formatSpeciesName(action.speciesId),
                                        openDate: action.dueDate!,
                                        closeDate: action.dueDate!,
                                        url: action.url,
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                    title="Export to calendar (.ics)"
                                  >
                                    <Download className="w-2.5 h-2.5" />
                                    .ics
                                  </button>
                                )}
                              </div>
                            </div>
                            {action.url && (
                              <a
                                href={action.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                                aria-label="Open in Fish & Game"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
