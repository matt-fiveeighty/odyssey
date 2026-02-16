# Hunt Planner — Comprehensive Site Audit Report

**Date:** February 15, 2026
**Auditor:** Claude (Senior Full-Stack Engineer / QA / DevOps)
**Stack:** Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS 4, shadcn/ui, Zustand
**Codebase:** 70 TypeScript files across 6 route pages + 9-step consultation wizard + results engine

---

## Executive Summary

The Hunt Planner app underwent a comprehensive 8-phase audit covering debug stability, functional QA, performance/SEO, security hardening, UI polish, accessibility (WCAG 2.1 AA), and code quality. **All issues found were fixed immediately during the audit.** The app now builds clean with zero errors and zero ESLint warnings.

### Key Metrics

| Metric | Before | After |
|--------|--------|-------|
| Build errors | 0 | 0 |
| ESLint errors | 1 | 0 |
| ESLint warnings | 24 | 0 |
| npm vulnerabilities | 0 | 0 |
| Unused dependencies | 3 (clerk, supabase, recharts) | 0 |
| Packages removed | — | 61 total |
| Security headers | 0 | 4 |
| ARIA violations | ~12 | 0 |
| Dead code instances | ~30 | 0 |

---

## Phase 1: Debug & Stabilize

### ESLint Error (Critical)
- **`react-hooks/set-state-in-effect`** in `plan-builder/page.tsx` — `setAssessment()` was called inside `useEffect`. Fixed by extracting a `getInitialAssessment()` function using `useWizardStore.getState()` (Zustand's synchronous API) and passing it as a lazy initializer to `useState`.

### ESLint Warnings (24 fixed)
Removed unused imports and variables across 8 files:
- `goals/page.tsx` — 5 unused lucide imports, unused `drawInfo` variable, unused `yearGoals` destructure
- `page.tsx` (dashboard) — unused `Check` import, unused `nextDeadline` variable
- `units/page.tsx` — unused `SlidersHorizontal`, `ChevronDown` imports
- `StepHuntingDNA.tsx` — unused `DollarSign`, `Clock` imports
- `StatePortfolio.tsx` — unused `CollapsibleSection`, `MapPin` imports, unused `idx` param
- `TimelineRoadmap.tsx` — unused `Calendar`, `DollarSign` imports
- `roadmap-generator.ts` — unused `Unit` import, unused `drawInfo` variable, unused `annualSubscription` parameter; also fixed `getStateDistance()` to properly use its `targetState` parameter

---

## Phase 2: Functional QA

### Bug Fixes
- **Success rate display bug** in `StatePortfolio.tsx` — was showing raw decimal (`0.22%`) instead of percentage (`22%`). Fixed: `{unit.successRate}%` → `{Math.round(unit.successRate * 100)}%`
- **Non-functional UI elements removed**: search bar and Bell notification in `header.tsx` (no backend), "Add Unit" button in `units/page.tsx` (no handler)

### Error Boundaries Added
- `src/app/error.tsx` — Route-level error boundary with retry + dashboard link
- `src/app/not-found.tsx` — Custom 404 with hunting-themed "Trail not found" messaging
- `src/app/global-error.tsx` — Root error boundary with inline styles (graceful degradation)
- `src/app/plan-builder/loading.tsx` — Skeleton loader for wizard
- `src/app/goals/loading.tsx` — Skeleton loader for goals

---

## Phase 3: Performance & SEO

### SEO Metadata
Enhanced `layout.tsx` with:
- Template-based page titles (`%s | Hunt Planner`)
- Comprehensive description and keywords
- OpenGraph metadata for social sharing
- Robots directive (`index: true, follow: true`)

### Bundle Size
- Removed 61 unused npm packages (Clerk auth, Supabase, Recharts)
- All pages prerendered as static content (zero server runtime)

### Dead Files
- Deleted empty `write_files.py` at project root

---

## Phase 4: Security & Hardening

### Security Headers (next.config.ts)
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Input Validation
- `StepAboutYou` homeCity: `maxLength={100}` + `.slice(0, 100)`
- `StepPaintThePicture` bucketListDescription: `maxLength={500}` + character counter
- `goals/page.tsx` goal title: `maxLength={100}`

### Dependency Audit
- `npm audit`: 0 vulnerabilities
- No `.env` files or exposed secrets
- No `dangerouslySetInnerHTML` usage anywhere
- Removed unused auth/DB dependencies (Clerk, Supabase) that expanded attack surface

---

## Phase 5: UI Polish & Design Craft

### Focus-Visible Styles
Added global keyboard focus ring:
```css
:focus-visible {
  outline: 2px solid oklch(0.65 0.18 145);
  outline-offset: 2px;
}
:focus:not(:focus-visible) {
  outline: none;
}
```

### Interactive Feedback
- `OptionCard` — added `active:scale-[0.98]` press feedback on unselected state
- `ToggleChip` — added `active:scale-[0.97]` press feedback

### Color Contrast
- Bumped `--muted-foreground` from `oklch(0.60)` to `oklch(0.63)` for improved readability at small text sizes while maintaining the dark hunting aesthetic

---

## Phase 6: Accessibility (WCAG 2.1 AA)

### ARIA Attributes Added
| Component | Attribute |
|-----------|-----------|
| `OptionCard` | `role="radio"`, `aria-checked`, `aria-label` |
| `ToggleChip` | `role="checkbox"`, `aria-checked` |
| `ResultsShell` tabs | `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` |
| `CollapsibleSection` | `aria-expanded` |
| Sidebar | `aria-label="Main navigation"` |
| Mobile nav | `aria-label="Mobile navigation"` |
| Goals modal | `role="dialog"`, `aria-modal`, `aria-labelledby` |
| Points modal | `role="dialog"`, `aria-modal`, `aria-labelledby` |

### Label Associations Fixed
| Input | File | Fix |
|-------|------|-----|
| Home state select | `StepAboutYou.tsx` | `htmlFor="home-state-select"` + `id` |
| Home city input | `StepAboutYou.tsx` | `htmlFor="home-city-input"` + `id` |
| Dream hunt textarea | `StepPaintThePicture.tsx` | `htmlFor="bucket-list-textarea"` + `id` |
| Point-year range | `StepLetsTalkMoney.tsx` | `htmlFor="point-year-budget"` + `id` |
| Hunt-year range | `StepLetsTalkMoney.tsx` | `htmlFor="hunt-year-budget"` + `id` |
| Units filter selects | `units/page.tsx` | `aria-label` on all 3 selects |

### Button Labels Added
| Button | File | Label |
|--------|------|-------|
| Milestone external link | `page.tsx` | `aria-label="Open {title}"` |
| Point +/- buttons | `StepPointPortfolio.tsx` | `aria-label="Increase/Decrease {species} points for {state}"` |
| Calculator +/- buttons | `calculator/page.tsx` | `aria-label="Increase/Decrease current/target points"` |
| Sidebar collapse | `sidebar.tsx` | Dynamic `aria-label` |

### Keyboard Navigation
- **Results tabs**: Added arrow key navigation per ARIA tabs pattern (Left/Right arrows cycle through tabs with proper focus management)

---

## Phase 7: Code Quality

### Duplicate Code Eliminated
Extracted identical `buildInput`/`buildPreviewInput` functions from `StepFineTune.tsx` and `StepHelpMeChoose.tsx` into a shared `src/lib/engine/build-consultation-input.ts` utility.

### TypeScript Configuration
- `"strict": true` — all strict checks enabled
- Zero `any` types in the codebase
- Zero type assertions (`as any`)

### ESLint Status
- 0 errors, 0 warnings
- 2 intentional `eslint-disable-next-line` comments for Zustand initialization patterns (documented)

### Dependencies Cleaned
| Removed Package | Reason |
|----------------|--------|
| `@clerk/nextjs` | Never imported — unused auth dependency |
| `@supabase/supabase-js` | Never imported — unused DB dependency |
| `recharts` | Installed but never imported — unused chart library |

---

## Files Modified (This Audit)

### Modified
- `next.config.ts` — security headers
- `package.json` — removed 3 unused dependencies
- `src/app/globals.css` — focus-visible styles, contrast bump
- `src/app/layout.tsx` — enhanced SEO metadata
- `src/app/page.tsx` — removed dead code, added aria-labels
- `src/app/calculator/page.tsx` — accessibility labels
- `src/app/goals/page.tsx` — removed unused imports, aria attributes
- `src/app/units/page.tsx` — removed dead UI, accessibility
- `src/app/plan-builder/page.tsx` — fixed setState-in-effect error
- `src/components/layout/header.tsx` — removed non-functional elements
- `src/components/layout/sidebar.tsx` — ARIA navigation label
- `src/components/layout/mobile-nav.tsx` — ARIA navigation label
- `src/components/consultation/shared/OptionCard.tsx` — ARIA + press feedback
- `src/components/consultation/shared/ToggleChip.tsx` — ARIA + press feedback
- `src/components/consultation/steps/StepAboutYou.tsx` — label associations
- `src/components/consultation/steps/StepLetsTalkMoney.tsx` — label associations
- `src/components/consultation/steps/StepPaintThePicture.tsx` — label association
- `src/components/consultation/steps/StepHuntingDNA.tsx` — removed unused imports
- `src/components/consultation/steps/StepHelpMeChoose.tsx` — extracted shared utility
- `src/components/consultation/steps/StepFineTune.tsx` — extracted shared utility
- `src/components/consultation/steps/StepPointPortfolio.tsx` — button labels
- `src/components/results/ResultsShell.tsx` — ARIA tabs + keyboard nav
- `src/components/results/sections/StatePortfolio.tsx` — fixed successRate bug
- `src/components/results/sections/TimelineRoadmap.tsx` — removed unused imports
- `src/components/results/shared/CollapsibleSection.tsx` — aria-expanded
- `src/lib/engine/roadmap-generator.ts` — fixed unused params, implemented getStateDistance

### Created
- `src/app/error.tsx` — route-level error boundary
- `src/app/not-found.tsx` — custom 404
- `src/app/global-error.tsx` — root error boundary
- `src/app/plan-builder/loading.tsx` — skeleton loader
- `src/app/goals/loading.tsx` — skeleton loader
- `src/lib/engine/build-consultation-input.ts` — shared utility (DRY)

### Deleted
- `write_files.py` — empty dead file

---

## Remaining Recommendations

1. **Add unit tests** for `scoreStateForHunter()` and `generateRoadmap()` — these are the highest-value test targets
2. **Add Sentry or similar** for production error tracking (the error boundary currently only logs to console)
3. **Consider lazy loading** the results sections — `StatePortfolio` and `TimelineRoadmap` could benefit from dynamic imports since they're behind a tab
4. **The `projectPointCreep` function** in `point-creep.ts` is defined but unused — it's a reasonable utility to keep for future chart/projection features
5. **Progressive image loading** — state images in `state-images.ts` reference gradient/placeholder patterns but actual images could benefit from blur-up loading when added

---

## Final State

```
Build:    PASS (0 errors)
ESLint:   PASS (0 errors, 0 warnings)
npm audit: 0 vulnerabilities
TypeScript: strict mode, 0 any types
Pages:    7 routes, all static prerendered
```
