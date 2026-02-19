"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Plus } from "lucide-react";
import { YearCalendar } from "@/components/planner/YearCalendar";
import { AddPlanItemDialog } from "@/components/planner/AddPlanItemDialog";
import { AutoFillButton } from "@/components/planner/AutoFillButton";
import { OpportunityCards } from "@/components/planner/OpportunityCards";
import type { PlanItem } from "@/components/planner/PlanItemCard";
import { generatePlanDefaultItems } from "@/lib/engine/auto-fill";
import type { RoadmapYear } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { NoPlanGate } from "@/components/shared/NoPlanGate";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildItemsFromPlan(year: number, roadmap: RoadmapYear[]): PlanItem[] {
  const autoItems = generatePlanDefaultItems(year, roadmap);
  return autoItems.map((item, idx) => ({
    id: `${year}-plan-${item.stateId}-${item.speciesId}-${item.itemType}-${idx}`,
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
  }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlannerPage() {
  const confirmedAssessment = useAppStore((s) => s.confirmedAssessment);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showAddModal, setShowAddModal] = useState(false);

  // Plan-scoped defaults: only deadlines + hunt windows for user's selected species
  const [items, setItems] = useState<PlanItem[]>(() => {
    const assessment = useAppStore.getState().confirmedAssessment;
    if (!assessment) return [];
    return buildItemsFromPlan(currentYear, assessment.roadmap);
  });

  // Recovery: if Zustand hydrates after mount and items are empty, rebuild.
  // Use a state flag (not ref) to avoid re-triggering after manual item removal.
  const [hasRecovered, setHasRecovered] = useState(false);
  if (confirmedAssessment && items.length === 0 && !hasRecovered) {
    setHasRecovered(true);
    setItems(buildItemsFromPlan(currentYear, confirmedAssessment.roadmap));
  }

  // Group items by month for the selected year — all hooks before early return
  const itemsByMonth = useMemo(() => {
    const grouped: Record<number, PlanItem[]> = {};
    for (let m = 1; m <= 12; m++) grouped[m] = [];

    for (const item of items) {
      const isCurrentYear = item.id.startsWith(`${selectedYear}`);
      const isGeneric = !item.id.match(/^\d{4}-/);
      if (isCurrentYear || isGeneric) {
        if (grouped[item.month]) grouped[item.month].push(item);
      }

      // Hunt windows that span into subsequent months
      if (item.endMonth && item.endMonth !== item.month && (isCurrentYear || isGeneric)) {
        for (let m = item.month + 1; m <= item.endMonth; m++) {
          if (grouped[m]) grouped[m].push(item);
        }
      }
    }
    return grouped;
  }, [items, selectedYear]);

  const totalPlannedCost = items.reduce((s, i) => s + (i.estimatedCost ?? 0), 0);
  const completedCount = items.filter((i) => i.completed).length;

  const existingStateIds = useMemo(() => {
    return [...new Set(items.map((i) => i.stateId).filter(Boolean))] as string[];
  }, [items]);

  // --- Early return: gate for no plan ---
  if (!confirmedAssessment) {
    return (
      <div className="p-6 space-y-6 fade-in-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary" />
            My Year
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your hunts, applications, scouting trips, and deadlines
          </p>
        </div>
        <NoPlanGate
          icon={Compass}
          title="No plan built yet"
          description="Complete a strategic assessment in the Plan Builder to populate your annual calendar with deadlines, applications, and hunt dates."
        />
      </div>
    );
  }

  function toggleComplete(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleAddItem(item: PlanItem) {
    setItems((prev) => [...prev, item]);
    setShowAddModal(false);
  }

  function handleAutoFill(newItems: PlanItem[]) {
    setItems((prev) => [...prev, ...newItems]);
  }

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary" />
            My Year — {selectedYear}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your hunts, applications, scouting trips, and deadlines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedYear((y) => y - 1)}
          >
            &larr;
          </Button>
          <span className="text-sm font-mono font-bold w-12 text-center">
            {selectedYear}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedYear((y) => y + 1)}
          >
            &rarr;
          </Button>
          <AutoFillButton
            selectedYear={selectedYear}
            existingItems={items}
            onAutoFill={handleAutoFill}
          />
          <Button size="sm" className="gap-2 ml-2" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{items.length}</p>
            <p className="text-xs text-muted-foreground">Planned Items</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-chart-2">
              ${totalPlannedCost.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Est. Cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Grid */}
      <YearCalendar
        itemsByMonth={itemsByMonth}
        selectedYear={selectedYear}
        onToggleComplete={toggleComplete}
        onRemove={removeItem}
      />

      {/* Opportunity Finder */}
      <OpportunityCards
        selectedYear={selectedYear}
        existingStateIds={existingStateIds}
      />

      {/* Add Item Modal */}
      <AddPlanItemDialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddItem}
        selectedYear={selectedYear}
      />
    </div>
  );
}
