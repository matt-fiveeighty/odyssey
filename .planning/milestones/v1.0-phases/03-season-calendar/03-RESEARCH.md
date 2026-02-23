# Phase 3: Season Calendar - Research

**Researched:** 2026-02-21
**Domain:** Swimlane calendar UI, data aggregation from existing engine, urgency color-coding
**Confidence:** HIGH

## Summary

Phase 3 builds a month-by-month swimlane calendar (state rows x month columns) that visualizes all hunt-related activities for a single year. The good news: the existing codebase already produces nearly all the data this calendar needs. The `auto-fill.ts` engine generates `AutoFillItem[]` with `month`, `stateId`, `speciesId`, `estimatedCost`, `itemType`, and `priority` -- which maps almost 1:1 to what the calendar slots need. The `generatePlanDefaultItems()` function adds day-level precision with `day`, `endDay`, `endMonth` for hunt windows. The `StrategicAssessment.roadmap` (type `RoadmapYear[]`) contains the year-over-year plan with all actions, costs, and due dates.

The main engineering work is (1) a data aggregation layer that reshapes existing `RoadmapAction[]` + `Milestone[]` + `AutoFillItem[]` into a state-by-month grid structure, (2) the swimlane UI component, and (3) wiring it into the existing Timeline tab as a zoom level. Urgency color-coding logic already exists in 3 places in the codebase (`deadlines/page.tsx`, `MilestoneCalendar.tsx`, `YearOneActionPlan.tsx`) and should be extracted into a shared utility.

**Primary recommendation:** Build the calendar data model as a pure function `buildCalendarGrid(assessment, year)` that reshapes `StrategicAssessment` data into `Map<stateId, Map<month, CalendarSlot[]>>`. The swimlane component consumes this grid. No new data fetching or engine changes needed -- this is a pure presentation layer on top of existing data.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.x | Component framework | Already in project |
| Tailwind CSS 4 | 4.x | Styling | Already in project |
| shadcn/ui | latest | UI primitives | Already in project |
| Zustand | 5.x | State (reads from `useRoadmapStore` / `useAppStore`) | Already in project |
| lucide-react | latest | Icons | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/engine/auto-fill.ts` | existing | Generates plan items with month + cost | Calendar data source |
| `@/lib/engine/season-parser.ts` | existing | Parses season date strings into `ParsedDateRange` | Hunt window date ranges |
| `@/lib/constants/states.ts` | existing | `applicationDeadlines`, `drawResultDates`, `seasonTiers` | Deadline/season data |
| `@/components/shared/SpeciesAvatar.tsx` | existing | Species thumbnail in slots | Visual identification |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom grid | `react-calendar` / `@tanstack/virtual` | Overkill -- the grid is fixed 12-column, not scrollable, not interactive enough to need virtualization |
| CSS Grid | Flexbox table | CSS Grid is the right tool for state rows x month columns; it handles uneven slot counts per cell naturally |

**Installation:**
No new packages needed. Everything is built on existing stack.

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    engine/
      calendar-grid.ts         # buildCalendarGrid() pure function (03-01)
      urgency.ts               # Shared urgency calculation (03-04)
  components/
    results/
      sections/
        SeasonCalendar.tsx      # Swimlane container (03-02)
        CalendarSlot.tsx        # Individual slot chip (03-03)
        CalendarSummaryRow.tsx  # Monthly cost totals (03-05)
        TimelineRoadmap.tsx     # Modified: adds zoom toggle (03-06)
```

