/**
 * Auto-Fill Engine
 *
 * Reads user points, goals, assessment roadmap, and application deadlines
 * to generate optimal plan items for a given year.
 */

import type { RoadmapYear, UserGoal, UserPoints } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";

// ============================================================================
// Types
// ============================================================================

export interface AutoFillInput {
  year: number;
  roadmap: RoadmapYear[];
  goals: UserGoal[];
  userPoints: UserPoints[];
  existingItems: { stateId: string; speciesId: string; month: number }[];
}

export interface AutoFillItem {
  itemType: "application" | "point_purchase" | "hunt" | "scout" | "deadline" | "prep";
  title: string;
  description: string;
  stateId: string;
  speciesId: string;
  month: number; // 1-12
  estimatedCost: number;
  priority: "high" | "medium" | "low";
  source: "roadmap" | "goal" | "opportunity";
}

// ============================================================================
// Priority Ordering
// ============================================================================

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

// ============================================================================
// Helpers
// ============================================================================

/** Check whether an existing item already covers this slot */
function alreadyExists(
  existing: AutoFillInput["existingItems"],
  stateId: string,
  speciesId: string,
  month: number
): boolean {
  return existing.some(
    (e) => e.stateId === stateId && e.speciesId === speciesId && e.month === month
  );
}

/** Extract month (1-12) from a date string like "2026-04-07" */
function monthFromDate(dateStr: string): number {
  const d = new Date(dateStr);
  return d.getMonth() + 1; // getMonth() is 0-indexed
}

