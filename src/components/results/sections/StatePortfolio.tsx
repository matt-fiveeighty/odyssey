"use client";

import { useState } from "react";
import type { StrategicAssessment, StateRecommendation } from "@/lib/types";
import { AnimatedBar } from "../shared/AnimatedBar";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { ChevronDown, Target, Mountain } from "lucide-react";

interface StatePortfolioProps {
  assessment: StrategicAssessment;
}

function StateCard({ rec }: { rec: StateRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const state = STATES_MAP[rec.stateId];
  const vis = STATE_VISUALS[rec.stateId];
  if (!state) return null;

  const roleColors: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    secondary: "bg-chart-2/15 text-chart-2",
    wildcard: "bg-chart-3/15 text-chart-3",
    long_term: "bg-chart-4/15 text-chart-4",
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 hover:bg-secondary/20 transition-colors text-left"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
          {state.abbreviation}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold">{state.name}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${roleColors[rec.role] ?? "bg-secondary text-muted-foreground"}`}>
              {rec.roleDescription}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">${rec.annualCost}/yr</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{rec.reason}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 mt-1 ${expanded ? "rotate-180" : ""}`} />
      </button>

      <div className={`transition-all duration-300 ease-out overflow-hidden ${expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="p-4 pt-0 space-y-4 border-t border-border/50">
          {/* Score breakdown */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Score Breakdown</p>
            <div className="space-y-1.5">
              {rec.scoreBreakdown.factors.map((f, fi) => (
                <AnimatedBar
                  key={fi}
                  value={f.score}
                  maxValue={f.maxScore}
                  label={f.label}
                  sublabel={f.explanation}
                  delay={fi * 80}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-border/30">
              <span className="text-[10px] font-semibold">Total Score</span>
              <span className="text-xs font-bold text-primary">{rec.scoreBreakdown.totalScore}/{rec.scoreBreakdown.maxPossibleScore}</span>
            </div>
          </div>

          {/* Point Strategy */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Point Strategy</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{rec.pointStrategy}</p>
          </div>

          {/* Best Units */}
          {rec.bestUnits.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Recommended Units</p>
              <div className="space-y-2">
                {rec.bestUnits.map((unit, ui) => (
                  <div key={ui} className="p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{unit.unitName || unit.unitCode}</span>
                      <span className="text-[10px] text-muted-foreground">{unit.drawTimeline}</span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span><Target className="w-3 h-3 inline mr-0.5" />{Math.round(unit.successRate * 100)}% success</span>
                      <span><Mountain className="w-3 h-3 inline mr-0.5" />{unit.trophyRating}/10 trophy</span>
                    </div>
                    {unit.tacticalNotes && (
                      <div className="mt-2 space-y-1">
                        {unit.tacticalNotes.proTip && (
                          <p className="text-[10px] text-primary/80 italic">{unit.tacticalNotes.proTip}</p>
                        )}
                        {unit.tacticalNotes.accessMethod && (
                          <p className="text-[10px] text-muted-foreground/70">{unit.tacticalNotes.accessMethod}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatePortfolio({ assessment }: StatePortfolioProps) {
  return (
    <div className="space-y-3">
      {assessment.stateRecommendations.map((rec) => (
        <StateCard key={rec.stateId} rec={rec} />
      ))}
    </div>
  );
}
