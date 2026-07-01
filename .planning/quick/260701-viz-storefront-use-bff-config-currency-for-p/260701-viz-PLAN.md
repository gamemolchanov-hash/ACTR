---
phase: quick-260701-viz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/storefront-config.ts
  - src/providers/CurrencyProvider.tsx
  - src/app/[locale]/layout.tsx
  - src/components/ProductCard.tsx
  - src/components/ProductDetail.tsx
  - src/components/Header.tsx
  - src/app/[locale]/basket/page.tsx
  - src/app/[locale]/checkout/page.tsx
autonomous: true
requirements:
  - QUICK-CURRENCY-CONFIG
must_haves:
  truths:
    - "Catalog, product-detail, header search, basket and checkout price strings render in the currency reported by BFF /public/arm/storefront/config (config.currency), not a hardcoded 'TRY'"
    - "With the current dev tenant (config.currency = USD) all display prices render in USD ($); a TRY-configured tenant renders ₺ — display follows tenant config"
    - "If the config fetch fails or returns no currency, display falls back to NEXT_PUBLIC_STOREFRONT_CURRENCY and then 'TRY' without throwing"
    - "The active display currency is resolved once, server-side in the locale layout, and passed to a client CurrencyProvider so server and client first paint agree (no hydration mismatch, no TRY→config flash)"
    - "order.currency usage on order-history / checkout-success pages is unchanged; money.ts signature and its fallback behavior are unchanged"
    - "X-Storefront-Key stays server-side — the config helper is server-only and never enters the client bundle"
  artifacts:
    - "src/lib/storefront-config.ts"
    - "src/providers/CurrencyProvider.tsx"
  key_links:
    - "layout.tsx (server component) calls getStorefrontCurrency() and renders <CurrencyProvider initialCurrency={currency}> above Header + children"
    - "ProductCard / ProductDetail / Header / basket / checkout read the value via useCurrency() and pass it as the currency arg to fmtMoney(), keeping the existing bcp47 locale arg"
---

<objective>
Make the storefront's price DISPLAY currency come from BFF `/public/arm/storefront/config` (`config.currency`) instead of the hardcoded `'TRY'` (catalog / product / header) and the `NEXT_PUBLIC_STOREFRONT_CURRENCY` env default (basket / checkout).

Approach (SSR-stable, one source of truth):
- Resolve the active currency ONCE, server-side, in the locale layout (`src/app/[locale]/layout.tsx`) via a new server-only helper `getStorefrontCurrency()`.
- Pass it as `initialCurrency` into a new client `CurrencyProvider`; components read it via `useCurrency()`.
- Because the value is computed on the server and threaded as a prop, the server-rendered HTML and the client's first render use the same currency → no hydration mismatch and no visible TRY→config.currency flash. (This is the approach chosen over a client-only fetch, which would flash from the env default to config.currency on mount.)

Purpose: Display currency follows tenant configuration (the whole point of the ARM multi-currency contract) while preserving the american-creator.ru design 1:1 and the CLAUDE.md isolation/security constraints (frontend-only, backwards-compatible, key stays server-side).
Output: A server currency resolver, a client currency context, and 6 updated consumer files. money.ts, order.currency usage, and the BFF are untouched.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

# Verified facts (do not re-derive):
# - src/lib/money.ts: fmtMoney(amount, currency?, locale?) — currency falls back to
#   NEXT_PUBLIC_STOREFRONT_CURRENCY → 'TRY'. KEEP unchanged (money.test.ts / currency-default.test.ts depend on it).
# - src/app/api/storefront/[...path]/route.ts is the Next→ARM proxy. It reads
#   BFF_INTERNAL_URL (default http://localhost:4000), NEXT_PUBLIC_TENANT_ID, ARM_STOREFRONT_KEY
#   and injects X-Tenant-ID + X-Storefront-Key server-side. The new server helper mirrors this injection.
# - src/components/GeoLocaleInit.tsx already fetches /api/storefront/config client-side but ONLY for
#   geo_country (locale redirect, first-visit only). It reads cfg.geo_country (flat). Leave it UNTOUCHED:
#   geo detection depends on the client's real IP / CF-IPCountry header, so it must stay a client fetch.
#   config.currency is tenant-level (geo-independent), so resolving it server-side is correct and cacheable.
# - Config response shape is ambiguous between { data: { currency, ... } } (ARM envelope) and flat
#   { currency, ... } (GeoLocaleInit reads flat). Read defensively: data?.data?.currency ?? data?.currency.
@src/lib/money.ts
@src/app/api/storefront/[...path]/route.ts
@src/components/GeoLocaleInit.tsx
@src/app/[locale]/layout.tsx
</context>

<tasks>

