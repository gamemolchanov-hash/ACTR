---
phase: 06-oms-tr
plan: 01
subsystem: ui
tags: [nextjs, i18n, dead-code-removal, promo]

requires: []
provides:
  - "Storefront with zero BOGO auto-promo code, markers, imports, or i18n keys"
  - "Live promo-CODE feature (validatePromo/PromoValidationResult/promoCode, CART-06) verified untouched"
affects: [06-02, 06-03, 06-04, 06-05]

tech-stack:
  added: []
  patterns:
    - "Marker-delimited deletion (// BOGO HOOK START/END) as an exhaustive, grep-verifiable removal gate"

key-files:
  created: []
  modified:
    - "src/app/[locale]/page.tsx"
    - "src/app/[locale]/catalog/page.tsx"
    - "src/app/[locale]/catalog/[slug]/page.tsx"
    - "src/components/ProductCard.tsx"
    - "src/lib/api.ts"
    - "src/lib/arm-adapter.ts"
    - "messages/en.json"
    - "messages/tr.json"

key-decisions:
  - "Executed exactly as planned: Task 1 unwires all 6 BOGO consumer sites (marker-delimited), Task 2 deletes the orphaned module/assets + purges promo.* i18n keys"
  - "Isolation guard held: validatePromo/PromoValidationResult/promoCode (live CART-06 promo-CODE feature) never touched, verified via grep after each commit"

patterns-established:
  - "Marker-delimited removal (BOGO HOOK) as the template for subsequent Phase 6 plans (reviews, RU pages) that need exhaustive, self-verifying deletion"

requirements-completed: [CLEAN-01]

coverage:
  - id: D1
    description: "BOGO auto-promo consumer sites unwired: PromoBanner import+JSX removed from page.tsx/catalog/page.tsx/catalog/[slug]/page.tsx; PromoBadge import+JSX removed from ProductCard.tsx; active_promo field removed from Product type (api.ts) and arm-adapter.ts"
    requirement: "CLEAN-01"
    verification:
      - kind: other
        ref: "git grep -n \"BOGO HOOK|PromoBanner|PromoBadge|active_promo\" -- src/app src/components src/lib | grep -v features/promo-bogo (0 matches)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (0 errors)"
        status: pass
    human_judgment: false
  - id: D2
    description: "src/features/promo-bogo/ module + public/promo-bogo/ assets deleted; promo.gift/promo.giftAdd/promo.bannerAlt purged from messages/en.json and messages/tr.json with EN/TR key-set parity held (385 keys each)"
    requirement: "CLEAN-01"
    verification:
      - kind: other
        ref: "git grep -n \"promo-bogo|BOGO HOOK|active_promo\" -- src public (0 matches)"
        status: pass
      - kind: unit
        ref: "python3 i18n parity check: set(en) == set(tr), no promo.* key, 385/385"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (0 errors)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Live promo-CODE feature (CART-06) demonstrably untouched by the BOGO cleanup"
    requirement: "CLEAN-01"
    verification:
      - kind: other
        ref: "git grep -n \"validatePromo|PromoValidationResult|promoCode\" -- src/lib/api.ts src/lib/arm-adapter.ts src/app/[locale]/basket/page.tsx (13 matches, still present)"
        status: pass
      - kind: integration
        ref: "npx vitest run (141 passed, 3 pre-existing failures in server-api.test.ts — matches documented baseline, no NEW failures)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-01
status: complete
---

# Phase 6 Plan 1: BOGO Auto-Promo Removal Summary

**Deleted the dead OMS-inherited BOGO auto-promo feature (module, 8 consumer-site markers, 2 assets, 3 i18n keys) while leaving the live promo-CODE checkout feature byte-for-byte untouched.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-01T11:28:45Z
- **Completed:** 2026-07-01T11:31:33Z
- **Tasks:** 2
- **Files modified:** 8 (6 edited + module dir + assets dir deleted)

## Accomplishments
- Removed all 8 `// BOGO HOOK` marker-delimited sites across 6 files (3 page-level `PromoBanner` import+JSX, 1 `ProductCard.tsx` `PromoBadge` import+JSX, `active_promo` field in `api.ts`'s `Product` type, `active_promo: null` line in `arm-adapter.ts`)
- Deleted the entire `src/features/promo-bogo/` module (7 files: config.ts, PromoBanner.tsx, PromoBadge.tsx, PromoPlashka.tsx, useAutoPromo.ts, index.ts, README.md) and `public/promo-bogo/` assets (2 PNGs), confirmed orphaned per RESEARCH.md
- Purged `promo.gift`, `promo.giftAdd`, `promo.bannerAlt` from both `messages/en.json` and `messages/tr.json`, holding EN/TR parity at 385/385 keys
- Verified the live CART-06 promo-CODE feature (`validatePromo`, `PromoValidationResult`, `promoCode`) is fully intact — 13 grep matches remain in `api.ts`/`arm-adapter.ts`/`basket/page.tsx`

## Task Commits

Each task was committed atomically:

1. **Task 1: Unwire all BOGO consumer sites** - `5fe97b6` (feat)
2. **Task 2: Delete promo-bogo module + assets and purge promo.* i18n keys** - `6eada66` (feat)

_No TDD tasks in this plan — pure deletion/edit, verified via grep-gates + tsc, per RESEARCH.md guidance (feature had no unit tests to begin with)._

## Files Created/Modified
- `src/app/[locale]/page.tsx` - Removed `PromoBanner` import + `<PromoBanner />` JSX
- `src/app/[locale]/catalog/page.tsx` - Removed `PromoBanner` import + JSX
- `src/app/[locale]/catalog/[slug]/page.tsx` - Removed `PromoBanner` import + JSX
- `src/components/ProductCard.tsx` - Removed `PromoBadge` import + `<PromoBadge product={product} />` JSX
- `src/lib/api.ts` - Removed `active_promo` field from `Product` type (kept `validatePromo`/`PromoValidationResult` untouched)
- `src/lib/arm-adapter.ts` - Removed `active_promo: null` line from `armToProduct` (kept `armToPromoResult` untouched)
- `messages/en.json` / `messages/tr.json` - Removed `promo.gift`, `promo.giftAdd`, `promo.bannerAlt` (388 → 385 keys each)
- `src/features/promo-bogo/**` (deleted), `public/promo-bogo/**` (deleted)

## Decisions Made
None - followed plan as specified. The plan's exhaustive consumer graph (from 06-RESEARCH.md) matched the actual codebase state exactly; no additional BOGO references were found beyond the documented 8 marker sites + `active_promo` field.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CLEAN-01 (BOGO portion) fully satisfied: zero BOGO code/assets/keys remain anywhere in `src`/`public`
- Live promo-CODE feature (CART-06) demonstrably intact — safe foundation for subsequent Phase 6 plans (reviews removal, RU-pages removal, CDEK rewrite, brand swaps) that touch adjacent files
- `npx tsc --noEmit` clean; `npx vitest run` at documented baseline (141/144, 3 pre-existing unrelated failures) — no regression introduced
- No blockers for plan 06-02

---
*Phase: 06-oms-tr*
*Completed: 2026-07-01*
