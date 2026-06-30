---
phase: 04-i18n-en-tr
plan: "02"
subsystem: i18n-catalog
tags: [i18n, ARM-proxy, lang-passthrough, catalog, ProductReviews, fmtMoney, ICU-plural, WR-02, I18N-01, I18N-03]
dependency_graph:
  requires:
    - src/i18n/navigation.ts (Wave 1 — Link/useRouter)
    - src/lib/money.ts#fmtMoney (Wave 1 — locale-aware 3-arg)
    - messages/en.json + messages/tr.json (Wave 1 seed — appended)
  provides:
    - src/app/api/storefront/[...path]/route.ts (LOCALE_TO_BCP47 + ?lang on product-detail)
    - src/app/api/storefront/__tests__/proxy.test.ts (?lang contract: 8 cases)
    - src/components/CatalogView.tsx (catalog.* keys, locale-aware Link/router)
    - src/components/ProductCard.tsx (fmtMoney, catalog.* keys)
    - src/components/ProductDetail.tsx (fmtMoney, product.* keys, locale-aware price/chars)
    - src/components/HeroBanner.tsx (hero.* keys)
    - src/components/ProductReviews.tsx (Intl.DateTimeFormat locale + ICU plural reviewCount)
    - src/components/__tests__/ProductReviews.test.tsx (11 cases: locale-date, ICU plural, etc.)
    - src/lib/mock-data.ts (EN demo data)
    - src/lib/arm-adapter.ts (EN inline comment)
    - src/features/promo-bogo/PromoPlashka.tsx (fmtMoney + promo.* keys)
    - src/features/promo-bogo/config.ts (PROMO_BANNER_ALT in EN)
    - messages/en.json + messages/tr.json (+catalog.*/product.*/hero.*/promo.*/common.home)
  affects:
    - /[locale]/catalog/* pages (CatalogView renders ProductCard)
    - /[locale]/catalog/[slug]/[productSlug] page (ProductDetail + ProductReviews)
    - /[locale]/ home page (HeroBanner)
    - /api/storefront/products/:slug requests (now include ?lang=<bcp47>)
tech_stack:
  added: []
  patterns:
    - LOCALE_TO_BCP47 fixed-map in server proxy (T-04-05 mitigated — no user input in lang value)
    - bcp47 = locale === 'tr' ? 'tr-TR' : 'en-US' pattern in client components
    - fmtMoney(price, 'TRY', bcp47) replacing Intl.NumberFormat('ru-RU') + '₽'
    - Intl.DateTimeFormat(bcp47, {day:'2-digit',month:'long',year:'numeric'}) for review dates
    - ICU plural t('product.reviewCount', {count}) replacing Russian one/few/many logic
    - HERO_SLIDES defined inside component body to access useTranslations() hook
key_files:
  created:
    - src/app/api/storefront/__tests__/proxy.test.ts
  modified:
    - src/app/api/storefront/[...path]/route.ts
    - src/components/CatalogView.tsx
    - src/components/ProductCard.tsx
    - src/components/ProductDetail.tsx
    - src/components/HeroBanner.tsx
    - src/components/ProductReviews.tsx
    - src/components/__tests__/ProductReviews.test.tsx
    - src/lib/mock-data.ts
    - src/lib/arm-adapter.ts
    - src/features/promo-bogo/PromoPlashka.tsx
    - src/features/promo-bogo/config.ts
    - messages/en.json
    - messages/tr.json
decisions:
  - "D-08 confirmed: ?lang injected only on /products/:slug (path.length===2), never on /products list or other endpoints"
  - "LOCALE_TO_BCP47 lives in proxy route (server-side) — locale cookie value never reaches BFF directly"
  - "HERO_SLIDES moved inside HeroBanner() body to enable useTranslations() hook calls"
  - "product.reviewCount uses ICU plural one/other — sufficient for EN and TR (no Russian 1/2-4/5+ forms)"
  - "open Q2 (tr-TR content in demo tenant): not verified — BFF returns default EN content until arm_product_translations has tr-TR rows (Phase 7)"
  - "promo.gift uses ICU plural + {amount} plain substitution — module deprecated in Phase 6"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-30"
  tasks: 3
  files: 14
---

# Phase 04 Plan 02: Catalog/?lang/ProductReviews i18n Summary

**One-liner:** ARM proxy injects ?lang=<bcp47> on product-detail only; catalog/product/banner/reviews components fully extracted from Cyrillic using useTranslations+fmtMoney+Intl.DateTimeFormat(locale); WR-02 closed.

## What Was Built

### Task 1 (TDD): ARM ?lang BCP-47 passthrough — proxy + test (f5bd010)

**RED** — `src/app/api/storefront/__tests__/proxy.test.ts`: 8 test cases covering tr→tr-TR, en→en-US, no-cookie→en-US, list no-lang, other endpoints no-lang, no-overwrite of existing ?lang, short-code absence.

**GREEN** — `src/app/api/storefront/[...path]/route.ts`:

- Added `LOCALE_TO_BCP47: Record<string,string> = { en:'en-US', tr:'tr-TR' }`
- Added injection logic: reads `NEXT_LOCALE` cookie → maps to BCP-47 → injects `?lang=bcp47` on `path.length===2 && path[0]==='products'` only; guards with `!url.searchParams.has('lang')` to avoid overwriting
- Changed `req.nextUrl.search` → `new URL(req.url)` + `url.search` for mutable search params
- Security: lang value sourced from fixed map, never from URL/body input (T-04-05)

Open Q2 status: ?lang transport is now in place. Whether BFF returns tr-TR content depends on `arm_product_translations.locale = tr-TR` rows in the demo tenant (not yet populated — deferred to Phase 7 data work).

### Task 2: Catalog/product component i18n + locale-aware prices (ad475cd)

**CatalogView.tsx:**
- `useTranslations()` + Link/useRouter from `@/i18n/navigation`
- All Cyrillic UI strings → `catalog.*` keys (categories/allProducts/filters/inStock/filter/sortBy/sortByName*/newArrivals/noProducts)
- Breadcrumbs use `common.home` + `nav.catalog` keys

