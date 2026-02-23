/**
 * Centralized phase / year-type color system.
 *
 * Every component that shows phase badges, year pills, timeline dots,
 * or phase-colored backgrounds should import from HERE — not define
 * its own color map.
 *
 * Color semantics:
 *   Build       → info (blue)        — accumulating points, learning
 *   Positioning → chart-5 (teal)     — strategic pre-burn positioning
 *   Burn        → chart-2 (gold)     — deploying capital, hunting
 *   Recovery    → muted-foreground   — resting, gap year
 *   Youth       → warning (amber)    — time-sensitive youth window
 *   Trophy      → chart-4 (orange)   — high-value target, trophy hunt
 */

import type { YearType } from "@/lib/types";

// ── Year-type badge colors (border variant for badges / pills) ──────
export const YEAR_TYPE_COLORS: Record<YearType, string> = {
  build:        "bg-info/15 text-info border-info/30",
  positioning:  "bg-chart-5/15 text-chart-5 border-chart-5/30",
  burn:         "bg-chart-2/15 text-chart-2 border-chart-2/30",
  recovery:     "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  youth_window: "bg-warning/15 text-warning border-warning/30",
};

// ── Year-type cell backgrounds (subtle, for grids) ──────────────────
export const YEAR_TYPE_CELL_BG: Record<YearType, string> = {
  build:        "bg-info/8",
  positioning:  "bg-chart-5/8",
  burn:         "bg-chart-2/8",
  recovery:     "bg-muted-foreground/5",
  youth_window: "bg-warning/8",
};

// ── Legacy phase colors (from roadmap engine output) ────────────────
// The engine emits "building", "burn", "gap", "trophy" as phase strings.
// This map is used in results sections (TimelineRoadmap, SeasonCalendar).

export const LEGACY_PHASE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  building: { bg: "bg-info/10",               text: "text-info",               dot: "bg-info"               },
  build:    { bg: "bg-info/10",               text: "text-info",               dot: "bg-info"               },
  burn:     { bg: "bg-chart-2/10",            text: "text-chart-2",            dot: "bg-chart-2"            },
  gap:      { bg: "bg-muted-foreground/10",   text: "text-muted-foreground",   dot: "bg-muted-foreground"   },
  trophy:   { bg: "bg-chart-4/10",            text: "text-chart-4",            dot: "bg-chart-4"            },
  recovery: { bg: "bg-muted-foreground/10",   text: "text-muted-foreground",   dot: "bg-muted-foreground"   },
};

// ── Phase bar colors (for small progress bars / stacked bars) ───────
// Used in goals page, groups page timeline bars.
export const PHASE_BAR_COLORS: Record<string, string> = {
  building: "bg-info",
  build:    "bg-info",
  burn:     "bg-chart-2",
  gap:      "bg-muted-foreground",
  trophy:   "bg-chart-4",
  recovery: "bg-muted-foreground",
};

// ── Action type colors ──────────────────────────────────────────────
export const ACTION_TYPE_COLORS: Record<string, { label: string; color: string }> = {
  apply:      { label: "Apply",      color: "bg-info/15 text-info"       },
  buy_points: { label: "Buy Points", color: "bg-warning/15 text-warning" },
  hunt:       { label: "Hunt",       color: "bg-success/15 text-success" },
  scout:      { label: "Scout",      color: "bg-premium/15 text-premium" },
};

// ── Draw status colors (for application status boards) ──────────────
export const DRAW_STATUS_COLORS = {
  drew:         { text: "text-chart-2",            bg: "bg-chart-2/15"            },
  awaiting:     { text: "text-chart-4",            bg: "bg-chart-4/15"            },
  didntDraw:    { text: "text-destructive",        bg: "bg-destructive/15"        },
  applied:      { text: "text-info",               bg: "bg-info/15"              },
  notApplied:   { text: "text-muted-foreground",   bg: "bg-muted-foreground/10"   },
} as const;

// ── Goal priority colors ────────────────────────────────────────────
export const GOAL_PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  dream:       { bg: "bg-chart-4/15", text: "text-chart-4", label: "Dream" },
  trophy:      { bg: "bg-chart-4/15", text: "text-chart-4", label: "Trophy" },
  bucket_list: { bg: "bg-chart-2/15", text: "text-chart-2", label: "Bucket List" },
  attainable:  { bg: "bg-info/15",    text: "text-info",    label: "Attainable" },
  completed:   { bg: "bg-success/15", text: "text-success", label: "Completed" },
};

// ── State role colors (portfolio) ───────────────────────────────────
export const STATE_ROLE_COLORS: Record<string, string> = {
  primary:   "bg-primary/15 text-primary",
  secondary: "bg-chart-2/15 text-chart-2",
  wildcard:  "bg-chart-3/15 text-chart-3",
  long_term: "bg-chart-4/15 text-chart-4",
};
