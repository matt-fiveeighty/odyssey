# Phase 9: Diff View - Research

**Researched:** 2026-02-22
**Domain:** Client-side data diffing engine + structured change presentation
**Confidence:** HIGH

## Summary

Phase 9 builds a "Since your last visit" diff engine that compares the user's current data state against a snapshot captured at their previous visit. The diff engine is purely client-side, leveraging existing Zustand persisted state (AppState.lastVisitAt, already tracked since Phase 5). The architecture follows the established engine pattern: pure functions in `src/lib/engine/` that accept data inputs and return typed result arrays, consumed by React components on the dashboard.

The key architectural insight is that this phase does NOT need server-side diffing. All diff sources (deadline proximity, draw result dates, point creep shifts, new opportunities) are computable from the current state data vs. temporal context. The existing `advisor-temporal.ts` already builds a `TemporalContext` with `lastVisitAt` and `daysSinceLastVisit`. The diff engine extends this pattern by computing specific, categorized, materiality-filtered change items rather than the simpler "welcome back" temporal insight from Phase 5.

The dashboard already replaced the Welcome Back card with the Advisor Insights section in Phase 5 (05-03). The diff view should appear as a NEW section above the advisor insights when the user is returning AND material diffs exist. When no material diffs exist, no section renders (positive silence pattern, consistent with advisor voice design).

**Primary recommendation:** Build a pure-function diff engine (`src/lib/engine/diff-engine.ts`) that computes DiffItem[] from temporal context + current data, with a materiality filter layer, then render via a DiffView component that collapses into the existing dashboard flow above the advisor section.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand (persist) | 5.x | State persistence for lastVisitAt, seenDiffs, visit tracking | Already in use, store key `hunt-planner-app-v2` |
| TypeScript | 5.x | Type-safe diff items, categories, materiality thresholds | Project standard |
| React 19 | 19.x | Component rendering for DiffView | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | latest | Icons for diff category badges | Already in use for advisor cards |
| date-fns | N/A | NOT NEEDED -- use native Date arithmetic | Project uses raw Date, no date-fns dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side diff | Server-side diff API | Overkill -- all data is already client-accessible. Server diff adds latency and complexity with no benefit since data lives in Zustand and constants. |
| Snapshot-based diff | Event-sourced changelog | Event sourcing would require capturing every data mutation. Snapshot comparison is simpler: store a lightweight data fingerprint at visit time, compare against current data on next visit. |
| Full data snapshot storage | Timestamp-only comparison | Full snapshot consumes localStorage quota. Instead, store only `lastVisitAt` timestamp and re-derive what changed by comparing "state of data N days ago" vs "state of data now" using deadline proximity math. |

**Installation:**
```bash
# No new packages needed -- all dependencies already present
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    engine/
      diff-engine.ts           # Core diff computation (pure functions)
      diff-materiality.ts      # Threshold-based suppression filter
      diff-categorizer.ts      # Category assignment + advisor voice interpretation
    types/
      index.ts                 # DiffItem, DiffCategory, DiffSource types (add here)
  components/
    diff/
      DiffView.tsx             # Main container -- renders above advisor insights
      DiffItemCard.tsx         # Single diff item display (reuses AdvisorCard patterns)
  app/(app)/dashboard/
    page.tsx                   # Integration point -- add DiffView section
```

