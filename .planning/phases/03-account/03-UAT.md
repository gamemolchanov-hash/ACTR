---
status: testing
phase: 03-account
source: [03-VERIFICATION.md]
started: 2026-06-30T07:11:35Z
updated: 2026-06-30T07:11:35Z
---

## Current Test

number: 1
name: Register with terms gate → auto-login → arm_token in localStorage
expected: |
  Submitting the register form without checking the terms checkbox shows a snackbar
  error and does NOT call ARM. After checking the box and submitting, arm_token
  appears in localStorage and the user is redirected to /.
awaiting: user response

## Tests

### 1. Register with terms gate → auto-login → arm_token in localStorage
expected: Submitting register without checking terms shows snackbar error and does NOT call ARM. After checking and submitting, arm_token appears in localStorage and user is redirected to /.
result: [pending]

### 2. Login with email/password → arm_token in localStorage
expected: Successful login stores the JWT in localStorage['arm_token'] and redirects to /.
result: [pending]

### 3. Forgot-password → reset-password shim redirect
expected: POST /auth/forgot-password returns a success message. Opening /reset-password?token=X immediately redirects to /login/reset-password?token=X without rendering content; the token param is preserved.
result: [pending]

### 4. GDPR export downloads american-creator-account-data.json
expected: Clicking "Download My Data" on /account/settings triggers a browser download of a valid JSON file named american-creator-account-data.json containing account data from ARM.
result: [pending]

### 5. GDPR delete with password confirmation
expected: The Confirm button in the Delete Account dialog is disabled when the password field is empty. Wrong password shows an error snackbar. Correct password calls deleteAccount, then signOut + redirect to /.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