<!-- planner-discipline-allow: 'TRY' -->
<!-- The three-letter code being removed is named literally in Task 2 actions so the executor
     can locate the exact call sites. The negative grep in <verification> is a PATTERN over
     fmtMoney(...) call sites in the display components (not a bare == 0 token gate), and the
     removed literal is genuinely absent from those files after the change. -->

<task type="auto" tdd="false">
  <name>Task 1: Add server currency resolver + client CurrencyProvider and mount in the locale layout</name>
  <files>src/lib/storefront-config.ts, src/providers/CurrencyProvider.tsx, src/app/[locale]/layout.tsx</files>
  <action>
Create `src/lib/storefront-config.ts` as a SERVER-ONLY module. First line: `import 'server-only';` (ships with Next 14; guarantees this module — and therefore ARM_STOREFRONT_KEY — never enters a client bundle). Export an async function `getStorefrontCurrency(): Promise<string>` that:
- Mirrors the proxy route's config: reads `BFF_INTERNAL_URL` (default `http://localhost:4000`, strip trailing slashes), `NEXT_PUBLIC_TENANT_ID` (default `demo-tenant`), `ARM_STOREFRONT_KEY`.
- Fetches `` `${BFF}/public/arm/storefront/config` `` with headers `X-Tenant-ID` and, only if the key is non-empty, `X-Storefront-Key`. Use `fetch(..., { next: { revalidate: 300 } })` so the value is cached ~5 min instead of re-fetched on every navigation (currency is tenant-level, not per-request).
- Parses JSON and resolves the currency with this exact fallback order: `data?.data?.currency ?? data?.currency ?? process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY ?? 'TRY'`. The `data?.data?.currency ?? data?.currency` pair handles both the ARM `{ data: {...} }` envelope and the flat shape GeoLocaleInit observes.
- Wraps the whole fetch+parse in try/catch; on ANY error (network, non-2xx, bad JSON, missing field) return `process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'`. Never throw.

Create `src/providers/CurrencyProvider.tsx` as a CLIENT component (`'use client'`). It defines a React context whose value is the active currency string. Export `CurrencyProvider({ initialCurrency, children }: { initialCurrency: string; children: React.ReactNode })` that provides `initialCurrency` via the context. Export a hook `useCurrency(): string` that returns the context value, and — if called outside a provider — returns `process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'` as a defensive default (must never throw). Match the existing provider style in `src/providers/` (e.g. CartProvider): `createContext`, a typed context, and a small hook.

Wire into `src/app/[locale]/layout.tsx` (already an async server component): after `setRequestLocale(locale)`, add `const currency = await getStorefrontCurrency();` (import from `@/lib/storefront-config`). Import `CurrencyProvider` from `@/providers/CurrencyProvider` and wrap the existing provider subtree so it sits ABOVE both `<Header />` and `{children}`: insert `<CurrencyProvider initialCurrency={currency}>` immediately inside `<NextIntlClientProvider>` (wrapping the existing `<QueryProvider>…</QueryProvider>` block) and close `</CurrencyProvider>` before `</NextIntlClientProvider>`. Do not reorder or remove any existing provider. Do not touch GeoLocaleInit.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>storefront-config.ts (server-only, import 'server-only' present) exports getStorefrontCurrency with the documented fallback chain and never-throw contract; CurrencyProvider.tsx exports CurrencyProvider + useCurrency; layout.tsx resolves currency server-side and wraps Header+children in the provider; `npx tsc --noEmit` passes.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Replace hardcoded/env currency with useCurrency() at all display, basket and checkout call sites</name>
  <files>src/components/ProductCard.tsx, src/components/ProductDetail.tsx, src/components/Header.tsx, src/app/[locale]/basket/page.tsx, src/app/[locale]/checkout/page.tsx</files>
  <action>
Import `useCurrency` from `@/providers/CurrencyProvider` in each file below. All five are client components rendered under the provider mounted in Task 1. KEEP the existing `bcp47` locale argument (`tr-TR` / `en-US`) at every call site — only the currency argument changes.

- `src/components/ProductCard.tsx`: inside `ProductCard`, add `const currency = useCurrency();` near the `bcp47` line. Change the price call `fmtMoney(product.price, 'TRY', bcp47)` (≈ line 140) to `fmtMoney(product.price, currency, bcp47)`.

- `src/components/ProductDetail.tsx`: two call sites.
  - Main body: inside `ProductDetail`, add `const currency = useCurrency();` near the `bcp47` line; change `fmtMoney(product.price, 'TRY', bcp47)` (≈ line 735) to `fmtMoney(product.price, currency, bcp47)`.
  - `RecentlyViewedCard` (a separate sub-component that already receives `bcp47` as a prop, call site `fmtMoney(item.price, 'TRY', bcp47)` ≈ line 177): thread currency the same way `bcp47` is threaded — add a `currency: string` prop to `RecentlyViewedCard`, use `fmtMoney(item.price, currency, bcp47)`, and pass `currency={currency}` where `<RecentlyViewedCard … bcp47={bcp47} />` is rendered (≈ line 977).

