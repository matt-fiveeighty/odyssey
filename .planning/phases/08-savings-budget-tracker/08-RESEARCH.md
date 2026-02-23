# Phase 8: Savings & Budget Tracker - Research

**Researched:** 2026-02-22
**Domain:** Financial tracking engine + savings UI components + advisor voice integration
**Confidence:** HIGH

## Summary

Phase 8 adds goal-based savings tracking to the Hunt Planner dashboard. Each `UserGoal` (state/species hunt) gets a linked savings fund with progress rings, monthly target calculations, funded-date projections, traffic light status, and advisor voice savings commentary. The codebase already has significant savings-adjacent infrastructure that should be leveraged rather than rebuilt.

**Critical existing infrastructure:**
1. `SavingsGoalCard.tsx` already exists in `src/components/budget/` with a `SavingsGoal` type, progress bars, monthly savings logic, and auto-suggestions from goals -- but uses `useState` (ephemeral, lost on reload) instead of persisting to Zustand
2. `GoalConfirmation.tsx` already computes `monthlySavings` from `totalCost / monthsRemaining` when a goal is created
3. The advisor pipeline (`src/lib/engine/advisor.ts`) has a well-defined sub-generator pattern (5 generators + point creep) that savings insights plug directly into
4. The `AdvisorInsightCategory` type already includes `"calendar"` as a precedent for adding a `"savings"` category
5. `BudgetBreakdown`, `MacroSummary`, and `CostEstimate` types already capture per-year costs that savings calculations need

**Primary recommendation:** Migrate the existing `SavingsGoal` type into Zustand persistence (linking to `UserGoal.id`), build a pure-function savings engine in `src/lib/engine/`, add SVG progress rings to the dashboard, and wire savings insights into the existing advisor pipeline.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.x | Savings state persistence | Already the storage layer; `hunt-planner-app-v2` store |
| React 19 | 19.x | Component rendering | Already used throughout |
| Tailwind CSS | 4.x | Styling + progress rings | Already the style system |
| Lucide React | latest | Icons (PiggyBank, TrendingUp) | Already used for budget icons |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Card | latest | Container for savings cards | Wrapping progress rings and stats |
| shadcn/ui Progress | latest | Linear progress bars (secondary) | Year-by-year breakdown if needed |
| AnimatedCounter | custom | Animated dollar amounts | Showing savings totals |

### Nothing New Needed
No new dependencies required. SVG progress rings are ~30 lines of custom code using SVG `<circle>` + `stroke-dashoffset`. The existing `src/components/ui/progress.tsx` (Radix-based) handles linear bars. Circular rings require custom SVG but are trivial.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    engine/
      savings-calculator.ts     # Pure functions: monthly target, funded date, traffic light
      advisor-savings.ts        # Advisor sub-generator: savings insights
    types/
      index.ts                  # Add SavingsGoal type + SavingsStatus
  components/
    budget/
      SavingsGoalCard.tsx       # REFACTOR existing file to read from Zustand
      SavingsProgressRing.tsx   # New: SVG circular progress ring component
      AnnualSpendForecast.tsx   # New: summarizes all upcoming hunt costs
    results/
      sections/
        HeroSummary.tsx         # Add savings summary stat
  app/
    (app)/
      budget/page.tsx           # Already imports SavingsGoalsSection
      dashboard/page.tsx        # Add savings progress rings per goal
```

### Pattern 1: Savings Data Model (linked to UserGoal)

**What:** Each savings goal is linked 1:1 with a `UserGoal` via `goalId`. The target cost derives from milestones; the user only inputs `currentSaved` and `monthlySavings`.

**When to use:** Always -- SAV-02 requires each savings goal be linked to a specific UserGoal.

**Example:**
```typescript
// In src/lib/types/index.ts
export type SavingsStatus = "green" | "amber" | "red";

export interface SavingsGoal {
  id: string;
  goalId: string;              // Links to UserGoal.id (SAV-02)
  targetCost: number;          // Derived from milestone costs
  currentSaved: number;        // User-input running total
  monthlySavings: number;      // User-set monthly contribution
  contributions: SavingsContribution[]; // Audit trail
  createdAt: string;
  updatedAt: string;
}

export interface SavingsContribution {
  amount: number;
  date: string;                // ISO date
  note?: string;               // "February deposit", "Tax refund bonus"
}
```

### Pattern 2: Pure Savings Calculator Engine

**What:** All savings math lives in a single pure-function module. No React, no store access, no side effects.

**When to use:** For every calculation -- monthly targets (SAV-03), funded date projections (SAV-04), traffic light status (SAV-05).

**Example:**
```typescript
// src/lib/engine/savings-calculator.ts

