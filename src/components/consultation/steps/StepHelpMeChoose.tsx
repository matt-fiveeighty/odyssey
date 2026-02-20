"use client";

import { useEffect } from "react";
import { useWizardStore } from "@/lib/store";
import { generateStatePreview } from "@/lib/engine/state-preview";
import { Card, CardContent } from "@/components/ui/card";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { Check, X } from "lucide-react";
import { buildConsultationInput } from "@/lib/engine/build-consultation-input";

function getRoleSuggestion(stateId: string, score: number, maxScore: number): string {
  const state = STATES_MAP[stateId];
  if (!state) return "Secondary";
  if (state.pointSystem === "random") return "Wild Card";
  if (state.pointSystem === "bonus_squared") return "Long-Term";
  const pct = score / maxScore;
  if (pct > 0.65) return "Primary";
  return "Builder";
}

export function StepHelpMeChoose() {
  const wizard = useWizardStore();

  useEffect(() => {
    if (wizard.previewScores.length === 0) {
      const input = buildConsultationInput(wizard);
      const scores = generateStatePreview(input);
      wizard.setPreviewScores(scores);
      const avgBudget = (wizard.pointYearBudget + wizard.huntYearBudget) / 2;
      const maxStates = avgBudget < 2000 ? 3 : avgBudget < 5000 ? 5 : 7;
      const topIds = scores.slice(0, maxStates).map((s) => s.stateId);
      wizard.confirmStateSelection(topIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSelected = (stateId: string) => wizard.selectedStatesConfirmed.includes(stateId);

  function toggleState(stateId: string) {
    if (isSelected(stateId)) {
      wizard.confirmStateSelection(wizard.selectedStatesConfirmed.filter((s) => s !== stateId));
    } else {
      wizard.confirmStateSelection([...wizard.selectedStatesConfirmed, stateId]);
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-6">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Step 8 of 9</p>
          <h2 className="text-xl font-bold">State rankings for your profile.</h2>
          <p className="text-sm text-muted-foreground mt-1">We scored every state based on your answers. Toggle states on or off to build your portfolio.</p>
        </div>

        <div className="space-y-3">
          {wizard.previewScores.map((score, idx) => {
            const state = STATES_MAP[score.stateId];
            if (!state) return null;
            const vis = STATE_VISUALS[score.stateId];
            const selected = isSelected(score.stateId);
            const role = getRoleSuggestion(score.stateId, score.totalScore, score.maxPossibleScore);
            const pct = Math.round((score.totalScore / score.maxPossibleScore) * 100);
            const topFactors = score.factors
              .filter((f) => f.score > 0)
              .sort((a, b) => b.score / b.maxScore - a.score / a.maxScore)
              .slice(0, 3);

            return (
              <button
                key={score.stateId}
                onClick={() => toggleState(score.stateId)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selected ? "border-primary/50 bg-primary/5" : "border-border/50 opacity-50 hover:opacity-75"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
                    {state.abbreviation}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{state.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary font-medium text-muted-foreground">{role}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto font-mono">{pct}%</span>
                    </div>

                    <div className="h-2 rounded-full bg-secondary overflow-hidden mb-2">
                      <div className="h-full rounded-full bg-primary/70 bar-fill" style={{ width: `${pct}%`, animationDelay: `${idx * 100}ms` }} />
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {topFactors.map((f, fi) => (
                        <span key={fi} className="text-[10px] text-muted-foreground">
                          {f.label}: <span className="text-foreground font-medium">{f.score}/{f.maxScore}</span>
                        </span>
                      ))}
                    </div>

                    {state.statePersonality && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">{state.statePersonality.split(". ")[0]}.</p>
                    )}
                  </div>

                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-primary" : "bg-secondary"}`}>
                    {selected ? <Check className="w-4 h-4 text-primary-foreground" /> : <X className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{wizard.selectedStatesConfirmed.length}</span> states selected for your portfolio
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
