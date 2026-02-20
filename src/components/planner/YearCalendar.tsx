"use client";

/**
 * YearCalendar — 12-month grid where each card is a real mini calendar
 * showing day numbers in a 7-column (S M T W T F S) grid. Days with
 * events are highlighted; clicking a day shows a floating popover with details.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Download, X } from "lucide-react";
import { PlanItemCard } from "./PlanItemCard";
import { exportPlanItem } from "@/lib/calendar-export";
import type { PlanItem } from "./PlanItemCard";

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface YearCalendarProps {
  itemsByMonth: Record<number, PlanItem[]>;
  selectedYear: number;
  onToggleComplete: (id: string) => void;
  onRemove: (id: string) => void;
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
    <div className="space-y-3">
      {/* 12-month grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {monthData.map(({ month, daysInMonth, firstDow, items, dayMap }) => {
          const isCurrentMonth =
            selectedYear === todayYear && month === todayMonth;
          const hasDeadline = items.some((i) => i.type === "deadline");
          const hasHunt = items.some((i) => i.type === "hunt");
          const isSelectedMonth = selectedCell?.month === month;

          return (
            <div key={month} className="relative">
              <Card
                className={`bg-card p-3 transition-all ${
                  isCurrentMonth
                    ? "border-primary/30"
                    : hasHunt
                    ? "border-l-2 border-l-destructive border-border"
                    : hasDeadline
                    ? "border-l-2 border-l-amber-400 border-border"
                    : "border-border"
                }`}
              >
                {/* Month name + item count */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{MONTH_ABBR[month - 1]}</span>
                  {items.length > 0 && (
                    <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">
                      {items.length}
                    </span>
                  )}
                </div>

                {/* Day-of-week header */}
                <div className="grid grid-cols-7 gap-px text-center mb-0.5">
                  {DAY_LABELS.map((d, i) => (
                    <span
                      key={i}
                      className="text-[9px] text-muted-foreground/50 font-medium leading-tight"
                    >
                      {d}
                    </span>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7 gap-px">
                  {Array.from({ length: firstDow }).map((_, i) => (
                    <div key={`pad-${i}`} className="aspect-square" />
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
                          aspect-square flex items-center justify-center rounded-sm text-[10px] font-mono transition-colors relative cursor-pointer
                          ${
                            isSelected
                              ? "bg-primary/25 text-primary font-bold ring-1 ring-primary/50"
                              : isToday
                              ? "bg-primary/15 text-primary font-bold"
                              : hasHuntDay
                              ? "bg-destructive/15 text-destructive/90 hover:bg-destructive/25"
                              : hasDeadlineDay
                              ? "bg-amber-400/15 text-amber-300 hover:bg-amber-400/25"
                              : hasOther
                              ? "bg-primary/8 text-foreground/80 hover:bg-primary/15"
                              : "text-muted-foreground/40 hover:bg-secondary/30 hover:text-muted-foreground/60"
                          }
                        `}
                      >
                        {day}
                        {dayItems.length > 1 && !isSelected && (
                          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current opacity-60" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Floating popover — appears over the month card when a day is selected */}
              {isSelectedMonth && selectedCell && (
                <div
                  ref={popoverRef}
                  className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl p-3 fade-in-up min-w-[280px]"
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
                          className="flex items-start gap-2 p-2 rounded-md bg-secondary/10 border border-border/50"
                        >
                          <div className="flex-1 min-w-0">
                            <PlanItemCard
                              item={item}
                              expanded={true}
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
          <span className="w-3 h-3 rounded-sm bg-amber-400/15 border border-amber-400/30" />
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
