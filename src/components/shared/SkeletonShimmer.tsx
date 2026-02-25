"use client";

import { cn } from "@/lib/utils";

// ============================================================================
// Skeleton Shimmer — Premium loading placeholders
//
// Metallic shimmer sweep that tells the user:
// "We are crunching massive amounts of F&G data for you."
//
// Variants match the shape of real content they replace.
// ============================================================================

interface SkeletonShimmerProps {
  variant?: "text" | "card" | "kpi-tile" | "bar" | "circle" | "map";
  className?: string;
  /** Width override (default: full width) */
  width?: string;
  /** Height override */
  height?: string;
  /** Use metallic (green-tinted) shimmer instead of default */
  metallic?: boolean;
}

export function SkeletonShimmer({
  variant = "text",
  className,
  width,
  height,
  metallic = false,
}: SkeletonShimmerProps) {
  const baseClass = metallic
    ? "skeleton-shimmer skeleton-shimmer-metallic"
    : "skeleton-shimmer";

  const variantStyles: Record<string, string> = {
    text: "h-4 w-full rounded-md",
    card: "h-24 w-full rounded-xl",
    "kpi-tile": "h-[100px] w-full rounded-xl",
    bar: "h-2 w-full rounded-full",
    circle: "h-10 w-10 rounded-full",
    map: "h-full w-full rounded-xl",
  };

  return (
    <div
      className={cn(baseClass, variantStyles[variant], className)}
      style={{
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      }}
      role="status"
      aria-label="Loading"
    />
  );
}

// ============================================================================
// KPI Grid Skeleton — 8-bucket placeholder matching DashboardCard layout
// ============================================================================

export function KPIGridSkeleton({ columns = 8 }: { columns?: number }) {
  const colClass =
    columns === 8
      ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8"
      : columns === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-2";

  return (
    <div className={cn("grid gap-3", colClass)} role="status" aria-label="Loading metrics">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="skeleton-shimmer skeleton-shimmer-metallic rounded-xl border border-border/30 p-3"
          style={{ animationDelay: `${i * 0.08}s`, minHeight: "100px" }}
        >
          {/* Icon + label placeholder */}
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-6 h-6 rounded-md bg-secondary/40" />
            <div className="h-2 w-14 rounded bg-secondary/40" />
          </div>
          {/* Value placeholder */}
          <div className="h-6 w-16 rounded bg-secondary/30 mb-2" />
          {/* Sub-label placeholder */}
          <div className="h-2 w-20 rounded bg-secondary/20" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Map Skeleton — Placeholder for the interactive map
// ============================================================================

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "skeleton-shimmer skeleton-shimmer-metallic rounded-xl border border-border/30 flex items-center justify-center",
        className,
      )}
      role="status"
      aria-label="Loading map"
    >
      <div className="text-muted-foreground/20 text-xs uppercase tracking-wider">
        Loading Map
      </div>
    </div>
  );
}
