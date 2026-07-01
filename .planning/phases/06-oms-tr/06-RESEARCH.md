# Phase 6: Чистка OMS-специфики + бренд TR - Research

**Researched:** 2026-07-01
**Domain:** Dead-code deletion + brand-asset swap in a Next.js 14 App Router storefront (no new
libraries, no new features — pure removal/rewrite of existing TSX/JSON/config).
**Confidence:** HIGH — every claim below is verified directly against this repo's source tree
(`git grep`, file reads) or against the sibling ARM OpenAPI spec (read-only), not against training
data. This phase has almost no "ecosystem" unknowns; the risk is 100% in consumer-graph completeness.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Удалить целиком `/partners` и подстраницы (`/partners/bloggers`, `/partners/schools`,
  `/partners/shops`) и `/studios` — это RU-рекрутинг (набор nail-студий/блогеров AC), не нужен в
  TR-модели. Удалить сами роуты (`src/app/[locale]/partners/**`, `src/app/[locale]/studios/`),
  ссылки в `Header.tsx` (`nav.studios`, `nav.partners`) и `Footer.tsx`, соответствующие i18n-ключи
  (`studios.*`, `partners.*`, `nav.studios`, `nav.partners`) в `messages/{en,tr}.json`, и связанные
  редиректы (`/ankety*` → partners/studios) в `next.config.js`.
- **D-02:** `/delivery` — **не удалять, переписать под TR**. Убрать CDEK-специфику (`CDEK_OPTIONS`,
  ключи `delivery.cdek0/1/2*`), переписать содержимое под TR-доставку (перевозчик/условия TR).
  Реальный TR-перевозчик — деплой-трек; страница пока даёт нейтральный TR-текст доставки, не CDEK.
  Ссылка «Delivery & Payment» в футере сохраняется.
- **D-03:** Телефон `+7 995 757-84-67` (`Footer.tsx:163,204`) → **TR-плейсхолдер** (нейтральный
  TR-формат, реальный номер перед go-live).
- **D-04:** Соцсети (`Footer.tsx:8-17` `SOCIALS`): **удалить VK** (`soc-vk.png`) и **Wildberries**
  (`soc-wb.svg`) — чисто RU. Оставить Instagram/WhatsApp как TR-заготовки (WhatsApp `wa.me/…` →
  TR-плейсхолдер-номер; добавить/оставить Instagram). Telegram-RU (`t.me/americancreator_ru`) —
  заменить на TR-заготовку либо убрать (planner: убрать RU-хендл, не оставлять `_ru`).
- **D-05:** Footer `PAYMENT_ICONS` (`Footer.tsx:19-25`): убрать `yandex_money`, `webmoney`, `qiwi`
  (RU). Показывать **Visa / Mastercard / Troy** (Troy — TR-национальная схема). Текущий рендер —
  спрайт с `bgPos`; для Troy нужен новый ассет/подход (planner решает: отдельные иконки vs новый
  спрайт). Заменить/убрать `paykeeper.png`.
- **D-06:** `payment-systems.png` (RU-композит) на странице `/delivery`
  (`delivery/page.tsx:264`) — заменить на TR-набор (Visa/MC/Troy) или убрать блок изображения.
- **D-07:** В `next.config.js` `redirects()`: снести RU-специфичные — `categoryMap` (RU-slug →
  storefront-slug), все `.php` (`novinki.php`, `compare.php`, `ankety/*.php`), `/personal*`,
  `/auth*`, `/ankety*`, `/help/delivery`, `/info/faq` и product-slug RU-редиректы. **Оставить**
  только гигиену trailing-slash для действующих TR-роутов (например `/basket/`→`/basket`,
  `/contacts/`→`/contacts`). Проверить, что оставшиеся редиректы указывают на существующие роуты.
- **D-08:** Удалить `src/features/promo-bogo/**` (`config.ts`, `PromoPlashka.tsx`, `useAutoPromo.ts`,
  `index.ts`) целиком и все вызовы: `src/app/[locale]/page.tsx`, `catalog/page.tsx`,
  `catalog/[slug]/page.tsx`, `components/ProductCard.tsx`, `lib/arm-adapter.ts`, `lib/api.ts`.
  Удалить i18n-ключи `promo.gift`, `promo.giftAdd`, `promo.bannerAlt` и BOGO-ассеты.
- **D-09:** ARM storefront API отзывов не отдаёт (как боевая FBG-витрина). **Дефолт: удалить**
  `src/components/ProductReviews.tsx` (+ `__tests__/ProductReviews.test.tsx`) и все интеграции:
  `components/ProductDetail.tsx`, `lib/api.ts`, `lib/seo.ts` (снять `aggregateRating` из JSON-LD),
  `lib/server-api.ts`, `app/sitemap.ts`, i18n-ключи `product.reviews*`/`product.noReviews`/
  `product.yourRating`/`product.submitReview`/`product.verifiedPurchase` и т.п. **Research
  подтвердил** контракт ARM (нет reviews-поля/эндпоинта, нет `/reviews` path в OpenAPI, и
  `fetchProductReviewAggregateServer` уже является no-op stub с комментарием "cleanup in Phase 6")
  — удаление безусловно, гейтинг на данные не требуется.

### Claude's Discretion

- Точный способ рендера Troy-иконки (отдельные `<img>` vs новый спрайт vs inline SVG).
- Как именно нейтрализовать `/delivery` TR-текст (минимальная заглушка vs осмысленный TR-контент)
  — без ссылки на конкретного перевозчика (деплой-трек).
- Формат TR-плейсхолдер-телефона и точный набор оставляемых соцсетей (Instagram обязателен;
  WhatsApp — опционально).
- Порядок атомарных коммитов чистки (planner структурирует).

### Deferred Ideas (OUT OF SCOPE)

