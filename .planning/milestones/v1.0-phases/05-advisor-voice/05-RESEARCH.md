# Phase 5: Advisor Voice - Research

**Researched:** 2026-02-22
**Domain:** Opinionated UI commentary engine, temporal context, urgency-calibrated messaging
**Confidence:** HIGH

## Summary

Phase 5 transforms the Hunt Planner dashboard and calendar from a data-display tool into an opinionated advisor that interprets numbers, makes specific recommendations, and prompts action. The codebase already has all the raw data engines needed: `BoardSignal` for status signals, `point-creep.ts` for draw timeline shifts, `urgency.ts` for deadline proximity, `portfolio-health.ts` for health scoring, `discipline-rules.ts` for violations, and `strategy-metrics.ts` for aggregate metrics. What's missing is the interpretation layer: translating these signals into human-readable, portfolio-specific commentary with actionable CTAs.

This is primarily a design-pattern and copywriting challenge, not a library-selection problem. The work is: (1) define an `AdvisorInsight` type that extends `BoardSignal` with interpretation, recommendation, and CTA fields; (2) build a pure-function generator that maps board state + temporal context + portfolio data into advisor insights; (3) rewrite dashboard cards to surface these insights; (4) add temporal awareness (last visit tracking, deadline countdowns); (5) detect point creep shifts with impact commentary; and (6) attach advisor notes to calendar items.

**Primary recommendation:** Build the advisor engine as pure functions in `src/lib/engine/advisor.ts` that consume existing engine outputs (BoardState, PortfolioHealthResult, StrategyMetrics, DisciplineViolation[], CalendarSlotData) and produce `AdvisorInsight[]`. No new libraries needed. Track `lastVisitAt` in the existing Zustand store. All commentary is deterministic (no LLM).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type-safe advisor insight types | Already in codebase |
| Zustand | 5.x | Store `lastVisitAt` for temporal context | Already in codebase, persist middleware available |
| Next.js App Router | 16.x | Dashboard and calendar page rendering | Already in codebase |
| Tailwind CSS 4 | 4.x | Urgency-calibrated styling for advisor cards | Already in codebase |
| shadcn/ui | latest | Card, Badge, Button components for insights | Already in codebase |
| lucide-react | latest | Icons for CTA buttons and insight types | Already in codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | N/A | NOT needed - use native Date arithmetic | Already have `daysUntilDate()` in urgency.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LLM-generated commentary | Deterministic templates | Templates are faster, predictable, testable, and free. LLM adds latency and cost for marginal personality gain. |
| date-fns for temporal math | Native Date + existing `daysUntilDate()` | The codebase already has working date arithmetic in `urgency.ts`. No new dep needed. |
| Separate advisor store | Field in existing stores | `lastVisitAt` is a single ISO string. Adding a whole store is over-engineering. |

**Installation:**
```bash
# No new packages needed. All dependencies already present.
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/engine/
  advisor.ts           # AdvisorInsight generator (pure functions)
  advisor-temporal.ts  # Temporal context engine (last visit, countdowns)
  advisor-creep.ts     # Point creep shift detection + impact commentary
  urgency.ts           # (existing) canonical urgency thresholds
  point-creep.ts       # (existing) creep projection model
  board-state.ts       # (existing) board signals
  portfolio-health.ts  # (existing) health scoring
src/lib/types/
  index.ts             # AdvisorInsight type (extend BoardSignal)
src/components/
  advisor/
    AdvisorCard.tsx    # Reusable advisor insight display with CTA
  consultation/shared/
    AdvisorInsight.tsx # (existing) basic advisor display - will be superseded or extended
```

