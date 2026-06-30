---
phase: 04-i18n-en-tr
plan: "05"
subsystem: i18n-seo
tags: [i18n, seo, hreflang, sitemap, TRY, OG-locale, server-api, Tolgee, I18N-01, I18N-03, I18N-04]
dependency_graph:
  requires:
    - messages/en.json + messages/tr.json (Wave 1-4 — 334 keys base)
    - src/lib/money.ts (fmtMoney with locale param — Wave 1)
    - src/app/[locale]/layout.tsx (Wave 1 — [locale] routing)
    - src/i18n/routing.ts (Wave 1 — routing.locales)
  provides:
    - src/lib/seo.ts (locale-aware: buildMetaDescription/buildProductMetadata/buildProductJsonLd + hreflang + TRY)
    - src/app/[locale]/layout.tsx (generateMetadata with meta.* keys, OG locale, hreflang root)
    - src/lib/server-api.ts (fetchProductServer(idOrSlug, locale?) → ?lang=<bcp47>)
    - src/app/[locale]/catalog/[slug]/[productSlug]/page.tsx (locale threaded to fetch + metadata)
    - src/app/sitemap.ts (per-locale entries + alternates.languages on every record)
    - scripts/messages-pull.mjs (Tolgee REST pull, no @tolgee/cli)
    - messages/en.json + messages/tr.json (336 keys each, meta.* added)
  affects:
    - /[locale]/catalog/*/[productSlug] — SEO metadata now locale-aware
    - /sitemap.xml — per-locale + alternates.languages
    - /[locale]/* — layout generateMetadata uses translation keys
tech_stack:
  added: []
  patterns:
    - buildProductMetadata(product, locale) emits alternates.languages hreflang (en/tr) + OG locale (en_US/tr_TR)
    - buildProductJsonLd uses priceCurrency from NEXT_PUBLIC_STOREFRONT_CURRENCY (TRY, not RUB)
    - bffGet(path, lang?) appends ?lang=<bcp47> for server-side SEO fetches (I18N-03)
    - localizedEntry(path, opts) in sitemap.ts: canonical=/en/, alternates={en,tr}
    - generateMetadata in layout.tsx uses getTranslations('meta') for localized title/desc
    - messages:pull via node REST (D-05: no @tolgee/cli, no runtime Tolgee dependency)
key_files:
  created:
    - scripts/messages-pull.mjs
  modified:
    - src/lib/seo.ts
    - src/lib/seo.test.ts
    - src/lib/server-api.ts
    - src/app/[locale]/layout.tsx
    - src/app/[locale]/catalog/[slug]/[productSlug]/page.tsx
    - src/app/product-metadata.test.tsx
    - src/app/sitemap.ts
    - src/app/sitemap.test.ts
    - package.json
    - messages/en.json
    - messages/tr.json
decisions:
  - "priceCurrency in JSON-LD uses env NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY' (not hardcoded) per T-04-11 threat model — still constant from validated env, not user input"
  - "productCanonicalUrl() preserved unchanged (locale-less path) — used by sitemap.ts internally; buildProductMetadata computes locale-aware canonical inline"
  - "messages:pull uses node REST against Tolgee v2 export API (no @tolgee/cli — SUS-flagged per 04-RESEARCH.md); production reads committed static JSON (D-05)"
  - "Tolgee project 34 push/sync deferred — messages/en.json and messages/tr.json were authored locally across waves 1-5 (336 keys each); sync documented as Known Stubs"
  - "Phase I18N-01 grep-gate: 0 non-comment Cyrillic in src/**/*.{ts,tsx} — confirmed with exact plan grep command"
metrics:
  duration: "~11 minutes"
  completed: "2026-06-30"
  tasks: 3
  files: 11
---

# Phase 04 Plan 05: SEO + Tolgee Finalize + Phase Grep-Gate Summary

**One-liner:** seo.ts locale-aware (TRY/hreflang/OG locale), layout/product generateMetadata with getTranslations + alternates, fetchProductServer threads ?lang to BFF, sitemap per-locale + alternates.languages, messages:pull via Tolgee REST; I18N-01 phase grep-gate: 0 non-comment Cyrillic confirmed.

## What Was Built

### Task 1: seo.ts locale-aware (62137bb)

`src/lib/seo.ts` fully de-RU'd and locale-aware:

