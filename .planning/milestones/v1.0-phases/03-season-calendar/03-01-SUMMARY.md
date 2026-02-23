# Plan 03-01 Summary: Urgency utility + calendar grid data model

**Status:** Complete
**Duration:** ~6 min

## What Was Built

- `src/lib/engine/urgency.ts` — Shared urgency utility with canonical thresholds (≤14d red, ≤30d amber, >30d green), getUrgencyLevel, urgencyColorClass, daysUntilDate
- `src/lib/engine/calendar-grid.ts` — Pure function buildCalendarGrid transforming StrategicAssessment into CalendarGrid (rows by state, months 1-12, CalendarSlotData with itemType/tagType/urgency). Milestone deduplication, monthly cost aggregation, alphabetical row sorting.
