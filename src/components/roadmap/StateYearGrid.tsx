"use client";

/**
 * StateYearGrid — state-by-state year view with horizontal scrollable columns.
 *
 * Rows = states (color-coded with gradient badges).
 * Columns = years from the roadmap.
 * Cells show action icons/dots with hover tooltips revealing details.
 */

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, DollarSign, Binoculars, FileText } from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { formatSpeciesName } from "@/lib/utils";
import type { RoadmapYear, RoadmapAction, YearType } from "@/lib/types";
import { migratePhaseToYearType, YEAR_TYPE_LABELS } from "@/lib/types";

interface StateYearGridProps {
  roadmap: RoadmapYear[];
}

const ACTION_ICONS: Record<string, { icon: typeof Target; color: string; bg: string }> = {
  hunt: { icon: Target, color: "text-primary", bg: "bg-primary/15" },
  apply: { icon: FileText, color: "text-warning", bg: "bg-warning/15" },
  buy_points: { icon: DollarSign, color: "text-chart-2", bg: "bg-chart-2/15" },
  scout: { icon: Binoculars, color: "text-info", bg: "bg-info/15" },
};

const YEAR_TYPE_COLORS: Record<YearType, string> = {
  build: "bg-blue-500/8",
  positioning: "bg-indigo-500/8",
  burn: "bg-primary/8",
  recovery: "bg-purple-500/8",
  youth_window: "bg-amber-500/8",
};

export function StateYearGrid({ roadmap }: StateYearGridProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Extract unique states from all roadmap actions
  const stateIds = useMemo(() => {
    const set = new Set<string>();
    for (const yr of roadmap) {
      for (const a of yr.actions) {
        set.add(a.stateId);
      }
    }
    return Array.from(set);
  }, [roadmap]);

  // Build lookup: stateId → year → actions[]
  const grid = useMemo(() => {
    const map: Record<string, Record<number, RoadmapAction[]>> = {};
    for (const sid of stateIds) {
      map[sid] = {};
      for (const yr of roadmap) {
        map[sid][yr.year] = yr.actions.filter((a) => a.stateId === sid);
      }
    }
    return map;
  }, [roadmap, stateIds]);

  if (stateIds.length === 0) return null;

  return (
    <Card className="border-border/30 overflow-hidden">
      <div className="p-4 pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          State &times; Year Overview
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          Hover over any cell to see actions for that state and year.
        </p>
      </div>

      <div className="overflow-x-auto pb-4 px-4">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr>
              {/* State column header */}
              <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-2 pr-3 sticky left-0 bg-card z-10 w-28">
                State
              </th>
              {/* Year column headers */}
              {roadmap.map((yr) => {
                const yearType = migratePhaseToYearType(yr.phase);
                const label = yr.phaseLabel ?? YEAR_TYPE_LABELS[yearType];
                return (
                  <th key={yr.year} className="text-center py-2 px-1">
                    <div className="text-xs font-bold tabular-nums">{yr.year}</div>
                    <div className="text-[8px] text-muted-foreground/60">{label}</div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {stateIds.map((stateId) => {
              const state = STATES_MAP[stateId];
              const vis = STATE_VISUALS[stateId];
              if (!state) return null;

              return (
                <tr key={stateId} className="border-t border-border/20">
                  {/* State label — sticky left */}
                  <td className="py-2 pr-3 sticky left-0 bg-card z-10">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white bg-gradient-to-br ${
                          vis?.gradient ?? "from-slate-700 to-slate-900"
                        }`}
                      >
                        {state.abbreviation}
                      </div>
                      <span className="text-xs font-medium truncate max-w-[80px]">
                        {state.name}
                      </span>
                    </div>
                  </td>

                  {/* Year cells */}
                  {roadmap.map((yr) => {
                    const cellActions = grid[stateId][yr.year] ?? [];
                    const cellKey = `${stateId}-${yr.year}`;
                    const isHovered = hoveredCell === cellKey;
                    const yearType = migratePhaseToYearType(yr.phase);
                    const yearBg = YEAR_TYPE_COLORS[yearType];

                    return (
                      <td
                        key={yr.year}
                        className="relative py-2 px-1 text-center"
                        onMouseEnter={() => setHoveredCell(cellKey)}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          className={`rounded-lg p-1.5 min-h-[40px] flex items-center justify-center gap-1 transition-all ${
                            isHovered && cellActions.length > 0
                              ? "bg-primary/10 ring-1 ring-primary/30 scale-105"
                              : cellActions.length > 0
                              ? `${yearBg} hover:bg-primary/8`
                              : "bg-secondary/10"
                          }`}
                        >
                          {cellActions.length === 0 ? (
                            <span className="text-[9px] text-muted-foreground/20">&mdash;</span>
                          ) : (
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {cellActions.map((action, ai) => {
                                const cfg = ACTION_ICONS[action.type] ?? ACTION_ICONS.buy_points;
                                const Icon = cfg.icon;
                                return (
                                  <div
                                    key={ai}
                                    className={`w-5 h-5 rounded flex items-center justify-center ${cfg.bg}`}
                                    title={`${formatSpeciesName(action.speciesId)} — ${action.type.replace("_", " ")}`}
                                  >
                                    <Icon className={`w-3 h-3 ${cfg.color}`} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Hover tooltip */}
                        {isHovered && cellActions.length > 0 && (
                          <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-xl bg-card border border-border shadow-xl fade-in-up pointer-events-none">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                className="text-[9px] font-bold"
                                style={{ backgroundColor: state.color, color: "white" }}
                              >
                                {state.abbreviation}
                              </Badge>
                              <span className="text-xs font-bold">{yr.year}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                ${cellActions.reduce((s, a) => s + a.cost, 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {cellActions.map((action, ai) => {
                                const cfg = ACTION_ICONS[action.type] ?? ACTION_ICONS.buy_points;
                                const Icon = cfg.icon;
                                return (
                                  <div key={ai} className="flex items-start gap-2">
                                    <Icon className={`w-3 h-3 mt-0.5 ${cfg.color} shrink-0`} />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <SpeciesAvatar speciesId={action.speciesId} size={14} />
                                        <span className="text-[10px] font-medium truncate">
                                          {formatSpeciesName(action.speciesId)}
                                        </span>
                                      </div>
                                      <p className="text-[9px] text-muted-foreground/70 line-clamp-2 mt-0.5">
                                        {action.description}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
