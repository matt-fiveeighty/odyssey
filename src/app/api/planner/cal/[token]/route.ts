import { NextRequest, NextResponse } from "next/server";
import { cacheGet, isCacheAvailable } from "@/lib/redis";
import { buildICS } from "@/lib/calendar/ics-builder";
import type { ICSEventInput } from "@/lib/calendar/ics-builder";
import type { PlanItem } from "@/components/planner/PlanItemCard";
import { STATES_MAP } from "@/lib/constants/states";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlannerSharePayload {
  items: PlanItem[];
  year: number;
  planName: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers — convert PlanItem[] to ICS events
// ---------------------------------------------------------------------------

const ITEM_TYPE_LABELS: Record<string, string> = {
  hunt: "Hunt",
  scout: "Scout",
  deadline: "Deadline",
  prep: "Prep",
  application: "Application",
  point_purchase: "Buy Points",
};

function planItemsToEvents(items: PlanItem[], year: number): ICSEventInput[] {
  const events: ICSEventInput[] = [];

  for (const item of items) {
    const startDate = new Date(year, item.month - 1, item.day ?? 1);

    let endDate: Date | undefined;
    if (item.endMonth && item.endDay) {
      endDate = new Date(year, item.endMonth - 1, item.endDay);
    } else if (item.endDay) {
      endDate = new Date(year, item.month - 1, item.endDay);
    }

    const typeLabel = ITEM_TYPE_LABELS[item.type] ?? item.type;
    const stateName = item.stateId ? (STATES_MAP[item.stateId]?.name ?? item.stateId) : "";
    const statePrefix = stateName ? `${stateName}: ` : "";

    const descriptionParts: string[] = [];
    descriptionParts.push(`Type: ${typeLabel}`);
    if (item.description) descriptionParts.push(item.description);
    if (item.estimatedCost != null && item.estimatedCost > 0) {
      descriptionParts.push(`Estimated Cost: $${item.estimatedCost.toLocaleString()}`);
    }
    if (item.completed) {
      descriptionParts.push("Status: Completed");
    }
    descriptionParts.push("");
    descriptionParts.push("-- Odyssey Outdoors Hunt Planner");

    events.push({
      title: `${statePrefix}${item.title}`,
      description: descriptionParts.join("\n"),
      startDate,
      endDate,
      isAllDay: true,
      location: stateName || undefined,
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// GET — serve .ics file for a shared planner token
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // 1. Cache availability check
  if (!isCacheAvailable()) {
    return NextResponse.json(
      { error: "Calendar service temporarily unavailable" },
      { status: 503 },
    );
  }

  // 2. Retrieve snapshot from Redis
  const shareKey = `planner_share:${token}`;
  const snapshot = await cacheGet<PlannerSharePayload>(shareKey);

  if (!snapshot) {
    return NextResponse.json(
      { error: "Shared plan not found or expired" },
      { status: 404 },
    );
  }

  // 3. Convert PlanItems to ICS events
  const events = planItemsToEvents(snapshot.items, snapshot.year);

  // 4. Collect timezones from states in the plan
  const tzSet = new Set<string>();
  for (const item of snapshot.items) {
    if (item.stateId) {
      const state = STATES_MAP[item.stateId];
      if (state?.deadlineTimezone) {
        tzSet.add(state.deadlineTimezone);
      }
    }
  }

  // 5. Generate ICS
  const calendarName = snapshot.planName
    ? `${snapshot.planName} - Odyssey Outdoors`
    : `Hunt Plan ${snapshot.year} - Odyssey Outdoors`;

  const ics = buildICS(events, {
    timezones: Array.from(tzSet),
    calendarName,
  });

  // 6. Return with proper content-type headers
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="hunt-plan-${snapshot.year}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