/** Format species ID to human-readable: "mule_deer" -> "Mule Deer" */
function formatSpecies(speciesId: string): string {
  return speciesId
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ============================================================================
// Core Generator
// ============================================================================

export function generateAutoFillItems(input: AutoFillInput): AutoFillItem[] {
  const { year, roadmap, goals, existingItems } = input;
  const items: AutoFillItem[] = [];

  // 1. Find the matching roadmap year
  const roadmapYear = roadmap.find((ry) => ry.year === year);

  // 2. Convert roadmap actions to plan items with correct months based on state deadlines
  if (roadmapYear) {
    for (const action of roadmapYear.actions) {
      const state = STATES_MAP[action.stateId];
      if (!state) continue;

      const deadlineInfo = state.applicationDeadlines[action.speciesId] as
        | { open: string; close: string }
        | undefined;

      if (action.type === "apply" || action.type === "buy_points") {
        // Add deadline item (one month before close)
        if (deadlineInfo) {
          const closeMonth = monthFromDate(deadlineInfo.close);
          if (!alreadyExists(existingItems, action.stateId, action.speciesId, closeMonth)) {
            items.push({
              itemType: "deadline",
              title: `${state.abbreviation} ${formatSpecies(action.speciesId)} app deadline`,
              description: `Application closes ${deadlineInfo.close}`,
              stateId: action.stateId,
              speciesId: action.speciesId,
              month: closeMonth,
              estimatedCost: 0,
              priority: "high",
              source: "roadmap",
            });
          }

          // Add application item (in the month the window opens)
          const openMonth = monthFromDate(deadlineInfo.open);
          if (!alreadyExists(existingItems, action.stateId, action.speciesId, openMonth)) {
            items.push({
              itemType: action.type === "apply" ? "application" : "point_purchase",
              title:
                action.type === "apply"
                  ? `Apply: ${state.abbreviation} ${formatSpecies(action.speciesId)}`
                  : `Buy points: ${state.abbreviation} ${formatSpecies(action.speciesId)}`,
              description: action.description || `Submit ${action.type === "apply" ? "application" : "point purchase"} for ${state.name}`,
              stateId: action.stateId,
              speciesId: action.speciesId,
              month: openMonth,
              estimatedCost: action.cost,
              priority: action.type === "apply" ? "high" : "medium",
              source: "roadmap",
            });
          }
        } else {
          // No deadline info — place in January as a reminder
          if (!alreadyExists(existingItems, action.stateId, action.speciesId, 1)) {
            items.push({
              itemType: action.type === "apply" ? "application" : "point_purchase",
              title:
                action.type === "apply"
                  ? `Apply: ${state.abbreviation} ${formatSpecies(action.speciesId)}`
                  : `Buy points: ${state.abbreviation} ${formatSpecies(action.speciesId)}`,
              description: action.description || `Submit ${action.type === "apply" ? "application" : "point purchase"} for ${state.name}`,
              stateId: action.stateId,
              speciesId: action.speciesId,
              month: 1,
              estimatedCost: action.cost,
              priority: "medium",
              source: "roadmap",
            });
          }
        }
      }

      if (action.type === "hunt") {
        // Schedule hunt for typical season (Sept-Nov). Default to October.
        const huntMonth = 10;
        if (!alreadyExists(existingItems, action.stateId, action.speciesId, huntMonth)) {
          items.push({
            itemType: "hunt",
            title: `Hunt: ${state.abbreviation} ${formatSpecies(action.speciesId)}`,
            description: action.description || `${state.name} ${formatSpecies(action.speciesId)} hunt`,
            stateId: action.stateId,
            speciesId: action.speciesId,
            month: huntMonth,
            estimatedCost: action.cost,
            priority: "high",
            source: "roadmap",
          });
        }

        // Add scouting trip 2-3 months before hunt ("spring scout for fall hunt")
        const scoutMonth = Math.max(1, huntMonth - 3); // July
        if (!alreadyExists(existingItems, action.stateId, action.speciesId, scoutMonth)) {
          items.push({
            itemType: "scout",
            title: `Scout: ${state.abbreviation} ${formatSpecies(action.speciesId)}`,
            description: `Pre-season scouting trip for your ${state.name} hunt`,
            stateId: action.stateId,
            speciesId: action.speciesId,
            month: scoutMonth,
            estimatedCost: 200, // Rough scouting trip cost
            priority: "medium",
            source: "roadmap",
          });
        }

        // Add prep item 1 month before hunt
        const prepMonth = Math.max(1, huntMonth - 1);
        if (!alreadyExists(existingItems, action.stateId, action.speciesId, prepMonth)) {
          items.push({
            itemType: "prep",
            title: `Prep: ${state.abbreviation} ${formatSpecies(action.speciesId)} gear & logistics`,
            description: `Finalize gear, lodging, travel, and meat processing arrangements`,
            stateId: action.stateId,
            speciesId: action.speciesId,
            month: prepMonth,
            estimatedCost: 0,
            priority: "medium",
            source: "roadmap",
          });
        }
      }

      if (action.type === "scout") {
        const scoutMonth = 7; // Default to July for scouting
        if (!alreadyExists(existingItems, action.stateId, action.speciesId, scoutMonth)) {
          items.push({
            itemType: "scout",
            title: `Scout: ${state.abbreviation} ${formatSpecies(action.speciesId)}`,
            description: action.description || `Scouting trip to ${state.name}`,
            stateId: action.stateId,
            speciesId: action.speciesId,
            month: scoutMonth,
            estimatedCost: action.cost,
            priority: "medium",
            source: "roadmap",
          });
        }
      }
    }
  }

  // 3. Add goal milestones that fall in this year
  for (const goal of goals) {
    if (goal.status === "completed") continue;

    for (const milestone of goal.milestones) {
      if (milestone.completed) continue;
      if (milestone.year !== year) continue;

      const state = STATES_MAP[milestone.stateId];
      if (!state) continue;

      const milestoneMonth = milestone.dueDate ? monthFromDate(milestone.dueDate) : 1;

      // Map milestone type to item type
      const itemTypeMap: Record<string, AutoFillItem["itemType"]> = {
        buy_points: "point_purchase",
        apply: "application",
        hunt: "hunt",
        scout: "scout",
        deadline: "deadline",
      };

      const itemType = itemTypeMap[milestone.type] ?? "prep";

      if (!alreadyExists(existingItems, milestone.stateId, milestone.speciesId, milestoneMonth)) {
        items.push({
          itemType,
          title: milestone.title,
          description: milestone.description,
          stateId: milestone.stateId,
          speciesId: milestone.speciesId,
          month: milestoneMonth,
          estimatedCost: milestone.totalCost,
          priority: goal.status === "active" ? "high" : "low",
          source: "goal",
        });
      }
    }
  }

  // 4. Deduplicate: if both roadmap and goal produce the same stateId+speciesId+month+itemType, keep roadmap
  const seen = new Set<string>();
  const deduped: AutoFillItem[] = [];
  for (const item of items) {
    const key = `${item.stateId}-${item.speciesId}-${item.month}-${item.itemType}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  // 5. Sort by month, then priority
  deduped.sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
  });

  return deduped;
}
