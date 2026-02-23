"use client";

import { useMemo } from "react";
import { useAppStore, useWizardStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { formatSpeciesName } from "@/lib/utils";
import { resolveFees } from "@/lib/engine/fee-resolver";
import type { Milestone, StrategicAssessment } from "@/lib/types";
import {
  ClipboardCheck,
  Check,
  Trophy,
  X,
  Hourglass,
  Clock,
  ArrowRight,
  CircleDot,
} from "lucide-react";

interface ApplicationStatusBoardProps {
  assessment: StrategicAssessment;
}

type StatusPhase =
  | "not_started"    // Deadline hasn't passed, haven't applied
  | "applied"        // User marked as completed (applied)
  | "awaiting_draw"  // Applied, waiting for draw results
  | "drew"           // Drew the tag
  | "didnt_draw"     // Didn't draw
  | "points_bought"  // Point purchase completed
  | "hunt_planned"   // Hunt action, not yet completed
  | "hunt_complete"; // Hunt completed

interface StatusEntry {
  milestone: Milestone;
  phase: StatusPhase;
  nextAction?: string;
  daysUntilDrawResult?: number;
  daysUntilDeadline?: number;
}

function resolvePhase(m: Milestone): StatusPhase {
  if (m.type === "buy_points") {
    return m.completed ? "points_bought" : "not_started";
  }
  if (m.type === "hunt" || m.type === "scout") {
    return m.completed ? "hunt_complete" : "hunt_planned";
  }
  // apply or deadline type
  if (m.drawOutcome === "drew") return "drew";
  if (m.drawOutcome === "didnt_draw") return "didnt_draw";
  if (m.completed) {
    // Applied but no draw result yet
    return "awaiting_draw";
  }
  return "not_started";
}

/** Format YYYY-MM-DD → "April 7, 2026" */
function formatNAM(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getNextAction(entry: StatusEntry): string {
  switch (entry.phase) {
    case "not_started": {
      if (entry.daysUntilDeadline !== undefined && entry.daysUntilDeadline > 0) {
        return `Submit your application by ${formatNAM(entry.milestone.dueDate!)} (${entry.daysUntilDeadline} days left)`;
      }
      return "The deadline has passed — check the state's website for late application options";
    }
    case "applied":
      return "Your application is in — waiting for draw results";
    case "awaiting_draw": {
      if (entry.daysUntilDrawResult !== undefined && entry.daysUntilDrawResult > 0) {
        return `Draw results expected in about ${entry.daysUntilDrawResult} days`;
      }
      return "Draw results should be out — check the state's website";
    }
    case "drew":
      return "You drew a tag! Time to start planning your hunt";
    case "didnt_draw":
      return "You didn't draw this year — your points carry over to next year";
    case "points_bought":
      return "Point purchased — it'll help your odds next time you apply";
    case "hunt_planned":
      return "You have a hunt coming up — start prepping gear and logistics";
    case "hunt_complete":
      return "Hunt complete";
  }
}

const PHASE_STYLES: Record<StatusPhase, { icon: React.ReactNode; color: string; bg: string }> = {
  not_started: {
    icon: <CircleDot className="w-3.5 h-3.5" />,
    color: "text-muted-foreground",
    bg: "bg-secondary/30",
  },
  applied: {
    icon: <Check className="w-3.5 h-3.5" />,
    color: "text-info",
    bg: "bg-info/10",
  },
  awaiting_draw: {
    icon: <Hourglass className="w-3.5 h-3.5" />,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  drew: {
    icon: <Trophy className="w-3.5 h-3.5" />,
    color: "text-chart-2",
    bg: "bg-chart-2/10",
  },
  didnt_draw: {
    icon: <X className="w-3.5 h-3.5" />,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  points_bought: {
    icon: <Check className="w-3.5 h-3.5" />,
    color: "text-info",
    bg: "bg-info/10",
  },
  hunt_planned: {
    icon: <Clock className="w-3.5 h-3.5" />,
    color: "text-success",
    bg: "bg-success/10",
  },
  hunt_complete: {
    icon: <Check className="w-3.5 h-3.5" />,
    color: "text-success",
    bg: "bg-success/10",
  },
};

const PHASE_LABELS: Record<StatusPhase, string> = {
  not_started: "Not Started",
  applied: "Applied",
  awaiting_draw: "Awaiting Draw",
  drew: "Drew!",
  didnt_draw: "Didn't Draw",
  points_bought: "Points Bought",
  hunt_planned: "Upcoming Hunt",
  hunt_complete: "Hunt Complete",
};

/** Build a one-line fee summary for an action */
function buildFeeSummary(
  stateId: string,
  speciesId: string,
  actionType: string,
  homeState: string,
): string | null {
  const state = STATES_MAP[stateId];
  if (!state) return null;
  const fees = resolveFees(state, homeState);
  const parts: string[] = [];

  if (actionType === "apply") {
    // Qualifying license (if required)
    if (fees.qualifyingLicense > 0) {
      parts.push(`$${Math.round(fees.qualifyingLicense)} license`);
    }
    // Non-refundable app fee
    if (fees.appFee > 0) {
      parts.push(`$${Math.round(fees.appFee)} app (non-refundable)`);
    }
    // Tag cost if drawn
    const tagCost = fees.tagCosts[speciesId] ?? 0;
    if (tagCost > 0) {
      parts.push(`If drawn: $${Math.round(tagCost).toLocaleString()} tag`);
    }
  } else if (actionType === "buy_points") {
    const ptCost = fees.pointCost[speciesId] ?? 0;
    if (ptCost > 0) {
      parts.push(`$${Math.round(ptCost)} point fee`);
    }
    // Check if license is refundable
    const licNote = fees.feeSchedule.find(
      (f) => f.name.toLowerCase().includes("license") || f.name.toLowerCase().includes("qualifying"),
    );
    if (fees.qualifyingLicense > 0) {
      const refundable = licNote?.notes?.toLowerCase().includes("refund") ?? false;
      parts.push(
        `$${Math.round(fees.qualifyingLicense)} license${refundable ? " (refundable if no draw)" : ""}`,
      );
    }
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ApplicationStatusBoard({ assessment }: ApplicationStatusBoardProps) {
  const milestones = useAppStore((s) => s.milestones);
  const homeState = useWizardStore((s) => s.homeState);
  const currentYear = new Date().getFullYear();

  const entries = useMemo(() => {
    const now = new Date();
    // Get milestones for the current year (or Year 1 of the plan)
    const year1 = assessment.roadmap[0]?.year ?? currentYear;
    const targetYear = Math.max(year1, currentYear);

    const yearMilestones = milestones.filter((m) => m.year === targetYear);
    if (yearMilestones.length === 0) return [];

    return yearMilestones.map((m): StatusEntry => {
      const phase = resolvePhase(m);

      let daysUntilDrawResult: number | undefined;
      if (m.drawResultDate) {
        const drawDate = new Date(m.drawResultDate);
        daysUntilDrawResult = Math.ceil((drawDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      let daysUntilDeadline: number | undefined;
      if (m.dueDate) {
        const deadline = new Date(m.dueDate);
        daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      const entry: StatusEntry = { milestone: m, phase, daysUntilDrawResult, daysUntilDeadline };
      entry.nextAction = getNextAction(entry);
      return entry;
    }).sort((a, b) => {
      // Priority: awaiting_draw > not_started > drew > didnt_draw > points_bought > hunt_* > complete
      const priority: Record<StatusPhase, number> = {
        awaiting_draw: 0,
        not_started: 1,
        hunt_planned: 2,
        drew: 3,
        didnt_draw: 4,
        applied: 5,
        points_bought: 6,
        hunt_complete: 7,
      };
      return (priority[a.phase] ?? 5) - (priority[b.phase] ?? 5);
    });
  }, [milestones, assessment.roadmap, currentYear]);

  // Don't render if no milestones at all
  if (entries.length === 0) return null;

  // Compute summary counts
  const counts = useMemo(() => {
    const c = { total: entries.length, completed: 0, awaitingDraw: 0, drew: 0, didntDraw: 0, pending: 0 };
    for (const e of entries) {
      if (e.phase === "drew") c.drew++;
      else if (e.phase === "didnt_draw") c.didntDraw++;
      else if (e.phase === "awaiting_draw") c.awaitingDraw++;
      else if (e.phase === "points_bought" || e.phase === "hunt_complete" || e.phase === "applied") c.completed++;
      else c.pending++;
    }
    return c;
  }, [entries]);

  // Group by state
  const byState = useMemo(() => {
    const map = new Map<string, StatusEntry[]>();
    for (const e of entries) {
      const existing = map.get(e.milestone.stateId) ?? [];
      existing.push(e);
      map.set(e.milestone.stateId, existing);
    }
    return Array.from(map.entries());
  }, [entries]);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4.5 h-4.5 text-primary" />
          <h3 className="text-sm font-bold">Application Status</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
            {assessment.roadmap[0]?.year ?? currentYear}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {counts.drew > 0 && (
            <span className="flex items-center gap-1 text-primary font-medium">
              <Trophy className="w-3 h-3" /> {counts.drew} drew
            </span>
          )}
          {counts.awaitingDraw > 0 && (
            <span className="flex items-center gap-1 text-warning font-medium">
              <Hourglass className="w-3 h-3" /> {counts.awaitingDraw} pending
            </span>
          )}
          {counts.pending > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground font-medium">
              {counts.pending} to do
            </span>
          )}
        </div>
      </div>

      {/* State-by-state status */}
      <div className="space-y-2">
        {byState.map(([stateId, stateEntries]) => {
          const state = STATES_MAP[stateId];
          const vis = STATE_VISUALS[stateId];
          if (!state) return null;

          return (
            <div key={stateId} className="rounded-lg border border-border/40 overflow-hidden">
              {/* State header */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-muted/20">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
                  {state.abbreviation}
                </div>
                <span className="text-xs font-semibold">{state.name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {stateEntries.filter((e) => e.phase !== "not_started").length}/{stateEntries.length} actions done
                </span>
              </div>

              {/* Per-milestone status rows */}
              <div className="divide-y divide-border/30">
                {stateEntries.map((entry) => {
                  const style = PHASE_STYLES[entry.phase];
                  const m = entry.milestone;

                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/10 transition-colors"
                    >
                      {/* Status icon */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
                        {style.icon}
                      </div>

                      {/* Species + type */}
                      <SpeciesAvatar speciesId={m.speciesId} size={16} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">
                            {formatSpeciesName(m.speciesId)}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${style.bg} ${style.color}`}>
                            {PHASE_LABELS[entry.phase]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <ArrowRight className="w-2.5 h-2.5 shrink-0" />
                          <span>{entry.nextAction}</span>
                        </div>
                        {/* Fee breakdown / refund info */}
                        {(() => {
                          const summary = buildFeeSummary(m.stateId, m.speciesId, m.type, homeState);
                          if (!summary) return null;
                          return (
                            <p className="text-[9px] text-muted-foreground/50 mt-0.5 leading-relaxed">
                              {summary}
                            </p>
                          );
                        })()}
                      </div>

                      {/* Cost */}
                      {m.totalCost > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          ${Math.round(m.totalCost).toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-muted-foreground/50">
        Mark milestones complete and record draw results on the Goals page to keep this board updated.
      </p>
    </div>
  );
}
