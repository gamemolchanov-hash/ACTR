---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: context exhaustion at 75% (2026-06-30)
last_updated: "2026-06-30T15:56:43.892Z"
last_activity: 2026-06-30 -- Phase 05 execution started
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 14
  completed_plans: 13
  percent: 57
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-29)

**Core value:** Покупатель в Турции проходит весь путь покупки на дизайне american-creator.ru, работающем на ARM-инфраструктуре.
**Current focus:** Phase 05 — ui

## Current Position

Phase: 05 (ui) — EXECUTING
Plan: 3 of 3
Status: Ready to execute
Last activity: 2026-06-30 -- Phase 05 execution started

Progress: [██████░░░░] 57%

### ▶ Как продолжить (resume)

1. `cd /home/lexun/work/puz/ACTR`
2. **След. фаза:** `/gsd-plan-phase 5` (Комплаенс-UI — KDV/НДС в ценах, чекбоксы KVKK/«mesafeli satış» в чекауте, юр-страницы-заглушки).
3. Окружение для live: demo-BFF `make up` (:4000) + `npm run dev` (:3003).
4. Артефакты Phase 4: `.planning/phases/04-i18n-en-tr/` (CONTEXT/RESEARCH/PATTERNS/VALIDATION/REVIEW/VERIFICATION + 5 PLAN/SUMMARY).
5. ⚠️ Code-review Phase 4 follow-ups (см. Pending Todos) + до go-live: `arm_customers.name` nullable.

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
| Phase 04-i18n-en-tr P02 | 25min | 3 tasks | 14 files |
| Phase 04 P03 | 8min | 3 tasks | 11 files |
| Phase 04-i18n-en-tr P04 | 9min | 3 tasks | 13 files |
| Phase 04-i18n-en-tr P05 | 655 | 3 tasks | 11 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent:

- Foundation: переключаем копию AC-фронта на ARM API (не форк FBG); отдельный standalone-репо ~/work/puz/ACTR; рынок TR/TRY/EN+TR; деплой отложен.
- 04-01: CJS require('next-intl/plugin') работает без конвертации в .mjs (Open Q3 закрыт); reset-password нуждается в собственном minimal layout вне [locale]; TR каталог сделан вручную (Tolgee MCP не доступен в агенте — синк в 04-05); fmtMoney locale-aware с TRY по умолчанию (WR-01/WR-05 закрыты в Header).
- [Phase ?]: 04-03: auth.*/account.* namespaces appended to shared messages/*.json (201 keys total, EN/TR parity); order history dates via Intl.DateTimeFormat(bcp47), fmtMoney gains bcp47 3rd arg; order-status name localization deferred to BFF/Phase 7; TR authored inline (Tolgee sync deferred to 04-05)
- 04-05: I18N-04 closed — hreflang alternates.languages (en/tr) in layout + product generateMetadata; OG locale locale-aware (tr_TR/en_US); sitemap per-locale with alternates.languages on every entry
- 04-05: I18N-01 grep-gate PASSED — 0 non-comment Cyrillic in src/**/*.{ts,tsx}; seo.ts was last hold-out (formatRub/ru_RU/RUB/₽ removed)
- 04-05: I18N-03 server-side complete — fetchProductServer(idOrSlug, locale?) threads ?lang=<bcp47> to BFF for server-rendered SEO metadata
- 04-05: Tolgee project 34 push deferred (MCP unavailable in agent); static JSON committed as source (336 keys/lang); messages:pull via node REST documented in scripts/messages-pull.mjs

### Pending Todos

