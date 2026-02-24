"use client";

/**
 * CompareView — Side-by-side dual-pane calendar for comparing two plans,
 * inspired by Google Calendar's multi-person view.
 *
 * Each pane renders a YearCalendar for its assigned plan's items.
 * The pane headers show plan name + color dot.
 */

import { useMemo } from "react";
import { YearCalendar } from "./YearCalendar";
import type { PlanItem } from "./PlanItemCard";
import { useAppStore, PLAN_PALETTE } from "@/lib/store";
import { generatePlanDefaultItems } from "@/lib/engine/auto-fill";
import type { RoadmapYear } from "@/lib/types";
import { Users } from "lucide-react";

// ── Props ────────────────────────────────────────────────────────────────────

interface CompareViewProps {
  comparePlanIds: [string | null, string | null];
  selectedYear: number;
  onToggleComplete: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateItem?: (id: string, updates: Partial<Pick<PlanItem, "month" | "day" | "endMonth" | "endDay">>) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildItemsFromAssessment(
  year: number,
  roadmap: RoadmapYear[],
  planColor: string,
  planName: string,
  planId: string,
): PlanItem[] {
  const autoItems = generatePlanDefaultItems(year, roadmap);
  return autoItems.map((item, idx) => ({
    id: `${planId}-${year}-${item.stateId}-${item.speciesId}-${item.itemType}-${idx}`,
    type: item.itemType,
    title: item.title,
    description: item.description,
    stateId: item.stateId,
    speciesId: item.speciesId,
    month: item.month,
    day: item.day,
    endDay: item.endDay,
    endMonth: item.endMonth,
    estimatedCost: item.estimatedCost > 0 ? item.estimatedCost : undefined,
    completed: false,
    planColor,
    planName,
    planId,
  }));
}

function groupByMonth(items: PlanItem[]): Record<number, PlanItem[]> {
  const grouped: Record<number, PlanItem[]> = {};
  for (let m = 1; m <= 12; m++) grouped[m] = [];

  for (const item of items) {
    if (grouped[item.month]) grouped[item.month].push(item);
    if (item.endMonth && item.endMonth !== item.month) {
      for (let m = item.month + 1; m <= item.endMonth; m++) {
        if (grouped[m]) grouped[m].push(item);
      }
    }
  }
  return grouped;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CompareView({
  comparePlanIds,
  selectedYear,
  onToggleComplete,
  onRemove,
  onUpdateItem,
}: CompareViewProps) {
  const savedPlans = useAppStore((s) => s.savedPlans);
  const friendPlans = useAppStore((s) => s.friendPlans);

  // Resolve each pane's data
  const panes = comparePlanIds.map((planId, slot) => {
    if (!planId) return null;

    // Check saved plans first
    const savedIdx = savedPlans.findIndex((p) => p.id === planId);
    if (savedIdx >= 0) {
      const plan = savedPlans[savedIdx];
      const color = PLAN_PALETTE[savedIdx % PLAN_PALETTE.length];
      return {
        name: plan.name,
        color: color.dot,
        items: buildItemsFromAssessment(selectedYear, plan.assessment.roadmap, color.dot, plan.name, plan.id),
      };
    }

    // Check friend plans
    const friend = friendPlans.find((p) => p.id === planId);
    if (friend) {
      const items: PlanItem[] = friend.items
        .filter((item) => {
          // Show items for the selected year (friend items don't have year, show all)
          return true;
        })
        .map((item, idx) => ({
          id: `friend-${friend.id}-${idx}`,
          type: item.type as PlanItem["type"],
          title: item.title,
          description: item.description,
          stateId: item.stateId,
          speciesId: item.speciesId,
          month: item.month,
          day: item.day,
          endDay: item.endDay,
          endMonth: item.endMonth,
          estimatedCost: item.estimatedCost,
          completed: false,
          planColor: friend.color,
          planName: friend.name,
          planId: friend.id,
        }));
      return { name: friend.name, color: friend.color, items };
    }

    return null;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {panes.map((pane, slot) => {
        if (!pane) {
          return (
            <div key={slot} className="rounded-xl border border-dashed border-border/50 flex items-center justify-center min-h-[400px]">
              <div className="text-center text-muted-foreground/40">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs">Select a plan in the sidebar</p>
                <p className="text-[10px] mt-0.5">to compare side by side</p>
              </div>
            </div>
          );
        }

        const itemsByMonth = groupByMonth(pane.items);

        return (
          <div key={slot} className="space-y-2">
            {/* Pane header */}
            <div className="flex items-center gap-2 px-1">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: pane.color }}
              />
              <span className="text-sm font-bold truncate">{pane.name}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {pane.items.length} items
              </span>
            </div>

            {/* Calendar */}
            <YearCalendar
              itemsByMonth={itemsByMonth}
              selectedYear={selectedYear}
              onToggleComplete={onToggleComplete}
              onRemove={onRemove}
              onUpdateItem={onUpdateItem}
            />
          </div>
        );
      })}
    </div>
  );
}