### Pattern 1: Calendar Data Model (`CalendarGrid`)
**What:** A pure function that reshapes `StrategicAssessment` + year into a grid structure
**When to use:** Every time the calendar renders or the year changes
**Example:**
```typescript
// src/lib/engine/calendar-grid.ts
export interface CalendarSlotData {
  id: string;
  itemType: "application" | "point_purchase" | "hunt" | "scout" | "deadline" | "prep";
  title: string;
  description: string;
  stateId: string;
  speciesId: string;
  month: number;         // 1-12
  day?: number;          // specific day if known
  endMonth?: number;     // for multi-month spans (hunts)
  endDay?: number;
  estimatedCost: number;
  tagType: "draw" | "otc" | "leftover" | "points_only" | "n/a";
  urgency: "red" | "amber" | "green" | "none";
  dueDate?: string;      // ISO date for deadline proximity
}

export interface CalendarRow {
  stateId: string;
  stateName: string;
  stateAbbr: string;
  color: string;
  months: Map<number, CalendarSlotData[]>; // 1-12
}

export interface CalendarGrid {
  year: number;
  rows: CalendarRow[];
  monthlyCosts: number[];  // index 0 = Jan, index 11 = Dec
  totalCost: number;
}

export function buildCalendarGrid(
  assessment: StrategicAssessment,
  year: number
): CalendarGrid { ... }
```

### Pattern 2: Urgency Calculation (Shared Utility)
**What:** Extract the duplicated urgency logic into a single function
**When to use:** Calendar slots, deadline pages, milestone calendar -- anywhere deadline proximity matters
**Example:**
```typescript
// src/lib/engine/urgency.ts
export type UrgencyLevel = "red" | "amber" | "green" | "none" | "overdue";

export function getUrgencyLevel(dueDateStr: string | undefined, now?: Date): UrgencyLevel {
  if (!dueDateStr) return "none";
  const due = new Date(dueDateStr);
  const today = now ?? new Date();
  const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 0) return "overdue";
  if (daysUntil <= 14) return "red";
  if (daysUntil <= 30) return "amber";
  return "green";
}

export function urgencyColorClass(level: UrgencyLevel): string {
  switch (level) {
    case "red":    return "text-red-400 border-red-500/30 bg-red-500/10";
    case "amber":  return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    case "green":  return "text-chart-2 border-chart-2/30 bg-chart-2/10";
    case "overdue": return "text-destructive border-destructive/30 bg-destructive/10";
    default:       return "text-muted-foreground";
  }
}
```

### Pattern 3: Zoom Level Toggle in TimelineRoadmap
**What:** Add a year-view/month-view toggle to the existing TimelineRoadmap component
**When to use:** CAL-08 requires the calendar to live inside the Timeline tab as a zoom level
**Example:**
```typescript
// TimelineRoadmap.tsx modification
const [viewMode, setViewMode] = useState<"years" | "months">("years");

// When "months" is selected, render <SeasonCalendar /> instead of the year accordion
// This avoids creating a new tab -- the calendar is a zoom level of the timeline
```

### Anti-Patterns to Avoid
- **Fetching new data for the calendar:** The calendar should ONLY reshape data already in `StrategicAssessment`. No new API calls, no new engine runs. The assessment already contains `roadmap`, `milestones`, `seasonCalendar`, `stateRecommendations` -- everything needed.
- **Expanding all months at once:** UAT feedback item #12 specifically calls this out: "only show month detail for selected month." The swimlane overview should be compact with expandable detail.
- **Creating a separate route/page:** The calendar lives INSIDE the Timeline tab as a zoom level (CAL-08). Do not create a new page or a new tab.
- **Duplicating urgency logic:** Currently duplicated in 3 places. Extract to shared utility, don't add a 4th copy.

## Data Flow Analysis

### Where Calendar Data Comes From

```
StrategicAssessment (from useRoadmapStore.activeAssessment)
  |
  +-- .roadmap: RoadmapYear[]
  |     Each RoadmapYear has:
  |       .year, .phase, .actions: RoadmapAction[]
  |       Each RoadmapAction has:
  |         .type ("apply" | "buy_points" | "hunt" | "scout")
  |         .stateId, .speciesId, .cost, .costs: CostLineItem[]
  |         .dueDate (from applicationDeadlines)
  |         .unitCode (for hunts)
  |
  +-- .milestones: Milestone[]
  |     Each Milestone has:
  |       .type, .stateId, .speciesId, .year, .dueDate
  |       .totalCost, .costs: CostLineItem[]
  |       .completed, .drawOutcome
  |
  +-- .seasonCalendar: SeasonCalendarEntry[]
  |     Per state+species: season tiers with dates
  |     (used for hunt window overlays)
  |
  +-- .stateRecommendations: StateRecommendation[]
        Per state: role, annualCost, bestUnits
```

