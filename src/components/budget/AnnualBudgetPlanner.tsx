"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Pencil, Check, Zap, ChevronDown } from "lucide-react";
import { useAppStore, useWizardStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";
import { resolveFees } from "@/lib/engine/fee-resolver";

// ============================================================================
// Shared Types & Config
// ============================================================================

export const BUDGET_CATEGORIES = [
  { key: "points", label: "Points & Applications", color: "bg-info" },
  { key: "tags", label: "Tags & Licenses", color: "bg-success" },
  { key: "travel", label: "Travel & Lodging", color: "bg-warning" },
  { key: "gear", label: "Gear & Equipment", color: "bg-premium" },
  { key: "processing", label: "Meat Processing", color: "bg-destructive" },
  { key: "other", label: "Other", color: "bg-muted-foreground" },
];

// ============================================================================
// Component
// ============================================================================

export function AnnualBudgetPlanner() {
  const { userPoints, confirmedAssessment } = useAppStore();

  const [totalBudget, setTotalBudget] = useState(5000);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({
    points: 0,
    tags: 0,
    travel: 0,
    gear: 0,
    processing: 0,
    other: 0,
  });
  const [editingBudget, setEditingBudget] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  const homeState = useWizardStore((s) => s.homeState);

  // Calculate point subscription cost from user data (R/NR aware)
  const pointSubscriptionCost = useMemo(() => {
    const byState = new Map<string, number>();
    for (const pt of userPoints) {
      const state = STATES_MAP[pt.stateId];
      if (!state) continue;
      const fees = resolveFees(state, homeState);
      const cost = (fees.pointCost[pt.speciesId] ?? 0) + fees.appFee;
      byState.set(pt.stateId, (byState.get(pt.stateId) ?? 0) + cost);
    }
    let total = 0;
    for (const [stateId, speciesCost] of byState) {
      const state = STATES_MAP[stateId];
      if (!state) continue;
      const fees = resolveFees(state, homeState);
      total += speciesCost + fees.qualifyingLicense;
    }
    return total;
  }, [userPoints, homeState]);

  // Compute plan-based budget from confirmed assessment
  const planBudget = useMemo(() => {
    if (!confirmedAssessment) return null;

    const { budgetBreakdown, travelLogistics, financialSummary } = confirmedAssessment;

    // Points & applications = point year cost
    const pointsCost = budgetBreakdown.pointYearCost;

    // Travel = travel logistics total
    const travelCost = travelLogistics?.totalTravelBudget ?? 0;

    // Tags = estimated from hunt year items that are "tag" category
    const tagsCost = budgetBreakdown.huntYearItems
      .filter((item) => item.category === "tag")
      .reduce((s, item) => s + item.amount, 0);

    // Meat processing estimate: $200 per state in plan
    const processingCost = confirmedAssessment.stateRecommendations.length * 200;

    // Suggested total based on plan
    const suggestedTotal = pointsCost + travelCost + tagsCost + processingCost;

    // Itemized breakdown per state for points
    const stateBreakdowns: { stateId: string; stateName: string; items: { label: string; amount: number }[]; total: number }[] = [];
    for (const rec of confirmedAssessment.stateRecommendations) {
      const state = STATES_MAP[rec.stateId];
      if (!state) continue;
      const items = rec.annualCostItems.map((item) => ({
        label: item.label,
        amount: item.amount,
      }));
      stateBreakdowns.push({
        stateId: rec.stateId,
        stateName: state.name,
        items,
        total: rec.annualCost,
      });
    }

    return {
      pointsCost,
      travelCost,
      tagsCost,
      processingCost,
      suggestedTotal,
      annualSubscription: financialSummary.annualSubscription,
      stateBreakdowns,
    };
  }, [confirmedAssessment]);

  const autoFillFromPlan = () => {
    if (!planBudget) return;
    setCategoryBudgets({
      points: planBudget.pointsCost,
      tags: planBudget.tagsCost,
      travel: planBudget.travelCost,
      gear: 0,
      processing: planBudget.processingCost,
      other: 0,
    });
    setTotalBudget(Math.max(totalBudget, planBudget.suggestedTotal));
    setHasAutoFilled(true);
  };

  const autoFillPoints = () => {
    setCategoryBudgets((prev) => ({
      ...prev,
      points: pointSubscriptionCost,
    }));
  };

  const totalAllocated = Object.values(categoryBudgets).reduce((s, v) => s + v, 0);
  const remaining = totalBudget - totalAllocated;

  return (
    <>
      {/* Auto-populate from plan CTA */}
      {planBudget && !hasAutoFilled && (
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Auto-fill from your Strategic Plan</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    We calculated ~${planBudget.suggestedTotal.toLocaleString()}/yr across {confirmedAssessment?.stateRecommendations.length} states — fill in your budget instantly
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={autoFillFromPlan} className="gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Auto-fill
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Annual Budget
            </CardTitle>
            <div className="flex items-center gap-2">
              {planBudget && (
                <Button variant="outline" size="sm" onClick={autoFillFromPlan} className="text-[10px] h-7 gap-1">
                  <Zap className="w-3 h-3" />
                  From Plan
                </Button>
              )}
              {pointSubscriptionCost > 0 && (
                <Button variant="outline" size="sm" onClick={autoFillPoints} className="text-[10px] h-7">
                  Auto-fill points
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setEditingBudget(!editingBudget)} aria-label={editingBudget ? "Stop editing budget" : "Edit budget"}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total budget */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Budget</span>
            {editingBudget ? (
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(Number(e.target.value))}
                className="w-32 px-2 py-1 rounded bg-secondary border border-border text-right text-sm font-bold focus:border-primary focus:outline-none"
              />
            ) : (
              <span className="text-xl font-bold">${totalBudget.toLocaleString()}</span>
            )}
          </div>

          {/* Budget bar */}
          <div className="h-4 rounded-full bg-secondary overflow-hidden flex">
            {BUDGET_CATEGORIES.map((cat) => {
              const amount = categoryBudgets[cat.key] ?? 0;
              const pct = totalBudget > 0 ? (amount / totalBudget) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <div
                  key={cat.key}
                  className={`${cat.color} h-full transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${cat.label}: $${amount.toLocaleString()}`}
                />
              );
            })}
          </div>

          {/* Category breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {BUDGET_CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{cat.label}</p>
                  {editingBudget ? (
                    <input
                      type="number"
                      value={categoryBudgets[cat.key] ?? 0}
                      onChange={(e) =>
                        setCategoryBudgets((prev) => ({
                          ...prev,
                          [cat.key]: Number(e.target.value),
                        }))
                      }
                      className="w-full px-1 py-0.5 rounded bg-secondary border border-border text-xs font-bold focus:border-primary focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs font-bold">${(categoryBudgets[cat.key] ?? 0).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Remaining */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm font-medium">Remaining</span>
            <span className={`text-lg font-bold ${remaining >= 0 ? "text-success" : "text-destructive"}`}>
              ${remaining.toLocaleString()}
            </span>
          </div>

          {editingBudget && (
            <Button size="sm" onClick={() => setEditingBudget(false)} className="w-full">
              <Check className="w-4 h-4 mr-2" />
              Save Budget
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Plan-sourced state breakdown */}
      {planBudget && planBudget.stateBreakdowns.length > 0 && (
        <Card className="bg-card border-border">
          <button
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors"
            onClick={() => setShowBreakdown(!showBreakdown)}
          >
            <div>
              <p className="text-sm font-semibold text-left">Point Subscription by State</p>
              <p className="text-[10px] text-muted-foreground text-left">
                ${planBudget.annualSubscription.toLocaleString()}/yr across {planBudget.stateBreakdowns.length} states
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showBreakdown ? "rotate-180" : ""}`} />
          </button>

          {showBreakdown && (
            <CardContent className="pt-0 pb-4 space-y-3">
              {planBudget.stateBreakdowns.map((sb) => (
                <div key={sb.stateId} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{sb.stateName}</span>
                    <span className="text-xs font-bold text-primary">${sb.total}/yr</span>
                  </div>
                  <div className="space-y-0.5">
                    {sb.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-mono">${item.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Point Subscription Cost Card (legacy — from user points portfolio) */}
      {pointSubscriptionCost > 0 && !planBudget && (
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Annual Point Subscription</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Cost to maintain all active preference points
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">${pointSubscriptionCost.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