- Реальные TR-контакты (телефон, соцсеть-хендлы, адрес) — вписать перед go-live (деплой-трек).
- Реальный TR-перевозчик и тарифы для `/delivery` — деплой-трек (open-questions.md).
- Каталог показывает ₽ вместо ₺ — отдельный баг (STATE.md Pending Todos), не Phase 6.
- Локализация basket/checkout (EN на /tr) — хвост Phase 4, не Phase 6.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| CLEAN-01 | Удалена OMS-специфика (BOGO, отзывы, CDEK/PayKeeper, Bitrix-редиректы, RU-страницы) | Full verified consumer graphs for BOGO (Architecture Patterns → Pattern 1), Reviews (Pattern 2, incl. definitive ARM-contract confirmation), CDEK (`delivery/page.tsx`), RU pages (`partners/**`, `studios/`, plus the previously-uncaught `sitemap.ts` STATIC_PATHS consumer), and `next.config.js` redirect pruning list — see Architecture Patterns + Recommended Task Structure. Grep-gates in Code Examples + Validation Architecture's Phase Requirements → Test Map give an automatable definition of "done" for each sub-item. |
| CLEAN-02 | Брендовые свопы под TR (телефон, соцсети, иконки оплаты) | Exhaustive phone-number consumer graph (3 files, not 2 — Header.tsx gap found), socials/payment-icon exact line locations in Footer.tsx, orphaned-asset bonus findings (`payment.svg`, `pay-systems.png`), and two Open Questions (robots.txt RU domain, contacts-page RU email) flagged for explicit planner/user decision since they sit just outside CONTEXT.md's literal D-03..D-06 scope but match CLEAN-02's stated intent. |
</phase_requirements>

## Summary

Phase 6 removes five categories of dead RU/OMS-inherited code (BOGO promo, product reviews,
CDEK delivery options, RU business pages, Bitrix redirects) and swaps four brand touchpoints
(phone, socials, payment icons, delivery payment image) for TR placeholders. It is a pure
subtraction + placeholder-substitution phase: **no new npm packages, no new architecture, no new
external contracts.** The entire risk surface is "did we find every consumer of the code we're
about to delete."

I re-derived the full consumer graph directly from source (not from CONTEXT.md's already-good
list) and found it needs **three corrections/additions CONTEXT.md's scouted list did not
capture**:

1. `src/app/sitemap.ts` `STATIC_PATHS` hardcodes `/partners`, `/partners/shops`,
   `/partners/bloggers`, `/partners/schools`, `/studios` — these must be removed from the array
   or `sitemap.xml` will advertise 5 URLs that 404 after D-01 lands (SEO defect + a natural
   grep/build-time catch point).
2. The RU phone number `+7 995 757-84-67` appears in **three** files, not the two CONTEXT.md
   names (`Footer.tsx:163,204`): it is also in `Header.tsx:140` and, differently formatted
   (`tel:+79957578467` / `+7 995 757-84-67`), in `src/app/[locale]/contacts/page.tsx:96,107`.
3. `src/app/[locale]/contacts/page.tsx:80,92` also hardcodes the RU email
   `info@american-creator.ru`, and `public/robots.txt:9` hardcodes
   `Sitemap: https://american-creator.ru/sitemap.xml` (asserted by `seo.test.ts:240`) — a static
   artifact carrying the RU domain that Phase 4/5's `SITE_URL` env-based approach (`seo.ts`)
   deliberately avoided everywhere else. Neither is named in CONTEXT.md's decisions; both are
   flagged below as **Open Questions** for the planner/user rather than silently fixed, since they
   go slightly beyond the literal D-03 scope (Footer phone) but are the same category of "leftover
   RU contact info" the phase exists to remove.

The D-09 reviews question is **fully closed by code, not just OpenAPI inspection**:
`src/lib/server-api.ts:126` already contains the literal comment `// ARM has no storefront
reviews — aggregate is always absent (cleanup in Phase 6)`, written during an earlier phase. The
ARM OpenAPI spec (`~/work/autoCRM/packs/arm/bff/docs/openapi.yaml`) has **zero** `/reviews` path
and the `DistributorProduct` schema has no rating field. **Verdict: delete unconditionally, no
data-gating needed.**