- `src/components/Header.tsx`: inside `Header`, add `const currency = useCurrency();` near the `bcp47` line (≈ line 55). Change BOTH suggestion-dropdown price calls `fmtMoney(p.price, 'TRY', bcp47)` (desktop ≈ line 273 and mobile ≈ line 604) to `fmtMoney(p.price, currency, bcp47)`.

- `src/app/[locale]/basket/page.tsx`: DELETE the module-scope line `const currency = process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';` (≈ line 50). Inside `BasketPage`, add `const currency = useCurrency();`. All existing `currency` references (fmtMoney calls for subtotal/discount/total/unitPrice/lineTotal) are inside the component and resolve unchanged.

- `src/app/[locale]/checkout/page.tsx`: DELETE the module-scope line `const currency = process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';` (≈ line 84). Inside `CheckoutPage`, add `const currency = useCurrency();`. All existing `currency` references (order summary, KDV line, shipping, totals) are inside the component and resolve unchanged.

Do NOT change any `order.currency` usage on order-history / checkout-success pages, do NOT change `currencyHeader()` / `params.currency` in `src/lib/api.ts` (those are the ARM request `X-Currency`, a separate concern from display), and do NOT change `money.ts`.
  </action>
  <verify>
    <automated>! grep -REn "fmtMoney\([^)]*'TRY'" src/components/ProductCard.tsx src/components/ProductDetail.tsx src/components/Header.tsx && ! grep -n "NEXT_PUBLIC_STOREFRONT_CURRENCY" "src/app/[locale]/basket/page.tsx" "src/app/[locale]/checkout/page.tsx" && npx tsc --noEmit</automated>
  </verify>
  <done>No `fmtMoney(…, 'TRY', …)` call remains in ProductCard / ProductDetail / Header; basket and checkout no longer reference NEXT_PUBLIC_STOREFRONT_CURRENCY (they use useCurrency()); RecentlyViewedCard receives currency via prop; `npx tsc --noEmit` passes. money.ts, api.ts currencyHeader, and order.currency usages are unchanged.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → Next route handler | Browser input crosses into the Next server; the storefront key must never cross back to the client. |
| Next server → ARM BFF | Server-side fetch injects X-Tenant-ID + X-Storefront-Key toward the trusted BFF. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-viz-01 | Information Disclosure | src/lib/storefront-config.ts (reads ARM_STOREFRONT_KEY) | high | mitigate | Module begins with `import 'server-only'` and is imported only by the server layout; the non-public ARM_STOREFRONT_KEY never enters a client bundle. |
| T-viz-02 | Denial of Service | getStorefrontCurrency fetch to BFF | low | mitigate | fetch wrapped in try/catch → falls back to NEXT_PUBLIC_STOREFRONT_CURRENCY → 'TRY'; `next: { revalidate: 300 }` caps BFF load to ~1 call / 5 min. |
| T-viz-03 | Tampering | config.currency value used in Intl.NumberFormat | low | accept | currency is used only as an ISO-4217 code for display formatting; money.ts already catches an unknown code and degrades to plain number + code. No new packages are installed (no supply-chain surface). |
</threat_model>

<verification>
- `npx tsc --noEmit` passes (both tasks).
- Negative gate: no `fmtMoney(…, 'TRY', …)` remains in ProductCard / ProductDetail / Header; no `NEXT_PUBLIC_STOREFRONT_CURRENCY` reference remains in basket/checkout pages.
- `npm test` (vitest) still green — money.test.ts / currency-default.test.ts assert the unchanged money.ts fallback.
- Manual (dev tenant, config.currency = USD): catalog, product detail, header search suggestions, basket and checkout all render prices in USD ($). Recording note for SUMMARY: USD ($) on the dev "Countries Test" tenant is EXPECTED — display follows tenant config; a TRY-configured tenant renders ₺. Not a bug.
</verification>

<success_criteria>
- Display currency across catalog / product / header / basket / checkout is sourced from BFF config.currency via a single server-resolved value threaded through CurrencyProvider/useCurrency().
- Fallback chain config.currency → NEXT_PUBLIC_STOREFRONT_CURRENCY → 'TRY' holds and never throws.
- No hydration mismatch and no TRY→config flash (currency resolved server-side, passed as prop).
- money.ts, api.ts request-currency, order.currency usage, and the BFF are unchanged; X-Storefront-Key stays server-side.
</success_criteria>

<output>
Create `.planning/quick/260701-viz-storefront-use-bff-config-currency-for-p/260701-viz-SUMMARY.md` when done.
</output>