- **[human-verify] Live Stripe payment E2E** — code path complete & verified; live test needs demo storefront `payment_config` (ui_mode=embedded) with Stripe test keys in Portal, then `make up` + `npm run dev`, pay with `4242 4242 4242 4242`, expect redirect to `/checkout/success?order=<uuid>`. Documented in 02-02 SUMMARY + VERIFICATION.md.
- **[Phase 4 i18n] Code-review WR-01/WR-02/WR-05** — systemic RU→TR localization leftovers from 03-REVIEW.md: `Header.tsx` search suggestions use `₽`+`ru-RU`; `ProductReviews.tsx` uses `ru-RU` dates + Russian-only pluralization; currency fallback is `USD` everywhere except order-detail (`TRY`). Defer to Phase 4 (i18n) — standardize to TRY + EN/TR. (CR-01 phone +7 / WR-06 / WR-03 track_url already fixed in Phase 3.)
- **[Phase 3 follow-up] Code-review WR-04** — transient 5xx/network during initial `getMe()`: token preserved (FBG-50) but `customer` stays null → account pages redirect to `/login` with no retry. **Corroborated live in UAT** (fresh nav to /account/settings bounced to / once during the auth-loading window, then held on retry). Consider a retry/error/loading-guard instead of bounce. See 03-REVIEW.md / 03-UAT.md.
- **[backlog/test] Pre-existing `server-api.test.ts` failures (3)** — `armToProduct` reads `p.name` of undefined; failing since before Phase 3 (commit a2ba277), Phase 1/2 catalog mock-vs-adapter mismatch. NOT a Phase 3 regression. Fix fixtures or add adapter null-guard in a catalog follow-up.
- **[⚠ provisioning/compliance — pre-go-live] Demo/real tenant: `arm_customers.name` must be nullable** — GDPR/KVKK account-deletion anonymization nulls `name`; in the demo tenant Directus has `name` NOT NULL, so `POST /auth/me/delete-account` 500s ("Validation failed for field name. Value can't be null", storefront-auth.ts:1286). ACTR/BFF code is correct; the tenant schema must allow it. Make `arm_customers.name` nullable in any TR tenant before go-live, else KVKK-delete breaks. Surfaced in Phase 3 UAT. (Requires Directus admin/migration — autoCRM infra.)
- **[demo-env, fixed — re-apply if reset] BFF storefront JWT secret** — `autocrm-bff` had `ARM_STOREFRONT_JWT_SECRET`/`STOREFRONT_JWT_SECRET` empty → storefront login 500. Fixed by adding `ARM_STOREFRONT_JWT_SECRET=<hex32>` to `~/work/autoCRM/.env` + `docker compose ... up -d --force-recreate --no-deps bff`. Re-apply if that local env is reset.
- **[Phase 4 code-review follow-ups] (04-REVIEW.md) — fixed CR-01/WR-03/WR-04; remaining open** (run `/gsd-code-review 4 --fix` to apply): **CR-02** `productCanonicalUrl` emits locale-less path → JSON-LD url points at a redirect (add locale param); **WR-01** `server-api.ts:165` `totalPages ?? page` caps catalog/sitemap at page 1 (100 products) — real, fix the default; **WR-02** `buildProductJsonLd` no locale (EN price on TR); **WR-05** reset-password shim interpolates raw `NEXT_LOCALE` cookie into redirect URL (whitelist en/tr); **WR-06** TR users landing directly on `/tr/` never get the cookie → next root visit → `/en/`; **WR-07** `messages-pull.mjs` exits 0 on partial pull; **IN-01..04** stale OMS comment, missing `x-default` hreflang, GeoLocaleInit cookie lacks `Secure`, middleware matcher `reset-password` unanchored. Mostly pre-go-live SEO + edge-cases; core i18n verified working.
- **[Phase 4 follow-up] Tolgee project-34 sync** — local `messages/{en,tr}.json` (336 keys, real Turkish) ship as catalogs; the Tolgee PUSH to project 34 (loco.devloc.su, SRV199) was not run (MCP unreachable from executor subagents). `scripts/messages-pull.mjs` + `npm run messages:pull` ready; set `TOLGEE_API_KEY` and push/pull to make Tolgee the live source of truth (D-04/05).

- **[Phase 5 GAP-CLOSURE — next window] Legal pages 500 + Tolgee sync (do together)** — (1) BUG: `/[locale]/legal/*` 500s — `getTranslations` throws on MISSING keys `legal.<slug>.navLabel` (iade/gizlilik/kullanim_kosullari) + `common.workingHours`, absent from `messages/{en,tr}.json` (05-01 added an incomplete set; build doesn't fail on missing-message — surfaces only at runtime). See 05-UAT.md Gaps. (2) Fix THE RIGHT WAY via Tolgee now that MCP is wired (`~/.claude.json` → https://loco.devloc.su/mcp/developer, active after Claude Code restart): push ALL local keys (Phase 4+5, ~390/lang) to **project 34**, add the missing navLabel + common.workingHours keys there (EN+TR), `npm run messages:pull` back into JSON → Tolgee becomes the real source of truth (closes D-04/05 deferred). Then re-verify `/{en,tr}/legal/*` = 200 + finish UAT tests 1/2/4 (consent gate, links, KDV) → verifier → Phase 5 complete. Entry point: `/gsd-verify-work 5` (picks up Gaps → gap-closure plan). Fresh dev server already running on :3003 (bg b2584mk65).

### Blockers/Concerns

- Деплой-трек содержит нерешённые внешние вопросы (Stripe-доступность в TR, реальный перевозчик, e-fatura) — не блокируют разработку, но обязательны до go-live. См. autoCRM `docs/modules/arm/ACTR/open-questions.md`.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Deploy | Прод-тенант/домен/Stripe-TR/перевозчик/e-fatura | Deferred | 2026-06-29 |
| Feature | OAuth (Google/Apple), UI лояльности | Deferred (v2) | 2026-06-29 |

## Session Continuity

Last session: 2026-06-30T15:56:43.886Z
Stopped at: context exhaustion at 75% (2026-06-30)
Resume file: .planning/phases/05-ui/05-01-PLAN.md
