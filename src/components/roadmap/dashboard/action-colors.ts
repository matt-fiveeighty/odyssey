/**
 * Unified action type color system.
 * ONE source of truth — used by ActionList, ActionDetail, DashboardCard, MapOverlay.
 *
 * Color assignments (user-defined):
 *   hunt       → GREEN   (success)  — "Go! Execute your hunt."
 *   apply      → RED     (destructive) — "Cashing in points, trying to draw."
 *   buy_points → BLUE    (info) — "Building points for the future."
 *   scout      → YELLOW  (warning) — "Scouting / OTC same-season opportunity."
 */

export interface ActionTypeStyle {
  label: string;
  detailLabel: string;
  /** Tooltip explaining what this type means */
  tooltip: string;
  text: string;
  bg: string;
  border: string;
  tint: string;
  hoverTint: string;
  pill: string;
}

export const ACTION_TYPE_COLORS: Record<string, ActionTypeStyle> = {
  hunt: {
    label: "Hunt",
    detailLabel: "Hunt Year",
    tooltip: "Go time — execute your hunt",
    text: "text-success",
    bg: "bg-success",
    border: "border-success",
    tint: "bg-success/8",
    hoverTint: "hover:bg-success/5",
    pill: "bg-success/15 text-success border border-success/20",
  },
  apply: {
    label: "Apply",
    detailLabel: "Draw Year",
    tooltip: "Cashing in points, trying to draw",
    text: "text-destructive",
    bg: "bg-destructive",
    border: "border-destructive",
    tint: "bg-destructive/8",
    hoverTint: "hover:bg-destructive/5",
    pill: "bg-destructive/15 text-destructive border border-destructive/20",
  },
  buy_points: {
    label: "Points",
    detailLabel: "Point Year",
    tooltip: "Building points for future draws",
    text: "text-info",
    bg: "bg-info",
    border: "border-info",
    tint: "bg-info/8",
    hoverTint: "hover:bg-info/5",
    pill: "bg-info/15 text-info border border-info/20",
  },
  scout: {
    label: "Scout",
    detailLabel: "Scout",
    tooltip: "Scouting or OTC same-season tag opportunity",
    text: "text-warning",
    bg: "bg-warning",
    border: "border-warning",
    tint: "bg-warning/8",
    hoverTint: "hover:bg-warning/5",
    pill: "bg-warning/15 text-warning border border-warning/20",
  },
};

export const DEFAULT_ACTION_STYLE = ACTION_TYPE_COLORS.apply;

/**
 * Map legend items — consistent with action type colors.
 * Each has a tooltip for hover explanation.
 */
export const MAP_LEGEND = [
  { label: "Hunt",   bg: "bg-success",     tooltip: "Go time — execute your hunt" },
  { label: "Apply",  bg: "bg-destructive",  tooltip: "Cashing in points, trying to draw" },
  { label: "OTC",    bg: "bg-warning",      tooltip: "Try your luck on a same-season tag" },
  { label: "Points", bg: "bg-info",         tooltip: "Building points for future draws" },
] as const;

/**
 * Selected row classes for RoadmapActionList (full Tailwind strings).
 * Keyed by action type.
 */
export const SELECTED_CLASSES: Record<string, string> = {
  hunt:       "bg-success/8 border-l-success",
  apply:      "bg-destructive/8 border-l-destructive",
  buy_points: "bg-info/8 border-l-info",
  scout:      "bg-warning/8 border-l-warning",
};

export const HOVER_CLASSES: Record<string, string> = {
  hunt:       "hover:bg-success/5",
  apply:      "hover:bg-destructive/5",
  buy_points: "hover:bg-info/5",
  scout:      "hover:bg-warning/5",
};
