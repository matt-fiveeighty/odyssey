"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  planBlind,
  planDisciplined,
  type SamplePlan,
  type SamplePlanYear,
} from "@/lib/constants/sample-comparison-plans";

/* ------------------------------------------------------------------ */
/*  Timeline pill                                                      */
/* ------------------------------------------------------------------ */

function TimelinePill({ year }: { year: SamplePlanYear }) {
  const base = "flex flex-col items-center gap-1";
  const dotBase =
    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold";

  if (year.phase === "draw") {
    return (
      <div className={base}>
        <div className={`${dotBase} bg-primary text-primary-foreground`}>
          {year.year}
        </div>
        <span className="text-[9px] text-primary font-medium leading-tight text-center max-w-[48px]">
          {year.species}
        </span>
      </div>
    );
  }

  if (year.phase === "build") {
    return (
      <div className={base}>
        <div
          className={`${dotBase} bg-muted-foreground/20 text-muted-foreground`}
        >
          {year.year}
        </div>
        <span className="text-[9px] text-muted-foreground/60 leading-tight text-center max-w-[48px]">
          {year.state}
        </span>
      </div>
    );
  }

  return (
    <div className={base}>
      <div
        className={`${dotBase} bg-muted-foreground/10 text-muted-foreground/40`}
      >
        {year.year}
      </div>
      <span className="text-[9px] text-muted-foreground/30 leading-tight">
        &mdash;
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Plan panel (used on both sides)                                    */
/* ------------------------------------------------------------------ */

function PlanPanel({
  plan,
  variant,
}: {
  plan: SamplePlan;
  variant: "blind" | "disciplined";
}) {
  const isPrimary = variant === "disciplined";

  return (
    <div className="h-full flex flex-col justify-between p-6 md:p-8">
      <div>
        <h3
          className={`text-sm font-bold mb-5 ${
            isPrimary ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {plan.label}
        </h3>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              Annual Spend
            </p>
            <p className="text-sm font-semibold">
              ${Math.round(plan.annualSpend).toLocaleString()}/yr
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              States
            </p>
            <p className="text-sm font-semibold">{plan.states}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              Projected Hunts
            </p>
            <p className="text-sm font-semibold">{plan.huntsProjected}</p>
          </div>
        </div>

        <div className="flex items-end gap-2 flex-wrap justify-center">
          {plan.timeline.map((yr) => (
            <TimelinePill key={yr.year} year={yr} />
          ))}
        </div>
      </div>

      <p
        className={`text-center text-lg font-bold pt-6 ${
          isPrimary ? "text-primary" : "text-muted-foreground/60"
        }`}
      >
        {plan.summary}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main slider component                                              */
/* ------------------------------------------------------------------ */

export function OutcomeSlider() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
      setSliderPos(pct);
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      updatePosition(e.clientX);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [updatePosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    },
    [isDragging, updatePosition]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Scroll-driven reveal: as user scrolls through, slider moves from 80% to 20%
  useEffect(() => {
    if (isDragging) return; // Don't override user drag

    const el = containerRef.current;
    if (!el) return;

    let hasInteracted = false;

    function handleScroll() {
      if (hasInteracted) return;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      // progress: 0 = just entering viewport, 1 = fully scrolled past
      const progress = 1 - rect.bottom / (viewH + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      // Map: 0 → 80%, 1 → 20%
      const pos = 80 - clamped * 60;
      setSliderPos(pos);
    }

    function handleInteraction() {
      hasInteracted = true;
    }

    el.addEventListener("pointerdown", handleInteraction);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      el.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border border-border overflow-hidden bg-card select-none touch-none"
      style={{ minHeight: 340 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Blind side (full width, underneath) */}
      <div className="absolute inset-0">
        <PlanPanel plan={planBlind} variant="blind" />
      </div>

      {/* Disciplined side (clipped by slider) */}
      <div
        className="absolute inset-0 border-r-0"
        style={{
          clipPath: `inset(0 0 0 ${sliderPos}%)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10" />
        <PlanPanel plan={planDisciplined} variant="disciplined" />
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 z-10 flex items-center"
        style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
      >
        {/* Vertical line */}
        <div className="absolute inset-y-0 w-0.5 bg-primary/60" />

        {/* Drag handle */}
        <div className="relative z-10 w-10 h-10 rounded-full bg-primary border-2 border-primary-foreground shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-primary-foreground"
          >
            <path
              d="M4 8L1 5.5M4 8L1 10.5M4 8H12M12 8L15 5.5M12 8L15 10.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 z-20">
        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded-md">
          Blind
        </span>
      </div>
      <div className="absolute top-3 right-3 z-20">
        <span className="text-[10px] font-bold text-primary/60 uppercase tracking-wider bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded-md">
          Strategic
        </span>
      </div>
    </div>
  );
}
