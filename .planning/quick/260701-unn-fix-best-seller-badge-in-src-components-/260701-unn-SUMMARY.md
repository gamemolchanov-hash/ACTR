---
phase: quick-260701-unn
plan: 01
subsystem: ui
tags: [react, mui, next.js, css-in-js, product-card]

requires: []
provides:
  - Best Seller chip on ProductCard rendered as an absolute overlay (not in-flow), eliminating unequal card heights in the catalog grid
affects: [catalog, product-listing, ui]

tech-stack:
  added: []
  patterns:
    - "Overlay badges on cards are positioned absolute against the Card element directly (Card carries position: relative), not nested inside a flex-flow Link/CardContent wrapper"

key-files:
  created: []
  modified:
    - src/components/ProductCard.tsx

key-decisions:
  - "Badge Box moved out of <Link> to be a direct sibling child of <Card>, so position: absolute resolves against Card's existing position: relative"
  - "Collapsed two nested Boxes (flow wrapper + chip) into a single Box carrying both the absolute-overlay positioning and the original chip styling verbatim"

patterns-established:
  - "Overlay UI elements on a card must be direct children of the position:relative container, never nested inside an in-flow child (Link/CardContent) that would offset their absolute coordinates"

requirements-completed: [QUICK-UI-BADGE]

coverage:
  - id: D1
    description: "Best Seller chip renders as absolute overlay on top-left of product image, contributing zero vertical flow height"
    requirement: "QUICK-UI-BADGE"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
      - kind: other
        ref: "grep -c \"position: 'absolute'\" src/components/ProductCard.tsx == 1; grep top:12/left:16/zIndex:1 present"
        status: pass
      - kind: manual_procedural
        ref: "npm run dev (port 3003) visual check of catalog grid — badge overlay position, equal card heights, unchanged chip styling"
        status: unknown
    human_judgment: true
    rationale: "Automated checks (tsc + grep) prove the code structure and overlay props are correct, but the plan's done criteria explicitly require a human-check step in a running dev server to visually confirm no layout regression and no visual drift in the chip's appearance — this judgment call was not exercised in this non-interactive execution session."

duration: ~5min
completed: 2026-07-01
status: complete
---

# Quick Task 260701-unn: Best Seller Badge Overlay Fix Summary

**Best Seller chip on ProductCard.tsx converted from an in-flow block (39px extra height) to an absolute-positioned overlay on the top-left of the product image, equalizing card heights across the catalog grid.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-01T19:12:00Z (approx)
- **Completed:** 2026-07-01T19:13:04Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Relocated the `available > 0` Best Seller chip block from inside `<Link>` to a direct sibling child of `<Card>`, so `position: absolute` resolves against the Card (which already has `position: relative`)
- Collapsed the two nested wrapper Boxes into a single Box that carries both the new overlay positioning (`position: absolute, top: 12, left: 16, zIndex: 1`) and the pre-existing chip visual styling unchanged (border, radius, padding, background, icon, typography)
- Removed the former flow-height-contributing outer Box (`display: flex, px: 2, pt: 1.5`) entirely
- Preserved chip children exactly: 17x17 trending-topic icon + translated `catalog.bestSeller` label

## Task Commits

Each task was committed atomically:

1. **Task 1: Make the Best Seller chip an absolute overlay, direct child of Card** - `201f832` (fix)

**Plan metadata:** (docs commit handled by orchestrator, not this executor)

## Files Created/Modified
- `src/components/ProductCard.tsx` - Best Seller chip relocated out of `<Link>` to a `<Card>`-level absolute overlay; collapsed two nested Boxes into one

## Decisions Made
- Kept the badge outside `<Link>` per plan spec — clicking the small badge area no longer triggers navigation (image beneath remains the link target via zIndex layering). This is the intended structure, not a regression.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `npx tsc --noEmit` passes with no type errors.
- Exactly one `position: 'absolute'` present in the file, on the badge Box, alongside `top: 12`, `left: 16`, `zIndex: 1`.
- **Outstanding:** the plan's `<human-check>` verification step (visual confirmation via `npm run dev` on port 3003 that the badge overlays correctly, cards render equal height, and chip styling is visually unchanged) was not performed interactively in this execution session — recommend a quick visual pass before considering this fully closed.

---
*Phase: quick-260701-unn*
*Completed: 2026-07-01*

## Self-Check: PASSED
- FOUND: src/components/ProductCard.tsx
- FOUND: 201f832
