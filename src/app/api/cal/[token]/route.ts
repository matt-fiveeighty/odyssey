import { NextRequest, NextResponse } from "next/server";
import { cacheGet, isCacheAvailable } from "@/lib/redis";
import { buildICS, buildCalendarEventsFromGrid } from "@/lib/calendar/ics-builder";
import type { ICSEventInput } from "@/lib/calendar/ics-builder";
import { buildCalendarGrid } from "@/lib/engine/calendar-grid";
import { STATES_MAP } from "@/lib/constants/states";
import type { StrategicAssessment } from "@/lib/types";

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
  const calKey = `cal:${token}`;
  const snapshot = await cacheGet<{
    assessment: StrategicAssessment;
    createdAt: string;
  }>(calKey);

  if (!snapshot) {
    return NextResponse.json(
      { error: "Calendar not found or expired" },
      { status: 404 },
    );
  }

  // 3. Build state timezone map
  const stateTimezones: Record<string, string> = {};
  for (const [id, state] of Object.entries(STATES_MAP)) {
    if (state.deadlineTimezone) {
      stateTimezones[id] = state.deadlineTimezone;
    }
  }

  // 4. Generate events for ALL available years in the roadmap
  const assessment = snapshot.assessment;
  const allEvents: ICSEventInput[] = [];
  const allTimezones = new Set<string>();

  const availableYears = assessment.roadmap.map((ry) => ry.year);
  for (const year of availableYears) {
    const grid = buildCalendarGrid(assessment, year);
    const { events, timezones } = buildCalendarEventsFromGrid(
      grid,
      year,
      stateTimezones,
    );
    allEvents.push(...events);
    timezones.forEach((tz) => allTimezones.add(tz));
  }

  // 5. Generate ICS content
  const ics = buildICS(allEvents, {
    timezones: Array.from(allTimezones),
    calendarName: "Hunt Planner - Odyssey Outdoors",
  });

  // 6. Return with proper content-type headers
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hunt-planner.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