The BOGO-HOOK removal pattern is exceptionally clean: every consumer is bracketed with
`// BOGO HOOK START` / `// BOGO HOOK END` (or JSX-comment equivalent), so `git grep -n "BOGO
HOOK"` alone finds every deletion site (verified: exactly 4 files, 8 markers, matches
`README.md`'s own removal instructions in `src/features/promo-bogo/README.md`).

One naming trap for the planner: **`api.ts`/`arm-adapter.ts` contain TWO unrelated things both
called "promo"** — the dead BOGO auto-promo (`active_promo` field, to delete) and the live,
required `validatePromo()` / `PromoValidationResult` / `promoCode` promo-CODE feature (CART-06,
used by `/basket` and `/checkout`, marked Complete in REQUIREMENTS.md). **Do not touch
`validatePromo`, `PromoValidationResult`, or `promoCode`** — only `active_promo` and the
`src/features/promo-bogo/**` module are in scope.

**Primary recommendation:** Execute this phase as a sequence of small, independently-verifiable
commits, each closed by a grep-gate + `npx tsc --noEmit` + `npx vitest run` (baseline: tsc clean,
141/144 tests passing with 3 pre-existing, phase-6-unrelated failures in
`server-api.test.ts` — see Validation Architecture). Order: (1) BOGO removal (self-contained,
marker-delimited), (2) Reviews removal, (3) RU business pages + their 3 consumers (Header, Footer,
sitemap.ts), (4) CDEK/delivery rewrite, (5) next.config.js redirect pruning, (6) brand swaps
(phone/socials/payment icons), each gated before moving to the next.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| BOGO promo UI (banner/badge) | Browser/Client (`'use client'` components) | — | Pure presentational feature, no server logic; BFF-side already independent (`packs/oms/bff/promo-bogo`, out of scope/isolation) |
| Product reviews | Browser/Client (fetch+form) + none server-side | API/Backend (absent — no ARM endpoint) | ARM never implemented this capability; storefront-side stub only |
| Delivery content (`/delivery`) | Frontend Server (SSR page, static i18n content) | — | No dynamic data; purely a content/i18n page today |
| RU business pages (partners/studios) | Frontend Server (static pages) | — | No data fetching; pure marketing content, entirely removable at this tier |
| Legacy Bitrix redirects | Frontend Server (`next.config.js` `redirects()`) | CDN/Static (served at edge by Next) | Route-level concern, resolved before any page renders |
| Brand contacts/socials/payment icons | Browser/Client (Footer/Header, static `<img>`/text) | Frontend Server (`robots.txt`, `sitemap.ts` for canonical domain) | Presentational + a couple of build-time static artifacts |
| Sitemap/robots SEO artifacts | Frontend Server (`sitemap.ts` route) + CDN/Static (`public/robots.txt`) | — | Must stay consistent with route deletions (see Summary point 1) |

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.** No `npm install` step exists in any
of D-01 through D-09. If the planner chooses "new Troy icon asset" via
`~/generate_image.py` (per `/home/lexun/CLAUDE.md`), that is a local script invocation, not a
package install, and needs no registry verification.

## Architecture Patterns

### System Architecture Diagram

```
Browser request
      │
      ▼
Next.js Middleware (next-intl locale routing) ─────────────► 404 for deleted routes
      │                                                        (/partners*, /studios)
      ▼
next.config.js redirects()  ──► legacy Bitrix/.php/RU-slug URLs
      │  (pruned in D-07; only trailing-slash hygiene survives)
      ▼
src/app/[locale]/**/page.tsx  (SSR/CSR React components)
      │
      ├─► Header.tsx / Footer.tsx  ── nav links, phone, socials, payment icons
      │        (brand-swap targets: D-03..D-06)
      │
      ├─► ProductCard.tsx / catalog pages ── BOGO HOOK markers (D-08, delete)
      │
      ├─► ProductDetail.tsx ── <ProductReviews/> (D-09, delete) + JSON-LD via seo.ts
      │
      └─► delivery/page.tsx ── CDEK_OPTIONS + payment-systems.png (D-02/D-06, rewrite)
      │
      ▼
src/lib/api.ts / arm-adapter.ts / server-api.ts  ── ARM BFF client
      │        (validatePromo/PromoValidationResult = KEEP, unrelated to BOGO)
      │        (fetchProductReviews/submitReview = DELETE, dead client calls)
      ▼
ARM BFF  /public/arm/storefront/*  (read-only verified: no /reviews path exists)
      │
      ▼
src/app/sitemap.ts + public/robots.txt  ── SEO artifacts
         (STATIC_PATHS must drop partners/studios; robots.txt RU-domain — see Open Questions)
```

### Recommended Task Structure (this IS the project structure — cleanup only, no new folders)
```
src/
├── features/promo-bogo/     # DELETE entire directory (D-08)
├── components/
│   ├── Footer.tsx            # EDIT: SOCIALS, PAYMENT_ICONS, phone (D-03..D-06)
│   ├── Header.tsx             # EDIT: remove nav.studios/nav.partners, phone (D-01, +gap #2)
│   ├── ProductCard.tsx        # EDIT: remove BOGO HOOK block (D-08)
│   ├── ProductDetail.tsx      # EDIT: remove <ProductReviews/> import+usage (D-09)
│   ├── ProductReviews.tsx     # DELETE (D-09)
│   └── __tests__/
│       └── ProductReviews.test.tsx   # DELETE (D-09)
├── app/[locale]/
│   ├── page.tsx, catalog/page.tsx, catalog/[slug]/page.tsx  # EDIT: remove BOGO HOOK (D-08)
│   ├── catalog/[slug]/[productSlug]/page.tsx  # EDIT: drop reviews fetch + JSON-LD arg (D-09)
│   ├── partners/**            # DELETE entire directory (D-01)
│   ├── studios/               # DELETE entire directory (D-01)
│   └── delivery/page.tsx      # EDIT: CDEK_OPTIONS → TR content, payment image (D-02/D-06)
├── app/sitemap.ts             # EDIT: drop partners/studios from STATIC_PATHS (gap #1)
├── lib/
│   ├── api.ts                 # EDIT: remove active_promo field + BOGO comment;
│   │                           #        remove fetchProductReviews/submitReview/ProductReview*
│   │                           #        KEEP validatePromo/PromoValidationResult/promoCode
│   ├── arm-adapter.ts          # EDIT: remove `active_promo: null` line (D-08)
│   ├── seo.ts                  # EDIT: remove ReviewAggregate + aggregateRating block (D-09)
│   └── server-api.ts           # EDIT: remove fetchProductReviewAggregateServer (D-09)
├── app/[locale]/contacts/page.tsx  # EDIT: RU phone + RU email → TR placeholders (gap #2/#3)
public/
├── promo-bogo/**              # DELETE (D-08)
├── icons/{soc-vk.png,soc-wb.svg,paykeeper.png}  # DELETE (D-04/D-05)
├── icons/pay-systems.png, icons/payment.svg      # DELETE — verified unused, orphaned dupes (bonus)
├── images/delivery/payment-systems.png           # REPLACE or drop block (D-06)
├── images/partners/**, images/studios/**          # DELETE (D-01, images only used by those pages)
└── robots.txt                                     # see Open Questions (RU domain in Sitemap: line)
next.config.js                 # EDIT: redirects() — prune per D-07, keep trailing-slash hygiene
messages/{en,tr}.json           # EDIT: remove ~104 keys per locale (parity verified 388/388 today)
```

### Pattern 1: Marker-delimited removal (BOGO)
**What:** Every BOGO consumer site is wrapped in `// BOGO HOOK START` … `// BOGO HOOK END` (or the
JSX-comment form `{/* BOGO HOOK START */}`).
**When to use:** This is the safest removal in the phase — a single `git grep -n "BOGO HOOK"`
before AND after the deletion commit is the verification gate (before: 8 matches across 4 files;
after: 0).
**Verified sites (exhaustive, `git grep -n "BOGO HOOK\|PromoBanner\|PromoBadge\|PromoPlashka\|useAutoPromo\|promo-bogo"` against `src`):**
```
src/app/[locale]/page.tsx:5-7,12-14                (import + <PromoBanner/>)
src/app/[locale]/catalog/page.tsx:5-7,12-14        (import + <PromoBanner/>)
src/app/[locale]/catalog/[slug]/page.tsx:6-8,14-16 (import + <PromoBanner/>)
src/components/ProductCard.tsx:13-15,43-45         (import + <PromoBadge/>)
src/lib/api.ts:44-46                               (active_promo field, comment-delimited)
src/lib/arm-adapter.ts:54                           ("active_promo: null" + comment, no markers
                                                      but single-line, trivial to find via
                                                      `grep -n active_promo`)
```
`useAutoPromo` and `PromoPlashka` are exported from `src/features/promo-bogo/index.ts` but are
**never imported anywhere in the app** (verified — dead code inside already-dead code). Deleting
the whole `src/features/promo-bogo/` directory removes them automatically; no separate consumer
search needed for those two.

### Pattern 2: Contract-verified deletion (Reviews)
**What:** Before deleting a feature that talks to a backend, verify the backend truly never
served it — don't just delete based on a design assumption.
**Verification performed (do not re-verify at planning/execution time — this is closed):**
- `grep -n -i review /home/lexun/work/autoCRM/packs/arm/bff/docs/openapi.yaml` → 1 match, and it
  is about **promo-code preview** text ("Checks a promo code... previews the..."), not product
  reviews.
- Full path list of `/public/arm/storefront/*` (verified via `grep -n "^  /"` on the same file):
  `/config, /categories, /products, /products/{id}, /countries, /shipping/rates, /cart/validate,
  /promo/validate, /orders, /orders/{id}, /payment/create-session, /contact, /auth/*` — no
  `/reviews` path exists.
- `DistributorProduct` schema (backing `/products`, `/products/{id}`) has no rating/review field.
- `src/lib/server-api.ts:123-129` — `fetchProductReviewAggregateServer` is already a no-op stub
  that always `return null`, with the literal comment `// ARM has no storefront reviews —
  aggregate is always absent (cleanup in Phase 6)`. This function was written in anticipation of
  this exact phase.
**Consumer graph for reviews (exhaustive):**
```
src/components/ProductReviews.tsx                       DELETE (whole file)
src/components/__tests__/ProductReviews.test.tsx         DELETE (11 test cases)
src/components/ProductDetail.tsx:29,893                  EDIT (remove import + <ProductReviews/>)
src/lib/api.ts:150-190ish                                EDIT (remove ProductReview interface,
                                                          ProductReviewsResponse, EMPTY_REVIEWS,
                                                          fetchProductReviews, submitReview)
src/lib/seo.ts:143-146 (ReviewAggregate interface),
        157-159 (reviews param), 186-194 (aggregateRating block)   EDIT
src/lib/server-api.ts:23 (import),117-129 (function)     EDIT (remove entirely)
src/app/[locale]/catalog/[slug]/[productSlug]/page.tsx:6,7,44,51   EDIT (remove
        fetchProductReviewAggregateServer call + reviews var + 2nd arg to buildProductJsonLd)
src/lib/seo.test.ts:188-196 ("adds aggregateRating...")   DELETE this test
src/lib/seo.test.ts:198-205 ("omits aggregateRating...")  EDIT — drop the two assertions that
        pass a `reviews` 2nd arg once that param is removed; keep the no-arg assertion
```
`src/app/sitemap.ts` was named as a reviews consumer in CONTEXT.md but **is not** — verified via
full-file read; the "FBG-67 review" string on line 87 is an unrelated code-review reference, not
product reviews. Remove it from the reviews task's file list (saves a wasted verification step);
but sitemap.ts DOES need editing for the (unrelated) partners/studios STATIC_PATHS reason above.

`src/components/__tests__/ProductDetail.sanitize.test.tsx:47-52` currently mocks
`@/lib/auth-context` with the comment "ProductDetail embeds ProductReviews, which calls
useAuth()". Verified (`grep -n useAuth src/components/ProductDetail.tsx`) that `useAuth` is used
in `ProductDetail.tsx` **only** via `ProductReviews`. After D-09, this mock becomes inert (mocking
a module the component no longer imports) but is **not a build/test break** — vitest happily
no-ops an unused `vi.mock`. Recommend the planner delete the now-stale mock + comment for
cleanliness, but it is not required for correctness.

### Anti-Patterns to Avoid
- **Deleting `validatePromo`/`PromoValidationResult`/`promoCode` by mistake because the word
  "promo" appears in the same files as BOGO's `active_promo`.** These are CART-06 (Complete,
  required), used live by `/basket` and `/checkout`. Only `active_promo` is BOGO.
