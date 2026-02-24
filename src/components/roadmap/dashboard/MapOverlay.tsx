"use client";

import { useState, useMemo } from "react";
import type { StrategicAssessment } from "@/lib/types";
import type { JourneyData } from "@/lib/engine/journey-data";
import { InteractiveMap } from "@/components/journey/InteractiveMap";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { formatSpeciesName, cn } from "@/lib/utils";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { YEAR_TYPE_LABELS, migratePhaseToYearType } from "@/lib/types";
import { exportDeadline } from "@/lib/calendar-export";
import { ACTION_TYPE_COLORS, DEFAULT_ACTION_STYLE, MAP_LEGEND } from "./action-colors";
import { X, ChevronDown, Download, ExternalLink, Calendar } from "lucide-react";

interface MapOverlayProps {
  assessment: StrategicAssessment;
  journeyData: JourneyData;
  selectedYear: number;
  onYearChange: (year: number) => void;
  onClose: () => void;
  onStateClick: (stateId: string) => void;
}

export function MapOverlay({
  assessment,
  journeyData,
  selectedYear,
  onYearChange,
  onClose,
  onStateClick,
}: MapOverlayProps) {
  const [expandedState, setExpandedState] = useState<string | null>(null);

  const yearData = useMemo(
    () => journeyData.years.find((y) => y.year === selectedYear) ?? null,
    [journeyData, selectedYear],
  );

  const yearRoadmap = assessment.roadmap.find((yr) => yr.year === selectedYear);
  const yearType = yearRoadmap ? migratePhaseToYearType(yearRoadmap.phase) : null;
  const phaseLabel = yearRoadmap?.phaseLabel ?? (yearType ? YEAR_TYPE_LABELS[yearType] : "");

  // Group actions by state for the right sidebar
  const byState = useMemo(() => {
    if (!yearRoadmap) return [];
    const map = new Map<string, typeof yearRoadmap.actions>();
    for (const a of yearRoadmap.actions) {
      const existing = map.get(a.stateId) ?? [];
      existing.push(a);
      map.set(a.stateId, existing);
    }
    return Array.from(map.entries());
  }, [yearRoadmap]);

  return (
    <div className="fixed inset-0 z-50 bg-background/97 backdrop-blur-md flex flex-col fade-in-up">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-card border border-border/60 flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer shadow-sm"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] overflow-hidden">
        {/* Left: Map — darker zone */}
        <div className="p-6 flex flex-col bg-background">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
              Hunt Year
            </p>
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="h-8 px-3 rounded-lg bg-secondary/50 border border-border/50 text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:border-primary/50"
            >
              {assessment.roadmap.map((yr) => (
                <option key={yr.year} value={yr.year}>{yr.year}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-border/30 bg-background/80">
            <InteractiveMap
              yearData={yearData}
              onStateClick={onStateClick}
              selectedYear={selectedYear}
            />
          </div>
          {/* Legend — shared MAP_LEGEND for consistent colors */}
          <div className="flex gap-4 mt-3 text-[9px] text-muted-foreground/60 uppercase tracking-wider">
            {MAP_LEGEND.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-sm", item.bg)} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Road Map Content — distinct card zone */}
        <div className="lg:border-l border-border/50 overflow-y-auto scrollbar-thin bg-card">
          {/* Header zone */}
          <div className="p-5 border-b border-border/40 bg-secondary/30">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                Road Map Content
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/60 border border-border/30 text-muted-foreground font-medium">
                {yearRoadmap?.actions.length ?? 0} moves
              </span>
            </div>
            <h2 className="text-xl font-bold mb-2">
              {selectedYear} In Review
            </h2>
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              {phaseLabel} year.{" "}
              {yearRoadmap?.isHuntYear
                ? "This is a hunt year — time to execute on your draws."
                : "Building points and positioning for future draws."}{" "}
              {yearRoadmap && `Estimated cost: $${Math.round(yearRoadmap.estimatedCost).toLocaleString()}.`}
            </p>
          </div>

          {/* State-by-state breakdown — content zone */}
          <div className="p-5 space-y-2.5">
            {byState.map(([stateId, actions]) => {
              const state = STATES_MAP[stateId];
              const vis = STATE_VISUALS[stateId];
              const isExpanded = expandedState === stateId;

              return (
                <div key={stateId} className="rounded-xl border border-border/50 bg-secondary/20 overflow-hidden">
                  <button
                    onClick={() => setExpandedState(isExpanded ? null : stateId)}
                    className="w-full flex items-center gap-2.5 p-3.5 hover:bg-secondary/40 transition-colors cursor-pointer"
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0 bg-gradient-to-br shadow-sm",
                        vis?.gradient ?? "from-slate-700 to-slate-900",
                      )}
                    >
                      {state?.abbreviation ?? stateId}
                    </div>
                    <span className="text-sm font-medium flex-1 text-left">
                      {state?.name ?? stateId}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">
                      {actions.length} move{actions.length !== 1 ? "s" : ""}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-muted-foreground/40 transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 space-y-2 fade-in-up border-t border-border/25 pt-3">
                      {actions.map((action, i) => {
                        const typeStyle = ACTION_TYPE_COLORS[action.type] ?? DEFAULT_ACTION_STYLE;
                        return (
                          <div
                            key={`${action.speciesId}-${action.type}-${i}`}
                            className="flex items-start gap-2.5 p-3 rounded-lg bg-card/60 border border-border/30"
                          >
                            {/* Type color indicator bar */}
                            <div className={cn("w-0.5 self-stretch rounded-full shrink-0", typeStyle.bg)} />
                            <SpeciesAvatar speciesId={action.speciesId} size={28} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-medium">
                                  {formatSpeciesName(action.speciesId)}
                                </p>
                                <span className={cn("text-[8px] uppercase tracking-wider font-medium", typeStyle.text)}>
                                  {typeStyle.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                {action.description}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                {action.cost > 0 && (
                                  <span className="font-semibold text-foreground">
                                    ${Math.round(action.cost).toLocaleString()}
                                  </span>
                                )}
                                {action.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-2.5 h-2.5" />
                                    {new Date(action.dueDate).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                )}
                                {action.dueDate && (
                                  <button
                                    onClick={() =>
                                      exportDeadline({
                                        stateName: state?.name ?? action.stateId,
                                        species: formatSpeciesName(action.speciesId),
                                        openDate: action.dueDate!,
                                        closeDate: action.dueDate!,
                                        url: action.url,
                                      })
                                    }
                                    className="flex items-center gap-0.5 text-muted-foreground/30 hover:text-primary transition-colors cursor-pointer"
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
                                className="shrink-0 text-muted-foreground/30 hover:text-primary transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
