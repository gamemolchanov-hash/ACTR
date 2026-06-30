# Phase 4: i18n EN/TR — Pattern Map

**Mapped:** 2026-06-30
**Files analyzed:** 18 (4 new scaffolding, 1 new component, 1 new test, 2 config edits, 2 lib edits, 8 page/component moves+edits)
**Analogs found:** 14 / 18

---

## File Classification

| New / Modified File | Change Type | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `src/i18n/routing.ts` | NEW | config | — | `~/work/puz/FBG/src/contexts/LocaleContext.tsx` (concepts only) | concepts |
| `src/i18n/request.ts` | NEW | config/middleware | request-response | none in ACTR; RESEARCH Pattern 3 is authoritative | no analog |
| `src/i18n/navigation.ts` | NEW | utility | — | `next/navigation` imports scattered in existing pages | partial |
| `src/middleware.ts` | NEW | middleware | request-response | none (first middleware in repo) | no analog |
| `src/components/GeoLocaleInit.tsx` | NEW | component | event-driven | `src/app/reset-password/page.tsx` (client effect+router) | role-match |
| `src/app/[locale]/layout.tsx` | MOVED+EDITED | config/layout | request-response | `src/app/layout.tsx` | exact |
| `src/app/[locale]/page.tsx` (+ all other pages) | MOVED | route | request-response | `src/app/page.tsx` | exact |
| `src/app/reset-password/page.tsx` | EDITED | route/shim | request-response | itself (existing file) | exact |
| `next.config.js` | EDITED | config | — | itself | exact |
| `src/lib/money.ts` | EDITED | utility | transform | itself | exact |
| `src/lib/seo.ts` | EDITED | utility | transform | itself | exact |
| `src/components/Header.tsx` | EDITED | component | request-response | itself | exact |
| `src/components/ProductReviews.tsx` | EDITED | component | request-response | itself | exact |
| `src/app/sitemap.ts` | EDITED | route | batch | itself | exact |
| `messages/en.json` | NEW | config | — | `~/work/puz/FBG/src/locales/en-US.json` (shape ref) | concepts |
| `messages/tr.json` | NEW | config | — | same | concepts |
| `src/lib/money.test.ts` | NEW | test | — | `src/lib/seo.test.ts` | role-match |
| `src/app/api/storefront/__tests__/proxy.test.ts` | NEW | test | — | `src/app/sitemap.test.ts` | role-match |

---

## Pattern Assignments

### `src/i18n/routing.ts` (NEW — config)

**Analog:** RESEARCH.md Pattern 1 (no codebase analog — first i18n config in repo)

**Core pattern** (copy verbatim from RESEARCH.md):
```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'tr'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365,  // 1 year
  },
});
```

**Notes:** This is the single source of truth for locale list. All other next-intl files import from here.

---

### `src/i18n/request.ts` (NEW — server config)

**Analog:** RESEARCH.md Pattern 3 (no codebase analog)

**Core pattern:**
```typescript
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
    timeZone: 'Europe/Istanbul',
  };
});
```

**Notes:** next-intl looks for this file at `src/i18n/request.ts` by convention (configured in `next.config.js` via `createNextIntlPlugin('./src/i18n/request.ts')`).

---

### `src/i18n/navigation.ts` (NEW — utility)

**Analog:** RESEARCH.md Pattern 4; partial match to existing `next/link` and `next/navigation` imports throughout `src/components/Header.tsx` (lines 24) and pages.

**Imports pattern** (from `src/components/Header.tsx` lines 24 — what this replaces):
```typescript
// BEFORE (every component importing from next):
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// AFTER (import from here instead):
import { Link, usePathname, useRouter } from '@/i18n/navigation';
```

