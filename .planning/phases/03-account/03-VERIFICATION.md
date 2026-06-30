---
phase: 03-account
verified: 2026-06-30T11:00:00Z
status: passed
score: 4/4 must-haves verified
human_uat: "Completed 2026-06-30 (03-UAT.md): 4/5 live checks PASS (register+terms+auto-login, login, reset-shim, GDPR export). Test 5 (GDPR delete) — ACTR side passes (password gate, wrong-password error, correct request); final server-side anonymization blocked by a demo-tenant Directus schema (arm_customers.name NOT NULL), not ACTR code. Two demo-env gaps surfaced: BFF empty JWT secret (FIXED) and demo-tenant name NOT NULL (tracked as provisioning/compliance todo). Owner accepted closure 2026-06-30."
overrides_applied: 0
human_verification:
  - test: "Register with unchecked terms → login → arm_token in localStorage"
    expected: "Submitting register form without checking the terms checkbox shows snackbar error and does NOT call ARM. After checking and submitting, arm_token appears in localStorage and user is redirected to /"
    why_human: "Form gate logic and localStorage write require browser + running BFF; static grep confirms the gate code and setAuth call exist but cannot confirm runtime behavior"
  - test: "Login with email and password → arm_token in localStorage"
    expected: "Successful login stores token in localStorage['arm_token'], user is redirected to /"
    why_human: "Requires browser + running BFF at :4000 to execute the POST /auth/login flow end-to-end"
  - test: "Forgot-password → email flow → reset-password shim redirect"
    expected: "POST /auth/forgot-password returns success message. Opening /reset-password?token=X in browser immediately redirects to /login/reset-password?token=X without rendering any content"
    why_human: "Shim uses client-side router.replace in useEffect — requires browser to confirm the redirect executes correctly and the token param is preserved"
  - test: "GDPR export downloads american-creator-account-data.json"
    expected: "Clicking 'Download My Data' on /account/settings triggers a browser file download of a valid JSON file named american-creator-account-data.json containing account data from ARM"
    why_human: "Blob creation and <a download> click sequence requires a running browser and valid JWT from the demo-BFF"
  - test: "GDPR delete with password confirmation"
    expected: "Confirm button in Delete Account dialog is disabled when password field is empty. Entering correct password and confirming calls deleteAccount, then signOut + redirect to /. Entering wrong password shows error snackbar."
    why_human: "Requires browser with valid session and running BFF to test the delete endpoint and session termination behavior"
---

# Phase 03: Account on ARM — Verification Report

