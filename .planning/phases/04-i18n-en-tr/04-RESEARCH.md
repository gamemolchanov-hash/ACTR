# Phase 4: i18n EN/TR - Research

**Researched:** 2026-06-30
**Domain:** Internationalization — Next.js 14 App Router + next-intl + Tolgee + ARM `?lang=`
**Confidence:** MEDIUM (next-intl docs verified via official site; ARM `?lang=` contract VERIFIED from BFF source)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** i18n through **`next-intl` + `[lang]` segment** (`/en`, `/tr`) in Next.js 14 App Router with middleware. SSR-localized strings close I18N-04 SEO requirement.
- **D-07 (SEO):** Per-language URL (`/en/...`, `/tr/...`); `hreflang` alternates, localized `<html lang>`, OG locale, sitemap with EN and TR entries.
- **D-02:** Supported UI languages — **EN and TR only**. RU removed entirely.
- **D-03:** Geo-detect: visitor from Turkey (`geo_country=TR`, from BFF `/storefront/config`) → **TR**; all others → **EN**. Choice persisted in cookie (middleware-readable). Accept-Language fallback. Manual EN↔TR switcher (I18N-02).
- **D-04:** **Tolgee** (self-hosted `https://loco.devloc.su`, project **34**) = sole source of truth for UI translations.
- **D-05:** Consumption = **export keys to static JSON at build** (Tolgee CLI/MCP); next-intl reads static JSON. No runtime Tolgee dependency in production.
- **D-06:** **String extraction** — ~50 `.ts/.tsx` files with hardcoded Cyrillic → EN keys; **EN is base/fallback**, TR from Tolgee.
- **D-08:** Proxy (`src/app/api/storefront/[...path]/route.ts`) forwards **`?lang=`** to ARM storefront endpoints. Fallback to default content when no ARM translation exists.

### Claude's Discretion
- Exact next-intl config layout (middleware matcher, messages directory structure, `i18n/request.ts`, etc.)
- Date/number/currency formatting via `Intl` with active locale (TRY for prices)
- Build-time Tolgee→JSON export mechanism (CLI vs MCP script)
- Lazy-load TR catalog for performance
- Key namespacing strategy for extracted strings

### Deferred Ideas (OUT OF SCOPE)
- Tolgee runtime SDK + in-context live editing (`@tolgee/react`, Alt+click)
- Additional locales beyond EN/TR
- WR-04 (auth loading redirect edge) — Phase 3 follow-up
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| I18N-01 | Locales EN + TR, no hardcoded Russian text | String extraction scope confirmed (51 files with Cyrillic), next-intl t() pattern documented, RU locale codes (ru-RU, ru_RU) and ₽/RUB identified in seo.ts, money.ts, ProductCard.tsx, ProductReviews.tsx, HeroBanner.tsx and others |
| I18N-02 | Language switcher with persisted choice | next-intl NEXT_LOCALE cookie (maxAge 1yr), middleware reads cookie before Accept-Language, `createNavigation` provides locale-aware `Link`/`useRouter` for switcher component |
| I18N-03 | Product content localized via ARM `?lang=` | VERIFIED from BFF source: regex requires full BCP-47 `lang-REGION` (not short codes); only `/products/:idOrSlug` supports `?lang=`; `en-US`/`tr-TR` are the correct codes; graceful fallback built into BFF |
| I18N-04 | SEO/OG/sitemap in EN and TR | next-intl `generateMetadata` with `alternates.languages`, `getTranslations({locale})`, per-locale sitemap entries with `alternates.languages`, `<html lang={locale}>` in layout |
</phase_requirements>

---

## Summary

Phase 4 internationalization adds EN+TR routing to an existing Next.js 14 App Router storefront using next-intl 4.13.0. The work falls into four parallel tracks: (1) routing restructure — move all pages under `src/app/[locale]/` and add middleware; (2) string extraction — scan ~50 files, extract ~35-40 Cyrillic UI strings to JSON keys, push to Tolgee project 34; (3) ARM `?lang=` passthrough — the proxy maps locale segment to full BCP-47 for the product-detail endpoint only; (4) SEO — localized metadata, hreflang alternates, and per-locale sitemap entries.

**Critical verified finding (overrides D-08 assumption):** The ARM BFF validates `?lang=` against `LOCALE_RE = /^[a-z]{2}-[A-Z]{2}$/`, which requires full BCP-47 form (`tr-TR`, `en-US`). Short codes `en` and `tr` are silently ignored (lang is set to null, no translation applied). The proxy MUST map `en` → `en-US` and `tr` → `tr-TR`. This is confirmed from BFF source code at `packs/arm/bff/routes/storefront-api.ts:389`.

**Geo-detection caveat:** next-intl middleware cannot call the BFF directly (no async external I/O in middleware). The BFF `geo_country` is a client-side signal. For MVP, implement geo-detect as a client-side `GeoLocaleInit` component: on first visit (no cookie), read `/storefront/config`, if `geo_country=TR` → push to `/tr/` path + set cookie. Middleware continues to use cookie → Accept-Language → default (en) order.

