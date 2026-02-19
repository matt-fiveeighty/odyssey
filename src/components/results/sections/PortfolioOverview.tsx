"use client";

import type { StrategicAssessment } from "@/lib/types";
import { CollapsibleSection } from "../shared/CollapsibleSection";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { useWizardStore } from "@/lib/store";
import { DollarSign, TrendingUp, Lightbulb, PieChart } from "lucide-react";
import { WhatIfModeler } from "./WhatIfModeler";

interface PortfolioOverviewProps {
  assessment: StrategicAssessment;
}

export function PortfolioOverview({ assessment }: PortfolioOverviewProps) {
  const { macroSummary, budgetBreakdown, stateRecommendations, insights } = assessment;
  const userSpecies = useWizardStore((s) => s.species);

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
                    <span className="text-xs text-muted-foreground">${cs.annualCost}/yr ({cs.pctOfTotal}%)</span>
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
          {budgetBreakdown.tenYearProjection.map((yr) => (
            <div key={yr.year} className="flex items-center gap-3">
              <span className={`text-xs font-mono w-12 ${yr.isHuntYear ? "text-chart-2 font-bold" : "text-muted-foreground"}`}>
                {yr.year}
              </span>
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full bar-fill ${yr.isHuntYear ? "bg-chart-2/70" : "bg-primary/40"}`}
                  style={{ width: `${Math.min((yr.cost / (assessment.financialSummary.tenYearTotal / 5)) * 100, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-mono w-16 text-right ${yr.isHuntYear ? "text-chart-2 font-bold" : "text-muted-foreground"}`}>
                ${yr.cost.toLocaleString()}
              </span>
              {yr.isHuntYear && <span className="text-[9px] px-1.5 py-0.5 rounded bg-chart-2/15 text-chart-2 font-medium">Hunt</span>}
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-sm font-semibold">10-Year Total</span>
            <span className="text-sm font-bold text-primary">${assessment.financialSummary.tenYearTotal.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
            All costs shown in 2026 dollars. Actual fees may increase over time due to state fee adjustments and inflation. Expect 2-5% annual increases on license and application fees.
          </p>
        </div>
      </CollapsibleSection>

      {/* Budget Breakdown */}
      <CollapsibleSection title="Budget Breakdown" icon={DollarSign}>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Point Year</p>
            <p className="text-lg font-bold text-primary">${budgetBreakdown.pointYearCost.toLocaleString()}</p>
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
            <p className="text-lg font-bold text-chart-2">${budgetBreakdown.huntYearCost.toLocaleString()}</p>
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
