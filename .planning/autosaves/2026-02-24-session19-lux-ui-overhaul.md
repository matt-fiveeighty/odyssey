# Session 19 — Lux UI/UX Overhaul

**Date:** 2026-02-24
**Status:** All 6 phases COMPLETE
**Tests:** 255/255 passing, 0 TypeScript errors

---

## What Was Built

Premium "Rolex-level" UI/UX layer across the entire app — spring physics, glassmorphism, monospace financial typography, semantic glows, and above-the-fold command center architecture.

### Phase 1: Foundation (globals.css + new components)
- `.font-financial` — Geist Mono + tabular-nums for all dollar/point/odds data
- `.label-uppercase` — 10px uppercase letter-spaced muted labels
- Spring keyframes: `springSlideUp`, `springSlideDown`, `springScale`, `tickLand`
- Spring utility classes: `.spring-enter`, `.spring-exit`, `.spring-scale`, `.tick-land`
- Glassmorphism: `.glass-panel`, `.glass-panel-light`, `.glass-tooltip`
- Semantic glows: `.glow-success`, `.glow-equity`, `.glow-danger`, `.glow-burn-year`
- Skeleton shimmer: `.skeleton-shimmer`, `.skeleton-shimmer-metallic`
- Magnetic button CSS: `.magnetic-button`, `.magnetic-glow`
- Toggle pill CSS: `.toggle-pill-track`, `.toggle-pill-indicator`, `.toggle-pill-option`
- `prefers-reduced-motion` accessibility for all new animations

### Phase 2: Micro-Interactions
- **AnimatedCounter** — Added `financial` prop (auto font-financial), `tick-land` spring pulse on completion
- **MagneticButton** — NEW. Cursor-tracking 3px magnetic pull + radial neon-green glow
- **SegmentedToggle** — NEW. Sliding pill with spring overshoot, ResizeObserver auto-width
- **SkeletonShimmer** — NEW. KPIGridSkeleton, MapSkeleton with metallic shimmer sweep

### Phase 3: Bottom Sheet Spring Physics
- Rewrote MobileActionSheet with touch swipe velocity detection
- Spring CSS: `cubic-bezier(0.34, 1.56, 0.64, 1)` for overshoot-and-settle
- Rubber-band resistance (0.6 dampening), fast swipe (>0.5 px/ms) = dismiss
- 40% drag threshold for slow swipes

### Phase 4: Glassmorphism & Depth
- **RoadmapActionDetail** — Species photography background + glass-panel frosted overlay
- **DashboardCard** — Semantic glows on KPI tiles (danger/success/equity), burn year glow
- **InteractiveMap** — Glass tooltips, electric blue hover glow (blurred stroke behind main path)
- All financial values use `font-financial`, all labels use `label-uppercase`

### Phase 5: Above-the-Fold Command Center
- **Desktop**: DashboardCard grid changed to [2fr_3fr] for 40/60 KPI/map split
- **Mobile**: Condensed 2x2 KPI grid (Sunk, Floated, Portfolio, Milestone), secondary KPIs hidden
- **Mobile**: Map hidden from DashboardCard, available via SegmentedToggle
- **Mobile**: SegmentedToggle `[Action List | State Map]` switches between list and map
- **Skeleton**: KPIGridSkeleton + MapSkeleton shown while engine computes
- **YearPills**: Spring-animated active pill with `font-financial`

### Phase 6: Typography Sweep
- Applied `font-financial` to: KPIGrid, KPIStrip, HeroSummary, BurnRateMatrix, calculator, RoadmapActionList, StatusTicker, portfolio, GroupRoster
- Applied `label-uppercase` to: KPIGrid labels, KPIStrip labels, HeroSummary labels, BurnRateMatrix header

---

## Files Created (3)
- `src/components/shared/SkeletonShimmer.tsx`
- `src/components/shared/MagneticButton.tsx`
- `src/components/shared/SegmentedToggle.tsx`

## Files Modified (15+)
- `src/app/globals.css` — ~200 lines of Lux CSS foundation
- `src/components/shared/AnimatedCounter.tsx` — financial prop + tick-land
- `src/components/roadmap/dashboard/MobileActionSheet.tsx` — Full rewrite with spring physics
- `src/components/roadmap/dashboard/RoadmapActionDetail.tsx` — Glassmorphism header
- `src/components/roadmap/dashboard/DashboardCard.tsx` — Semantic glows, mobile responsive, className prop
- `src/components/journey/InteractiveMap.tsx` — Glass tooltip, blue glow, font-financial
- `src/app/(app)/roadmap/page.tsx` — Skeleton, SegmentedToggle, mobile map, conditional rendering
- `src/components/roadmap/dashboard/YearPills.tsx` — Spring pill, font-financial
- `src/components/kpi/KPIGrid.tsx` — font-financial, label-uppercase
- `src/components/results/dashboard/KPIStrip.tsx` — font-financial, label-uppercase
- `src/components/results/sections/HeroSummary.tsx` — font-financial, label-uppercase
- `src/components/results/dashboard/BurnRateMatrix.tsx` — font-financial, label-uppercase
- `src/components/results/dashboard/StatusTicker.tsx` — font-financial
- `src/components/roadmap/dashboard/RoadmapActionList.tsx` — font-financial
- `src/app/(app)/calculator/page.tsx` — font-financial
- `src/app/(app)/portfolio/page.tsx` — font-financial
- `src/components/groups/GroupRoster.tsx` — font-financial

## Key Design Decisions
- CSS-only spring physics (no framer-motion dependency) — `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Semantic glow via `::after` pseudo-elements with `radial-gradient` for soft edges
- Glass tooltip class shared between map and action detail
- Mobile 2x2 KPI grid shows only the 4 most actionable metrics
- SegmentedToggle eliminates need for a separate mobile map view page
- All animations respect `prefers-reduced-motion: reduce`
