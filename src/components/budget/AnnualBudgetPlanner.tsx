"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Pencil, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";

// ============================================================================
// Shared Types & Config
// ============================================================================

export const BUDGET_CATEGORIES = [
  { key: "points", label: "Points & Applications", color: "bg-blue-400" },
  { key: "tags", label: "Tags & Licenses", color: "bg-green-400" },
  { key: "travel", label: "Travel & Lodging", color: "bg-amber-400" },
  { key: "gear", label: "Gear & Equipment", color: "bg-purple-400" },
  { key: "processing", label: "Meat Processing", color: "bg-red-400" },
  { key: "other", label: "Other", color: "bg-gray-400" },
];

// ============================================================================
// Component
// ============================================================================

export function AnnualBudgetPlanner() {
  const { userPoints } = useAppStore();

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

  // Calculate point subscription cost from user data
  const pointSubscriptionCost = useMemo(() => {
    const byState = new Map<string, number>();
    for (const pt of userPoints) {
      const state = STATES_MAP[pt.stateId];
      if (!state) continue;
      const cost = (state.pointCost[pt.speciesId] ?? 0) + (state.licenseFees.appFee ?? 0);
      byState.set(pt.stateId, (byState.get(pt.stateId) ?? 0) + cost);
    }
    let total = 0;
    for (const [stateId, speciesCost] of byState) {
      const state = STATES_MAP[stateId];
      if (!state) continue;
      total += speciesCost + (state.licenseFees.qualifyingLicense ?? 0);
    }
    return total;
  }, [userPoints]);

  const autoFillBudget = () => {
    setCategoryBudgets((prev) => ({
      ...prev,
      points: pointSubscriptionCost,
    }));
  };

  const totalAllocated = Object.values(categoryBudgets).reduce((s, v) => s + v, 0);
  const remaining = totalBudget - totalAllocated;

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Annual Budget
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={autoFillBudget}>
                Auto-fill points
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingBudget(!editingBudget)}
              >
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
              <span className="text-xl font-bold">
                ${totalBudget.toLocaleString()}
              </span>
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
                  <p className="text-[10px] text-muted-foreground truncate">
                    {cat.label}
                  </p>
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
                    <p className="text-xs font-bold">
                      ${(categoryBudgets[cat.key] ?? 0).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Remaining */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm font-medium">Remaining</span>
            <span
              className={`text-lg font-bold ${remaining >= 0 ? "text-green-400" : "text-destructive"}`}
            >
              ${remaining.toLocaleString()}
            </span>
          </div>

          {editingBudget && (
            <Button
              size="sm"
              onClick={() => setEditingBudget(false)}
              className="w-full"
            >
              <Check className="w-4 h-4 mr-2" />
              Save Budget
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Point Subscription Cost Card */}
      {pointSubscriptionCost > 0 && (
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Annual Point Subscription
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Cost to maintain all active preference points
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">
                ${pointSubscriptionCost.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
