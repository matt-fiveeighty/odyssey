"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, Compass, Calendar } from "lucide-react";
import { YearCalendar } from "@/components/planner/YearCalendar";
import type { PlanItem } from "@/components/planner/PlanItemCard";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SharedPlannerViewProps {
  items: PlanItem[];
  year: number;
  planName: string | null;
  expiresAt: string;
  token: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatExpirationDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SharedPlannerView({
  items,
  year,
  planName,
  expiresAt,
  token,
}: SharedPlannerViewProps) {
  // Group items by month — mirrors planner page logic
  const itemsByMonth = useMemo(() => {
    const grouped: Record<number, PlanItem[]> = {};
    for (let m = 1; m <= 12; m++) grouped[m] = [];

    for (const item of items) {
      if (grouped[item.month]) grouped[item.month].push(item);

      // Hunt windows that span into subsequent months
      if (item.endMonth && item.endMonth !== item.month) {
        for (let m = item.month + 1; m <= item.endMonth; m++) {
          if (grouped[m]) grouped[m].push(item);
        }
      }
    }
    return grouped;
  }, [items]);

  const totalPlannedCost = items.reduce((s, i) => s + (i.estimatedCost ?? 0), 0);
  const completedCount = items.filter((i) => i.completed).length;

  const calendarUrl = `/api/planner/cal/${token}`;

  // Read-only handlers — no-ops
  const noop = () => {};

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Expiration banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-secondary/50 border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            Shared Hunt Plan &mdash; expires {formatExpirationDate(expiresAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={calendarUrl} className="gap-1.5">
              <Calendar className="w-4 h-4" />
              Subscribe (.ics)
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/plan-builder" className="gap-1.5">
              Create your own plan <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" />
          {planName ?? `Shared Hunt Plan`} &mdash; {year}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Read-only view of a shared hunt planner calendar
        </p>
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
              ${Math.round(totalPlannedCost).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Est. Cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Grid — read-only (no edit callbacks) */}
      <YearCalendar
        itemsByMonth={itemsByMonth}
        selectedYear={year}
        onToggleComplete={noop}
        onRemove={noop}
      />

      {/* Bottom CTA */}
      <div className="text-center py-10 border-t border-border">
        <h3 className="text-lg font-semibold mb-2">
          Ready to build your own hunt calendar?
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Get a personalized hunting strategy and annual planner in minutes.
        </p>
        <Button asChild size="lg">
          <Link href="/plan-builder">Start Your Plan</Link>
        </Button>
      </div>
    </div>
  );
}