import type { SavingsGoal, SavingsStatus, UserGoal, Milestone } from "@/lib/types";

/**
 * SAV-03: Monthly savings target = target cost / months remaining
 * Exact arithmetic -- no rounding until display.
 */
export function calculateMonthlySavingsTarget(
  targetCost: number,
  targetDate: Date,
  currentSaved: number,
  now: Date = new Date(),
): number {
  const remaining = targetCost - currentSaved;
  if (remaining <= 0) return 0;

  const msRemaining = targetDate.getTime() - now.getTime();
  const monthsRemaining = Math.max(1, msRemaining / (1000 * 60 * 60 * 24 * 30.44));
  return remaining / monthsRemaining;
}

/**
 * SAV-04: Projected funded date at current contribution rate.
 * Returns null if monthlySavings is 0 (will never be funded).
 */
export function calculateFundedDate(
  targetCost: number,
  currentSaved: number,
  monthlySavings: number,
  now: Date = new Date(),
): Date | null {
  const remaining = targetCost - currentSaved;
  if (remaining <= 0) return now; // already funded
  if (monthlySavings <= 0) return null; // never funded

  const monthsNeeded = Math.ceil(remaining / monthlySavings);
  const funded = new Date(now);
  funded.setMonth(funded.getMonth() + monthsNeeded);
  return funded;
}

/**
 * SAV-05: Traffic light status.
 * Green: funded date <= target date (on track or ahead)
 * Amber: funded date is 1-3 months after target date (behind but recoverable)
 * Red: funded date is >3 months after target date OR monthlySavings = 0
 */
export function calculateSavingsStatus(
  targetCost: number,
  currentSaved: number,
  monthlySavings: number,
  targetDate: Date,
  now: Date = new Date(),
): SavingsStatus {
  if (currentSaved >= targetCost) return "green";

  const fundedDate = calculateFundedDate(targetCost, currentSaved, monthlySavings, now);
  if (!fundedDate) return "red";

  const diffMs = fundedDate.getTime() - targetDate.getTime();
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);

  if (diffMonths <= 0) return "green";
  if (diffMonths <= 3) return "amber";
  return "red";
}

/**
 * SAV-03: Derive target cost from a UserGoal's milestones.
 * This is the TOTAL cost to execute the hunt, not the annual point cost.
 */
export function deriveTargetCost(
  milestones: Milestone[],
  goalId: string,
): number {
  return milestones
    .filter((m) => m.planId === goalId)
    .reduce((sum, m) => sum + m.totalCost, 0);
}

/**
 * SAV-05: Calculate the delta to get back on track.
 * Returns extra monthly amount needed to catch up.
 */
export function calculateCatchUpDelta(
  targetCost: number,
  currentSaved: number,
  currentMonthlySavings: number,
  targetDate: Date,
  now: Date = new Date(),
): number {
  const neededTarget = calculateMonthlySavingsTarget(
    targetCost, targetDate, currentSaved, now
  );
  return Math.max(0, neededTarget - currentMonthlySavings);
}
```

### Pattern 3: SVG Progress Ring (no library needed)

**What:** A lightweight SVG circular progress indicator using `stroke-dasharray` and `stroke-dashoffset`. Matches the dark theme with oklch colors.

**When to use:** SAV-01 requires progress rings per hunt goal on the dashboard.

**Example:**
```typescript
// src/components/budget/SavingsProgressRing.tsx
"use client";

import type { SavingsStatus } from "@/lib/types";

interface SavingsProgressRingProps {
  percent: number;          // 0-100
  status: SavingsStatus;    // green/amber/red
  size?: number;            // px, default 64
  strokeWidth?: number;     // px, default 4
  children?: React.ReactNode; // Center content (e.g., dollar amount)
}

const STATUS_COLORS: Record<SavingsStatus, string> = {
  green: "stroke-chart-2",    // emerald/green -- matches existing on-track styling
  amber: "stroke-chart-4",    // amber/orange -- matches existing warning styling
  red: "stroke-destructive",  // red -- matches existing critical styling
};

export function SavingsProgressRing({
  percent,
  status,
  size = 64,
  strokeWidth = 4,
  children,
}: SavingsProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={STATUS_COLORS[status]}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: "stroke-dashoffset 0.5s ease-out",
          }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