### Pattern 1: Pure-Function Engine Pipeline
**What:** Diff computation follows the same pipeline architecture as `advisor.ts` -- multiple sub-generators produce typed items, a filter layer suppresses noise, and items are sorted by priority.
**When to use:** Always -- this is the established engine pattern in the codebase.
**Example:**
```typescript
// Source: existing pattern in src/lib/engine/advisor.ts
export function computeDiffItems(
  temporal: TemporalContext,
  milestones: Milestone[],
  assessment: StrategicAssessment,
  userPoints: UserPoints[],
  states: State[],
): DiffItem[] {
  if (!temporal.isReturningUser || temporal.daysSinceLastVisit === null || temporal.daysSinceLastVisit < 1) {
    return [];
  }

  const deadlineDiffs = computeDeadlineDiffs(temporal, milestones, states);
  const drawResultDiffs = computeDrawResultDiffs(temporal, states);
  const creepDiffs = computeCreepDiffs(temporal, assessment, userPoints);
  const opportunityDiffs = computeOpportunityDiffs(temporal, assessment, states);

  const all = [...deadlineDiffs, ...drawResultDiffs, ...creepDiffs, ...opportunityDiffs];
  const material = filterByMateriality(all);
  const categorized = material.map(categorizeAndInterpret);

  return categorized.sort((a, b) => CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category]);
}
```

### Pattern 2: Materiality Filter (Threshold-Based Suppression)
**What:** A filter layer that suppresses diff items below significance thresholds to prevent noise.
**When to use:** After raw diff computation, before categorization.
**Example:**
```typescript
// Source: DIFF-03 requirements
const MATERIALITY_THRESHOLDS = {
  costChange: 25,          // $25 minimum cost delta
  deadlineShift: 5,        // 5-day minimum deadline change
  drawTimelineShift: 1,    // 1-year minimum draw timeline change
} as const;

function filterByMateriality(items: RawDiffItem[]): RawDiffItem[] {
  return items.filter(item => {
    switch (item.source) {
      case 'deadline_proximity':
        return Math.abs(item.delta) >= MATERIALITY_THRESHOLDS.deadlineShift;
      case 'point_creep':
        return Math.abs(item.delta) >= MATERIALITY_THRESHOLDS.drawTimelineShift;
      case 'cost_change':
        return Math.abs(item.delta) >= MATERIALITY_THRESHOLDS.costChange;
      case 'draw_result':
      case 'new_opportunity':
        return true; // Always material
    }
  });
}
```

### Pattern 3: Timestamp-Based Comparison (No Snapshot Storage)
**What:** Instead of storing a full data snapshot at each visit, use the `lastVisitAt` timestamp to compute what changed. For deadlines, compute "days until deadline at last visit" vs "days until deadline now." For point creep, the existing `detectCreepShifts()` already compares assessment projections vs current points.
**When to use:** For all diff sources -- avoids localStorage quota concerns.
**Example:**
```typescript
// Deadline proximity diff: was it green (>30d) last visit, now amber/red (<=30d)?
function computeDeadlineDiffs(
  temporal: TemporalContext,
  milestones: Milestone[],
  states: State[],
): RawDiffItem[] {
  const lastVisit = new Date(temporal.lastVisitAt!);
  const now = temporal.currentDate;
  const items: RawDiffItem[] = [];

  for (const milestone of milestones) {
    if (!milestone.dueDate || milestone.completed) continue;
    const daysNow = daysUntilDate(milestone.dueDate, now);
    const daysAtLastVisit = daysUntilDate(milestone.dueDate, lastVisit);
    if (daysNow <= 0) continue; // Already past

    // Urgency zone changed?
    const zoneNow = getUrgencyLevel(milestone.dueDate, now);
    const zoneThen = getUrgencyLevel(milestone.dueDate, lastVisit);
    if (zoneNow !== zoneThen && zoneNow !== 'none') {
      items.push({
        source: 'deadline_proximity',
        delta: daysAtLastVisit - daysNow,
        stateId: milestone.stateId,
        speciesId: milestone.speciesId,
        previousValue: daysAtLastVisit,
        currentValue: daysNow,
        previousZone: zoneThen,
        currentZone: zoneNow,
      });
    }
  }
  return items;
}
```

