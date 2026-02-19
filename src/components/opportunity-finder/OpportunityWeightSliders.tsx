"use client";

import { useState } from "react";
import { SlidersHorizontal, RotateCcw, Timer, Shuffle, Trophy, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OpportunityWeights } from "@/lib/engine/opportunity-scorer";
import { DEFAULT_WEIGHTS } from "@/lib/engine/opportunity-scorer";

interface OpportunityWeightSlidersProps {
  weights: OpportunityWeights;
  onChange: (weights: OpportunityWeights) => void;
}

const SLIDER_CONFIG: {
  key: keyof OpportunityWeights;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "pointPosition",
    label: "Point Position",
    description: "How close you are to drawing",
    icon: Timer,
  },
  {
    key: "drawAccess",
    label: "Draw Access",
    description: "How easy the draw system is",
    icon: Shuffle,
  },
  {
    key: "huntQuality",
    label: "Hunt Quality",
    description: "Trophy potential & success rate",
    icon: Trophy,
  },
  {
    key: "cost",
    label: "Cost Efficiency",
    description: "Annual point cost",
    icon: DollarSign,
  },
];

export function OpportunityWeightSliders({ weights, onChange }: OpportunityWeightSlidersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isDefault = Object.entries(weights).every(
    ([k, v]) => v === DEFAULT_WEIGHTS[k as keyof OpportunityWeights]
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Ranking Weights</span>
          {!isDefault && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">
              Custom
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-4 border-t border-border pt-3 fade-in-up">
          <p className="text-xs text-muted-foreground">
            Adjust how opportunities are ranked. Higher weight = more influence on ranking.
          </p>

          {SLIDER_CONFIG.map(({ key, label, description, icon: Icon }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {weights[key].toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={weights[key]}
                onChange={(e) =>
                  onChange({ ...weights, [key]: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 rounded-full bg-secondary appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-sm"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{description}</p>
            </div>
          ))}

          {/* Presets */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onChange({ pointPosition: 1.5, drawAccess: 1.2, huntQuality: 0.5, cost: 1.0 })}
              className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
            >
              Fastest Tags
            </button>
            <button
              onClick={() => onChange({ pointPosition: 0.5, drawAccess: 0.5, huntQuality: 2.0, cost: 0.3 })}
              className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
            >
              Trophy Focus
            </button>
            <button
              onClick={() => onChange({ pointPosition: 0.8, drawAccess: 0.8, huntQuality: 0.5, cost: 2.0 })}
              className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
            >
              Budget Friendly
            </button>
            {!isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...DEFAULT_WEIGHTS })}
                className="gap-1 text-[10px] h-auto py-1 px-2"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
