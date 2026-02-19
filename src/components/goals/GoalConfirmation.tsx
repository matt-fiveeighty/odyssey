"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Calendar, DollarSign, PiggyBank, ListChecks } from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import type { UserGoal, Milestone } from "@/lib/types";

interface GoalConfirmationProps {
  goal: UserGoal;
  milestones: Milestone[];
  totalCost: number;
  monthlySavings: number;
  huntMonth: string;
  evaluation?: string;
  onViewGoals: () => void;
  onViewPlanner: () => void;
  onDone: () => void;
}

export function GoalConfirmation({
  goal,
  milestones,
  totalCost,
  monthlySavings,
  huntMonth,
  evaluation,
  onViewGoals,
  onViewPlanner,
  onDone,
}: GoalConfirmationProps) {
  const state = STATES_MAP[goal.stateId];
  const species = SPECIES_MAP[goal.speciesId];
  const vis = STATE_VISUALS[goal.stateId];
  const yearsOfBuilding = milestones.filter((m) => m.type === "buy_points" || m.type === "apply").length;
  const huntMilestones = milestones.filter((m) => m.type === "hunt").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDone} role="presentation" />
      <Card className="relative z-10 w-full max-w-md bg-card border-border shadow-2xl modal-content">
        <CardContent className="p-6 space-y-5">
          {/* Success header */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-success" />
            </div>
            <h2 className="text-lg font-bold">Goal Added!</h2>
          </div>

          {/* Goal identity */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <SpeciesAvatar speciesId={goal.speciesId} size={36} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{goal.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{species?.name}</span>
                {state && (
                  <div className={`text-[9px] px-1.5 py-0.5 rounded font-bold text-white bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
                    {state.abbreviation}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Evaluation text */}
          {evaluation && (
            <p className="text-xs text-primary font-medium p-2 rounded-lg bg-primary/5 border border-primary/10">
              {evaluation}
            </p>
          )}

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] text-muted-foreground font-medium">Projected Hunt</span>
              </div>
              <p className="text-sm font-bold">{huntMonth}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-success" />
                <span className="text-[10px] text-muted-foreground font-medium">Total Investment</span>
              </div>
              <p className="text-sm font-bold">
                ${totalCost.toLocaleString()}
                {yearsOfBuilding > 0 && (
                  <span className="text-[10px] text-muted-foreground font-normal ml-1">
                    over {yearsOfBuilding + huntMilestones} yr{yearsOfBuilding + huntMilestones !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
            {monthlySavings > 0 && (
              <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <PiggyBank className="w-3.5 h-3.5 text-warning" />
                  <span className="text-[10px] text-muted-foreground font-medium">Monthly Savings</span>
                </div>
                <p className="text-sm font-bold">${monthlySavings}/mo</p>
              </div>
            )}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-1.5 mb-1">
                <ListChecks className="w-3.5 h-3.5 text-info" />
                <span className="text-[10px] text-muted-foreground font-medium">Action Items</span>
              </div>
              <p className="text-sm font-bold">{milestones.length} created</p>
            </div>
          </div>

          {/* Milestone preview */}
          {milestones.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Action items added:</p>
              {milestones.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate mr-2">{m.year} — {m.title}</span>
                  <span className="font-mono text-muted-foreground shrink-0">${m.totalCost}</span>
                </div>
              ))}
              {milestones.length > 4 && (
                <p className="text-[10px] text-muted-foreground">+{milestones.length - 4} more</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onViewGoals}>
              View in Goals
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={onViewPlanner}>
              View in My Year
            </Button>
            <Button size="sm" className="flex-1" onClick={onDone}>
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
