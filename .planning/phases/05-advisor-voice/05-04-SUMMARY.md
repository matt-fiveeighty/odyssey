---
phase: 05-advisor-voice
plan: 04
subsystem: engine, ui, calendar
tags: [advisor-voice, calendar, ics, tooltip, plain-text]

# Dependency graph
requires:
  - phase: 05-02
    provides: "Advisor insight generator engine (advisor.ts) and types"
  - phase: 03-season-calendar
    provides: "CalendarSlotData, CalendarGrid, buildCalendarGrid"
  - phase: 04-calendar-subscription
    provides: "ICS builder (ics-builder.ts), buildCalendarEventsFromGrid"
provides:
  - "generateCalendarAdvisorNotes pure function for enriching calendar slots with advisor voice"
  - "CalendarSlotData.advisorNote optional field for plain-text advisor interpretation"
  - "CalendarSlot tooltip rendering of advisor notes on hover"
  - "ICS DESCRIPTION enrichment with advisor notes for subscription calendars"
affects: [06-travel-intelligence, 07-scraper-refresh]

# Tech tracking
tech-stack:
  added: []
  patterns: ["post-build enrichment pattern (generate slots, then enrich with advisor notes)"]

key-files:
  created:
    - src/lib/engine/advisor-calendar.ts
  modified:
    - src/lib/engine/calendar-grid.ts
    - src/components/results/sections/CalendarSlot.tsx
    - src/lib/calendar/ics-builder.ts

key-decisions:
  - "Post-build enrichment pattern: advisor notes are generated AFTER buildCalendarGrid, not inside it -- keeps calendar-grid.ts pure data transformation"
  - "Native title attribute for tooltips instead of custom tooltip component -- simplest approach, avoids new dependency, per research recommendation"
  - "Advisor note prepended to ICS DESCRIPTION (not appended) so it appears first in calendar app event details"

patterns-established:
  - "Post-build enrichment: generate data first (buildCalendarGrid), enrich second (generateCalendarAdvisorNotes) -- keeps responsibilities separate"
  - "Truncation with word-boundary preservation: truncateNote() cuts at last space within 50% of max to avoid mid-word breaks"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 5 Plan 4: Calendar Advisor Notes Summary

**Plain-text advisor notes for calendar slots with portfolio-specific points/deadlines, tooltip rendering, and ICS subscription enrichment**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T17:52:02Z
- **Completed:** 2026-02-22T17:55:02Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Extended CalendarSlotData with advisorNote optional field for plain-text advisor interpretation
- Created advisor-calendar.ts engine with generateCalendarAdvisorNotes that enriches all 6 slot types (application, point_purchase, hunt, scout, deadline, prep) with portfolio-specific notes referencing user's points, costs, deadlines, and draw confidence
- CalendarSlot tooltip renders advisorNote on hover (falls back to description when absent)
- ICS builder prepends advisor notes to event DESCRIPTION for calendar subscription enrichment

## Task Commits

Each task was committed atomically:

1. **Task 1: Calendar advisor note generator + CalendarSlotData extension** - `4a02738` (feat)
2. **Task 2: CalendarSlot tooltip rendering + ICS description enrichment** - `c7e6bdf` (feat)

**Plan metadata:** [pending] (docs: complete 05-04 plan)

## Files Created/Modified

- `src/lib/engine/advisor-calendar.ts` - Pure function generating portfolio-specific plain-text advisor notes for each calendar slot type
- `src/lib/engine/calendar-grid.ts` - Added advisorNote optional field to CalendarSlotData interface
- `src/components/results/sections/CalendarSlot.tsx` - Title attribute prefers advisorNote over description for native tooltip
- `src/lib/calendar/ics-builder.ts` - Prepends "Advisor: {note}" to rich description when advisorNote present

## Decisions Made

- **Post-build enrichment pattern:** Advisor notes are generated AFTER buildCalendarGrid, not inside it. This keeps calendar-grid.ts as a pure data transformation and lets consumers choose whether to enrich with advisor notes.
- **Native title attribute:** Used native browser title attribute for tooltip instead of adding a tooltip library. The research recommended "title attribute or custom tooltip" -- title is simplest and avoids new dependency.
- **Advisor note first in ICS DESCRIPTION:** Prepended (not appended) so the advisor interpretation appears first when users view event details in Google Calendar, Apple Calendar, etc.
- **200 char max with word-boundary truncation:** Notes capped at 200 chars using truncateNote() that preserves whole words, keeping tooltips readable.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in `src/app/(app)/dashboard/page.tsx` from uncommitted 05-03 work (removed `Check`/`X` lucide imports, undefined `welcomeBack` variable). These are unrelated to 05-04 changes and documented in `deferred-items.md`. My files compile cleanly; `npm run build` compilation succeeds but static generation fails on the pre-existing dashboard issue.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Calendar advisor notes ready for consumption by any component that calls buildCalendarGrid + generateCalendarAdvisorNotes
- ICS subscription events now carry advisor voice automatically when slots have advisorNote populated
- Dashboard integration (05-03) needs to be completed/committed to unblock full builds
- Phase 5 complete after 05-03 is resolved

## Self-Check: PASSED

- All 5 files verified present on disk
- Commit 4a02738 (Task 1) verified in git log
- Commit c7e6bdf (Task 2) verified in git log

---
*Phase: 05-advisor-voice*
*Completed: 2026-02-22*
