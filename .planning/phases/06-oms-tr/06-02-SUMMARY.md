---
phase: 06-oms-tr
plan: 02
subsystem: ui
tags: [nextjs, seo, dead-code-removal, reviews, i18n, robots]

requires: [06-01]
provides:
  - "Storefront with zero product-reviews UI/client-calls/JSON-LD (D-09 fully closed)"
  - "public/robots.txt free of the hardcoded RU domain (D-11 closed)"
affects: [06-03, 06-04, 06-05]

tech-stack:
  added: []
  patterns:
    - "Contract-verified deletion (confirmed via ARM OpenAPI: no /reviews path exists) as the gate for removing a feature the backend never served"

key-files:
  created: []
  modified:
    - "src/components/ProductDetail.tsx"
    - "src/app/[locale]/catalog/[slug]/[productSlug]/page.tsx"
    - "src/lib/seo.ts"
    - "src/lib/seo.test.ts"
    - "src/lib/server-api.ts"
    - "src/lib/api.ts"
    - "src/components/__tests__/ProductDetail.sanitize.test.tsx"
    - "public/robots.txt"
    - "messages/en.json"
    - "messages/tr.json"

key-decisions:
  - "Executed exactly as planned: Task 1 unwires all reviews consumers (ProductDetail, product page, seo.ts, server-api.ts, api.ts), Task 2 deletes the orphaned ProductReviews component/test + purges 13 product.review* i18n keys, Task 3 de-RUs robots.txt Sitemap directive"
  - "Isolation guard held: validatePromo/PromoValidationResult/promoCode (live CART-06 promo-CODE feature, adjacent in api.ts) never touched — 17 grep matches remain post-plan"
  - "Task 1's own instructions removed the 'adds aggregateRating' test in seo.test.ts (not just the 11 ProductReviews tests) — final suite total is 132, not the plan's estimated 133; still exactly 3 pre-existing failures, zero new failures"

requirements-completed: []

coverage:
  - id: D1
    description: "ProductReviews consumers unwired: import+usage removed from ProductDetail.tsx; reviews fetch + fetchProductReviewAggregateServer call + 2nd JSON-LD arg removed from product page; ReviewAggregate interface, reviews param, and aggregateRating block removed from seo.ts; fetchProductReviewAggregateServer + its import removed from server-api.ts; ProductReview/ProductReviewsResponse/EMPTY_REVIEWS/fetchProductReviews/submitReview removed from api.ts"
    requirement: "CLEAN-01"
    verification:
      - kind: other
        ref: "git grep -ni \"aggregateRating|ReviewAggregate|fetchProductReviewAggregateServer|fetchProductReviews|submitReview\" -- src/lib src/components/ProductDetail.tsx src/app (0 matches outside seo.test.ts's own intentional undefined-assertion)"
        status: pass
      - kind: other
        ref: "git grep -n \"validatePromo|PromoValidationResult|promoCode\" -- src/lib/api.ts (5 matches, live guard intact)"
        status: pass
      - kind: unit
        ref: "npx vitest run src/lib/seo.test.ts src/components/__tests__/ProductDetail.sanitize.test.tsx (19 passed)"
        status: pass
  - id: D2
    description: "ProductReviews.tsx + its test deleted; 13 product.review* i18n keys purged from both locales with EN/TR parity held (385 -> 372 each)"
    requirement: "CLEAN-01"
    verification:
      - kind: other
        ref: "git grep -ni ProductReviews -- src (0 matches); ls confirms both files absent"
        status: pass
      - kind: unit
        ref: "python3 i18n parity check: set(en) == set(tr), no product.review* key, 372/372"
        status: pass
      - kind: integration
        ref: "npx vitest run (132 total, 129 passed, 3 pre-existing failures in server-api.test.ts, no NEW failures vs 144/141/3 baseline)"
        status: pass
  - id: D3
    description: "public/robots.txt Sitemap directive de-RU'd (relative /sitemap.xml), seo.test.ts:240 assertion updated to match"
    requirement: "CLEAN-02"
    verification:
      - kind: other
        ref: "git grep -n american-creator.ru -- public/robots.txt (0 matches)"
        status: pass
      - kind: unit
        ref: "npx vitest run src/lib/seo.test.ts (18 passed, robots.txt assertion green)"
        status: pass