```

### Pattern 4: Advisor Savings Sub-Generator

**What:** A new sub-generator function plugged into the existing `generateAdvisorInsights` pipeline. Produces savings-specific insights with specific dollar amounts.

**When to use:** SAV-06 requires advisor voice integration for savings guidance.

**Example:**
```typescript
// src/lib/engine/advisor-savings.ts

import type { AdvisorInsight } from "@/lib/types";
import type { SavingsGoal } from "@/lib/types";
import { calculateSavingsStatus, calculateCatchUpDelta, calculateFundedDate } from "./savings-calculator";
import { STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName } from "@/lib/utils";

/**
 * Generate savings-specific advisor insights.
 * Cap at 2 insights (most critical first).
 */
export function generateSavingsInsights(
  savingsGoals: SavingsGoal[],
  userGoals: import("@/lib/types").UserGoal[],
  milestones: import("@/lib/types").Milestone[],
): AdvisorInsight[] {
  const insights: AdvisorInsight[] = [];

  for (const sg of savingsGoals) {
    const goal = userGoals.find((g) => g.id === sg.goalId);
    if (!goal) continue;

    const stateLabel = STATES_MAP[goal.stateId]?.abbreviation ?? goal.stateId;
    const speciesLabel = formatSpeciesName(goal.speciesId);
    const status = calculateSavingsStatus(
      sg.targetCost,
      sg.currentSaved,
      sg.monthlySavings,
      new Date(`${goal.targetYear}-09-01`), // target date = fall of target year
    );

    if (status === "red") {
      const deficit = sg.targetCost - sg.currentSaved;
      const delta = calculateCatchUpDelta(
        sg.targetCost, sg.currentSaved, sg.monthlySavings,
        new Date(`${goal.targetYear}-09-01`),
      );

      insights.push({
        id: `savings-behind-${sg.goalId}`,
        signal: { type: "critical", message: `${stateLabel} ${speciesLabel} fund significantly behind` },
        category: "savings" as any, // Will be added to AdvisorInsightCategory
        urgency: "soon",
        interpretation: `You're $${deficit.toLocaleString()} behind on your ${stateLabel} ${speciesLabel} fund -- increase by $${Math.ceil(delta)}/mo to get back on track.`,
        recommendation: `Adjust your monthly savings from $${sg.monthlySavings} to $${Math.ceil(sg.monthlySavings + delta)} to meet your ${goal.targetYear} target.`,
        cta: { label: "Update Savings", href: "/budget" },
        portfolioContext: `$${sg.currentSaved.toLocaleString()} of $${sg.targetCost.toLocaleString()} saved`,
      });
    } else if (status === "amber") {
      const delta = calculateCatchUpDelta(
        sg.targetCost, sg.currentSaved, sg.monthlySavings,
        new Date(`${goal.targetYear}-09-01`),
      );

      insights.push({
        id: `savings-warning-${sg.goalId}`,
        signal: { type: "warning", message: `${stateLabel} ${speciesLabel} fund slightly behind` },
        category: "savings" as any,
        urgency: "informational",
        interpretation: `Your ${stateLabel} ${speciesLabel} fund is slightly behind -- $${Math.ceil(delta)} extra per month closes the gap.`,
        recommendation: `Small adjustment: increase monthly savings by $${Math.ceil(delta)} to stay on track for ${goal.targetYear}.`,
        cta: { label: "View Savings", href: "/budget" },
        portfolioContext: `$${sg.currentSaved.toLocaleString()} of $${sg.targetCost.toLocaleString()} saved`,
      });
    }
    // Green = no insight needed (positive silence)
  }

  // Sort by severity (red first)
  insights.sort((a, b) => {
    const order = { critical: 0, warning: 1, positive: 2 };
    return (order[a.signal.type] ?? 3) - (order[b.signal.type] ?? 3);
  });

  return insights.slice(0, 2);
}
```

### Pattern 5: Zustand Store Extension (in AppState)

**What:** Add `savingsGoals: SavingsGoal[]` and CRUD actions to the existing `AppState` in `src/lib/store.ts`. Persisted under `hunt-planner-app-v2`.

**When to use:** All savings data must persist across sessions.

**Example:**
```typescript
// Addition to AppState interface in store.ts
savingsGoals: SavingsGoal[];
addSavingsGoal: (goal: SavingsGoal) => void;
updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void;
removeSavingsGoal: (id: string) => void;
addContribution: (goalId: string, amount: number, note?: string) => void;
```

### Anti-Patterns to Avoid

- **Ephemeral savings state:** The existing `SavingsGoalCard.tsx` uses `useState` -- savings data MUST be in Zustand to survive page navigation and browser refreshes. This is the primary bug in the current implementation.
- **Duplicating cost calculations:** Target costs should derive from `milestones` linked to the `UserGoal`, not be manually entered. The existing `deriveTargetCost` pattern (sum milestones by `planId`) is the right approach.
- **Generic advisor messages:** SAV-06 explicitly requires specific dollar amounts in advisor commentary ("$400 behind", "$50/mo to catch up"), not vague "you're behind" messages.
- **Monthly savings as derived-only:** The user should be able to SET their monthly contribution rate (it reflects their real savings plan), while the REQUIRED rate is calculated. The delta between these is what drives traffic light status.
- **Circular progress libraries:** Don't install `react-circular-progressbar` or similar packages. The SVG is ~30 lines and avoids a dependency.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Monthly target math | Custom rounding logic | `calculateMonthlySavingsTarget()` pure fn | Edge cases: 0 months left, already funded, $0 target |
| Target cost derivation | Manual cost entry | Sum of `milestones.filter(m => m.planId === goalId)` | Costs already computed by `generateMilestonesForGoal` |
| Traffic light thresholds | Ad-hoc if/else | `calculateSavingsStatus()` with configurable thresholds | Must be consistent across dashboard, advisor, and budget page |
| Advisor voice format | String templates everywhere | Advisor sub-generator pattern (like `generateDeadlineInsights`) | Priority, urgency sorting, cap at N, CTA generation |
| State/species labels | Inline string formatting | Existing `STATES_MAP[id].abbreviation` + `formatSpeciesName(id)` | Already used consistently in 20+ places |
| Cost line items | Flat numbers | Existing `CostLineItem[]` type with category/label/amount | Maintains transparency, matches existing budget breakdown UI |

**Key insight:** The savings calculator is pure arithmetic but has deceptively tricky edge cases: goals with $0 remaining, goals funded past 100%, goals with $0 monthly contribution (red status immediately), and target dates in the past. All edge cases must return sensible values, not NaN or Infinity.

## Common Pitfalls

### Pitfall 1: Zustand Persist Key Bump
**What goes wrong:** Adding `savingsGoals` to AppState without considering migration from existing persisted state.
**Why it happens:** Zustand persist deserializes the old state which won't have `savingsGoals`, so it stays `undefined` instead of `[]`.
**How to avoid:** Set default value `savingsGoals: []` in the initial state object. Zustand's persist middleware shallow-merges, so new fields with defaults work without a key bump. Do NOT bump the persist key (`hunt-planner-app-v2`).
**Warning signs:** `TypeError: cannot read property 'map' of undefined` on savings array.

### Pitfall 2: Division by Zero in Monthly Target
**What goes wrong:** `targetCost / 0` when months remaining rounds to 0, or `remaining / monthlySavings` when monthly is 0.
**Why it happens:** User has target date in current month, or hasn't set monthly savings yet.
**How to avoid:** Use `Math.max(1, ...)` for months remaining. Return `null` for funded date when monthlySavings is 0. Return 0 for monthly target when already fully funded.
**Warning signs:** NaN or Infinity showing in UI.

### Pitfall 3: Stale Derived Target Costs
**What goes wrong:** User updates a goal (changes state or year), milestones regenerate, but savings target cost stays stale.
**Why it happens:** `targetCost` was captured at savings goal creation time and never recomputed.
**How to avoid:** Either: (a) recompute `targetCost` on every render from milestones, or (b) update savings goal target cost whenever `updateUserGoal` fires. Option (a) is simpler and more robust -- use `useMemo` that re-derives cost from current milestones.
**Warning signs:** Dashboard shows 100% funded when costs actually increased.

### Pitfall 4: Advisor Pipeline Ordering
**What goes wrong:** Savings insights push out deadline insights due to the MAX_VISIBLE_INSIGHTS cap (7).
**Why it happens:** Savings insights are added but urgency sorting puts them above more important deadlines.
**How to avoid:** Give savings insights `urgency: "informational"` for amber and `urgency: "soon"` for red. Never `"immediate"` -- deadline and discipline insights should always rank higher.
**Warning signs:** User misses a deadline because the advisor was talking about savings.

### Pitfall 5: Progress Ring Rendering on SSR
**What goes wrong:** SVG stroke-dashoffset renders incorrectly on server, then "jumps" on hydration.
**Why it happens:** The transition CSS only kicks in after hydration.
**How to avoid:** Mark the SavingsProgressRing component as `"use client"`. Set initial offset to full circumference (empty ring) and let the transition animate in on mount.
**Warning signs:** Flash of full ring then animated shrink.

### Pitfall 6: Ephemeral State in Existing SavingsGoalCard
**What goes wrong:** User adds a savings goal, navigates away, comes back -- it's gone.
**Why it happens:** Current `SavingsGoalCard.tsx` stores goals in `useState`, not Zustand.
**How to avoid:** Migrate to `useAppStore` for savings state. This is the CORE change in 08-01.
**Warning signs:** Already happening in the current codebase. This phase fixes it.

## Code Examples

### SVG Progress Ring Integration on Dashboard

```typescript
// In dashboard/page.tsx or a dedicated savings summary component
const { savingsGoals } = useAppStore();
const { userGoals, milestones } = useAppStore();

