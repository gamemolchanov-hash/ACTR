---
status: testing
phase: 05-ui
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-03 human-verify checkpoint]
started: 2026-06-30T16:08:01Z
updated: 2026-06-30T16:08:01Z
---

## Current Test

number: 1
name: Consent gate blocks/allows order (05-03 checkpoint)
expected: |
  Checkout step 2: KVKK + mesafeli checkboxes render; "Proceed to Payment" disabled until BOTH
  checked; submit-unchecked does NOT create an order (consent error). With both checked, button
  enables and Stripe Embedded Checkout proceeds as before (flow unbroken).
awaiting: user response

## Tests

### 1. Consent gate (COMP-02) — checkout step 2
expected: Both KVKK + mesafeli checkboxes render; submit disabled until both checked; unchecked submit blocked (consent error, no order); both checked → button enables → Stripe Embedded Checkout proceeds unchanged.
result: [pending]

### 2. Consent links → legal pages (COMP-02)
expected: Each consent checkbox label link opens /[locale]/legal/kvkk and /legal/mesafeli-satis in a NEW tab.
result: [pending]

### 3. Legal pages render (COMP-02)
expected: All 5 legal pages render localized stubs on EN and TR — /en/legal/{kvkk,mesafeli-satis,iade,gizlilik,kullanim-kosullari} and /tr/legal/... ; footer legal column links resolve.
result: [pending]

### 4. KDV display (COMP-01)
expected: «KDV Dahil» label on product card + product detail price; checkout order summary shows «KDV (%20)» info line; the KDV line does NOT change the order total (informational only).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0

## Gaps