- **`formatRub` removed** — was the last Cyrillic-producing utility in shipped source.
- **`buildMetaDescription(product, locale = 'en')`** — fallback sentence uses `fmtMoney(price, TRY, bcp47)` with `'Shop ${SITE_NAME}: professional products for nail professionals.'` (no Cyrillic). TR locale formats as `₺`.
- **`buildProductMetadata(product, locale = 'en')`** — computes locale-aware canonical `${SITE_URL}/${locale}/catalog/...`; emits `alternates.languages = {en: ..., tr: ...}` (hreflang, I18N-04); `openGraph.locale = 'tr_TR'/'en_US'` (not 'ru_RU').
- **`buildProductJsonLd`** — `priceCurrency: process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'` (not 'RUB'; T-04-11 mitigated).
- **`seo.test.ts`** extended: 19 tests (OG locale, hreflang alternates, TRY, no-₽).
- **`messages/en.json` + `messages/tr.json`**: added `meta.siteDesc` and `meta.defaultTitle` keys (336 keys each).

### Task 2: generateMetadata + server locale (c750733)

- **`layout.tsx`**: replaced static `export const metadata` with `export async function generateMetadata({params})` using `getTranslations('meta')` for localized `title`/`description`; `openGraph.locale` derived from params; `alternates.languages` for root layout (`/en`, `/tr`). `<html lang={locale}>` was already in place from 04-01.
- **`server-api.ts`**: `bffGet<T>(path, lang?)` — appends `?lang=<bcp47>` via `URL.searchParams.set()` when provided (handles existing query params safely). `fetchProductServer(idOrSlug, locale?)` maps locale to BCP-47 (en→en-US, tr→tr-TR) and threads to bffGet. Completes I18N-03 server-side: SEO metadata (generateMetadata, JSON-LD) now reflects active locale.
- **Product page `generateMetadata`**: `fetchProductServer(params.productSlug, params.locale)` + `buildProductMetadata(product, params.locale)`. Product default export also passes locale to fetchProductServer for JSON-LD.
- **`product-metadata.test.tsx`** extended: 5 tests — hreflang alternates, OG locale for en/tr, fetchProductServer called with locale param, 404/5xx error handling preserved.

### Task 3: per-locale sitemap + messages:pull + grep-gate (34249fd)

- **`sitemap.ts`** rewritten with `localizedEntry(path, opts)` (Pattern 10, I18N-04):
  - Canonical URL = `/en${path}` (EN is canonical per D-07).
  - `alternates.languages = {en: .../en${path}, tr: .../tr${path}}` on every entry.
  - Applied to static (10 paths), category (per BFF), and product (per BFF) entries.
  - Build-time BFF fallback and runtime re-throw behavior preserved.
- **`sitemap.test.ts`** extended: 7 tests — canonical /en/ URLs, alternates.languages coverage per entry, per-locale URL correctness, lastModified, error handling.
- **`package.json`**: `"messages:pull": "node scripts/messages-pull.mjs"` — documented Tolgee sync command.
- **`scripts/messages-pull.mjs`**: Tolgee v2 REST export for project 34 (en + tr), requires `TOLGEE_API_KEY`. No `@tolgee/cli` (SUS-flagged). Production reads committed static JSON (D-05).
- **messages key parity**: 336 keys in both en.json and tr.json — verified with node script.
- **Phase I18N-01 grep-gate**: `grep -rnP "[А-Яа-яЁё]" src --include=*.ts --include=*.tsx | grep -v '\.test\.' | grep -vP ':\s*(//|\*|/\*)'` → **0 matches**. I18N-01 fully closed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Architectural Adjustment] productCanonicalUrl kept locale-less**
- **Found during:** Task 1 implementation
- **Issue:** Plan's pattern showed `url.replace(`/${locale}/`, '/en/')` but `productCanonicalUrl` returns `/catalog/slug` without locale. Modifying it would break the sitemap's internal usage.
- **Fix:** `buildProductMetadata` computes the locale-aware canonical URL directly (`/${locale}/catalog/...`) without calling `productCanonicalUrl`. Sitemap's `localizedEntry` builds locale URLs independently. `productCanonicalUrl` preserved for backward-compatible usage in JSON-LD (locale-less anchor URL, separate from metadata canonical).
- **Impact:** None — behavior correct; sitemap and metadata both produce proper locale URLs.

None — otherwise plan executed exactly as written.

## Known Stubs

**Tolgee project 34 push not performed (D-04)**

The Tolgee MCP (`mcp__tolgee__*`) is confirmed unavailable to agents (noted in 04-01 SUMMARY: "Tolgee MCP не доступен в агенте"). Messages were authored locally across waves 1-5 (336 keys each, EN and TR).

