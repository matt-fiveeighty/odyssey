"use client";

import { useState } from "react";
import type { StrategicAssessment } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { ChevronDown, Target } from "lucide-react";

interface TimelineRoadmapProps {
  assessment: StrategicAssessment;
}

const PHASE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  building: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  burn: { bg: "bg-chart-2/10", text: "text-chart-2", dot: "bg-chart-2" },
  gap: { bg: "bg-secondary/30", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  trophy: { bg: "bg-chart-3/10", text: "text-chart-3", dot: "bg-chart-3" },
};

export function TimelineRoadmap({ assessment }: TimelineRoadmapProps) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Visual timeline bar */}
      <div className="flex gap-1 mb-4">
        {assessment.roadmap.map((yr) => {
          const colors = PHASE_COLORS[yr.phase] ?? PHASE_COLORS.building;
          return (
            <div
              key={yr.year}
              className={`flex-1 h-8 rounded-lg ${colors.bg} flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => toggleYear(yr.year)}
            >
              <span className={`text-[9px] font-bold ${colors.text}`}>{yr.year}</span>
              {yr.isHuntYear && <Target className={`w-2.5 h-2.5 ml-0.5 ${colors.text}`} />}
            </div>
          );
        })}
      </div>

      {/* Key years callout */}
      {assessment.keyYears.length > 0 && (
        <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 mb-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Key Milestones</p>
          <div className="space-y-1">
            {assessment.keyYears.map((ky) => (
              <div key={ky.year} className="flex gap-2 text-xs">
                <span className="font-bold text-primary w-8">{ky.year}</span>
                <span className="text-muted-foreground">{ky.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Year accordion */}
      {assessment.roadmap.map((yr) => {
        const isExpanded = expandedYears.has(yr.year);
        const colors = PHASE_COLORS[yr.phase] ?? PHASE_COLORS.building;

        return (
          <div key={yr.year} className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggleYear(yr.year)}
              className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                <span className="font-bold text-sm">{yr.year}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colors.bg} ${colors.text} capitalize`}>
                  {yr.phase}
                </span>
                {yr.isHuntYear && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-chart-2/15 text-chart-2 font-medium">Hunt Year</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground">${yr.estimatedCost.toLocaleString()}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
              </div>
            </button>

            <div className={`transition-all duration-300 ease-out overflow-hidden ${isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="p-3 pt-0 space-y-2 border-t border-border/50">
                {yr.actions.map((action, ai) => {
                  const state = STATES_MAP[action.stateId];
                  const vis = STATE_VISUALS[action.stateId];
                  return (
                    <div key={ai} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/20">
                      {state && (
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
                          {state.abbreviation}
                        </div>
                      )}
                      {action.speciesId && (
                        <SpeciesAvatar speciesId={action.speciesId} size={20} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{action.description}</p>
                        <div className="flex gap-3 mt-0.5 text-[10px] text-muted-foreground">
                          {action.estimatedDrawOdds !== undefined && (
                            <span>{action.estimatedDrawOdds}% draw odds</span>
                          )}
                          <span>${action.cost.toLocaleString()}</span>
                          {action.dueDate && <span>Due: {action.dueDate}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
