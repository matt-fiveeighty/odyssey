---
phase: 05-advisor-voice
verified: 2026-02-22T18:15:00Z
status: gaps_found
score: 4/5 must-haves verified
re_verification: false
must_haves:
  truths:
    - "Dashboard cards show opinionated 'so what?' interpretations specific to the user's portfolio"
    - "Every advisor insight ends with a recommended action and a clickable CTA"
    - "The advisor uses temporal context -- days since last visit, days until deadlines, time-sensitive windows"
    - "Deadline proximity generates urgency-calibrated commentary (immediate within 14 days, soon within 30, informational at 60+)"
    - "Point creep detection alerts the user when draw timelines shift, with specific impact stated"
  artifacts:
    - path: "src/lib/types/index.ts"
      provides: "AdvisorInsight, AdvisorUrgency, AdvisorCTA, AdvisorInsightCategory types"
    - path: "src/lib/store.ts"
      provides: "lastVisitAt field and recordVisit action in AppState"
    - path: "src/lib/engine/advisor-temporal.ts"
      provides: "TemporalContext type, buildTemporalContext, formatTemporalPrefix"
    - path: "src/lib/engine/advisor-creep.ts"
      provides: "Point creep shift detection and CreepShiftResult"
    - path: "src/lib/engine/advisor.ts"
      provides: "generateAdvisorInsights main pipeline"
    - path: "src/components/advisor/AdvisorCard.tsx"
      provides: "Reusable advisor insight card component"
    - path: "src/app/(app)/dashboard/page.tsx"
      provides: "Dashboard with Advisor Insights section"
    - path: "src/lib/engine/advisor-calendar.ts"
      provides: "generateCalendarAdvisorNotes pure function"
    - path: "src/components/results/sections/CalendarSlot.tsx"
      provides: "CalendarSlot rendering advisor notes as tooltips"
    - path: "src/lib/calendar/ics-builder.ts"
      provides: "ICS DESCRIPTION enrichment with advisor notes"
  key_links:
    - from: "src/app/(app)/dashboard/page.tsx"
      to: "src/lib/engine/advisor.ts"
      via: "calls generateAdvisorInsights in useMemo"
    - from: "src/app/(app)/dashboard/page.tsx"
      to: "src/lib/engine/advisor-temporal.ts"
      via: "calls buildTemporalContext with lastVisitAt"
    - from: "src/app/(app)/dashboard/page.tsx"
      to: "src/lib/store.ts"
      via: "reads lastVisitAt and calls recordVisit"
    - from: "src/lib/engine/advisor.ts"
      to: "src/lib/engine/advisor-creep.ts"
      via: "calls generatePointCreepInsights"
    - from: "src/lib/engine/advisor.ts"
      to: "src/lib/engine/urgency.ts"
      via: "uses getUrgencyLevel and daysUntilDate"
    - from: "ORPHANED: src/lib/engine/advisor-calendar.ts"
      to: "SeasonCalendar.tsx or /api/cal/[token]/route.ts"
      via: "NOT WIRED -- function exists but is never imported or called"
gaps:
  - truth: "Calendar items receive advisor interpretation (Phase 3 dependency + ADV-02 scope)"
    status: partial
    reason: "generateCalendarAdvisorNotes is fully implemented but ORPHANED -- never imported or called by SeasonCalendar.tsx or /api/cal/[token]/route.ts. CalendarSlot.tsx and ics-builder.ts correctly READ advisorNote when present, but no code ever POPULATES it."
    artifacts:
      - path: "src/lib/engine/advisor-calendar.ts"
        issue: "Exported function generateCalendarAdvisorNotes is never imported anywhere in the codebase"
      - path: "src/components/results/sections/SeasonCalendar.tsx"
        issue: "Calls buildCalendarGrid but does not call generateCalendarAdvisorNotes to enrich slots"
      - path: "src/app/api/cal/[token]/route.ts"
        issue: "Calls buildCalendarGrid but does not call generateCalendarAdvisorNotes to enrich slots"
    missing:
      - "Import generateCalendarAdvisorNotes in SeasonCalendar.tsx and call it after buildCalendarGrid to enrich slots before rendering"
      - "Import generateCalendarAdvisorNotes in /api/cal/[token]/route.ts and call it after buildCalendarGrid to enrich ICS events with advisor notes"