**Core pattern:**
```typescript
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

**Critical:** All components currently importing `Link` from `next/link` and `useRouter`/`usePathname` from `next/navigation` must switch to `@/i18n/navigation` — otherwise locale prefix is not prepended to hrefs.

---

### `src/middleware.ts` (NEW — middleware)

**Analog:** RESEARCH.md Pattern 2 (no codebase analog — first middleware in repo)

**Core pattern:**
```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Exclude: /api/*, /_next/*, /_vercel/*, files with extensions
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

**Critical:** The `api` exclusion prevents next-intl from intercepting `src/app/api/storefront/[...path]/route.ts` requests. Without it, the ARM proxy breaks.

---

### `src/components/GeoLocaleInit.tsx` (NEW — client component)

**Analog:** `src/app/reset-password/page.tsx` (client effect that reads state and calls router)

**Imports pattern** from `src/app/reset-password/page.tsx` (lines 1-14):
```typescript
'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
```

**Core pattern from analog** (`src/app/reset-password/page.tsx` lines 16-26):
```typescript
function ResetPasswordRedirectInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    router.replace(`/login/reset-password${token ? `?token=${encodeURIComponent(token)}` : ''}`);
  }, [router, params]);

  return null;
}
```

**Adapted pattern for GeoLocaleInit** (import from `@/i18n/navigation`, not `next/navigation`):
```typescript
'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';

export function GeoLocaleInit({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (document.cookie.includes('NEXT_LOCALE=')) return;
    fetch('/api/storefront/config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg.geo_country === 'TR' && currentLocale !== 'tr') {
          document.cookie = 'NEXT_LOCALE=tr;path=/;max-age=' + (365 * 24 * 3600);
          router.replace(pathname, { locale: 'tr' });
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
```

---

### `src/app/[locale]/layout.tsx` (MOVED+EDITED from `src/app/layout.tsx`)

**Analog:** `src/app/layout.tsx` — exact; all provider nesting copies verbatim, with additions.

**Existing provider stack** (`src/app/layout.tsx` lines 39-64):
```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">        // ← change to lang={locale}
      <head>
        <link href="https://fonts.cdnfonts.com/css/futura-pt" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, overflowX: 'hidden' }}>
        <AppRouterCacheProvider>
          <ThemeProvider>
            <QueryProvider>
              <AuthProvider>
                <CartProvider>
                  <Suspense><Header /></Suspense>
                  <main style={{ minHeight: 'calc(100vh - 400px)' }}>{children}</main>
                  <Footer />
                </CartProvider>
              </AuthProvider>
            </QueryProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
```

**Additions required** (wrap entire stack with `NextIntlClientProvider`, add `generateStaticParams`, add `GeoLocaleInit`):
```typescript
// New imports to add:
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { GeoLocaleInit } from '@/components/GeoLocaleInit';

// New function before the layout:
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Layout signature change:
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // ... rest of layout with <html lang={locale}> and <NextIntlClientProvider> wrapping
}
```

**OG metadata** (`src/app/layout.tsx` lines 15-37): Replace `locale: 'ru_RU'` → locale-derived (`locale === 'tr' ? 'tr_TR' : 'en_US'`); replace Russian description + title strings with `t()` calls.

---

### `src/app/[locale]/page.tsx` and all other pages (MOVED — mostly unchanged)

**Analog:** `src/app/page.tsx` (exact copy; file moves into `src/app/[locale]/`)

**`src/app/page.tsx`** (lines 1-18 — full file, client component, no strings to extract):
```typescript
'use client';
import { Box } from '@mui/material';
import { HeroBanner } from '@/components/HeroBanner';
import { PromoBanner } from '@/features/promo-bogo';

export default function HomePage() {
  return (
    <Box>
      <PromoBanner />
      <HeroBanner />
    </Box>
  );
}
```

**Move pattern:** `mv src/app/page.tsx src/app/[locale]/page.tsx` (and all other route files). No logic changes needed for pages without Cyrillic strings. For pages with Cyrillic UI strings, apply string extraction (see Shared Patterns section).

**Static rendering:** Add `setRequestLocale(locale)` as the first statement in every async server page component that receives `params: { locale }`.

---

### `src/app/reset-password/page.tsx` (EDITED in place — stays outside `[locale]`)

**Analog:** itself — already a client redirect shim.

**Current redirect** (`src/app/reset-password/page.tsx` lines 20-23):
```typescript
useEffect(() => {
  const token = params.get('token');
  router.replace(`/login/reset-password${token ? `?token=${encodeURIComponent(token)}` : ''}`);
}, [router, params]);
```

**Required edit** — locale-aware redirect:
```typescript
useEffect(() => {
  const token = params.get('token');
  // Read NEXT_LOCALE cookie; default to 'en'
  const localeCookie = document.cookie
    .split(';')
    .find(c => c.trim().startsWith('NEXT_LOCALE='));
  const locale = localeCookie ? localeCookie.split('=')[1].trim() : 'en';
  router.replace(`/${locale}/login/reset-password${token ? `?token=${encodeURIComponent(token)}` : ''}`);
}, [router, params]);
```

**Note:** Must also ensure `src/middleware.ts` matcher does NOT rewrite `/reset-password` — the matcher `/((?!api|_next|_vercel|.*\\..*).*)` will catch it. Add `reset-password` to the exclusion list: `/((?!api|_next|_vercel|reset-password|.*\\..*).*)`.

---

### `next.config.js` (EDITED)

**Analog:** itself — existing CJS `module.exports = withSentryConfig(nextConfig, ...)`.

**Existing wrapper pattern** (`next.config.js` lines 138-143):
```javascript
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});
```

**Required edit** — add `withNextIntl` wrapper inside `withSentryConfig`:
```javascript
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// ...existing nextConfig object unchanged...

module.exports = withSentryConfig(
  withNextIntl(nextConfig),
  { silent: true, disableLogger: true }
);
```

**Open question (A3):** Verify `require('next-intl/plugin')` works in CJS mode before proceeding. If it fails, convert `next.config.js` → `next.config.mjs` with ESM imports.

---

### `src/lib/money.ts` (EDITED)

**Analog:** itself — existing `fmtMoney` function (`src/lib/money.ts` lines 6-19).

**Current signature** (line 6):
```typescript
export function fmtMoney(amount: number, currency?: string): string {
```

**Current locale hardcode** (line 9):
```typescript
return new Intl.NumberFormat('en', {
```

**Required edit** — add `locale` parameter:
```typescript
export function fmtMoney(amount: number, currency?: string, locale?: string): string {
  const curr = currency || process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';
  const loc = locale || 'en-US';
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat(loc).format(amount)} ${curr}`;
  }
}
```

**Call sites to update:** `src/components/Header.tsx` (WR-01), `src/components/ProductCard.tsx`, `src/components/ProductDetail.tsx` — all use `Intl.NumberFormat('ru-RU')` directly and must switch to `fmtMoney(price, currency, locale)`.

---

### `src/lib/seo.ts` (EDITED)

**Analog:** itself — existing pure utility file (`src/lib/seo.ts`).

**Hardcoded RU strings to replace:**

Line 45 — `formatRub` function (delete entirely, replace with locale-aware):
```typescript
// REMOVE:
const formatRub = (price: number) => `${new Intl.NumberFormat('ru-RU').format(price)} ₽`;

// REPLACE buildMetaDescription with locale-aware version:
export function buildMetaDescription(product: Product, locale: string = 'en'): string {
  // ... use fmtMoney(product.price, 'TRY', locale) in the fallback sentence
}
```

Line 96 — OG locale (in `buildProductMetadata`):
```typescript
// REMOVE:
locale: 'ru_RU',

// REPLACE (caller passes locale):
export function buildProductMetadata(product: Product, locale: string = 'en'): Metadata {
  // ...
  locale: locale === 'tr' ? 'tr_TR' : 'en_US',
  // ...
  alternates: {
    canonical: url,
    languages: {
      en: url.replace(`/${locale}/`, '/en/'),
      tr: url.replace(`/${locale}/`, '/tr/'),
    },
  },
}
```

Line 144 — JSON-LD `priceCurrency`:
```typescript
// REMOVE:
priceCurrency: 'RUB',

// REPLACE:
priceCurrency: process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY',
```

---

### `src/components/Header.tsx` (EDITED)

**Analog:** itself — existing `'use client'` component.

**Imports to change** (`src/components/Header.tsx` line 24):
```typescript
// REMOVE:
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// REPLACE:
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation'; // useSearchParams stays (not locale-routing)
import { useTranslations } from 'next-intl';
```

**NAV_ITEMS** (lines 31-37) — Cyrillic labels to extract:
```typescript
// BEFORE:
const NAV_ITEMS = [
  { label: 'Каталог', href: '/catalog' },
  { label: 'Новинки', href: '/catalog?sort=-date_created' },
  { label: 'Nail-Студиям', href: '/studios' },
  { label: 'Партнерам', href: '/partners' },
  { label: 'Контакты', href: '/contacts' },
];

// AFTER:
const t = useTranslations('nav');
const NAV_ITEMS = [
  { label: t('catalog'), href: '/catalog' },
  { label: t('new'), href: '/catalog?sort=-date_created' },
  { label: t('studios'), href: '/studios' },
  { label: t('partners'), href: '/partners' },
  { label: t('contacts'), href: '/contacts' },
];
```

**WR-01 fix** — price in suggestions (find `toLocaleString('ru-RU')` occurrences, replace with `fmtMoney`):
```typescript
// BEFORE (desktop and mobile suggestion price):
p.price.toLocaleString('ru-RU')  // + ₽ symbol

// AFTER:
import { fmtMoney } from '@/lib/money';
// const locale = useLocale(); from 'next-intl'
fmtMoney(p.price, 'TRY', locale === 'tr' ? 'tr-TR' : 'en-US')
```

**Language switcher** — add a new `<select>` or `<Button>` that calls `router.replace(pathname, { locale: nextLocale })` (from `@/i18n/navigation`).

---

### `src/components/ProductReviews.tsx` (EDITED)

**Analog:** itself.

**WR-02 fix 1** — `fmtDate` (line 35-36):
```typescript
// BEFORE:
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

// AFTER (add locale param from useLocale()):
import { useLocale } from 'next-intl';
// inside component:
const locale = useLocale();
const fmtDate = (d: string) =>
  new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date(d));
```

**WR-02 fix 2** — Russian pluralization (lines 105-106):
```typescript
// BEFORE:
{total % 10 === 1 && total % 100 !== 11 ? 'отзыв' : 'отзывов'}

// AFTER (use next-intl ICU plural):
const t = useTranslations('product');
// in JSX:
{t('reviewCount', { count: total })}
// messages/en.json: "product.reviewCount": "{count, plural, one {# review} other {# reviews}}"
// messages/tr.json: "product.reviewCount": "{count, plural, one {# değerlendirme} other {# değerlendirme}}"
```

**All Cyrillic UI strings** in this component (`Отзывы`, `Ваша оценка`, `Поделитесь впечатлением…`, `Оставить отзыв`, `Проверенная покупка`, и др.) → extract to `product.*` namespace keys.

---

### `src/app/sitemap.ts` (EDITED)

**Analog:** itself — existing ISR sitemap route.

**Current static entry pattern** (`src/app/sitemap.ts` lines 22-27):
```typescript
function staticEntries(): MetadataRoute.Sitemap {
  return STATIC_PATHS.map((path) => ({
    url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.5,
  }));
}
```

**Required edit** — per-locale entries with `alternates.languages`:
```typescript
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

function localizedEntry(path: string, opts?: { priority?: number; changeFrequency?: string }) {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = `${SITE_URL}/${locale}${path}`;
  }
  return {
    url: `${SITE_URL}/en${path}`,  // canonical = EN
    changeFrequency: opts?.changeFrequency as any,
    priority: opts?.priority,
    alternates: { languages },
  };
}
```

**Revalidate and build-fallback pattern** (lines 6-46) — keep unchanged; only the entry-building functions change.

---

### `messages/en.json` and `messages/tr.json` (NEW)

**Analog (shape only):** `~/work/puz/FBG/src/locales/en-US.json` — flat-key JSON, but FBG is a Vite SPA and uses `{var}` interpolation not ICU. ACTR uses next-intl ICU syntax.

**Recommended namespacing** (flat keys with dot prefix — next-intl supports nested objects or flat keys):
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
  "product.verifiedPurchase": "Verified purchase",
  "meta.siteDesc": "Catalog of professional gel polishes and coatings. Certified products for nail professionals.",
  "meta.defaultTitle": "American Creator — professional gel polishes"
}
```

**Source of truth:** Tolgee project 34 at `https://loco.devloc.su`. Push `messages/en.json` to Tolgee (EN base), then export `messages/tr.json` (TR translations via Tolgee MCP `mcp__tolgee__*`).

---

### `src/app/api/storefront/[...path]/route.ts` (EDITED)

**Analog:** itself — existing proxy function.

**Current proxy target build** (`src/app/api/storefront/[...path]/route.ts` lines 22-23):
```typescript
async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const target = `${ARM_BASE}/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
```

**Required edit** — inject `?lang=` for product-detail only, before building `target`:
```typescript
const LOCALE_TO_BCP47: Record<string, string> = {
  en: 'en-US',
  tr: 'tr-TR',
};

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  // Read locale from NEXT_LOCALE cookie (set by next-intl middleware)
  const locale = req.cookies.get('NEXT_LOCALE')?.value || 'en';
  const bcp47 = LOCALE_TO_BCP47[locale] || 'en-US';

  // Inject ?lang= ONLY for product detail: /products/:idOrSlug (path length 2)
  // NOT for /products list (path length 1). BFF regex: /^[a-z]{2}-[A-Z]{2}$/
  const url = new URL(req.url);
  const isProductDetail = path.length === 2 && path[0] === 'products';
  if (isProductDetail && !url.searchParams.has('lang')) {
    url.searchParams.set('lang', bcp47);
  }

  const target = `${ARM_BASE}/${path.map(encodeURIComponent).join('/')}${url.search}`;
  // ... rest of proxy unchanged from lines 25-59
```

**All other headers/method handling** (lines 25-59) — copy verbatim, no changes.

---

### `src/lib/money.test.ts` (NEW — test)

**Analog:** `src/lib/seo.test.ts` — existing unit test for a pure utility, same structure.

**Test file structure from `src/lib/seo.test.ts`** (lines 1-10):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
// ... import the tested functions
describe('fmtMoney()', () => {
  it('formats TRY amount with tr-TR locale', () => {
    expect(fmtMoney(1234, 'TRY', 'tr-TR')).toContain('₺');
  });
  it('formats USD with en-US locale', () => {
    expect(fmtMoney(9.99, 'USD', 'en-US')).toBe('$9.99');
  });
  it('falls back to TRY when no currency arg and env not set', () => {
    // delete process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY and assert
  });
});
```

---

### `src/app/api/storefront/__tests__/proxy.test.ts` (NEW — test)

**Analog:** `src/app/sitemap.test.ts` — existing test that mocks a module and asserts URL construction.

**Test structure from `src/app/sitemap.test.ts`** (lines 1-14):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/server-api', () => ({ ... }));
import sitemap from './sitemap';
// ...
describe('sitemap()', () => {
  it('emits absolute static, category and product URLs', async () => { ... });
});
```

**Adapted for proxy test:**
```typescript
// vi.mock fetch globally
// Create a fake NextRequest with NEXT_LOCALE cookie set to 'tr'
// Call proxy(req, ['products', 'slug-123'])
// Assert fetch was called with URL containing ?lang=tr-TR
// Call proxy(req, ['products'])  (list endpoint)
// Assert fetch was called WITHOUT ?lang= param
```

---

## Shared Patterns

### `useTranslations` vs `getTranslations` — Server/Client Boundary
**Rule (from RESEARCH.md Pitfall 5):**
- `'use client'` component → `useTranslations('namespace')` from `'next-intl'` (sync)
- `async function Page()` / RSC → `await getTranslations({ locale, namespace })` from `'next-intl/server'`

**Apply to:** `Header.tsx` (client → `useTranslations`), `ProductReviews.tsx` (client → `useTranslations`), `src/app/[locale]/layout.tsx` (async server → `getTranslations`), all page `generateMetadata` functions (async → `getTranslations`).

### `setRequestLocale` in Every Page
**Source:** RESEARCH.md Pitfall 4
**Apply to:** Every page file under `src/app/[locale]/` that is an async server component.

```typescript
// First statement in every async page / layout:
import { setRequestLocale } from 'next-intl/server';
// ...
export default async function SomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // ... rest of page
}
```

### Import `Link`/`useRouter` from `@/i18n/navigation`
**Source:** RESEARCH.md Pitfall 3 (Anti-pattern) + Pattern 4
**Apply to:** All components and pages that navigate programmatically or render `<Link>` elements: `Header.tsx`, `Footer.tsx`, all page-level `<Link>` renders.

### ICU Plural Syntax for TR/EN
**Source:** RESEARCH.md `Don't Hand-Roll` section
**Apply to:** `ProductReviews.tsx` review count, any other count-based plurals found during extraction.

```json
"product.reviewCount": "{count, plural, one {# review} other {# reviews}}"
```

TR does not have 1/2-4/5+ Russian plural rules — `one`/`other` is sufficient for both EN and TR.

### `Intl.DateTimeFormat(locale)` for Dates
**Source:** RESEARCH.md Pitfall 9 (WR-02)
**Apply to:** `ProductReviews.tsx` `fmtDate`, any other date formatting in the codebase.

```typescript
// Active locale from useLocale() (client) or from params.locale (server)
new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
  day: '2-digit', month: 'long', year: 'numeric',
}).format(new Date(dateString))
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/middleware.ts` | middleware | request-response | No middleware exists in ACTR yet; next-intl boilerplate is the only source |
| `src/i18n/request.ts` | config | request-response | No i18n server config exists in ACTR yet |
| `messages/en.json` | config | — | No message catalog exists; EN strings must be extracted from ~50 Cyrillic files |
| `messages/tr.json` | config | — | TR translations come from Tolgee project 34 export |

---

## Page Move Inventory

All files listed below are MOVED from `src/app/X` to `src/app/[locale]/X` with minimal edits (string extraction + `setRequestLocale` for server pages, `Link`/`useRouter` import swap for client pages):

| From | Cyrillic? | Server/Client | Extra Work |
|------|-----------|---------------|------------|
| `src/app/page.tsx` | no | client | import swap only |
| `src/app/catalog/page.tsx` | likely yes | check | string extract |
| `src/app/catalog/[slug]/page.tsx` | likely yes | server | setRequestLocale + string extract |
| `src/app/catalog/[slug]/[productSlug]/page.tsx` | no (uses seo.ts) | server | setRequestLocale + locale param to `buildProductMetadata` |
| `src/app/basket/page.tsx` | likely yes | check | string extract |
| `src/app/checkout/page.tsx` | likely yes | check | string extract |
| `src/app/checkout/success/page.tsx` | likely yes | check | string extract |
| `src/app/login/page.tsx` | likely yes | check | string extract |
| `src/app/login/register/page.tsx` | likely yes | check | string extract |
| `src/app/login/forgot-password/page.tsx` | likely yes | check | string extract |
| `src/app/login/reset-password/page.tsx` | likely yes | check | string extract |
| `src/app/account/page.tsx` | likely yes | check | string extract |
| `src/app/account/orders/page.tsx` | likely yes | check | string extract |
| `src/app/account/orders/[id]/page.tsx` | likely yes | check | string extract |
| `src/app/account/addresses/page.tsx` | likely yes | check | string extract |
| `src/app/account/settings/page.tsx` | likely yes | check | string extract |
| `src/app/contacts/page.tsx` | yes | check | string extract |
| `src/app/delivery/page.tsx` | yes | check | string extract |
| `src/app/faq/page.tsx` | yes | check | string extract |
| `src/app/partners/page.tsx` | yes | check | string extract |
| `src/app/partners/bloggers/page.tsx` | yes | check | string extract |
| `src/app/partners/schools/page.tsx` | yes | check | string extract |
| `src/app/partners/shops/page.tsx` | yes | check | string extract |
| `src/app/studios/page.tsx` | yes | check | string extract |
| `src/app/not-found.tsx` | yes | check | string extract |
| `src/app/error.tsx` | yes | check | string extract |
| `src/app/global-error.tsx` | yes | check | string extract |

Files that stay OUTSIDE `[locale]` (do NOT move):
- `src/app/api/storefront/[...path]/route.ts` — API route
- `src/app/reset-password/page.tsx` — ARM email link target shim
- `src/app/sitemap.ts` — route handler
- `src/app/product-metadata.test.tsx` — test artifact

---

## Metadata

**Analog search scope:** `src/app/`, `src/components/`, `src/lib/`, `src/providers/`, `~/work/puz/FBG/src/` (concepts only)
**Files scanned:** 22 source files + 3 test files + next.config.js
**Pattern extraction date:** 2026-06-30
