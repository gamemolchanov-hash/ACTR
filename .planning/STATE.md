---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 5 complete (UAT 4/4 PASS); next debug CART-BUG then Phase 6
last_updated: "2026-06-30T18:11:43.749Z"
last_activity: 2026-06-30
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 14
  completed_plans: 14
  percent: 71
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-29)

**Core value:** Покупатель в Турции проходит весь путь покупки на дизайне american-creator.ru, работающем на ARM-инфраструктуре.
**Current focus:** Phase 6 — чистка OMS-специфики + бренд TR

## Current Position

Phase: 6 (Phase 5 Комплаенс-UI — ✅ COMPLETE, UAT 4/4 PASS 2026-06-30)
Plan: Not started
Status: Ready to plan
Last activity: 2026-06-30

Progress: [███████░░░] 71% (5/7 фаз)

### ▶ Как продолжить (resume)

1. `cd /home/lexun/work/puz/ACTR`
2. **Окружение для live:** demo-BFF `make up` (autoCRM :4000) + `npm run dev` (ACTR :3003).
   Dev-сервер сейчас запущен (bg `bj466qf09`). ⚠️ ACTR ходит **на :3003**, НЕ :3000 (там Metabase).
3. **Активная задача:** дебаг сломанной корзины (`product_not_found` / итог $0.00) — см. Pending Todos
   «[CART-BUG]». Затем — Phase 6 (`/gsd-plan-phase 6`).
4. **⚠️ Phase 5 не прошёл `/gsd-secure-phase 5`** (security_enforcement=true, SECURITY.md нет) — фаза
   закрыта по явному решению пользователя; security-ревью consent-gate (T-05-08/09) рекомендуется до go-live.
5. Артефакты Phase 5: `.planning/phases/05-ui/` (3 PLAN/SUMMARY + 05-UAT.md 4/4 PASS + фикс i18n `edf28ec`).

## Performance Metrics

**Velocity:**

- Total plans completed: 3
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 05 | 3 | - | - |

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