duration: ~7min
completed: 2026-07-01
status: complete
---

# Phase 6 Plan 2: Product Reviews Removal + robots.txt De-RU Summary

**Removed the dead product-reviews feature end-to-end (component, client calls, JSON-LD aggregateRating, 13 i18n keys) and de-RU'd the last hardcoded RU domain reference in a shipped static artifact (robots.txt), leaving the live promo-CODE checkout feature byte-for-byte untouched.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-07-01T11:33Z (immediately following 06-01)
- **Completed:** 2026-07-01T11:40Z
- **Tasks:** 3
- **Files modified:** 10 (7 edited in Task 1, 2 deleted + 2 edited in Task 2, 2 edited in Task 3 — `seo.test.ts` and `messages/*.json` touched across tasks)

## Accomplishments

- Removed `<ProductReviews/>` import + usage from `ProductDetail.tsx`; removed the reviews fetch, `fetchProductReviewAggregateServer` import, and 2nd JSON-LD argument from the product page
- Removed `ReviewAggregate` interface, the `reviews` param, and the `aggregateRating` JSON-LD block from `seo.ts` — `buildProductJsonLd` is now single-argument
- Removed `fetchProductReviewAggregateServer` (+ its `ReviewAggregate` import) from `server-api.ts`, and `ProductReview`/`ProductReviewsResponse`/`EMPTY_REVIEWS`/`fetchProductReviews`/`submitReview` from `api.ts`
- Trimmed `seo.test.ts`: deleted the "adds aggregateRating" test, simplified the omit-assertion test to a single no-arg call (still asserts `aggregateRating` is `undefined`)
- Removed the now-stale `vi.mock('@/lib/auth-context', …)` from `ProductDetail.sanitize.test.tsx` (ProductDetail no longer imports anything that calls `useAuth()`)
- Deleted `src/components/ProductReviews.tsx` and `src/components/__tests__/ProductReviews.test.tsx` (orphaned after Task 1)
- Purged 13 `product.review*` keys from both `messages/en.json` and `messages/tr.json` via targeted line removal (not a JSON round-trip, to avoid reformatting unrelated blank-line separators) — 385 → 372 keys each, EN/TR parity held
- Replaced `public/robots.txt`'s `Sitemap: https://american-creator.ru/sitemap.xml` with `Sitemap: /sitemap.xml` (relative, domain-agnostic); updated `seo.test.ts:240`'s guarding assertion to match
- Verified the live CART-06 promo-CODE feature (`validatePromo`, `PromoValidationResult`, `promoCode`) is fully intact — 17 grep matches remain across `src` (5 in `api.ts` alone)

## Task Commits

Each task was committed atomically:

1. **Task 1: Unwire reviews from ProductDetail, product page, and SEO builders** - `4cc94e1` (feat)
2. **Task 2: Delete ProductReviews files + purge product.review* i18n keys** - `2fad56c` (feat)
3. **Task 3: De-RU robots.txt Sitemap domain (D-11) + update its guarding assertion** - `70412e6` (fix)

_No TDD tasks in this plan — pure deletion/edit, verified via grep-gates + tsc + vitest, per RESEARCH.md guidance._

## Files Created/Modified

- `src/components/ProductDetail.tsx` - Removed `ProductReviews` import + `<ProductReviews productId={product.id} />` usage
- `src/app/[locale]/catalog/[slug]/[productSlug]/page.tsx` - Removed `fetchProductReviewAggregateServer` import + call, removed 2nd arg to `buildProductJsonLd`
- `src/lib/seo.ts` - Removed `ReviewAggregate` interface, `reviews` param, and `aggregateRating` JSON-LD block from `buildProductJsonLd`
- `src/lib/seo.test.ts` - Deleted "adds aggregateRating" test; simplified omit-assertion test; updated robots.txt Sitemap assertion (Task 3)
- `src/lib/server-api.ts` - Removed `fetchProductReviewAggregateServer` function + `ReviewAggregate` import
- `src/lib/api.ts` - Removed `ProductReview`, `ProductReviewsResponse`, `EMPTY_REVIEWS`, `fetchProductReviews`, `submitReview` (kept `validatePromo`/`PromoValidationResult`/`promoCode` untouched)
- `src/components/__tests__/ProductDetail.sanitize.test.tsx` - Removed stale `@/lib/auth-context` mock
- `src/components/ProductReviews.tsx` (deleted), `src/components/__tests__/ProductReviews.test.tsx` (deleted)
- `messages/en.json` / `messages/tr.json` - Removed 13 `product.review*` keys (385 → 372 keys each)
- `public/robots.txt` - `Sitemap:` directive changed to relative `/sitemap.xml`

