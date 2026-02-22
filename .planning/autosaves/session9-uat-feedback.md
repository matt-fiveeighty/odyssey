# Session 9: UAT Feedback — Results Page & Shared Plan

**Date:** 2026-02-22
**Context:** User completed wizard, reviewed results page end-to-end, tested share flow
**Status:** Captured — not yet addressed. These are pre-existing results page polish items + shared page improvements.

## Results Page Issues

### 1. Age Input Bug
- **Where:** Wizard step (age input)
- **Issue:** User types `3` but `8` appears
- **Severity:** Bug — input handling issue
- **Files:** Likely in consultation step component for age

### 2. Dream Hunt Query Evaluation
- **Where:** Dream hunt text input → results
- **Issue:** User typed "I want a crust 6x6 bull" — unclear if/how this influenced recommendations
- **What to do:** Show the user their input was heard and factored in. Tie back in point strategy ("targeting trophy elk aligns with your 6x6 bull goal"), surface in unit recommendations, reference in advisor voice
- **Severity:** Product — makes the app feel like it truly listened
- **Note from user:** "the throw in the crusty bull was a point of reference not a mandate for this location but shows that the app truly took into account everything"

### 3. Floating Point Rounding
- **Where:** State chips in What-If Modeler, state cards
- **Issue:** Colorado shows `$134.54000000000002/yr` instead of `$134.54/yr`
- **What to do:** Round all currency displays to 2 decimal places
- **Severity:** Bug — visual

### 4. Financial Breakdown
- **Where:** 10-year total, inflation total, budget breakdown
- **Issues:**
  - Prices don't add up to the displayed total (or needs scrollable breakdown)
  - Consider a **hover breakdown** showing how the total is calculated
  - Inflation rate seems excessive — add asterisk: "*Based on historical CPI average"
  - Allocation percentages are unclear — what are they a percentage of? Make clear or omit
- **Severity:** UX — clarity

### 5. What-If Modeler
- **Where:** What-If Modeler section
- **Issues:**
  - Sort states by **price order** (not current arbitrary order)
  - When adding/removing states, show **TL;DR or 3-column grid**: what you gain, what you lose, tradeoffs
  - E.g., "If you drop Colorado you're trading X, Y but gaining Z"
- **Severity:** Product — decision support

### 6. State Card — Description Truncation
- **Where:** State recommendation cards, description text
- **Issue:** "More context" text is truncated and can't scroll
- **What to do:** Make scrollable or fully expandable
- **Severity:** UX — content access

### 7. Score Breakdown Bars
- **Where:** Score breakdown within state cards
- **Issues:**
  - "Terrain & Factors" label doesn't fit within bounding area
  - Explanation text truncated (e.g., "6,000-11,000 ft range — fle...")
  - Need more visual **hierarchy** — bolding for key terms
  - Add **color/context for newbies** (e.g., explain PP001 in layman's terms, and the benefit)
- **Severity:** UX — readability, accessibility

### 8. Point Strategy Section
- **Where:** Point strategy text in state cards
- **Issue:** Mentions PP001 without explaining what it is
- **What to do:** Explain in plain English — "PP001 = point-only code, meaning [explanation]. The benefit: [benefit]"
- **Severity:** Product — accessibility for new hunters

### 9. Recommended Units Layout
- **Where:** Recommended units within state cards
- **Issues:**
  - Convert to **column layout with expanding boxes** to consolidate UI
  - Add **typical points to draw** for each unit
  - Show draw range more clearly
- **Severity:** UX — information density

### 10. Point Creep Section
- **Where:** Point creep forecast
- **Issues:**
  - Add expandable **"What is point creep?"** explainer
  - Explain **why** a specific year is recommended — show the analysis
  - Include strategic advice: "draw CO every 2-3 years to maintain flex" (or whatever engine logic determines)
  - Tie back to dream hunt: "throw in for that trophy bull you want in Year 8"
- **Severity:** Product — strategic depth

### 11. Apply All Above to ALL States
- Not just Colorado — every state card needs these improvements

### 12. Action Plan Calendar
- **Where:** Goals/Action Plan page, month-by-month view
- **Issue:** All months expand at once, making the page very long
- **What to do:** Only show month detail for the **selected month**. Click a month card to reveal its details. One at a time.
- **Severity:** UX — page length, focus

### 13. Hunt Year Timeline
- **Where:** Timeline/roadmap years
- **Issue:** Terminology not accessible to newbies
- **What to do:** Be more descriptive — explain what each year type means, what actions look like
- **Severity:** Product — onboarding

## Shared Page Issues

### 14. Share Button Placement
- **Where:** Currently only in pre-confirm results action bar
- **Issue:** Too niche — only accessible at one moment in the flow
- **What to do:** Add share button to **multiple touchpoints**: Goals dashboard, confirmed plan view, etc.
- **Severity:** Product — discoverability

### 15. Shared Page UX
- **Where:** SharedResultsShell.tsx
- **Issues:**
  - Show the **person's name** (or profile summary) prominently at top
  - Show **"as of [date]"** — when snapshot was created
  - Think about **hierarchy** — lead with the hook (species, states, cost summary)
  - More **visual** — should feel like a polished report, not developer output
  - Consider what gets **moved down** or collapsed
  - Make it **export-friendly** — something you'd text to a hunting buddy with pride
- **Severity:** Product — first impressions

## Technical Issues Found During Testing

### 16. Middleware Blocking Share Routes (FIXED)
- **Root cause:** Supabase auth middleware intercepted `/api/share` and `/shared/[token]`, causing hangs
- **Fix:** Excluded both paths from middleware matcher
- **Commit:** 85b016c

### 17. Dev Cache Not Shared Across Workers (FIXED)
- **Root cause:** In-memory Map not shared between Turbopack API route workers and page rendering workers
- **Fix:** globalThis-attached Map store as dev fallback
- **Commit:** 85b016c

### 18. Port Conflict (FIXED)
- **Root cause:** Old dev server process squatting on port 3000, new server started on 3001
- **Fix:** Killed old processes, restarted cleanly

## Priority Ranking

**Bugs (fix first):**
1. Age input bug (#1)
2. Floating point rounding (#3)

**High-impact product (address in polish pass):**
3. Dream hunt evaluation visibility (#2)
4. Point creep explainer + strategic advice (#10)
5. Shared page UX overhaul (#15)
6. Share button in multiple touchpoints (#14)

**UX polish (batch together):**
7. Financial breakdown clarity (#4)
8. What-If Modeler sorting + tradeoff grid (#5)
9. State card description scrolling (#6)
10. Score breakdown readability (#7)
11. PP001 plain English (#8)
12. Unit layout consolidation (#9)
13. Action plan calendar single-month expand (#12)
14. Hunt year timeline descriptions (#13)
