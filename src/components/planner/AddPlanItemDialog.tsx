"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ITEM_TYPE_CONFIG } from "./PlanItemCard";
import type { ItemType, PlanItem } from "./PlanItemCard";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface AddPlanItemDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (item: PlanItem) => void;
  selectedYear: number;
}

export function AddPlanItemDialog({ open, onClose, onAdd, selectedYear }: AddPlanItemDialogProps) {
  const [newType, setNewType] = useState<ItemType>("hunt");
  const [newTitle, setNewTitle] = useState("");
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newDay, setNewDay] = useState<number | null>(null);
  const [newCost, setNewCost] = useState(0);

  // Build calendar grid for selected month
  const calendarData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, newMonth, 0).getDate();
    const firstDow = new Date(selectedYear, newMonth - 1, 1).getDay();
    return { daysInMonth, firstDow };
  }, [selectedYear, newMonth]);

  if (!open) return null;

  function handleAdd() {
    if (!newTitle.trim()) return;
    const newItem: PlanItem = {
      id: `${selectedYear}-${Date.now()}`,
      type: newType,
      title: newTitle.trim(),
      month: newMonth,
      day: newDay ?? undefined,
      estimatedCost: newCost > 0 ? newCost : undefined,
      completed: false,
    };
    onAdd(newItem);
    setNewTitle("");
    setNewCost(0);
    setNewDay(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />
      <Card className="relative z-10 w-full max-w-md bg-card border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Add Plan Item</CardTitle>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted-foreground hover:text-foreground"
          >
            &#x2715;
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

          {/* Month selector */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Month
            </label>
            <div className="grid grid-cols-6 gap-1">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => { setNewMonth(i + 1); setNewDay(null); }}
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

          {/* Day picker — mini calendar for selected month */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Day <span className="text-muted-foreground/50 font-normal">(optional)</span>
            </label>
            <div className="rounded-lg border border-border bg-secondary/30 p-2">
              {/* Day-of-week header */}
              <div className="grid grid-cols-7 gap-px text-center mb-1">
                {DAY_LABELS.map((d, i) => (
                  <span key={i} className="text-[9px] text-muted-foreground/50 font-medium">
                    {d}
                  </span>
                ))}
              </div>
              {/* Day grid */}
              <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: calendarData.firstDow }).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSelected = newDay === day;
                  return (
                    <button
                      key={day}
                      onClick={() => setNewDay(isSelected ? null : day)}
                      className={`aspect-square flex items-center justify-center rounded-sm text-[10px] font-mono transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
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

          <Button onClick={handleAdd} className="w-full" disabled={!newTitle.trim()}>
            Add to Plan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