## Decisions Made

- Purged i18n keys via targeted `sed` line-deletion rather than a `json.load`/`json.dump` round-trip, after discovering the round-trip approach collapsed intentional blank-line separators elsewhere in the file (out-of-scope reformatting). The targeted approach produced a minimal 13-line diff per file.
- Did not call `requirements mark-complete CLEAN-01` — CLEAN-01 spans plans 06-01 through 06-04 (reviews is only the second sub-item; CDEK/PayKeeper, Bitrix redirects, RU pages remain). Deferred to whichever plan closes the final sub-item.
- CLEAN-02 (robots.txt de-RU, D-11) is a self-contained sub-item fully closed by Task 3 of this plan; not marking it complete either since CLEAN-02 also covers brand swaps (phone/socials/payment icons) scheduled for a later plan (06-05 per RESEARCH.md's Q2/D-10 resolution).

## Deviations from Plan

### Auto-fixed Issues

None — no bugs, missing functionality, or blocking issues encountered. Plan executed exactly as written.

**Verification-count observation (not a deviation):** The plan's Task 2 acceptance criteria estimated the post-cleanup suite total at 133 tests (144 − 11 ProductReviews tests). Actual total is **132**, because Task 1's own instructions (delete the test `it('adds aggregateRating when there are approved reviews …')`) removed one additional test from `seo.test.ts` beyond the 11 ProductReviews tests. This is expected given the plan's own Task 1 action, not a regression — confirmed still exactly 3 pre-existing `server-api.test.ts` failures, zero new failures.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification Summary

- `git grep -ni "ProductReviews|aggregateRating|ReviewAggregate|fetchProductReviewAggregateServer|fetchProductReviews|submitReview" -- src/lib src/components/ProductDetail.tsx src/app` → 0 matches outside `seo.test.ts`'s own intentional "must be undefined" assertion (required by Task 1's own instructions to keep the no-arg omit test)
- `git grep -n "american-creator.ru" -- public/robots.txt` → 0
- `git grep -n "validatePromo|PromoValidationResult|promoCode" -- src` → 17 (live-code guard intact)
- i18n parity script → 372/372, no `product.review*` key in either locale
- `npx tsc --noEmit` → 0 errors
- `npx vitest run` → 132 tests, 129 passed, 3 pre-existing `server-api.test.ts` failures (unchanged from documented baseline), **0 new failures**

## Next Phase Readiness

- CLEAN-01 (Reviews portion) fully satisfied: component, tests, client calls, types, JSON-LD block, i18n keys all removed
- CLEAN-02 (D-11 portion) fully satisfied: robots.txt free of RU domain, guarding test updated and green
- D-09 + D-11 honored exactly; live CART-06 promo-CODE feature demonstrably untouched
- EN/TR parity held throughout (372/372)
- No blockers for plan 06-03 (next slice of Phase 6 cleanup: CDEK/delivery rework + RU business pages per RESEARCH.md's recommended sequencing)

## Self-Check: PASSED

All modified files verified present on disk; both deleted files (`src/components/ProductReviews.tsx`, `src/components/__tests__/ProductReviews.test.tsx`) confirmed absent via `ls` (exit 2, "No such file"); all 3 commits (`4cc94e1`, `2fad56c`, `70412e6`) verified present in `git log --oneline -5`.

---
*Phase: 06-oms-tr*
*Completed: 2026-07-01*