### Pattern 1: AdvisorInsight Type Extending BoardSignal
**What:** A type that wraps a BoardSignal with interpretation, recommendation, CTA, urgency level, and confidence.
**When to use:** Every place advisor commentary appears (dashboard cards, calendar items, deadline alerts).
**Example:**
```typescript
// Source: Designed from existing BoardSignal in src/lib/types/index.ts

/** Urgency calibration for advisor tone */
export type AdvisorUrgency = "immediate" | "soon" | "informational" | "positive";

/** CTA target — where the user should go */
export interface AdvisorCTA {
  label: string;        // "Apply Now", "Review Deadlines", "Check Draw Results"
  href: string;         // "/deadlines", "/goals", "/plan-builder"
  external?: boolean;   // true for F&G portal links
}

/** Extended insight with interpretation layer */
export interface AdvisorInsight {
  id: string;                          // Stable ID for deduplication
  signal: BoardSignal;                 // The underlying data signal
  category: "deadline" | "portfolio" | "point_creep" | "discipline" | "milestone" | "temporal" | "calendar";
  urgency: AdvisorUrgency;
  interpretation: string;              // "So what?" — what this means for the user
  recommendation: string;              // What to do about it
  cta: AdvisorCTA;                     // Clickable action
  portfolioContext?: string;           // User-specific reference: "Your 3 CO elk points..."
  temporalContext?: string;            // "Since your last visit (12 days ago)..."
  confidence?: DataConfidence;         // From VerifiedDatum system
  expiresAt?: string;                  // ISO date — insight only relevant until this date
}
```

### Pattern 2: Pure Function Generator Pipeline
**What:** A pipeline of pure functions that each produce `AdvisorInsight[]` from specific data sources, then merge and prioritize.
**When to use:** Whenever the dashboard renders or the assessment changes.
**Example:**
```typescript
// Source: Architecture pattern for src/lib/engine/advisor.ts

export function generateAdvisorInsights(
  boardState: BoardState,
  health: PortfolioHealthResult,
  metrics: StrategyMetrics,
  violations: DisciplineViolation[],
  milestones: Milestone[],
  userPoints: UserPoints[],
  temporal: TemporalContext,
  assessment: StrategicAssessment,
): AdvisorInsight[] {
  return [
    ...generateDeadlineInsights(milestones, assessment),
    ...generatePortfolioInsights(boardState, health, metrics, assessment),
    ...generatePointCreepInsights(userPoints, assessment),
    ...generateDisciplineInsights(violations),
    ...generateTemporalInsights(temporal, milestones),
    ...generateMilestoneInsights(milestones),
  ]
    .sort(insightPrioritySorter)   // immediate > soon > informational > positive
    .slice(0, MAX_VISIBLE_INSIGHTS);
}
```

### Pattern 3: Urgency-Calibrated Commentary Templates
**What:** Template functions that produce different tones based on urgency level, using the canonical thresholds from `urgency.ts`.
**When to use:** Every deadline-related insight, every time-sensitive recommendation.
**Example:**
```typescript
// Source: Based on existing urgency thresholds in src/lib/engine/urgency.ts
// red <= 14d, amber <= 30d, green > 30d

function deadlineInsight(
  stateAbbr: string,
  species: string,
  daysLeft: number,
  cost: number,
  url: string,
): AdvisorInsight {
  if (daysLeft <= 14) {
    return {
      // ... base fields
      urgency: "immediate",
      interpretation: `${stateAbbr} ${species} closes in ${daysLeft} days. Miss this and you lose a year of point building.`,
      recommendation: `Submit your application today. Cost: $${cost}.`,
      cta: { label: "Apply Now", href: url, external: true },
    };
  }
  if (daysLeft <= 30) {
    return {
      urgency: "soon",
      interpretation: `${stateAbbr} ${species} deadline is ${daysLeft} days out. Time to finalize your unit choices.`,
      recommendation: `Review your unit selections and budget, then apply before the deadline.`,
      cta: { label: "Review & Apply", href: "/deadlines" },
    };
  }
  return {
    urgency: "informational",
    interpretation: `${stateAbbr} ${species} opens in ~${daysLeft} days. No rush, but start thinking about your approach.`,
    recommendation: `Use this time to research units and confirm your strategy.`,
    cta: { label: "Browse Units", href: "/units" },
  };
}
```

### Pattern 4: Temporal Context via Zustand Persist
**What:** Track `lastVisitAt` in the existing app store. On each dashboard load, compare against current time to generate "since your last visit" commentary.
**When to use:** Welcome-back messaging, change detection between visits.
**Example:**
```typescript
// Source: Extension of existing store pattern in src/lib/store.ts

export interface TemporalContext {
  lastVisitAt: string | null;        // ISO date of previous visit
  daysSinceLastVisit: number | null; // null = first visit
  currentDate: Date;
  isReturningUser: boolean;
}

// In the store (add to AppState):
// lastVisitAt: string | null;
// recordVisit: () => void;

// In dashboard useEffect:
// const { lastVisitAt, recordVisit } = useAppStore();
// const temporal = buildTemporalContext(lastVisitAt);
// useEffect(() => { recordVisit(); }, []);
```

