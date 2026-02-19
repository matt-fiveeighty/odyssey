"use client";

import { useWizardStore } from "@/lib/store";
import { AdvisorInsight } from "../shared/AdvisorInsight";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp } from "lucide-react";
import { HuntingTerm } from "@/components/shared/HuntingTerm";

const BUDGET_TIERS: Record<string, string> = {
  low: "At this level, focus on 2\u20133 states with the cheapest point costs. Every dollar counts.",
  mid: "A solid portfolio budget. You can maintain 4\u20135 states and still have room for a hunt year.",
  high: "With this budget, you can run a full 6\u20137 state portfolio and invest in long-term trophy states like NV and AZ.",
  premium: "At this level, you can run 8+ states with aggressive burn schedules, guided trophy hunts, and full travel logistics.",
};

function getBudgetInsight(pointBudget: number): string {
  const stateCount = pointBudget < 1000 ? "2\u20133" : pointBudget < 2500 ? "4\u20135" : pointBudget < 5000 ? "6\u20137" : "8+";
  const tier = pointBudget < 1000 ? "low" : pointBudget < 2500 ? "mid" : pointBudget < 5000 ? "high" : "premium";
  return `At $${pointBudget.toLocaleString()}/yr, you can comfortably maintain ${stateCount} states in your point portfolio. ${BUDGET_TIERS[tier]}`;
}

export function StepLetsTalkMoney() {
  const wizard = useWizardStore();

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-8">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Step 4 of 9</p>
          <h2 className="text-xl font-bold">Think of this like a financial portfolio.</h2>
          <p className="text-sm text-muted-foreground mt-1">You have two modes: <HuntingTerm term="point year">point-building years</HuntingTerm> (low cost, maintaining positions) and <HuntingTerm term="hunt year">hunt years</HuntingTerm> (deploying capital when you <HuntingTerm term="draw">draw</HuntingTerm> a tag).</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="point-year-budget" className="text-sm font-medium text-muted-foreground mb-1 block"><HuntingTerm term="annual subscription">Point-Year Subscription</HuntingTerm></label>
            <p className="text-xs text-muted-foreground mb-3">Your annual <HuntingTerm term="portfolio">portfolio</HuntingTerm> maintenance cost. In years you&apos;re only building <HuntingTerm term="preference points">points</HuntingTerm>, what feels comfortable?</p>
            <div className="flex items-center gap-4 mb-2">
              <input id="point-year-budget" type="range" min={500} max={10000} step={100} value={wizard.pointYearBudget} onChange={(e) => wizard.setField("pointYearBudget", Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="text-2xl font-bold text-primary w-28 text-right">${wizard.pointYearBudget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>$500</span><span>$5,000</span><span>$10,000</span>
            </div>
          </div>

          <div>
            <label htmlFor="hunt-year-budget" className="text-sm font-medium text-muted-foreground mb-1 block"><HuntingTerm term="hunt year">Hunt-Year Deployment</HuntingTerm></label>
            <p className="text-xs text-muted-foreground mb-3">When you <HuntingTerm term="draw">draw</HuntingTerm> the <HuntingTerm term="tag">tag</HuntingTerm> and it&apos;s go-time, what can you deploy? Tags, flights, gear, processing &mdash; the full mission.</p>
            <div className="flex items-center gap-4 mb-2">
              <input id="hunt-year-budget" type="range" min={2000} max={30000} step={500} value={wizard.huntYearBudget} onChange={(e) => wizard.setField("huntYearBudget", Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="text-2xl font-bold text-chart-2 w-28 text-right">${wizard.huntYearBudget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>$2,000</span><span>$15,000</span><span>$30,000</span>
            </div>
          </div>
        </div>

        <AdvisorInsight text={getBudgetInsight(wizard.pointYearBudget)} icon={TrendingUp} />

        <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-chart-2" />
            <span className="text-xs font-semibold">Quick Math</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="text-muted-foreground/60">10-yr point investment:</span>
              <span className="font-bold text-foreground ml-1">${(wizard.pointYearBudget * 10).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground/60">With 3 hunt years:</span>
              <span className="font-bold text-foreground ml-1">${(wizard.pointYearBudget * 7 + wizard.huntYearBudget * 3).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
