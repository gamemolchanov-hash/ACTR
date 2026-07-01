---
phase: quick-260701-unn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ProductCard.tsx
autonomous: true
requirements:
  - QUICK-UI-BADGE
must_haves:
  truths:
    - "Best Seller chip overlays the top-left corner of the product image and no longer occupies vertical flow space"
    - "A card that renders the badge has the same rendered height as a card that does not (available > 0 false)"
    - "The chip's visual styling (icon, border, radius, padding, font, colors) is byte-for-byte identical to before the change"
  artifacts:
    - "src/components/ProductCard.tsx"
  key_links:
    - "Badge Box is a direct child of the Card element (position: relative) so its position: absolute resolves against the Card, not the Link or CardContent"
---

<objective>
Convert the "Best Seller" chip in `src/components/ProductCard.tsx` from an in-flow block rendered ABOVE the product image (inside `<Link>`, adding ~39px of top height via `px: 2, pt: 1.5`) into an absolute-positioned overlay on the top-left of the image, so it no longer contributes to card height. Cards with and without the badge will then render at equal heights inside the CSS grid.

Purpose: Fix unequal card heights in the catalog grid without any visual or behavioral change to the chip itself. Pure CSS-in-JS refactor — no API, state, data, or behavior changes. Preserves the american-creator.ru 1:1 design constraint.
Output: Updated `src/components/ProductCard.tsx` with the badge as an absolute overlay.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/ProductCard.tsx

# Current structure (verified against the file, lines 28-125):
# <Card position:relative overflow:hidden>
#   <Link>
#     {available > 0 && <OUTER Box px:2 pt:1.5> <INNER chip Box> ... </INNER> </OUTER>}   <-- badge to relocate
#     <Box>  {/* product image, aspectRatio 1/1 */} </Box>
#     <CardContent> {/* name */} </CardContent>
#   </Link>
#   <Box px:2 pb:2> {/* price + KDV + quantity + add-to-cart */} </Box>
# </Card>
#
# The Card already provides the positioning context: it has position: 'relative' and overflow: 'hidden'.
# Do NOT modify any Card-level sx props.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Make the Best Seller chip an absolute overlay, direct child of Card</name>
  <files>src/components/ProductCard.tsx</files>
  <action>
Relocate the entire `available > 0` chip block so it becomes a DIRECT child of the `<Card>` element: move it out of the `<Link>` and place it immediately after the `<Card ...>` opening tag, before the `<Link>` opens. It must be a sibling of the `<Link>`, NOT nested inside it — this ensures `position: absolute` resolves against the Card (which already has `position: 'relative'`), not against the Link or CardContent. Do NOT touch any Card-level sx props (leave `position: 'relative'` and `overflow: 'hidden'` as-is).

Collapse the two nested Boxes into a SINGLE Box. The former OUTER wrapper Box (the one with `display: 'flex'`, `alignItems: 'center'`, `gap: 0.5`, `px: 2`, `pt: 1.5`) is the source of the unwanted flow height — delete it entirely. Merge absolute-positioning props onto the surviving chip Box so the surviving Box carries BOTH the overlay positioning AND the existing chip styling. The surviving Box `sx` must be exactly: `position: 'absolute'`, `top: 12`, `left: 16`, `zIndex: 1`, `display: 'inline-flex'`, `alignItems: 'center'`, `gap: '6px'`, `border: \`1px solid ${palette.primaryLight}\``, `borderRadius: '40px'`, `px: 1.5`, `py: '4px'`, `bgcolor: 'white'`.

Preserve the chip's children unchanged: the `<img src="/icons/trending-topic.png" alt="" style={{ width: 17, height: 17 }} />` (17x17) followed by the `<Typography>` (fontFamily `"Futura PT", Helvetica, sans-serif`, fontSize 12, color `palette.primary`, lineHeight 1) rendering `{t('catalog.bestSeller')}`.

Keep the render condition `available > 0` exactly. The image Box, CardContent, and the price/actions Box below are unchanged. Note: moving the badge out of the `<Link>` means clicking the small badge no longer triggers navigation — this is the intended structure per spec (the badge sits above the image via zIndex; the image beneath remains the link target). No other markup changes.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    <automated>grep -c "position: 'absolute'" src/components/ProductCard.tsx  # expect 1 (the badge overlay)</automated>
    <automated>grep -q "top: 12" src/components/ProductCard.tsx && grep -q "left: 16" src/components/ProductCard.tsx && grep -q "zIndex: 1" src/components/ProductCard.tsx && echo OVERLAY_PROPS_PRESENT</automated>
    <human-check>Run `npm run dev` (port 3003), open the catalog grid. Confirm: (1) the Best Seller chip overlays the top-left corner of the product image; (2) a card WITH the badge is the same height as a card WITHOUT it (available > 0 false) — no extra top gap; (3) the chip's border, pill radius, icon, font, and colors look identical to before.</human-check>
  </verify>
  <done>
`npx tsc --noEmit` passes. The badge Box is a direct child of `<Card>` (sibling of `<Link>`) carrying `position: 'absolute'`, `top: 12`, `left: 16`, `zIndex: 1` plus the unchanged chip styling; the former `px: 2, pt: 1.5` wrapper Box is gone. The `available > 0` condition and all chip children are preserved. Cards render at equal heights regardless of badge presence.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

None introduced or changed. This is a presentational CSS-in-JS refactor of a single React component: no new inputs, no data flow, no network/auth surface, no dependency additions.

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-01 | Tampering | ProductCard.tsx markup | low | accept | Change is layout-only (sx props + JSX relocation); no user input, state, or data path touched. `npx tsc --noEmit` guards against malformed JSX/prop regressions. |
</threat_model>

<verification>
- `npx tsc --noEmit` passes (valid JSX/props, no type regressions).
- Exactly one `position: 'absolute'` in the file, on the badge Box, alongside `top: 12`, `left: 16`, `zIndex: 1`.
- Visual (dev server): badge overlays image top-left; badged and un-badged cards are equal height; chip styling unchanged.
</verification>

<success_criteria>
- Best Seller chip renders as an absolute overlay on the product image's top-left and adds zero vertical height to the card.
- Cards with and without the badge have identical rendered heights in the grid.
- Chip visual appearance (icon, border, radius, padding, font, colors, translated label) is unchanged.
- No API, state, or behavior changes; type check clean.
</success_criteria>

<output>
Create `.planning/quick/260701-unn-fix-best-seller-badge-in-src-components-/260701-unn-SUMMARY.md` when done.
</output>
