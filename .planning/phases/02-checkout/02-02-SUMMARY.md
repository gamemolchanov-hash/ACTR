---
phase: 02-checkout
plan: "02"
subsystem: checkout-ui
tags: [stripe, arm-api, checkout, cart, promo, shipping, typescript, mui, next14]
dependency_graph:
  requires: [phase-2/02-01-checkout-data-layer]
  provides: [stripe-embedded-checkout, arm-shipping-ui, arm-promo-basket, order-confirmation-ui]
  affects: [src/app/basket/page.tsx, src/app/checkout/page.tsx, src/app/checkout/success/page.tsx, src/components/StripeEmbeddedCheckout.tsx, src/lib/money.ts]
tech_stack:
  added: ["@stripe/stripe-js@^9.8.0", "@stripe/react-stripe-js@^6.6.0"]
  patterns: [stripe-embedded-checkout, intl-number-format-currency, next-dynamic-ssr-false, arm-shipping-rates-selector]
key_files:
  created:
    - src/components/StripeEmbeddedCheckout.tsx
    - src/lib/money.ts
  modified:
    - src/app/checkout/page.tsx
    - src/app/checkout/success/page.tsx
    - src/app/basket/page.tsx
    - package.json
decisions:
  - "StripeEmbeddedCheckout mounted via next/dynamic ssr:false — Stripe cannot run server-side"
  - "loadStripe memoised on publishableKey to prevent EmbeddedCheckout iframe remount on re-renders"
  - "clearCart() called on success page mount (payment confirmed), not on checkout submit"
  - "ARM shipping unavailable (fedex_configured=false or empty rates) shows alert but does not block submit — dev environment"
  - "country stored as ISO-2 (e.g. TR), displayed via COUNTRIES lookup; default TR"
  - "fmtMoney uses Intl.NumberFormat style:currency with fallback to plain number+code for unknown currencies"
  - "BOGO/auto_promo removed from basket; validatePromo now uses ARM signature (code, subtotal) not (code, items[])"
metrics:
  duration: "~6 minutes"
  completed: "2026-06-29"
  tasks_completed: 5
  files_changed: 7
---

# Phase 02 Plan 02: Checkout UI — Stripe Embedded + ARM Shipping + TR Market Summary

Full UI rewrite of basket/checkout/success under ARM + Stripe embedded checkout. CDEK, PayKeeper, RU-market content removed. Guest checkout end-to-end is wired from cart validation through order creation, Stripe embedded payment, and order confirmation.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Stripe deps + StripeEmbeddedCheckout | 1115cec | package.json, src/components/StripeEmbeddedCheckout.tsx |
| 2 | checkout — ARM shipping, TR, promo | b6fd04b | src/app/checkout/page.tsx, src/lib/money.ts |
| 3 | Stripe embedded payment + success page | 9c4188a | src/app/checkout/success/page.tsx |
| 4 | basket — ARM totals, fmtMoney, remove BOGO | bb41433 | src/app/basket/page.tsx |
| 5 | E2E verification (tsc + build + grep checks) | — | — |

## What Was Built

**`src/components/StripeEmbeddedCheckout.tsx`** — Stripe Embedded Checkout (ui_mode=embedded):
- Props `{ clientSecret: string; publishableKey: string }`
- `loadStripe(publishableKey)` wrapped in `useMemo([publishableKey])` to prevent iframe remount
- `EmbeddedCheckoutProvider` + `EmbeddedCheckout` from `@stripe/react-stripe-js`
- Wrapped in MUI `<Box>` instead of Tailwind class (FBG port adapted for MUI)
- Loaded in checkout via `next/dynamic` with `ssr: false`

**`src/lib/money.ts`** — Shared currency formatter:
- `fmtMoney(amount, currency?)` using `Intl.NumberFormat` with `style:'currency'`
- Falls back to `NEXT_PUBLIC_STOREFRONT_CURRENCY` → USD
- Error-safe: unknown ISO codes fall back to `"12.99 XYZ"` format

**`src/app/checkout/page.tsx`** — Full ARM checkout:
- CDEK removed: `CDEK_OPTIONS`, `searchCdekCities`/`fetchCdekPoints`, city-code/points state, pickup-point UI
- COUNTRIES list → ISO-2 objects (TR, US, GB, DE, FR, IT, ES, NL, AE); default `TR`
- ARM shipping: `fetchShippingRates({country, postalCode, items})` called on step 2 entry; RadioGroup shows `name + carrier + days + price`
- Shipping unavailable (fedex_configured=false or empty rates) → `Alert` info, submit not blocked
- Promo: `validatePromo(code, subtotal)` — new ARM signature; `discount_amount` shown in summary
- Payment flow: `createOrder` → `createPaymentSession` → embedded Stripe (`clientSecret`+`publishableKey`) or redirect (`redirectUrl`)
- Cart NOT cleared on submit; cleared by success page after confirmed payment
- All monetary display via `fmtMoney(amount, currency)` — no `₽` hardcode