**ProductCard.tsx:**
- `useTranslations()` + `useLocale()` + `Link` from `@/i18n/navigation`
- `formatPrice = Intl.NumberFormat('ru-RU')+'₽'` → `fmtMoney(product.price,'TRY',bcp47)` (WR-01)
- "Хит продаж" → `t('catalog.bestSeller')`, "В корзину" → `t('catalog.addToCart')`

**ProductDetail.tsx:**
- `useTranslations()` + `useLocale()` + `Link` from `@/i18n/navigation`
- `formatPrice` (module-level, ru-RU+₽) removed → `fmtMoney(price,'TRY',bcp47)` everywhere (detail price, RecentlyViewedCard price)
- All characteristics labels → `t('product.{sku,weight,volume,dimensions,category}')` with unit keys
- Breadcrumbs, stock chip, not-found state, section headings, recently-viewed → `product.*` keys
- "скролл или двойной клик для зума" → `t('product.zoomHint')`
- `RecentlyViewedCard` refactored to accept `bcp47` prop (avoiding locale hook in sub-component render)
- "Нет фото" → neutral "—" symbol (no Cyrillic; image fallback is SKU anyway)

**HeroBanner.tsx:**
- `useTranslations()` + `Link` from `@/i18n/navigation`
- `HERO_SLIDES` moved inside component body to use `t()` hook for subtitle/cta/card content
- All slide Cyrillic strings → `hero.*` keys

**PromoPlashka.tsx:**
- `useTranslations()` + `useLocale()` + `fmtMoney` replacing inline `ru-RU+₽` formatter
- Russian pluralization + Cyrillic gift text → `promo.gift` (ICU plural) + `promo.giftAdd`

**config.ts:** `PROMO_BANNER_ALT` → EN

**mock-data.ts:** All RU category names (6) and product descriptions (9) → EN

**arm-adapter.ts:** Inline comment `// OMS BOGO у ARM нет` → EN

**messages/en.json + tr.json:** +38 keys each (catalog.*/product.*/hero.*/promo.*/common.home), key parity maintained

### Task 3 (TDD): ProductReviews locale-aware dates + ICU plural + strings — WR-02 (3a7489c)

**RED** — `src/components/__tests__/ProductReviews.test.tsx` fully rewritten:
- next-intl mock (useTranslations with namespace, useLocale with configurable mockLocale)
- Minimal ICU plural engine in mock (one/other)
- 11 test cases: EN date format (no Cyrillic), TR date format (Ocak/2025), no ru-RU dates, ICU plural "1 review"/"5 reviews", no count when total=0, empty state, login prompt (EN), submit+thank-you, author fallback to t('product.customer'), XSS escaping

**GREEN** — `src/components/ProductReviews.tsx`:
- `useTranslations('product')` + `useLocale()` 
- `fmtDate`: `new Date(d).toLocaleDateString('ru-RU',...)` → `new Intl.DateTimeFormat(bcp47,{day:'2-digit',month:'long',year:'numeric'}).format(new Date(d))`
- Review count: `total%10===1?'отзыв':'отзывов'` → `t('reviewCount',{count:total})` (ICU plural)
- All Cyrillic strings (reviews/yourRating/ratingAriaLabel/sharePlaceholder/submitReview/submitting/verifiedPurchase/noReviews/loginPromptText/loginLink/customer/sendError) → `t()` keys
- `extractError` return type fixed to `string|null`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] import `../route` failed — bracket directory name**
- **Found during:** Task 1 proxy test (first run)
- **Issue:** `import { GET } from '../route'` resolved to non-existent path; the actual file is in `[...path]/route.ts`
- **Fix:** Changed import to `import { GET } from '../[...path]/route'` with ts-ignore comment for bracket path
- **Files modified:** `src/app/api/storefront/__tests__/proxy.test.ts`
- **Commit:** f5bd010