// Derive savings summary per goal
const savingsSummary = useMemo(() => {
  return savingsGoals.map((sg) => {
    const goal = userGoals.find((g) => g.id === sg.goalId);
    const targetCost = deriveTargetCost(milestones, sg.goalId);
    const pct = targetCost > 0 ? Math.min(100, (sg.currentSaved / targetCost) * 100) : 0;
    const status = calculateSavingsStatus(
      targetCost,
      sg.currentSaved,
      sg.monthlySavings,
      new Date(`${goal?.targetYear ?? 2030}-09-01`),
    );
    return { ...sg, goal, targetCost, pct, status };
  });
}, [savingsGoals, userGoals, milestones]);

// Render:
{savingsSummary.map((s) => (
  <div key={s.id} className="flex items-center gap-3">
    <SavingsProgressRing percent={s.pct} status={s.status} size={56}>
      <span className="text-[10px] font-bold">{Math.round(s.pct)}%</span>
    </SavingsProgressRing>
    <div>
      <p className="text-sm font-medium">{s.goal?.title}</p>
      <p className="text-xs text-muted-foreground">
        ${s.currentSaved.toLocaleString()} / ${s.targetCost.toLocaleString()}
      </p>
    </div>
  </div>
))}
```

### Annual Spend Forecast (SAV-07)

```typescript
// src/lib/engine/savings-calculator.ts