- **Trusting CONTEXT.md's consumer list as exhaustive without a final `git grep` pass.** It is
  very good (it correctly named the BOGO-HOOK pattern and got 90%+ of files right) but missed the
  sitemap.ts STATIC_PATHS array and two of three phone-number sites — both are the kind of gap a
  final `git grep -rn "<term>" src public` catches trivially.
- **Removing `next.config.js` redirects for `/help/delivery` and `/info/faq` without checking
  their destinations still exist.** They redirect to `/delivery` and `/faq`, which are NOT being
  deleted (D-02 keeps `/delivery`, `/faq` is untouched) — so per D-07 these two specific redirects
  are removed anyway (they're "RU URL hygiene", not needed for a TR-native site with no legacy
  Bitrix URLs to migrate from), but double-check no external TR marketing material will link
  `/help/delivery` before removing (deploy is deferred, so this is safe today).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Troy payment icon | A pixel-perfect reproduction of the official Troy trademark/logo | A neutral, genuinely-TR representative icon (simple wordmark badge, or the same `<img>` pattern already used for Visa/Mastercard — a small flat asset, not a sprite-position hack) | Payment scheme logos are trademarked; a generic identifiable "TROY" text-badge or simple monochrome card icon avoids brand/trademark risk while still being recognisable. `~/generate_image.py` (documented in `/home/lexun/CLAUDE.md`) can generate a neutral placeholder if a hand-drawn asset isn't available — treat its output as a placeholder needing real-brand asset before go-live, matching every other "TR placeholder" decision in this phase. |
| i18n key removal | A custom flatten/unflatten reimplementation | The existing `unflatten()` in `src/i18n/request.ts` (already lossless, already handles missing keys gracefully via `getMessageFallback`) | Already correct and tested; removing keys is just deleting JSON entries in both `messages/en.json` and `messages/tr.json`, no code change needed in `request.ts` itself |
| Verifying "did I delete every consumer" | Manual code review / relying on memory of what CONTEXT.md listed | `git grep` gates (see Validation Architecture) run BEFORE and AFTER each deletion commit | Grep is exhaustive and deterministic; this research already found 3 gaps in a carefully-written CONTEXT.md by doing exactly this |

**Key insight:** This phase has zero new technical risk (no new libraries, no new APIs) — all risk
is procedural (did the deletion touch every file). The correct research output for this kind of
phase is a verified consumer graph and a grep-gate script, not a framework tutorial.

## Runtime State Inventory