### Pattern 4: DiffItem Categorization with Advisor Voice
**What:** Each diff item gets a category (action_required, opportunity, status_update, warning) and an advisor-voice interpretation with recommended action. Follows the AdvisorInsight pattern: signal -> interpretation -> recommendation -> CTA.
**When to use:** After materiality filtering.
**Example:**
```typescript
// Source: DIFF-04 requirements
type DiffCategory = 'action_required' | 'opportunity' | 'status_update' | 'warning';

interface DiffItem {
  id: string;
  category: DiffCategory;
  source: DiffSource;
  stateId: string;
  speciesId: string;
  headline: string;          // "CO Elk deadline moved to red zone"
  interpretation: string;    // Advisor voice: "Since your last visit (12 days ago)..."
  recommendation: string;    // "Submit your application now to avoid missing..."
  cta: { label: string; href: string; external?: boolean };
  delta: number;             // Numeric change magnitude for sorting
  seen: boolean;             // Whether user has dismissed this diff
}
```

### Pattern 5: Persistence -- Seen Tracking in AppState
**What:** Add `seenDiffIds: string[]` and `lastDiffComputedAt: string | null` to AppState. When user dismisses or views diffs, their IDs are recorded. Stale seen IDs (older than 90 days) are pruned on visit.
**When to use:** DIFF-05 requirement.
**Example:**
```typescript
// Additions to AppState interface in store.ts
seenDiffIds: string[];
lastDiffComputedAt: string | null;
markDiffSeen: (id: string) => void;
markAllDiffsSeen: () => void;
pruneOldSeenDiffs: () => void;
```

### Anti-Patterns to Avoid
- **Storing full data snapshots in localStorage:** The State[] and Unit[] data is massive. Storing snapshots would blow the ~5MB localStorage quota. Use timestamp-based comparison instead.
- **Computing diffs on every render:** Diff computation should be memoized with useMemo, keyed on lastVisitAt + assessment + milestones. Don't recompute on unrelated state changes.
- **Mixing diff items with advisor insights:** Diff items are a separate section with different semantics (temporal changes vs. portfolio signals). They share visual styling with AdvisorCard but render in their own container.
- **Showing diffs to first-time visitors:** Guard on `temporal.isReturningUser && temporal.daysSinceLastVisit >= 1`. No diffs for new users.
- **Making diff IDs unstable:** Diff IDs must be deterministic (e.g., `diff-deadline-CO-elk-2026-04-07`) so seen-tracking works across sessions. Never use timestamps or random IDs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Urgency zone detection | Custom day thresholds | `getUrgencyLevel()` from `src/lib/engine/urgency.ts` | Canonical thresholds (red<=14d, amber<=30d, green>30d) already defined |
| Point creep shift detection | Custom creep calculator | `detectCreepShifts()` from `src/lib/engine/advisor-creep.ts` | Already computes year-over-year shift magnitudes with proper creep modeling |
| Temporal context building | Custom date math | `buildTemporalContext()` from `src/lib/engine/advisor-temporal.ts` | Already handles null lastVisitAt, same-day guard, days-since calculation |
| Temporal prefix formatting | Custom string formatting | `formatTemporalPrefix()` from `src/lib/engine/advisor-temporal.ts` | Already handles "Since yesterday", "Since N days ago", "Since N weeks ago" |
| Species name formatting | Custom string transforms | `formatSpeciesName()` from `src/lib/utils` | Handles underscore-to-space, proper capitalization |
| State abbreviation lookup | Inline map | `STATES_MAP[stateId]?.abbreviation` from `src/lib/constants/states` | Canonical state data |
| Diff item card UI | New component from scratch | Reuse `AdvisorCard` patterns (urgency styles, category icons, CTA layout) | Visual consistency with existing advisor section |

**Key insight:** The existing engine has already solved most of the sub-problems individually. The diff engine's job is to ORCHESTRATE existing utilities (urgency detection, creep detection, temporal context) into a coherent diff pipeline, not to re-implement their logic.

## Common Pitfalls

