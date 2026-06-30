---
phase: 5
slug: ui
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-30
note: "No Wave 0 setup needed — zero new deps (MUI Checkbox/fmtMoney already present), reuses Phase 3 consent-gate + Phase 4 i18n. Every planned task carries an automated tsc/vitest/grep+build verify; sampling continuity holds."
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

## Manual-Only
| Behavior | Why Manual | Instructions |
|----------|------------|--------------|
| Consent gate blocks order | Needs running checkout + Stripe step | With demo BFF, try to submit without both checkboxes → blocked; with both → proceeds (Stripe step unbroken) |
| KDV line correctness | Visual in cart/checkout | Add item, confirm «KDV (%20)» line = round(total−total/1.20), total unchanged |

## Validation Sign-Off
- [x] All tasks carry an automated verify (`tsc`/`vitest`/`grep`/`build`)
- [x] Sampling continuity (no 3 consecutive tasks without automated verify)
- [x] No Wave 0 deps (zero-dependency phase)
- [x] No watch-mode flags
- [x] `nyquist_compliant: true`

**Approval:** approved 2026-06-30
