---
phase: 02-checkout
verified: 2026-06-29T18:00:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Full guest checkout end-to-end: add item → basket → checkout → Stripe embedded payment → success page"
    expected: "Order confirmed in ARM, Stripe embedded iframe renders with test card 4242, success page shows order number/total/status from GET /orders/{id}"
    why_human: "Requires live demo BFF (make up), configured Stripe test keys in Portal payment_config (ui_mode=embedded), and a browser session — cannot verify without running services"
---

# Phase 2: Корзина и чекаут — Verification Report

**Phase Goal:** Полный заказ оформляется и оплачивается через ARM (Stripe test mode), с доставкой под TR.
**Verified:** 2026-06-29T18:00:00Z
**Status:** human_needed (all automated checks VERIFIED; one item requires live services)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Корзина валидирует сток/цену против ARM (/cart/validate) | VERIFIED | `validateCart()` in `api.ts:235-248` POSTs `{items:[{distributorProductId,quantity}]}` with `currencyHeader()` to `/cart/validate`; basket `page.tsx:78` calls it on items change; checkout `page.tsx:265` calls it on mount |
| 2 | Доставка по TR рассчитывается (/shipping/rates, country=TR default + postalCode) | VERIFIED | `fetchShippingRates()` in `api.ts:263-276` GETs `/shipping/rates` with country/postalCode/items; checkout `page.tsx:288` calls it on step 2 with `form.country` (default `'TR'` at line 133); RadioGroup renders rate options (lines 783-819) |
| 3 | Заказ создаётся в ARM (POST /orders) и оплачивается в Stripe test mode (POST /payment/create-session → Stripe Embedded render) | VERIFIED (code path) | `createOrder` at `api.ts:306-316` POSTs ARM shape with `promoCode`/`country`/`distributorProductId`; `createPaymentSession` at `api.ts:322-333`; checkout `page.tsx:358-410` sequences createOrder → createPaymentSession; `clientSecret`+`publishableKey` branch mounts `<StripeEmbeddedCheckout>` (lines 760-769); `redirectUrl` fallback at line 392. `StripeEmbeddedCheckout.tsx` implements `EmbeddedCheckoutProvider`+`EmbeddedCheckout` via `@stripe/react-stripe-js@^6.6.0`. Live payment requires Portal Stripe test-key setup — documented user_setup gate, not a code defect. |
| 4 | Страница подтверждения показывает заказ (GET /orders/{id}) | VERIFIED | `success/page.tsx:40` calls `fetchOrder(orderId)` from `?order=` query param; renders `order.number`, `fmtMoney(order.total, order.currency)`, `order.status.name` (lines 86-95); no `₽` hardcode |
| 5 | Промокод применяется через ARM (/promo/validate) | VERIFIED | `validatePromo(code, subtotal)` in `api.ts:218-228` POSTs `{code, subtotal}` with `currencyHeader()` to `/promo/validate`; discriminated-union adapter `armToPromoResult` handles all 7 status variants; basket `page.tsx:119` applies it; checkout restores promo from sessionStorage |

