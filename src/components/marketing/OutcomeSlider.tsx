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
  const base = "flex flex-col items-center gap-1 min-w-0";
  const dotBase =
    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0";

  if (year.phase === "draw") {
    return (
      <div className={base}>
        <div className={`${dotBase} bg-primary text-primary-foreground`}>
          {year.year}
        </div>
        <span className="text-[9px] text-primary font-medium leading-tight text-center truncate w-full">
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
        <span className="text-[9px] text-muted-foreground/60 leading-tight text-center truncate w-full">
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
/*  Vertical label (rotated text on the edge)                          */
/* ------------------------------------------------------------------ */

function VerticalLabel({
  text,
  side,
  variant,
}: {
  text: string;
  side: "left" | "right";
  variant: "blind" | "disciplined";
}) {
  const isPrimary = variant === "disciplined";
  return (
    <div
      className={`absolute top-0 bottom-0 ${side === "left" ? "left-0" : "right-0"} w-10 flex items-center justify-center z-10`}
    >
      <span
        className={`text-[11px] font-extrabold uppercase tracking-[0.2em] whitespace-nowrap ${
          isPrimary ? "text-primary/30" : "text-muted-foreground/20"
        }`}
        style={{
          writingMode: "vertical-lr",
          transform: side === "left" ? "rotate(180deg)" : undefined,
        }}
      >
        {text}
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
    <div className="h-full flex flex-col px-12 py-6 md:py-8">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
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

      {/* Timeline */}
      <div className="grid grid-cols-8 gap-1 mb-5">
        {plan.timeline.map((yr) => (
          <TimelinePill key={yr.year} year={yr} />
        ))}
      </div>

      {/* Summary — pushed to bottom with auto margin */}
      <p
        className={`text-center text-base font-bold mt-auto ${
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
      style={{ height: 280 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Blind side (full width, underneath) */}
      <div className="absolute inset-0">
        <VerticalLabel text="Applying Blind" side="left" variant="blind" />
        <PlanPanel plan={planBlind} variant="blind" />
      </div>

      {/* Disciplined side (clipped by slider) */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 0 0 ${sliderPos}%)`,
        }}
      >
        <div className="absolute inset-0 bg-card" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/8 to-primary/15" />
        <div className="relative z-10 h-full">
          <VerticalLabel text="Strategic Plan" side="right" variant="disciplined" />
          <PlanPanel plan={planDisciplined} variant="disciplined" />
        </div>
      </div>

      {/* Slider handle — line + centered grab circle */}
      <div
        className="absolute top-0 bottom-0 z-20 pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        {/* Vertical line — centered on the left edge */}
        <div className="absolute inset-y-0 w-0.5 bg-primary/60 -translate-x-1/2" />

        {/* Drag handle — centered on the line */}
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="w-10 h-10 rounded-full bg-primary border-2 border-primary-foreground shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing">
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
      </div>
    </div>
  );
}
