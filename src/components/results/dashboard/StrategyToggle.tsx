"use client";

import { useState } from "react";
import type { StrategicAssessment } from "@/lib/types";
import { ChevronDown, Sparkles } from "lucide-react";

interface StrategyToggleProps {
  assessment: StrategicAssessment;
}

export function StrategyToggle({ assessment }: StrategyToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-primary/5 transition-colors cursor-pointer"
      >
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold">My Strategy</p>
          <p className="text-xs text-muted-foreground truncate">{assessment.profileSummary}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-primary/10 fade-in-up">
          <p className="text-sm text-muted-foreground leading-relaxed">{assessment.strategyOverview}</p>
          {assessment.insights.length > 0 && (
            <ul className="space-y-1">
              {assessment.insights.map((ins, i) => (
                <li key={i} className="text-xs text-muted-foreground/80 flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {ins}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