---

# Phase 5: Advisor Voice Verification Report

**Phase Goal:** The dashboard and calendar speak like an opinionated advisor -- interpreting data, making specific recommendations, and prompting action -- not just displaying numbers
**Verified:** 2026-02-22T18:15:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dashboard cards show opinionated "so what?" interpretations specific to the user's portfolio -- not just data values but what they mean and what to do about it | VERIFIED | `generateAdvisorInsights` produces 6 categories of portfolio-specific insights (deadline, portfolio, discipline, temporal, milestone, point_creep). Each insight has `interpretation`, `recommendation`, `portfolioContext` referencing the user's actual states, species, points, and budget. Dashboard calls this in useMemo (line 162-174) and renders via AdvisorCard. |
| 2 | Every advisor insight ends with a recommended action and a clickable CTA that takes the user to the relevant part of the app | VERIFIED | Every code path in advisor.ts and advisor-creep.ts populates `recommendation` (non-empty string) and `cta` (with `label` and `href`). AdvisorCard.tsx renders CTA as `<Link>` for internal or `<a target="_blank">` for external links with ArrowRight/ExternalLink icons. |
| 3 | The advisor uses temporal context -- referencing days since last visit, days until deadlines, and time-sensitive windows | VERIFIED | `buildTemporalContext` in advisor-temporal.ts computes `daysSinceLastVisit` and `isReturningUser`. Dashboard calls `recordVisit()` on mount (line 110-116), builds temporal context via useMemo (line 119-122), and passes it to `generateAdvisorInsights`. Temporal insights only appear when `isReturningUser && daysSinceLastVisit >= 1`. Dashboard header shows "Last visit: X days ago" when returning (line 297-301). Deadline insights use `daysUntilDate()` for proximity language. |
| 4 | Deadline proximity generates urgency-calibrated commentary (immediate within 14 days, soon within 30, informational at 60+) | VERIFIED | `generateDeadlineInsights` in advisor.ts maps `getUrgencyLevel()` thresholds: red (<=14d) -> "immediate", amber (<=30d) -> "soon", green (>30d) -> "informational". Each urgency level has distinct interpretation and recommendation text. AdvisorCard renders matching colors: immediate=red-400, soon=amber-400, informational=chart-2, positive=primary. |
| 5 | Point creep detection alerts the user when draw timelines shift, with specific impact stated (e.g., "Year 5 to Year 6") | VERIFIED | `detectCreepShifts` in advisor-creep.ts compares assessment's `drawConfidence.expected` against recomputed timelines. `generatePointCreepInsights` produces insights with interpretation text: `"${state} ${species} draw moved from Year ${prev} to Year ${curr}. Point creep is eroding your position at ${rate} pts/yr."` -- exactly the "Year X to Year Y" format required. |

**Score:** 5/5 success criteria truths verified

### Calendar Advisor Notes (Phase 5 scope extension)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| C1 | Calendar slots show advisor interpretation tooltips | PARTIAL | CalendarSlot.tsx renders `title={slot.advisorNote || slot.description}` (line 59) and ics-builder.ts prepends `"Advisor: ${slot.advisorNote}"` (line 194-196) -- but `generateCalendarAdvisorNotes` is NEVER CALLED anywhere. The enrichment function is orphaned. |

