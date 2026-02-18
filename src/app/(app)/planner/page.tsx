"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Plus } from "lucide-react";
import { STATES } from "@/lib/constants/states";
import { YearCalendar } from "@/components/planner/YearCalendar";
import { AddPlanItemDialog } from "@/components/planner/AddPlanItemDialog";
import { AutoFillButton } from "@/components/planner/AutoFillButton";
import { OpportunityCards } from "@/components/planner/OpportunityCards";
import type { PlanItem } from "@/components/planner/PlanItemCard";

export default function PlannerPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [items, setItems] = useState<PlanItem[]>(() => generateDefaultItems(currentYear));
  const [showAddModal, setShowAddModal] = useState(false);

  // Group items by month
  const itemsByMonth = useMemo(() => {
    const grouped: Record<number, PlanItem[]> = {};
    for (let m = 1; m <= 12; m++) grouped[m] = [];
    for (const item of items.filter((i) => i.id.startsWith(`${selectedYear}`))) {
      if (grouped[item.month]) grouped[item.month].push(item);
    }
    // Also include items without year prefix
    for (const item of items.filter((i) => !i.id.startsWith(`${selectedYear}`) && !i.id.startsWith(`${selectedYear - 1}`))) {
      if (grouped[item.month]) grouped[item.month].push(item);
    }
    return grouped;
  }, [items, selectedYear]);

  const totalPlannedCost = items.reduce((s, i) => s + (i.estimatedCost ?? 0), 0);
  const completedCount = items.filter((i) => i.completed).length;

  // Collect unique state IDs from existing items for opportunity finder
  const existingStateIds = useMemo(() => {
    return [...new Set(items.map((i) => i.stateId).filter(Boolean))] as string[];
  }, [items]);

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
          {items.length > 0 && (
            <AutoFillButton
              selectedYear={selectedYear}
              existingItems={items}
              onAutoFill={handleAutoFill}
            />
          )}
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
            <p className="text-2xl font-bold text-green-400">{completedCount}</p>
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
        onToggleComplete={toggleComplete}
        onRemove={removeItem}
      />

      {/* Auto-fill CTA (shown when no items) */}
      {items.length === 0 && (
        <AutoFillButton
          selectedYear={selectedYear}
          existingItems={items}
          onAutoFill={handleAutoFill}
        />
      )}

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

/**
 * Generate default plan items from assessment deadlines + common patterns.
 */
function generateDefaultItems(year: number): PlanItem[] {
  const items: PlanItem[] = [];

  for (const state of STATES) {
    for (const [speciesId, deadline] of Object.entries(
      state.applicationDeadlines as Record<string, { open: string; close: string }>
    )) {
      const closeDate = new Date(deadline.close);
      if (closeDate.getFullYear() === year) {
        items.push({
          id: `${year}-deadline-${state.id}-${speciesId}`,
          type: "deadline",
          title: `${state.abbreviation} ${speciesId.replace("_", " ")} app deadline`,
          stateId: state.id,
          speciesId,
          month: closeDate.getMonth() + 1,
          completed: false,
        });
      }
    }
  }

  return items;
}
