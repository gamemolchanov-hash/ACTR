---
phase: 04-i18n-en-tr
reviewed: 2026-06-30T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - src/app/api/storefront/[...path]/route.ts
  - src/middleware.ts
  - src/i18n/routing.ts
  - src/i18n/request.ts
  - src/i18n/navigation.ts
  - next.config.js
  - src/lib/money.ts
  - src/lib/seo.ts
  - src/lib/server-api.ts
  - src/app/sitemap.ts
  - src/app/[locale]/layout.tsx
  - src/components/GeoLocaleInit.tsx
  - src/components/ProductReviews.tsx
  - src/app/reset-password/page.tsx
  - scripts/messages-pull.mjs
findings:
  critical: 2
  warning: 7
  info: 4
  total: 13
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-06-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed the 15 logic-bearing files for phase 04 (i18n EN/TR migration). The
mechanical string-externalization files were excluded per scope.

The core i18n wiring — next-intl routing/request config, the `?lang` BCP-47
injection in the storefront proxy, and the server-api `LOCALE_TO_BCP47` map —
is structurally sound. The fixed-map approach for locale→BCP-47 conversion
prevents injection and is consistently applied across `route.ts`,
`server-api.ts`, and `seo.ts`. No RUB/₽/ru-RU/ru_RU residue was found in
any logic file. The Tolgee pull script does not leak credentials.

Two blockers stand out: the default `SITE_URL` in `seo.ts` hard-codes
`american-creator.ru` — the wrong domain for this Turkish standalone project —
meaning all canonical URLs, OG tags, JSON-LD, and sitemaps are silently
mis-attributed if `NEXT_PUBLIC_SITE_URL` is not set at deploy time. Second,
`productCanonicalUrl` emits a locale-less path that no real URL resolves to
without a redirect, making the JSON-LD `url` and `offers.url` inconsistent
with the Next.js `<link rel="canonical">` tag (which is locale-prefixed
correctly). Seven warnings cover pagination truncation risk, a defensive coding
hole in `ProductReviews`, an unvalidated cookie value used in a redirect,
a UX loop for direct TR visitors, missing error handling in the proxy, and a
partial-failure exit-code issue in the Tolgee script.

---

## Critical Issues

### CR-01: Default SITE_URL Points to Wrong Domain

**File:** `src/lib/seo.ts:22`

**Issue:** `SITE_URL` falls back to `https://american-creator.ru` when
`NEXT_PUBLIC_SITE_URL` is absent. ACTR is a separate standalone Turkish
storefront with its own domain. If the env var is missing at build time
(missing `.env.production`, forgotten secret in CI, staging deploy), every
canonical `<link>`, OG `url`, JSON-LD `url`/`offers.url`, and every sitemap
entry points to the Russian site. Google would treat ACTR's indexed pages as
duplicates of american-creator.ru and could suppress or re-attribute them.
There is no loud failure to catch the mis-configuration.

**Fix:** Either fail loudly at startup when the env is unset, or use a
placeholder that obviously cannot be a real domain:

```ts
// Option A — fail at build time so mis-deploys are caught immediately:
export const SITE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL is required. Set it to the ACTR production domain.'
    );
  }
  return url.replace(/\/+$/, '');
})();

// Option B — harmless sentinel that cannot be mis-indexed:
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'
).replace(/\/+$/, '');
```

Option A is preferred: the build breaks loud rather than shipping invisible
SEO damage.

---

### CR-02: productCanonicalUrl Emits a Locale-Less URL That Does Not Exist

**File:** `src/lib/seo.ts:74`

**Issue:** `productCanonicalUrl` returns `${SITE_URL}/catalog/${cat}/${slug}`
with no locale prefix. Because `localePrefix: 'always'` is in effect, that
path does not exist as a canonical URL — the real pages are at
`/en/catalog/...` and `/tr/catalog/...`. A request to the locale-less path
redirects (302) to `/en/catalog/...`, meaning the JSON-LD `url` and
`offers.url` fields (built via `buildProductJsonLd`) reference a redirect
target, not the actual page. This is inconsistent with the `<link
rel="canonical">` in `buildProductMetadata` (which is correctly
locale-prefixed). Google's Rich Results test and indexing pipeline may flag
the discrepancy or ignore the JSON-LD entirely.

