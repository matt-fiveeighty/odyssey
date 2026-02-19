"use client";

import { useState, memo } from "react";
import type { StrategicAssessment, StateRecommendation } from "@/lib/types";
import { AnimatedBar } from "../shared/AnimatedBar";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { useWizardStore } from "@/lib/store";
import { ChevronDown, Target, Mountain, Eye } from "lucide-react";
import { formatSpeciesName } from "@/lib/utils";
import type { AlsoConsideredState } from "@/lib/types";

interface StatePortfolioProps {
  assessment: StrategicAssessment;
}

function StateCard({ rec }: { rec: StateRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const state = STATES_MAP[rec.stateId];
  const vis = STATE_VISUALS[rec.stateId];
  const userSpecies = useWizardStore((s) => s.species);
  if (!state) return null;

  const stateSpecies = state.availableSpecies.filter((sp) => userSpecies.includes(sp));

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
          {stateSpecies.length > 0 && (
            <div className="flex gap-1 mb-1">
              {stateSpecies.map((sp) => (
                <SpeciesAvatar key={sp} speciesId={sp} size={18} />
              ))}
            </div>
          )}
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
                    {unit.drawConfidence && (
                      <div className="mt-1.5 flex items-center gap-2 text-[9px] text-muted-foreground/70">
                        <span>Draw range:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-chart-2 font-medium">Yr {unit.drawConfidence.optimistic}</span>
                          <span>&ndash;</span>
                          <span className="font-medium">Yr {unit.drawConfidence.expected}</span>
                          <span>&ndash;</span>
                          <span className="text-chart-4 font-medium">Yr {unit.drawConfidence.pessimistic}</span>
                        </div>
                        <span className="text-muted-foreground/40">(best / expected / worst)</span>
                      </div>
                    )}
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

const AlsoConsideredCard = memo(function AlsoConsideredCard({ state: ac }: { state: AlsoConsideredState }) {
  const state = STATES_MAP[ac.stateId];
  const vis = STATE_VISUALS[ac.stateId];
  if (!state) return null;

  const pct = Math.round((ac.totalScore / ac.maxPossibleScore) * 100);

  return (
    <div className="p-3 rounded-xl border border-dashed border-border/60 bg-secondary/10 hover:bg-secondary/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"} opacity-70`}>
          {state.abbreviation}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold">{state.name}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
              {pct}% match
            </span>
            <span className="text-xs text-muted-foreground ml-auto">${ac.annualCost}/yr</span>
          </div>
          {ac.speciesAvailable.length > 0 && (
            <div className="flex gap-1 mb-1">
              {ac.speciesAvailable.map((sp) => (
                <SpeciesAvatar key={sp} speciesId={sp} size={14} />
              ))}
              <span className="text-[10px] text-muted-foreground ml-1">
                {ac.speciesAvailable.map(formatSpeciesName).join(", ")}
              </span>
            </div>
          )}
          {ac.topReasons.length > 0 && (
            <p className="text-[10px] text-muted-foreground/80 line-clamp-2">
              {ac.topReasons.join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export function StatePortfolio({ assessment }: StatePortfolioProps) {
  const [showAlsoConsidered, setShowAlsoConsidered] = useState(false);
  const alsoConsidered = assessment.alsoConsidered ?? [];

  return (
    <div className="space-y-3">
      {assessment.stateRecommendations.map((rec) => (
        <StateCard key={rec.stateId} rec={rec} />
      ))}

      {alsoConsidered.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowAlsoConsidered(!showAlsoConsidered)}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">
              Also Considered ({alsoConsidered.length} states)
            </span>
            <span className="text-[10px] text-muted-foreground/70 ml-1">
              Scored well but didn&apos;t make your selection
            </span>
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform duration-200 ${showAlsoConsidered ? "rotate-180" : ""}`} />
          </button>

          <div className={`transition-all duration-300 ease-out overflow-hidden ${showAlsoConsidered ? "max-h-[2000px] opacity-100 mt-3" : "max-h-0 opacity-0"}`}>
            <div className="space-y-2">
              {alsoConsidered.map((ac) => (
                <AlsoConsideredCard key={ac.stateId} state={ac} />
              ))}
              <p className="text-[10px] text-muted-foreground/60 italic text-center pt-1">
                You can include these states by going back and toggling them on in the state selection step.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
