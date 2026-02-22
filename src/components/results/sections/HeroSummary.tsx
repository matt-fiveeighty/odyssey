"use client";

import { useState, useMemo, useEffect } from "react";
import type { StrategicAssessment } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { getDataStatus } from "@/lib/engine/data-loader";
import { Sparkles } from "lucide-react";

interface HeroSummaryProps {
  assessment: StrategicAssessment;
}

export function HeroSummary({ assessment }: HeroSummaryProps) {
  const { financialSummary, stateRecommendations, macroSummary, budgetBreakdown } = assessment;
  const dataStatus = getDataStatus();
  const milestones = useAppStore((s) => s.milestones);

  const [inflationRate, setInflationRate] = useState(0.035);
  const [inflationSource, setInflationSource] = useState<"loading" | "verified" | "estimated">("loading");

  useEffect(() => {
    fetch("/api/inflation/cpi")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.value != null) {
          setInflationRate(json.data.value);
          setInflationSource(json.data.confidence === "verified" ? "verified" : "estimated");
        } else {
          setInflationSource("estimated");
        }
      })
      .catch(() => setInflationSource("estimated"));
  }, []);

  // Compute inflation-adjusted 10-year total using the same logic as PortfolioOverview
  const inflatedTenYearTotal = useMemo(() => {
    const projection = budgetBreakdown.tenYearProjection;
    if (projection.length === 0) return financialSummary.tenYearTotal;
    const baseYear = projection[0].year;
    return projection.reduce((sum, yr) => {
      const yearsOut = yr.year - baseYear;
      return sum + Math.round(yr.cost * Math.pow(1 + inflationRate, yearsOut));
    }, 0);
  }, [inflationRate, budgetBreakdown.tenYearProjection, financialSummary.tenYearTotal]);

  const inflationDelta = inflatedTenYearTotal - financialSummary.tenYearTotal;

  // Compute actual YTD spending from completed milestones for the current year
  const { ytdSpent, year1Budget, hasSpendingData } = useMemo(() => {
    const year1 = assessment.roadmap[0];
    if (!year1) return { ytdSpent: 0, year1Budget: 0, hasSpendingData: false };

    const completedThisYear = milestones.filter(
      (m) => m.completed && m.year === year1.year
    );
    const spent = completedThisYear.reduce((sum, m) => sum + m.totalCost, 0);
    const budget = year1.estimatedCost;

    return { ytdSpent: spent, year1Budget: budget, hasSpendingData: spent > 0 };
  }, [milestones, assessment.roadmap]);

  const spendPct = year1Budget > 0 ? Math.round((ytdSpent / year1Budget) * 100) : 0;

  return (
    <div className="fade-in-up rounded-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1923] border border-primary/20 p-6 md:p-8 glow-primary-lg">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Your Roadmap</h2>
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
          {hasSpendingData && (
            <p className="text-[9px] text-chart-2/70 mt-0.5">
              ${ytdSpent.toLocaleString()} spent YTD
            </p>
          )}
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
          {inflationDelta > 100 && (
            <p className="text-[9px] text-chart-4/70 mt-0.5">
              ~${inflatedTenYearTotal.toLocaleString()} w/ inflation
            </p>
          )}
        </div>
      </div>

      {/* YTD Spending Progress — only visible once user starts completing milestones */}
      {hasSpendingData && year1Budget > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Year 1 Spending</span>
            <span className="text-[10px] font-medium">
              <span className="text-chart-2">${ytdSpent.toLocaleString()}</span>
              <span className="text-muted-foreground"> / ${year1Budget.toLocaleString()}</span>
              <span className="text-muted-foreground/60 ml-1">({spendPct}%)</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${spendPct > 100 ? "bg-chart-4" : "bg-chart-2"}`}
              style={{ width: `${Math.min(spendPct, 100)}%` }}
            />
          </div>
          {spendPct > 100 && (
            <p className="text-[9px] text-chart-4 mt-1">
              ${(ytdSpent - year1Budget).toLocaleString()} over budget
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground/70 mt-4 italic">{assessment.strategyOverview}</p>
      <p className="text-[9px] text-muted-foreground/50 mt-2">
        Costs in 2026 dollars. State fees typically rise 2-5% annually
        {inflationDelta > 100 && <> — expect ~${inflationDelta.toLocaleString()} additional over 10 years at {(inflationRate * 100).toFixed(1)}% inflation{inflationSource === "verified" ? " (BLS)" : ""}</>}.
      </p>
      {dataStatus.isUsingConstants && (
        <p className="text-[9px] text-muted-foreground/40 mt-1">
          Data source: baseline estimates. Connect to live data for real-time draw odds and fees.
        </p>
      )}
    </div>
  );
}