### Pitfall 1: recordVisit() Overwriting lastVisitAt Before Diff Computation
**What goes wrong:** If `recordVisit()` fires before the diff engine reads `lastVisitAt`, the "since your last visit" comparison uses the NEW timestamp (today) instead of the previous one, producing zero diffs.
**Why it happens:** The dashboard calls `recordVisit()` in a useEffect on mount (line 113-119 of dashboard/page.tsx). If diff computation also runs on mount, there's a race condition.
**How to avoid:** Compute diffs BEFORE calling recordVisit(). The dashboard's useEffect already runs recordVisit() after render. Ensure diff computation happens in useMemo (synchronous, before effects) or in the same effect but before the recordVisit() call. The safest approach: read `lastVisitAt` via `useAppStore.getState().lastVisitAt` at component initialization (before effects), compute diffs from that, THEN let recordVisit() update the timestamp.
**Warning signs:** Diff section never shows any items even when deadlines have shifted zones.

### Pitfall 2: localStorage Quota Exhaustion from Seen IDs
**What goes wrong:** If seen diff IDs accumulate indefinitely, the persisted store grows without bound.
**Why it happens:** Every dismissed diff adds an ID string. Over months/years, this list grows.
**How to avoid:** Prune seen IDs older than 90 days on each visit. Diff IDs encode the date context (e.g., "diff-deadline-CO-elk-2026-04-07"), so stale IDs can be identified by their embedded date or by age.
**Warning signs:** The `hunt-planner-app-v2` localStorage entry growing beyond 100KB.

### Pitfall 3: Showing Stale Diffs After Plan Regeneration
**What goes wrong:** User regenerates their plan (new assessment), but the diff engine still shows diffs against the OLD assessment's data.
**Why it happens:** `lastVisitAt` doesn't reset when the plan changes -- only on calendar-day boundaries.
**How to avoid:** Store `lastDiffComputedAt` alongside `lastVisitAt`. When `confirmedAssessment.createdAt` is newer than `lastDiffComputedAt`, treat as a fresh baseline (suppress diffs for this session).
**Warning signs:** User sees "draw timeline shifted" diffs immediately after re-running the consultation.

### Pitfall 4: Diff Items Duplicating Advisor Insights
**What goes wrong:** The diff section shows "CO Elk deadline in 12 days" while the advisor section ALSO shows the same deadline insight.
**Why it happens:** Both systems detect the same underlying signal (deadline urgency).
**How to avoid:** Diff items focus on the CHANGE ("moved from green to amber since your last visit"), while advisor insights focus on the CURRENT STATE ("deadline in 12 days"). The diff interpretation should always reference the temporal delta: "This was 45 days out when you last visited; now it's 12 days." If a diff item maps to an existing advisor insight category, cross-reference IDs to avoid pure duplication.
**Warning signs:** Users see the same information twice in adjacent sections.

### Pitfall 5: Zustand Hydration Race with Diff Computation
**What goes wrong:** On first render, Zustand hasn't hydrated from localStorage yet, so `lastVisitAt` is null, and the diff engine produces zero items.
**Why it happens:** Zustand persist middleware hydrates asynchronously on some configurations.
**How to avoid:** The project uses Zustand's synchronous hydration (default for localStorage). But as a safety measure, guard diff computation on `lastVisitAt !== null`. The existing pattern in the dashboard already handles this correctly (line 122-125 builds temporal context from lastVisitAt, which returns `isReturningUser: false` when null).
**Warning signs:** Flash of "no diffs" that resolves after 100ms.

### Pitfall 6: Draw Result Date Diffs When No User Data Exists
**What goes wrong:** The diff engine reports "CO Elk draw results released" but the user hasn't applied to CO Elk.
**Why it happens:** Naively scanning all state draw result dates without filtering to user's portfolio.
**How to avoid:** Only compute draw result diffs for states/species in the user's `confirmedAssessment.stateRecommendations` or `userGoals` or `userPoints`. If the user has no engagement with a state/species, skip it.
**Warning signs:** Users see irrelevant "draw results out for AK Moose" when they have no AK Moose involvement.

## Code Examples

Verified patterns from the existing codebase:

