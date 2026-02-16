"use client";

import { Check, Heart, Star, DollarSign, Tent, Plane, Wallet, MapPin, Settings, Sparkles } from "lucide-react";

const STEPS = [
  { num: 1, label: "About You", icon: Heart },
  { num: 2, label: "The Call", icon: Star },
  { num: 3, label: "The Dream", icon: Star },
  { num: 4, label: "Investment", icon: DollarSign },
  { num: 5, label: "Hunt DNA", icon: Tent },
  { num: 6, label: "Travel", icon: Plane },
  { num: 7, label: "Points", icon: Wallet },
  { num: 8, label: "States", icon: MapPin },
  { num: 9, label: "Fine-Tune", icon: Settings },
];

interface ConsultationProgressProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function ConsultationProgress({ currentStep, onStepClick }: ConsultationProgressProps) {
  if (currentStep >= 10) return null;

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
      {STEPS.map((s) => {
        const isActive = currentStep === s.num;
        const isComplete = currentStep > s.num;
        const StepIcon = isComplete ? Check : s.icon;

        return (
          <div key={s.num} className="flex-1 min-w-0">
            <button
              onClick={() => { if (isComplete) onStepClick(s.num); }}
              disabled={!isComplete}
              className={`flex items-center gap-1 px-1.5 py-2 rounded-lg text-[10px] font-medium transition-all w-full ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isComplete
                    ? "bg-primary/15 text-primary cursor-pointer hover:bg-primary/25"
                    : "bg-secondary/50 text-muted-foreground/50"
              }`}
            >
              <StepIcon className="w-3 h-3 shrink-0" />
              <span className="hidden lg:inline truncate">{s.label}</span>
            </button>
          </div>
        );
      })}
      <div className="flex-1 min-w-0">
        <div className={`flex items-center gap-1 px-1.5 py-2 rounded-lg text-[10px] font-medium ${
          currentStep === 10 ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground/50"
        }`}>
          <Sparkles className="w-3 h-3 shrink-0" />
          <span className="hidden lg:inline truncate">Results</span>
        </div>
      </div>
    </div>
  );
}