**Primary recommendation:** next-intl 4.13.0 with `localePrefix: 'always'` (both `/en/` and `/tr/` in URL), static JSON messages exported from Tolgee project 34, ARM proxy converting locale to full BCP-47.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Locale routing + URL rewriting | Frontend Server (middleware) | — | next-intl middleware runs at edge, before page render |
| Locale detection (URL/cookie/Accept-Language) | Frontend Server (middleware) | — | Reads request headers server-side |
| Geo-based default locale (BFF `geo_country`) | Browser / Client | Frontend Server (cookie persist) | BFF config is fetched client-side; middleware reads the resulting cookie on subsequent visits |
| UI string translation (`t()`) | Browser / Client + SSR | — | RSC use `getTranslations()`; client components use `useTranslations()` via NextIntlClientProvider |
| Product content localization (`?lang=`) | API / Backend (ARM BFF) | Frontend Server (proxy injects param) | BFF overlays translation rows; proxy injects `?lang=tr-TR` before forwarding |
| SEO metadata localization | Frontend Server (SSR) | — | `generateMetadata` runs server-side with explicit locale |
| Sitemap per-locale entries | Frontend Server (ISR) | — | `sitemap.ts` is a server route, runs at revalidation |
| Locale persistence | Browser / Client (cookie) | Frontend Server (reads cookie) | Cookie written client-side, read by middleware on next request |
| Currency/date/number formatting | Browser / Client + SSR | — | `Intl.NumberFormat` with active locale; no server-only dependency |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-intl | 4.13.0 | Locale routing, translation hooks, middleware | De-facto standard for Next.js App Router i18n; 4M weekly downloads; official Next.js docs reference it |

**Version verified:** `npm view next-intl version` → `4.13.0` [VERIFIED: npm registry]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tolgee/cli | 2.20.0 | Export JSON message catalogs from Tolgee at build time | Build script / CI prebuild step |

**Version verified:** `npm view @tolgee/cli version` → `2.20.0` [VERIFIED: npm registry]

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-intl | next-i18next | next-i18next is Pages Router-first; next-intl was built for App Router |
| next-intl | react-i18next | Requires more manual wiring for RSC/server components |
| Tolgee CLI export | Tolgee MCP export (`mcp__tolgee__*`) | MCP is interactive; CLI is scriptable and reproducible in CI |
| `localePrefix: 'always'` | `localePrefix: 'as-needed'` | `as-needed` makes EN use `/` root (cleaner for current RU-migration users) but complicates hreflang; `always` is explicit for SEO and consistent redirects |

**Installation:**
```bash
npm install next-intl@4.13.0
npm install --save-dev @tolgee/cli@2.20.0
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|-----|-------------|-------------|---------|-------------|
| next-intl | npm | 3+ yrs (v1: 2022) | 3,933,045 | github.com/amannn/next-intl | OK | Approved |
| @tolgee/cli | npm | 3+ yrs (v1.0.0: 2022) | 78,425 | github.com/tolgee/tolgee-cli | SUS (too-new flag: v2.20.0 released 2026-06-25) | Flagged — planner must add checkpoint:human-verify before install |

**Packages removed due to SLOP verdict:** none

**Packages flagged as suspicious (SUS):** `@tolgee/cli` — flagged "too-new" because version 2.20.0 published 2026-06-25 (within 30 days). The package itself is established (v1.0.0 existed in 2022, 78k weekly downloads, legitimate GitHub repo). Likely a routine release cadence update. Planner must add `checkpoint:human-verify` before `npm install @tolgee/cli`.

**Mitigation:** Alternatively, use the Tolgee MCP (`mcp__tolgee__*`) tools for export instead of the CLI — MCP is already authenticated and does not require installing `@tolgee/cli`. Recommended as primary path for the build export step.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser Request (/tr/catalog/base_gel/product-slug?...)
        │
        ▼
[Next.js Middleware: src/middleware.ts]
  ├─ Read NEXT_LOCALE cookie → locale
  ├─ Fallback: Accept-Language header
  ├─ Fallback: defaultLocale ('en')
  └─ Redirect/rewrite to /[locale]/...
        │
        ▼
[src/app/[locale]/layout.tsx]
  ├─ Validate locale (hasLocale)
  ├─ setRequestLocale(locale)
  ├─ <html lang={locale}>
  └─ <NextIntlClientProvider> → children
        │
        ├─ RSC pages: getTranslations({locale, namespace}) → t('key')
        └─ Client components: useTranslations('namespace') → t('key')
                │
                │ (product detail page, server-side fetch)
                ▼
[src/app/api/storefront/[...path]/route.ts — proxy]
  ├─ Read locale from header/cookie passed by page
  ├─ Map en→en-US, tr→tr-TR
  └─ Forward ?lang=tr-TR to ARM BFF
        │
        ▼
[ARM BFF /public/arm/storefront/products/:id?lang=tr-TR]
  ├─ Validate LOCALE_RE /^[a-z]{2}-[A-Z]{2}$/
  ├─ Lookup arm_product_translations where locale='tr-TR'
  ├─ Overlay name/detail_text/application_text if found
  └─ Return product (base content if no translation row)
        │
        ▼
[Client: GeoLocaleInit component]
  ├─ On first mount (no NEXT_LOCALE cookie)
  ├─ Fetch /api/storefront/config → geo_country
  ├─ If geo_country='TR' → router.push('/tr'+pathname)
  └─ Set NEXT_LOCALE cookie='tr'
```