### Pattern 5: Point Creep Shift Detection
**What:** Compare current `yearsToDrawWithCreep` against a baseline stored when the plan was created. Report shifts as advisor insights.
**When to use:** When the user returns and their draw timelines may have changed due to creep.
**Example:**
```typescript
// Source: Extension of existing point-creep.ts

export interface CreepShiftResult {
  stateId: string;
  speciesId: string;
  previousDrawYear: number;   // e.g., Year 5
  currentDrawYear: number;    // e.g., Year 6
  shiftYears: number;         // +1 year
  creepRate: number;
}

function generatePointCreepInsights(
  userPoints: UserPoints[],
  assessment: StrategicAssessment,
): AdvisorInsight[] {
  // For each state/species in portfolio, project draw timeline
  // Compare against roadmap's planned draw year
  // If shifted, generate insight: "CO elk moved from Year 5 to Year 6"
}
```

### Anti-Patterns to Avoid
- **Generic commentary:** "Your portfolio is doing well" tells the user nothing. Always reference specific states, species, points, and timelines.
- **Suggesting plan abandonment (ADV-08):** The advisor comments on the user's EXISTING plan. Never say "consider switching to X instead." Say "your CO elk build is on track" or "your CO elk build needs attention because..."
- **Over-alerting:** Too many insights creates noise. Cap visible insights at 5-7. Prioritize by urgency, then by actionability.
- **Stale temporal references:** Don't show "Since your last visit (0 days ago)..." when the user just opened the app. Only show temporal context when `daysSinceLastVisit >= 1`.
- **Hardcoded dates in commentary:** Always compute relative to `now`. Never reference absolute dates in insight text except for specific deadlines.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Urgency thresholds | Custom day-counting logic | `urgency.ts` `getUrgencyLevel()` and `daysUntilDate()` | Already canonical. Red/amber/green thresholds standardized across the app. |
| Point creep projections | Manual point math | `point-creep.ts` `yearsToDrawWithCreep()` and `drawConfidenceBand()` | Handles creep rate estimation, confidence bands, 30-year cap. |
| Portfolio health scoring | Custom health metric | `portfolio-health.ts` `calculatePortfolioHealthScore()` | 5-dimension weighted scorer already built and used on dashboard. |
| Board status determination | Custom status logic | `board-state.ts` `computeBoardState()` | 8-status state machine with signal generation. |
| Discipline violations | Custom rule checks | `discipline-rules.ts` `evaluateDisciplineRules()` | 7 rules with severity sorting. |
| Species/state name formatting | Manual string manipulation | `formatSpeciesName()` from `utils.ts`, `STATES_MAP` from constants | Centralized name resolution. |
| Date formatting for display | Custom formatting | Native `toLocaleDateString()` | Already used throughout dashboard. |

**Key insight:** All the raw data engines exist. This phase is purely about the interpretation layer on top.

## Common Pitfalls

### Pitfall 1: Commentary That Doesn't Match Data
**What goes wrong:** Advisor says "your CO elk draw is in Year 5" but the roadmap shows Year 4 because data changed.
**Why it happens:** Commentary generated from stale snapshots, not from current assessment data.
**How to avoid:** Generate insights on every render using `useMemo` over current assessment data. Never cache insight text.
**Warning signs:** Mismatch between dashboard numbers and advisor commentary.

### Pitfall 2: CTA Links That Go Nowhere
**What goes wrong:** Advisor recommends "Apply Now" with a link to a state F&G portal, but the URL is stale or missing.
**Why it happens:** `buyPointsUrl` or `fgUrl` on State objects may be outdated or empty.
**How to avoid:** Always check URL existence before generating external CTAs. Fall back to internal app links (`/deadlines`, `/goals`) if no external URL available.
**Warning signs:** `cta.external === true` but `cta.href` is empty string or undefined.

### Pitfall 3: Temporal Context on First Visit
**What goes wrong:** "Since your last visit (null days ago)" or similar broken text on first-ever dashboard load.
**Why it happens:** `lastVisitAt` is null for new users.
**How to avoid:** Check `isReturningUser` flag in `TemporalContext`. Skip temporal insights entirely for first visits.
**Warning signs:** Null/NaN appearing in temporal commentary strings.

