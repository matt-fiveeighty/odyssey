// ============================================================================
// Calendar Advisor Note Generator
// ============================================================================
// Pure function that enriches CalendarSlotData with plain-text advisor notes.
// Each slot gets a portfolio-specific interpretation: what it means, what to
// do, and why it matters for the user's draw timeline.
//
// Notes are plain text (no HTML, no markdown) for ICS DESCRIPTION compat.
// Max ~200 chars per note for tooltip readability.
//
// Data flow:
//   CalendarSlotData[] + StrategicAssessment + UserPoints[]
//     -> generateCalendarAdvisorNotes()
//       -> CalendarSlotData[] (with advisorNote populated)
//
// No React imports. No side effects. Pure data transformation.
// ============================================================================

import type { CalendarSlotData } from "./calendar-grid";
import type { StrategicAssessment, UserPoints } from "@/lib/types";
import { daysUntilDate } from "./urgency";
import { STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName } from "@/lib/utils";
import type { State } from "@/lib/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Get display name for a state, falling back to the raw ID. */
function stateName(stateId: string): string {
  const state = STATES_MAP[stateId] as State | undefined;
  return state?.abbreviation ?? stateId;
}

/** Find user's current points for a given state + species combo. */
function findPoints(
  userPoints: UserPoints[],
  stateId: string,
  speciesId: string,
): number {
  const entry = userPoints.find(
    (p) => p.stateId === stateId && p.speciesId === speciesId,
  );
  return entry?.points ?? 0;
}

/** Truncate a note to the max length, preserving whole words. */
function truncateNote(text: string, max: number): string {
  if (text.length <= max) return text;
  const trimmed = text.slice(0, max - 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  return (lastSpace > max * 0.5 ? trimmed.slice(0, lastSpace) : trimmed) + "…";
}

const MAX_NOTE_LENGTH = 200;

// ── Note Generators by Item Type ────────────────────────────────────────────

function applicationNote(
  slot: CalendarSlotData,
  pts: number,
  stAbbr: string,
  species: string,
): string {
  if (slot.dueDate) {
    const days = daysUntilDate(slot.dueDate);
    if (days <= 14) {
      return `PRIORITY: ${stAbbr} ${species} application closes in ${days} days. You have ${pts} points. Submit today -- missing this deadline costs you a year of building.`;
    }
    if (days <= 30) {
      return `${stAbbr} ${species} application deadline is ${days} days away. You have ${pts} points. Finalize your unit choices and budget.`;
    }
    return `${stAbbr} ${species} application opens in ~${days} days. You have ${pts} points. Good time to research units and confirm your strategy.`;
  }
  return `${stAbbr} ${species} application. You have ${pts} points. Check the state F&G website for current deadlines.`;
}

function pointPurchaseNote(
  slot: CalendarSlotData,
  stAbbr: string,
  species: string,
): string {
  return `Annual ${species} point purchase in ${stAbbr}. Cost: $${slot.estimatedCost}. This keeps your draw timeline on track.`;
}

function huntNote(
  slot: CalendarSlotData,
  assessment: StrategicAssessment,
  stAbbr: string,
  species: string,
): string {
  const stateRec = assessment.stateRecommendations.find(
    (r) => r.stateId === slot.stateId,
  );

  if (stateRec) {
    // Look for draw confidence from the best unit matching this species
    const unitWithConfidence = stateRec.bestUnits.find(
      (u) => u.drawConfidence,
    );
    if (unitWithConfidence?.drawConfidence) {
      const confidence = `${unitWithConfidence.drawConfidence.expected}%`;
      const unitInfo = slot.unitCode ? ` Target: ${slot.unitCode}.` : "";
      return `Your ${stAbbr} ${species} hunt! Draw confidence: ${confidence}.${unitInfo} Prepare your gear and logistics.`;
    }
  }

  return `Your ${stAbbr} ${species} hunt is scheduled. Start planning logistics.`;
}

function scoutNote(
  stAbbr: string,
  species: string,
): string {
  return `Scouting trip for ${stAbbr} ${species}. Use this to familiarize yourself with the terrain before your draw year.`;
}

function deadlineNote(
  slot: CalendarSlotData,
  pts: number,
  stAbbr: string,
  species: string,
): string {
  if (slot.dueDate) {
    const days = daysUntilDate(slot.dueDate);
    if (days <= 14) {
      return `PRIORITY: Key deadline for ${stAbbr} ${species} in ${days} days. You have ${pts} points. Act now to stay on track.`;
    }
    if (days <= 30) {
      return `Key deadline for ${stAbbr} ${species} is ${days} days away. You have ${pts} points. Start preparing your submission.`;
    }
    return `Key deadline for ${stAbbr} ${species} in ~${days} days. You have ${pts} points. Mark your calendar and plan ahead.`;
  }
  return `Key deadline for ${stAbbr} ${species}. You have ${pts} points. Check the state F&G website for exact dates.`;
}

function prepNote(
  stAbbr: string,
  species: string,
): string {
  return `Preparation for ${stAbbr} ${species}. Review gear lists and travel arrangements.`;
}

// ── Main Function ───────────────────────────────────────────────────────────

/**
 * Enrich calendar slots with plain-text advisor notes.
 *
 * Returns a NEW array of CalendarSlotData with `advisorNote` populated.
 * Does NOT mutate the input array or its elements.
 *
 * @param slots - Calendar slots from a CalendarGrid's rows
 * @param assessment - The user's strategic assessment (for state recommendations)
 * @param userPoints - The user's current point balances
 * @returns New array of slots with advisorNote field populated
 */
export function generateCalendarAdvisorNotes(
  slots: CalendarSlotData[],
  assessment: StrategicAssessment,
  userPoints: UserPoints[],
): CalendarSlotData[] {
  return slots.map((slot) => {
    const stAbbr = stateName(slot.stateId);
    const species = formatSpeciesName(slot.speciesId);
    const pts = findPoints(userPoints, slot.stateId, slot.speciesId);

    let note: string;

    switch (slot.itemType) {
      case "application":
        note = applicationNote(slot, pts, stAbbr, species);
        break;
      case "point_purchase":
        note = pointPurchaseNote(slot, stAbbr, species);
        break;
      case "hunt":
        note = huntNote(slot, assessment, stAbbr, species);
        break;
      case "scout":
        note = scoutNote(stAbbr, species);
        break;
      case "deadline":
        note = deadlineNote(slot, pts, stAbbr, species);
        break;
      case "prep":
        note = prepNote(stAbbr, species);
        break;
    }

    return {
      ...slot,
      advisorNote: truncateNote(note, MAX_NOTE_LENGTH),
    };
  });
}
