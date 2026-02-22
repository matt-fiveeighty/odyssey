// ============================================================================
// Calendar Grid Data Model
// ============================================================================
// Pure function that reshapes StrategicAssessment into a state-by-month grid
// optimized for swimlane calendar rendering (Phase 3 — Season Calendar).
//
// Data flow:
//   StrategicAssessment.roadmap + .milestones
//     → buildCalendarGrid(assessment, year)
//       → CalendarGrid { rows, monthlyCosts, totalCost, availableYears }
//
// No React imports. No side effects. Pure data transformation.
// ============================================================================

import type {
  StrategicAssessment,
  RoadmapAction,
  Milestone,
  State,
} from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { getUrgencyLevel } from "./urgency";
import type { UrgencyLevel } from "./urgency";

// ── Exported Types ──────────────────────────────────────────────────────────

export interface CalendarSlotData {
  id: string;
  itemType:
    | "application"
    | "point_purchase"
    | "hunt"
    | "scout"
    | "deadline"
    | "prep";
  title: string; // Truncated description (max 50 chars)
  description: string; // Full description
  stateId: string;
  speciesId: string;
  month: number; // 1-12
  day?: number; // Specific day if known from dueDate
  endMonth?: number; // For multi-month spans (hunts)
  endDay?: number;
  estimatedCost: number;
  tagType: "draw" | "otc" | "leftover" | "points_only" | "n/a";
  urgency: UrgencyLevel;
  dueDate?: string; // ISO date for deadline proximity display
}

export interface CalendarRow {
  stateId: string;
  stateName: string;
  stateAbbr: string;
  color: string; // From State.color
  months: Map<number, CalendarSlotData[]>; // Keys 1-12
}