**`src/app/checkout/success/page.tsx`** — ARM order confirmation:
- `?order=<uuid>` query param → `fetchOrder(id)` → ARM `GET /orders/{id}`
- Shows: order `number`, `total` formatted via `fmtMoney(order.total, order.currency)`, `status.name`
- `clearCart()` + sessionStorage cleanup on mount (payment confirmed at this point)
- Loading/error states; Suspense boundary (required for `useSearchParams`)
- No `₽` hardcode; currency driven entirely by ARM order response

**`src/app/basket/page.tsx`** — ARM basket:
- BOGO removed: `useAutoPromo`, `PromoPlashka`, `AutoPromoData`, `cartValidateData`, `promo-bogo` import
- `validatePromo(code, items)` → `validatePromo(code, subtotal)` — ARM signature
- Re-validate effect depends on `subtotal` (not `items`) to catch price changes
- All `fmt()` (`₽`) → `fmtMoney(amount, currency)` with env-var currency
- Labels translated to English (TR-market facing)

## Verification

**tsc --noEmit:** EXIT 0 (zero errors; all 14 pre-existing UI errors from 02-01 resolved)

**npm run build:** Clean — all pages compiled, basket/checkout/success sizes normal

**ARM_STOREFRONT_KEY in .next/static:** CLEAN — server-side only, not in client bundle

**Grep acceptance checks:**
- `grep CDEK|cdek|searchCdekCities|POSTAMAT|PayKeeper|paymentUrl in checkout/page.tsx` → empty
- `grep '₽'|auto_promo|BOGO in basket/page.tsx` → empty
- `grep '₽' in checkout/page.tsx` → empty
- `grep '₽' in success/page.tsx` → empty
- `fetchShippingRates + createOrder + createPaymentSession` imported and called in checkout/page.tsx
- `fetchOrder + fmtMoney + order.currency` used in success/page.tsx
- `validatePromo(code, subtotal)` called in basket/page.tsx

## Deviations from Plan

None — plan executed exactly as written. Minor adaptations:
- Task 3 implementation (Stripe embedded render) was merged into the checkout page written in Task 2 (single coherent component), not split into a separate write pass — same outcome, better cohesion.

## User Setup Required

Before full E2E verification with live Stripe payment:

1. **Start demo BFF:** `cd ~/work/autoCRM && make up` — ARM endpoints on http://localhost:4000
2. **Start storefront:** `cd ~/work/puz/ACTR && npm run dev` — on http://localhost:3003
3. **Configure Stripe test keys in demo storefront Portal:** Navigate to demo-tenant storefront settings in Portal, set `payment_config` with `ui_mode=embedded` and a valid Stripe test publishable key + secret key. Without this, `POST /payment/create-session` returns 400 (BFF has no Stripe configured).
4. **Test card:** `4242 4242 4242 4242`, any future date, any CVC, any ZIP.

The Stripe embedded checkout will render inline once `clientSecret` + `publishableKey` are returned by `createPaymentSession`. If the demo storefront only has `ui_mode=hosted`, the page will redirect to Stripe Hosted Checkout instead (fallback path is implemented).

## Known Stubs

None — all monetary values come from ARM API (validateCart, fetchShippingRates, fetchOrder). Currency driven by `NEXT_PUBLIC_STOREFRONT_CURRENCY` (currently defaults to USD in .env.local; TRY wired in Phase 7 per 02-01 decision).

## Threat Flags

None — no new network endpoints. ARM_STOREFRONT_KEY remains server-side only. Stripe publishableKey arrives from server-side ARM payment session (not hardcoded client-side). No new auth paths.

## Self-Check: PASSED
- src/components/StripeEmbeddedCheckout.tsx: FOUND
- src/lib/money.ts: FOUND
- src/app/checkout/page.tsx: FOUND (rewritten)
- src/app/checkout/success/page.tsx: FOUND (rewritten)
- src/app/basket/page.tsx: FOUND (rewritten)
- Commits: 1115cec, b6fd04b, 9c4188a, bb41433 — all verified in git log
- tsc: EXIT 0
- build: OK (all pages compiled)
