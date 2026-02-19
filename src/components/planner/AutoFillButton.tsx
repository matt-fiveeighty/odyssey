"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { generateAutoFillItems } from "@/lib/engine/auto-fill";
import type { AutoFillItem } from "@/lib/engine/auto-fill";
import type { PlanItem } from "./PlanItemCard";

interface AutoFillButtonProps {
  selectedYear: number;
  existingItems: PlanItem[];
  onAutoFill: (items: PlanItem[]) => void;
}

export function AutoFillButton({ selectedYear, existingItems, onAutoFill }: AutoFillButtonProps) {
  const { confirmedAssessment, userGoals, userPoints } = useAppStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewItems, setPreviewItems] = useState<AutoFillItem[]>([]);

  if (!confirmedAssessment) return null;

  function handleGenerate() {
    const result = generateAutoFillItems({
      year: selectedYear,
      roadmap: confirmedAssessment!.roadmap,
      goals: userGoals,
      userPoints,
      existingItems: existingItems.map((i) => ({
        stateId: i.stateId ?? "",
        speciesId: i.speciesId ?? "",
        month: i.month,
      })),
    });

    if (result.length === 0) {
      // Nothing to generate — show the CTA but no confirm
      return;
    }

    setPreviewItems(result);
    setShowConfirm(true);
  }

  function handleConfirm() {
    const planItems: PlanItem[] = previewItems.map((item, idx) => ({
      id: `${selectedYear}-auto-${Date.now()}-${idx}`,
      type: item.itemType,
      title: item.title,
      description: item.description,
      stateId: item.stateId,
      speciesId: item.speciesId,
      month: item.month,
      estimatedCost: item.estimatedCost > 0 ? item.estimatedCost : undefined,
      completed: false,
    }));

    onAutoFill(planItems);
    setShowConfirm(false);
    setPreviewItems([]);
  }

  // Always show compact inline button (defaults auto-populate from plan)
  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={handleGenerate}>
        <Sparkles className="w-4 h-4" />
        Auto-fill
      </Button>

      {/* Confirmation overlay */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
            role="presentation"
          />
          <Card className="relative z-10 w-full max-w-md bg-card border-border shadow-2xl">
            <CardContent className="p-6">
              <Sparkles className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Add {previewItems.length} items?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generated from your roadmap and goals for {selectedYear}.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto mb-4">
                {previewItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      item.priority === "high" ? "bg-destructive/15 text-destructive" :
                      item.priority === "medium" ? "bg-warning/15 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {item.itemType}
                    </span>
                    {item.title}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleConfirm} className="flex-1">
                  Add All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
