"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  Clock,
  ExternalLink,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Download,
} from "lucide-react";
import { formatSpeciesName } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { STATES_MAP } from "@/lib/constants/states";
import { DataSourceInline } from "@/components/shared/DataSourceBadge";
import type { Milestone, UserGoal } from "@/lib/types";

interface MilestoneCalendarProps {
  milestones: Milestone[];
  userGoals: UserGoal[];
  completeMilestone: (id: string) => void;
  uncompleteMilestone: (id: string) => void;
  setDrawOutcome?: (id: string, outcome: "drew" | "didnt_draw" | null) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Full month names used everywhere — no abbreviations

interface MonthGroup {
  key: string;          // "2026-03"
  label: string;        // "March 2026"
  abbr: string;         // "March"
  year: number;
  month: number;        // 0-indexed
  milestones: Milestone[];
  totalCost: number;
  completedCount: number;
  isCurrentMonth: boolean;
  isPast: boolean;
}

/** Generate an RFC 5545 ICS calendar file from milestones */
function generateICS(milestones: Milestone[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Odyssey Outdoors//Hunt Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Odyssey Hunt Plan",
  ];

  for (const ms of milestones) {
    if (!ms.dueDate) continue;
    const d = new Date(ms.dueDate);
    const dtStr = d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const state = STATES_MAP[ms.stateId];
    const stateName = state?.name ?? ms.stateId;
    const speciesName = formatSpeciesName(ms.speciesId);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ms.id}@odysseyoutdoors.com`);
    lines.push(`DTSTART;VALUE=DATE:${dtStr.slice(0, 8)}`);
    lines.push(`SUMMARY:${ms.title}`);
    lines.push(`DESCRIPTION:${stateName} — ${speciesName}. ${ms.description.replace(/\n/g, "\\n")}`);
    if (ms.url) lines.push(`URL:${ms.url}`);
    // Reminder 7 days before
    lines.push("BEGIN:VALARM");
    lines.push("TRIGGER:-P7D");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:${ms.title} is due in 7 days`);
    lines.push("END:VALARM");
    // Reminder 1 day before
    lines.push("BEGIN:VALARM");
    lines.push("TRIGGER:-P1D");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:${ms.title} is due tomorrow`);
    lines.push("END:VALARM");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function MilestoneCalendar({
  milestones,
  userGoals,
  completeMilestone,
  uncompleteMilestone,
  setDrawOutcome,
}: MilestoneCalendarProps) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Group milestones by month
  const monthGroups = useMemo(() => {
    const groups = new Map<string, Milestone[]>();

    // Create entries for all 12 months of the selected year
    for (let m = 0; m < 12; m++) {
      const key = `${selectedYear}-${String(m).padStart(2, "0")}`;
      groups.set(key, []);
    }

    // Sort milestones into months
    for (const ms of milestones) {
      if (ms.year !== selectedYear) continue;

      // Use dueDate if available, else fall back to year only (place in January)
      let month = 0;
      if (ms.dueDate) {
        const d = new Date(ms.dueDate);
        if (d.getFullYear() === selectedYear) {
          month = d.getMonth();
        }
      }

      const key = `${selectedYear}-${String(month).padStart(2, "0")}`;
      const arr = groups.get(key) ?? [];
      arr.push(ms);
      groups.set(key, arr);
    }

    // Convert to array, sort by month
    const result: MonthGroup[] = [];
    for (let m = 0; m < 12; m++) {
      const key = `${selectedYear}-${String(m).padStart(2, "0")}`;
      const ms = groups.get(key) ?? [];
      // Sort milestones within month by due date
      ms.sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        return 1;
      });

      result.push({
        key,
        label: `${MONTH_NAMES[m]} ${selectedYear}`,
        abbr: MONTH_NAMES[m],
        year: selectedYear,
        month: m,
        milestones: ms,
        totalCost: ms.reduce((s, ms) => s + ms.totalCost, 0),
        completedCount: ms.filter((ms) => ms.completed).length,
        isCurrentMonth: key === currentMonthKey,
        isPast: selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && m < now.getMonth()),
      });
    }

    return result;
  }, [milestones, selectedYear, currentMonthKey, now]);

  // Stats for the year
  const yearMilestones = milestones.filter((m) => m.year === selectedYear);
  const yearTotal = yearMilestones.reduce((s, m) => s + m.totalCost, 0);
  const yearCompleted = yearMilestones.filter((m) => m.completed).length;
  const monthsWithActions = monthGroups.filter((g) => g.milestones.length > 0).length;

  // Available years
  const years = useMemo(() => {
    const yrs = new Set<number>();
    for (const ms of milestones) {
      yrs.add(ms.year);
    }
    // Always include current year and next 2
    yrs.add(now.getFullYear());
    yrs.add(now.getFullYear() + 1);
    yrs.add(now.getFullYear() + 2);
    return Array.from(yrs).sort();
  }, [milestones, now]);

  return (
    <div className="space-y-4">
      {/* Year selector + stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear((y) => Math.max(years[0], y - 1))}
            className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
            disabled={selectedYear <= years[0]}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-lg font-bold font-mono w-14 text-center">{selectedYear}</h3>
          <button
            onClick={() => setSelectedYear((y) => Math.min(years[years.length - 1], y + 1))}
            className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
            disabled={selectedYear >= years[years.length - 1]}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{yearCompleted}/{yearMilestones.length} done</span>
          <span>${Math.round(yearTotal).toLocaleString()} total</span>
          <span>{monthsWithActions} active months</span>
          {yearMilestones.length > 0 && (
            <button
              onClick={() => {
                const ics = generateICS(yearMilestones);
                const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `odyssey-${selectedYear}-deadlines.ics`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary hover:bg-accent transition-colors cursor-pointer"
              title="Export to calendar"
            >
              <Download className="w-3 h-3" />
              <span>.ics</span>
            </button>
          )}
        </div>
      </div>

      {/* Month grid — compact overview */}
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1.5">
        {monthGroups.map((group) => {
          const hasActions = group.milestones.length > 0;
          const allDone = hasActions && group.completedCount === group.milestones.length;

          return (
            <a
              key={group.key}
              href={`#month-${group.key}`}
              className={`p-2 rounded-lg text-center transition-all ${
                group.isCurrentMonth
                  ? "bg-primary/10 border border-primary/30 ring-1 ring-primary/20"
                  : hasActions
                    ? "bg-secondary/50 border border-border hover:border-primary/30"
                    : "bg-secondary/20 border border-transparent"
              }`}
            >
              <p className={`text-[9px] font-semibold truncate ${
                group.isCurrentMonth ? "text-primary" : group.isPast ? "text-muted-foreground/50" : "text-muted-foreground"
              }`}>
                {group.abbr}
              </p>
              {hasActions ? (
                <>
                  <p className={`text-sm font-bold mt-0.5 ${allDone ? "text-chart-2" : group.isCurrentMonth ? "text-primary" : ""}`}>
                    {group.milestones.length}
                  </p>
                  {group.totalCost > 0 && (
                    <p className="text-[8px] text-muted-foreground font-mono">${Math.round(group.totalCost).toLocaleString()}</p>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground/30 mt-1">—</p>
              )}
            </a>
          );
        })}
      </div>

      {/* Month-by-month detail */}
      <div className="space-y-2">
        {monthGroups.filter((g) => g.milestones.length > 0).map((group) => (
          <div key={group.key} id={`month-${group.key}`} className="scroll-mt-4">
            <Card className={`bg-card border-border ${group.isCurrentMonth ? "ring-1 ring-primary/20" : ""}`}>
              <CardContent className="p-4">
                {/* Month header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className={`w-4 h-4 ${group.isCurrentMonth ? "text-primary" : "text-muted-foreground"}`} />
                    <h4 className={`font-semibold text-sm ${group.isCurrentMonth ? "text-primary" : ""}`}>
                      {group.label}
                    </h4>
                    {group.isCurrentMonth && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">NOW</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{group.completedCount}/{group.milestones.length}</span>
                    {group.totalCost > 0 && (
                      <span className="font-mono">${Math.round(group.totalCost).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {/* Milestone items */}
                <div className="space-y-2">
                  {group.milestones.map((milestone) => {
                    const state = STATES_MAP[milestone.stateId];
                    const isGoalMs = milestone.planId && userGoals.some((g) => g.id === milestone.planId);
                    const isOverdue = milestone.dueDate && new Date(milestone.dueDate) < now && !milestone.completed;
                    const daysLeft = milestone.dueDate ? Math.ceil((new Date(milestone.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                    const isUrgent = daysLeft !== null && daysLeft > 0 && daysLeft <= 14 && !milestone.completed;

                    return (
                      <div
                        key={milestone.id}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                          milestone.completed
                            ? "bg-secondary/20 opacity-60"
                            : isOverdue
                              ? "bg-destructive/5 border border-destructive/15"
                              : "bg-secondary/30"
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => milestone.completed ? uncompleteMilestone(milestone.id) : completeMilestone(milestone.id)}
                          aria-label={milestone.completed ? `Mark "${milestone.title}" incomplete` : `Mark "${milestone.title}" complete`}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            milestone.completed ? "bg-chart-2 border-chart-2" : "border-border hover:border-primary"
                          }`}
                        >
                          {milestone.completed && <Check className="w-3 h-3 text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {state && (
                              <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ backgroundColor: state.color }}>
                                {state.abbreviation}
                              </div>
                            )}
                            {isGoalMs && (
                              <span className="px-1 py-0.5 rounded text-[8px] font-semibold bg-chart-4/15 text-chart-4">Goal</span>
                            )}
                            <h5 className={`text-sm font-medium truncate ${milestone.completed ? "line-through text-muted-foreground" : ""}`}>
                              {milestone.title}
                            </h5>
                          </div>

                          <p className="text-[11px] text-muted-foreground line-clamp-1">{milestone.description}</p>

                          <div className="flex items-center gap-3 mt-1.5">
                            {milestone.dueDate && (
                              <span className={`text-[10px] flex items-center gap-1 ${
                                isOverdue ? "text-destructive font-medium" : isUrgent ? "text-chart-4 font-medium" : "text-muted-foreground"
                              }`}>
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(milestone.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                {isUrgent && (
                                  <span className={`ml-1 px-1 py-0.5 rounded text-[8px] font-bold ${daysLeft! <= 3 ? "bg-destructive/15 text-destructive" : daysLeft! <= 7 ? "bg-chart-4/15 text-chart-4" : "bg-chart-4/10 text-chart-4/80"}`}>
                                    {daysLeft}d left
                                  </span>
                                )}
                              </span>
                            )}
                            {milestone.drawResultDate && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                Results: {new Date(milestone.drawResultDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                            {milestone.totalCost > 0 && (
                              <span className="text-[10px] text-primary font-medium font-mono">${milestone.totalCost}</span>
                            )}
                            <DataSourceInline stateId={milestone.stateId} />
                          </div>

                          {/* Itemized costs (collapsed) */}
                          {milestone.costs.length > 1 && !milestone.completed && (
                            <div className="mt-2 p-2 rounded bg-secondary/30 space-y-0.5">
                              {milestone.costs.map((cost, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[10px]">
                                  <span className="text-muted-foreground">{cost.label}</span>
                                  <span className="font-mono">${cost.amount}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Draw outcome workflow */}
                          {setDrawOutcome && milestone.type === "apply" && milestone.drawResultDate && milestone.completed && (
                            <div className="mt-2 flex items-center gap-2">
                              {milestone.drawOutcome ? (
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                    milestone.drawOutcome === "drew"
                                      ? "bg-chart-2/15 text-chart-2"
                                      : "bg-secondary text-muted-foreground"
                                  }`}>
                                    {milestone.drawOutcome === "drew" ? "Drew Tag" : "Didn't Draw"}
                                  </span>
                                  <button
                                    onClick={() => setDrawOutcome(milestone.id, null)}
                                    className="text-[9px] text-muted-foreground/50 hover:text-muted-foreground underline"
                                  >
                                    reset
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-[10px] text-muted-foreground">Draw result:</span>
                                  <button
                                    onClick={() => setDrawOutcome(milestone.id, "drew")}
                                    className="text-[10px] px-2 py-0.5 rounded bg-chart-2/15 text-chart-2 font-medium hover:bg-chart-2/25 transition-colors"
                                  >
                                    Drew Tag
                                  </button>
                                  <button
                                    onClick={() => setDrawOutcome(milestone.id, "didnt_draw")}
                                    className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground font-medium hover:bg-accent transition-colors"
                                  >
                                    Didn&apos;t Draw
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action link */}
                        {milestone.url && !milestone.completed && (
                          <a
                            href={milestone.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                            aria-label={`Open ${state?.name ?? ""} Fish & Game`}
                          >
                            <ExternalLink className="w-3 h-3 text-primary" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pro tip for the month */}
                {group.milestones.some((m) => m.applicationTip && !m.completed) && (
                  <div className="mt-3 p-2 rounded-lg bg-chart-1/5 border border-chart-1/10">
                    <p className="text-[10px] text-chart-1 font-medium">
                      Tip: {group.milestones.find((m) => m.applicationTip && !m.completed)?.applicationTip}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}

        {yearMilestones.length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No action items for {selectedYear}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a different year or build a strategy to generate milestones</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