export interface CalendarGrid {
  year: number;
  rows: CalendarRow[];
  monthlyCosts: number[]; // 12 elements, index 0 = Jan ... index 11 = Dec
  totalCost: number;
  availableYears: number[]; // All years in the roadmap (for year selector)
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

/**
 * Map RoadmapAction.type to CalendarSlotData.itemType.
 */
function mapActionTypeToItemType(
  actionType: RoadmapAction["type"],
): CalendarSlotData["itemType"] {
  switch (actionType) {
    case "apply":
      return "application";
    case "buy_points":
      return "point_purchase";
    case "hunt":
      return "hunt";
    case "scout":
      return "scout";
  }
}

/**
 * Derive tag type from action type and state point system.
 * OTC/leftover detection is deferred to Phase 7 scraper integration.
 */
function deriveTagType(
  action: RoadmapAction,
  _state: State,
): CalendarSlotData["tagType"] {
  if (action.type === "buy_points") return "points_only";
  if (action.type === "scout") return "n/a";
  // TODO: Phase 7 — derive OTC/leftover from scraper data (SCRP-09)
  return "draw";
}

/**
 * When a RoadmapAction has no dueDate, derive a reasonable month
 * from the action type and state deadline data.
 */
function deriveMonthFromActionType(action: RoadmapAction): number {
  const state = STATES_MAP[action.stateId] as State | undefined;

  if (action.type === "apply" || action.type === "buy_points") {
    // Try to use the application deadline close date
    if (state?.applicationDeadlines) {
      const deadline = state.applicationDeadlines[action.speciesId];
      if (deadline?.close) {
        const parsed = new Date(deadline.close);
        if (!isNaN(parsed.getTime())) {
          return parsed.getMonth() + 1;
        }
      }
    }
    // Fallback: March (most western states have spring deadlines)
    return 3;
  }

  if (action.type === "hunt") {
    // Default: October (most western big game seasons)
    return 10;
  }

  if (action.type === "scout") {
    // Default: July (pre-season scouting)
    return 7;
  }

  return 1; // Unreachable safety fallback
}

/**
 * Build a deduplication key for matching roadmap actions against milestones.
 */
function dedupeKey(
  stateId: string,
  speciesId: string,
  type: string,
  month: number,
): string {
  return `${stateId}:${speciesId}:${type}:${month}`;
}

/**
 * Map Milestone.type to CalendarSlotData.itemType.
 */
function mapMilestoneTypeToItemType(
  milestoneType: Milestone["type"],
): CalendarSlotData["itemType"] {
  switch (milestoneType) {
    case "apply":
      return "application";
    case "buy_points":
      return "point_purchase";
    case "hunt":
      return "hunt";
    case "scout":
      return "scout";
    case "deadline":
      return "deadline";
  }
}

/**
 * Map Milestone.type to tag type.
 */
function milestoneDeriveTagType(
  milestone: Milestone,
): CalendarSlotData["tagType"] {
  if (milestone.type === "buy_points") return "points_only";
  if (milestone.type === "scout") return "n/a";
  if (milestone.type === "deadline") return "n/a";
  // TODO: Phase 7 — derive OTC/leftover from scraper data
  return "draw";
}

// ── Empty Grid Factory ──────────────────────────────────────────────────────

function emptyGrid(year: number, availableYears: number[]): CalendarGrid {
  return {
    year,
    rows: [],
    monthlyCosts: Array.from({ length: 12 }, () => 0),
    totalCost: 0,
    availableYears,
  };
}

// ── Main Function ───────────────────────────────────────────────────────────

/**
 * Reshapes a StrategicAssessment into a CalendarGrid for a specific year.
 *
 * Data sources:
 *   1. assessment.roadmap[year].actions → primary calendar items
 *   2. assessment.milestones (filtered by year) → additional deadline-level items
 *
 * Milestone deduplication: If a milestone matches an existing roadmap action
 * (same stateId + speciesId + type + month), it is skipped to avoid duplicates.
 */
export function buildCalendarGrid(
  assessment: StrategicAssessment,
  year: number,
): CalendarGrid {
  const availableYears = assessment.roadmap.map((ry) => ry.year).sort();

  const roadmapYear = assessment.roadmap.find((ry) => ry.year === year);
  if (!roadmapYear) return emptyGrid(year, availableYears);

  const rowMap = new Map<string, CalendarRow>();
  const seenKeys = new Set<string>();

  // ── 1. Process roadmap actions ──────────────────────────────────────────

  for (const action of roadmapYear.actions) {
    const state = STATES_MAP[action.stateId] as State | undefined;
    if (!state) continue;

    // Get or create row for this state
    if (!rowMap.has(action.stateId)) {
      rowMap.set(action.stateId, {
        stateId: action.stateId,
        stateName: state.name,
        stateAbbr: state.abbreviation,
        color: state.color,
        months: new Map(),
      });
    }
    const row = rowMap.get(action.stateId)!;

    // Determine month from dueDate or action type
    const month = action.dueDate
      ? new Date(action.dueDate).getMonth() + 1
      : deriveMonthFromActionType(action);

    // Extract day from dueDate if present
    const day = action.dueDate
      ? new Date(action.dueDate).getDate()
      : undefined;

    // Build slot
    const slot: CalendarSlotData = {
      id: `${action.stateId}-${action.speciesId}-${action.type}-${month}`,
      itemType: mapActionTypeToItemType(action.type),
      title: truncate(action.description, 50),
      description: action.description,
      stateId: action.stateId,
      speciesId: action.speciesId,
      month,
      day,
      estimatedCost: action.cost,
      tagType: deriveTagType(action, state),
      urgency: getUrgencyLevel(action.dueDate),
      dueDate: action.dueDate,
    };

    const monthSlots = row.months.get(month) ?? [];
    monthSlots.push(slot);
    row.months.set(month, monthSlots);

    // Track for milestone deduplication
    seenKeys.add(dedupeKey(action.stateId, action.speciesId, action.type, month));
  }

  // ── 2. Process milestones (avoid duplicates) ────────────────────────────

  const yearMilestones = (assessment.milestones ?? []).filter(
    (m) => m.year === year,
  );

  for (const milestone of yearMilestones) {
    const state = STATES_MAP[milestone.stateId] as State | undefined;
    if (!state) continue;

    // Determine month
    const month = milestone.dueDate
      ? new Date(milestone.dueDate).getMonth() + 1
      : 1;

    // Skip if already covered by a roadmap action
    const key = dedupeKey(
      milestone.stateId,
      milestone.speciesId,
      milestone.type,
      month,
    );
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    // Get or create row
    if (!rowMap.has(milestone.stateId)) {
      rowMap.set(milestone.stateId, {
        stateId: milestone.stateId,
        stateName: state.name,
        stateAbbr: state.abbreviation,
        color: state.color,
        months: new Map(),
      });
    }
    const row = rowMap.get(milestone.stateId)!;

    const day = milestone.dueDate
      ? new Date(milestone.dueDate).getDate()
      : undefined;

    const slot: CalendarSlotData = {
      id: `ms-${milestone.stateId}-${milestone.speciesId}-${milestone.type}-${month}`,
      itemType: mapMilestoneTypeToItemType(milestone.type),
      title: truncate(milestone.title, 50),
      description: milestone.description,
      stateId: milestone.stateId,
      speciesId: milestone.speciesId,
      month,
      day,
      estimatedCost: milestone.totalCost,
      tagType: milestoneDeriveTagType(milestone),
      urgency: getUrgencyLevel(milestone.dueDate),
      dueDate: milestone.dueDate,
    };

    const monthSlots = row.months.get(month) ?? [];
    monthSlots.push(slot);
    row.months.set(month, monthSlots);
  }

  // ── 3. Calculate monthly costs ──────────────────────────────────────────

  const monthlyCosts = Array.from({ length: 12 }, (_, i) => {
    let total = 0;
    for (const row of rowMap.values()) {
      for (const slot of row.months.get(i + 1) ?? []) {
        total += slot.estimatedCost;
      }
    }
    return total;
  });

  // ── 4. Sort rows alphabetically by state name ──────────────────────────

  const rows = Array.from(rowMap.values()).sort((a, b) =>
    a.stateName.localeCompare(b.stateName),
  );

  return {
    year,
    rows,
    monthlyCosts,
    totalCost: monthlyCosts.reduce((sum, cost) => sum + cost, 0),
    availableYears,
  };
}