```ts
// seo.ts – buildProductJsonLd calls productCanonicalUrl (line 158)
const url = productCanonicalUrl(product); // → /catalog/cat/slug — WRONG
```

**Fix:** Either make `productCanonicalUrl` locale-aware, or inline the
correct locale URL directly in `buildProductJsonLd`. The simplest fix is
to add a `locale` parameter:

```ts
export function productCanonicalUrl(product: Product, locale = 'en'): string {
  const categorySlug = product.category?.slug ?? 'all';
  const productSlug = product.slug ?? product.id;
  return absoluteUrl(`/${locale}/catalog/${categorySlug}/${productSlug}`);
}
```

Then pass the locale from every call site. In `buildProductJsonLd`, add a
`locale` parameter and thread it through. If `productCanonicalUrl` is used
elsewhere for a locale-agnostic identifier, keep it for that purpose and
introduce a separate `productPageUrl(product, locale)` helper.

---

## Warnings

### WR-01: Pagination Silently Caps at First Page When BFF Omits `meta.totalPages`

**File:** `src/lib/server-api.ts:165`

**Issue:**

```ts
const totalPages = res.meta?.totalPages ?? page;
if (page >= totalPages) break;
```

When `res.meta` is absent or `res.meta.totalPages` is undefined, `totalPages`
defaults to the current `page` value. On page 1, `totalPages = 1`, so the
loop breaks after the first page. The sitemap and any full-catalog renders
would silently contain only the first 100 products. No error or warning is
emitted.

**Fix:** Treat an absent `totalPages` as "unknown/continue" rather than
"done". The safest approach is to break only on an empty data array (which
is already handled by `if (!res.data?.length) break;`) and not on
`totalPages`:

```ts
// Replace the totalPages check with a strict break on empty page only:
if (!res.data?.length) break;
all.push(...res.data.map(armToProduct));
// Only break early if meta explicitly says we're on the last page:
if (res.meta?.totalPages !== undefined && page >= res.meta.totalPages) break;
```

If the BFF always returns `meta`, add a log warning when it's absent so
the gap is visible.

---

### WR-02: `buildProductJsonLd` Calls `buildMetaDescription` Without Locale

**File:** `src/lib/seo.ts:161`

**Issue:**

```ts
const description = buildMetaDescription(product);  // no locale
```

`buildMetaDescription` accepts `locale` (defaults to `'en'`) and uses it to
format the fallback price string via `fmtMoney`. On Turkish product pages,
the auto-generated meta description (for products without a `description`
field) will use `en-US` locale formatting regardless of the active page
locale. The price in the JSON-LD description will display in EN format
(`$450.00`) rather than TR format (`₺450,00`).

**Fix:** Pass the `locale` parameter to `buildProductJsonLd` and thread
it through:

```ts
export function buildProductJsonLd(
  product: Product,
  reviews?: ReviewAggregate | null,
  locale = 'en',        // add locale
): Record<string, unknown> {
  // ...
  const description = buildMetaDescription(product, locale);  // pass it
```

Update all call sites accordingly.

---

### WR-03: `data?.meta.average` — Missing Optional Chain on `meta`

**File:** `src/components/ProductReviews.tsx:94`

**Issue:**

```ts
const average = data?.meta.average || 0;
const total   = data?.meta.total   || 0;
```

When `data` is defined but `data.meta` is `undefined` (unexpected API
response shape, network error during parse, API version mismatch), the
expression `data.meta.average` throws `TypeError: Cannot read properties of
undefined (reading 'average')` and crashes the reviews component. `data?.`
short-circuits on `data` being nullish but does not protect against
`meta` being absent.

**Fix:** Use full optional chaining:

```ts
const average = data?.meta?.average || 0;
const total   = data?.meta?.total   || 0;
```

---