**Score:** 5/5 truths verified (automated code-path verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/arm-types.ts` | ARM checkout types (CartValidation, PromoValidation, ShippingRate, OrderCreate, PaymentSession, Order) | VERIFIED | All 7 types present; `ArmPromoValidation` correctly typed as discriminated union matching actual BFF contract (status-based, not `valid:boolean`) |
| `src/lib/arm-adapter.ts` | Adapters ARM→vitrine types | VERIFIED | `armToValidatedCart`, `armToPromoResult` exported; handles edge cases (optional quantity for invalid items, 7 promo status variants) |
| `src/lib/api.ts` | Checkout data-layer on ARM | VERIFIED | All 6 ARM functions present: `validateCart`, `validatePromo`, `fetchShippingRates`, `createOrder`, `createPaymentSession`, `fetchOrder`; OMS functions `searchCdekCities`/`fetchCdekPoints`/`fetchDeliveryServices` absent; no `paymentUrl`/`paymentFields`; `currencyHeader()` injected on cart/promo/shipping/order |
| `src/components/StripeEmbeddedCheckout.tsx` | Stripe Embedded Checkout for Next 14 + MUI | VERIFIED | `loadStripe` memoized on `publishableKey`; `EmbeddedCheckoutProvider`+`EmbeddedCheckout`; MUI `<Box>` wrapper; loaded via `next/dynamic ssr:false` in checkout page |
| `src/app/checkout/page.tsx` | Checkout: shipping-rates selector, ARM-promo, createOrder + Stripe embedded | VERIFIED | CDEK/PayKeeper/RU-countries removed; COUNTRIES list is ISO-2 with `TR` default; `fetchShippingRates` called on step 2; `createOrder`→`createPaymentSession`→embedded/redirect path fully wired |
| `src/app/checkout/success/page.tsx` | Order confirmation from GET /orders/{id} | VERIFIED | `fetchOrder(orderId)` called; `fmtMoney(order.total, order.currency)` — no `₽` hardcode; `clearCart()` called on mount |
| `src/lib/money.ts` | Shared currency formatter | VERIFIED | `fmtMoney(amount, currency)` using `Intl.NumberFormat style:currency` with fallback |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `checkout/page.tsx` | `createOrder → createPaymentSession → StripeEmbeddedCheckout` | ARM orders + payment session | VERIFIED | `createOrder` called at line 358; `createPaymentSession` at line 381; `clientSecret`/`publishableKey` branch sets `paymentSession` state; `<StripeEmbeddedCheckout>` rendered at line 765 |
| `basket/page.tsx` | `validateCart` + `validatePromo` | ARM cart/promo | VERIFIED | Both imported and called; `fmtMoney` used for all monetary display |
| `success/page.tsx` | `fetchOrder(id)` via `?order=` query param | ARM GET /orders/{id} | VERIFIED | `orderId = params.get('order')` at line 20; `fetchOrder(orderId)` at line 40 |
| `api.ts` | ARM route-handler proxy | axios baseURL `/api/storefront` → route-handler injects `X-Storefront-Key` server-side | VERIFIED | `ARM_STOREFRONT_KEY` only in `route.ts` and `server-api.ts` (no `NEXT_PUBLIC_STOREFRONT_KEY` anywhere in `src/`) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `checkout/page.tsx` | `validated`, `subtotal` | `validateCart(items)` → ARM `/cart/validate` | Yes — calls ARM API, no static fallback | FLOWING |
| `checkout/page.tsx` | `shippingRates` | `fetchShippingRates({country, postalCode, items})` → ARM `/shipping/rates` | Yes — gracefully handles `fedex_configured:false` with Alert | FLOWING |
| `checkout/page.tsx` | `paymentSession` | `createPaymentSession(orderId,...)` → ARM `/payment/create-session` | Yes — conditional branch on `clientSecret` vs `redirectUrl` | FLOWING |
| `success/page.tsx` | `order` | `fetchOrder(orderId)` → ARM GET `/orders/{id}` | Yes — no static fallback for order data | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles clean | `npx tsc --noEmit` | Exit 0, zero output (no errors) | PASS |
| CDEK/PayKeeper removed from checkout | `grep CDEK\|PayKeeper\|paymentUrl\|paymentFields checkout/page.tsx` | Empty | PASS |
| RU symbols removed from basket | `grep '₽\|auto_promo\|BOGO' basket/page.tsx` | Empty | PASS |
| `₽` absent in checkout/success | `grep '₽' checkout/page.tsx success/page.tsx` | Empty | PASS |
| Stripe deps present | `grep @stripe package.json` | `@stripe/stripe-js@^9.8.0`, `@stripe/react-stripe-js@^6.6.0` | PASS |
| ARM_STOREFRONT_KEY not in client bundle | `grep NEXT_PUBLIC_STOREFRONT_KEY src/` | Only `ARM_STOREFRONT_KEY` in route-handler and server-api (no NEXT_PUBLIC_ exposure) | PASS |
| Commits claimed in SUMMARY exist | `git log --oneline` | `1115cec`, `b6fd04b`, `9c4188a`, `bb41433`, `f3a7c5c`, `f1501ad` all present | PASS |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| CART-01 | distributorProductId in cart | SATISFIED | `toArm()` maps `productId → distributorProductId`; basket/checkout flow unchanged |
| CART-02 | Cart validates against ARM `/cart/validate` | SATISFIED | `validateCart()` wired in basket and checkout |
| CART-03 | Shipping for TR via `/shipping/rates` | SATISFIED | `fetchShippingRates()` with country=TR default |
| CART-04 | Order created in ARM via `POST /orders` | SATISFIED | `createOrder()` with ARM shape incl. promoCode |
| CART-05 | Stripe test mode payment + confirmation page | SATISFIED (code path) | `createPaymentSession` → embedded or redirect; success page fetches order from ARM |
| CART-06 | Promo code via ARM `/promo/validate` | SATISFIED | `validatePromo(code, subtotal)` in basket and checkout |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `checkout/page.tsx` | 959 | `'TBD'` string as display value for shipping when unavailable | Info | Display label only — not a debt marker in code (no `// TBD` comment); shipping unavailable is a known dev-env limitation per plan decisions |

No `TBD`/`FIXME`/`XXX` debt-marker comments found in phase files. The string `'TBD'` on line 959 is a UI label (shipping display during calculation), not a code debt marker.

### Human Verification Required

#### 1. Full Guest Checkout End-to-End with Stripe Payment

**Test:** Start `make up` (demo BFF on :4000) + `npm run dev`. Configure demo storefront in Portal with `payment_config` containing Stripe test publishable/secret keys and `ui_mode=embedded`. Navigate: catalog → add product to cart → /basket (verify ARM subtotal and fmtMoney display) → /checkout (fill TR address + postal code, observe shipping rates load from ARM, apply a valid promo code if available) → click "Proceed to Payment" → verify `<EmbeddedCheckout>` renders inline → pay with test card `4242 4242 4242 4242` → redirected to `/checkout/success?order=<uuid>` → verify order number, total (in storefront currency), and status shown from `GET /orders/{id}`.

**Expected:** ARM order created, Stripe Embedded Checkout iframe appears inline, after payment success page shows real ARM order data (number, total, status). No `₽` anywhere. No console errors. ARM_STOREFRONT_KEY absent from browser network tab response body.

**Why human:** Requires live demo BFF + configured Stripe test keys in Portal payment_config (a documented user_setup gate). `createPaymentSession` returns 400 until Stripe keys are configured — this is expected per plan. Code path is fully wired; live execution cannot be done without running services.

---

### Gaps Summary

No blocking gaps. All 5 success criteria are VERIFIED at the code-path level. The one human verification item is a runtime/integration check that requires live services and Stripe test-key setup — explicitly documented as a `user_setup` gate in the plan, not a code defect.

**Stripe test-key setup note:** The path `createPaymentSession → clientSecret+publishableKey → EmbeddedCheckout render` is fully implemented. The `redirectUrl` fallback is also implemented for `ui_mode=hosted`. Live payment in test mode requires Portal configuration per the plan's `user_setup` checklist.

---

_Verified: 2026-06-29T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
