---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 06
current_phase_name: oms-tr
status: executing
stopped_at: Completed 06-03-PLAN.md
last_updated: "2026-07-01T11:59:51.046Z"
last_activity: 2026-07-01
last_activity_desc: Phase 06 execution started
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 19
  completed_plans: 18
  percent: 71
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-29)

**Core value:** Покупатель в Турции проходит весь путь покупки на дизайне american-creator.ru, работающем на ARM-инфраструктуре.
**Current focus:** Phase 06 — oms-tr

## Current Position

Phase: 06 (oms-tr) — EXECUTING
Plan: 5 of 5
Status: Ready to execute
Last activity: 2026-07-01 — Phase 06 execution started

Progress: [███████░░░] 71% (5/7 фаз)

### ▶ Как продолжить (resume)

1. `cd /home/lexun/work/puz/ACTR`
2. **Окружение для live:** demo-BFF `make up` (autoCRM :4000) + `npm run dev` (ACTR :3003).
   Dev-сервер сейчас запущен (bg `bj466qf09`). ⚠️ ACTR ходит **на :3003**, НЕ :3000 (там Metabase).

3. **Корзина ПОЧИНЕНА** (`39eeb5c`, currency USD→TRY). **Security Phase 5 пройден** (`6fab9ae`,
   SECURED 10/10). Остаток: каталог всё ещё ₽ (см. Pending Todos). След. крупный шаг — Phase 6 (`/gsd-plan-phase 6`).

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
| Phase 06-oms-tr P01 | 12min | 2 tasks | 8 files |
| Phase 06 P02 | 7min | 3 tasks | 10 files |
| Phase 06-oms-tr P03 | ~15min | 3 tasks | 24 files |
| Phase 06 P04 | ~10min | 2 tasks | 4 files |

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
- [Phase 06-01]: 06-01: BOGO auto-promo fully removed (module, 8 marker sites, assets, i18n keys); live promo-CODE feature (CART-06) verified untouched via grep-gate + tsc
- [Phase 06]: 06-02: Reviews feature (D-09) fully removed — component, client calls, JSON-LD aggregateRating, 13 i18n keys; live promo-CODE (CART-06) verified untouched via grep (17 matches remain)
- [Phase 06]: 06-02: robots.txt Sitemap directive de-RU'd (D-11) — relative /sitemap.xml replaces hardcoded american-creator.ru; seo.test.ts:240 assertion updated
- [Phase ?]: 06-03: RU business pages (partners/studios routes+nav+sitemap+images) fully removed and next.config.js redirects pruned from 32 to 3 trailing-slash-hygiene entries; CLEAN-01/D-01/D-07 closed pending 06-04/06-05
- [Phase 06-04]: /delivery reworked for TR market — CDEK_OPTIONS array + render loop, city-delivery-note, free-delivery banner, and 11 delivery.cdek*/cityNote*/freeBanner i18n keys removed; delivery.title/desc reworked to neutral carrier-agnostic copy (no named carrier)
- [Phase 06-04]: RU payment-systems.png image block + asset removed from /delivery; delivery.paymentImgAlt key dropped both locales; delivery.paymentDesc reworked to name Visa/Mastercard/Troy in prose (RU MIR dropped); EN/TR parity held at 283/283

### Pending Todos

- **[CART-BUG — ✅ RESOLVED 2026-06-30, commit `39eeb5c`] Корзина не резолвила товар** — `/tr/basket` показывал `product_not_found` / $0.00. **Root cause (найден через live UAT):** API-слой слал `X-Currency: USD` (дефолт `currencyHeader()` при пустом `NEXT_PUBLIC_STOREFRONT_CURRENCY`), а это TR/TRY-витрина → BFF `cart/validate` отдаёт `valid:false` для TRY-товаров в USD. WR-05/I18N-04 починили display-слой (money.ts/seo.ts → TRY), но пропустили API-слой. Исправлены 4 USD-дефолта → TRY (api.ts ×2, basket, checkout). Проверено live: корзина AFTER SHAVE TRY 24.84×2=49.68, чекаут TRY, KDV(%20) TRY 8.00 (в TOTAL не добавляется).
- **[i18n/currency — 🟡 ЧАСТИЧНО, остаток] Каталог рендерит ₽ (RUB) вместо ₺ (TRY)** — `$` в чекауте/корзине исправлен (см. CART-BUG ✅), но карточки/деталь каталога всё ещё показывают рубль («₽24,84»). Похоже `ProductCard`/каталог передаёт в `fmtMoney` валюту из данных товара (RUB) или иной дефолт. Также fixed-страницы показывают ISO-код «TRY» вместо символа «₺» (Intl в не-tr локали) — косметика. Проверить откуда каталог берёт currency для fmtMoney.
- **[cart — 🟢 minor] HMR/persist-гонка чистит корзину** — при hot-reload (или ремоунте `CartProvider`) `skipPersist`-логика может перезаписать localStorage пустым `[]` (наблюдалось при правках файлов в dev). Скорее dev-артефакт, но стоит проверить порядок hydrate-vs-persist эффектов (`CartProvider.tsx:40-60`) на устойчивость.
- **[i18n — Phase-4 хвост, подтверждено в Phase-5 UAT] Страницы корзины и чекаута не локализованы** — на `/tr` тело basket («BASKET», «Place Order», «PRODUCT», «PRICE / PC») и checkout («CHECKOUT», «Email», «YOUR ORDER», «Subtotal», «Shipping», «TOTAL», «Continue», «Proceed to Payment») — по-английски. Хедер/футер (вкл. новую legal-колонку) и метки consent — турецкие. Пробел покрытия i18n на basket/checkout, НЕ регрессия Phase 5.
- **[обсервация — Phase-5 UAT] Доставка: тарифы недоступны** — DELIVERY-шаг показывает «Shipping rates temporarily unavailable… you can still place your order» (BFF не вернул тарифы в этом окружении; graceful degradation работает). Проверить интеграцию shipping-rates в demo-BFF.
- **[security — Phase 5 ✅ DONE 2026-06-30, commit `6fab9ae`] `/gsd-secure-phase 5` пройден** — `05-SECURITY.md` создан, **SECURED 10/10 threats CLOSED** (ASVS L1). 4 mitigate верифицированы в коде (T-05-01 slug-allowlist, T-05-05 KDV-не-в-total, T-05-08 handleSubmit-гейт, T-05-09 noopener), 6 accept обоснованы. ⚠️ **До go-live**: (T-05-02) заменить `[Placeholder]` юр-тексты на юристские; (T-05-07) добавить `kvkk_accepted` в `createOrder` payload + серверная валидация в BFF.
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

Last session: 2026-07-01T11:57:26.422Z
Stopped at: Completed 06-03-PLAN.md
Resume file: .planning/phases/06-oms-tr/06-04-PLAN.md
