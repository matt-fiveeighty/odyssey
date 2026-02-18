"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PlanItemCard } from "./PlanItemCard";
import type { PlanItem } from "./PlanItemCard";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface YearCalendarProps {
  itemsByMonth: Record<number, PlanItem[]>;
  onToggleComplete: (id: string) => void;
  onRemove: (id: string) => void;
}

export function YearCalendar({ itemsByMonth, onToggleComplete, onRemove }: YearCalendarProps) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {MONTHS.map((monthName, idx) => {
        const month = idx + 1;
        const monthItems = itemsByMonth[month] ?? [];
        const isExpanded = expandedMonth === month;
        const hasDeadline = monthItems.some((i) => i.type === "deadline");
        const hasHunt = monthItems.some((i) => i.type === "hunt");

        return (
          <Card
            key={month}
            className={`bg-card border-border cursor-pointer transition-all hover:border-primary/30 ${
              hasDeadline ? "ring-1 ring-amber-400/30" : ""
            } ${hasHunt ? "ring-1 ring-red-400/30" : ""}`}
            onClick={() => setExpandedMonth(isExpanded ? null : month)}
          >
            <CardHeader className="p-3 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium">{monthName}</CardTitle>
                <div className="flex items-center gap-1">
                  {monthItems.length > 0 && (
                    <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                      {monthItems.length}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {monthItems.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/50 py-2">
                  No items
                </p>
              ) : (
                <div className="space-y-1">
                  {(isExpanded ? monthItems : monthItems.slice(0, 2)).map(
                    (item) => (
                      <PlanItemCard
                        key={item.id}
                        item={item}
                        expanded={isExpanded}
                        onToggleComplete={onToggleComplete}
                        onRemove={onRemove}
                      />
                    )
                  )}
                  {!isExpanded && monthItems.length > 2 && (
                    <p className="text-[10px] text-muted-foreground/60">
                      +{monthItems.length - 2} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