> Included because this phase deletes routes and swaps identity/brand data — the closest thing
> to a "rename" this project does. All five categories checked explicitly.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None.** No database in this repo (Next.js storefront only; ARM/BFF/DB live in the isolated `autoCRM` repo, out of scope). No localStorage/cookie keys reference `partners`/`studios`/`bogo`/`cdek` (checked `CartProvider.tsx`, `auth.ts` — only `arm_token`, cart state, `NEXT_LOCALE` cookie; none touched by this phase). | None |
| Live service config | **None found in this repo.** `Sentry`/GlitchTip DSNs (`sentry.*.config.ts`) reference project IDs, not routes — deleting `/partners`/`/studios` pages does not require any Sentry dashboard change (no per-route alert rules in this codebase). Deploy is deferred (PROJECT.md) — no live domain/CDN cache to purge for the deleted routes yet. | None now; if/when deployed, purge CDN cache for `/partners*`, `/studios` post-launch (not this phase — deploy is out of scope) |
| OS-registered state | **None.** No cron jobs, task schedulers, or process managers reference these routes (this is a stateless Next.js app; deployment/process-management is out of scope per PROJECT.md). | None |
| Secrets/env vars | **None affected.** No env var names encode "bogo", "cdek", "partners", "studios", "reviews", or the RU phone/email (checked `.env.example` / `process.env.` usages across `src/lib/*`). `NEXT_PUBLIC_SITE_URL` (used by `seo.ts`) is unrelated infra, not touched by this phase. | None |
| Build artifacts | **None found stale.** No compiled/generated artifact caches the RU phone number, BOGO config, or reviews schema (no codegen step in this repo; `next build` output is regenerated fresh each build). `public/robots.txt` is a static source file (not generated) — see Open Questions, it does carry the RU domain and IS a "build artifact" in the loose sense of "static public asset", but it's hand-authored, not machine-generated. | Regenerate/hand-edit `robots.txt` if planner decides to address the Open Question below |

## Common Pitfalls

### Pitfall 1: Assuming CONTEXT.md's file list is the complete consumer graph
**What goes wrong:** Deleting exactly the files CONTEXT.md names, and shipping a broken sitemap
(dead `/partners`/`/studios` URLs) or leaving 2 of 3 phone-number sites unswapped.
**Why it happens:** CONTEXT.md was written from a manual scout, not an exhaustive grep pass — very
good but not perfect (verified: it missed `sitemap.ts` STATIC_PATHS entirely, and named only 2 of
3 phone-number files).
**How to avoid:** Before closing each removal/swap task, run a final `git grep -rn "<exact
string/route>" src public` and diff against the task's expected file list. This research already
performed that pass for every D-01..D-09 target — the per-pattern "Consumer graph (exhaustive)"
lists above are the ground truth to plan tasks against.
**Warning signs:** A grep for the removed identifier returns anything after the "delete" commit.

### Pitfall 2: Confusing BOGO's `active_promo` with CART-06's `promoCode`/`validatePromo`
**What goes wrong:** Deleting or breaking the working promo-code-at-checkout feature while
cleaning up BOGO, because both live in `api.ts`/`arm-adapter.ts` and both contain the string
"promo".
**Why it happens:** Same file, adjacent code, similar vocabulary, different features (BOGO =
auto-applied gift promo, dead; promo-CODE = user-entered discount code, live, required by
CART-06/REQUIREMENTS.md).
**How to avoid:** Only touch code literally marked `// BOGO HOOK` or the `active_promo` field
name. `validatePromo`, `PromoValidationResult`, `promoCode`, and everything in
`basket/page.tsx`'s promo block (`promoInput`, `promoResult`, `handleApplyPromo`) must be
untouched.
**Warning signs:** `npx tsc --noEmit` errors referencing `PromoValidationResult` or
`validatePromo` after a BOGO-cleanup commit — stop immediately, that commit touched the wrong
"promo".

### Pitfall 3: `npm run lint` is non-functional in this repo (no ESLint config, prompts interactively)
**What goes wrong:** A verification step that shells out to `npm run lint` (`next lint`) hangs or
silently "passes" in a CI context because Next 14 prompts interactively
("How would you like to configure ESLint?") when no `.eslintrc*`/`eslint.config.*` exists — and
**no ESLint config file exists anywhere in this repo** (verified: `find . -maxdepth 1 -iname
".eslintrc*"` / `eslint.config*"` → empty; `eslint` is not even in `package.json` dependencies).
**Why it happens:** `next lint` auto-bootstraps ESLint config on first invocation; this repo has
never run it non-interactively.
**How to avoid:** Do NOT rely on `npm run lint` as a phase-6 gate. Use `npx tsc --noEmit` (verified
clean baseline, 0 errors) for static analysis instead — it already catches dangling imports /
removed-type usages, which is the actual risk this phase carries.
**Warning signs:** A CI/verification step hangs with no output — it's waiting on the interactive
ESLint-setup prompt.

### Pitfall 4: `server-api.test.ts` has 3 pre-existing failures unrelated to this phase
**What goes wrong:** A verifier sees `vitest run` report failures after a Phase 6 commit and
(wrongly) attributes them to the phase-6 change, blocking the gate.
**Why it happens:** `armToProduct` in `src/lib/arm-adapter.ts:33` reads `p.name` of an `undefined`
inner product in 3 mock-fixture-mismatched tests — a **pre-existing** bug dating to before Phase 3
(documented in `STATE.md` "Pending Todos" as `server-api.test.ts` fixture/adapter mismatch), fully
independent of BOGO/reviews/CDEK/redirects/brand.
**How to avoid:** Baseline verified this session: `npx vitest run` → **141 passed, 3 failed, 144
total**, all 3 failures in `src/lib/server-api.test.ts` (`fetchProductServer` × 2,
`fetchAllProductsServer` × 1), zero relation to any Phase 6 file. The Phase 6 gate should assert
"no NEW failures" (i.e., failure count stays at 3, or drops if `ProductReviews.test.tsx`'s 11
tests are removed — total drops to 133, still 3 pre-existing failures), not "0 failures".
**Warning signs:** Blocking phase completion on these 3 specific test names — don't; they are a
known, separately-tracked backlog item.

