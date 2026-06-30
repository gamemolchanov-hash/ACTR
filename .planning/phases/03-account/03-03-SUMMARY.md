---
phase: 03-account
plan: 03
subsystem: settings-gdpr-checkout
tags: [arm-api, gdpr, kvkk, settings, checkout, mui, next14, auth-06, auth-07, d-05, d-06]

# Dependency graph
requires:
  - phase: 03-01
    provides: "AUTH contract: customer/signOut/refreshProfile/bearerHeader/exportAccount/deleteAccount/changePassword/updateProfile"
  - phase: 03-02
    provides: "account UI patterns: customer-guard, fmtMoney, ARM order/address shapes"
provides:
  - "settings/page.tsx: profile+password (AUTH-06) + GDPR Danger Zone export/delete (AUTH-07)"
  - "api.ts createOrder: bearerHeader() — order linked to customer JWT (D-06)"
  - "checkout/page.tsx: customer-guard, getMyAddresses unwrap, isLogged cleared (D-05/D-06)"
  - "Header.tsx + ProductReviews.tsx: isLogged/logout → customer/signOut (ARM auth context)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FBG-22/T-03-10: changePassword success → signOut()+router.push('/login') after 2s (session invalidation)"
    - "GDPR export: exportAccount() → Blob → <a download='american-creator-account-data.json'> (Art.20)"
    - "GDPR delete: MUI Dialog + mandatory password field → deleteAccount({password}) → signOut()+router.push('/') (Art.17/T-03-12)"
    - "bearerHeader() spread into createOrder headers — guest returns {} (backward-compat), logged-in sends Authorization"
    - "getMyAddresses() .then({ data: addrs }) — unwrap ARM envelope before setSavedAddresses"

key-files:
  created: []
  modified:
    - src/app/account/settings/page.tsx
    - src/lib/api.ts
    - src/app/checkout/page.tsx
    - src/components/Header.tsx
    - src/components/ProductReviews.tsx
    - src/components/__tests__/ProductReviews.test.tsx

key-decisions:
  - "FBG-22: after successful changePassword → setTimeout 2s → signOut()+router.push('/login') (BFF tokens_valid_after invalidation)"
  - "GDPR delete dialog: mandatory password field gates confirm button; error surfaced via snackbar"
  - "createOrder bearerHeader spread: {} for guest preserves Phase 2 behavior (D-05/D-06)"
  - "getMyAddresses unwrap: .then({ data: addrs }) instead of .then((addrs)) — ARM returns envelope {data:[]}"
  - "Header/ProductReviews: !!customer boolean replaces isLogged; signOut replaces logout (D-03)"
  - "ProductReviews.test: mock updated customer→AuthCustomer | null (was isLogged: boolean)"

requirements-completed: [AUTH-06, AUTH-07]

# Metrics
duration: 4min
completed: 2026-06-30
---

# Phase 03 Plan 03: Settings + GDPR + Checkout Linking Summary

**Profile and password settings on ARM (AUTH-06), GDPR/KVKK export and account deletion (AUTH-07), checkout order linking via bearerHeader (D-05/D-06), and full clearance of isLogged/logout from codebase (Wave 2 green build)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-30T05:36:23Z
- **Completed:** 2026-06-30T05:41:17Z
- **Tasks:** 3
- **Files modified:** 6 (5 modified + 1 test updated)

## Accomplishments

- `settings/page.tsx` (Task 1): replaced `isLogged/refresh` with `customer/refreshProfile/signOut` from ARM AuthContext (03-01). Auth guard on `!customer`. Profile save calls `refreshProfile()`. Password change implements FBG-22/T-03-10: after success shows snack "Пароль изменён. Войдите заново." then `signOut()+router.push('/login')` after 2s. `wrong_password` BFF error code mapped to specific UI message.

- `settings/page.tsx` (Task 2): GDPR Danger Zone section added below password panel. Export (GDPR Art.20): `exportAccount()` → `Blob` → `<a download='american-creator-account-data.json'>` → click → `revokeObjectURL`. Delete (GDPR Art.17/T-03-12): "Delete Account" button opens MUI Dialog with mandatory password field; confirm calls `deleteAccount({password})` → `signOut()+router.push('/')`. Cancel/error via snackbar.

- `api.ts` (Task 3): `bearerHeader` imported from `./auth`; added to `createOrder` as `{ ...currencyHeader(), ...bearerHeader() }`. Guest checkout unchanged (bearerHeader() returns `{}`); logged-in user sends `Authorization: Bearer <token>` → ARM proxy forwards → ARM links order to customer account (D-06).

- `checkout/page.tsx` (Task 3): `isLogged` removed from useAuth destructure; load-addresses effect guard changed from `!isLogged || !customer` to `!customer`; `getMyAddresses()` unwrapped via `.then({ data: addrs })` (Rule-1 bug fix — was passing `{ data: [] }` object as `CustomerAddress[]`); `savedAddresses` render and guest prompt use `customer` boolean.

