---
phase: 5
slug: ui
status: validated
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-30
validated: 2026-06-30
note: "No Wave 0 setup needed — zero new deps (MUI Checkbox/fmtMoney already present), reuses Phase 3 consent-gate + Phase 4 i18n. Post-execution gap audit (2026-06-30) added 3 regression tests for the 2 prod bugs the original suite missed (flat-key i18n 500, USD-default cart bug)."
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x + `tsc --noEmit` type gate + `next build` integration gate |
| **Quick run** | `npx tsc --noEmit` (+ targeted `vitest run`) |
| **Full suite** | `npm test && npm run build` |
| **Runtime** | tsc ~5–10s · vitest ~3s · build ~60–120s |

## Sampling Rate
- After every task commit: `npx tsc --noEmit` (+ `vitest run` when logic added)
- After every wave: `npm test && npm run build`
- Before `/gsd-verify-work`: full suite + build green

## Per-Task Verification Map (assertion families — planner fills per task)

| Requirement | Assertion family | Example automated check |
|-------------|------------------|-------------------------|
| COMP-01 (KDV) | `kdv = round(total - total/1.20)`; «KDV Dahil» label rendered; KDV line is INFORMATIONAL (not added to total) | unit test on kdv helper (20% cases incl. rounding); grep label key; assert total unchanged |
| COMP-02 (consents) | Two required checkboxes (KVKK + mesafeli) gate submit; `if(!agreedKvkk||!agreedMesafeli) return`; each links its legal page | unit/grep on disabled-submit logic; assert links present; Stripe checkout flow unbroken |
| COMP-02 (legal pages) | 5 routes under `/[locale]/legal/*` render; strings via next-intl (en+tr keys, parity); footer + checkout links resolve | build emits the 5 routes; `messages/*.json` parse + balanced; grep links |

## Wave 0
- None — zero new deps; vitest present. (No spikes; research HIGH confidence.)

## Actual Test Coverage (post-execution)

| Requirement | Test file | Tests | Status |
|-------------|-----------|-------|--------|
| COMP-01 KDV (math) | `src/lib/kdv.test.ts` | 4 | COVERED |
| COMP-01 KDV (informational, not in TOTAL) | `src/app/[locale]/checkout/checkout-kdv-display.test.ts` | 2 | COVERED (gap-filled) |
| COMP-02 consents (gate logic) | `src/app/[locale]/checkout/checkout-consent.test.tsx` | 9 | COVERED |
| COMP-02 legal (routes/params/parity) | `src/app/[locale]/legal/legal-page.test.tsx` | 10 | COVERED |
| COMP-02 legal (**next-intl can consume messages**) | `src/i18n/messages-consumable.test.ts` | 8 | COVERED (gap-filled) |
| cross-cut (currency default = TRY) | `src/lib/currency-default.test.ts` | 3 | COVERED (gap-filled) |

### Gap audit — 2 production bugs the original suite missed (now regression-guarded)

1. **Flat-key i18n 500** (fix `edf28ec`) — `legal-page.test.tsx` MOCKED next-intl, so the flat-dotted-key
   `INVALID_KEY` runtime crash was invisible to tests. New `messages-consumable.test.ts` runs the REAL
   `createTranslator` over unflattened messages → catches it.
2. **USD-default cart bug** (fix `39eeb5c`) — `money.test.ts` covered display currency only; the API
   layer defaulted to USD → `product_not_found`. New `currency-default.test.ts` adds a source-invariant
   `|| 'USD'` guard + a `currencyHeader()===TRY` assertion.

Test-enablement: `export` added to `unflatten` (request.ts) and `currencyHeader` (api.ts) — no behavior change.

## Manual-Only
| Behavior | Why Manual | Instructions |
|----------|------------|--------------|
| Full checkout E2E incl. Stripe payment | Needs running demo BFF + Stripe test keys | Add item → checkout → both consents → pay `4242…`; gate + KDV + TRY pricing verified live in UAT 2026-06-30 (consent gate + KDV-in-TOTAL now also unit-covered) |

## Validation Audit 2026-06-30
| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved (tests generated) | 3 |
| Escalated to manual-only | 0 |

Phase-5 requirement tests: 6 files / **35 tests green** (4 kdv + 9 consent + 10 legal + 2 kdv-display + 8 i18n-consumable + 3 currency-default). Full suite 141 pass (3 failures = pre-existing `server-api.test.ts`, unrelated). `tsc --noEmit` clean.

## Validation Sign-Off
- [x] All tasks carry an automated verify (`tsc`/`vitest`/`grep`/`build`)
- [x] Sampling continuity (no 3 consecutive tasks without automated verify)
- [x] No Wave 0 deps (zero-dependency phase)
- [x] No watch-mode flags
- [x] Post-execution gap audit complete — 3/3 gaps filled with regression tests
- [x] `nyquist_compliant: true`

**Approval:** validated 2026-06-30
