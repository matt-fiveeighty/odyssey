"use client";

/**
 * YearCalendar — 12-month grid with prominent month names, hunt window
 * indicators, and expandable MonthDetail with day-level drill-down.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Target, AlertTriangle } from "lucide-react";
import { PlanItemCard } from "./PlanItemCard";
import { MonthDetail } from "./MonthDetail";
import type { PlanItem } from "./PlanItemCard";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface YearCalendarProps {
  itemsByMonth: Record<number, PlanItem[]>;
  selectedYear: number;
  onToggleComplete: (id: string) => void;
  onRemove: (id: string) => void;
}

export function YearCalendar({
  itemsByMonth,
  selectedYear,
  onToggleComplete,
  onRemove,
}: YearCalendarProps) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {/* 12-month grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {MONTH_NAMES.map((monthName, idx) => {
          const month = idx + 1;
          const monthItems = itemsByMonth[month] ?? [];
          const isExpanded = expandedMonth === month;
          const hasDeadline = monthItems.some((i) => i.type === "deadline");
          const hasHunt = monthItems.some((i) => i.type === "hunt");
          const huntItems = monthItems.filter((i) => i.type === "hunt");

          // Current month highlight
          const isCurrentMonth =
            selectedYear === new Date().getFullYear() &&
            month === new Date().getMonth() + 1;

          return (
            <Card
              key={month}
              className={`bg-card cursor-pointer transition-all hover:border-primary/30 ${
                isExpanded ? "ring-1 ring-primary/40 border-primary/40" : "border-border"
              } ${isCurrentMonth ? "border-primary/30" : ""} ${
                hasHunt
                  ? "border-l-2 border-l-destructive"
                  : hasDeadline
                  ? "border-l-2 border-l-amber-400"
                  : ""
              }`}
              onClick={() =>
                setExpandedMonth(isExpanded ? null : month)
              }
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold">
                    {monthName}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {hasHunt && (
                      <Target className="w-3 h-3 text-destructive" />
                    )}
                    {hasDeadline && (
                      <AlertTriangle className="w-3 h-3 text-warning" />
                    )}
                    {monthItems.length > 0 && (
                      <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">
                        {monthItems.length}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {/* Hunt window bars */}
                {huntItems.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {huntItems.map((hw) => {
                      const daysInMonth = new Date(
                        selectedYear,
                        month,
                        0
                      ).getDate();
                      const startDay = hw.month === month ? (hw.day ?? 1) : 1;
                      const endDay =
                        hw.endMonth === month || (!hw.endMonth && hw.month === month)
                          ? (hw.endDay ?? daysInMonth)
                          : hw.endMonth && hw.endMonth > month
                          ? daysInMonth
                          : (hw.endDay ?? daysInMonth);

                      const leftPct = ((startDay - 1) / daysInMonth) * 100;
                      const widthPct =
                        ((endDay - startDay + 1) / daysInMonth) * 100;

                      return (
                        <div
                          key={hw.id}
                          className="flex items-center gap-2 text-[10px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="h-2.5 rounded-full bg-destructive/10 flex-1 relative overflow-hidden">
                            <div
                              className="absolute h-full rounded-full bg-destructive/30"
                              style={{
                                left: `${leftPct}%`,
                                width: `${Math.min(widthPct, 100 - leftPct)}%`,
                              }}
                            />
                          </div>
                          <span className="text-destructive shrink-0 truncate max-w-[80px]">
                            {hw.title.replace("Hunt: ", "")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Item list */}
                {monthItems.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/40 py-1">
                    No items
                  </p>
                ) : (
                  <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                    {(isExpanded
                      ? []
                      : monthItems.filter((i) => i.type !== "hunt").slice(0, 3)
                    ).map((item) => (
                      <PlanItemCard
                        key={item.id}
                        item={item}
                        expanded={false}
                        onToggleComplete={onToggleComplete}
                        onRemove={onRemove}
                      />
                    ))}
                    {!isExpanded &&
                      monthItems.filter((i) => i.type !== "hunt").length > 3 && (
                        <p className="text-[10px] text-muted-foreground/60">
                          +{monthItems.filter((i) => i.type !== "hunt").length - 3} more
                        </p>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Expanded month detail — full-width below grid */}
      {expandedMonth && (
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">
                {MONTH_NAMES[expandedMonth - 1]} {selectedYear}
              </CardTitle>
              <button
                onClick={() => setExpandedMonth(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </CardHeader>
          <MonthDetail
            year={selectedYear}
            month={expandedMonth}
            items={itemsByMonth[expandedMonth] ?? []}
            onToggleComplete={onToggleComplete}
            onRemove={onRemove}
          />
        </Card>
      )}
    </div>
  );
}