### Pitfall 4: Zustand Hydration Race with lastVisitAt
**What goes wrong:** `recordVisit()` fires before Zustand has hydrated from localStorage, overwriting the real `lastVisitAt` with the current timestamp.
**Why it happens:** Zustand persist middleware hydrates asynchronously. A naive `useEffect` runs before hydration completes.
**How to avoid:** Use `useAppStore.persist.onFinishHydration()` or check `useAppStore.persist.hasHydrated()` before recording the visit. Alternatively, read `lastVisitAt` from `getState()` synchronously at component mount (Zustand `getState()` returns the persisted value after hydration).
**Warning signs:** `daysSinceLastVisit` always showing 0 or null for returning users.

### Pitfall 5: Point Creep Shift Detection Without Baseline
**What goes wrong:** Can't report "moved from Year 5 to Year 6" because there's no stored baseline to compare against.
**Why it happens:** The roadmap generator already produces `drawConfidence` on `StateRecommendation.bestUnits[]`, but this is computed at generation time, not re-evaluated on return visits.
**How to avoid:** Store the original `drawConfidence` values from the assessment. On each visit, recompute with current point totals and compare. The delta is the creep shift.
**Warning signs:** Missing `drawConfidence` field on older assessments (needs graceful fallback).

### Pitfall 6: Advisor Voice in Calendar Subscription
**What goes wrong:** Advisor notes in ICS calendar events render as raw text with no formatting.
**Why it happens:** ICS DESCRIPTION fields only support plain text (with \\n line breaks). HTML formatting is not universally supported.
**How to avoid:** Keep calendar advisor notes as plain text. Use line breaks and simple formatting (dashes, colons). Save rich HTML formatting for the web UI.
**Warning signs:** HTML tags visible as literal text in Apple Calendar, Google Calendar, etc.

## Code Examples

Verified patterns from the existing codebase:

### Existing BoardSignal Type (what we extend)
```typescript
// Source: src/lib/types/index.ts line 19-22
export interface BoardSignal {
  type: "positive" | "warning" | "critical";
  message: string;
}
```

### Existing AdvisorInsight Component (current simple version)
```typescript
// Source: src/components/consultation/shared/AdvisorInsight.tsx
// This is a basic text-only display. Phase 5 needs a richer version
// with CTA buttons, urgency indicators, and portfolio context.
export function AdvisorInsight({ text, icon: Icon = Compass }: AdvisorInsightProps) {
  return (
    <div className="fade-in-up p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed italic">{text}</p>
    </div>
  );
}
```

### Urgency Color Mapping (reuse for advisor urgency)
```typescript
// Source: src/lib/engine/urgency.ts lines 55-68
// Same color tokens should be used for AdvisorUrgency levels:
//   "immediate" → red-400 (maps to UrgencyLevel "red")
//   "soon" → amber-400 (maps to UrgencyLevel "amber")
//   "informational" → chart-2 (maps to UrgencyLevel "green")
//   "positive" → primary
```

### Dashboard Welcome Back Pattern (existing temporal-ish context)
```typescript
// Source: src/app/(app)/dashboard/page.tsx lines 106-147
// The welcomeBack useMemo already computes:
//   - drew/didntDraw counts
//   - unrecorded draw results
//   - upcoming deadlines within 60 days
//   - plan year number
// Phase 5 replaces this with proper AdvisorInsight[] generation.
```

