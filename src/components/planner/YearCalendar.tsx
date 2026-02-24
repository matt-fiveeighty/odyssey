"use client";

/**
 * YearCalendar — compact 12-month grid where each card is a real mini calendar
 * showing day numbers in a 7-column (S M T W T F S) grid. Days with
 * events are highlighted; clicking a day shows a floating popover with details.
 *
 * Layout: 2-col mobile → 3-col md → 4-col lg → 6-col xl (all 12 above fold)
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Download, X, Pencil, Check as CheckIcon } from "lucide-react";
import { PlanItemCard, ITEM_TYPE_CONFIG } from "./PlanItemCard";
import { exportPlanItem } from "@/lib/calendar-export";
import type { PlanItem } from "./PlanItemCard";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface YearCalendarProps {
  itemsByMonth: Record<number, PlanItem[]>;
  selectedYear: number;
  onToggleComplete: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateItem?: (id: string, updates: Partial<Pick<PlanItem, "month" | "day" | "endMonth" | "endDay">>) => void;
}

// ---------------------------------------------------------------------------
// Inline Hunt Duration Editor
// ---------------------------------------------------------------------------

function HuntDurationEditor({
  item,
  selectedYear,
  onSave,
}: {
  item: PlanItem;
  selectedYear: number;
  onSave: (updates: Partial<Pick<PlanItem, "month" | "day" | "endMonth" | "endDay">>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [startMonth, setStartMonth] = useState(item.month);
  const [startDay, setStartDay] = useState(item.day ?? 1);
  const [endMonth, setEndMonth] = useState(item.endMonth ?? item.month);
  const [endDay, setEndDay] = useState(item.endDay ?? (item.day ?? 28));

  const daysInStartMonth = new Date(selectedYear, startMonth, 0).getDate();
  const daysInEndMonth = new Date(selectedYear, endMonth, 0).getDate();

  function handleSave() {
    onSave({
      month: startMonth,
      day: startDay,
      endMonth: endMonth,
      endDay: endDay,
    });
    setEditing(false);
  }

  // Format a short date like "Sep 15"
  const fmtDate = (m: number, d?: number) => {
    const mn = MONTH_NAMES[m - 1]?.slice(0, 3) ?? "???";
    return d ? `${mn} ${d}` : mn;
  };

  if (!editing) {
    const startStr = fmtDate(item.month, item.day);
    const endStr =
      item.endMonth || item.endDay
        ? fmtDate(item.endMonth ?? item.month, item.endDay)
        : null;

    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
        title="Edit hunt dates"
      >
        <Pencil className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
        <span className="tabular-nums">
          {startStr}
          {endStr ? ` – ${endStr}` : ""}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 mt-1 p-1.5 rounded bg-secondary/20 border border-border/50" onClick={(e) => e.stopPropagation()}>
      {/* Start date row */}
      <div className="flex items-center gap-1 text-[9px]">
        <span className="text-muted-foreground w-8 shrink-0">Start</span>
        <select
          value={startMonth}
          onChange={(e) => {
            const m = Number(e.target.value);
            setStartMonth(m);
            if (m > endMonth) setEndMonth(m);
            const maxDay = new Date(selectedYear, m, 0).getDate();
            if (startDay > maxDay) setStartDay(maxDay);
          }}
          className="bg-background border border-border rounded px-1 py-0.5 text-[9px] w-[70px]"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i} value={i + 1}>{name.slice(0, 3)}</option>
          ))}
        </select>
        <select
          value={startDay}
          onChange={(e) => setStartDay(Number(e.target.value))}
          className="bg-background border border-border rounded px-1 py-0.5 text-[9px] w-[42px]"
        >
          {Array.from({ length: daysInStartMonth }).map((_, i) => (
            <option key={i} value={i + 1}>{i + 1}</option>
          ))}
        </select>
      </div>
      {/* End date row */}
      <div className="flex items-center gap-1 text-[9px]">
        <span className="text-muted-foreground w-8 shrink-0">End</span>
        <select
          value={endMonth}
          onChange={(e) => {
            const m = Number(e.target.value);
            setEndMonth(m);
            const maxDay = new Date(selectedYear, m, 0).getDate();
            if (endDay > maxDay) setEndDay(maxDay);
          }}
          className="bg-background border border-border rounded px-1 py-0.5 text-[9px] w-[70px]"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i} value={i + 1}>{name.slice(0, 3)}</option>
          ))}
        </select>
        <select
          value={endDay}
          onChange={(e) => setEndDay(Number(e.target.value))}
          className="bg-background border border-border rounded px-1 py-0.5 text-[9px] w-[42px]"
        >
          {Array.from({ length: daysInEndMonth }).map((_, i) => (
            <option key={i} value={i + 1}>{i + 1}</option>
          ))}
        </select>
        <button
          onClick={handleSave}
          className="ml-auto p-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors cursor-pointer"
          title="Save dates"
        >
          <CheckIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

