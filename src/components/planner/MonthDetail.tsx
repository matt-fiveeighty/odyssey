"use client";

/**
 * MonthDetail — mini calendar grid with day-level detail.
 *
 * Shows a 7-column week grid (Sun–Sat) for the given month.
 * Hunt windows are highlighted as blocked ranges.
 * Clicking a day shows items due that day.
 */

import { useState, useMemo } from "react";
import type { PlanItem } from "./PlanItemCard";
import { PlanItemCard, ITEM_TYPE_CONFIG } from "./PlanItemCard";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface MonthDetailProps {
  year: number;
  month: number; // 1-12
  items: PlanItem[];
  onToggleComplete: (id: string) => void;
  onRemove: (id: string) => void;
}

export function MonthDetail({
  year,
  month,
  items,
  onToggleComplete,
  onRemove,
}: MonthDetailProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun

  // Group items by day
  const itemsByDay = useMemo(() => {
    const map: Record<number, PlanItem[]> = {};
    for (const item of items) {
      const day = item.day ?? 1;
      if (!map[day]) map[day] = [];
      // Avoid duplicate entries for hunt windows that span months
      if (!map[day].some((existing) => existing.id === item.id)) {
        map[day].push(item);
      }
    }
    return map;
  }, [items]);

  // Identify hunt window days for this month
  const huntWindowDays = useMemo(() => {
    const days = new Set<number>();
    for (const item of items) {
      if (item.type !== "hunt" || !item.day) continue;

      // If this month is the start month
      if (item.month === month) {
        const end =
          item.endMonth === month || !item.endMonth
            ? item.endDay ?? item.day
            : daysInMonth; // spans into next month — block rest of this month
        for (let d = item.day; d <= end; d++) days.add(d);
      }
      // If this month is the end month (and different from start)
      else if (item.endMonth === month && item.endDay) {
        for (let d = 1; d <= item.endDay; d++) days.add(d);
      }
    }
    return days;
  }, [items, month, daysInMonth]);

  // Items for the selected day
  const selectedDayItems = selectedDay ? (itemsByDay[selectedDay] ?? []) : [];

  return (
    <div className="p-4 border-t border-border bg-secondary/5 fade-in-up">
      {/* Week header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground/70 font-medium mb-1">
        {DAY_LABELS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[32px]" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayItems = itemsByDay[day] ?? [];
          const isHuntWindow = huntWindowDays.has(day);
          const isSelected = selectedDay === day;
          const isToday =
            year === new Date().getFullYear() &&
            month === new Date().getMonth() + 1 &&
            day === new Date().getDate();

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`p-1 rounded text-center text-[10px] min-h-[32px] transition-colors cursor-pointer ${
                isSelected
                  ? "bg-primary/20 border border-primary/40 ring-1 ring-primary/30"
                  : isHuntWindow
                  ? "bg-destructive/10 border border-destructive/20 hover:bg-destructive/15"
                  : dayItems.length > 0
                  ? "bg-primary/5 border border-primary/10 hover:bg-primary/10"
                  : "bg-secondary/20 hover:bg-secondary/30"
              } ${isToday ? "ring-1 ring-primary/50" : ""}`}
            >
              <span className={`font-mono ${isToday ? "font-bold text-primary" : ""}`}>
                {day}
              </span>
              {dayItems.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {dayItems.slice(0, 3).map((item, j) => {
                    const cfg = ITEM_TYPE_CONFIG[item.type];
                    return (
                      <span
                        key={j}
                        className={`w-1.5 h-1.5 rounded-full ${cfg.color.replace("text-", "bg-")}`}
                      />
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail panel */}
      {selectedDay !== null && (
        <div className="mt-3 p-3 rounded-lg bg-card border border-border fade-in-up">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold">
              {new Date(year, month - 1, selectedDay).toLocaleDateString(
                "en-US",
                { weekday: "long", month: "long", day: "numeric" }
              )}
            </p>
            {huntWindowDays.has(selectedDay) && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                Hunt Window
              </span>
            )}
          </div>
          {selectedDayItems.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/50">
              No items scheduled
            </p>
          ) : (
            <div className="space-y-1.5">
              {selectedDayItems.map((item) => (
                <PlanItemCard
                  key={item.id}
                  item={item}
                  expanded={true}
                  onToggleComplete={onToggleComplete}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
