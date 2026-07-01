---
phase: quick-260701-viz
plan: 01
subsystem: ui
tags: [next.js, react-context, currency, i18n, server-components]

requires: []
provides:
  - Server-resolved storefront display currency (getStorefrontCurrency) sourced from BFF /public/arm/storefront/config
  - Client CurrencyProvider/useCurrency context threaded through the locale layout
  - Catalog/product/header/basket/checkout price display now follows tenant config.currency
affects: [phase-07-tr, catalog, product-detail, header, basket, checkout]

tech-stack:
  added: []
  patterns:
    - "Server-resolve-once-thread-as-prop: value fetched server-side in an async layout, passed as initialCurrency into a client context provider, avoiding hydration mismatch/flash (mirrors CartProvider context style)"

key-files:
  created:
    - src/lib/storefront-config.ts
    - src/providers/CurrencyProvider.tsx
  modified:
    - src/app/[locale]/layout.tsx
    - src/components/ProductCard.tsx
    - src/components/ProductDetail.tsx
    - src/components/Header.tsx
    - src/app/[locale]/basket/page.tsx
    - src/app/[locale]/checkout/page.tsx

key-decisions:
  - "getStorefrontCurrency() is server-only (import 'server-only') and cached via fetch next.revalidate=300 (5min) since currency is tenant-level, not per-request"
  - "Fallback chain never throws: config.currency -> NEXT_PUBLIC_STOREFRONT_CURRENCY -> 'TRY', matching money.ts's existing fallback contract"
  - "Currency resolved once server-side in the locale layout and threaded as a prop into CurrencyProvider so SSR and client first paint agree (no hydration mismatch, no TRY-to-config flash)"

patterns-established:
  - "Pattern: server-only config resolvers under src/lib/*-config.ts paired with a client Context provider in src/providers/, mounted once in [locale]/layout.tsx above Header+children"

requirements-completed: [QUICK-CURRENCY-CONFIG]

coverage:
  - id: D1
    description: "Catalog, product-detail, header search suggestions, basket and checkout price strings render in the currency reported by BFF config.currency instead of hardcoded 'TRY' / NEXT_PUBLIC_STOREFRONT_CURRENCY"
    requirement: "QUICK-CURRENCY-CONFIG"
    verification:
      - kind: unit
        ref: "grep -REn \"fmtMoney\\([^)]*'TRY'\\)\" src/components/ProductCard.tsx src/components/ProductDetail.tsx src/components/Header.tsx (0 matches)"
        status: pass
      - kind: unit
        ref: "grep -n NEXT_PUBLIC_STOREFRONT_CURRENCY src/app/[locale]/basket/page.tsx src/app/[locale]/checkout/page.tsx (0 matches)"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D2
    description: "With the dev tenant (config.currency = USD) all display prices render in USD ($); on a TRY-configured tenant they render TRY (₺) — display follows tenant config, no hardcoding"
    requirement: "QUICK-CURRENCY-CONFIG"
    verification: []
    human_judgment: true
    rationale: "Requires live dev server + BFF running to visually confirm rendered currency symbol on catalog/product/header/basket/checkout; not exercised by the existing automated test suite."
  - id: D3
    description: "Config fetch failure falls back to NEXT_PUBLIC_STOREFRONT_CURRENCY then 'TRY' without throwing; X-Storefront-Key stays server-side (server-only import)"
    requirement: "QUICK-CURRENCY-CONFIG"
    verification:
      - kind: unit
        ref: "src/lib/storefront-config.ts try/catch wraps fetch+parse; import 'server-only' guards client-bundle leakage"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-01
status: complete
---

# Quick Task 260701-viz: Storefront currency follows BFF config Summary

