---
phase: 03-account
plan: 02
subsystem: account-ui
tags: [arm-api, account, orders, addresses, mui, next14, fmtMoney, customer-guard]

# Dependency graph
requires:
  - phase: 03-01
    provides: "ARM auth session contract: customer/signOut/loading from AuthContext; CustomerOrder/CustomerAddress types; getMyOrders/getMyOrder/getMyAddresses/addMyAddress/deleteMyAddress with bearerHeader"
provides:
  - "account/page.tsx: customer-guard dashboard with signOut + /account/addresses navigation"
  - "account/orders/page.tsx: ARM order list (CustomerOrder, fmtMoney, track_url, no CDEK/₽)"
  - "account/orders/[id]/page.tsx: ARM order detail (CustomerOrder, simplified, no OMS fields)"
  - "account/addresses/page.tsx: NEW — address book list/add/delete against /auth/me/addresses"
affects: [03-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "customer-guard: useEffect([loading,customer,router]) → router.replace('/login') if !customer"
    - "signOut+router.push: logout button calls signOut() then router.push('/') (D-03)"
    - "fmtMoney(Number(total), currency) replaces toLocaleString('ru-RU') + ₽ (TR market)"
    - "track_url: ARM provides full URL — render LocalShipping IconButton only when track_url present"
    - "getMyOrder unwrap: .then(({ data }) => setOrder(data)) — ARM shape { data: CustomerOrder }"
    - "Optimistic delete: filter state immediately, refetch on error"

key-files:
  created:
    - src/app/account/addresses/page.tsx
  modified:
    - src/app/account/page.tsx
    - src/app/account/orders/page.tsx
    - src/app/account/orders/[id]/page.tsx

key-decisions:
  - "signOut+router.push pattern: signOut() is state-only (D-03); account page handles redirect to /"
  - "orders/[id] simplified: CustomerOrder has no OMS fields (subtotal/discount/promo/delivery_service) — only total/vat_amount/currency/track_url/items retained"
  - "getMyOrder returns { data: CustomerOrder } — unwrapped .data on mount (was bug in original code using pre-03-01 shape)"
  - "Date locale changed ru-RU → en-GB (TR market; plan said ARM/TRY but locale was incidentally fixed)"
  - "addresses/page.tsx: optimistic delete + refetch on error for resilience"
  - "settings/page.tsx still uses isLogged/refresh — explicitly 03-03 scope, not fixed here"

requirements-completed: [AUTH-04, AUTH-05]

# Metrics
duration: 4min
completed: 2026-06-30
---

# Phase 03 Plan 02: Account UI — Orders + Addresses Summary

**Account dashboard, order history and address book rewired to ARM — customer-guard replaces isLogged, fmtMoney/track_url replace CDEK/₽, new address book page created**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-30T05:25:32Z
- **Completed:** 2026-06-30T05:29:37Z
- **Tasks:** 3
- **Files modified:** 3 modified + 1 created

## Accomplishments

- `account/page.tsx`: Replaced `isLogged/logout` with `customer/signOut` from new AuthContext (03-01). Auth guard updated (`!customer`). Logout button calls `signOut()+router.push('/')`. Added "Адреса доставки" menu item with LocationOn icon → `/account/addresses`.
- `account/orders/page.tsx`: Replaced OMS data layer with ARM contract — `CustomerOrder` type, `getMyOrders`, `fmtMoney(total, currency)`, `track_url` icon. Removed `CDEK_TRACK_URL`, `delivery_service` column, Russian ruble formatting. Auth guard uses `customer`.
- `account/orders/[id]/page.tsx`: Complete data-layer rewrite — `CustomerOrder`, `getMyOrder` with correct `{ data }` unwrap, `fmtMoney`. Removed all OMS-only fields (`delivery_service`, `delivery_tariff_type`, `shipping_*`, `recipient_*`, `subtotal`, `discount`, `promo_*`, `payment_status`). Totals show items subtotal (computed from items) + vat_amount (if present) + total.
- `account/addresses/page.tsx` (CREATED — AUTH-05): Full address book with auth-guard, `getMyAddresses` on mount, `addMyAddress` via Dialog form (label/city/address/building/apt/postal_code/contact_name/contact_phone/is_default), optimistic `deleteMyAddress` with refetch on error. Default-address badge. Snackbar feedback.

## Task Commits

1. **Task 1: account/page.tsx — customer-guard, signOut, addresses nav** — `b785a1c`
2. **Task 2: orders list+detail — ARM CustomerOrder, fmtMoney, track_url** — `053be6b`
3. **Task 3: addresses/page.tsx — list/add/delete (AUTH-05)** — `d08a61a`

## Files Created/Modified

- `src/app/account/page.tsx` — customer-guard on loading+customer; signOut()+router.push('/') on logout; Адреса доставки menu item with LocationOn icon
- `src/app/account/orders/page.tsx` — ARM: CustomerOrder, getMyOrders, fmtMoney, track_url icon; removed CDEK/₽/delivery_service
- `src/app/account/orders/[id]/page.tsx` — ARM: CustomerOrder, getMyOrder(.data unwrap), fmtMoney; removed all OMS fields; simplified delivery section (track_url only)
- `src/app/account/addresses/page.tsx` (CREATED) — address book: list/add/delete with auth-guard, Dialog form, optimistic delete, Snackbar feedback

## Decisions Made

- `account/orders/[id]` simplified to CustomerOrder fields only — the original `OrderDetail` type had 20+ OMS-specific shipping/payment fields that ARM does not provide. Items subtotal computed from `sum(unit_price * quantity)` inline.
- Date locale changed from `ru-RU` to `en-GB` (fits TR market target; was an incidental fix not in plan).
- `account/settings/page.tsx` still uses `isLogged/refresh` — it is explicitly 03-03 scope and untouched here.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] getMyOrder was not unwrapping .data from ARM response**
- **Found during:** Task 2
- **Issue:** Original `[id]/page.tsx` called `getMyOrder(id).then((o) => setOrder(o))` — but new `auth.ts` (03-01) defines `getMyOrder` returning `Promise<{ data: CustomerOrder }>`. Using the raw response would set `order` to `{ data: ... }` instead of `CustomerOrder`.
- **Fix:** Changed to `.then(({ data }) => setOrder(data))` — matches the ARM return shape.
- **Files modified:** `src/app/account/orders/[id]/page.tsx`
- **Commit:** `053be6b`

