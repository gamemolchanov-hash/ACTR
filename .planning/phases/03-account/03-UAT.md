---
status: partial
phase: 03-account
source: [03-VERIFICATION.md]
started: 2026-06-30T07:11:35Z
updated: 2026-06-30T07:47:11Z
---

## Current Test

[testing paused — environment blocker]

4 of 5 live checks are blocked by a demo-BFF misconfiguration (empty storefront
JWT signing secret) that makes `/auth/login` return 500. This is downstream of
ACTR's Phase 3 code — every ACTR-controlled behavior that could be exercised
passed. See Gaps → Environment Blocker.

## Tests

### 1. Register with terms gate → auto-login → arm_token in localStorage
expected: Submitting register without checking terms shows error and does NOT call ARM. After checking and submitting, arm_token appears in localStorage and user is redirected to /.
result: partial
notes: |
  ACTR-side behavior VERIFIED in the running app (http://localhost:3003/login/register):
  - Terms gate: with the box unchecked the submit button is DISABLED (isValid requires `agreed`);
    clicking it produced NO `/auth/register` network call and no navigation. Stronger than a snackbar. PASS.
  - Phone field auto-formats `5321234567` → `+90 (532) 123 45 67` (CR-01 TR fix live). PASS.
  - Captcha + honeypot + consent all enforced client-side. PASS.
  - With everything valid, submit fired `POST /api/storefront/auth/register 200` — registration SUCCEEDS. PASS.
  - Auto-login step (`POST /auth/login`) returned 500 → BLOCKED by the BFF JWT-secret blocker below,
    so arm_token + redirect could not be observed. Not an ACTR defect.

### 2. Login with email/password → arm_token in localStorage
expected: Successful login stores JWT in localStorage['arm_token'] and redirects to /.
result: blocked
blocked_by: server
reason: "POST /api/storefront/auth/login → 500 {\"error\":\"Login failed\"}. BFF refuses to sign the session JWT because ARM_STOREFRONT_JWT_SECRET / STOREFRONT_JWT_SECRET are empty in the autocrm-bff container (see Environment Blocker). ACTR sends the correct request shape {login, password} and handles the 500 gracefully (snackbar, stays on page)."

### 3. Forgot-password → reset-password shim redirect
expected: Opening /reset-password?token=X redirects to /login/reset-password?token=X with the token preserved.
result: pass
notes: "Navigated to /reset-password?token=uat-test-token-123 → client-side router.replace landed on /login/reset-password?token=uat-test-token-123, token preserved. PASS."

### 4. GDPR export downloads american-creator-account-data.json
expected: Clicking 'Download My Data' on /account/settings downloads a valid JSON file from ARM.
result: blocked
blocked_by: server
reason: "Requires an authenticated session; login is blocked by the BFF empty-JWT-secret issue. Cannot reach /account/settings as a logged-in user until login works."

### 5. GDPR delete with password confirmation
expected: Confirm disabled without password; wrong password errors; correct password deletes + signOut + redirect.
result: blocked
blocked_by: server
reason: "Requires an authenticated session; blocked by the same BFF login 500. (Static verification already confirmed the confirm button is disabled without a password and deleteAccount gates on password.)"

## Summary

total: 5
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 3
partial: 1

## Gaps

### Environment Blocker (not an ACTR code gap)

- truth: "Storefront login issues a session JWT"
  status: blocked
  blocked_by: server
  severity: blocker (environment, not ACTR code)
  evidence: |
    BFF container `autocrm-bff` (127.0.0.1:4000) error log on POST /public/arm/storefront/auth/login:
      "ARM_STOREFRONT_JWT_SECRET or STOREFRONT_JWT_SECRET env var is required.
       Refusing to sign/verify with default secret."
      at signingSecret (services/bff/src/lib/customer-auth.ts:160)
      at generateJWT → packs/arm/bff/routes/storefront-auth.ts:342
    Both env vars are present but set to EMPTY strings (length=0); signingSecret() skips
    falsy values and fail-fasts (security guard — never signs with a default).
    Register returns 200 because it does not sign a session JWT.
  scope: |
    autoCRM demo BFF environment only — NOT ACTR Phase 3 code. ACTR's register/login/account
    code is correct: right request shapes, X-Storefront-Key server-side, graceful 500 handling.
  fix: |
    Set a non-empty ARM_STOREFRONT_JWT_SECRET on the autocrm-bff container (demo .env /
    compose) and restart it, then re-run the 4 blocked live checks. autoCRM infra change —
    requires owner confirmation (CLAUDE.md: OMS/autoCRM не трогать).
  artifacts: []
  missing: []

### Test artifact

- A demo-tenant customer `uat.p3.1782804795646@example.com` was created by the successful
  register call. It could not be removed via the UI (delete needs login). Clean up from the
  demo tenant if desired.