**2. [Rule 1 - Bug] arm-adapter.ts: Cyrillic comment not excluded by grep gate**
- **Found during:** Task 2 grep gate
- **Issue:** `active_promo: null, // OMS BOGO у ARM нет` — the pattern `grep -vP ':\s*(//|\*|/\*)'` excludes comment-ONLY lines but not trailing inline comments (no colon immediately before `//`)
- **Fix:** Translated comment to EN: `// OMS BOGO promos are not supported in ARM`
- **Files modified:** `src/lib/arm-adapter.ts`
- **Commit:** ad475cd

**3. [Rule 1 - Bug] ProductReviews test: `getByText(/5 reviews/)` failed on async data**
- **Found during:** Task 3 GREEN run
- **Issue:** `await screen.findByText('Reviews')` resolves immediately (header is static); subsequent `getByText(/5 reviews/)` fires before `useQuery` data resolved
- **Fix:** Changed to `await screen.findByText(/5 reviews/)` to wait for async data
- **Files modified:** `src/components/__tests__/ProductReviews.test.tsx`
- **Commit:** 3a7489c

**4. [Rule 1 - Bug] TypeScript: `extractError` returned `string | null` typed as `string`**
- **Found during:** Task 3 `tsc --noEmit`
- **Fix:** Changed return type to `string | null`; call site already has `|| t('sendError')` fallback
- **Files modified:** `src/components/ProductReviews.tsx`
- **Commit:** 3a7489c

**5. [Rule 2 - Missing] HeroBanner: HERO_SLIDES defined at module level cannot use hooks**
- **Found during:** Task 2 implementation
- **Issue:** HERO_SLIDES was a module-level const; calling `t()` inside it requires hook context
- **Fix:** Moved HERO_SLIDES definition inside the `HeroBanner()` component body; no architectural change
- **Files modified:** `src/components/HeroBanner.tsx`
- **Commit:** ad475cd

## Known Stubs

- **open Q2 (tr-TR product content):** Proxy now sends `?lang=tr-TR` correctly. Whether BFF returns translated content depends on `arm_product_translations.locale = tr-TR` rows in the demo tenant. No tr-TR rows exist yet — BFF returns default EN content. This is expected per plan (user_setup note). Deferred to Phase 7 (catalog data).

## Threat Flags

No new security surface beyond plan's threat model:
- T-04-05: LOCALE_TO_BCP47 fixed-map prevents lang injection (lang value is server-side const, never user input)
- T-04-06: product content by locale is public storefront data — no auth boundary change

## Verification Results

- `npx tsc --noEmit` — clean
- `npx vitest run proxy.test.ts ProductReviews.test.tsx` — 19/19 passed
- Cyrillic grep gate (Task 2 files): 0 non-comment Cyrillic
- Cyrillic grep gate (ProductReviews.tsx): 0 Cyrillic
- `npm run build` — green, all /en/* and /tr/* routes generated

## Open Items for Subsequent Plans

- **Remaining pages Cyrillic** (basket/checkout/login/account/contacts/delivery/faq/partners/studios): extracted in 04-03/04 as those pages are tackled
- **tr-TR product content** (open Q2): requires `arm_product_translations` tr-TR data in demo tenant — Phase 7 data work
- **Tolgee sync** for new 04-02 keys (catalog.*/product.*/hero.*/promo.*): deferred to 04-05 (Tolgee finalize), same as 04-01 keys

## Self-Check: PASSED

- `src/app/api/storefront/__tests__/proxy.test.ts` — exists
- `src/app/api/storefront/[...path]/route.ts` — contains `LOCALE_TO_BCP47`
- `src/components/CatalogView.tsx` — contains `useTranslations`, no Cyrillic
- `src/components/ProductCard.tsx` — contains `fmtMoney`, no Cyrillic
- `src/components/ProductDetail.tsx` — contains `fmtMoney`, `useLocale`, no Cyrillic
- `src/components/HeroBanner.tsx` — contains `useTranslations`, no Cyrillic
- `src/components/ProductReviews.tsx` — contains `Intl.DateTimeFormat`, `reviewCount`, no Cyrillic
- `messages/en.json` — contains `product.reviewCount`, `catalog.addToCart`, `hero.subtitle`
- `messages/tr.json` — contains same keys (parity)
- Commits f5bd010, ad475cd, 3a7489c — verified in git log