### WR-04: `fmtDate` Called Without Null-Guard on `r.date_created`

**File:** `src/components/ProductReviews.tsx:207`

**Issue:**

```tsx
<Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
  {fmtDate(r.date_created)}
</Typography>
```

`fmtDate` calls `new Intl.DateTimeFormat(bcp47, ...).format(new Date(d))`.
If `r.date_created` is `null`, `undefined`, or an empty string,
`new Date(undefined)` produces an "Invalid Date" object, and
`Intl.DateTimeFormat.format(invalidDate)` renders the literal string
`"Invalid Date"` visible to the user.

**Fix:** Guard the render:

```tsx
{r.date_created ? (
  <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
    {fmtDate(r.date_created)}
  </Typography>
) : null}
```

Or add a null-safe wrapper inside `fmtDate`:

```ts
const fmtDate = (d: string | null | undefined) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return new Intl.DateTimeFormat(bcp47, { day: '2-digit', month: 'long', year: 'numeric' }).format(dt);
};
```

---

### WR-05: `NEXT_LOCALE` Cookie Value Used Unvalidated in Redirect Path

**File:** `src/app/reset-password/page.tsx:27`

**Issue:**

```ts
const localeCookie = document.cookie
  .split(';')
  .find((c) => c.trim().startsWith('NEXT_LOCALE='));
const locale = localeCookie ? localeCookie.split('=')[1].trim() : 'en';
router.replace(
  `/${locale}/login/reset-password${token ? `?token=${encodeURIComponent(token)}` : ''}`,
);
```

`locale` is read from a client-controlled cookie and interpolated directly
into the redirect path without validation against the known locale set
`['en', 'tr']`. A cookie with value `../../admin` would construct the path
`/../../admin/login/reset-password`, which browsers normalize to
`/admin/login/reset-password`. While this is a same-origin redirect (no
open-redirect to an external host), it surfaces the risk of a cookie-set
XSS on any page of the same origin (even a minor XSS elsewhere) being
leveraged to redirect password-reset traffic to a different in-app path.

**Fix:** Validate against the known locale set before use:

```ts
const VALID_LOCALES = ['en', 'tr'] as const;

const rawLocale = localeCookie?.split('=')[1]?.trim() ?? '';
const locale = VALID_LOCALES.includes(rawLocale as (typeof VALID_LOCALES)[number])
  ? rawLocale
  : 'en';
```

---

### WR-06: TR Users Landing Directly on `/tr/` Never Receive `NEXT_LOCALE` Cookie

**File:** `src/components/GeoLocaleInit.tsx:30`

**Issue:**

```ts
if (cfg.geo_country === 'TR' && currentLocale !== 'tr') {
  document.cookie = 'NEXT_LOCALE=tr;...';
  router.replace(pathname, { locale: 'tr' });
}
```

The cookie is only written when the component redirects a TR user from EN to
TR. A TR user who arrives directly on a `/tr/` URL (from a bookmark, a
partner link, or a TR-prefixed link) never triggers the redirect condition
(`currentLocale !== 'tr'` is false), so no `NEXT_LOCALE` cookie is set. On a
subsequent navigation to `/` (root), next-intl middleware finds no cookie and
falls back to `defaultLocale: 'en'`, redirecting the user to `/en/` and
undoing the geo-based preference. This creates a first-visit trap that
repeats on every cold root-visit for TR users who arrive via TR-prefixed
URLs.

**Fix:** Set the cookie whenever geo matches, regardless of whether a
redirect is needed:

```ts
if (cfg.geo_country === 'TR') {
  document.cookie =
    'NEXT_LOCALE=tr;path=/;max-age=' + 365 * 24 * 3600 + ';SameSite=Lax';
  if (currentLocale !== 'tr') {
    router.replace(pathname, { locale: 'tr' });
  }
}
```

---

### WR-07: Partial Tolgee Pull Exits 0 on Per-Language Failure

**File:** `scripts/messages-pull.mjs:87`

**Issue:**

```js
if (successCount === 0) {
  process.exit(1);
}
```