None beyond the above auto-fix — plan executed as written for all other tasks.

## Known Stubs

None — all data comes from live ARM endpoints (`/auth/me/orders`, `/auth/me/addresses`). The address page gracefully handles empty responses with a helpful empty state.

## Threat Surface Scan

No new network endpoints introduced. All calls go through existing `/api/storefront/auth/me/*` proxy route established in Phase 2. All protected calls include `bearerHeader()` via `auth.ts` contract.

T-03-06 (elevation of privilege) mitigation: `customer` auth-guard + `bearerHeader()` on all calls — present in all 4 files.
T-03-07/T-03-08 (IDOR/tampering) — transferred to BFF: `requireCustomer()` scopes results to session JWT; client never passes `customer_id`.

---
## Self-Check: PASSED

Files verified:
- FOUND: /home/lexun/work/puz/ACTR/src/app/account/page.tsx
- FOUND: /home/lexun/work/puz/ACTR/src/app/account/orders/page.tsx
- FOUND: /home/lexun/work/puz/ACTR/src/app/account/orders/[id]/page.tsx
- FOUND: /home/lexun/work/puz/ACTR/src/app/account/addresses/page.tsx

Commits verified: b785a1c, 053be6b, d08a61a

*Phase: 03-account*
*Completed: 2026-06-30*