### CalendarSlotData (where advisor notes attach)
```typescript
// Source: src/lib/engine/calendar-grid.ts lines 27-50
// The CalendarSlotData interface needs an optional `advisorNote?: string`
// field so calendar items can carry advisor interpretation.
// This text also flows into ICS DESCRIPTION via the ics-builder.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw numbers on dashboard | Numbers exist but no interpretation | Phase 1-4 | Users see data but don't know what to DO |
| Static BoardSignal messages | BoardSignal with type + message | Phase 1 data foundation | Signals exist but are generic ("3 warnings") |
| No temporal context | welcomeBack section in dashboard | Prior sessions | Basic "Year X of plan" but no "since your last visit" |
| No point creep alerts | point-creep.ts projection model | Prior sessions | Projections exist but don't alert on shifts |

**Deprecated/outdated:**
- The existing `AdvisorInsight` component in `consultation/shared/` is a simple text display for wizard steps. It should NOT be modified for Phase 5. Build a new `AdvisorCard` component in `src/components/advisor/` that supports CTAs, urgency, and structured content.

## Open Questions

1. **Max visible insights on dashboard**
   - What we know: Too many insights create noise. The dashboard already has Welcome Back, Action Plan, Deadline Timeline, and Apply This Year sections.
   - What's unclear: Should advisor insights replace the Welcome Back section entirely, or supplement it?
   - Recommendation: Replace the `welcomeBack` section with a proper `AdvisorInsights` section that subsumes welcome-back functionality. Cap at 5 insights. This avoids duplication.

2. **Calendar advisor notes: inline or tooltip?**
   - What we know: CalendarSlot is already very compact (8-9px text). Adding advisor text inline would overflow.
   - What's unclear: Should advisor notes appear on hover/click, or as a separate panel?
   - Recommendation: Add advisor note as a tooltip (title attribute or custom tooltip) on the CalendarSlot. For the detail view/modal, show full advisor interpretation.

3. **Creep shift baseline storage**
   - What we know: `StateRecommendation.bestUnits[].drawConfidence` has optimistic/expected/pessimistic values computed at assessment generation time.
   - What's unclear: Should we store a separate "baseline draw timeline" snapshot, or just compare against the assessment's existing values?
   - Recommendation: Use the assessment's existing `drawConfidence` as the baseline. Recompute current projections with `yearsToDrawWithCreep()` using current user points. The delta is the shift. No new storage needed.

4. **lastVisitAt granularity**
   - What we know: Need to track when the user last visited the dashboard.
   - What's unclear: Track per-page visits or just last app visit?
   - Recommendation: Single `lastVisitAt` ISO string in AppState, updated on dashboard page mount (after hydration). Per-page tracking is over-engineering for current requirements.

## Sources

### Primary (HIGH confidence)
- `src/lib/types/index.ts` - BoardSignal, BoardState, BoardStatus, DisciplineViolation types
- `src/lib/engine/board-state.ts` - computeBoardState(), BOARD_STATUS_LABELS, signal generation
- `src/lib/engine/urgency.ts` - getUrgencyLevel(), daysUntilDate(), UrgencyLevel, canonical thresholds
- `src/lib/engine/point-creep.ts` - yearsToDrawWithCreep(), drawConfidenceBand(), estimateCreepRate()
- `src/lib/engine/portfolio-health.ts` - calculatePortfolioHealthScore(), HealthScoreBreakdown
- `src/lib/engine/discipline-rules.ts` - evaluateDisciplineRules(), 7 rule implementations
- `src/lib/engine/strategy-metrics.ts` - computeStrategyMetrics(), StrategyMetrics
- `src/lib/engine/verified-datum.ts` - DataConfidence, VerifiedDatum, deriveConfidence()
- `src/lib/engine/calendar-grid.ts` - CalendarSlotData, CalendarGrid, buildCalendarGrid()
- `src/lib/store.ts` - AppState, RoadmapStoreState, useAppStore, useRoadmapStore
- `src/app/(app)/dashboard/page.tsx` - Current dashboard implementation with welcomeBack
- `src/components/consultation/shared/AdvisorInsight.tsx` - Existing simple component
- `src/components/results/sections/CalendarSlot.tsx` - Calendar slot rendering
- `src/lib/calendar/ics-builder.ts` - ICS event generation (for advisor notes in subscriptions)

### Secondary (MEDIUM confidence)
- Phase 3 urgency standardization decisions (red <= 14d, amber <= 30d, green > 30d) - verified in urgency.ts
- Phase 1 VerifiedDatum confidence levels - verified in verified-datum.ts

### Tertiary (LOW confidence)
- None. All findings verified against codebase source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed, all existing
- Architecture: HIGH - pure function pattern matches existing engine modules exactly
- Pitfalls: HIGH - all pitfalls identified from actual codebase patterns (Zustand hydration, null handling, ICS text limits)
- Type system: HIGH - BoardSignal extension is straightforward, verified against actual type definitions

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable domain, no external dependencies)
