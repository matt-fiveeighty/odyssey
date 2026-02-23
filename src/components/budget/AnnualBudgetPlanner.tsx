"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Pencil, Check, Zap, ChevronDown, Info, DollarSign, Crosshair } from "lucide-react";
import { useAppStore, useWizardStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";
import { StateOutline } from "@/components/shared/StateOutline";
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

// Definite categories (you pay these whether you draw or not)
const DEFINITE_CATEGORIES = [
  { key: "points", label: "Points & Applications", color: "bg-info", colorHex: "var(--color-info)" },
  { key: "gear", label: "Gear & Equipment", color: "bg-premium", colorHex: "var(--color-premium)" },
  { key: "other", label: "Other", color: "bg-muted-foreground", colorHex: "var(--color-muted-foreground)" },
];

// If-you-draw categories (only paid if you draw a tag)
const IF_DRAWN_CATEGORIES = [
  { key: "tags", label: "Tags & Licenses", color: "bg-success", colorHex: "var(--color-success)" },
  { key: "travel", label: "Travel & Lodging", color: "bg-warning", colorHex: "var(--color-warning)" },
  { key: "processing", label: "Meat Processing", color: "bg-destructive", colorHex: "var(--color-destructive)" },
];

// ============================================================================
// Hover Tooltip for bar segments
// ============================================================================

function BarSegment({
  label,
  amount,
  pct,
  colorClass,
  totalBar,
}: {
  label: string;
  amount: number;
  pct: number;
  colorClass: string;
  totalBar: number;
}) {
  const [hovered, setHovered] = useState(false);

  if (pct <= 0) return null;

  return (
    <div
      className={`${colorClass} h-full transition-all relative group cursor-default`}
      style={{ width: `${pct}%` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 whitespace-nowrap text-center fade-in-up">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="text-sm font-bold">${Math.round(amount).toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">{Math.round(pct)}% of ${Math.round(totalBar).toLocaleString()}</p>
          </div>
          <div className="w-2 h-2 bg-popover border-r border-b border-border rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
        </div>
      )}
    </div>
  );
}

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

  const currentYear = new Date().getFullYear();

  // Compute plan-based budget from confirmed assessment — now year-aware
  const planBudget = useMemo(() => {
    if (!confirmedAssessment) return null;

    const { budgetBreakdown, travelLogistics, financialSummary, macroSummary, roadmap } = confirmedAssessment;

    // --- Year-specific data from macroSummary.costByYear ---
    const thisYearCosts = macroSummary.costByYear.find((c) => c.year === currentYear);
    const thisYearRoadmap = roadmap.find((r) => r.year === currentYear);
    const isHuntYear = thisYearRoadmap?.isHuntYear ?? false;

    // Definite: point-year costs (applications + point purchases + licenses)
    const definiteCost = thisYearCosts?.pointCosts ?? budgetBreakdown.pointYearCost;

    // If-you-draw: hunt costs (tags + travel + processing) — only meaningful in hunt years
    const huntCosts = thisYearCosts?.huntCosts ?? 0;
    const travelCost = isHuntYear ? (travelLogistics?.totalTravelBudget ?? 0) : 0;
    const processingCost = isHuntYear
      ? confirmedAssessment.stateRecommendations.length * 200
      : 0;
    const ifDrawnCost = huntCosts + travelCost + processingCost;

    // Tags from budgetBreakdown (generic, not year-specific)
    const tagsCost = budgetBreakdown.huntYearItems
      .filter((item) => item.category === "tag")
      .reduce((s, item) => s + item.amount, 0);

    // Suggested total: definite + if-drawn
    const suggestedTotal = definiteCost + ifDrawnCost;

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
      pointsCost: definiteCost,
      travelCost,
      tagsCost: isHuntYear ? tagsCost : 0,
      processingCost,
      definiteCost,
      ifDrawnCost,
      isHuntYear,
      suggestedTotal,
      annualSubscription: financialSummary.annualSubscription,
      stateBreakdowns,
    };
  }, [confirmedAssessment, currentYear]);

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

  // Compute definite vs if-drawn totals from category budgets
  const definiteTotal = DEFINITE_CATEGORIES.reduce((s, cat) => s + (categoryBudgets[cat.key] ?? 0), 0);
  const ifDrawnTotal = IF_DRAWN_CATEGORIES.reduce((s, cat) => s + (categoryBudgets[cat.key] ?? 0), 0);

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
                    We calculated ~${Math.round(planBudget.suggestedTotal).toLocaleString()}/yr across {confirmedAssessment?.stateRecommendations.length} states — fill in your budget instantly
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
              <span className="text-xl font-bold">${Math.round(totalBudget).toLocaleString()}</span>
            )}
          </div>

          {/* TWO budget bars: Definite + If You Draw */}
          <div className="space-y-3">
            {/* Definite Bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3 text-success" />
                  <span className="text-[10px] font-semibold text-success uppercase tracking-wider">Definite</span>
                </div>
                <span className="text-xs font-bold">${Math.round(definiteTotal).toLocaleString()}</span>
              </div>
              <div className="h-5 rounded-full bg-secondary overflow-hidden flex">
                {DEFINITE_CATEGORIES.map((cat) => {
                  const amount = categoryBudgets[cat.key] ?? 0;
                  const pct = definiteTotal > 0 ? (amount / totalBudget) * 100 : 0;
                  return (
                    <BarSegment
                      key={cat.key}
                      label={cat.label}
                      amount={amount}
                      pct={pct}
                      colorClass={cat.color}
                      totalBar={definiteTotal}
                    />
                  );
                })}
              </div>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                You spend this whether you draw or not — points, apps, licenses, gear
              </p>
            </div>

            {/* If You Draw Bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Crosshair className="w-3 h-3 text-chart-2" />
                  <span className="text-[10px] font-semibold text-chart-2 uppercase tracking-wider">If You Draw</span>
                </div>
                <span className="text-xs font-bold">${Math.round(ifDrawnTotal).toLocaleString()}</span>
              </div>
              <div className="h-5 rounded-full bg-secondary overflow-hidden flex">
                {IF_DRAWN_CATEGORIES.map((cat) => {
                  const amount = categoryBudgets[cat.key] ?? 0;
                  const pct = ifDrawnTotal > 0 ? (amount / totalBudget) * 100 : 0;
                  return (
                    <BarSegment
                      key={cat.key}
                      label={cat.label}
                      amount={amount}
                      pct={pct}
                      colorClass={cat.color}
                      totalBar={ifDrawnTotal}
                    />
                  );
                })}
              </div>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                Only paid if you draw a tag — tags, travel, lodging, meat processing
              </p>
            </div>
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
                    <p className="text-xs font-bold">${Math.round(categoryBudgets[cat.key] ?? 0).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Remaining */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm font-medium">Remaining</span>
            <span className={`text-lg font-bold ${remaining >= 0 ? "text-success" : "text-destructive"}`}>
              ${Math.round(remaining).toLocaleString()}
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
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1">
                {planBudget.stateBreakdowns.slice(0, 4).map((sb) => (
                  <StateOutline key={sb.stateId} stateId={sb.stateId} size={18} strokeColor="currentColor" strokeWidth={2.5} fillColor="rgba(255,255,255,0.05)" className="text-muted-foreground" />
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-left">Point Subscription by State</p>
                <p className="text-[10px] text-muted-foreground text-left">
                  ${Math.round(planBudget.annualSubscription).toLocaleString()}/yr across {planBudget.stateBreakdowns.length} states
                </p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showBreakdown ? "rotate-180" : ""}`} />
          </button>

          {showBreakdown && (
            <CardContent className="pt-0 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {planBudget.stateBreakdowns.map((sb) => {
                  const state = STATES_MAP[sb.stateId];
                  if (!state) return null;
                  return (
                    <div key={sb.stateId} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StateOutline stateId={sb.stateId} size={20} strokeColor="white" strokeWidth={2} fillColor="rgba(255,255,255,0.1)" />
                          <span className="text-sm font-semibold">{sb.stateName}</span>
                        </div>
                        <span className="text-xs font-bold text-primary">${Math.round(sb.total).toLocaleString()}/yr</span>
                      </div>
                      <div className="space-y-0.5">
                        {sb.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-mono">${Math.round(item.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      {/* Info bullets for this state */}
                      <div className="mt-2 pt-2 border-t border-border/30 space-y-0.5">
                        {state.applicationApproach && (
                          <p className="text-[9px] text-muted-foreground/60">
                            &bull; {state.applicationApproachDescription || state.applicationApproach}
                          </p>
                        )}
                        {state.pointSystem && (
                          <p className="text-[9px] text-muted-foreground/60">
                            &bull; {state.pointSystemDetails.description}
                          </p>
                        )}
                        {(state.licenseFees.qualifyingLicense ?? 0) > 0 && (
                          <p className="text-[9px] text-muted-foreground/60">
                            &bull; Qualifying license: ${Math.round(state.licenseFees.qualifyingLicense!)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
              <p className="text-2xl font-bold text-primary">${Math.round(pointSubscriptionCost).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
