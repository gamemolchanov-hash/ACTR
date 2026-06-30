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
result: issue
reported: "/tr/legal/kvkk → 500 (and likely all legal routes). Fresh dev server (/tr and /tr/catalog = 200, so not a server issue)."
severity: major
diagnosis: |
  next-intl IntlError MISSING_MESSAGE thrown by getTranslations in the legal page:
    `legal.iade.navLabel`, `legal.gizlilik.navLabel`, `legal.kullanim_kosullari.navLabel` (+ `common.workingHours`)
  are NOT present in messages/{en,tr}.json. The legal page (and/or footer legal column) renders a
  `navLabel` per legal slug; only some navLabel keys were added in 05-01, so rendering throws → 500.
  Root cause: 05-01 key set was incomplete vs the keys the page references; spot-check verified key
  COUNT/parity (43/43) but not the SPECIFIC keys consumed by the page → gap not caught at build time
  (build doesn't fail on a missing message; the throw only surfaces at request/render time).
  ALSO: a fully-stale dev server (started in Phase 3, before next-intl) was masking everything with a
  global 500 / "Couldn't find next-intl config file" — killed + restarted fresh; that part is resolved.

### 4. KDV display (COMP-01)
expected: «KDV Dahil» label on product card + product detail price; checkout order summary shows «KDV (%20)» info line; the KDV line does NOT change the order total (informational only).
result: [pending]

## Summary

total: 4
passed: 0
issues: 1
pending: 3
skipped: 0

## Gaps

- truth: "All 5 legal pages render localized stubs (EN+TR)"
  status: failed
  severity: major
  reason: "MISSING_MESSAGE: legal.<slug>.navLabel (iade/gizlilik/kullanim_kosullari) + common.workingHours absent from messages/{en,tr}.json → getTranslations throws → 500 on legal routes."
  fix: "Add the missing navLabel keys for all 5 legal slugs + common.workingHours to messages/en.json AND tr.json (EN base + real TR, keep parity); restart dev; re-verify /{en,tr}/legal/* = 200. Audit the legal page + footer NAV_COL_LEGAL for the full set of keys they reference."
  test: 3