**Storefront display currency (catalog/product/header/basket/checkout) now resolves once server-side from BFF `/public/arm/storefront/config` via a new CurrencyProvider context, replacing the hardcoded `'TRY'` and `NEXT_PUBLIC_STOREFRONT_CURRENCY` env default.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-07-01T22:52Z
- **Completed:** 2026-07-01T22:55Z
- **Tasks:** 2
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- New server-only `getStorefrontCurrency()` fetches BFF config.currency (5-min cache via `next.revalidate`), never throws, mirrors the proxy route's X-Tenant-ID/X-Storefront-Key injection.
- New `CurrencyProvider`/`useCurrency()` client context, mounted once in `[locale]/layout.tsx` above Header + children so server and client first paint agree.
- All 6 hardcoded `fmtMoney(..., 'TRY', bcp47)` call sites (ProductCard, ProductDetail main + RecentlyViewedCard, Header desktop + mobile suggestions) now read `currency` from `useCurrency()`.
- Basket and checkout pages no longer read `NEXT_PUBLIC_STOREFRONT_CURRENCY` at module scope — they call `useCurrency()` inside the component instead.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add server currency resolver + client CurrencyProvider and mount in the locale layout** - `4d34f7b` (feat)
2. **Task 2: Replace hardcoded/env currency with useCurrency() at all display, basket and checkout call sites** - `55a5c66` (feat)

**Plan metadata:** committed separately by the orchestrator (docs commit not made by this executor per quick-task constraints)

## Files Created/Modified
- `src/lib/storefront-config.ts` - server-only `getStorefrontCurrency()`, fallback chain config.currency → NEXT_PUBLIC_STOREFRONT_CURRENCY → 'TRY', never throws
- `src/providers/CurrencyProvider.tsx` - client Context provider + `useCurrency()` hook (mirrors CartProvider style)
- `src/app/[locale]/layout.tsx` - resolves currency server-side, wraps Header+children in `<CurrencyProvider>`
- `src/components/ProductCard.tsx` - price uses `useCurrency()` instead of `'TRY'`
- `src/components/ProductDetail.tsx` - main price + `RecentlyViewedCard` (currency threaded as prop like `bcp47`) use `useCurrency()`
- `src/components/Header.tsx` - both desktop and mobile search-suggestion price calls use `useCurrency()`
- `src/app/[locale]/basket/page.tsx` - module-scope `NEXT_PUBLIC_STOREFRONT_CURRENCY` const removed, `useCurrency()` used inside component
- `src/app/[locale]/checkout/page.tsx` - module-scope `NEXT_PUBLIC_STOREFRONT_CURRENCY` const removed, `useCurrency()` used inside component

## Decisions Made
- Used `fetch(..., { next: { revalidate: 300 } })` for the config fetch (currency is tenant-level, cacheable ~5 min) rather than a per-request fetch, keeping BFF load low.
- Threaded `currency` into `RecentlyViewedCard` as an explicit prop (parallel to the existing `bcp47` prop) rather than calling `useCurrency()` inside the sub-component, keeping a single source of truth per render tree and matching the plan's explicit instruction.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Pre-existing `server-api.test.ts` failures (3 tests, `armToProduct` reading `p.name` of undefined) were observed in the `npm test` run — these are documented in `.planning/STATE.md` as a pre-existing backlog item (commit `a2ba277`, before this task), unrelated to currency display and out of scope per the deviation-rules scope boundary.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `money.ts`, `api.ts` request-currency (`X-Currency` header / `currencyHeader()`), and `order.currency` usage were not touched, as required.
- `X-Storefront-Key` remains server-side only (`storefront-config.ts` begins with `import 'server-only'`).
- Manual UAT still needed to visually confirm the rendered currency symbol on the live dev tenant (config.currency = USD is expected there, not a bug) — flagged as coverage item D2 (human_judgment: true).

---
*Phase: quick-260701-viz*
*Completed: 2026-07-01*

## Self-Check: PASSED

All created/modified files verified present on disk; both task commits (`4d34f7b`, `55a5c66`) verified present in git log.
