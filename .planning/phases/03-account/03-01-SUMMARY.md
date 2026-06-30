---
phase: 03-account
plan: 01
subsystem: auth
tags: [arm-api, localStorage, jwt-bearer, terms-consent, next14, mui]

# Dependency graph
requires:
  - phase: 02-checkout
    provides: axios api client, ARM proxy (route.ts), src/lib/api.ts baseline
provides:
  - "ARM auth session contract: TOKEN_KEY=arm_token, migrateToken, isAuthFailure, bearerHeader, TERMS_VERSION"
  - "FBG AuthContext: customer/loyalty/token/loading/setAuth/signOut/refreshProfile, FBG-50 guard"
  - "login/page.tsx: setAuth-based login flow"
  - "login/register/page.tsx: terms checkbox (AUTH-01) + ARM register + auto-login"
  - "src/app/reset-password/page.tsx: redirect shim for BFF reset-email links"
affects: [03-02, 03-03, checkout (D-06)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FBG-50 guard: isAuthFailure(e) — only 401/403 calls signOut(); 5xx/network preserves session"
    - "Lazy-init token state with SSR-safe window check + migrateToken on AuthProvider mount"
    - "signOut is state-only (no window.location); redirect is caller's responsibility"
    - "Auto-login after register: doLogin(email,password) → setAuth(token,customer,loyalty) → router.push('/')"

key-files:
  created:
    - src/app/reset-password/page.tsx
  modified:
    - src/lib/auth.ts
    - src/lib/auth-context.tsx
    - src/app/login/page.tsx
    - src/app/login/register/page.tsx

key-decisions:
  - "TOKEN_KEY='arm_token', exported; sf_token→arm_token migration via migrateToken() on AuthProvider mount (D-02)"
  - "FBG-50: isAuthFailure guard — only 401/403 drops session; network/5xx preserves it (D-04)"
  - "signOut: state+localStorage clear only, no window.location redirect — caller redirects (D-03)"
  - "login() returns LoginResult without calling setToken; AuthContext.setAuth owns token persistence (D-03)"
  - "terms_accepted+terms_version=TERMS_VERSION='2026-06-30' required in register body (D-07/AUTH-01)"
  - "Reset shim at /reset-password redirects to /login/reset-password?token= (Pitfall 3/AUTH-03)"

patterns-established:
  - "bearerHeader(): Record<string,string> — all protected calls include it; returns {} for guests"
  - "isAuthFailure(err): checks err.response.status === 401|403 — used in mount effect and refreshProfile"
  - "Auto-login after register mirrors FBG pattern (register → doLogin → setAuth → router.push('/'))"
  - "Suspense wrapper for useSearchParams in client components (reset shim)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 5min
completed: 2026-06-30
---

# Phase 03 Plan 01: Auth Contract Summary

**ARM auth session migrated from OMS contract (sf_token, window.location logout) to FBG pattern — TOKEN_KEY='arm_token', isAuthFailure FBG-50 guard, terms-gated registration with auto-login, and BFF reset-email redirect shim**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-30T05:16:56Z
- **Completed:** 2026-06-30T05:21:00Z
- **Tasks:** 3
- **Files modified:** 5 (4 modified + 1 created)

## Accomplishments

- ARM auth/account service contract (`src/lib/auth.ts`): TOKEN_KEY='arm_token', migrateToken, isAuthFailure, bearerHeader, TERMS_VERSION, all ARM types (AuthCustomer/LoyaltyData/CustomerAddress/CustomerOrder/LoginResult), and full protected account functions (getMyAddresses/getMyOrders/updateProfile/changePassword/exportAccount/deleteAccount)
- FBG AuthContext (`src/lib/auth-context.tsx`): customer/loyalty/token/loading/setAuth/signOut/refreshProfile; getMe on mount; FBG-50 guard (only 401/403 calls signOut); signOut is state-only with no redirect
- Terms-gated registration (`login/register/page.tsx`): FormControlLabel+Checkbox agrees to Terms/Privacy, gates submit, sends terms_accepted+terms_version in register body, auto-login after register via setAuth
- Login page (`login/page.tsx`): updated to setAuth flow (replaced refresh), positional login(login,password) args
- Reset-password redirect shim (`src/app/reset-password/page.tsx`): transparently forwards BFF reset-email links from /reset-password to /login/reset-password preserving the token param

## Task Commits

1. **Task 1: ARM auth contract + FBG AuthContext** - `4bb501c` (feat)
2. **Task 2: login + register with terms consent** - `c137186` (feat)
3. **Task 3: reset-password shim + verify forgot/reset imports** - `17ec8fc` (feat)

**Plan metadata:** (docs commit hash — see below)

## Files Created/Modified

- `src/lib/auth.ts` — ARM auth/account service: TOKEN_KEY='arm_token', migrateToken, isAuthFailure, bearerHeader, TERMS_VERSION, ARM types, register(+terms)/login(positional)/getMe(throws)/forgotPassword/resetPassword + all protected account functions with bearerHeader
- `src/lib/auth-context.tsx` — FBG AuthContext: customer/loyalty/token/loading/setAuth/signOut/refreshProfile; lazy-init with migrateToken; getMe on mount; FBG-50 guard via isAuthFailure; signOut state-only
- `src/app/login/page.tsx` — login now uses setAuth instead of refresh; doLogin(login,password) positional; needsReset handled without email field
- `src/app/login/register/page.tsx` — added FormControlLabel+Checkbox terms gate; register sends terms_accepted+terms_version; auto-login after register; agreed added to isValid
- `src/app/reset-password/page.tsx` (CREATED) — redirect shim: useSearchParams + router.replace → /login/reset-password?token=X; wrapped in Suspense

## Decisions Made

- Followed plan exactly: `login()` returns `LoginResult` without storing token (AuthContext.setAuth owns persistence, D-03)
- `signOut()` does no redirect — login/register pages call `router.push('/')` after `setAuth()`, account pages call `router.replace('/login')` from useEffect
- `needsReset` branch in login now redirects to `/login/forgot-password` without email pre-fill (LoginResult has no `email` field — this is fine, user types email again)
- Reset shim uses `encodeURIComponent(token)` for safety (token is URL-safe but encoding is defensive)
- forgot-password and reset-password pages required zero changes — their imports and function signatures were already ARM-compatible

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- tsc errors in `account/*`, `checkout/page.tsx`, `Header.tsx`, `ProductReviews.tsx` after Task 1 — expected per plan ("потребители старого API (`isLogged`/`logout`/`refresh`) дадут ошибки tsc — это ожидаемо; их чинят планы 03-02/03-03"). login/* and lib/auth* have zero tsc errors.

## Known Stubs

- `/terms` and `/privacy` routes referenced in the terms checkbox link to pages that do not yet exist — legal content is Phase 5 (D-08). The routes returning 404 or Next.js default behavior is acceptable for now.

## Threat Surface Scan

No new network endpoints introduced. The reset-password shim is a client-side redirect only (no server action, no API call). Threat model in PLAN.md §threat_model covers all surfaces.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plans 03-02 and 03-03 (Wave 2) can now start; they depend on the contracts in auth.ts and auth-context.tsx established here
- Account pages (`account/page.tsx`, `account/orders/*`, `account/settings/page.tsx`) still use old isLogged/logout/refresh — 03-02/03-03 will fix these
- `src/components/Header.tsx` and `src/components/ProductReviews.tsx` use `isLogged`/`logout` — also in scope of 03-02/03-03
- Full green tsc + build is gated at end of Wave 2 (after 03-02 + 03-03 complete)

---
## Self-Check: PASSED

All 5 files found. All 3 task commits verified (4bb501c, c137186, 17ec8fc).

*Phase: 03-account*
*Completed: 2026-06-30*