**Phase Goal:** Покупатель регистрируется/логинится и управляет аккаунтом против ARM.
**Verified:** 2026-06-30T11:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Регистрация с согласием и логин работают (`arm_token`) | ✓ VERIFIED | `TOKEN_KEY='arm_token'` in auth.ts:84; terms gate in register/page.tsx:149-157; `register({…terms_accepted:true,terms_version:TERMS_VERSION})` at :162; auto-login via `doLogin→setAuth` at :171-173; `login/page.tsx` uses `setAuth` at :103; `bearerHeader()` and `isAuthFailure()` exported from auth.ts; AuthContext exposes `customer/loyalty/token/loading/setAuth/signOut/refreshProfile`; FBG-50 guard in auth-context.tsx:100-103 |
| 2 | Сброс пароля по email работает | ✓ VERIFIED | `forgotPassword(email)` at auth.ts:159; `resetPassword(token,password)` at auth.ts:164; `/reset-password/page.tsx` redirect shim created (929 bytes), calls `router.replace('/login/reset-password?token=…')` in useEffect; forgot-password/page.tsx imports `forgotPassword` from `@/lib/auth`; reset-password/page.tsx imports `resetPassword` from `@/lib/auth` |
| 3 | ЛК показывает заказы, адреса, профиль; смена пароля работает | ✓ VERIFIED | `account/page.tsx`: customer-guard + `signOut()+router.push('/')` + `/account/addresses` nav item; `orders/page.tsx`: `getMyOrders` + `fmtMoney(Number(order.total), order.currency)` + `safeHttpUrl(order.track_url)` icon; `orders/[id]/page.tsx`: `getMyOrder` with `.then(({ data })=>setOrder(data))` unwrap + `fmtMoney`; `addresses/page.tsx`: new file (14 816 bytes) with `getMyAddresses/addMyAddress/deleteMyAddress` + auth-guard; `settings/page.tsx`: `updateProfile→refreshProfile` + `changePassword→signOut+router.push('/login')` (FBG-22) after 2 s; no `delivery_service/CDEK/₽/toLocaleString('ru-RU')` in account/orders/ (grep confirms empty) |
| 4 | Экспорт и удаление аккаунта (GDPR/KVKK) работают | ✓ VERIFIED | `exportAccount()` at auth.ts:234 with `bearerHeader()`; `deleteAccount({password})` at auth.ts:239 with `bearerHeader()`; settings/page.tsx:139-147 creates `Blob` → `<a download='american-creator-account-data.json'>` → click → `revokeObjectURL`; delete dialog confirm button gated by `disabled={!deletePassword || deleting}` at :475; `deleteAccount` success → `signOut()+router.push('/')` at :162 |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/auth.ts` | ARM auth/account service contract | ✓ VERIFIED | 258 lines; exports TOKEN_KEY, migrateToken, isAuthFailure, bearerHeader, TERMS_VERSION, all ARM types, all protected account functions |
| `src/lib/auth-context.tsx` | FBG AuthContext with FBG-50 guard | ✓ VERIFIED | 115 lines; exports AuthProvider+useAuth; context shape customer/loyalty/token/loading/setAuth/signOut/refreshProfile; isAuthFailure guard in mount effect and refreshProfile |
| `src/app/login/register/page.tsx` | Terms checkbox + ARM register + auto-login | ✓ VERIFIED | FormControlLabel+Checkbox at :400-430; `agreed` gates submit at :149-157; register sends terms_accepted+terms_version; auto-login via setAuth at :171-173 |
| `src/app/reset-password/page.tsx` | Redirect shim for BFF reset-email links | ✓ VERIFIED | Created (929 bytes); Suspense-wrapped useEffect calls router.replace with token forwarding |
| `src/app/account/page.tsx` | Customer-guard dashboard + signOut + addresses nav | ✓ VERIFIED | customer/loading/signOut from useAuth; useEffect guard at :45-47; signOut()+router.push('/') at :132; "Адреса доставки"→/account/addresses menu item |
| `src/app/account/orders/page.tsx` | ARM order list (fmtMoney, track_url) | ✓ VERIFIED | getMyOrders + CustomerOrder type; fmtMoney at :243; safeHttpUrl(order.track_url) at :214; no CDEK/₽ |
| `src/app/account/orders/[id]/page.tsx` | ARM order detail (no OMS fields) | ✓ VERIFIED | getMyOrder with .data unwrap at :50; fmtMoney throughout; safeHttpUrl(order.track_url) at :150; no OMS-specific fields |
| `src/app/account/addresses/page.tsx` | NEW address book list/add/delete | ✓ VERIFIED | Created (14 816 bytes); getMyAddresses on mount; addMyAddress via Dialog; optimistic deleteMyAddress with refetch on error; auth-guard; "Default" badge |
| `src/app/account/settings/page.tsx` | Profile+password (AUTH-06) + GDPR Danger Zone (AUTH-07) | ✓ VERIFIED | updateProfile→refreshProfile; changePassword→signOut FBG-22; exportAccount Blob download; deleteAccount Dialog with mandatory password field |
| `src/lib/api.ts` | createOrder with bearerHeader() | ✓ VERIFIED | `bearerHeader` imported at :87; spread into createOrder headers at :317 |
| `src/app/checkout/page.tsx` | customer-guard; getMyAddresses unwrap; no isLogged | ✓ VERIFIED | `const { customer } = useAuth()` at :176; guard `if (!hydrated || !customer) return` at :221; getMyAddresses().then({ data: addrs }) at :228; zero isLogged references |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `auth-context.tsx` | `getMe/isAuthFailure/migrateToken/TOKEN_KEY` | import from './auth' | ✓ WIRED | auth-context.tsx:5-11 |
| `login/page.tsx` | `setAuth(token,customer,loyalty)` | useAuth() | ✓ WIRED | login/page.tsx:75,103 |
| `auth.ts` | `/api/storefront/auth/*` | axios `api` instance | ✓ WIRED | POST /auth/register, /auth/login, /auth/forgot-password, /auth/reset-password; GET /auth/me with bearerHeader |
| `orders/page.tsx` | `getMyOrders → /api/storefront/auth/me/orders` | auth.ts + bearerHeader | ✓ WIRED | orders/page.tsx:25,46 |
| `addresses/page.tsx` | `getMyAddresses/addMyAddress/deleteMyAddress → /auth/me/addresses` | auth.ts + bearerHeader | ✓ WIRED | addresses/page.tsx:31-35 |
| `settings/page.tsx` | `exportAccount/deleteAccount/updateProfile/changePassword → /auth/me/*` | auth.ts + bearerHeader | ✓ WIRED | settings/page.tsx:23 |
| `api.ts createOrder` | `POST /orders with Authorization` | bearerHeader() spread | ✓ WIRED | api.ts:87,317 |
| `checkout/page.tsx` | `customer (useAuth) + getMyAddresses` | auth-context from 03-01 | ✓ WIRED | checkout/page.tsx:176,228-246 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `orders/page.tsx` | `orders: CustomerOrder[]` | `getMyOrders(page, 10)` → GET /auth/me/orders with bearerHeader | Yes — ARM API call with JWT | ✓ FLOWING |
| `orders/[id]/page.tsx` | `order: CustomerOrder` | `getMyOrder(id).then(({data})=>setOrder(data))` → GET /auth/me/orders/:id | Yes — ARM API with JWT, .data unwrap correct | ✓ FLOWING |
| `addresses/page.tsx` | `addresses: CustomerAddress[]` | `getMyAddresses().then(({data})=>setAddresses(data||[]))` | Yes — ARM API with JWT | ✓ FLOWING |
| `settings/page.tsx` | `customer` (profile) | from `useAuth()` → AuthContext → getMe on mount | Yes — ARM GET /auth/me | ✓ FLOWING |
| `account/page.tsx` | `customer.name` displayed | from `useAuth()` context | Yes — same getMe flow | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| sf_token only in migrateToken | `grep -rn "sf_token" src/` | 5 hits: 2 in comments (auth.ts:4,87-88; auth-context.tsx:45), 2 functional reads in migrateToken (auth.ts:92,95) — all within migrateToken scope | ✓ PASS |
| No window.location in auth.ts/auth-context.tsx | `grep -rn "window.location" src/lib/auth.ts src/lib/auth-context.tsx` | Only a comment at auth-context.tsx:67 — no actual window.location calls | ✓ PASS |
| No isLogged in production src/ | `grep -rn "isLogged" src/` | Zero results outside test files | ✓ PASS |
| No CDEK/₽/delivery_service in account/orders/ | `grep -rn "delivery_service\|CDEK\|₽\|toLocaleString.*ru-RU" src/app/account/` | Empty output | ✓ PASS |
| deletePassword gates confirm button | `grep -n "disabled.*deletePassword" src/app/account/settings/page.tsx` | `disabled={!deletePassword \|\| deleting}` at :475 | ✓ PASS |
| All 9 task commits present | `git show --stat 4bb501c c137186 17ec8fc b785a1c 053be6b d08a61a 5586bc6 db7c088 69df01b` | All 9 commits verified in git history | ✓ PASS |
| Code review fixes committed | `git log --oneline` | CR-01/WR-06 (+7→+90) at f1195c6; WR-03 (safeHttpUrl) at 0af69c7 | ✓ PASS |

### Probe Execution

No probe scripts defined or applicable for this phase (UI/auth phase; no migration scripts).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-01 | 03-01 | Регистрация с согласием (terms consent) | ✓ SATISFIED | FormControlLabel+Checkbox in register/page.tsx; `agreed` in isValid; terms gate in handleSubmit; register body includes terms_accepted+terms_version |
| AUTH-02 | 03-01 | Логин и сессия (arm_token) | ✓ SATISFIED | TOKEN_KEY='arm_token'; login()→LoginResult; AuthContext.setAuth persists token; bearerHeader() on all protected calls |
| AUTH-03 | 03-01 | Сброс пароля по email | ✓ SATISFIED | forgotPassword/resetPassword in auth.ts; reset-password shim created; forgot/reset pages import from @/lib/auth |
| AUTH-04 | 03-02 | Личный кабинет: история заказов | ✓ SATISFIED | orders/page.tsx: getMyOrders+fmtMoney+track_url; orders/[id]/page.tsx: getMyOrder(.data)+fmtMoney; no CDEK/₽ |
| AUTH-05 | 03-02 | Личный кабинет: адресная книга | ✓ SATISFIED | addresses/page.tsx (new): getMyAddresses/addMyAddress/deleteMyAddress; Dialog form; auth-guard; Default badge |
| AUTH-06 | 03-03 | Личный кабинет: профиль и смена пароля | ✓ SATISFIED | settings/page.tsx: updateProfile→refreshProfile; changePassword→FBG-22 signOut; wrong_password error code mapped to UI message |
| AUTH-07 | 03-03 | GDPR/KVKK: экспорт и удаление аккаунта | ✓ SATISFIED | exportAccount→Blob→<a download>; deleteAccount with password re-auth Dialog; mandatory password field gates confirm; signOut+redirect after delete |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `login/register/page.tsx` | 173,184 | `router` declared after use in handleSubmit | ℹ️ Info | Works at runtime (closure resolves at call time); not a stub; cosmetic ordering issue (IN-02 from 03-REVIEW.md) |
| `settings/page.tsx`, `orders/page.tsx`, etc. | various | `return null` (loading guard) | — | Not a stub — all are `if (authLoading || !customer) return null` early returns before full render; data flows correctly when customer is available |
| `auth.ts` | 104-110 | `setToken`/`clearToken` exported but never used | ℹ️ Info | Dead exports noted in code review (IN-01 from 03-REVIEW.md); no functional impact; deferred cleanup |

No TBD/FIXME/XXX debt markers found in any Phase 3 files. No unreferenced debt markers blocking gate.

**Deferred findings from 03-REVIEW.md (recorded in STATE.md — not Phase 3 regressions):**
- WR-01: Header.tsx search suggestions render `₽` + `ru-RU` formatting — Phase 4 i18n
- WR-02: ProductReviews.tsx uses `ru-RU` date format + Russian-only pluralization — Phase 4 i18n
- WR-04: Transient 5xx/network during getMe() leaves customer=null → account pages redirect to /login — follow-up
- WR-05: Default-currency fallback inconsistency (`USD` vs `TRY`) — Phase 4 i18n
- Pre-existing: 3 failing tests in server-api.test.ts (`armToProduct`) — predates Phase 3 (since commit a2ba277)

### Human Verification Required

All code paths are wired and verified statically. These items require a browser session against demo-BFF (:4000):

### 1. Register with terms consent → auto-login → arm_token

**Test:** Open /login/register; submit form WITHOUT checking terms checkbox
**Expected:** Snackbar error "Please accept the Terms & Privacy Policy to register." Form NOT submitted to ARM. Check the checkbox and submit with valid data → auto-login → `localStorage['arm_token']` populated → redirect to /
**Why human:** Form submission behavior and localStorage write require live browser + running BFF

### 2. Login flow

**Test:** Open /login; submit with valid credentials
**Expected:** `localStorage['arm_token']` populated with JWT string; user redirected to /; account dashboard shows customer.name in greeting
**Why human:** Requires live BFF and browser session to verify token round-trip

### 3. Reset-password shim redirect

**Test:** Navigate directly to `/reset-password?token=ABC123`
**Expected:** Browser immediately redirects (no visible content) to `/login/reset-password?token=ABC123`
**Why human:** Shim is a client-side router.replace in useEffect — redirect behavior requires browser

### 4. GDPR export file download

**Test:** Log in; navigate to /account/settings; click "Download My Data"
**Expected:** Browser downloads a file named `american-creator-account-data.json` containing valid JSON with profile, addresses, and order data from ARM
**Why human:** Blob creation and `<a download>` trigger require running browser + valid JWT session

### 5. GDPR delete with password confirmation

**Test:** Log in; navigate to /account/settings; click "Delete Account"; try to click Confirm with empty password field; enter correct password; click Confirm
**Expected:** (1) Confirm button disabled when password empty; (2) Entering wrong password shows snackbar error; (3) Correct password → signOut → redirect to /; account session cleared
**Why human:** Requires live BFF to verify the delete endpoint and observe session termination

### Gaps Summary

No gaps. All four success criteria are verified in the codebase. All 7 requirement IDs (AUTH-01 through AUTH-07) are covered. Code review critical issue CR-01 (Russian phone formatter) and WR-03 (track_url XSS) were fixed in Phase 3 commits before this verification. Remaining review warnings are deferred to Phase 4 and follow-up work recorded in STATE.md.

---

_Verified: 2026-06-30T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
