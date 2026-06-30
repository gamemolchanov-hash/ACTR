---
phase: 4
slug: i18n-en-tr
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-30
note: "Wave 0 items run INLINE during execution (next-intl plugin spike in 04-01 T1; Tolgee tag verify in 04-05 T3; arm tr-TR carried to Phase 7) — there is no separate pre-phase Wave 0. nyquist_compliant: every task in all 5 plans carries an automated tsc/vitest/grep+build verify (confirmed by plan-checker); sampling continuity holds."
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (already installed) + `tsc --noEmit` type gate + `next build` integration gate |
| **Config file** | vitest config present (Phases 1–3 ran `npm test`); next-intl adds `next.config.js` plugin |
| **Quick run command** | `npx tsc --noEmit` (fast type gate) then `npx vitest run <changed test>` |
| **Full suite command** | `npm test && npm run build` |
| **Estimated runtime** | tsc ~5–10s · vitest ~3s · build ~60–120s |

Note: project precedent (Phases 1–3) uses `tsc --noEmit` + `grep` acceptance assertions inside
`<verify>` prose as the formal gate; vitest covers unit-testable logic. Keep that pattern.

---

## Sampling Rate

- **After every task commit:** `npx tsc --noEmit` (+ targeted `vitest run` when logic added)
- **After every plan wave:** `npm test && npm run build`
- **Before `/gsd-verify-work`:** full suite + build green
- **Max feedback latency:** ~120 seconds (build-bound)

---

## Per-Task Verification Map

*Filled by the planner per task (each task carries an automated `tsc`/`vitest`/`grep` check or a
Wave 0 dependency). Phase-specific assertion families to cover:*

| Requirement | Assertion family | Example automated check |
|-------------|------------------|-------------------------|
| I18N-01 (no RU hardcode) | No Cyrillic in shipped `src/**/*.{ts,tsx}` except message catalogs/comments | `grep -rPL? "[А-Яа-яЁё]" src --include=*.tsx …` returns clean; build green |
| I18N-01 (strings keyed) | Components call `t('…')` / `useTranslations`; `messages/en.json` + `messages/tr.json` exist & parse | `node -e JSON.parse(messages/*.json)`; tsc passes with typed keys |
| I18N-02 (switcher + persist) | Switcher routes `/en`↔`/tr`; `NEXT_LOCALE` cookie set | unit test on switcher; e2e/manual: toggle persists across reload |
| I18N-03 (ARM ?lang) | Proxy maps `en→en-US`, `tr→tr-TR`; only product-detail; fallback non-empty | unit test on proxy lang-map; assert regex `^[a-z]{2}-[A-Z]{2}$` |
| I18N-04 (SEO) | `generateMetadata` emits hreflang `alternates.languages`; `<html lang>` per locale; `sitemap.ts` lists both | snapshot/grep on rendered metadata; build emits sitemap |

---

## Wave 0 Requirements

- [ ] **Spike:** confirm `next-intl/plugin` is CJS-compatible with existing `next.config.js` (RESEARCH open Q3).
- [ ] **Verify Tolgee locale tags** for project 34 (EN as `en` vs `en-US`) → fixes `messages/*.json` filenames (RESEARCH open Q1).
- [ ] **Confirm** `arm_product_translations.locale` value the TR tenant uses (must be `tr-TR`) (RESEARCH open Q2).
- [ ] vitest already present — no framework install needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Geo-default (TR visitor → /tr) | I18N-02 | Needs real `geo_country` from BFF/CF header; hard to unit-test geo edge | With demo BFF, simulate `geo_country=TR` → first visit lands on `/tr`, cookie set |
| Product content localizes via ARM | I18N-03 | Needs ARM product translations present in tenant | Open a product on `/tr`, confirm localized fields when tenant has `tr-TR` translation; else default shows |

---

## Validation Sign-Off

- [x] All tasks have an automated verify (`tsc`/`vitest`/`grep`) or a Wave 0 dependency — confirmed by plan-checker (15/15 tasks)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers the 3 RESEARCH open questions + plugin spike — handled inline (04-01 T1, 04-05 T3); see frontmatter note
- [x] No watch-mode flags
- [x] Feedback latency < 120s (build-bound)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-30 (RESEARCH open questions resolved; Wave 0 inline)
