"use client";

import { useState, useMemo, useEffect } from "react";
import type { StrategicAssessment } from "@/lib/types";
import { CollapsibleSection } from "../shared/CollapsibleSection";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { useWizardStore } from "@/lib/store";
import { DollarSign, TrendingUp, Lightbulb, PieChart, AlertTriangle } from "lucide-react";
import { FreshnessBadge } from "@/components/shared/FreshnessBadge";
import { estimated } from "@/lib/engine/verified-datum";
import { WhatIfModeler } from "./WhatIfModeler";

interface PortfolioOverviewProps {
  assessment: StrategicAssessment;
}

const DAYS_PER_HUNT = 6; // avg western hunt: 5-7 days incl. travel

export function PortfolioOverview({ assessment }: PortfolioOverviewProps) {
  const { macroSummary, budgetBreakdown, stateRecommendations, insights } = assessment;
  const userSpecies = useWizardStore((s) => s.species);
  const huntDaysPerYear = useWizardStore((s) => s.huntDaysPerYear);
  const [inflationOn, setInflationOn] = useState(false);
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

  const inflatedProjection = useMemo(() => {
    if (!inflationOn) return null;
    const baseYear = budgetBreakdown.tenYearProjection[0]?.year ?? new Date().getFullYear();
    const items = budgetBreakdown.tenYearProjection.map((yr) => {
      const yearsOut = yr.year - baseYear;
      const multiplier = Math.pow(1 + inflationRate, yearsOut);
      return { ...yr, cost: Math.round(yr.cost * multiplier) };
    });
    return { items, total: items.reduce((s, yr) => s + yr.cost, 0) };
  }, [inflationOn, inflationRate, budgetBreakdown.tenYearProjection]);

  return (
    <div className="space-y-4">
      {/* Cost by State */}
      <CollapsibleSection title="Portfolio Allocation" icon={PieChart} defaultOpen badge={`${stateRecommendations.length} states`}>
        <div className="space-y-3">
          {macroSummary.costByState.map((cs) => {
            const state = STATES_MAP[cs.stateId];
            const vis = STATE_VISUALS[cs.stateId];
            if (!state) return null;
            const stateSpecies = state.availableSpecies.filter((sp) => userSpecies.includes(sp));
            return (
              <div key={cs.stateId} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
                  {state.abbreviation}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{state.name}</span>
                      <div className="flex gap-0.5">
                        {stateSpecies.slice(0, 5).map((sp) => (
                          <SpeciesAvatar key={sp} speciesId={sp} size={14} />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          ${cs.annualCost}/yr ({cs.pctOfTotal}%)
                          <FreshnessBadge datum={estimated(cs.annualCost, "Cost calculator estimate")} showLabel={false} />
                        </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary/60 bar-fill" style={{ width: `${cs.pctOfTotal}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* 10-Year Cost Projection */}
      <CollapsibleSection title="10-Year Cost Projection" icon={TrendingUp} defaultOpen>
        <div className="space-y-2">
          {/* Inflation toggle */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">
              {inflationOn ? `Inflation-adjusted (${(inflationRate * 100).toFixed(1)}%/yr${inflationSource === "verified" ? " BLS" : ""})` : "Constant 2026 dollars"}
            </span>
            <button
              onClick={() => setInflationOn(!inflationOn)}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${
                inflationOn ? "bg-chart-4/15 text-chart-4 font-medium" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {inflationOn ? "Inflation: ON" : "Inflation: OFF"}
            </button>
          </div>

          {(inflatedProjection?.items ?? budgetBreakdown.tenYearProjection).map((yr) => {
            const maxCost = inflatedProjection ? inflatedProjection.total / 5 : assessment.financialSummary.tenYearTotal / 5;
            return (
              <div key={yr.year} className="flex items-center gap-3">
                <span className={`text-xs font-mono w-12 ${yr.isHuntYear ? "text-chart-2 font-bold" : "text-muted-foreground"}`}>
                  {yr.year}
                </span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full bar-fill ${yr.isHuntYear ? "bg-chart-2/70" : "bg-primary/40"}`}
                    style={{ width: `${Math.min((yr.cost / maxCost) * 100, 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-mono w-16 text-right ${yr.isHuntYear ? "text-chart-2 font-bold" : "text-muted-foreground"}`}>
                  ${yr.cost.toLocaleString()}
                </span>
                {yr.isHuntYear && <span className="text-[9px] px-1.5 py-0.5 rounded bg-chart-2/15 text-chart-2 font-medium">Hunt</span>}
              </div>
            );
          })}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-sm font-semibold">10-Year Total</span>
            <span className="text-sm font-bold text-primary inline-flex items-center gap-1">
              ${(inflatedProjection?.total ?? assessment.financialSummary.tenYearTotal).toLocaleString()}
              <FreshnessBadge datum={estimated(inflatedProjection?.total ?? assessment.financialSummary.tenYearTotal, "Cost calculator estimate")} showLabel={false} />
            </span>
          </div>
          {inflationOn && (
            <p className="text-[10px] text-chart-4/80 mt-1 leading-relaxed">
              +${((inflatedProjection?.total ?? 0) - assessment.financialSummary.tenYearTotal).toLocaleString()} over constant-dollar projection ({(inflationRate * 100).toFixed(1)}% annual fee inflation applied).
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
            {inflationOn
              ? `Projections include ${(inflationRate * 100).toFixed(1)}% annual fee inflation${inflationSource === "verified" ? " (BLS CPI data)" : ""}. Actual state fee adjustments vary by year and may differ.`
              : "All costs shown in 2026 dollars. Actual fees may increase over time due to state fee adjustments and inflation. Expect 2-5% annual increases on license and application fees."}
          </p>
        </div>
      </CollapsibleSection>

      {/* PTO / Hunt Days Warning */}
      {huntDaysPerYear > 0 && (() => {
        // Check each hunt year for PTO overload
        const huntYears = assessment.roadmap.filter((yr) => yr.isHuntYear);
        const warnings = huntYears
          .map((yr) => {
            const huntActions = yr.actions.filter((a) => a.type === "hunt").length;
            const estimatedDays = huntActions * DAYS_PER_HUNT;
            return { year: yr.year, huntActions, estimatedDays };
          })
          .filter((w) => w.estimatedDays > huntDaysPerYear);

        if (warnings.length === 0) return null;

        return (
          <div className="p-3 rounded-xl border border-chart-4/30 bg-chart-4/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-chart-4 shrink-0" />
              <span className="text-xs font-semibold text-chart-4">PTO Budget Warning</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              You indicated {huntDaysPerYear} available hunt days per year. Some years may exceed this:
            </p>
            <div className="space-y-1">
              {warnings.map((w) => (
                <div key={w.year} className="flex items-center justify-between text-[10px]">
                  <span className="font-mono font-medium">{w.year}</span>
                  <span className="text-muted-foreground">{w.huntActions} hunts</span>
                  <span className={`font-medium ${w.estimatedDays > huntDaysPerYear ? "text-chart-4" : "text-muted-foreground"}`}>
                    ~{w.estimatedDays}d needed vs {huntDaysPerYear}d available
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground/60 mt-2">
              Estimates {DAYS_PER_HUNT} days per hunt (including travel). Consider spreading hunts across years or taking extended leave.
            </p>
          </div>
        );
      })()}

      {/* Budget Breakdown */}
      <CollapsibleSection title="Budget Breakdown" icon={DollarSign}>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Point Year</p>
            <p className="text-lg font-bold text-primary inline-flex items-center gap-1">
              ${budgetBreakdown.pointYearCost.toLocaleString()}
              <FreshnessBadge datum={estimated(budgetBreakdown.pointYearCost, "State fee schedule")} showLabel={false} />
            </p>
            <div className="space-y-1 mt-2">
              {budgetBreakdown.pointYearItems.slice(0, 8).map((item, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground truncate mr-2">{item.label}</span>
                  <span className="text-foreground font-mono">${item.amount}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Hunt Year</p>
            <p className="text-lg font-bold text-chart-2 inline-flex items-center gap-1">
              ${budgetBreakdown.huntYearCost.toLocaleString()}
              <FreshnessBadge datum={estimated(budgetBreakdown.huntYearCost, "State fee schedule")} showLabel={false} />
            </p>
            <div className="space-y-1 mt-2">
              {budgetBreakdown.huntYearItems.slice(0, 8).map((item, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground truncate mr-2">{item.label}</span>
                  <span className="text-foreground font-mono">${item.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Insights */}
      {insights.length > 0 && (
        <CollapsibleSection title="Strategic Insights" icon={Lightbulb} defaultOpen>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="flex gap-2 p-2 rounded-lg bg-secondary/20">
                <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* What-If Modeler */}
      <WhatIfModeler assessment={assessment} />
    </div>
  );
}