### Pitfall 5: `unflatten()` degrades missing keys silently — a missed i18n-key removal won't crash, but will leak raw key strings
**What goes wrong:** If a page still references e.g. `t('studios.heroTitle')` after the key is
deleted from `messages/{en,tr}.json`, next-intl does NOT throw (unlike the Phase-5 nested-object
bug already fixed) — `getMessageFallback` in `src/i18n/request.ts:49-51` returns the literal
string `"studios.heroTitle"` to render in the UI. The build stays green; only a visual/QA pass (or
a targeted grep) catches it.
**Why it happens:** The graceful-fallback behavior was deliberately added (Phase 5 GAP-CLOSURE)
to avoid hard 500s on missing translations — a correct tradeoff in general, but it means i18n-key
removal errors are NOT caught by `tsc`/`vitest`/`next build`.
**How to avoid:** After deleting a route (and thus its exclusive i18n keys), grep the **surviving**
`src/app/**` and `src/components/**` for the removed key prefixes (`studios.`, `partners.`,
`promo.`, `delivery.cdek`, `product.reviews` etc.) — verified this session: EN/TR both currently
have exactly matching counts for every removal-target prefix (388 keys each; ~104 to remove per
locale), so a straightforward "grep the key prefix in messages/*.json AND in src/**" before/after
comparison is a reliable gate.
**Warning signs:** A page renders a dotted-key-looking string instead of translated text.

## Code Examples

### Grep-gate for BOGO removal completeness (before/after every promo-bogo commit)
```bash
# Source: verified in this repo's own README removal instructions
# (src/features/promo-bogo/README.md), cross-checked with a full git grep.
git grep -n "BOGO HOOK\|PromoBanner\|PromoBadge\|PromoPlashka\|useAutoPromo\|promo-bogo\|active_promo" -- src public
# Expect: 8 marker lines + active_promo (2 sites) BEFORE deletion.
# Expect: ZERO matches AFTER deletion (except this grep command itself, if committed to docs).
```

### Grep-gate for full phase-6 cleanup (final gate before phase close)
```bash
# Source: derived from CONTEXT.md D-01..D-09 + gaps found in this research (sitemap.ts, contacts page).
for term in cdek paykeeper bogo "vk\.com" wildberries yandex_money webmoney qiwi "+7 995" "american-creator\.ru"; do
  echo "== $term =="
  grep -rniI "$term" src public --include="*.ts" --include="*.tsx" --include="*.json" \
    --exclude-dir=node_modules
done
# `american-creator.ru` intentionally kept in the loop as a REPORT-ONLY check (see Open Questions —
# not all hits are in scope; the copyright text and code comments may legitimately survive).
```

### i18n key-count parity check (run after every messages/*.json edit)
```bash
python3 - <<'PY'
import json
en = json.load(open('messages/en.json'))
tr = json.load(open('messages/tr.json'))
assert len(en) == len(tr), f"PARITY BROKEN: en={len(en)} tr={len(tr)}"
assert set(en) == set(tr), f"KEY MISMATCH: {set(en) ^ set(tr)}"
print(f"OK: {len(en)} keys, EN/TR parity holds")
PY
```

