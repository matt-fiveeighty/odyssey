"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PiggyBank, Plus, X, Trash2, Mountain } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface SavingsGoal {
  id: string;
  title: string;
  targetCost: number;
  targetDate: string;
  monthlySavings: number;
  currentSaved: number;
  stateId?: string;
  speciesId?: string;
}

// ============================================================================
// Individual Card
// ============================================================================

function SavingsGoalItem({
  goal,
  onUpdateSaved,
  onRemove,
}: {
  goal: SavingsGoal;
  onUpdateSaved: (goalId: string, amount: number) => void;
  onRemove: (goalId: string) => void;
}) {
  const pct = Math.min(
    100,
    goal.targetCost > 0 ? (goal.currentSaved / goal.targetCost) * 100 : 0
  );
  const monthsLeft = Math.max(
    0,
    Math.ceil(
      (goal.targetCost - goal.currentSaved) / (goal.monthlySavings || 1)
    )
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{goal.title}</CardTitle>
          <button
            onClick={() => onRemove(goal.id)}
            aria-label="Remove savings goal"
            className="text-muted-foreground hover:text-destructive p-2 -m-1"
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
            onClick={() => onUpdateSaved(goal.id, goal.monthlySavings)}
          >
            + ${goal.monthlySavings}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onUpdateSaved(goal.id, 100)}
          >
            + $100
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Savings Goals Section
// ============================================================================

export function SavingsGoalsSection() {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState(5000);
  const [newGoalMonthly, setNewGoalMonthly] = useState(200);

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

  function removeGoal(goalId: string) {
    if (window.confirm("Delete this savings goal? This cannot be undone.")) {
      setSavingsGoals((prev) => prev.filter((g) => g.id !== goalId));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-warning" />
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
            <h3 className="font-semibold mb-1">No savings goals yet</h3>
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
          {savingsGoals.map((goal) => (
            <SavingsGoalItem
              key={goal.id}
              goal={goal}
              onUpdateSaved={updateSaved}
              onRemove={removeGoal}
            />
          ))}
        </div>
      )}

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
                aria-label="Close dialog"
                className="text-muted-foreground hover:text-foreground p-2 -m-2"
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
