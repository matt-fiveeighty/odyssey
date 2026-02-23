"use client";

import type { DiffItem } from "@/lib/types";
import { GitCompareArrows } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DiffItemCard } from "@/components/diff/DiffItemCard";

// --- Component ---

export function DiffView({
  items,
  onDismissAll,
}: {
  items: DiffItem[];
  onDismissAll: () => void;
}) {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-chart-4 via-amber-500 to-destructive" />
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="w-4 h-4 text-chart-4" />
            <p className="text-sm font-semibold">What Changed</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismissAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Mark all as seen
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <DiffItemCard key={item.id} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
