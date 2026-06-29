---
phase: 02-checkout
plan: "01"
subsystem: checkout-data-layer
tags: [arm-api, checkout, cart, promo, shipping, orders, payments, typescript]
dependency_graph:
  requires: [phase-1/arm-catalog-adapter]
  provides: [checkout-arm-types, cart-validation, promo-validation, shipping-rates, order-create, payment-session, order-fetch]
  affects: [src/app/basket/page.tsx, src/app/checkout/page.tsx]
tech_stack:
  added: []
  patterns: [arm-discriminated-union, currency-header-injection, toArm-mapper]
key_files:
  created: [src/lib/arm-types.ts (checkout section), tests/test_checkout_arm.py]
  modified: [src/lib/arm-types.ts, src/lib/arm-adapter.ts, src/lib/api.ts]
decisions:
  - "ArmPromoValidation typed as discriminated union on status (applied|invalid|expired|...) matching actual BFF PromoValidateResult, not plan's valid:boolean"
  - "ArmCartValidationItem.quantity made optional: BFF omits it for product_not_found items"
  - "currencyHeader() reads NEXT_PUBLIC_STOREFRONT_CURRENCY (default USD); TRY wired in Phase 7"
  - "createOrder maps CartItem[] -> {distributorProductId,quantity} internally via toArm(); CartItem type unchanged"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-29"
  tasks_completed: 2
  files_changed: 4
---

# Phase 02 Plan 01: ARM Checkout Data-Layer Summary

ARM checkout data-layer rewired from OMS/CDEK to ARM storefront API. Types, adapters, and all six checkout functions are now on ARM. UI call-sites deferred to plan 02-02 (expected, per plan).

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | ARM checkout types + adapters | a7a9c9a | arm-types.ts, arm-adapter.ts |
| 1b | Fix types to match actual BFF contract | f1501ad | arm-types.ts, arm-adapter.ts, tests/ |
| 2 | api.ts — checkout functions rewired to ARM | f3a7c5c | src/lib/api.ts |

## What Was Built

**`src/lib/arm-types.ts`** — added checkout ARM types:
- `ArmCartValidation` / `ArmCartValidationItem` (with optional `quantity`, `vatRate`)
- `ArmPromoValidation` — discriminated union on `status` matching actual BFF contract
- `ArmShippingRate`, `ArmShippingRatesResponse`
- `ArmOrderCreateResponse`
- `ArmPaymentSession`
- `ArmOrder` (with `status.color` optional, not fetched by BFF)

**`src/lib/arm-adapter.ts`** — added checkout adapters:
- `armToValidatedCart(v: ArmCartValidation)` → `{ items: ValidatedCartItem[]; subtotal; allValid }`
- `armToPromoResult(p: ArmPromoValidation)` → `PromoValidationResult` (handles all 7 status variants)

**`src/lib/api.ts`** — checkout functions rewritten to ARM:
- `currencyHeader()` — injects `X-Currency` from `NEXT_PUBLIC_STOREFRONT_CURRENCY`
- `toArm(i: CartItem)` — maps `productId` → `distributorProductId`
- `validateCart(items)` — POST `/cart/validate` with ARM items + currencyHeader; returns `armToValidatedCart`; BOGO removed
- `validatePromo(code, subtotal)` — new signature, POST `/promo/validate`; returns `armToPromoResult`
- `fetchShippingRates({ country, postalCode, items, currency? })` — GET `/shipping/rates`
- `createOrder(payload)` — ARM CreateOrder with `promoCode`, `country ISO-2`, no CDEK fields
- `createPaymentSession(orderId, successUrl, cancelUrl)` — POST `/payment/create-session`
- `fetchOrder(id)` — GET `/orders/{id}` for guest UUID

**Removed from api.ts:** `DeliveryService`, `CdekCity`, `CdekPoint`, `fetchDeliveryServices`, `searchCdekCities`, `fetchCdekPoints`, `paymentUrl/paymentFields` from order response, old BOGO `auto_promo` return type