**Note:** The 5 Success Criteria from ROADMAP.md are all verified. The calendar advisor notes wiring gap is a Phase 5 deliverable (plan 05-04) that is functionally incomplete, but it is NOT one of the 5 success criteria. It is an extension that impacts calendar UX but not the primary dashboard advisor voice goal.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/types/index.ts` | AdvisorInsight type system | VERIFIED | Lines 37-73: AdvisorUrgency, AdvisorInsightCategory, AdvisorCTA, AdvisorInsight all exported with correct fields |
| `src/lib/store.ts` | lastVisitAt + recordVisit | VERIFIED | Lines 241-242: AppState interface has `lastVisitAt: string \| null` and `recordVisit`. Lines 327-335: Implementation with same-day guard |
| `src/lib/engine/advisor-temporal.ts` | TemporalContext + buildTemporalContext + formatTemporalPrefix | VERIFIED | 48 lines, pure functions, no React imports, optional `now` param for testing |
| `src/lib/engine/advisor-creep.ts` | CreepShiftResult + detectCreepShifts + generatePointCreepInsights | VERIFIED | 204 lines, imports from point-creep.ts, caps at 3 shifts, uses estimateCreepRate |
| `src/lib/engine/advisor.ts` | generateAdvisorInsights pipeline | VERIFIED | 565 lines, 5 sub-generators + creep, sorted by urgency priority, capped at 7 |
| `src/components/advisor/AdvisorCard.tsx` | Urgency-colored card with CTA | VERIFIED | 121 lines, renders dot/icon/interpretation/context/recommendation/CTA, Link for internal, anchor for external |
| `src/app/(app)/dashboard/page.tsx` | Dashboard with advisor integration | VERIFIED | 1157 lines, imports advisor pipeline, calls recordVisit, builds temporal context, computes boardState, generates insights in useMemo chain, renders AdvisorCard in "Your Advisor" section |
| `src/lib/engine/advisor-calendar.ts` | generateCalendarAdvisorNotes | ORPHANED | 194 lines, function fully implemented with all 6 slot types, but never imported or called by any consumer |
| `src/components/results/sections/CalendarSlot.tsx` | advisorNote tooltip rendering | VERIFIED | Line 59: `title={slot.advisorNote \|\| slot.description}` -- reads field correctly, falls back to description |
| `src/lib/calendar/ics-builder.ts` | ICS DESCRIPTION enrichment | VERIFIED | Lines 194-197: Prepends `"Advisor: ${slot.advisorNote}"` when present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| dashboard/page.tsx | advisor.ts | `generateAdvisorInsights` in useMemo | WIRED | Line 164: called with all 8 required inputs |
| dashboard/page.tsx | advisor-temporal.ts | `buildTemporalContext(lastVisitAt)` | WIRED | Lines 41, 119-122: imported and called |
| dashboard/page.tsx | store.ts | `lastVisitAt, recordVisit` destructured | WIRED | Line 96: destructured from useAppStore, line 115: recordVisit() called |
| dashboard/page.tsx | AdvisorCard.tsx | renders `<AdvisorCard>` in map | WIRED | Lines 43, 304-306: imported and rendered |
| advisor.ts | urgency.ts | `getUrgencyLevel, daysUntilDate` | WIRED | Line 33: both imported and used in generateDeadlineInsights |
| advisor.ts | advisor-temporal.ts | `TemporalContext, formatTemporalPrefix` | WIRED | Lines 32-34: both type and function imported and used |
| advisor.ts | advisor-creep.ts | `generatePointCreepInsights` | WIRED | Line 35: imported, line 504: called in pipeline |
| advisor-creep.ts | point-creep.ts | `yearsToDrawWithCreep, estimateCreepRate` | WIRED | Line 16: both imported and used in detectCreepShifts |
| advisor-calendar.ts | SeasonCalendar.tsx | NOT WIRED | NOT WIRED | `generateCalendarAdvisorNotes` is never imported by SeasonCalendar.tsx |
| advisor-calendar.ts | /api/cal/route.ts | NOT WIRED | NOT WIRED | `generateCalendarAdvisorNotes` is never imported by the ICS API route |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| ADV-01: AdvisorInsight type system extending BoardSignal | SATISFIED | -- |
| ADV-02: Dashboard cards with opinionated "so what?" interpretations | SATISFIED | Dashboard fully replaced; calendar advisor notes orphaned but not in ADV-02 scope text |
| ADV-03: Every insight ends with recommended action and clickable CTA | SATISFIED | -- |
| ADV-04: Temporal context ("Since your last visit...") | SATISFIED | -- |
| ADV-05: Portfolio-specific (references user's points, states, species, budget) | SATISFIED | -- |
| ADV-06: Deadline proximity urgency calibration (14/30/60 day thresholds) | SATISFIED | -- |
| ADV-07: Point creep detection with specific impact ("Year 5 to Year 6") | SATISFIED | -- |
| ADV-08: Advisor comments on user's existing plan, never suggests abandoning | SATISFIED | No "abandon"/"switch to" language found; recommendation text frames advice in terms of existing plan |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none found) | -- | -- | -- | No TODOs, FIXMEs, placeholders, stubs, or empty implementations found in any Phase 5 artifact |

### Human Verification Required

### 1. Advisor Card Visual Appearance

**Test:** Navigate to /dashboard with a confirmed plan. Inspect the "Your Advisor" section.
**Expected:** Cards show urgency-colored left border and dot (red for immediate, amber for soon, teal for informational, blue for positive). Interpretation text is prominent, recommendation is smaller, CTA button is clickable.
**Why human:** Cannot verify visual styling or color correctness programmatically.

### 2. CTA Navigation

**Test:** Click each CTA button in advisor insight cards.
**Expected:** Internal CTAs (e.g., "View Strategy" -> /plan-builder, "View Deadlines" -> /deadlines) navigate correctly via Next.js Link. External CTAs (F&G portal links) open in a new tab.
**Why human:** Cannot verify navigation behavior without running the app.

### 3. Temporal Context Display

**Test:** Visit /dashboard, wait until the next day, then visit again.
**Expected:** "Last visit: yesterday" appears in the advisor section header. After longer gaps, format changes to "X days ago".
**Why human:** Requires multi-session testing across days.

### 4. No-Plan State Unchanged

**Test:** Clear localStorage and visit /dashboard without running the consultation.
**Expected:** "Getting Started" flow appears. No advisor section. No errors.
**Why human:** Requires fresh browser state to verify.

### Gaps Summary

**1 gap found**, affecting the calendar advisor notes wiring:

`generateCalendarAdvisorNotes` in `src/lib/engine/advisor-calendar.ts` is a complete, well-implemented pure function that enriches calendar slots with portfolio-specific advisor notes for all 6 slot types. The downstream consumers (`CalendarSlot.tsx` tooltip rendering and `ics-builder.ts` ICS DESCRIPTION enrichment) correctly read the `advisorNote` field when present.

However, the function is **never imported or called** by the two code paths that build calendar grids:
- `SeasonCalendar.tsx` (line 60) calls `buildCalendarGrid` but never enriches with `generateCalendarAdvisorNotes`
- `/api/cal/[token]/route.ts` (line 52) calls `buildCalendarGrid` but never enriches with `generateCalendarAdvisorNotes`

This means advisor notes will never appear in calendar tooltips or ICS subscription events in practice. The fix is two import+call additions -- one in each consumer, after `buildCalendarGrid` returns, enriching the grid rows before rendering or event generation.

**Impact assessment:** This gap does NOT block any of the 5 ROADMAP success criteria (which focus on dashboard advisor voice). It is a plan 05-04 deliverable that is 90% complete (engine + type + rendering all done, just wiring missing). The gap is isolated and low-effort to fix.

---

_Verified: 2026-02-22T18:15:00Z_
_Verifier: Claude (gsd-verifier)_