### Data Transformation Pipeline

```
buildCalendarGrid(assessment, year):
  1. Filter assessment.roadmap to the target year
  2. For each RoadmapAction in that year:
     - Map to CalendarSlotData with month from dueDate or action type defaults
     - Derive tagType from action.type + state.pointSystem
     - Calculate urgency from dueDate proximity
  3. Also incorporate assessment.milestones for the year
     - Milestones have finer dueDate data
  4. Group by stateId, then by month
  5. Calculate monthly cost totals
  6. Return CalendarGrid
```

### Tag Type Derivation Logic

The `tagType` field ("draw" | "otc" | "leftover" | "points_only" | "n/a") is NOT currently stored on RoadmapAction. It must be derived:
- `action.type === "buy_points"` -> `"points_only"`
- `action.type === "apply"` + state has `pointSystem === "random"` -> `"draw"` (all random states are draw-only)
- `action.type === "apply"` + state has preference/hybrid -> `"draw"`
- `action.type === "hunt"` -> `"draw"` (default; OTC/leftover detection would need opportunity-finder data)
- `action.type === "scout"` -> `"n/a"`

Note: Full OTC/leftover detection requires data from `opportunity-finder.ts` which is not currently wired into the assessment. For Phase 3, default to "draw" for hunt actions and enhance later when scraper data (Phase 7, SCRP-09) provides leftover tag info.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar data from engine | Custom data fetching/generation | `StrategicAssessment.roadmap` + `milestones` | Data already exists in store, just needs reshaping |
| Date parsing for seasons | Custom date parser | `season-parser.ts` `parseSeasonDates()` | Already handles "Sep 2-30", "Oct 14 - Nov 18" formats |
| Species display | Custom species name + image logic | `formatSpeciesName()` + `SpeciesAvatar` | Already standardized across the app |
| State visual identity | Custom color/gradient system | `STATE_VISUALS` from `state-images.ts` + `State.color` | Consistent with rest of results UI |
| Urgency calculation | Inline date math (again) | Extract shared `urgency.ts` | Already duplicated 3 times, don't add a 4th |
| ICS export from calendar slots | Custom ICS builder | `calendar-export.ts` `exportPlanItem()` | Already exists and handles all edge cases |

**Key insight:** Phase 3 is primarily a UI/data-reshaping exercise. The engine already produces all the raw data. The risk is not "how to get the data" but "how to present it cleanly in a swimlane grid."

## Common Pitfalls

### Pitfall 1: Overcrowded Cells
**What goes wrong:** States with 4-6 species each generate 4-6 items per month. A CO cell in March-April could have 8+ items (application + deadline per species).
**Why it happens:** The engine generates one action per species per state per year-phase.
**How to avoid:** Group items within a cell by species. Show a compact chip per item, expand on click/hover. Consider "N items" badge when count > 3.
**Warning signs:** Testing with a 5-species, 5-state plan and the grid becomes unreadable.

### Pitfall 2: Mobile Layout Collapse
**What goes wrong:** A 12-column grid is inherently wide. On mobile (375px), each column gets ~30px -- too narrow for any content.
**Why it happens:** Swimlane calendars are desktop-first patterns.
**How to avoid:** On mobile, switch to a vertical list layout grouped by month (like the existing MilestoneCalendar). Use the grid layout only above `md` breakpoint. This is consistent with the existing ResultsShell which already uses responsive patterns.
**Warning signs:** Testing on iPhone viewport shows truncated/overflowing cells.

### Pitfall 3: Stale Urgency Colors
**What goes wrong:** Urgency colors (red/amber/green) are calculated at render time based on `new Date()`. If the tab stays open for hours/days, colors become stale.
**Why it happens:** No re-render trigger for time passage.
**How to avoid:** This is acceptable for a calendar view -- the user will refresh or revisit. Do NOT add a timer-based re-render. Urgency is a snapshot, not a live counter.
**Warning signs:** Over-engineering this with intervals/timers.