### Verifying a deleted route 404s and a kept redirect resolves (manual/E2E spot check)
```bash
# After `npm run build && npm start` (port 3003):
curl -sI http://localhost:3003/en/partners | head -1     # expect 404
curl -sI http://localhost:3003/en/studios | head -1       # expect 404
curl -sI http://localhost:3003/basket/ | head -1          # expect 301 -> /basket (kept, D-07)
curl -sI http://localhost:3003/help/delivery | head -1    # expect 404 (removed, D-07)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| CSS-sprite `bgPos` payment icons (`mastercard`/`visa`/`yandex_money`/`webmoney`/`qiwi` in one `payment-sprite.svg`) | Same sprite mechanism, but with RU-scheme entries (`yandex_money`, `webmoney`, `qiwi`) removed and a Troy entry added — either as a 4th sprite position (if a Troy asset is added to the same SVG) or as a standalone small `<img>`, matching the existing per-icon `<Box>` pattern already used for each icon | This phase (D-05) | No architectural change — just data (which icons render); `payment.svg`/`pay-systems.png` in `public/icons/` are verified **unused** duplicate/orphan files already (0 references in `src/`), safe to delete as a bonus cleanup regardless of D-05's chosen approach |
| `fetchProductReviewAggregateServer` returning a hardcoded `null` stub "for future removal" | Function deleted entirely, `buildProductJsonLd`'s `reviews` param removed | This phase (D-09) | JSON-LD for products drops the (always-empty) `aggregateRating` block; no SEO regression since it was never populated in ACTR (Google explicitly penalizes zero-count aggregateRating, so removing it is a minor SEO improvement, not a regression) |

**Deprecated/outdated:**
- BOGO promo feature (`src/features/promo-bogo/**`): time-boxed May 2026 RU campaign, dead by
  design once the campaign window (already expired per `config.ts`'s `PROMO_TO_ISO =
  2026-05-31T23:59:59+03:00`) passed — this phase performs the "Hard-remove" path the module's own
  `README.md` documents.
- CDEK (Russian courier network) as the sole delivery-options vocabulary in `/delivery` — being
  replaced with neutral TR delivery language (real carrier is a deploy-track open question per
  `autoCRM/docs/modules/arm/ACTR/open-questions.md`, out of this phase's scope per CONTEXT.md).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A simple `<img>`-based Troy icon (or AI-generated placeholder via `~/generate_image.py`) is an acceptable "TR placeholder" for D-05, not a legally-reviewed trademark-compliant asset | Don't Hand-Roll | Low — CONTEXT.md explicitly frames all brand swaps in this phase as placeholders "перед go-live"; if a real Troy logo license/asset is required before any deploy, that is already flagged as a deploy-track item, consistent with existing project conventions |
| A2 | `public/robots.txt`'s hardcoded `american-creator.ru` domain and `contacts/page.tsx`'s RU email are in-scope-adjacent findings, not confirmed in-scope by any D-0x decision | Summary / Open Questions | Low-medium — if planner silently "fixes" these without a user decision, it exceeds CONTEXT.md's locked scope; if left untouched, the phase's own goal ("после неё в коде не должно остаться... RU-специфичных" contacts) is only partially met. Flagged as Open Question, not silently resolved either way. |
| A3 | `src/lib/hydrationNoise.ts`/`chunkReload.test.ts` comments/fixtures referencing `american-creator.ru` (as a historical GlitchTip incident ID/test URL, not live brand contact) are out of scope for CLEAN-02 | Summary | Low — these are code comments and test fixture strings unrelated to user-facing brand identity; leaving them does not affect Success Criteria ("удалены... RU-платёжные иконки" etc. — these files contain neither) |

## Open Questions (RESOLVED 2026-07-01 during planning)

> **Resolution:** All three folded during plan-phase.
> - **Q1 (robots.txt RU domain)** → RESOLVED as **D-11** in `06-CONTEXT.md` (de-RU robots.txt + update
>   `seo.test.ts:240`); implemented by plan `06-02`.
> - **Q2 (contacts RU email)** → RESOLVED as **D-10** in `06-CONTEXT.md` (TR-placeholder email); plan `06-05`.
> - **Q3 (code-comment/test-fixture `american-creator.ru` refs)** → confirmed **out of scope** (not
>   user-facing brand identity; does not affect Success Criteria) — discretion, not a research gap.

1. **Should `public/robots.txt`'s `Sitemap: https://american-creator.ru/sitemap.xml` line be
   updated as part of this phase?**
   - What we know: It's a static file, asserted verbatim by `seo.test.ts:240`. It's the one
     remaining hardcoded RU-domain reference in a build-shipped artifact; everywhere else (see
     `seo.ts:20-28`) the codebase deliberately uses an env-driven `SITE_URL` specifically to avoid
     this domain (commented "CR-01" fix from an earlier phase).
   - What's unclear: No `D-0x` decision names `robots.txt`. It could be read as "brand cleanup"
     (CLEAN-02) or as "out of scope until a real TR domain exists" (deploy is deferred per
     PROJECT.md, and any placeholder domain here is just as fake as `american-creator.ru`).
   - Recommendation: Ask the user (or default to leaving it, matching "deploy-track" deferral
     precedent) — if changed, update `seo.test.ts:240`'s assertion in the same commit, and prefer
     making `Sitemap:` line use an env-driven placeholder consistent with `seo.ts`'s `SITE_URL`
     pattern rather than hardcoding a different fake domain.

2. **Should `contacts/page.tsx`'s RU email `info@american-creator.ru` get a TR placeholder in this
   phase, or is it out of scope until real contacts are set?**
   - What we know: D-03 only names the Footer phone number explicitly; Header.tsx's phone (gap #2)
     and this email are not named in any D-0x.
   - What's unclear: Whether "brand-contacts swap" (CLEAN-02's stated goal: "Телефон, соцсети и
     иконки оплаты заменены на TR-эквиваленты") implicitly covers ALL phone/email occurrences
     (Header + contacts page too) or literally only Footer's two lines.
   - Recommendation: Given CLEAN-02's success criterion says "Телефон... заменены" (singular
     concept, not "Footer's phone"), treat all 3 phone sites (Header, Footer×2, contacts×1) as
     in-scope for the same placeholder swap — this reads as the intent, not scope creep. The
     email is the same category; recommend treating it identically (TR placeholder email) unless
     the user says otherwise during planning/discuss.

3. **Exact TR placeholder values (phone format, retained social handles, Troy icon
   implementation).**
   - What we know: CONTEXT.md explicitly delegates these to "Claude's Discretion".
   - What's unclear: Nothing blocking — this is confirmed-open discretion, not a research gap.
   - Recommendation: Planner picks a plausible TR phone format (`+90 5XX XXX XX XX` placeholder
     pattern), keeps Instagram + WhatsApp (per D-04), drops Telegram's `_ru` handle or the whole
     Telegram entry, and picks any of the three Troy-rendering options in Don't Hand-Roll — none
     of these choices affect other files, so they're low-risk/low-blast-radius decisions.

## Environment Availability

Skipped — this phase is a pure code/config/asset change with no new external tool, service, or
runtime dependency. All required tooling (`node`, `npm`, `vitest`, `tsc`) is already installed and
verified working in this repo (see Validation Architecture baseline below). `~/generate_image.py`
(optional, only if planner chooses to generate a Troy icon asset) is a pre-existing user script
per `/home/lexun/CLAUDE.md`, not a new dependency to install.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 (`vitest.config.ts`, jsdom environment, `@vitejs/plugin-react`) |
| Config file | `vitest.config.ts` (exists, `include: ['src/**/*.test.{ts,tsx}']`) |
| Quick run command | `npx vitest run <changed-test-file-path>` (or `npx tsc --noEmit` for a pure-deletion commit with no test changes) |
| Full suite command | `npx vitest run` (verified baseline: **144 tests, 141 pass, 3 pre-existing fail** — see Pitfall 4) |

**Additional gates (this phase, not framework-provided):**
- `npx tsc --noEmit` — verified clean baseline (0 errors) this session; catches dangling
  imports/removed-type usages, the actual risk class for a deletion phase.
- `npm run build` (`next build`) — full production build; catches anything `tsc --noEmit` alone
  might miss (e.g. unresolved dynamic imports, `next.config.js` redirect syntax errors). Not run
  this session (~slow); recommend the planner run it once per wave, not per task.
