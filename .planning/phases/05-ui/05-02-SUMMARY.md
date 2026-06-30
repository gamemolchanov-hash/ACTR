---
phase: 05-ui
plan: "02"
subsystem: compliance-ui
tags: [kdv, vat, tr-compliance, i18n, tdd, product-card, product-detail, checkout]
dependency_graph:
  requires: [05-01]
  provides: [kdv-helper, price-kdv-labels, checkout-kdv-row]
  affects: [src/lib/kdv.ts, messages/en.json, messages/tr.json, ProductCard.tsx, ProductDetail.tsx, checkout/page.tsx]
tech_stack:
  added: []
  patterns: [TDD RED/GREEN, pure helper function, next-intl flat keys, server component with getTranslations]
key_files:
  created:
    - src/lib/kdv.ts
    - src/lib/kdv.test.ts
    - src/app/[locale]/legal/legal-config.ts
  modified:
    - messages/en.json
    - messages/tr.json
    - src/components/ProductCard.tsx
    - src/components/ProductDetail.tsx
    - src/app/[locale]/checkout/page.tsx
    - src/app/[locale]/legal/[slug]/page.tsx
    - src/app/[locale]/legal/legal-page.test.tsx
decisions:
  - "kdvAmount computed from subtotal (not finalTotal) — shows VAT on gross goods value, consistent with D-02 spec"
  - "useTranslations added to checkout/page.tsx for t('price.kdvLine') — page is under [locale] so NextIntlClientProvider is in scope"
  - "Legal page converted from 'use client' to async server component (getTranslations) — required to coexist with generateStaticParams in Next.js 14"
  - "LEGAL_SLUGS extracted to legal-config.ts — Next.js Page only allows generateStaticParams/generateMetadata/default as named exports"
metrics:
  duration: ~5min
  completed: 2026-06-30
  tasks: 3
  files: 9
---

# Phase 05 Plan 02: KDV Display Summary

**One-liner:** `kdvFromBrutto(gross, rate=0.20)` pure helper (TDD) + «KDV Dahil» label on product prices + informational «KDV (%20)» row in checkout Order Summary, satisfying COMP-01.

## What Was Built

### Task 1 (TDD): kdvFromBrutto helper + price.* i18n keys
- `src/lib/kdv.ts`: pure named export `kdvFromBrutto(gross, rate=0.20)` → `Math.round(gross - gross/(1+rate))`
- `src/lib/kdv.test.ts`: 4 vitest tests covering default 20% (1000→167), zero, custom 10% rate (1000→91), rate consistency
- TDD cycle: RED commit (stub returns 0, 2/4 fail) → GREEN commit (implementation, 4/4 pass)
- `messages/en.json` + `messages/tr.json`: appended `"price.kdvDahil": "KDV Dahil"` and `"price.kdvLine": "KDV (%20):"` (EN/TR parity, FLAT dotted keys)

### Task 2: «KDV Dahil» label on ProductCard + ProductDetail
- `ProductCard.tsx`: wrapped price in column `Box`, added 11px `palette.primaryLight` label `{t('price.kdvDahil')}` below price — no price value changed
- `ProductDetail.tsx`: added 12px `palette.primaryLight` label below price+perUnit row (`mt: 0.5`)
- Both files already had `useTranslations` and `t` — no new import needed

### Task 3: Informational KDV row in checkout Order Summary
- Imported `kdvFromBrutto` from `@/lib/kdv` and `useTranslations` from `next-intl`
- Added `const t = useTranslations()` to `CheckoutPage`
- Computed `const kdvAmount = kdvFromBrutto(subtotal)` with comment documenting informational-only intent
- Inserted `Stack` row after Subtotal, before Discount, using `c['40']` muted color + `info` style
- TOTAL computation is unchanged — `kdvAmount` only appears in the display row

## Commits

| Hash | Task | Description |
|------|------|-------------|
| 09689bd | Task 1 RED | test(05-ui-02): add failing tests for kdvFromBrutto |
| 3a25712 | Task 1 GREEN | feat(05-ui-02): implement kdvFromBrutto helper + price.* i18n keys |
| d27a143 | Task 2 | feat(05-ui-02): add KDV Dahil label to ProductCard + ProductDetail |
| e77c981 | Task 3 | feat(05-ui-02): add informational KDV line to checkout order summary |
| 6f55b18 | Deviation | fix(05-ui-02): resolve 'use client' + generateStaticParams conflict on legal page |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `'use client'` + `generateStaticParams()` conflict on legal page (pre-existing 05-01 regression)**
- **Found during:** Task 3 verification (`npm run build`)
- **Issue:** `src/app/[locale]/legal/[slug]/page.tsx` used both `'use client'` directive and exported `generateStaticParams()` — Next.js 14 prohibits this combination. Build failed with "Page cannot use both 'use client' and export function 'generateStaticParams()'".
- **Fix:**
  - Removed `'use client'` directive from the legal page
  - Converted to async server component using `getTranslations` from `next-intl/server` (instead of `useTranslations`)
  - Extracted `LEGAL_SLUGS`, `LegalSlug`, `SECTION_COUNT` to new `src/app/[locale]/legal/legal-config.ts` (Next.js Page only allows specific named exports)
  - Updated `legal-page.test.tsx` to import `LEGAL_SLUGS` from `legal-config` instead of `page`
- **Files modified:** `src/app/[locale]/legal/[slug]/page.tsx`, `src/app/[locale]/legal/legal-config.ts` (new), `src/app/[locale]/legal/legal-page.test.tsx`
- **Commit:** 6f55b18

## Known Stubs

None — all KDV functionality is complete and wired. The `price.kdvDahil` and `price.kdvLine` keys use the final Turkish strings ("KDV Dahil" / "KDV (%20):") — no placeholder text.

## Threat Flags

No new threat surface introduced.
- T-05-05 (total tampering / double-count): mitigated — `kdvAmount` not added to any total; comment documents informational-only intent; `grep` confirms only 2 occurrences of `kdvAmount` (computation + display)

## Self-Check: PASSED

- FOUND: src/lib/kdv.ts
- FOUND: src/lib/kdv.test.ts
- FOUND: src/app/[locale]/legal/legal-config.ts
- FOUND: messages/en.json contains price.kdvDahil and price.kdvLine
- FOUND: messages/tr.json contains price.kdvDahil and price.kdvLine (parity)
- FOUND: src/components/ProductCard.tsx contains price.kdvDahil
- FOUND: src/components/ProductDetail.tsx contains price.kdvDahil
- FOUND: src/app/[locale]/checkout/page.tsx contains kdvFromBrutto + price.kdvLine + "informational only"
- FOUND commits: 09689bd, 3a25712, d27a143, e77c981, 6f55b18
- npm run build: GREEN
- npx vitest run kdv: 4/4 PASS
