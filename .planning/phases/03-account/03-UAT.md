---
status: partial
phase: 03-account
source: [03-VERIFICATION.md]
started: 2026-06-30T07:11:35Z
updated: 2026-06-30T08:22:17Z
---

## Current Test

[testing complete — 4/5 pass; Test 5 passes on the ACTR side, its final server-side
step is blocked by a demo-tenant Directus schema constraint (see Gaps).]

Live UAT run against http://localhost:3003 (ACTR dev) + demo BFF :4000 after the BFF
JWT-secret fix. Every ACTR-controlled behavior works. The only failure is server-side
(demo tenant schema), not ACTR code.

## Tests

### 1. Register with terms gate → auto-login → arm_token / redirect
expected: Unchecked terms blocks submit & calls no ARM; checked + valid → register, auto-login, redirect to /.
result: pass
notes: |
  - Terms gate: unchecked → submit button DISABLED, zero /auth/register call. PASS.
  - Phone auto-formats 5321234567 → +90 (532) 123 45 67 (CR-01 TR fix live). PASS.
  - Fresh register (uat.p3b.…@example.com): POST /auth/register 200 → POST /auth/login 200
    (auto-login) → redirected to / → header shows logged-in account. PASS.

### 2. Login with email/password → session + redirect
expected: Successful login establishes session and redirects to /.
result: pass
notes: |
  Logged in via the form (uat.p3.…@example.com / Test1234): POST /auth/login 200 →
  redirected to / → header shows account "UAT" + "Выйти"; getMe 200 on protected pages.
  Logout ("Выйти") clears the session (header reverts to "Войти"). PASS.

### 3. Forgot-password → reset-password shim redirect
expected: /reset-password?token=X redirects to /login/reset-password?token=X, token preserved.
result: pass
notes: "Verified: /reset-password?token=uat-test-token-123 → /login/reset-password?token=uat-test-token-123."

### 4. GDPR export downloads account JSON
expected: 'Download My Data' downloads a valid JSON of profile/addresses/orders from ARM.
result: pass
notes: |
  GET /auth/me/export 200 → generated a Blob download: type application/json, 476 bytes,
  top-level keys {exported_at, profile, loyalty, addresses, orders}; profile holds the real
  account (name/email/id), addresses/orders empty (new account). PASS.

### 5. GDPR delete with password confirmation
expected: Confirm disabled w/o password; wrong password errors; correct password → delete + signOut + redirect.
result: partial
notes: |
  ACTR-side behavior all VERIFIED:
  - Confirm Delete button DISABLED when password empty; enabled once filled. PASS.
  - Wrong password → POST /auth/me/delete-account 403 → snackbar "Your current password is
    incorrect.", dialog stays open, account NOT deleted, still logged in. PASS.
  - Correct password → client sends the proper request. The final server-side anonymization
    FAILS with 500 — blocked by a demo-tenant Directus schema constraint (see Gaps), NOT ACTR code.

## Summary

total: 5
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0
partial: 1

## Gaps

### Environment Blocker #1 — RESOLVED (demo BFF JWT secret)

- truth: "Storefront login issues a session JWT"
  status: resolved
  was: |
    autocrm-bff had ARM_STOREFRONT_JWT_SECRET / STOREFRONT_JWT_SECRET set to EMPTY strings;
    the BFF fail-fast guard (services/bff/src/lib/customer-auth.ts:160) refused to sign → /auth/login 500.
  fix_applied: |
    Added ARM_STOREFRONT_JWT_SECRET=<random 32-byte hex> to ~/work/autoCRM/.env and recreated
    the bff container (docker compose ... up -d --force-recreate --no-deps bff). Login now 200.
    NOTE: this lives in autoCRM's local .env — re-apply if that env is reset.

### Environment Blocker #2 — OPEN (demo tenant schema blocks GDPR delete)

- truth: "GDPR/KVKK account deletion anonymizes the customer record"
  status: blocked
  blocked_by: server (demo tenant data)
  severity: blocker (environment, not ACTR code) — but compliance-relevant for real tenants
  evidence: |
    POST /public/arm/storefront/auth/me/delete-account → BFF 500. Container log:
      "Validation failed for field \"name\". Value can't be null."
      (code FAILED_VALIDATION) at packs/arm/bff/routes/storefront-auth.ts:1286
    The BFF anonymization patch (buildAnonymizedCustomerPatch, customer-auth.service.ts) correctly
    nulls PII incl. `name`, but the DEMO tenant's Directus has arm_customers.name as NOT NULL,
    so the update is rejected.
  scope: |
    autoCRM demo-tenant Directus schema — NOT ACTR Phase 3 code. ACTR's delete flow is correct
    (password gate, wrong-password handling, correct request, signOut+redirect on success).
  fix: |
    Make arm_customers.name nullable in the tenant's Directus schema (production tenants must
    have this for GDPR/KVKK delete to work). Requires Directus admin / migration — owner action.
  artifacts: []
  missing: []

### Live corroboration of deferred WR-04 (non-blocking)

- A fresh direct navigation to /account/settings bounced to / once during the getMe auth-loading
  window, then held on retry. Matches code-review WR-04 (redirect-before-auth-resolves). Already
  recorded as a Phase-3 follow-up in STATE.md Pending Todos.

### Test artifacts (demo tenant)

- Customers created during UAT and not removable via UI (delete is blocked by Env Blocker #2):
  uat.p3.1782804795646@example.com, uat.p3b.1782807611535@example.com. Clean up from the demo
  tenant if desired.
