# Session 12 — Global Fee Breakdown + Budget By-State + Calendar Exports

## Date: 2026-02-23

## What Was Done (8 files, +322 lines)

### Budget "Definite by State" Breakdown
1. **AnnualBudgetPlanner** — Definite bar now shows per-state breakdown underneath (license + app + point costs per state). If-Drawn bar shows per-state tag costs. State breakdown cards show first niche fact with Star icon.

### Fee Breakdowns Applied Globally
2. **PortfolioOverview (results)** — Each state allocation bar now shows license + species fee breakdown and first niche fact underneath.
3. **YearOneActionPlan (results)** — Each state group shows per-action fee breakdown (license · app · if drawn: tag).
4. **YearByYearBreakdown (budget)** — Each milestone in expanded year shows fee breakdown (license · app · point · if drawn: tag). State groups show niche facts.
5. **AnnualSpendForecast (budget)** — Each forecast item shows fee breakdown (license · app · point).
6. **TimelineRoadmap (results)** — Actions without pre-existing itemized costs get fee breakdown from state schedule (fallback for when action.costs is empty).

### Calendar Improvements
7. **CalendarSlot** — Added .ics export button (Download icon) on each slot that has a dueDate. Clicking downloads an ICS file for that deadline.
8. **SeasonCalendar** — Added "Export .ics" button in the header that exports all deadline/application slots as individual ICS files. Increased min cell height from 52px to 64px for consistent row heights across all calendars.

### Files Changed
- `src/components/budget/AnnualBudgetPlanner.tsx` — +76 lines (by-state Definite/If-Drawn breakdown, niche facts)
- `src/components/budget/AnnualSpendForecast.tsx` — +51/-15 lines (fee breakdown per item)
- `src/components/budget/YearByYearBreakdown.tsx` — +76/-27 lines (fee breakdown + niche facts)
- `src/components/results/sections/CalendarSlot.tsx` — +22 lines (.ics export button)
- `src/components/results/sections/PortfolioOverview.tsx` — +33 lines (fee breakdown + niche facts)
- `src/components/results/sections/SeasonCalendar.tsx` — +49 lines (Export .ics button, height fix)
- `src/components/results/sections/TimelineRoadmap.tsx` — +25 lines (fee breakdown fallback)
- `src/components/results/sections/YearOneActionPlan.tsx` — +39 lines (fee breakdown per action)

## Status
- Build: CLEAN
- TypeScript: CLEAN
- Committed: `1832e15` — "Add fee breakdowns globally + budget by-state + calendar exports"
- Pushed to GitHub: ✓ (auto-deploy should trigger on Vercel)
- Vercel CLI: Token expired, but git push triggers auto-deploy via GitHub integration

## Still Outstanding (from earlier feedback)
- Calendar shared/peer features (Outlook integration, shared calendars from peers, toggle multiple roadmaps) — major feature, needs multi-user infrastructure
- Vercel CLI token needs re-auth for direct deploys