- `Header.tsx` + `ProductReviews.tsx` (Task 3): All `isLogged` references replaced with `!!customer`; `logout` calls replaced with `signOut`. `ProductReviews.test.tsx` mock updated from `{isLogged: bool}` to `{customer: AuthCustomer|null}`.

## Task Commits

1. **Task 1: settings profile+password on ARM (AUTH-06)** — `5586bc6`
2. **Task 2: settings GDPR Danger Zone export+delete (AUTH-07)** — `db7c088`
3. **Task 3: api.ts bearerHeader + checkout isLogged clearance + Header/Reviews** — `69df01b`

## Files Created/Modified

- `src/app/account/settings/page.tsx` — customer-guard; refreshProfile; changePassword FBG-22 signOut; GDPR export (Blob download); GDPR delete (Dialog+password confirm→signOut+redirect)
- `src/lib/api.ts` — createOrder: `{ ...currencyHeader(), ...bearerHeader() }` (D-06 order linking)
- `src/app/checkout/page.tsx` — isLogged removed; getMyAddresses unwrap fixed (Rule-1); !!customer guards; dep-array cleaned
- `src/components/Header.tsx` — isLogged/logout → !!customer/signOut (ARM auth context D-03)
- `src/components/ProductReviews.tsx` — isLogged → !!customer
- `src/components/__tests__/ProductReviews.test.tsx` — mock: isLogged:bool → customer:AuthCustomer|null

## Decisions Made

- `changePassword` success path uses `setTimeout(2000)` before `signOut+redirect` so the user sees the confirmation snack before being sent to login (UX + FBG-22 compliance).
- Delete Account Dialog: confirm button is disabled when `deletePassword` is empty — enforces re-auth requirement (T-03-12) without need for server round-trip.
- `getMyAddresses` unwrap: `.then({ data: addrs })` matches `auth.ts` return type `Promise<{ data: CustomerAddress[] }>`. The existing code was passing the full envelope object to `setSavedAddresses` — this is a Rule-1 bug fixed inline.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] getMyAddresses result was not unwrapped in checkout/page.tsx**
- **Found during:** Task 3 (TypeScript check)
- **Issue:** `getMyAddresses().then((addrs) => { setSavedAddresses(addrs) }` — `addrs` is `{ data: CustomerAddress[] }`, not `CustomerAddress[]`. TypeScript error + runtime: `.find()` would throw on object.
- **Fix:** Changed to `.then(({ data: addrs }) => { setSavedAddresses(addrs || []) }` with safe fallback.
- **Files modified:** `src/app/checkout/page.tsx`
- **Commit:** `69df01b`

**2. [Rule 2 - Scope Extension] Header.tsx + ProductReviews.tsx + test fixed**
- **Found during:** Task 3 (verification criterion `grep -rn "isLogged" src/` → пусто)
- **Issue:** Plan verification requires zero `isLogged` in `src/`. Header.tsx and ProductReviews.tsx were noted in 03-01 SUMMARY as "in scope of 03-02/03-03"; 03-02 did not address them.
- **Fix:** Replaced `isLogged/logout` with `!!customer/signOut` in Header.tsx; `isLogged` with `!!customer` in ProductReviews.tsx; updated test mock.
- **Files modified:** Header.tsx, ProductReviews.tsx, ProductReviews.test.tsx
- **Commit:** `69df01b`

## Known Stubs

None — all data wired to live ARM endpoints. Export/delete are server-side and require valid JWT.

## Threat Surface Scan

No new network endpoints introduced. All auth-related calls go through existing `/api/storefront/auth/me/*` proxy.

T-03-10 mitigated: changePassword success triggers `signOut()+router.push('/login')` — pre-change tokens can no longer be reused.
T-03-11 mitigated: exportAccount/deleteAccount both use `bearerHeader()` via auth.ts; BFF `requireCustomer()` verifies JWT.
T-03-12 mitigated: Delete Account Dialog enforces mandatory password field; button disabled until `deletePassword` non-empty.
T-03-13 accepted: export blob downloaded to user's own browser (`<a download>`), not logged or shared.

---
## Self-Check: PASSED

Files verified:
- FOUND: /home/lexun/work/puz/ACTR/src/app/account/settings/page.tsx
- FOUND: /home/lexun/work/puz/ACTR/src/lib/api.ts
- FOUND: /home/lexun/work/puz/ACTR/src/app/checkout/page.tsx
- FOUND: /home/lexun/work/puz/ACTR/src/components/Header.tsx
- FOUND: /home/lexun/work/puz/ACTR/src/components/ProductReviews.tsx
- FOUND: /home/lexun/work/puz/ACTR/src/components/__tests__/ProductReviews.test.tsx

Commits verified: 5586bc6, db7c088, 69df01b

*Phase: 03-account*
*Completed: 2026-06-30*
