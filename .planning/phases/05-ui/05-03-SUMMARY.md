---
phase: 05-ui
plan: "03"
subsystem: checkout-compliance
tags: [compliance, kvkk, mesafeli, consent, i18n, checkout]
dependency_graph:
  requires: [05-01, 05-02]
  provides: [COMP-02-consent]
  affects: [src/app/[locale]/checkout/page.tsx, messages/en.json, messages/tr.json]
tech_stack:
  added: []
  patterns: [register-terms-gate, MUI-Checkbox-FormControlLabel, next-intl-flat-keys]
key_files:
  created:
    - src/app/[locale]/checkout/checkout-consent.test.tsx
  modified:
    - messages/en.json
    - messages/tr.json
    - src/app/[locale]/checkout/page.tsx
decisions:
  - "Consent state at CheckoutPage top-level (not step-local) so it survives step navigation (Pitfall 2)"
  - "Gate in handleSubmit body before setSubmitting (Pitfall 3 — keyboard/programmatic bypass prevention)"
  - "button disabled={submitting || !agreedKvkk || !agreedMesafeli} dual-guard"
  - "rel=noopener noreferrer on both _blank legal links (T-05-09 reverse-tabnapping mitigation)"
  - "Test strategy: pure-predicate unit tests (consentGatePasses / proceedButtonDisabled) — avoids Stripe/next-intl/auth harness complexity"
metrics:
  duration: "~2 min (automated tasks)"
  completed_date: "2026-06-30T15:58:46Z"
  tasks_completed: 2
  tasks_total: 3
  status: paused-at-checkpoint
---

# Phase 05 Plan 03: Compliance consent gate (KVKK + mesafeli satış) Summary

**One-liner:** KVKK + mesafeli satış consent checkboxes gate order placement in checkout step 2, with legal-page links in new tabs and EN+TR i18n keys.

## Status: PAUSED — Awaiting Human Verification (Task 3 checkpoint)

Automated tasks 1 and 2 completed and committed. Execution paused at `checkpoint:human-verify` (Task 3) as required by plan frontmatter `autonomous: false`.

## What Was Built

### Task 1 — i18n keys (commit eb27e38)
Appended 7 flat `checkout.consent.*` keys to `messages/en.json` and `messages/tr.json`:
- `kvkkPrefix`, `kvkkLink`, `kvkkSuffix` — KVKK checkbox label parts
- `mesafeliPrefix`, `mesafeliLink`, `mesafeliSuffix` — mesafeli satış label parts
- `required` — error message when gate blocks submission

EN/TR parity verified via `node` script. Real Turkish translations (not placeholders).

### Task 2 — Consent gate implementation (commits 000838f RED, bb418dc GREEN)

**`src/app/[locale]/checkout/page.tsx`:**
- Added `Checkbox` to `@mui/material` import
- Added `agreedKvkk` / `agreedMesafeli` `useState(false)` at CheckoutPage top level (survives step navigation)
- `handleSubmit`: gate at top — `if (!agreedKvkk || !agreedMesafeli) { setError(t('checkout.consent.required')); return; }` (keyboard/programmatic bypass prevented)
- Button: `disabled={submitting || !agreedKvkk || !agreedMesafeli}`
- Two `FormControlLabel+Checkbox` blocks in `step2Content`, before the error alert and button:
  - KVKK → `Link href="/legal/kvkk" target="_blank" rel="noopener noreferrer"`
  - Mesafeli → `Link href="/legal/mesafeli-satis" target="_blank" rel="noopener noreferrer"`
- Stripe/createOrder logic untouched

**`src/app/[locale]/checkout/checkout-consent.test.tsx`:**
- 9 pure-predicate tests — `consentGatePasses` and `proceedButtonDisabled`
- All 9 pass; `tsc --noEmit` clean

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| eb27e38 | feat | checkout.consent.* i18n keys EN+TR (7 keys) |
| 000838f | test | RED — consent-gate tests |
| bb418dc | feat | GREEN — consent gate: state + handleSubmit guard + checkboxes |

## Deviations from Plan

None — plan executed exactly as written for the automated tasks.

## Threat Surface Scan

T-05-08 (keyboard bypass) mitigated — gate in `handleSubmit` body, not only `disabled`.
T-05-09 (reverse-tabnapping) mitigated — `rel="noopener noreferrer"` on both `_blank` links.
No new threat surface beyond what the plan's threat register covered.

## Known Stubs

None for this plan's deliverables. Legal page content remains `[Placeholder]` (carried from 05-01, intentional — legal text is a client responsibility).

## Self-Check: PASSED

- messages/en.json — 7 checkout.consent.* keys present
- messages/tr.json — 7 checkout.consent.* keys present (EN/TR parity)
- src/app/[locale]/checkout/page.tsx — agreedKvkk, agreedMesafeli, /legal/kvkk, /legal/mesafeli-satis, noopener noreferrer all grep-confirmed
- src/app/[locale]/checkout/checkout-consent.test.tsx — created, 9/9 tests pass
- tsc --noEmit — clean
- Task 3 (human-verify) — NOT auto-approved (gate="blocking", autonomous=false)
