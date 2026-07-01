---
status: testing
phase: 07-tr
source: [07-VERIFICATION.md]
started: 2026-07-01T16:02:07Z
updated: 2026-07-01T16:02:07Z
---

## Current Test

number: 1
name: Owner-only, deferred — TR catalog live render check (D-04/D-05)
expected: |
  After the owner populates TR data in the local `demo` ARM tenant per
  autoCRM/docs/modules/arm/ACTR/TZ.md §6 (distributor currency=TRY + storefront +
  products + arm_storefront_distributors is_default link), loading /catalog on the
  ACTR dev server (:3003) shows no 500 in the browser console and product prices
  render in ₺ (TRY).
awaiting: user response

## Tests

### 1. Owner-only, deferred — TR catalog live render check (D-04/D-05)
expected: After the owner populates TR data (distributor currency=TRY + storefront + products + arm_storefront_distributors is_default link) per TZ.md §6, `/catalog` on the ACTR dev server (:3003) opens with no 500 in the browser console and renders ₺ (TRY) prices.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
