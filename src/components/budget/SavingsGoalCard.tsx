"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PiggyBank, Plus, X, Trash2, Mountain, Sparkles, ChevronDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import type { SavingsGoal, UserGoal, Milestone } from "@/lib/types";

// ============================================================================
// Individual Card
// ============================================================================

function SavingsGoalItem({
  goal,
  userGoals,
  milestones,
  onAddContribution,
  onRemove,
}: {
  goal: SavingsGoal;
  userGoals: UserGoal[];
  milestones: Milestone[];
  onAddContribution: (goalId: string, amount: number) => void;
  onRemove: (goalId: string) => void;
}) {
  // Derive title and targetCost from linked UserGoal + milestones
  const linkedGoal = userGoals.find((g) => g.id === goal.goalId);
  const title = linkedGoal?.title ?? "Unknown Goal";
  const targetCost = milestones
    .filter((m) => m.planId === goal.goalId)
    .reduce((s, m) => s + m.totalCost, 0);

  const pct = Math.min(
    100,
    targetCost > 0 ? (goal.currentSaved / targetCost) * 100 : 0
  );
  const remaining = Math.max(0, targetCost - goal.currentSaved);
  const monthsLeft = Math.max(
    0,
    Math.ceil(remaining / (goal.monthlySavings || 1))
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {linkedGoal && (
              <SpeciesAvatar speciesId={linkedGoal.speciesId} size={20} />
            )}
            <CardTitle className="text-sm truncate">{title}</CardTitle>
          </div>
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
              ${Math.round(goal.currentSaved).toLocaleString()} saved
            </span>
            <span className="font-bold">
              ${Math.round(targetCost).toLocaleString()}
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
              {remaining <= 0
                ? "Goal reached!"
                : `~${monthsLeft} months to go @ $${goal.monthlySavings}/mo`}
            </span>
          </div>
        </div>

        {/* Quick update */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onAddContribution(goal.id, goal.monthlySavings)}
          >
            + ${goal.monthlySavings}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onAddContribution(goal.id, 100)}
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
  const {
    userGoals,
    milestones: allMilestones,
    savingsGoals,
    addSavingsGoal,
    removeSavingsGoal,
    addContribution,
  } = useAppStore();

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [newGoalMonthly, setNewGoalMonthly] = useState(200);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const currentYear = new Date().getFullYear();

  // UserGoals that don't already have a linked savings goal
  const availableGoals = useMemo(() => {
    const linkedGoalIds = new Set(savingsGoals.map((sg) => sg.goalId));
    return userGoals.filter(
      (g) => g.status === "active" && !linkedGoalIds.has(g.id)
    );
  }, [userGoals, savingsGoals]);

  // Derive target cost for a given goalId from milestones
  const getTargetCost = (goalId: string) =>
    allMilestones
      .filter((m) => m.planId === goalId)
      .reduce((s, m) => s + m.totalCost, 0);

  // Auto-generate savings suggestions from active goals
  const suggestedSavings = useMemo(() => {
    return userGoals
      .filter((g) => g.status === "active" && g.targetYear > currentYear + 1)
      .map((g) => {
        const goalMs = allMilestones.filter((m) => m.planId === g.id);
        const totalCost = goalMs.reduce((s, m) => s + m.totalCost, 0);
        const monthsAway = Math.max(1, (g.targetYear - currentYear) * 12);
        return {
          goal: g,
          totalCost,
          monthlySavings: Math.ceil(totalCost / monthsAway),
        };
      })
      .filter(
        (s) =>
          s.totalCost > 500 &&
          !dismissedSuggestions.has(s.goal.id) &&
          !savingsGoals.some((sg) => sg.goalId === s.goal.id)
      );
  }, [userGoals, allMilestones, currentYear, dismissedSuggestions, savingsGoals]);

  function activateSuggestion(suggestion: (typeof suggestedSavings)[number]) {
    const now = new Date().toISOString();
    addSavingsGoal({
      id: crypto.randomUUID(),
      goalId: suggestion.goal.id,
      currentSaved: 0,
      monthlySavings: suggestion.monthlySavings,
      contributions: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  function handleCreateGoal() {
    if (!selectedGoalId) return;
    const now = new Date().toISOString();
    addSavingsGoal({
      id: crypto.randomUUID(),
      goalId: selectedGoalId,
      currentSaved: 0,
      monthlySavings: newGoalMonthly,
      contributions: [],
      createdAt: now,
      updatedAt: now,
    });
    setShowAddGoal(false);
    setSelectedGoalId("");
    setNewGoalMonthly(200);
  }

  function handleAddContribution(goalId: string, amount: number) {
    addContribution(goalId, amount);
  }

  function handleRemoveGoal(goalId: string) {
    if (window.confirm("Delete this savings goal? This cannot be undone.")) {
      removeSavingsGoal(goalId);
    }
  }

  // Selected goal info for the dialog
  const selectedGoal = userGoals.find((g) => g.id === selectedGoalId);
  const selectedTargetCost = selectedGoalId ? getTargetCost(selectedGoalId) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-warning" />
          Dream Hunt Savings
        </h2>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => setShowAddGoal(true)}
          disabled={availableGoals.length === 0}
          title={availableGoals.length === 0 ? "All goals already have savings plans" : undefined}
        >
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
            {availableGoals.length > 0 ? (
              <Button onClick={() => setShowAddGoal(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Set a Savings Goal
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Add hunt goals first, then create savings plans for them.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {savingsGoals.map((goal) => (
            <SavingsGoalItem
              key={goal.id}
              goal={goal}
              userGoals={userGoals}
              milestones={allMilestones}
              onAddContribution={handleAddContribution}
              onRemove={handleRemoveGoal}
            />
          ))}
        </div>
      )}

      {/* Auto-suggested savings from goals */}
      {suggestedSavings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Suggested from Your Goals</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {suggestedSavings.map((s) => {
              const state = STATES_MAP[s.goal.stateId];
              const species = SPECIES_MAP[s.goal.speciesId];
              return (
                <Card key={s.goal.id} className="bg-card border-border border-dashed">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <SpeciesAvatar speciesId={s.goal.speciesId} size={24} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{s.goal.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {species?.name} in {state?.name} — Target {s.goal.targetYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        ${Math.round(s.totalCost).toLocaleString()} total
                      </span>
                      <span className="font-bold text-primary">
                        ${s.monthlySavings}/mo
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => activateSuggestion(s)}
                      >
                        Start Saving
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() =>
                          setDismissedSuggestions((prev) => new Set([...prev, s.goal.id]))
                        }
                      >
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
              {/* Goal selector */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Link to Hunt Goal
                </label>
                <div className="relative">
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none appearance-none pr-8"
                  >
                    <option value="">Select a goal...</option>
                    {availableGoals.map((g) => {
                      const state = STATES_MAP[g.stateId];
                      const species = SPECIES_MAP[g.speciesId];
                      return (
                        <option key={g.id} value={g.id}>
                          {g.title} ({species?.name} in {state?.name})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Show derived target cost */}
              {selectedGoal && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                  <SpeciesAvatar speciesId={selectedGoal.speciesId} size={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{selectedGoal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Estimated cost: <span className="font-bold">${Math.round(selectedTargetCost).toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              )}

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
                {newGoalMonthly > 0 && selectedTargetCost > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Reach your goal in ~
                    {Math.ceil(selectedTargetCost / newGoalMonthly)} months (
                    {(selectedTargetCost / newGoalMonthly / 12).toFixed(1)} years)
                  </p>
                )}
              </div>
              <Button
                onClick={handleCreateGoal}
                className="w-full"
                disabled={!selectedGoalId}
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