- `npm run lint` — **do not use**, see Pitfall 3 (non-functional without interactive ESLint setup).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLEAN-01 (BOGO removal) | No BOGO imports/markers remain; app still builds/type-checks | grep-gate + typecheck | `git grep -n "BOGO HOOK\|active_promo" src public` (expect 0) `&&` `npx tsc --noEmit` | ✅ (grep is the "test"; no dedicated unit test needed — feature had no unit tests to begin with) |
| CLEAN-01 (Reviews removal) | `ProductReviews` gone; JSON-LD has no `aggregateRating`; suite green minus the 11 removed tests | unit + grep-gate | `npx vitest run src/lib/seo.test.ts` + `git grep -rn "ProductReviews\|aggregateRating\|ReviewAggregate" src` (expect 0) | ✅ `seo.test.ts` exists, needs editing (2 tests), not creating |
| CLEAN-01 (CDEK removal) | No `cdek`/`CDEK` string remains; `/delivery` still renders with TR content | grep-gate + manual/E2E render check | `grep -rniI cdek src` (expect 0) | ❌ Wave 0 gap — no automated render-content assertion exists for `/delivery`; recommend a lightweight RTL smoke test if the planner wants automated coverage, otherwise a manual page-load check is acceptable for a content-only page |
| CLEAN-01 (RU pages removal) | `/partners*`, `/studios` 404; sitemap has no dead entries; nav has no dangling links | grep-gate + `sitemap.test.ts` + manual `curl` 404 check | `git grep -rn "'/studios'\|'/partners" src` (expect only inside a task's own deleted files, i.e. 0 after) + `npx vitest run src/app/sitemap.test.ts` | ✅ sitemap.test.ts exists; STATIC_PATHS edit is a one-line diff per removed path |
| CLEAN-01 (Bitrix redirects) | `next.config.js` redirects() only contains trailing-slash hygiene entries for existing routes | manual review + `npm run build` (validates redirect syntax) | `node -e "console.log(require('./next.config.js'))"` won't execute the async `redirects()` directly — easiest is `next build` succeeding + a manual `curl -I` spot-check per Code Examples | ❌ Wave 0 gap — no automated test for `next.config.js` redirects in this repo (none existed before this phase either); acceptable to gate via `next build` + manual curl per Code Examples, no new test infra required for a 1-time redirect prune |
| CLEAN-02 (brand swaps) | No RU social/payment/phone strings remain; TR placeholders render | grep-gate (see Code Examples "full phase-6 cleanup") | `for term in ...; do grep -rniI "$term" src public; done` (expect 0 for every term) | ✅ grep-gate; no dedicated unit test for Footer/Header brand constants exists or is needed (they're static arrays, not logic) |

### Sampling Rate
- **Per task commit:** the grep-gate relevant to that task (see Code Examples), plus
  `npx tsc --noEmit`.
- **Per wave merge:** `npx vitest run` (full suite) — confirm failure count is still exactly 3
  (pre-existing) or 3-minus-however-many-ProductReviews-tests-were-removed-this-wave, never more.
- **Phase gate:** `npm run build` once, plus the full "phase-6 cleanup" grep-gate loop (Code
  Examples) returning zero matches for every RU-specific term, plus the i18n parity script.

### Wave 0 Gaps
- [ ] No automated render-content assertion for `/delivery` post-CDEK-rewrite — acceptable to
  leave manual for a content-only page; optionally add a minimal RTL smoke test
  (`delivery/page.test.tsx`) asserting the page renders without `cdek`/`CDEK` in its output, if the
  planner wants a regression guard baked into `npx vitest run`.
- [ ] No automated test for `next.config.js` `redirects()` — none existed pre-phase-6 either; a
  manual `curl -I` pass (Code Examples) is the accepted gate for this one-time prune.

*(No framework install gap — Vitest is already fully configured and green aside from the 3
documented pre-existing failures.)*

## Security Domain

`security_enforcement: true`, ASVS L1 (`.planning/config.json`). This phase is net attack-surface
**reducing** (delete two client-callable endpoints' consumers: `/reviews` GET/POST client calls,
and one client-side-only BOGO feature with no server trust boundary). No new input handling, no
new auth surface, no new external package.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Unaffected — `useAuth()`/`getToken()` usage in `ProductReviews.tsx` is deleted wholesale, not modified |
| V3 Session Management | No | Unaffected |
| V4 Access Control | No | No access-control logic touched; deleted pages (`/partners`, `/studios`) were public marketing pages with no auth gate to begin with |
| V5 Input Validation | Marginal | `submitReview()`'s `text`/`rating` input path is **removed entirely** (net risk reduction — one less user-input → server round trip); no new input surface introduced |
| V6 Cryptography | No | Unaffected |
| V14 Configuration | Yes | `next.config.js` `redirects()` — verify every retained redirect targets a same-origin, hardcoded (not user-controlled) destination (already true today: all destinations are literal strings or Next `:param` interpolation into a fixed same-origin path, never an external URL or raw user input — this is NOT an open-redirect risk before or after the phase, but worth a one-line confirmation in the plan-check since redirects() is being edited) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Open redirect via crafted `destination` derived from user input | Tampering | N/A here — all `redirects()` destinations are static strings/route-param interpolation to same-origin paths, never templated from query/user input; confirm this invariant holds after D-07's edits (it will, since the edit only *removes* entries) |
| Stored XSS via admin-controlled rich text (`detail_text`/`usage_text`/`application_text`) | Tampering/Elevation | Already mitigated via `DOMPurify.sanitize()` in `ProductDetail.tsx`, covered by `ProductDetail.sanitize.test.tsx` — **not touched by this phase**, but the test's stale `useAuth` mock (Pitfall in Architecture Patterns) is adjacent; ensure this test still passes unmodified after D-09 (verified this session: the mock is inert-safe, no expected regression) |
| Dead code as latent attack surface | Elevation of Privilege (indirect) | Removing `active_promo`/BOGO and `/reviews` client calls is itself a (minor) security improvement — fewer client-triggerable code paths calling the BFF for features the BFF doesn't even support server-side |

## Sources

### Primary (HIGH confidence — verified directly in this session via tool calls)
- Repo source tree (`/home/lexun/work/puz/ACTR/src/**`, `public/**`, `next.config.js`,
  `messages/{en,tr}.json`, `package.json`, `vitest.config.ts`) — read/grepped directly.
- `~/work/autoCRM/packs/arm/bff/docs/openapi.yaml` — read-only, grepped for `/reviews` (0 matches)
  and full path list (confirmed no reviews endpoint exists).
- `npx tsc --noEmit` — executed this session, 0 errors (baseline).
- `npx vitest run` — executed this session, 144 tests / 141 pass / 3 pre-existing fail (baseline).
- `npm run lint` (with auto-declined interactive prompt) — executed this session, confirmed
  non-functional without prior ESLint setup.

### Secondary (MEDIUM confidence)
- None — this phase required no external web research; every claim was verifiable directly
  against the repo or the sibling OpenAPI spec.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: N/A — no new packages
- Architecture: HIGH — every consumer-graph claim verified via `git grep`/file reads this session
- Pitfalls: HIGH — all 5 pitfalls reproduced/verified directly (baseline test run, lint prompt,
  grep counts), not inferred

**Research date:** 2026-07-01
**Valid until:** Until this phase's code is merged (this research is a snapshot of the current
tree; any commit to `src/`, `public/`, `messages/*.json`, or `next.config.js` before planning
starts should trigger a quick re-grep of the affected consumer lists above).