### Pitfall 4: Year-View / Month-View State Conflict
**What goes wrong:** The Timeline tab already has expandable year accordions. Adding a "months" zoom level creates confusion about what state is expanded.
**Why it happens:** Two independent UI state systems (year expansion + zoom level).
**How to avoid:** When zoom is "months" (calendar view), the year accordion state is irrelevant -- hide it entirely and show the swimlane grid for the selected year. Clean state separation.
**Warning signs:** Both views rendering simultaneously, or expansion state leaking between views.

### Pitfall 5: UAT Item #12 -- "All months expand at once"
**What goes wrong:** The existing MilestoneCalendar (goals page) shows all months expanded simultaneously, making users scroll excessively.
**Why it happens:** No month-level expand/collapse in the list view.
**How to avoid:** The swimlane grid inherently solves this -- all months are visible as compact columns. Detail only expands for the selected cell/month. If implementing a mobile list fallback, only expand the selected month.
**Warning signs:** Building a vertical month list that expands everything.

## Existing Codebase Inventory

### Files That Will Be Modified
| File | Change | Risk |
|------|--------|------|
| `src/components/results/sections/TimelineRoadmap.tsx` | Add year/month zoom toggle (CAL-08) | LOW -- additive change, toggle controls which view renders |
| `src/components/results/ResultsShell.tsx` | None expected -- TimelineRoadmap is already lazy-loaded | NONE |

### Files That Will Be Created
| File | Purpose | Plan |
|------|---------|------|
| `src/lib/engine/calendar-grid.ts` | `buildCalendarGrid()` pure function | 03-01 |
| `src/lib/engine/urgency.ts` | Shared urgency calculation | 03-04 |
| `src/components/results/sections/SeasonCalendar.tsx` | Swimlane container component | 03-02 |
| `src/components/results/sections/CalendarSlot.tsx` | Individual slot chip component | 03-03 |

### Existing Files Providing Data (Read-Only)
| File | What It Provides |
|------|-----------------|
| `src/lib/engine/auto-fill.ts` | `AutoFillItem` type reference, `generatePlanDefaultItems()` for enrichment |
| `src/lib/engine/roadmap-generator.ts` | `StrategicAssessment` with all roadmap data |
| `src/lib/engine/season-parser.ts` | `parseSeasonDates()` for hunt window date ranges |
| `src/lib/types/index.ts` | All type definitions |
| `src/lib/constants/states.ts` | `applicationDeadlines`, `drawResultDates`, `seasonTiers`, `pointSystem` |
| `src/lib/store.ts` | `useRoadmapStore` (activeAssessment), `useAppStore` (milestones) |
| `src/lib/constants/state-images.ts` | `STATE_VISUALS` for gradient backgrounds |

### Existing Urgency Logic (to be consolidated)
| Location | Pattern | Threshold |
|----------|---------|-----------|
| `src/app/(app)/deadlines/page.tsx:111-123` | `urgencyClass()` + `urgencyBorder()` | <=3d red, <=7d orange, <=14d amber |
| `src/components/goals/MilestoneCalendar.tsx:305` | Inline `isUrgent` check | <=14d urgent |
| `src/components/results/sections/YearOneActionPlan.tsx:196` | Inline `isUrgent` check | <=30d urgent |

The requirements specify: red <=14d, amber <=30d, green on track. This should be the canonical threshold set.

## Code Examples