export interface AnnualSpendForecast {
  year: number;
  items: { goalTitle: string; stateId: string; speciesId: string; cost: number }[];
  totalCost: number;
}

/**
 * SAV-07: Summarize all upcoming hunt costs by year.
 * Uses milestones as the source of truth for costs.
 */
export function calculateAnnualSpendForecast(
  userGoals: UserGoal[],
  milestones: Milestone[],
  yearsAhead: number = 5,
): AnnualSpendForecast[] {
  const currentYear = new Date().getFullYear();
  const forecasts: AnnualSpendForecast[] = [];

  for (let i = 0; i < yearsAhead; i++) {
    const year = currentYear + i;
    const yearMs = milestones.filter((m) => m.year === year && !m.completed);
    const items = yearMs.map((m) => {
      const goal = userGoals.find((g) => g.id === m.planId);
      return {
        goalTitle: goal?.title ?? m.title,
        stateId: m.stateId,
        speciesId: m.speciesId,
        cost: m.totalCost,
      };
    });
    forecasts.push({
      year,
      items,
      totalCost: items.reduce((s, it) => s + it.cost, 0),
    });
  }

  return forecasts;
}
```

### Wiring Savings into Advisor Pipeline

```typescript
// In advisor.ts generateAdvisorInsights() -- add after creepInsights:
import { generateSavingsInsights } from "./advisor-savings";

// Inside the function, after existing generators:
const savingsInsights = generateSavingsInsights(savingsGoals, userGoals, milestones);