### Recommended Project Structure
```
src/
├── app/
│   ├── [locale]/              ← ALL existing pages move here
│   │   ├── layout.tsx         ← locale-aware root layout (replaces app/layout.tsx)
│   │   ├── page.tsx           ← home (was app/page.tsx)
│   │   ├── catalog/
│   │   ├── basket/
│   │   ├── checkout/
│   │   ├── login/
│   │   ├── account/
│   │   └── ...
│   ├── api/
│   │   └── storefront/[...path]/route.ts  ← unchanged (API routes stay outside [locale])
│   ├── reset-password/        ← stays outside [locale] (email link target)
│   │   └── page.tsx           ← shim must read NEXT_LOCALE cookie for redirect target
│   └── sitemap.ts             ← rewritten for per-locale entries
├── i18n/
│   ├── routing.ts             ← defineRouting({locales,defaultLocale})
│   ├── navigation.ts          ← createNavigation(routing) — re-exports Link/useRouter
│   └── request.ts             ← getRequestConfig() — loads messages/[locale].json
├── middleware.ts              ← createMiddleware(routing) — new file
└── messages/
    ├── en.json                ← exported from Tolgee (EN base)
    └── tr.json                ← exported from Tolgee (TR translations)
```

### Pattern 1: Routing Configuration
**What:** Central routing definition used by both middleware and navigation
**When to use:** Foundation — create before any other next-intl file

```typescript
// src/i18n/routing.ts
// Source: https://next-intl.dev/docs/routing/setup
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'tr'],
  defaultLocale: 'en',
  localePrefix: 'always',           // /en/... and /tr/... both explicit
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365,    // 1 year
  },
});
```

### Pattern 2: Middleware
**What:** Intercepts every request, detects locale from URL/cookie/Accept-Language, redirects
**When to use:** Top-level — must export from `src/middleware.ts` (root of src/)

```typescript
// src/middleware.ts
// Source: https://next-intl.dev/docs/routing/setup
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all paths except: /api/*, /_next/*, /_vercel/*, files with extensions
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

### Pattern 3: Request Configuration
**What:** Provides locale + messages to server components per-request
**When to use:** Required — next-intl looks for `src/i18n/request.ts` automatically

```typescript
// src/i18n/request.ts
// Source: https://next-intl.dev/docs/usage/configuration
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: 'Europe/Istanbul',  // TR market default
  };
});
```

### Pattern 4: Navigation (locale-aware Link/useRouter)
**What:** Wraps Next.js navigation so links automatically include the active locale prefix
**When to use:** Import from `@/i18n/navigation` instead of `next/navigation` for all inter-page links

```typescript
// src/i18n/navigation.ts
// Source: https://next-intl.dev/docs/routing/setup
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

### Pattern 5: [locale] Root Layout
**What:** Validates locale, sets html lang, wraps with NextIntlClientProvider
**When to use:** Replaces `src/app/layout.tsx` (the existing one moves here, wrapping all providers)

```typescript
// src/app/[locale]/layout.tsx
// Source: https://next-intl.dev/docs/routing/setup
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
// ... other existing providers

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <head>
        <link href="https://fonts.cdnfonts.com/css/futura-pt" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, overflowX: 'hidden' }}>
        <AppRouterCacheProvider>
          <ThemeProvider>
            <NextIntlClientProvider>
              <QueryProvider>
                <AuthProvider>
                  <CartProvider>
                    <Suspense><Header /></Suspense>
                    <main style={{ minHeight: 'calc(100vh - 400px)' }}>{children}</main>
                    <Footer />
                  </CartProvider>
                </AuthProvider>
              </QueryProvider>
            </NextIntlClientProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
```

### Pattern 6: Translation in Client Component
**What:** Access translated strings in client components
**When to use:** Any `'use client'` component with UI strings

```typescript
// Example: Header.tsx
'use client';
import { useTranslations } from 'next-intl';

export function Header() {
  const t = useTranslations('nav');
  // ...
  return <span>{t('catalog')}</span>; // "Catalog" / "Katalog"
}
```

### Pattern 7: Translation in Server Component / generateMetadata
**What:** Access translations in RSC and metadata generators
**When to use:** Server components, generateMetadata, sitemap.ts

```typescript
// Example: product page
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'product' });
  return {
    title: t('metaTitle', { name: product.name }),
    alternates: {
      languages: {
        en: `${SITE_URL}/en/catalog/${category}/${slug}`,
        tr: `${SITE_URL}/tr/catalog/${category}/${slug}`,
      },
    },
    openGraph: {
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
    },
  };
}
```

### Pattern 8: ARM `?lang=` Proxy Passthrough
**What:** Proxy injects locale as full BCP-47 `lang` query param for product-detail requests
**When to use:** Product detail fetches through the storefront proxy

```typescript
// src/app/api/storefront/[...path]/route.ts — add lang mapping
const LOCALE_TO_BCP47: Record<string, string> = {
  en: 'en-US',
  tr: 'tr-TR',
};

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const url = new URL(req.url);
  // Read locale from cookie (set by next-intl middleware)
  const locale = req.cookies.get('NEXT_LOCALE')?.value || 'en';
  const bcp47 = LOCALE_TO_BCP47[locale] || 'en-US';

  // Inject ?lang= only for product detail endpoint
  const isProductDetail = path.length === 2 && path[0] === 'products';
  if (isProductDetail && !url.searchParams.has('lang')) {
    url.searchParams.set('lang', bcp47);
  }

  const target = `${ARM_BASE}/${path.map(encodeURIComponent).join('/')}${url.search}`;
  // ... rest of proxy unchanged
}
```

