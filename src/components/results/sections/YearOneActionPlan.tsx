"use client";

import { useMemo } from "react";
import type { StrategicAssessment } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { formatSpeciesName } from "@/lib/utils";
import { CalendarCheck, DollarSign, AlertCircle, Clock, Check, Hourglass, Trophy, X } from "lucide-react";

interface YearOneActionPlanProps {
  assessment: StrategicAssessment;
}

interface DeadlineAction {
  stateId: string;
  speciesId: string;
  type: "apply" | "buy_points" | "hunt" | "scout";
  description: string;
  cost: number;
  dueDate?: string;
  moveTag?: string;
}

type ActionStatus = "pending" | "completed" | "drew" | "didnt_draw";

function getStatusBadge(status: ActionStatus) {
  switch (status) {
    case "completed":
      return (
        <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-chart-2/15 text-chart-2 font-medium">
          <Check className="w-2.5 h-2.5" /> Done
        </span>
      );
    case "drew":
      return (
        <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
          <Trophy className="w-2.5 h-2.5" /> Drew!
        </span>
      );
    case "didnt_draw":
      return (
        <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-chart-4/15 text-chart-4 font-medium">
          <X className="w-2.5 h-2.5" /> Didn&apos;t draw
        </span>
      );
    default:
      return null;
  }
}