Status:
- `messages/en.json` — 336 EN keys authored manually across all 5 plans. Not yet pushed to project 34 as canonical source.
- `messages/tr.json` — 336 TR translations authored manually (inline Turkish, not from Tolgee machine translate). Real-world quality: adequate for MVP but not machine-translated or reviewed.
- `scripts/messages-pull.mjs` — documented and ready; requires `TOLGEE_API_KEY` and loco.devloc.su access.

**Follow-up action**: To establish Tolgee as actual source of truth (D-04), a developer should:
1. Generate a Personal Access Token from loco.devloc.su → Project 34 → API keys
2. `TOLGEE_API_KEY=<key> node scripts/messages-pull.mjs` to verify connectivity
3. Push the local `messages/en.json` keys to project 34 (via Tolgee UI or API import)
4. Use Tolgee machine-translate to complete TR coverage
5. Run `messages:pull` to sync back and commit

This does NOT block the phase acceptance — production reads the committed static JSON (D-05) and all 336 keys are present and correct.

## Threat Flags

None beyond plan's threat model. T-04-11 (JSON-LD priceCurrency) mitigated: value comes from `process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY'` — constant from validated env, not user input. T-04-12 (hreflang/sitemap URLs): verified — URLs built from `routing.locales + SITE_URL`, not user input.

## Verification Results

- `npx tsc --noEmit` — clean (0 errors, run after each task)
- `npx vitest run src/lib/seo.test.ts` — 19/19 passed
- `npx vitest run src/app/product-metadata.test.tsx` — 5/5 passed
- `npx vitest run src/app/sitemap.test.ts` — 7/7 passed
- `npx vitest run src/lib/seo.test.ts src/app/product-metadata.test.tsx src/app/sitemap.test.ts` — 31/31 passed
- Phase I18N-01 grep-gate: **0 non-comment Cyrillic in src/**/*.{ts,tsx}** (PASSED)
- TR key parity: 336 keys in en.json == 336 keys in tr.json (PASSED)
- `npm run build` — green; all /en/* and /tr/* routes generated; sitemap.xml route present
- `seo.ts` no RU residue: `grep -nP "ru-RU|ru_RU|RUB|formatRub|₽" src/lib/seo.ts | grep -vP ':\s*(//|\*|/\*)'` → 0 matches

## Requirements Closed

- **I18N-01**: Phase grep-gate 0 — no Cyrillic in shipped UI source (seo.ts was the last hold-out; now cleared)
- **I18N-03**: Server-side: `fetchProductServer(idOrSlug, locale?)` threads `?lang=<bcp47>` to BFF for server-rendered SEO metadata; client-side via proxy was completed in 04-02
- **I18N-04**: hreflang alternates.languages (en/tr) in product page and layout generateMetadata; `<html lang>` per locale (from 04-01); OG locale locale-aware; sitemap per-locale with alternates.languages

## Self-Check: PASSED

- src/lib/seo.ts — locale-aware, 0 Cyrillic/RUB/formatRub, contains alternates, TRY
- src/lib/seo.test.ts — 19 tests pass, OG locale + hreflang + TRY assertions
- src/lib/server-api.ts — fetchProductServer(idOrSlug, locale?), bffGet(path, lang?), contains 'lang'
- src/app/[locale]/layout.tsx — generateMetadata async with getTranslations, alternates.languages
- src/app/[locale]/catalog/[slug]/[productSlug]/page.tsx — locale passed to fetchProductServer + buildProductMetadata
- src/app/product-metadata.test.tsx — 5 tests pass, hreflang + OG locale + locale arg
- src/app/sitemap.ts — localizedEntry(), all entries have alternates.languages, contains 'alternates'
- src/app/sitemap.test.ts — 7 tests pass, per-locale + alternates.languages
- package.json — contains messages:pull (no @tolgee/cli)
- scripts/messages-pull.mjs — exists, documented Tolgee REST, no @tolgee/cli import
- messages/en.json — 336 keys, meta.siteDesc + meta.defaultTitle present
- messages/tr.json — 336 keys, parity with en.json confirmed
- Commits 62137bb, c750733, 34249fd — verified in git log

## Self-Check: PASSED

All files exist, all 4 commits verified in git log (62137bb, c750733, 34249fd, 76d969c), all 31 tests pass, grep-gate 0 Cyrillic confirmed.
