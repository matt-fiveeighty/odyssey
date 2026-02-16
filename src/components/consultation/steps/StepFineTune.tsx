"use client";

import { useEffect, useState } from "react";
import { useWizardStore } from "@/lib/store";
import { generateFineTuneQuestions } from "@/lib/engine/state-preview";
import type { FineTuneQuestion } from "@/lib/engine/state-preview";
import { Card, CardContent } from "@/components/ui/card";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { Settings, Check } from "lucide-react";
import { buildConsultationInput } from "@/lib/engine/build-consultation-input";

export function StepFineTune() {
  const wizard = useWizardStore();
  const [questions, setQuestions] = useState<FineTuneQuestion[]>([]);

  useEffect(() => {
    const input = buildConsultationInput(wizard);
    const qs = generateFineTuneQuestions(wizard.selectedStatesConfirmed, input);
    setQuestions(qs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (questions.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <Settings className="w-8 h-8 text-primary mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-2">Looking good &mdash; no fine-tuning needed.</h2>
          <p className="text-sm text-muted-foreground">Your selections are clear. Ready to generate your strategy.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-6">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Step 9 of 9</p>
          <h2 className="text-xl font-bold">A few follow-up questions to dial in your strategy.</h2>
          <p className="text-sm text-muted-foreground mt-1">Based on the states you selected, we have some specific questions to optimize your plan.</p>
        </div>

        <div className="space-y-4">
          {questions.map((q) => {
            const state = q.stateId ? STATES_MAP[q.stateId] : null;
            const vis = q.stateId ? STATE_VISUALS[q.stateId] : null;
            const answered = wizard.fineTuneAnswers[q.id];

            return (
              <div key={q.id} className="p-4 rounded-xl border border-border bg-secondary/20">
                <div className="flex items-start gap-3 mb-3">
                  {state && (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
                      {state.abbreviation}
                    </div>
                  )}
                  <p className="text-sm font-medium leading-relaxed">{q.question}</p>
                </div>
                <div className="space-y-2 ml-0 md:ml-11">
                  {q.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => wizard.setFineTuneAnswer(q.id, opt.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                        answered === opt.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground">{opt.description}</p>
                      </div>
                      {answered === opt.id && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