### Building the Calendar Grid from Assessment Data
```typescript
// Source: Derived from src/lib/engine/auto-fill.ts and src/lib/types/index.ts patterns

import type { StrategicAssessment, RoadmapAction } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { getUrgencyLevel } from "./urgency";

export function buildCalendarGrid(
  assessment: StrategicAssessment,
  year: number
): CalendarGrid {
  const roadmapYear = assessment.roadmap.find(ry => ry.year === year);
  if (!roadmapYear) return emptyGrid(year);

  const rowMap = new Map<string, CalendarRow>();

  for (const action of roadmapYear.actions) {
    const state = STATES_MAP[action.stateId];
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

    // Build slot
    const slot: CalendarSlotData = {
      id: `${action.stateId}-${action.speciesId}-${action.type}-${month}`,
      itemType: mapActionTypeToItemType(action.type),
      title: action.description.slice(0, 50),
      description: action.description,
      stateId: action.stateId,
      speciesId: action.speciesId,
      month,
      estimatedCost: action.cost,
      tagType: deriveTagType(action, state),
      urgency: getUrgencyLevel(action.dueDate),
      dueDate: action.dueDate,
    };

    const monthSlots = row.months.get(month) ?? [];
    monthSlots.push(slot);
    row.months.set(month, monthSlots);
  }

  // Calculate monthly costs
  const monthlyCosts = Array.from({ length: 12 }, (_, i) => {
    let total = 0;
    for (const row of rowMap.values()) {
      for (const slot of row.months.get(i + 1) ?? []) {
        total += slot.estimatedCost;
      }
    }
    return total;
  });

  return {
    year,
    rows: Array.from(rowMap.values()),
    monthlyCosts,
    totalCost: monthlyCosts.reduce((s, c) => s + c, 0),
  };
}
```

### Swimlane Grid Layout
```typescript
// Source: Derived from existing ResultsShell/TimelineRoadmap patterns

// CSS Grid approach for the swimlane
// Row 0: month headers (Jan-Dec)
// Rows 1-N: state rows
// Last row: cost summary

<div className="grid grid-cols-[120px_repeat(12,1fr)] gap-px bg-border/30 rounded-xl overflow-hidden">
  {/* Header row */}
  <div className="bg-background p-2" /> {/* Empty corner cell */}
  {MONTHS.map(m => (
    <div key={m} className="bg-background p-2 text-center text-[10px] font-medium text-muted-foreground uppercase">
      {m}
    </div>
  ))}

  {/* State rows */}
  {grid.rows.map(row => (
    <Fragment key={row.stateId}>
      {/* State label cell */}
      <div className="bg-background p-2 flex items-center gap-2">
        <div className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold text-white`}
             style={{ backgroundColor: row.color }}>
          {row.stateAbbr}
        </div>
        <span className="text-xs font-medium truncate">{row.stateName}</span>
      </div>
      {/* Month cells */}
      {Array.from({ length: 12 }, (_, i) => {
        const slots = row.months.get(i + 1) ?? [];
        const isEmpty = slots.length === 0;
        return (
          <div key={i} className={`bg-background p-1 min-h-[48px] ${isEmpty ? "bg-secondary/10" : ""}`}>
            {isEmpty ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-border/50" />
              </div>
            ) : (
              slots.map(slot => <CalendarSlot key={slot.id} slot={slot} />)
            )}
          </div>
        );
      })}
    </Fragment>
  ))}

  {/* Summary row */}
  <div className="bg-background p-2 text-xs font-bold">Total</div>
  {grid.monthlyCosts.map((cost, i) => (
    <div key={i} className="bg-background p-2 text-center text-[10px] font-mono font-medium">
      {cost > 0 ? `$${cost.toLocaleString()}` : "-"}
    </div>
  ))}
</div>
```

## Integration Points

### How SeasonCalendar Connects to TimelineRoadmap (CAL-08)

The calendar is a **zoom level** inside the Timeline tab, not a separate tab.

```
TimelineRoadmap.tsx
  |-- viewMode: "years" | "months"
  |-- Toggle button in header (e.g., Calendar/List icon toggle)
  |
  |-- if viewMode === "years":
  |     Render existing year accordion (unchanged)
  |
  |-- if viewMode === "months":
  |     Render <SeasonCalendar assessment={assessment} year={selectedYear} />
  |     + Year selector (prev/next arrows)
```

### How Data Flows from Store to Calendar

```
useRoadmapStore.activeAssessment
  --> TimelineRoadmap receives `assessment` prop
    --> buildCalendarGrid(assessment, selectedYear)
      --> SeasonCalendar renders the grid
        --> CalendarSlot renders individual items
