"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Compass, Plus, PanelLeftClose, PanelLeft } from "lucide-react";
import { YearCalendar } from "@/components/planner/YearCalendar";
import { AddPlanItemDialog } from "@/components/planner/AddPlanItemDialog";
import { AutoFillButton } from "@/components/planner/AutoFillButton";
import { OpportunityCards } from "@/components/planner/OpportunityCards";
import { SharePlanDialog } from "@/components/planner/SharePlanDialog";
import { CalendarSidebar } from "@/components/planner/CalendarSidebar";
import { ImportPlanDialog } from "@/components/planner/ImportPlanDialog";
import { DateProposalModal } from "@/components/planner/DateProposalModal";
import { CompareView } from "@/components/planner/CompareView";
import type { PlanItem } from "@/components/planner/PlanItemCard";
import type { CalendarMode } from "@/components/planner/CalendarSidebar";
import { generatePlanDefaultItems } from "@/lib/engine/auto-fill";
import type { RoadmapYear } from "@/lib/types";
import { useAppStore, PLAN_PALETTE } from "@/lib/store";
import { NoPlanGate } from "@/components/shared/NoPlanGate";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildItemsFromPlan(
  year: number,
  roadmap: RoadmapYear[],
  planColor?: string,
  planName?: string,
  planId?: string,
): PlanItem[] {
  const autoItems = generatePlanDefaultItems(year, roadmap);
  return autoItems.map((item, idx) => ({
    id: `${planId ?? "active"}-${year}-${item.stateId}-${item.speciesId}-${item.itemType}-${idx}`,
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

function getPlanColor(index: number) {
  return PLAN_PALETTE[index % PLAN_PALETTE.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlannerPage() {
  const confirmedAssessment = useAppStore((s) => s.confirmedAssessment);
  const savedPlans = useAppStore((s) => s.savedPlans);
  const activePlanId = useAppStore((s) => s.activePlanId);
  const friendPlans = useAppStore((s) => s.friendPlans);
  const planVisibility = useAppStore((s) => s.planVisibility);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("overlay");
  const [comparePlanIds, setComparePlanIds] = useState<[string | null, string | null]>([null, null]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Build items from active plan
  const [userItems, setUserItems] = useState<PlanItem[]>(() => {
    const assessment = useAppStore.getState().confirmedAssessment;
    if (!assessment) return [];
    return buildItemsFromPlan(currentYear, assessment.roadmap);
  });

  // Recovery: if Zustand hydrates after mount and items are empty, rebuild.
  const [hasRecovered, setHasRecovered] = useState(false);
  if (confirmedAssessment && userItems.length === 0 && !hasRecovered) {
    setHasRecovered(true);
    setUserItems(buildItemsFromPlan(currentYear, confirmedAssessment.roadmap));
  }

  // Build overlay items from ALL visible plans + friend plans
  const overlayItems = useMemo(() => {
    const allItems: PlanItem[] = [];

    // Active plan items (always base layer, shown as user's items)
    for (const item of userItems) {
      const isCurrentYear = item.id.includes(`-${selectedYear}-`) || item.id.startsWith(`${selectedYear}`);
      const isGeneric = !item.id.match(/^\d{4}-/) && !item.id.match(/^(plan|active|friend)-/);
      if (isCurrentYear || isGeneric) {
        allItems.push(item);
      }
    }

    // Other saved plans that are toggled visible
    for (let i = 0; i < savedPlans.length; i++) {
      const plan = savedPlans[i];
      if (plan.id === activePlanId) continue; // Active plan already included above
      if (!(planVisibility[plan.id] ?? true)) continue; // Hidden

      const color = getPlanColor(i);
      const planItems = buildItemsFromPlan(selectedYear, plan.assessment.roadmap, color.dot, plan.name, plan.id);
      allItems.push(...planItems);
    }

    // Friend plans that are visible
    for (const friend of friendPlans) {
      if (!(planVisibility[friend.id] ?? true)) continue;

      const items: PlanItem[] = friend.items.map((item, idx) => ({
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
      allItems.push(...items);
    }

    return allItems;
  }, [userItems, savedPlans, activePlanId, friendPlans, planVisibility, selectedYear]);

  // Group overlay items by month
  const itemsByMonth = useMemo(() => {
    const grouped: Record<number, PlanItem[]> = {};
    for (let m = 1; m <= 12; m++) grouped[m] = [];

    for (const item of overlayItems) {
      if (grouped[item.month]) grouped[item.month].push(item);

      // Hunt windows that span months
      if (item.endMonth && item.endMonth !== item.month) {
        for (let m = item.month + 1; m <= item.endMonth; m++) {
          if (grouped[m]) grouped[m].push(item);
        }
      }
    }
    return grouped;
  }, [overlayItems]);

  const totalPlannedCost = overlayItems.reduce((s, i) => s + (i.estimatedCost ?? 0), 0);
  const completedCount = overlayItems.filter((i) => i.completed).length;

  const existingStateIds = useMemo(() => {
    return [...new Set(userItems.map((i) => i.stateId).filter(Boolean))] as string[];
  }, [userItems]);

  // Count how many plan sources are visible
  const visiblePlanCount = useMemo(() => {
    let count = 1; // Active plan
    for (const plan of savedPlans) {
      if (plan.id !== activePlanId && (planVisibility[plan.id] ?? true)) count++;
    }
    for (const friend of friendPlans) {
      if (planVisibility[friend.id] ?? true) count++;
    }
    return count;
  }, [savedPlans, activePlanId, friendPlans, planVisibility]);

  // --- Early return: gate for no plan ---
  if (!confirmedAssessment) {
    return (
      <div className="p-4 md:p-6 space-y-3 fade-in-up">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Planner</h1>
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
    setUserItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }

  function removeItem(id: string) {
    setUserItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleAddItem(item: PlanItem) {
    setUserItems((prev) => [...prev, item]);
    setShowAddModal(false);
  }

  function handleUpdateItem(id: string, updates: Partial<Pick<PlanItem, "month" | "day" | "endMonth" | "endDay">>) {
    setUserItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }

  function handleAutoFill(newItems: PlanItem[]) {
    setUserItems((prev) => [...prev, ...newItems]);
  }

  function handleComparePlanSelect(slot: 0 | 1, planId: string) {
    setComparePlanIds((prev) => {
      const next = [...prev] as [string | null, string | null];
      next[slot] = planId || null;
      return next;
    });
  }

  return (
    <div className="flex h-full fade-in-up">
      {/* Calendar Sidebar — Google Calendar style */}
      {sidebarOpen && (
        <CalendarSidebar
          mode={calendarMode}
          onModeChange={setCalendarMode}
          onImportClick={() => setShowImport(true)}
          onProposalClick={() => setShowProposal(true)}
          comparePlanIds={comparePlanIds}
          onComparePlanSelect={handleComparePlanSelect}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 p-4 md:p-6 space-y-3 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </button>
            <Compass className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Planner</h1>
            <div className="flex items-center gap-1 ml-2">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedYear((y) => y - 1)}>&larr;</Button>
              <span className="text-xs font-mono font-bold w-10 text-center">{selectedYear}</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedYear((y) => y + 1)}>&rarr;</Button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <SharePlanDialog items={userItems} year={selectedYear} />
            <AutoFillButton
              selectedYear={selectedYear}
              existingItems={userItems}
              onAutoFill={handleAutoFill}
            />
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddModal(true)}>
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
        </div>

        {/* Inline summary stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span><span className="font-bold text-foreground text-sm">{overlayItems.length}</span> items</span>
          <span><span className="font-bold text-success text-sm">{completedCount}</span> done</span>
          <span><span className="font-bold text-chart-2 text-sm">${Math.round(totalPlannedCost).toLocaleString()}</span> est.</span>
          {visiblePlanCount > 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {visiblePlanCount} plans overlaid
            </span>
          )}
        </div>

        {/* Calendar View — Overlay or Compare */}
        {calendarMode === "overlay" ? (
          <YearCalendar
            itemsByMonth={itemsByMonth}
            selectedYear={selectedYear}
            onToggleComplete={toggleComplete}
            onRemove={removeItem}
            onUpdateItem={handleUpdateItem}
          />
        ) : (
          <CompareView
            comparePlanIds={comparePlanIds}
            selectedYear={selectedYear}
            onToggleComplete={toggleComplete}
            onRemove={removeItem}
            onUpdateItem={handleUpdateItem}
          />
        )}

        {/* Opportunity Finder (only in overlay mode) */}
        {calendarMode === "overlay" && (
          <OpportunityCards
            selectedYear={selectedYear}
            existingStateIds={existingStateIds}
          />
        )}

        {/* Add Item Modal */}
        <AddPlanItemDialog
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddItem}
          selectedYear={selectedYear}
        />

        {/* Import Friend Plan Dialog */}
        <ImportPlanDialog
          open={showImport}
          onClose={() => setShowImport(false)}
        />

        {/* Date Proposal Modal */}
        <DateProposalModal
          open={showProposal}
          onClose={() => setShowProposal(false)}
          defaultYear={selectedYear}
        />
      </div>
    </div>
  );
}