### DiffItem Type Definition (to add to types/index.ts)
```typescript
// Follows AdvisorInsight pattern from existing types
export type DiffSource = 'deadline_proximity' | 'draw_result' | 'point_creep' | 'new_opportunity';
export type DiffCategory = 'action_required' | 'opportunity' | 'status_update' | 'warning';

export interface DiffItem {
  id: string;                          // Stable, deterministic: "diff-deadline-CO-elk"
  source: DiffSource;
  category: DiffCategory;
  stateId: string;
  speciesId: string;
  headline: string;                    // Short: "CO Elk deadline now urgent"
  interpretation: string;              // Advisor voice with temporal context
  recommendation: string;              // Actionable next step
  cta: AdvisorCTA;                     // Reuses existing CTA type
  delta: number;                       // Change magnitude (for sorting)
  previousValue: string | number;      // What it was at last visit
  currentValue: string | number;       // What it is now
}
```

### Reusing Existing Temporal Context (from advisor-temporal.ts)
```typescript
// Source: src/lib/engine/advisor-temporal.ts -- already in codebase
const temporal = buildTemporalContext(lastVisitAt);
if (!temporal.isReturningUser) return []; // No diffs for first-time users

const prefix = formatTemporalPrefix(temporal);
// prefix = "Since your last visit (12 days ago)"
```

### Reusing Existing Urgency Detection (from urgency.ts)
```typescript
// Source: src/lib/engine/urgency.ts -- already in codebase
import { getUrgencyLevel, daysUntilDate } from '@/lib/engine/urgency';

const daysNow = daysUntilDate(milestone.dueDate, now);
const daysAtLastVisit = daysUntilDate(milestone.dueDate, lastVisit);
const zoneNow = getUrgencyLevel(milestone.dueDate, now);     // "red" | "amber" | "green" | "overdue" | "none"
const zoneThen = getUrgencyLevel(milestone.dueDate, lastVisit);
```

### Reusing Existing Point Creep Detection (from advisor-creep.ts)
```typescript
// Source: src/lib/engine/advisor-creep.ts -- already in codebase
import { detectCreepShifts } from '@/lib/engine/advisor-creep';

const shifts = detectCreepShifts(assessment, userPoints);
// Each shift: { stateId, speciesId, previousDrawYear, currentDrawYear, shiftYears, creepRate }
```

### AppState Store Extensions (additions to store.ts)
```typescript
// Add to AppState interface
seenDiffIds: string[];
lastDiffComputedAt: string | null;
markDiffSeen: (id: string) => void;
markAllDiffsSeen: () => void;

// Add to initial state
seenDiffIds: [],
lastDiffComputedAt: null,

// Add actions
markDiffSeen: (id) =>
  set((state) => ({
    seenDiffIds: state.seenDiffIds.includes(id)
      ? state.seenDiffIds
      : [...state.seenDiffIds, id],
  })),
markAllDiffsSeen: () =>
  set((state) => ({
    seenDiffIds: [...new Set([
      ...state.seenDiffIds,
      // All current diff IDs would be passed in -- or compute inline
    ])],
    lastDiffComputedAt: new Date().toISOString(),
  })),
```

