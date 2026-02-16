"use client";

import type { StrategicAssessment } from "@/lib/types";
import { AnimatedCounter } from "../shared/AnimatedCounter";
import { Sparkles } from "lucide-react";

interface HeroSummaryProps {
  assessment: StrategicAssessment;
}

export function HeroSummary({ assessment }: HeroSummaryProps) {
  const { financialSummary, stateRecommendations, macroSummary } = assessment;

  return (
    <div className="fade-in-up rounded-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1923] border border-primary/20 p-6 md:p-8 glow-primary-lg">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Your Strategic Hunt Plan</h2>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-6">{assessment.profileSummary}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center card-lift">
          <p className="text-2xl font-bold text-primary">
            <AnimatedCounter value={stateRecommendations.length} />
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">States</p>
        </div>
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center card-lift">
          <p className="text-2xl font-bold text-chart-2">
            <AnimatedCounter value={financialSummary.annualSubscription} prefix="$" />
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Annual Cost</p>
        </div>
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center card-lift">
          <p className="text-2xl font-bold text-chart-3">
            <AnimatedCounter value={macroSummary.plannedHunts} />
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Planned Hunts</p>
        </div>
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center card-lift">
          <p className="text-2xl font-bold text-chart-4">
            <AnimatedCounter value={financialSummary.tenYearTotal} prefix="$" />
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">10-Year Total</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/70 mt-4 italic">{assessment.strategyOverview}</p>
    </div>
  );
}