/** Build a lookup: day → PlanItem[] for a given month */
function buildDayMap(items: PlanItem[], month: number, daysInMonth: number) {
  const map: Record<number, PlanItem[]> = {};
  for (const item of items) {
    if (item.type !== "hunt") {
      const day = item.day ?? 1;
      if (!map[day]) map[day] = [];
      if (!map[day].some((e) => e.id === item.id)) map[day].push(item);
      continue;
    }

    const startDay = item.month === month ? (item.day ?? 1) : 1;
    const endDay =
      item.endMonth === month || (!item.endMonth && item.month === month)
        ? (item.endDay ?? (item.day ?? daysInMonth))
        : item.endMonth && item.endMonth > month
        ? daysInMonth
        : (item.endDay ?? daysInMonth);

    for (let d = startDay; d <= endDay; d++) {
      if (!map[d]) map[d] = [];
      if (!map[d].some((e) => e.id === item.id)) map[d].push(item);
    }
  }
  return map;
}

export function YearCalendar({
  itemsByMonth,
  selectedYear,
  onToggleComplete,
  onRemove,
  onUpdateItem,
}: YearCalendarProps) {
  const [selectedCell, setSelectedCell] = useState<{
    month: number;
    day: number;
  } | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();

  // Close popover on outside click
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Check if the click was on a day button (they toggle themselves)
        const target = e.target as HTMLElement;
        if (target.closest("[data-day-btn]")) return;
        setSelectedCell(null);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedCell) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }
  }, [selectedCell, handleOutsideClick]);

  // Precompute per-month data
  const monthData = useMemo(() => {
    return Array.from({ length: 12 }).map((_, idx) => {
      const month = idx + 1;
      const daysInMonth = new Date(selectedYear, month, 0).getDate();
      const firstDow = new Date(selectedYear, month - 1, 1).getDay();
      const items = itemsByMonth[month] ?? [];
      const dayMap = buildDayMap(items, month, daysInMonth);
      return { month, daysInMonth, firstDow, items, dayMap };
    });
  }, [itemsByMonth, selectedYear]);

  // Items for the selected day
  const selectedDayItems = selectedCell
    ? monthData[selectedCell.month - 1].dayMap[selectedCell.day] ?? []
    : [];

  return (
    <div className="space-y-2">
      {/* 12-month grid — 6-col at xl so all months fit in 2 rows above fold */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
        {monthData.map(({ month, daysInMonth, firstDow, items, dayMap }) => {
          const isCurrentMonth =
            selectedYear === todayYear && month === todayMonth;
          const hasDeadline = items.some((i) => i.type === "deadline");
          const hasHunt = items.some((i) => i.type === "hunt");
          const isSelectedMonth = selectedCell?.month === month;

          return (
            <div key={month} className="relative">
              <Card
                className={`bg-card p-2 xl:p-1.5 transition-all ${
                  isCurrentMonth
                    ? "border-primary/30"
                    : hasHunt
                    ? "border-l-2 border-l-destructive border-border"
                    : hasDeadline
                    ? "border-l-2 border-l-warning border-border"
                    : "border-border"
                }`}
              >
                {/* Month name + item count */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs xl:text-[10px] font-bold truncate">{MONTH_NAMES[month - 1]}</span>
                  {items.length > 0 && (
                    <span className="text-[9px] xl:text-[8px] bg-primary/15 text-primary px-1 py-0.5 rounded-full font-medium leading-none">
                      {items.length}
                    </span>
                  )}
                </div>

                {/* Day-of-week header */}
                <div className="grid grid-cols-7 gap-px text-center mb-0.5">
                  {DAY_LABELS.map((d, i) => (
                    <span
                      key={i}
                      className="text-[8px] text-muted-foreground/50 font-medium leading-tight"
                    >
                      {d}
                    </span>
                  ))}
                </div>

                {/* Day grid — compact cells, no aspect-square at xl */}
                <div className="grid grid-cols-7 gap-px">
                  {Array.from({ length: firstDow }).map((_, i) => (
                    <div key={`pad-${i}`} className="aspect-square xl:h-4" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayItems = dayMap[day] ?? [];
                    const isToday =
                      selectedYear === todayYear &&
                      month === todayMonth &&
                      day === todayDay;
                    const isSelected =
                      selectedCell?.month === month && selectedCell?.day === day;

                    const hasHuntDay = dayItems.some((it) => it.type === "hunt");
                    const hasDeadlineDay = dayItems.some(
                      (it) => it.type === "deadline" || it.type === "application" || it.type === "point_purchase"
                    );
                    const hasOther = dayItems.length > 0 && !hasHuntDay && !hasDeadlineDay;

                    // Multi-plan: check if day has items from different plans
                    const planColors = [...new Set(dayItems.filter(it => it.planColor).map(it => it.planColor!))];
                    const hasMultiplePlans = planColors.length > 1;

                    return (
                      <button
                        key={day}
                        data-day-btn
                        onClick={() =>
                          setSelectedCell(
                            isSelected ? null : { month, day }
                          )
                        }
                        className={`
                          aspect-square xl:h-4 flex items-center justify-center rounded-sm text-[10px] xl:text-[8px] font-mono transition-colors relative cursor-pointer
                          ${
                            isSelected
                              ? "bg-primary/25 text-primary font-bold ring-1 ring-primary/50"
                              : isToday
                              ? "bg-primary/15 text-primary font-bold"
                              : hasHuntDay
                              ? "bg-destructive/15 text-destructive/90 hover:bg-destructive/25"
                              : hasDeadlineDay
                              ? "bg-warning/15 text-warning hover:bg-warning/25"
                              : hasOther
                              ? "bg-primary/8 text-foreground/80 hover:bg-primary/15"
                              : "text-muted-foreground/40 hover:bg-secondary/30 hover:text-muted-foreground/60"
                          }
                        `}
                      >
                        {day}
                        {dayItems.length > 1 && !isSelected && (
                          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full bg-current opacity-60" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Event labels below the day grid — color-coded by plan source */}
                {items.length > 0 && (
                  <div className="mt-1.5 space-y-0.5 max-h-[52px] overflow-hidden">
                    {(() => {
                      const seen = new Set<string>();
                      const unique = items.filter((item) => {
                        if (seen.has(item.id)) return false;
                        seen.add(item.id);
                        return true;
                      });
                      return unique.slice(0, 3).map((item) => {
                        const cfg = ITEM_TYPE_CONFIG[item.type];
                        // If item has a planColor, use it for the event chip (Google Calendar style)
                        const hasPlanColor = !!item.planColor;
                        const typeColors: Record<string, string> = {
                          hunt: "bg-destructive/15 text-destructive border-destructive/20",
                          deadline: "bg-warning/15 text-warning border-warning/20",
                          application: "bg-premium/15 text-premium border-premium/20",
                          point_purchase: "bg-chart-5/15 text-chart-5 border-chart-5/20",
                          scout: "bg-info/15 text-info border-info/20",
                          prep: "bg-success/15 text-success border-success/20",
                        };
                        const defaultClasses = typeColors[item.type] ?? "bg-secondary/30 text-muted-foreground border-border/30";

                        // Plan-colored style override
                        const planStyle = hasPlanColor
                          ? {
                              backgroundColor: `${item.planColor}20`,
                              borderColor: `${item.planColor}40`,
                              color: item.planColor,
                            }
                          : undefined;

                        const prefix = item.planName
                          ? `${item.planName.split(" ")[0].slice(0, 6)} · `
                          : item.stateId
                          ? `${item.stateId} `
                          : "";

                        return (
                          <button
                            key={item.id}
                            data-day-btn
                            onClick={() => setSelectedCell({ month, day: item.day ?? 1 })}
                            className={`w-full text-left px-1 py-0.5 rounded text-[7px] xl:text-[6px] font-medium truncate border cursor-pointer hover:opacity-80 transition-opacity ${!hasPlanColor ? defaultClasses : ""}`}
                            style={planStyle}
                          >
                            {prefix}{cfg.label}{item.day ? ` · ${item.day}` : ""}
                          </button>
                        );
                      });
                    })()}
                    {(() => {
                      const seen = new Set<string>();
                      const count = items.filter((item) => {
                        if (seen.has(item.id)) return false;
                        seen.add(item.id);
                        return true;
                      }).length;
                      return count > 3 ? (
                        <p className="text-[7px] text-muted-foreground/50 text-center">+{count - 3} more</p>
                      ) : null;
                    })()}
                  </div>
                )}
              </Card>

              {/* Floating popover — appears over the month card when a day is selected */}
              {isSelectedMonth && selectedCell && (
                <div
                  ref={popoverRef}
                  className="absolute z-50 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-xl p-3 fade-in-up w-[280px]"
                  style={{ maxHeight: "320px", overflowY: "auto" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold">
                      {new Date(
                        selectedYear,
                        selectedCell.month - 1,
                        selectedCell.day
                      ).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <button
                      onClick={() => setSelectedCell(null)}
                      className="p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded hover:bg-secondary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {selectedDayItems.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/50">
                      No items scheduled
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-2 rounded-md bg-secondary/10 border border-border/50"
                          style={item.planColor ? { borderLeftColor: item.planColor, borderLeftWidth: "3px" } : undefined}
                        >
                          {/* Plan source badge */}
                          {item.planName && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: item.planColor }}
                              />
                              <span className="text-[8px] font-medium" style={{ color: item.planColor }}>
                                {item.planName}
                              </span>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <PlanItemCard
                                item={item}
                                expanded={!item.planId} // Only show edit/remove for own items
                                onToggleComplete={onToggleComplete}
                                onRemove={onRemove}
                              />
                              {item.description && (
                                <p className="text-[10px] text-muted-foreground/60 mt-1 ml-6 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {item.estimatedCost != null && item.estimatedCost > 0 && (
                                <span className="text-[10px] text-chart-2 font-medium">
                                  ${item.estimatedCost}
                                </span>
                              )}
                              <button
                                onClick={() =>
                                  exportPlanItem({
                                    title: item.title,
                                    description: item.description,
                                    year: selectedYear,
                                    month: item.month,
                                    day: item.day,
                                    endMonth: item.endMonth,
                                    endDay: item.endDay,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                title="Export to calendar (.ics)"
                              >
                                <Download className="w-2.5 h-2.5" />
                                .ics
                              </button>
                            </div>
                          </div>
                          {/* Inline hunt duration editor */}
                          {item.type === "hunt" && onUpdateItem && (
                            <div className="mt-1.5 ml-6">
                              <HuntDurationEditor
                                item={item}
                                selectedYear={selectedYear}
                                onSave={(updates) => onUpdateItem(item.id, updates)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Calendar key / legend */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] text-muted-foreground/70">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-destructive/15 border border-destructive/30" />
          <span>Hunt window</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-warning/15 border border-warning/30" />
          <span>Deadline / Application</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary/10 border border-primary/30" />
          <span>Scout / Prep</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary/15 font-bold text-primary text-[6px] flex items-center justify-center">T</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