### Dashboard Integration Point
```typescript
// In dashboard/page.tsx, ABOVE the advisor insights section:
// Compute diffs BEFORE recordVisit() runs (useMemo is synchronous)
const diffItems = useMemo(() => {
  if (!confirmedAssessment || !temporal.isReturningUser) return [];
  return computeDiffItems(temporal, milestones, confirmedAssessment, userPoints, STATES);
}, [confirmedAssessment, temporal, milestones, userPoints]);

const unseenDiffs = diffItems.filter(d => !seenDiffIds.includes(d.id));

// Render:
{unseenDiffs.length > 0 && (
  <DiffView items={unseenDiffs} onDismissAll={() => markAllDiffsSeen()} />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Welcome Back card (pre-Phase 5) | Advisor Insights section | Phase 5 (05-03) | Welcome Back card was removed; temporal info folded into advisor insights |
| Single temporal insight capped at 1 | Structured diff view with categories | Phase 9 (this phase) | Instead of "Welcome back, X milestones changed" we show individual categorized diff items |
| No materiality filtering | Threshold-based suppression | Phase 9 (this phase) | Prevents noise from trivial changes ($1 cost diffs, 1-day deadline shifts) |

**Key evolution:** Phase 5's temporal insight generator (`generateTemporalInsights`) produces at most 1 insight. Phase 9 replaces/supplements this with a richer, categorized diff system. The temporal insight in advisor.ts should be suppressed when the diff view is active (to avoid duplication).

## Open Questions

1. **Should the diff view replace or coexist with temporal advisor insights?**
   - What we know: Phase 5's `generateTemporalInsights()` produces max 1 temporal insight. Phase 9's diff view covers the same ground with more detail.
   - What's unclear: Whether to suppress the temporal advisor insight when diff items exist, or show both.
   - Recommendation: Suppress the temporal advisor insight when diff items are rendered. The diff view is the "upgraded" version of that insight. Add a guard: if `diffItems.length > 0`, skip the temporal sub-generator in `advisor.ts`.

2. **How to handle draw result date diffs when dates pass between visits?**
   - What we know: `drawResultDates` in states.ts have specific dates (e.g., "2026-06-01" for CO Elk). If a user visits before June 1 and returns after, draw results have "come out."
   - What's unclear: Whether we know if the user actually applied (milestones track apply actions, but completion isn't guaranteed).
   - Recommendation: Show draw result diffs for any species where the user has a milestone of type "apply" in that state+species AND the draw result date has passed since last visit. Prompt user to record their draw outcome.

3. **Maximum diff items to display?**
   - What we know: Advisor insights cap at 7 (MAX_VISIBLE_INSIGHTS). Diff items are a separate section.
   - What's unclear: The right cap for diff items.
   - Recommendation: Cap at 5 most significant diff items. More than 5 creates scroll fatigue. Sort by category priority (action_required > warning > opportunity > status_update).

## Sources

### Primary (HIGH confidence)
- `src/lib/store.ts` -- AppState.lastVisitAt, recordVisit() implementation (lines 234-343)
- `src/lib/engine/advisor-temporal.ts` -- TemporalContext interface, buildTemporalContext(), formatTemporalPrefix()
- `src/lib/engine/advisor-creep.ts` -- detectCreepShifts(), CreepShiftResult type
- `src/lib/engine/urgency.ts` -- getUrgencyLevel(), daysUntilDate(), UrgencyLevel type
- `src/lib/engine/advisor.ts` -- generateAdvisorInsights() pipeline pattern (sub-generators, flatten, sort, cap)
- `src/lib/types/index.ts` -- AdvisorInsight, AdvisorCTA, AdvisorInsightCategory types
- `src/app/(app)/dashboard/page.tsx` -- Current dashboard layout, advisor integration, recordVisit() timing
- `src/components/advisor/AdvisorCard.tsx` -- Visual patterns for urgency-styled insight cards
- `src/lib/constants/states.ts` -- applicationDeadlines, drawResultDates, pointCost data structures

### Secondary (MEDIUM confidence)
- `src/lib/engine/data-loader.ts` -- Three-tier data resolution context (understanding what data might change between visits from scraper updates)

### Tertiary (LOW confidence)
- None -- all findings derived from direct codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns established in codebase
- Architecture: HIGH -- follows exact engine pipeline pattern from advisor.ts (Phase 5)
- Pitfalls: HIGH -- identified through direct code inspection of timing, hydration, and data flow
- Diff sources: HIGH -- DIFF-02 requirements map directly to existing engine capabilities (urgency.ts, advisor-creep.ts, states.ts deadlines/drawResultDates)
- Materiality thresholds: HIGH -- DIFF-03 specifies exact numbers ($25, 5 days, 1 year)
- Persistence: HIGH -- DIFF-05 is a straightforward Zustand store extension following existing patterns

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (30 days -- stable domain, no external dependency changes expected)
