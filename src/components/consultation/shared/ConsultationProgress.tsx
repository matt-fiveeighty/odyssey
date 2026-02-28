"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Check, Heart, Star, DollarSign, Tent, Plane, Wallet, MapPin, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
  { num: 10, label: "Results", icon: Sparkles },
];

interface ConsultationProgressProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function ConsultationProgress({ currentStep, onStepClick }: ConsultationProgressProps) {
  const circleRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prevStep = useRef(currentStep);

  // Animate on step change
  useEffect(() => {
    if (currentStep >= 10) return;
    const prev = prevStep.current;
    if (prev === currentStep) return;
    prevStep.current = currentStep;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;

    // Bounce the newly active circle
    const activeEl = circleRefs.current[currentStep - 1];
    if (activeEl) {
      gsap.fromTo(
        activeEl,
        { scale: 0.5, opacity: 0.6 },
        { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2)" },
      );
    }

    // Quick settle on the previously completed circle
    if (prev < currentStep) {
      const prevEl = circleRefs.current[prev - 1];
      if (prevEl) {
        gsap.fromTo(
          prevEl,
          { scale: 1.2 },
          { scale: 1, duration: 0.3, ease: "power2.out" },
        );
      }
    }
  }, [currentStep]);

  if (currentStep >= 10) return null;

  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-1 scrollbar-hide">
      {STEPS.slice(0, 9).map((s, i) => {
        const isActive = currentStep === s.num;
        const isComplete = currentStep > s.num;
        const canClick = isComplete;
        const Icon = s.icon;

        return (
          <div key={s.num} className="flex items-start">
            {/* Step column: circle + label */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button
                ref={(el) => { circleRefs.current[i] = el; }}
                onClick={() => canClick && onStepClick(s.num)}
                disabled={!canClick}
                aria-label={`Step ${s.num}: ${s.label}`}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "step-circle relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors duration-300",
                  isActive && "bg-primary text-primary-foreground",
                  isComplete && "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",
                  !isActive && !isComplete && "bg-secondary text-muted-foreground/50",
                )}
                style={isActive ? { boxShadow: "0 0 14px oklch(0.65 0.18 145 / 0.4)" } : undefined}
              >
                {isComplete ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ) : isActive ? (
                  <div className="active-step-dot w-3 h-3 rounded-full bg-primary-foreground" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </button>
              {/* Label — visible on lg+ */}
              <span className={cn(
                "hidden lg:block text-[9px] font-medium max-w-[52px] text-center leading-tight truncate",
                isActive ? "text-primary" : isComplete ? "text-primary/60" : "text-muted-foreground/40",
              )}>
                {s.label}
              </span>
            </div>

            {/* Connector line */}
            {i < 8 && (
              <div className="relative h-0.5 min-w-[10px] w-4 sm:w-6 lg:w-8 rounded-full bg-border/40 overflow-hidden self-start mt-[15px] mx-0.5">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary/60 transition-[width] duration-500 ease-out"
                  style={{
                    width: isComplete ? "100%" : isActive ? "50%" : "0%",
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Results indicator (step 10) */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors duration-300",
            currentStep === 10
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground/50",
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <span className={cn(
          "hidden lg:block text-[9px] font-medium text-center",
          currentStep === 10 ? "text-primary" : "text-muted-foreground/40",
        )}>
          Results
        </span>
      </div>
    </div>
  );
}