### Pattern 9: Geo-Based Locale Init (Client-Side)
**What:** On first visit (no NEXT_LOCALE cookie), reads BFF config geo_country, redirects to /tr/ if TR
**When to use:** Mount in `[locale]/layout.tsx` as a client component

```typescript
// src/components/GeoLocaleInit.tsx
'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';

export function GeoLocaleInit({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (document.cookie.includes('NEXT_LOCALE=')) return; // user already chose
    fetch('/api/storefront/config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg.geo_country === 'TR' && currentLocale !== 'tr') {
          document.cookie = 'NEXT_LOCALE=tr;path=/;max-age=' + (365 * 24 * 3600);
          router.replace(pathname, { locale: 'tr' });
        }
      })
      .catch(() => {/* ignore — stay on default locale */});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
```

### Pattern 10: Sitemap with Per-Locale Alternates
**What:** Rewrites sitemap.ts to emit both /en/ and /tr/ entries per URL with hreflang alternates
**When to use:** Replaces current `src/app/sitemap.ts`

```typescript
// src/app/sitemap.ts (rewritten for i18n)
// Source: https://next-intl.dev/docs/environments/actions-metadata-route-handlers
import { MetadataRoute } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const LOCALES = routing.locales;

function localizedEntry(path: string, opts?: { priority?: number; changeFrequency?: string }): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${SITE_URL}/${locale}${path}`;
  }
  return {
    url: `${SITE_URL}/en${path}`,  // canonical = EN
    ...(opts?.changeFrequency ? { changeFrequency: opts.changeFrequency as any } : {}),
    ...(opts?.priority !== undefined ? { priority: opts.priority } : {}),
    alternates: { languages },
  };
}
```

### Pattern 11: Message Catalog Structure (Recommended Namespacing)
**What:** Flat JSON with dot-namespace prefix — matches FBG pattern, next-intl supports nesting
**When to use:** Base pattern for messages/en.json and messages/tr.json

```json
{
  "nav.catalog": "Catalog",
  "nav.new": "New Arrivals",
  "nav.studios": "For Nail Studios",
  "nav.partners": "Partners",
  "nav.contacts": "Contacts",
  "nav.menu": "Menu",
  "common.search": "Search",
  "common.signIn": "Sign In",
  "common.signOut": "Sign Out",
  "common.account": "Account",
  "common.cart": "Cart",
  "common.noResults": "Nothing found",
  "common.allResults": "All results →",
  "common.loading": "Loading…",
  "product.reviews": "Reviews",
  "product.reviewCount": "{count, plural, one {# review} other {# reviews}}",
  "product.noReviews": "No reviews yet. Be the first!",
  "product.yourRating": "Your rating",
  "product.shareImpression": "Share your impression of the product…",
  "product.submit": "Leave a review",
  "product.submitting": "Submitting…",
  "product.loginToReview": "To leave a review, {link}.",
  "product.loginLink": "sign in",
  "product.verifiedPurchase": "Verified purchase",
  "product.buyNow": "Buy Now",
  "product.catalog": "Catalog",
  "meta.siteDesc": "Catalog of professional gel polishes and coatings. Certified products for nail professionals.",
  "meta.defaultTitle": "American Creator — professional gel polishes"
}
```

### Anti-Patterns to Avoid
- **Short codes for ARM `?lang=`:** Passing `?lang=tr` (without region) returns no translation — BFF regex requires `lang-REGION`. Use `tr-TR` and `en-US`.
- **`useTranslations` in RSC (async server component):** Use `getTranslations()` in async server components, `useTranslations()` only in client components. Mixing causes RSC/client boundary errors.
- **Forgetting `setRequestLocale(locale)` in pages:** Without it, pages cannot be statically rendered — they silently fall back to dynamic rendering.
- **Importing from `next/navigation` instead of `@/i18n/navigation`:** Native Next.js `Link`/`useRouter` do not prepend the locale prefix. Always use the re-exports from `createNavigation(routing)`.
- **Reset-password email links:** ARM BFF generates `${ARM_STOREFRONT_URL}/reset-password?token=...`. This shim at `src/app/reset-password/page.tsx` lives OUTSIDE `[locale]` intentionally. After i18n, its redirect target must read the `NEXT_LOCALE` cookie to build the correct locale path.
- **`localePrefix: 'as-needed'` + hreflang:** If default locale (en) has no prefix, the `x-default` and `en` hreflang both point to `/` — causes duplicate canonicals. Prefer `always`.
- **Hardcoding `'ru-RU'` in `Intl.NumberFormat`:** Replace with the active locale (e.g., `'tr-TR'` for TR, `'en-US'` for EN) derived from next-intl.
- **Keeping `priceCurrency: 'RUB'` in JSON-LD:** Must change to `'TRY'` and derive from `NEXT_PUBLIC_STOREFRONT_CURRENCY`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale routing + URL rewriting | Custom path-based redirect middleware | `next-intl` createMiddleware + defineRouting | Cookie, Accept-Language, redirect logic, edge cases with static assets |
| Locale-aware Link/useRouter | Manually prepend `/en` or `/tr` to hrefs | `createNavigation(routing).Link` | Misses edge cases: query strings, dynamic segments, locale changes |
| Plural forms for EN and TR | `n === 1 ? singular : plural` | next-intl ICU syntax `{count, plural, one {...} other {...}}` | Turkish pluralization rules differ from English (and Russian 1/2-4/5+ pattern is gone) |
| Message extraction | Regex scan to generate keys | Scan + manual assignment (no automated extraction tool trusted) | next-intl has no officially recommended extraction CLI; extraction is a one-time manual task |
| Build-time JSON export | Custom Tolgee REST API calls | `tolgee pull` CLI or `mcp__tolgee__*` export | Handles pagination, format, language filtering |
| Date formatting with TR locale | Manual month/day arrays in Turkish | `Intl.DateTimeFormat(locale, opts).format(date)` | TR locale handled by browser/Node Intl; no custom Turkish month arrays |
| Hreflang link tags | Manual `<link rel="alternate">` in head | next-intl `alternates.languages` in `generateMetadata` | Next.js auto-injects correct tags from metadata; manual approach misses edge cases |

**Key insight:** next-intl handles the routing complexity (locale detection order, cookie management, redirect loop prevention, static/dynamic rendering modes). Replacing any part of this with custom code recreates known edge cases.

---

## Common Pitfalls

### Pitfall 1: ARM `?lang=` short codes silently ignored
**What goes wrong:** Proxy passes `?lang=en` or `?lang=tr`. BFF validates against `LOCALE_RE = /^[a-z]{2}-[A-Z]{2}$/`. Short codes fail validation. `lang` is set to `null`. No translation is applied. Product detail always returns base (likely non-TR) content. No error is thrown.
**Why it happens:** CONTEXT.md D-08 initially assumed short codes. BFF source requires full BCP-47.
**How to avoid:** Map locale segment to full BCP-47 in the proxy: `{ en: 'en-US', tr: 'tr-TR' }`.
**Warning signs:** `translation_locale` field in API response is `null` when `tr-TR` translations exist in the tenant.

### Pitfall 2: Middleware matcher catches API routes
**What goes wrong:** next-intl middleware matches `/api/storefront/*` requests, appends locale prefix, breaks ARM proxy calls.
**Why it happens:** Default matcher `(.*)` is too broad.
**How to avoid:** Matcher must explicitly exclude `api`: `/((?!api|_next|_vercel|.*\\..*).*)`.
**Warning signs:** ARM proxy routes return 404 or unexpected redirects after middleware is added.

### Pitfall 3: Reset-password email link breaks post-i18n
**What goes wrong:** ARM BFF generates `${ARM_STOREFRONT_URL}/reset-password?token=...`. After i18n, `/reset-password` is no longer a valid route (everything moved to `/[locale]/`). User clicks link, gets 404.
**Why it happens:** `src/app/reset-password/page.tsx` must stay outside `[locale]` because the ARM email link is hardcoded to this path.
**How to avoid:** Keep the shim at the root level. Update its redirect logic to read `NEXT_LOCALE` cookie and redirect to `/<locale>/login/reset-password?token=...`. Ensure the middleware matcher does NOT rewrite `/reset-password` to `/en/reset-password` (keep it as a root-level route outside the locale segment).
**Warning signs:** Password reset emails send users to a 404 page.

### Pitfall 4: Forgetting `setRequestLocale` in static pages
**What goes wrong:** Pages without `setRequestLocale(locale)` cannot be statically rendered. Next.js falls back to dynamic rendering per-request. Performance degrades; build warnings appear.
**Why it happens:** next-intl currently needs this call to pass locale context without reading request headers (which would force dynamic rendering).
**How to avoid:** Add `setRequestLocale(locale)` as the FIRST statement in every page component and in the root layout, before any `getTranslations()` or `useTranslations()` calls.
**Warning signs:** Pages that should be static show as `(server-rendered)` in the build output.

### Pitfall 5: Client components using `getTranslations()` (RSC-only function)
**What goes wrong:** `getTranslations()` from `next-intl/server` is async and RSC-only. Calling it in a `'use client'` component causes a build error.
**Why it happens:** Server/client boundary confusion during refactor.
**How to avoid:** Rule: `'use client'` → `useTranslations()` (sync, from `'next-intl'`). `async function Component()` / RSC → `await getTranslations()` (async, from `'next-intl/server'`).
**Warning signs:** TypeScript error or runtime error "you cannot call useTranslations from a server component" or vice versa.

### Pitfall 6: Hydration mismatch from locale cookie read timing
**What goes wrong:** Server renders with default locale (en), cookie says `tr`. Hydration sees different content. React hydration warning or flickering.
**Why it happens:** next-intl middleware redirects before hydration, so this should not occur when middleware is set up correctly. Risk appears if middleware is missing or matcher excludes a route.
**How to avoid:** Ensure middleware covers all non-API routes. The middleware redirect happens BEFORE the page is served, so client and server see the same locale.
**Warning signs:** Console warning "Hydration failed because the server-rendered HTML didn't match the client"; locale switcher appears in wrong language on first load.

### Pitfall 7: `fmtMoney` and price formatting use hardcoded `'en'` locale
**What goes wrong:** `src/lib/money.ts:9` hardcodes `'en'` in `Intl.NumberFormat('en', ...)`. Turkish prices display in EN number format (no Turkish grouping/decimal conventions).
**Why it happens:** Pre-i18n code. Also, `ProductCard.tsx` and `ProductDetail.tsx` use `Intl.NumberFormat('ru-RU')` directly.
**How to avoid:** `fmtMoney(amount, currency, locale?)` — add locale parameter and thread the active locale through all call sites. Or call `fmtMoney` with `Intl.NumberFormat(locale || 'en-US', ...)`.
**Warning signs:** Prices on TR pages show US/RU formatting conventions.

### Pitfall 8: WR-01 — `Header.tsx` uses `toLocaleString('ru-RU')` and `₽`
**What goes wrong:** Search suggestion prices show as `12.345,00 ₽` regardless of active language.
**Why it happens:** `p.price.toLocaleString('ru-RU')` hardcoded in two places in Header.tsx (desktop and mobile suggestion lists).
**How to avoid:** Replace with `fmtMoney(p.price, currency, locale)` or equivalent using active locale from next-intl context.
**Warning signs:** Search dropdown prices show `₽` and Russian number formatting on TR page.

### Pitfall 9: WR-02 — `ProductReviews.tsx` uses `ru-RU` date and Russian pluralization
**What goes wrong:** Review dates formatted as `ru-RU`; plural "отзыв/отзывов" uses Russian grammar.
**Why it happens:** `fmtDate` uses `'ru-RU'`; plural check uses Russian 10/100 rule.
**How to avoid:** `fmtDate` → `Intl.DateTimeFormat(locale, opts).format(date)`; plurals → next-intl ICU `{count, plural, one {# review} other {# reviews}}` with `t('product.reviewCount', { count: total })`.
**Warning signs:** Reviews section shows Cyrillic plural text and Russian date format on EN/TR pages.

### Pitfall 10: WR-05 — Currency fallback to `USD` in most pages
**What goes wrong:** `src/lib/money.ts` defaults to `process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'USD'`. If env not set, prices display as USD not TRY.
**Why it happens:** Pre-i18n code; ACTR has `NEXT_PUBLIC_STOREFRONT_CURRENCY=TRY` in `.env` but this is fragile.
**How to avoid:** `fmtMoney` should accept currency from call site. For ACTR, the currency is always TRY (single-currency, Phase 7). Hard-code in `.env.local` AND pass through `fmtMoney(price, 'TRY', locale)` explicitly.
**Warning signs:** Prices show `$1,234` instead of `₺1.234` on any page where env is missing.

---

## Code Examples

### Extracting a string: before and after

Before (current):
```tsx
// src/components/Header.tsx:201
<Typography sx={{ fontSize: 13, color: palette.primaryLight }}>
  Ничего не найдено
</Typography>
```

After (with next-intl):
```tsx
// Server component (RSC)
const t = await getTranslations('nav');
// Client component
const t = useTranslations('nav');

<Typography sx={{ fontSize: 13, color: palette.primaryLight }}>
  {t('common.noResults')}
</Typography>
```

### Turkish Intl date formatting (replaces ru-RU)
```typescript
// Before (WR-02):
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

// After (locale-aware):
// In client component:
const { locale } = useLocale(); // or locale from next-intl useLocale()
const fmtDate = (d: string) =>
  new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date(d));
```

### Tolgee .tolgeerc configuration
```json
{
  "$schema": "https://docs.tolgee.io/cli-schema.json",
  "projectId": 34,
  "format": "JSON_TOLGEE",
  "pull": {
    "path": "./messages"
  },
  "push": {
    "filesTemplate": "./messages/{languageTag}.json",
    "language": ["en"]
  }
}
```

### Build-time Tolgee export script (package.json)
```json
{
  "scripts": {
    "messages:pull": "tolgee pull --path ./messages",
    "build": "npm run messages:pull && next build"
  }
}
```

**Alternative (no CLI, uses MCP):** Use `mcp__tolgee__export` tool in a CI script or a one-time node script to write JSON to `messages/`. This avoids the `@tolgee/cli` SUS flag entirely.

### createNextIntlPlugin (next.config.js update)
```javascript
// next.config.js — wrap existing config with next-intl plugin
const { withSentryConfig } = require('@sentry/nextjs');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  output: 'standalone',
  skipTrailingSlashRedirect: true,
  // ... existing redirects unchanged ...
};

module.exports = withSentryConfig(
  withNextIntl(nextConfig),
  { silent: true, disableLogger: true }
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router `next-i18next` | App Router `next-intl` | Next.js 13+ App Router | RSC-native; SSR strings without hydration tricks |
| `i18n: { locales }` in next.config | Middleware + `[locale]` segment | next-intl 3.0 / Next 13 | More explicit routing; works with App Router parallel routes |
| `getStaticProps({ locale })` | `getRequestConfig({ requestLocale })` | App Router | Replaces page-level locale injection with request-scoped config |
| `useTranslation()` (react-i18next) | `useTranslations()` (next-intl) | Migration | Sync in client, async in RSC |

**Deprecated/outdated:**
- `next/router` for locale routing: replaced by `createNavigation(routing)` from next-intl
- `next.config.js i18n` key: deprecated in App Router; next-intl middleware replaces it
- `getStaticPaths` with `locales`: replaced by `generateStaticParams`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | EN translations in Tolgee project 34 will use locale tag `en` (not `en-US`) for Tolgee CLI pull filenames | Standard Stack / Tolgee | If Tolgee uses `en-US` tag, pull creates `messages/en-US.json` not `messages/en.json` — request.ts import path must match | [ASSUMED]
| A2 | ARM product translations for TR use locale `tr-TR` in the `arm_product_translations.locale` column | Architecture / ARM `?lang=` | If admin stored `tr` (short) instead of `tr-TR`, `?lang=tr-TR` won't match any rows — translations won't appear | [ASSUMED]
| A3 | `createNextIntlPlugin` from `next-intl/plugin` is CJS-compatible with the existing `next.config.js` (which uses `module.exports`) | Architecture Patterns / next.config.js | If ESM-only, must convert next.config to .mjs | [ASSUMED]
| A4 | Tolgee project 34 language tags match `en` and `tr` (not BCP-47 full form) for the purpose of CLI pull filenames | Tolgee export | Messages pulled to wrong filenames | [ASSUMED]
| A5 | `@tolgee/cli` SUS flag is due to recent version release, not package legitimacy issue | Package Legitimacy | If package is compromised, supply-chain risk — mitigate by using MCP export instead | [ASSUMED]

**If this table is empty:** Not the case — A1-A5 are unverified assumptions requiring confirmation.

---

## Open Questions

1. **ARM translation locale codes in `arm_product_translations`**
   - What we know: BFF regex requires `/^[a-z]{2}-[A-Z]{2}$/`; proxy will send `tr-TR` and `en-US`
   - What's unclear: What locale codes the TR tenant admin will actually use when entering translations in Phase 7 (catalog data)
   - Recommendation: Document `tr-TR` as the expected code in ACTR setup notes; add to Phase 7 data ingestion requirements

2. **Tolgee project 34 language tag format**
   - What we know: Project 34 exists on loco.devloc.su; `tolgee pull --path ./messages` exports per-language files
   - What's unclear: Whether Tolgee exports to `messages/en.json` or `messages/en-US.json` (depends on language tag configured in project)
   - Recommendation: Wave 0 task — `tolgee pull` and inspect actual filenames; adjust `request.ts` import accordingly

3. **`next.config.js` ESM/CJS compatibility with `createNextIntlPlugin`**
   - What we know: Current file uses `module.exports = ...` (CJS). `next-intl/plugin` exports `createNextIntlPlugin`.
   - What's unclear: Whether `require('next-intl/plugin')` works in CJS next.config.js
   - Recommendation: Wave 0 spike — try `const createNextIntlPlugin = require('next-intl/plugin');` in the existing CJS config; if fails, convert to next.config.mjs

4. **Geo-detection accuracy for dev environment**
   - What we know: Middleware cannot call BFF; client-side GeoLocaleInit reads `/storefront/config`
   - What's unclear: Whether demo BFF returns a meaningful `geo_country` in local dev
   - Recommendation: GeoLocaleInit is progressive-enhancement — if config fetch fails or returns null, silently keep current locale. No hard blocker.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | next-intl, Tolgee CLI | ✓ | v20+ (from prior phases) | — |
| Tolgee server (loco.devloc.su) | Tolgee export at build | ✓ | tolgee/tolgee:latest | Export manually once; commit messages/*.json |
| TOLGEE_API_KEY env var | `tolgee pull` | ✗ (not checked) | — | Generate from loco.devloc.su dashboard under project 34 API keys |
| `mcp__tolgee__*` MCP | Alternative Tolgee export | ✓ (already connected per CONTEXT.md) | — | — |

**Missing dependencies with no fallback:**
- `TOLGEE_API_KEY` — needed for `tolgee pull` CLI. If using MCP export instead, not needed.

**Missing dependencies with fallback:**
- Tolgee CLI (`@tolgee/cli`) — SUS-flagged; can substitute with `mcp__tolgee__*` MCP export verb, which is already authenticated and does not need separate install.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 |
| Config file | vitest.config.ts (inferred from prior phases) |
| Quick run command | `vitest run` |
| Full suite command | `vitest run --reporter verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | No Cyrillic text rendered in EN/TR UI | unit (grep assertion) | `vitest run src/lib/seo.test.ts` — extend to assert no ru-RU/RUB | ❌ Wave 0 — add test |
| I18N-01 | `fmtMoney` uses TRY locale when locale=tr | unit | `vitest run src/lib/money.test.ts` | ❌ Wave 0 |
| I18N-01 | `fmtDate` in ProductReviews uses tr-TR locale | unit | `vitest run src/components/__tests__/ProductReviews.test.ts` (extend) | ✅ (extend) |
| I18N-02 | Language switcher updates URL to /tr/ | manual (E2E) | manual: navigate /en/ → click TR → assert URL becomes /tr/ | manual-only |
| I18N-02 | NEXT_LOCALE cookie set when locale changes | manual | manual: check devtools cookies after switching | manual-only |
| I18N-03 | Proxy sends ?lang=tr-TR for product detail when locale=tr | unit | `vitest run src/app/api/storefront/__tests__/proxy.test.ts` | ❌ Wave 0 |
| I18N-03 | Proxy does NOT send ?lang= for /products list | unit | same proxy test file | ❌ Wave 0 |
| I18N-04 | Sitemap includes /en/ and /tr/ alternates per entry | unit | extend `src/app/sitemap.test.ts` | ✅ (extend) |
| I18N-04 | generateMetadata includes alternates.languages hreflang | unit | extend `src/app/product-metadata.test.tsx` | ✅ (extend) |
| I18N-04 | `<html lang>` is "tr" on TR pages | manual (or smoke) | manual: view page source for /tr/ | manual-only |

### Sampling Rate
- **Per task commit:** `vitest run --reporter dot`
- **Per wave merge:** `vitest run --reporter verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/money.test.ts` — unit tests for `fmtMoney` with locale param
- [ ] `src/app/api/storefront/__tests__/proxy.test.ts` — assert `?lang=tr-TR` injection on product detail, no injection on list
- [ ] `messages/en.json` — must exist before any tests that import translation keys
- [ ] `src/i18n/routing.ts`, `src/middleware.ts`, `src/i18n/request.ts` — must exist before routing tests

*(Existing `sitemap.test.ts` and `product-metadata.test.tsx` can be extended in-place.)*

---

## Security Domain

> `security_enforcement: true`, ASVS level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no change | auth unchanged (Phase 3) |
| V3 Session Management | partial | locale cookie uses `sameSite: 'lax'` (next-intl default) — no change to auth session |
| V4 Access Control | no | locale is not a privilege boundary |
| V5 Input Validation | yes | locale segment validated by `hasLocale()` in layout; `?lang=` validated by BFF regex — no unvalidated input |
| V6 Cryptography | no | no new crypto |

### Known Threat Patterns for i18n Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Locale parameter injection via URL segment | Tampering | `hasLocale(routing.locales, locale)` in layout calls `notFound()` on invalid values |
| Open redirect via locale redirect in GeoLocaleInit | Tampering | `router.replace(pathname, { locale: 'tr' })` uses next-intl navigation (locale-validated); pathname comes from `usePathname()`, not user input |
| `?lang=` injection in ARM proxy | Tampering | BFF validates LOCALE_RE before using; unmatched values → null → no translation overlay; XSS not applicable (server-side lookup only) |
| NEXT_LOCALE cookie poisoning | Tampering | Cookie only accepted for valid locale values by next-intl middleware; invalid values fall back to Accept-Language/default |
| JSON-LD locale/currency injection (seo.ts) | Tampering | `priceCurrency` hardcoded to `'TRY'` (env + const); locale string is from next-intl validated set only |

---

## Sources

### Primary (MEDIUM confidence — official docs via WebFetch)
- [next-intl.dev/docs/routing/setup](https://next-intl.dev/docs/routing/setup) — complete App Router setup guide, middleware, [locale] layout, generateStaticParams, setRequestLocale
- [next-intl.dev/docs/routing/configuration](https://next-intl.dev/docs/routing/configuration) — defineRouting, localePrefix, cookie config, localeDetection
- [next-intl.dev/docs/usage/configuration](https://next-intl.dev/docs/usage/configuration) — getRequestConfig, requestLocale, message loading, timeZone
- [next-intl.dev/docs/routing/middleware](https://next-intl.dev/docs/routing/middleware) — custom locale detection pattern (wrap before createMiddleware)
- [next-intl.dev/docs/environments/actions-metadata-route-handlers](https://next-intl.dev/docs/environments/actions-metadata-route-handlers) — sitemap alternates.languages, getPathname
- [docs.tolgee.io/tolgee-cli/project-configuration](https://docs.tolgee.io/tolgee-cli/project-configuration) — .tolgeerc format, projectId, format options, pull.path
- [next-intl.dev/docs/usage/messages](https://next-intl.dev/docs/usage/messages) — JSON format, ICU syntax, plurals, interpolation

### Verified from source code (HIGH confidence)
- `packs/arm/bff/routes/storefront-api.ts:386-396` — `LOCALE_RE = /^[a-z]{2}-[A-Z]{2}$/`, `?lang=` only on `/products/:idOrSlug`, not on `/products` list endpoint
- `src/app/api/storefront/[...path]/route.ts` — existing proxy structure; `?lang=` must be injected in `proxy()` function before building `target` URL
- `src/app/reset-password/page.tsx` — shim at root level must stay outside `[locale]`; redirect target must become locale-aware
- `src/lib/money.ts` — hardcoded `'en'` locale in `Intl.NumberFormat` (line 9)
- `src/components/Header.tsx` — `ru-RU` in `.toLocaleString()` (WR-01), `₽` in suggestion prices (lines 263, 566)
- `src/components/ProductReviews.tsx` — `ru-RU` date format (line 36), Russian pluralization logic (lines 105-106)
- `src/lib/seo.ts` — `formatRub` function, `priceCurrency: 'RUB'`, `locale: 'ru_RU'` in OG (lines 45, 96, 145)
- `src/app/layout.tsx` — `lang="ru"`, `locale: 'ru_RU'` in OG, Russian description string

### Registry verification (HIGH confidence)
- `npm view next-intl version` → `4.13.0`, peerDeps: `next: '^12.0.0 || ^13.0.0 || ^14.0.0...'` [VERIFIED: npm registry]
- `npm view @tolgee/cli version` → `2.20.0`, repo: `github.com/tolgee/tolgee-cli` [VERIFIED: npm registry]

---

## Metadata

**Confidence breakdown:**
- ARM `?lang=` contract: HIGH — read directly from BFF source
- next-intl API and setup: MEDIUM — official docs via WebFetch (may have minor version gaps vs 4.13.0 specifics)
- Tolgee CLI configuration: MEDIUM — official docs; exact language tag filenames unverified
- Hardcoded RU text scope: HIGH — exhaustive grep scan of codebase
- Geo-detection approach: MEDIUM — next-intl middleware pattern verified; client-side BFF fallback is design inference

**Research date:** 2026-06-30
**Valid until:** 2026-07-30 (next-intl releases frequently; verify version before planning)