export function YearOneActionPlan({ assessment }: YearOneActionPlanProps) {
  const year1 = assessment.roadmap[0];
  const milestones = useAppStore((s) => s.milestones);
  if (!year1) return null;

  const { actions, sortedDeadlines, totalCost, upcomingCount } = useMemo(() => {
    const now = new Date();
    const allActions: DeadlineAction[] = year1.actions.map((a) => ({
      stateId: a.stateId,
      speciesId: a.speciesId,
      type: a.type,
      description: a.description,
      cost: a.cost,
      dueDate: a.dueDate,
      moveTag: a.moveTag,
    }));

    // Sort by deadline (soonest first), then actions without deadlines
    const sorted = [...allActions].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const total = allActions.reduce((s, a) => s + a.cost, 0);
    const upcoming = sorted.filter((a) => {
      if (!a.dueDate) return false;
      const deadline = new Date(a.dueDate);
      const daysOut = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysOut > 0 && daysOut <= 90;
    }).length;

    return { actions: allActions, sortedDeadlines: sorted, totalCost: total, upcomingCount: upcoming };
  }, [year1]);

  // Match roadmap actions → milestones by (stateId, speciesId, type, year)
  const statusMap = useMemo(() => {
    const map = new Map<string, ActionStatus>();
    for (const a of actions) {
      const key = `${a.stateId}-${a.speciesId}-${a.type}`;
      const match = milestones.find(
        (m) => m.stateId === a.stateId && m.speciesId === a.speciesId && m.type === a.type && m.year === year1.year
      );
      if (match) {
        if (match.drawOutcome === "drew") map.set(key, "drew");
        else if (match.drawOutcome === "didnt_draw") map.set(key, "didnt_draw");
        else if (match.completed) map.set(key, "completed");
        else map.set(key, "pending");
      } else {
        map.set(key, "pending");
      }
    }
    return map;
  }, [actions, milestones, year1.year]);

  if (actions.length === 0) return null;

  const completedCount = Array.from(statusMap.values()).filter((s) => s !== "pending").length;
  const hasProgress = completedCount > 0;

  // Group actions by state for compact display
  const byState = useMemo(() => {
    const map = new Map<string, DeadlineAction[]>();
    for (const a of sortedDeadlines) {
      const existing = map.get(a.stateId) ?? [];
      existing.push(a);
      map.set(a.stateId, existing);
    }
    return Array.from(map.entries());
  }, [sortedDeadlines]);

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold">Year 1 Action Plan</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
            {year1.year}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {hasProgress && (
            <span className="flex items-center gap-1 text-[10px] text-chart-2 font-medium">
              <Check className="w-3 h-3" />
              {completedCount}/{actions.length} done
            </span>
          )}
          {upcomingCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-chart-4 font-medium">
              <AlertCircle className="w-3 h-3" />
              {upcomingCount} deadline{upcomingCount > 1 ? "s" : ""} within 90 days
            </span>
          )}
        </div>
      </div>

      {/* Progress bar — only shows when user has started tracking */}
      {hasProgress && (
        <div className="mb-4">
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-chart-2 transition-all duration-500"
              style={{ width: `${Math.round((completedCount / actions.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-2.5 rounded-lg bg-background/50 border border-border/50 text-center">
          <p className="text-lg font-bold text-primary">{actions.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Actions</p>
        </div>
        <div className="p-2.5 rounded-lg bg-background/50 border border-border/50 text-center">
          <p className="text-lg font-bold text-chart-2">${Math.round(totalCost).toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Year 1 Cost</p>
        </div>
        <div className="p-2.5 rounded-lg bg-background/50 border border-border/50 text-center">
          <p className="text-lg font-bold text-foreground">{byState.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">States</p>
        </div>
      </div>

      {/* Action list by state */}
      <div className="space-y-2">
        {byState.map(([stateId, stateActions]) => {
          const state = STATES_MAP[stateId];
          const vis = STATE_VISUALS[stateId];
          if (!state) return null;

          const stateCost = stateActions.reduce((s, a) => s + a.cost, 0);
          const earliestDeadline = stateActions
            .filter((a) => a.dueDate)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0]?.dueDate;

          const now = new Date();
          const daysUntilDeadline = earliestDeadline
            ? Math.ceil((new Date(earliestDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

          const isUrgent = daysUntilDeadline !== null && daysUntilDeadline > 0 && daysUntilDeadline <= 30;
          const isPast = daysUntilDeadline !== null && daysUntilDeadline <= 0;

          // Check if all actions in this state are done
          const stateStatuses = stateActions.map((a) => statusMap.get(`${a.stateId}-${a.speciesId}-${a.type}`) ?? "pending");
          const allDone = stateStatuses.every((s) => s !== "pending");

          return (
            <div
              key={stateId}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                allDone
                  ? "border-chart-2/30 bg-chart-2/5"
                  : isUrgent
                    ? "border-chart-4/40 bg-chart-4/5"
                    : "border-border/50 bg-background/30"
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"} ${allDone ? "opacity-60" : ""}`}>
                {allDone ? <Check className="w-4 h-4" /> : state.abbreviation}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-semibold ${allDone ? "line-through opacity-60" : ""}`}>{state.name}</span>
                  <div className="flex gap-0.5">
                    {[...new Set(stateActions.map((a) => a.speciesId))].map((sp) => (
                      <SpeciesAvatar key={sp} speciesId={sp} size={14} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  {stateActions.map((a, i) => {
                    const status = statusMap.get(`${a.stateId}-${a.speciesId}-${a.type}`) ?? "pending";
                    return (
                      <span key={i} className="flex items-center gap-0.5">
                        {a.type === "buy_points" ? "Buy pts" : a.type === "apply" ? "Apply" : a.type === "hunt" ? "Hunt" : "Scout"}
                        {a.speciesId && <span className="text-muted-foreground/60">({formatSpeciesName(a.speciesId)})</span>}
                        {getStatusBadge(status)}
                        {i < stateActions.length - 1 && <span className="text-muted-foreground/30 mx-0.5">&middot;</span>}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {earliestDeadline && !isPast && !allDone && (
                  <div className={`flex items-center gap-1 text-[10px] ${isUrgent ? "text-chart-4 font-semibold" : "text-muted-foreground"}`}>
                    <Clock className="w-3 h-3" />
                    {new Date(earliestDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {isUrgent && <span>({daysUntilDeadline}d)</span>}
                  </div>
                )}
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  ${Math.round(stateCost).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-muted-foreground/60 mt-3">
        {hasProgress
          ? "Status synced from your milestone tracker. Mark actions complete on the Roadmap page."
          : "Deadlines shown are application close dates. Apply early \u2014 some states have capacity limits."}
      </p>
    </div>
  );
}