If the EN pull fails but the TR pull succeeds, `successCount === 1` and the
script exits 0. A developer or CI pipeline may commit the partially-updated
`messages/` directory with an outdated `en.json` and a fresh `tr.json`,
silently shipping translation inconsistencies into production. The error is
printed to stderr but the exit code does not signal failure to the calling
pipeline.

**Fix:** Exit non-zero if any language failed, not only if all failed:

```js
if (successCount < LANGUAGES.length) {
  console.error(`\nError: only ${successCount}/${LANGUAGES.length} languages pulled successfully.`);
  process.exit(1);
}
```

If partial-success tolerance is desired (e.g., a new language being added
incrementally), make it explicit with a `--allow-partial` flag rather than
silently succeeding.

---

## Info

### IN-01: Stale Comment References OMS Path in `server-api.ts`

**File:** `src/lib/server-api.ts:8`

**Issue:** The module docstring reads:

> mirroring how the Next.js rewrite proxies `/api/storefront/* →
> ${BFF}/public/oms/storefront/*`

The actual `STOREFRONT_BASE` is `/public/arm/storefront` (ARM, not OMS). The
OMS rewrite was removed in Phase 1. The stale reference will confuse
developers debugging routing.

**Fix:** Update the comment to reflect the ARM path.

---

### IN-02: Missing `x-default` hreflang Alternate in Sitemap and Layout

**Files:** `src/app/sitemap.ts:51`, `src/app/[locale]/layout.tsx:46`,
`src/lib/seo.ts:111`

**Issue:** The `alternates.languages` objects in all three files list only
`en` and `tr`. Google's hreflang specification recommends an `x-default`
entry pointing to the canonical (or language-selector) URL so crawlers
know which URL to display for users outside both locales.

**Fix:** Add `'x-default'` to each `languages` object pointing to the EN
URL (or the root URL if it redirects to EN):

```ts
// In localizedEntry (sitemap.ts):
languages: {
  en: enUrl,
  tr: trUrl,
  'x-default': enUrl,
},

// In layout.tsx generateMetadata alternates:
languages: {
  en: `${SITE_URL}/en`,
  tr: `${SITE_URL}/tr`,
  'x-default': `${SITE_URL}/en`,
},
```

---

### IN-03: `GeoLocaleInit` Sets Cookie Without `Secure` Flag

**File:** `src/components/GeoLocaleInit.tsx:33`

**Issue:**

```ts
document.cookie =
  'NEXT_LOCALE=tr;path=/;max-age=' + 365 * 24 * 3600 + ';SameSite=Lax';
```

The manually-set cookie omits the `Secure` attribute. The `NEXT_LOCALE`
cookie is not a security secret (it controls only locale preference), but
the next-intl middleware-set cookie (via `localeCookie` config in
`routing.ts`) likely includes `Secure` on HTTPS deployments. Having two
codepaths for the same cookie with different attributes can cause unexpected
precedence behaviour in some browsers.

**Fix:** Append `Secure` when the page is served over HTTPS:

```ts
const secure = location.protocol === 'https:' ? ';Secure' : '';
document.cookie =
  `NEXT_LOCALE=tr;path=/;max-age=${365 * 24 * 3600};SameSite=Lax${secure}`;
```

---

### IN-04: Middleware `reset-password` Exclusion Not Anchored

**File:** `src/middleware.ts:8`

**Issue:**

```ts
matcher: ['/((?!api|_next|_vercel|reset-password|.*\\..*).*)'],
```

The negative lookahead `reset-password` matches any path whose first
segment starts with `reset-password`, not just the exact `/reset-password`
path. A future locale-aware route like `/en/reset-password-confirmation`
would be silently excluded from the i18n middleware.

**Fix:** Anchor the exclusion to the segment:

```ts
matcher: ['/((?!api|_next|_vercel|reset-password(?:/|$)|.*\\..*).*)'],
```

The `(?:/|$)` ensures only `/reset-password` and
`/reset-password/...` are excluded, not `/reset-password-anything`.

---

_Reviewed: 2026-06-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