- **[CART-BUG — 🔴 ACTIVE, surfaced in Phase-5 UAT 2026-06-30] Корзина не резолвит товар** — добавляешь товар (AFTER SHAVE) → `/tr/basket` показывает строку `product_not_found`, кол-во 0, цена «—», Subtotal/Total **$0.00**, хотя бейдж корзины = 1. Реальный заказ до Stripe не довести (пустая/невалидная корзина). Похоже на баг резолва товара cart↔BFF или несовпадение данных demo-тенанта. **Это блокирует полный E2E-чекаут (но НЕ Phase-5 UI — consent gate/KDV/legal проверены отдельно).** Начать дебаг: `CartProvider`/`basket/page.tsx` + как cart хранит id и как basket их перезапрашивает у BFF.
- **[i18n — Phase-4 хвост, подтверждено в Phase-5 UAT] Валюта ₽/$ вместо ₺ (TRY)** — карточки/деталь товара рендерят рубль («₽24,84»), чекаут (Subtotal/KDV/Total) — доллар («$0.00»). Для TR-рынка должно быть ₺/TRY. Совпадает с WR-01/WR-02 ниже (USD/RUB fallback).
- **[i18n — Phase-4 хвост, подтверждено в Phase-5 UAT] Страницы корзины и чекаута не локализованы** — на `/tr` тело basket («BASKET», «Place Order», «PRODUCT», «PRICE / PC») и checkout («CHECKOUT», «Email», «YOUR ORDER», «Subtotal», «Shipping», «TOTAL», «Continue», «Proceed to Payment») — по-английски. Хедер/футер (вкл. новую legal-колонку) и метки consent — турецкие. Пробел покрытия i18n на basket/checkout, НЕ регрессия Phase 5.
- **[обсервация — Phase-5 UAT] Доставка: тарифы недоступны** — DELIVERY-шаг показывает «Shipping rates temporarily unavailable… you can still place your order» (BFF не вернул тарифы в этом окружении; graceful degradation работает). Проверить интеграцию shipping-rates в demo-BFF.
- **[⚠ security — Phase 5] `/gsd-secure-phase 5` НЕ запускался** — `security_enforcement=true`, но `05-SECURITY.md` нет. Phase 5 закрыта по явному решению пользователя. Consent-gate имеет threat-модель (T-05-08 keyboard-bypass, T-05-09 reverse-tabnabbing — по SUMMARY смягчены). Прогнать `/gsd-secure-phase 5` до go-live для верификации митигаций.
- **[human-verify] Live Stripe payment E2E** — code path complete & verified; live test needs demo storefront `payment_config` (ui_mode=embedded) with Stripe test keys in Portal, then `make up` + `npm run dev`, pay with `4242 4242 4242 4242`, expect redirect to `/checkout/success?order=<uuid>`. Documented in 02-02 SUMMARY + VERIFICATION.md.
- **[Phase 4 i18n] Code-review WR-01/WR-02/WR-05** — systemic RU→TR localization leftovers from 03-REVIEW.md: `Header.tsx` search suggestions use `₽`+`ru-RU`; `ProductReviews.tsx` uses `ru-RU` dates + Russian-only pluralization; currency fallback is `USD` everywhere except order-detail (`TRY`). Defer to Phase 4 (i18n) — standardize to TRY + EN/TR. (CR-01 phone +7 / WR-06 / WR-03 track_url already fixed in Phase 3.)
- **[Phase 3 follow-up] Code-review WR-04** — transient 5xx/network during initial `getMe()`: token preserved (FBG-50) but `customer` stays null → account pages redirect to `/login` with no retry. **Corroborated live in UAT** (fresh nav to /account/settings bounced to / once during the auth-loading window, then held on retry). Consider a retry/error/loading-guard instead of bounce. See 03-REVIEW.md / 03-UAT.md.
- **[backlog/test] Pre-existing `server-api.test.ts` failures (3)** — `armToProduct` reads `p.name` of undefined; failing since before Phase 3 (commit a2ba277), Phase 1/2 catalog mock-vs-adapter mismatch. NOT a Phase 3 regression. Fix fixtures or add adapter null-guard in a catalog follow-up.
- **[⚠ provisioning/compliance — pre-go-live] Demo/real tenant: `arm_customers.name` must be nullable** — GDPR/KVKK account-deletion anonymization nulls `name`; in the demo tenant Directus has `name` NOT NULL, so `POST /auth/me/delete-account` 500s ("Validation failed for field name. Value can't be null", storefront-auth.ts:1286). ACTR/BFF code is correct; the tenant schema must allow it. Make `arm_customers.name` nullable in any TR tenant before go-live, else KVKK-delete breaks. Surfaced in Phase 3 UAT. (Requires Directus admin/migration — autoCRM infra.)
- **[demo-env, fixed — re-apply if reset] BFF storefront JWT secret** — `autocrm-bff` had `ARM_STOREFRONT_JWT_SECRET`/`STOREFRONT_JWT_SECRET` empty → storefront login 500. Fixed by adding `ARM_STOREFRONT_JWT_SECRET=<hex32>` to `~/work/autoCRM/.env` + `docker compose ... up -d --force-recreate --no-deps bff`. Re-apply if that local env is reset.
- **[Phase 4 code-review follow-ups] (04-REVIEW.md) — fixed CR-01/WR-03/WR-04; remaining open** (run `/gsd-code-review 4 --fix` to apply): **CR-02** `productCanonicalUrl` emits locale-less path → JSON-LD url points at a redirect (add locale param); **WR-01** `server-api.ts:165` `totalPages ?? page` caps catalog/sitemap at page 1 (100 products) — real, fix the default; **WR-02** `buildProductJsonLd` no locale (EN price on TR); **WR-05** reset-password shim interpolates raw `NEXT_LOCALE` cookie into redirect URL (whitelist en/tr); **WR-06** TR users landing directly on `/tr/` never get the cookie → next root visit → `/en/`; **WR-07** `messages-pull.mjs` exits 0 on partial pull; **IN-01..04** stale OMS comment, missing `x-default` hreflang, GeoLocaleInit cookie lacks `Secure`, middleware matcher `reset-password` unanchored. Mostly pre-go-live SEO + edge-cases; core i18n verified working.
- **[Phase 4 follow-up] Tolgee project-34 sync** — local `messages/{en,tr}.json` (336 keys, real Turkish) ship as catalogs; the Tolgee PUSH to project 34 (loco.devloc.su, SRV199) was not run (MCP unreachable from executor subagents). `scripts/messages-pull.mjs` + `npm run messages:pull` ready; set `TOLGEE_API_KEY` and push/pull to make Tolgee the live source of truth (D-04/05).

- **[Phase 5 GAP-CLOSURE — ✅ RESOLVED 2026-06-30, commit `edf28ec`]** — the legal-pages 500 was NOT "missing keys" (that diagnosis was wrong). Real cause: messages are FLAT dotted keys, which next-intl rejects (`INVALID_KEY`) — site-wide i18n break (every page rendered key strings; server-rendered legal pages 500'd). PLUS a 2nd bug: legal page (server component) imported `palette` from `theme.ts` (`'use client'`) → RSC manifest 500. Fixed by (1) `unflatten()` in `src/i18n/request.ts`, (2) `palette` extracted to `src/lib/palette.ts`. All 10 legal routes now 200 + real localized content; UAT 4/4 PASS. Tolgee push (D-04/05) still deferred — see todo above.

### Blockers/Concerns

- Деплой-трек содержит нерешённые внешние вопросы (Stripe-доступность в TR, реальный перевозчик, e-fatura) — не блокируют разработку, но обязательны до go-live. См. autoCRM `docs/modules/arm/ACTR/open-questions.md`.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Deploy | Прод-тенант/домен/Stripe-TR/перевозчик/e-fatura | Deferred | 2026-06-29 |
| Feature | OAuth (Google/Apple), UI лояльности | Deferred (v2) | 2026-06-29 |

## Session Continuity

Last session: 2026-06-30T18:00:00Z
Stopped at: Phase 5 (Комплаенс-UI) COMPLETE — UAT 4/4 PASS, i18n+palette fix edf28ec. Next: debug CART-BUG, then plan Phase 6.
Resume file: None