// Add to the flattened array:
const all: AdvisorInsight[] = [
  ...deadlineInsights,
  ...portfolioInsights,
  ...disciplineInsights,
  ...temporalInsights,
  ...milestoneInsights,
  ...creepInsights,
  ...savingsInsights,  // NEW
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useState` savings goals (ephemeral) | Zustand persist (durable) | This phase | Data survives navigation and refresh |
| Manual target cost entry | Derived from milestones | This phase | Costs auto-update when goals change |
| No savings advisor voice | Sub-generator in advisor pipeline | This phase | Specific $ guidance per fund |
| Flat progress bars only | SVG circular progress rings | This phase | At-a-glance percent funded per goal |
| No traffic light system | Green/amber/red status | This phase | Immediate visual triage |

**Deprecated/outdated:**
- `SavingsGoalCard.tsx` current implementation: Must be refactored. The `SavingsGoal` interface defined locally should move to `types/index.ts` and the `useState` storage must become Zustand actions.

## Integration Points (Critical)

### Where Savings Touches Existing Code

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/types/index.ts` | ADD types | `SavingsGoal`, `SavingsContribution`, `SavingsStatus`, extend `AdvisorInsightCategory` |
| `src/lib/store.ts` (AppState) | ADD slice | `savingsGoals[]`, CRUD actions, `addContribution()` |
| `src/lib/engine/advisor.ts` | EXTEND pipeline | Import savings sub-generator, add to `all[]` array |
| `src/components/budget/SavingsGoalCard.tsx` | REFACTOR | Replace `useState` with `useAppStore`, derive target from milestones |
| `src/app/(app)/dashboard/page.tsx` | ADD section | Savings progress rings per goal |
| `src/app/(app)/budget/page.tsx` | Already wired | Already imports `SavingsGoalsSection` |
| `src/components/advisor/AdvisorCard.tsx` | ADD icon | Add `savings` -> `PiggyBank` to `CATEGORY_ICONS` |

### Data Flow

```
UserGoal (state/species/targetYear)
  -> generateMilestonesForGoal() -> Milestone[] (with costs)
    -> deriveTargetCost(milestones, goalId) -> number
      -> SavingsGoal { goalId, targetCost, currentSaved, monthlySavings }
        -> calculateSavingsStatus() -> "green" | "amber" | "red"
        -> calculateFundedDate() -> Date | null
        -> calculateMonthlySavingsTarget() -> number
        -> generateSavingsInsights() -> AdvisorInsight[]
          -> generateAdvisorInsights() -> prioritized insights
```

## Open Questions

1. **Should `targetCost` be stored or always derived?**
   - What we know: Milestones already store itemized costs. `deriveTargetCost()` sums them.
   - What's unclear: If user edits goal, milestones regenerate, but the stored `targetCost` on the savings goal would be stale.
   - Recommendation: Always derive target cost from milestones in the component/calculator. Do NOT store it on the `SavingsGoal` type. Store only `goalId`, `currentSaved`, `monthlySavings`, and `contributions`.

2. **Where do savings progress rings appear -- dashboard only or also goals page?**
   - What we know: SAV-01 says "per hunt goal on dashboard". The goals page already shows milestones.
   - What's unclear: Whether the goals page should also show savings rings.
   - Recommendation: Dashboard gets rings (primary surface per SAV-01). Budget page gets the detailed savings management (already wired). Goals page is optional/deferred.

3. **Auto-create savings goals from plan confirmation?**
   - What we know: `GoalConfirmation` already computes `monthlySavings`. When a plan is confirmed, goals and milestones are created.
   - What's unclear: Should savings goals auto-create at plan confirmation, or should users manually activate them?
   - Recommendation: Auto-suggest (like the existing `suggestedSavings` pattern in `SavingsGoalCard.tsx`) but require user to explicitly activate. Avoids cluttering the dashboard with unwanted savings trackers.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of `src/lib/store.ts`, `src/lib/types/index.ts`, `src/lib/engine/advisor.ts`, `src/components/budget/SavingsGoalCard.tsx`, `src/components/budget/AnnualBudgetPlanner.tsx`, `src/components/goals/GoalConfirmation.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/budget/page.tsx`
- Zustand persist middleware behavior verified from existing store patterns
- Advisor pipeline architecture verified from 5 existing sub-generators

### Secondary (MEDIUM confidence)
- [SVG circular progress ring technique](https://blog.logrocket.com/build-svg-circular-progress-component-react-hooks/) - standard stroke-dasharray/offset approach
- [Tailwind CSS radial progress patterns](https://gist.github.com/eYinka/873be69fae3ef27b103681b8a9f5e379) - Tailwind-compatible SVG styling

### Tertiary (LOW confidence)
- None. All recommendations are grounded in the existing codebase patterns.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all patterns exist in codebase
- Architecture: HIGH - follows exact patterns from Phase 5 advisor voice + existing budget components
- Pitfalls: HIGH - identified from actual bugs in current `SavingsGoalCard.tsx` (ephemeral state)
- Engine: HIGH - pure function pattern matches all existing engine modules
- Advisor integration: HIGH - sub-generator pattern used 6 times already

**Research date:** 2026-02-22
**Valid until:** 2026-04-22 (stable domain, no external API dependencies)
