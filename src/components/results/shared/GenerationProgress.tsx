"use client";

import { useWizardStore } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

const HUNTING_TIPS = [
  "The best scouting happens from your couch — Google Earth, onX, and state harvest data are your pre-season weapons.",
  "Pack 20% less than you think you need. Mobility kills more animals than gear.",
  "Glass more, walk less. The animal you're looking for is usually within sight if you slow down.",
  "Water sources in September are like ATMs for elk. Find the water, find the herd.",
  "Wind is everything. A perfect stalk into a headwind beats a mediocre stalk any day.",
];

export function GenerationProgress() {
  const phase = useWizardStore((s) => s.generationPhase);
  const progress = useWizardStore((s) => s.generationProgress);
  const tip = HUNTING_TIPS[Math.floor(progress / 20) % HUNTING_TIPS.length];

  return (
    <div className="fade-in-up rounded-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1923] border border-primary/20 p-8 md:p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
      </div>

      <h3 className="text-lg font-semibold mb-2">Building Your Strategy</h3>
      <p className="text-sm text-primary font-medium mb-6">{phase || "Initializing..."}</p>

      <div className="max-w-md mx-auto mb-6">
        <Progress value={progress} className="h-2" />
        <p className="text-[10px] text-muted-foreground mt-2 text-right">{Math.round(progress)}%</p>
      </div>

      <div className="max-w-sm mx-auto p-3 rounded-lg bg-secondary/30 border border-border/50">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Did you know?</p>
        <p className="text-xs text-muted-foreground/80 italic">{tip}</p>
      </div>
    </div>
  );
}