```

No new store state needed. The calendar is a derived view of existing data.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MilestoneCalendar (vertical list by month) | Swimlane grid (state rows x month cols) | Phase 3 | Spatial layout lets users see ALL states at once instead of scrolling |
| Inline urgency math in 3 places | Shared `urgency.ts` utility | Phase 3 | Single source of truth for deadline proximity coloring |
| Year accordion only in Timeline tab | Year accordion + month swimlane as zoom levels | Phase 3 | Users can switch between "multi-year roadmap" and "single-year calendar" views |

## Open Questions

1. **OTC/Leftover Tag Type Detection**
   - What we know: The `RoadmapAction` type does not carry `tagType`. We can derive "draw" vs "points_only" from action type and state point system.
   - What's unclear: Accurate OTC/leftover classification requires scraper data (Phase 7, SCRP-09) that does not exist yet.
   - Recommendation: Default all hunt actions to `tagType: "draw"` for now. Add a TODO comment for Phase 7 integration. This is honest -- most hunt actions in the roadmap ARE draw-based.

2. **Mobile Layout Strategy**
   - What we know: 12-column swimlane does not fit on mobile. Existing MilestoneCalendar uses a vertical month list.
   - What's unclear: Should mobile show a horizontal-scroll grid or a vertical list?
   - Recommendation: Vertical list on mobile (below `md` breakpoint), matching existing MilestoneCalendar pattern. The swimlane grid is a desktop pattern. Users on mobile likely want "what's next" more than spatial overview.

3. **Which Year to Show by Default**
   - What we know: The roadmap covers 10+ years. The calendar shows one year at a time.
   - What's unclear: Should it default to the current year or the first roadmap year?
   - Recommendation: Default to the current calendar year if it falls within the roadmap range. Otherwise, default to the first roadmap year. This matches user mental model of "what do I need to do THIS year."

## Sources

### Primary (HIGH confidence)
- `src/lib/engine/auto-fill.ts` - Full read of AutoFillItem types and generation logic
- `src/lib/engine/roadmap-generator.ts` - Full read of StrategicAssessment generation, including `generateSeasonCalendar()` and `generateYearlyPlan()`
- `src/lib/types/index.ts` - Full type definitions for RoadmapYear, RoadmapAction, Milestone, SeasonCalendarEntry, StrategicAssessment
- `src/components/results/sections/TimelineRoadmap.tsx` - Current timeline implementation (year accordion, editable actions)
- `src/components/results/ResultsShell.tsx` - Tab system and props passing
- `src/lib/constants/states.ts` - applicationDeadlines, drawResultDates, seasonTiers structure
- `src/lib/store.ts` - useRoadmapStore, useAppStore, milestone management
- `src/lib/engine/season-parser.ts` - parseSeasonDates() for hunt window ranges
- `src/lib/calendar-export.ts` - Existing ICS export utilities
- `.planning/REQUIREMENTS.md` - CAL-01 through CAL-08 formal definitions
- `.planning/ROADMAP.md` - Phase 3 plan structure and success criteria

### Secondary (MEDIUM confidence)
- `src/app/(app)/deadlines/page.tsx` - Urgency coloring patterns (3d/7d/14d thresholds)
- `src/components/goals/MilestoneCalendar.tsx` - Existing month-based calendar UI patterns
- `src/components/results/sections/YearOneActionPlan.tsx` - Urgency + state grouping patterns

### Tertiary (LOW confidence)
- UAT feedback item #12 reference - "all months expand at once" issue (mentioned in phase description, not independently verified in a UAT document)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, pure existing stack
- Architecture: HIGH - clear data flow from existing types, well-understood grid pattern
- Data model: HIGH - auto-fill.ts and roadmap-generator.ts fully read, types fully understood
- Integration (CAL-08): HIGH - TimelineRoadmap.tsx fully read, clean zoom-level addition
- Pitfalls: HIGH - urgency duplication confirmed in 3 files, mobile concerns well-understood
- Tag type derivation: MEDIUM - OTC/leftover needs Phase 7 data, draw/points_only derivable now

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable -- no external dependencies, all internal codebase)
