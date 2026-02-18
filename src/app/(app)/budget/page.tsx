"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  PiggyBank,
  Plus,
  TrendingUp,
  X,
  Pencil,
  Check,
  Trash2,
  Mountain,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";

interface SavingsGoal {
  id: string;
  title: string;
  targetCost: number;
  targetDate: string;
  monthlySavings: number;
  currentSaved: number;
  stateId?: string;
  speciesId?: string;
}

const BUDGET_CATEGORIES = [
  { key: "points", label: "Points & Applications", color: "bg-blue-400" },
  { key: "tags", label: "Tags & Licenses", color: "bg-green-400" },
  { key: "travel", label: "Travel & Lodging", color: "bg-amber-400" },
  { key: "gear", label: "Gear & Equipment", color: "bg-purple-400" },
  { key: "processing", label: "Meat Processing", color: "bg-red-400" },
  { key: "other", label: "Other", color: "bg-gray-400" },
];

export default function BudgetPage() {
  const { userPoints } = useAppStore();
  const currentYear = new Date().getFullYear();

  // Budget state
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

  // Savings goals state
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState(5000);
  const [newGoalMonthly, setNewGoalMonthly] = useState(200);

  // Calculate point subscription cost from user data
  const pointSubscriptionCost = useMemo(() => {
    const byState = new Map<string, number>();
    for (const pt of userPoints) {
      const state = STATES_MAP[pt.stateId];
      if (!state) continue;
      const cost = (state.pointCost[pt.speciesId] ?? 0) + (state.licenseFees.appFee ?? 0);
      byState.set(pt.stateId, (byState.get(pt.stateId) ?? 0) + cost);
    }
    // Add qualifying license per state
    let total = 0;
    for (const [stateId, speciesCost] of byState) {
      const state = STATES_MAP[stateId];
      if (!state) continue;
      total += speciesCost + (state.licenseFees.qualifyingLicense ?? 0);
    }
    return total;
  }, [userPoints]);

  // Auto-fill point subscription cost
  const autoFillBudget = () => {
    setCategoryBudgets((prev) => ({
      ...prev,
      points: pointSubscriptionCost,
    }));
  };

  const totalAllocated = Object.values(categoryBudgets).reduce((s, v) => s + v, 0);
  const remaining = totalBudget - totalAllocated;

  function addSavingsGoal() {
    if (!newGoalTitle.trim()) return;
    const months = Math.ceil(newGoalTarget / (newGoalMonthly || 1));
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + months);

    setSavingsGoals((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: newGoalTitle.trim(),
        targetCost: newGoalTarget,
        targetDate: targetDate.toISOString().split("T")[0],
        monthlySavings: newGoalMonthly,
        currentSaved: 0,
      },
    ]);
    setShowAddGoal(false);
    setNewGoalTitle("");
    setNewGoalTarget(5000);
    setNewGoalMonthly(200);
  }

  function updateSaved(goalId: string, amount: number) {
    setSavingsGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, currentSaved: Math.max(0, g.currentSaved + amount) }
          : g
      )
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Hunt Budget — {currentYear}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your annual hunting expenses and save for dream hunts
          </p>
        </div>
      </div>

      {/* Annual Budget Overview */}
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

      {/* Dream Hunt Savings Goals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-amber-400" />
            Dream Hunt Savings
          </h2>
          <Button size="sm" className="gap-2" onClick={() => setShowAddGoal(true)}>
            <Plus className="w-4 h-4" />
            New Goal
          </Button>
        </div>

        {savingsGoals.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <Mountain className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">
                No savings goals yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start saving for that dream Yukon moose hunt, Dall sheep adventure, or
                any big hunt on your bucket list.
              </p>
              <Button onClick={() => setShowAddGoal(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Set a Savings Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {savingsGoals.map((goal) => {
              const pct = Math.min(
                100,
                goal.targetCost > 0
                  ? (goal.currentSaved / goal.targetCost) * 100
                  : 0
              );
              const monthsLeft = Math.max(
                0,
                Math.ceil(
                  (goal.targetCost - goal.currentSaved) /
                    (goal.monthlySavings || 1)
                )
              );

              return (
                <Card key={goal.id} className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{goal.title}</CardTitle>
                      <button
                        onClick={() =>
                          setSavingsGoals((prev) =>
                            prev.filter((g) => g.id !== goal.id)
                          )
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          ${goal.currentSaved.toLocaleString()} saved
                        </span>
                        <span className="font-bold">
                          ${goal.targetCost.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-chart-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {Math.round(pct)}% complete
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ~{monthsLeft} months to go @ ${goal.monthlySavings}/mo
                        </span>
                      </div>
                    </div>

                    {/* Quick update */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => updateSaved(goal.id, goal.monthlySavings)}
                      >
                        + ${goal.monthlySavings}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => updateSaved(goal.id, 100)}
                      >
                        + $100
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Savings Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddGoal(false)}
            role="presentation"
          />
          <Card className="relative z-10 w-full max-w-md bg-card border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">New Savings Goal</CardTitle>
              <button
                onClick={() => setShowAddGoal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Hunt Name
                </label>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g., Yukon Moose Adventure"
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Total Cost ($)
                </label>
                <input
                  type="number"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Monthly Savings ($)
                </label>
                <input
                  type="number"
                  value={newGoalMonthly}
                  onChange={(e) => setNewGoalMonthly(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                />
                {newGoalMonthly > 0 && newGoalTarget > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Reach your goal in ~
                    {Math.ceil(newGoalTarget / newGoalMonthly)} months (
                    {(newGoalTarget / newGoalMonthly / 12).toFixed(1)} years)
                  </p>
                )}
              </div>
              <Button
                onClick={addSavingsGoal}
                className="w-full"
                disabled={!newGoalTitle.trim()}
              >
                Create Savings Goal
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
