"use client";

import {
  planBlind,
  planDisciplined,
  type SamplePlan,
  type SamplePlanYear,
} from "@/lib/constants/sample-comparison-plans";

/* ------------------------------------------------------------------ */
/*  Mini timeline pill                                                 */
/* ------------------------------------------------------------------ */

function TimelinePill({ year }: { year: SamplePlanYear }) {
  const base = "flex flex-col items-center gap-1";
  const dotBase = "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold";

  if (year.phase === "draw") {
    return (
      <div className={base}>
        <div className={`${dotBase} bg-primary text-primary-foreground`}>
          {year.year}
        </div>
        <span className="text-[9px] text-primary font-medium leading-tight text-center">
          {year.species}
        </span>
      </div>
    );
  }

  if (year.phase === "build") {
    return (
      <div className={base}>
        <div className={`${dotBase} bg-muted-foreground/20 text-muted-foreground`}>
          {year.year}
        </div>
        <span className="text-[9px] text-muted-foreground/60 leading-tight text-center">
          {year.state}
        </span>
      </div>
    );
  }

  // idle
  return (
    <div className={base}>
      <div className={`${dotBase} bg-muted-foreground/10 text-muted-foreground/40`}>
        {year.year}
      </div>
      <span className="text-[9px] text-muted-foreground/30 leading-tight">&mdash;</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Blind-side timeline (chaotic — random-ish positions)               */
/* ------------------------------------------------------------------ */

function BlindTimeline({ plan }: { plan: SamplePlan }) {
  return (
    <div className="flex items-end gap-2 flex-wrap justify-center">
      {plan.timeline.map((yr) => (
        <TimelinePill key={yr.year} year={yr} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Disciplined timeline (clean, color-coded)                          */
/* ------------------------------------------------------------------ */

function DisciplinedTimeline({ plan }: { plan: SamplePlan }) {
  return (
    <div className="flex items-end gap-2 flex-wrap justify-center">
      {plan.timeline.map((yr) => (
        <TimelinePill key={yr.year} year={yr} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat row                                                           */
/* ------------------------------------------------------------------ */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function OutcomeComparison() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT — Applying Blind */}
        <div className="p-6 rounded-xl bg-card border border-border space-y-5">
          <h3 className="text-sm font-bold text-muted-foreground">
            {planBlind.label}
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <Stat label="Annual Spend" value={`$${Math.round(planBlind.annualSpend).toLocaleString()}/yr`} />
            <Stat label="States" value={String(planBlind.states)} />
            <Stat label="Burn Cycle" value="None" />
          </div>

          <div className="pt-2">
            <BlindTimeline plan={planBlind} />
          </div>

          <p className="text-center text-lg font-bold text-muted-foreground/60 pt-2">
            {planBlind.summary}
          </p>
        </div>

        {/* RIGHT — Disciplined Strategy */}
        <div className="p-6 rounded-xl bg-card border border-primary/20 space-y-5">
          <h3 className="text-sm font-bold text-primary">
            {planDisciplined.label}
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <Stat label="Annual Spend" value={`$${Math.round(planDisciplined.annualSpend).toLocaleString()}/yr`} />
            <Stat label="States" value={String(planDisciplined.states)} />
            <Stat label="Burn Cycle" value="Coordinated" />
          </div>

          <div className="pt-2">
            <DisciplinedTimeline plan={planDisciplined} />
          </div>

          <p className="text-center text-lg font-bold text-primary pt-2">
            {planDisciplined.summary}
          </p>
        </div>
      </div>

      <p className="text-center text-sm font-semibold text-muted-foreground">
        Same budget. Different outcome.
      </p>
    </div>
  );
}
