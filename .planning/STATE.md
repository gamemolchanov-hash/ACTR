---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 04-01 (i18n scaffold — [locale] routing + middleware + messages + switcher + fmtMoney)
last_updated: "2026-06-30T14:00:00.000Z"
last_activity: 2026-06-30 -- 04-01 executed (next-intl scaffold, route migration, locale switcher, fmtMoney)
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 11
  completed_plans: 7
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-29)

**Core value:** Покупатель в Турции проходит весь путь покупки на дизайне american-creator.ru, работающем на ARM-инфраструктуре.
**Current focus:** Phase 04 — i18n-en-tr

## Current Position

Phase: 04 (i18n-en-tr) — EXECUTING
Plan: 2 of 5
Status: Executing Phase 04 — 04-01 complete
Last activity: 2026-06-30 -- 04-01 complete (next-intl scaffold, [locale] routing, shell i18n, fmtMoney)

Progress: [█████░░░░░] 50%

### ▶ Как продолжить (resume)

1. `cd /home/lexun/work/puz/ACTR`
2. **Поднять окружение (нужно для 04):** demo-BFF `make up` (autoCRM :4000) + `npm run dev`
   (ACTR :3003) + Tolgee project 34 на loco.devloc.su доступен (MCP `mcp__tolgee__*`).

3. **Выполнить фазу:** `/gsd-execute-phase 4` — волны строго последовательны (общий
   `messages/*.json` + `[locale]/layout.tsx` пересекаются): 04-01 каркас → 04-02 каталог/?lang →
   04-03 auth/account → 04-04 статика → 04-05 SEO/Tolgee-finalize. 04-01 — самый тяжёлый
   (next-intl scaffold + миграция ~28 роутов под `[locale]`).

4. Артефакты Phase 4: `.planning/phases/04-i18n-en-tr/` (CONTEXT/RESEARCH/PATTERNS/VALIDATION + 5 PLAN).
5. ⚠️ До go-live в реальном TR-тенанте: `arm_customers.name` nullable (GDPR/KVKK-удаление) — Pending Todos.

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

| Phase 02-checkout P02 | 356 | 5 tasks | 7 files |
| Phase 03 P02 | 4min | 3 tasks | 4 files |
| Phase 03-account P03 | 4min | 3 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent:

- Foundation: переключаем копию AC-фронта на ARM API (не форк FBG); отдельный standalone-репо ~/work/puz/ACTR; рынок TR/TRY/EN+TR; деплой отложен.
- 04-01: CJS require('next-intl/plugin') работает без конвертации в .mjs (Open Q3 закрыт); reset-password нуждается в собственном minimal layout вне [locale]; TR каталог сделан вручную (Tolgee MCP не доступен в агенте — синк в 04-05); fmtMoney locale-aware с TRY по умолчанию (WR-01/WR-05 закрыты в Header).

### Pending Todos

- **[human-verify] Live Stripe payment E2E** — code path complete & verified; live test needs demo storefront `payment_config` (ui_mode=embedded) with Stripe test keys in Portal, then `make up` + `npm run dev`, pay with `4242 4242 4242 4242`, expect redirect to `/checkout/success?order=<uuid>`. Documented in 02-02 SUMMARY + VERIFICATION.md.
- **[Phase 4 i18n] Code-review WR-01/WR-02/WR-05** — systemic RU→TR localization leftovers from 03-REVIEW.md: `Header.tsx` search suggestions use `₽`+`ru-RU`; `ProductReviews.tsx` uses `ru-RU` dates + Russian-only pluralization; currency fallback is `USD` everywhere except order-detail (`TRY`). Defer to Phase 4 (i18n) — standardize to TRY + EN/TR. (CR-01 phone +7 / WR-06 / WR-03 track_url already fixed in Phase 3.)
- **[Phase 3 follow-up] Code-review WR-04** — transient 5xx/network during initial `getMe()`: token preserved (FBG-50) but `customer` stays null → account pages redirect to `/login` with no retry. **Corroborated live in UAT** (fresh nav to /account/settings bounced to / once during the auth-loading window, then held on retry). Consider a retry/error/loading-guard instead of bounce. See 03-REVIEW.md / 03-UAT.md.
- **[backlog/test] Pre-existing `server-api.test.ts` failures (3)** — `armToProduct` reads `p.name` of undefined; failing since before Phase 3 (commit a2ba277), Phase 1/2 catalog mock-vs-adapter mismatch. NOT a Phase 3 regression. Fix fixtures or add adapter null-guard in a catalog follow-up.
- **[⚠ provisioning/compliance — pre-go-live] Demo/real tenant: `arm_customers.name` must be nullable** — GDPR/KVKK account-deletion anonymization nulls `name`; in the demo tenant Directus has `name` NOT NULL, so `POST /auth/me/delete-account` 500s ("Validation failed for field name. Value can't be null", storefront-auth.ts:1286). ACTR/BFF code is correct; the tenant schema must allow it. Make `arm_customers.name` nullable in any TR tenant before go-live, else KVKK-delete breaks. Surfaced in Phase 3 UAT. (Requires Directus admin/migration — autoCRM infra.)
- **[demo-env, fixed — re-apply if reset] BFF storefront JWT secret** — `autocrm-bff` had `ARM_STOREFRONT_JWT_SECRET`/`STOREFRONT_JWT_SECRET` empty → storefront login 500. Fixed by adding `ARM_STOREFRONT_JWT_SECRET=<hex32>` to `~/work/autoCRM/.env` + `docker compose ... up -d --force-recreate --no-deps bff`. Re-apply if that local env is reset.

### Blockers/Concerns

- Деплой-трек содержит нерешённые внешние вопросы (Stripe-доступность в TR, реальный перевозчик, e-fatura) — не блокируют разработку, но обязательны до go-live. См. autoCRM `docs/modules/arm/ACTR/open-questions.md`.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Deploy | Прод-тенант/домен/Stripe-TR/перевозчик/e-fatura | Deferred | 2026-06-29 |
| Feature | OAuth (Google/Apple), UI лояльности | Deferred (v2) | 2026-06-29 |

## Session Continuity

Last session: 2026-06-30T09:27:09.476Z
Stopped at: Phase 4 context gathered (i18n EN/TR)
Resume file: .planning/phases/04-i18n-en-tr/04-CONTEXT.md
