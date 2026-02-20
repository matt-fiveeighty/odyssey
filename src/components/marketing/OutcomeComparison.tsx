"use client";

import { CheckCircle2, X } from "lucide-react";

const blindItems = [
  "Apply to 5+ states with no scoring criteria",
  "Spend $500–$1,000/yr on apps that never convert",
  "Build points in states mismatched to your profile",
  "Miss burn windows because you didn't know they existed",
  "React to forum advice instead of following a plan",
  "No visibility into when or where you'll actually draw",
];

const strategyItems = [
  "Every state scored against your species, budget, and fitness",
  "Point-year and hunt-year spending mapped to conversion windows",
  "Build phase, burn phase, recovery — phased across your portfolio",
  "Draw timelines projected so you know when to expect a tag",
  "Discipline rules flag when your strategy drifts off course",
  "One view of every state, every species, every dollar",
];

export function OutcomeComparison() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Applying Blind */}
      <div className="p-6 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <X className="w-4 h-4 text-red-400" />
          </div>
          <h3 className="text-sm font-bold text-red-400">Applying Blind</h3>
        </div>
        <ul className="space-y-3">
          {blindItems.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <X className="w-4 h-4 text-red-400/60 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* With a Strategy */}
      <div className="p-6 rounded-xl bg-card border border-primary/20">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-primary">With a Strategy</h3>
        </div>
        <ul className="space-y-3">
          {strategyItems.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary/70 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