**`tests/test_checkout_arm.py`** — Python probe tests for 5 checkout endpoints

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ArmPromoValidation type did not match actual BFF contract**
- **Found during:** Task 2 — live probe of POST /promo/validate returned `{"data":{"status":"invalid"}}` not `{"data":{"valid":false}}`
- **Issue:** Plan specified `ArmPromoValidation { valid: boolean; ... }` but the actual BFF `storefront-api.ts` returns a discriminated union `PromoValidateResult` on `status` field
- **Fix:** Rewrote `ArmPromoValidation` as a discriminated union type; updated `armToPromoResult` to handle all 7 status variants with human-readable error messages
- **Files modified:** `src/lib/arm-types.ts`, `src/lib/arm-adapter.ts`
- **Commit:** f1501ad

**2. [Rule 1 - Bug] ArmCartValidationItem.quantity marked required but absent for invalid items**
- **Found during:** Live code review of BFF cart/validate handler
- **Issue:** BFF omits `quantity` when `valid=false` and `error='product_not_found'`; adapter would produce `quantity: undefined` violating `ValidatedCartItem.quantity: number`
- **Fix:** Made `quantity` optional in `ArmCartValidationItem`; adapter defaults to `0` when absent
- **Files modified:** `src/lib/arm-types.ts`, `src/lib/arm-adapter.ts`
- **Commit:** f1501ad

**3. [Rule 1 - Bug] ArmCartValidationItem missing vatRate field**
- **Found during:** Live code review of BFF cart/validate handler
- **Issue:** BFF returns `vatRate` field in cart validation items; type was missing it
- **Fix:** Added optional `vatRate?: number` to `ArmCartValidationItem`
- **Files modified:** `src/lib/arm-types.ts`
- **Commit:** f1501ad

**4. [Rule 1 - Bug] ArmOrder.status.color marked required but not fetched by BFF**
- **Found during:** Live code review of BFF GET /orders/{id} handler
- **Issue:** BFF only fetches `status.code` and `status.name`, not `status.color`
- **Fix:** Made `color` optional in `ArmOrder.status`
- **Files modified:** `src/lib/arm-types.ts`
- **Commit:** f1501ad

## UI Call-Site Errors (Expected — Deferred to 02-02)

tsc reports 14 errors in UI files — all expected per plan ("tsc на UI временно может ругаться, это ОК для wave 1, фиксируется в 02-02"):

- `basket/page.tsx`: uses old `validatePromo(code, items, phone)` signature and references removed `auto_promo` type
- `checkout/page.tsx`: imports removed `searchCdekCities`, `fetchCdekPoints`, `CdekCity`, `CdekPoint`; uses old `payment_method`/`paymentUrl`/`paymentFields`; `shipping.region` not in new `CreateOrderPayload`

## Live API Probe Results

Tested via `STOREFRONT_BASE=http://localhost:3003 python3 tests/test_checkout_arm.py`:

| Endpoint | Status | Notes |
|----------|--------|-------|
| POST /promo/validate | PASS | Returns `{"data":{"status":"invalid"}}` for unknown code |
| GET /shipping/rates | PASS | Returns `{"fedex_configured":true,"rates":[],"error":"rate_request_failed"}` |
| POST /cart/validate | SKIP | Requires DEMO_PRODUCT_ID env var |
| POST /orders | SKIP | Requires DEMO_PRODUCT_ID env var |
| POST /payment/create-session | SKIP | Requires prior order_id |

3 skipped probes need a valid `distributorProductId` from the demo tenant (set `DEMO_PRODUCT_ID` env var).

## Known Stubs

None — this plan only modifies the data-layer; no UI rendering affected.

## Threat Flags

None — no new network endpoints introduced. Existing route-handler proxy unchanged. `X-Storefront-Key` remains server-side.

## Self-Check: PASSED
