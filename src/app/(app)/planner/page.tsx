"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Plus,
  Calendar,
  Target,
  Binoculars,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
  Trash2,
  Sparkles,
  MapPin,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { STATES } from "@/lib/constants/states";

type ItemType = "hunt" | "scout" | "deadline" | "prep" | "application" | "point_purchase";

interface PlanItem {
  id: string;
  type: ItemType;
  title: string;
  description?: string;
  stateId?: string;
  speciesId?: string;
  month: number; // 1-12
  estimatedCost?: number;
  completed: boolean;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const ITEM_TYPE_CONFIG: Record<ItemType, { label: string; icon: typeof Target; color: string }> = {
  hunt: { label: "Hunt", icon: Target, color: "text-red-400" },
  scout: { label: "Scout", icon: Binoculars, color: "text-blue-400" },
  deadline: { label: "Deadline", icon: AlertTriangle, color: "text-amber-400" },
  prep: { label: "Prep", icon: Clock, color: "text-green-400" },
  application: { label: "Application", icon: Calendar, color: "text-purple-400" },
  point_purchase: { label: "Buy Points", icon: MapPin, color: "text-teal-400" },
};

export default function PlannerPage() {
  const { confirmedAssessment } = useAppStore();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [items, setItems] = useState<PlanItem[]>(() => generateDefaultItems(currentYear));
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  // New item form state
  const [newType, setNewType] = useState<ItemType>("hunt");
  const [newTitle, setNewTitle] = useState("");
  const [newMonth, setNewMonth] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [newStateId, setNewStateId] = useState("");
  const [newCost, setNewCost] = useState(0);

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

  function addItem() {
    if (!newTitle.trim()) return;
    const newItem: PlanItem = {
      id: `${selectedYear}-${Date.now()}`,
      type: newType,
      title: newTitle.trim(),
      stateId: newStateId || undefined,
      month: newMonth,
      estimatedCost: newCost > 0 ? newCost : undefined,
      completed: false,
    };
    setItems((prev) => [...prev, newItem]);
    setShowAddModal(false);
    setNewTitle("");
    setNewCost(0);
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
            ←
          </Button>
          <span className="text-sm font-mono font-bold w-12 text-center">
            {selectedYear}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedYear((y) => y + 1)}
          >
            →
          </Button>
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
                      (item) => {
                        const cfg = ITEM_TYPE_CONFIG[item.type];
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-1.5 text-[10px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => toggleComplete(item.id)}
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                item.completed
                                  ? "bg-green-400/20 border-green-400/50"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              {item.completed && (
                                <Check className="w-2.5 h-2.5 text-green-400" />
                              )}
                            </button>
                            <cfg.icon className={`w-3 h-3 ${cfg.color} shrink-0`} />
                            <span
                              className={`truncate ${item.completed ? "line-through text-muted-foreground/50" : ""}`}
                            >
                              {item.title}
                            </span>
                            {isExpanded && (
                              <button
                                onClick={() => removeItem(item.id)}
                                className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      }
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

      {/* Auto-fill CTA */}
      {confirmedAssessment && items.length === 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Auto-fill your year</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Based on your strategic assessment, we can generate recommended
              hunts, application deadlines, and scouting trips.
            </p>
            <Button
              onClick={() =>
                setItems(generateDefaultItems(selectedYear))
              }
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
            role="presentation"
          />
          <Card className="relative z-10 w-full max-w-md bg-card border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Add Plan Item</CardTitle>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(ITEM_TYPE_CONFIG) as ItemType[]).map((type) => {
                    const cfg = ITEM_TYPE_CONFIG[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setNewType(type)}
                        className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                          newType === type
                            ? "border-primary bg-primary/10"
                            : "border-border bg-secondary/50 hover:border-primary/30"
                        }`}
                      >
                        <cfg.icon className={`w-4 h-4 ${cfg.color} mx-auto mb-1`} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., CO Elk Application"
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {/* Month */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Month
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {MONTHS.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => setNewMonth(i + 1)}
                      className={`p-1.5 rounded text-[10px] font-medium transition-all ${
                        newMonth === i + 1
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Estimated Cost ($)
                </label>
                <input
                  type="number"
                  value={newCost}
                  onChange={(e) => setNewCost(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <Button onClick={addItem} className="w-full" disabled={!newTitle.trim()}>
                Add to Plan
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Generate default plan items from assessment deadlines + common patterns.
 */
function generateDefaultItems(year: number): PlanItem[] {
  const items: PlanItem[] = [];

  // Generate deadline items from states that have application deadlines
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
