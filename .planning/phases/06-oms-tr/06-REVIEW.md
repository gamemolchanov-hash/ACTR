---
phase: 06-oms-tr
reviewed: 2026-07-01T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - messages/en.json
  - messages/tr.json
  - public/robots.txt
  - src/app/[locale]/catalog/[slug]/[productSlug]/page.tsx
  - src/app/[locale]/catalog/[slug]/page.tsx
  - src/app/[locale]/catalog/page.tsx
  - src/app/[locale]/contacts/page.tsx
  - src/app/[locale]/delivery/page.tsx
  - src/app/[locale]/page.tsx
  - src/app/sitemap.ts
  - src/components/Footer.tsx
  - src/components/Header.tsx
  - src/components/ProductCard.tsx
  - src/components/ProductDetail.tsx
  - src/components/__tests__/ProductDetail.sanitize.test.tsx
  - src/lib/api.ts
  - src/lib/arm-adapter.ts
  - src/lib/seo.test.ts
  - src/lib/seo.ts
  - src/lib/server-api.ts
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-07-01
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 6 was a cleanup/brand-swap phase (remove OMS/RU dead code, swap RU→TR). The
mechanical removal is clean: `partners/`, `studios/`, `promo-bogo/`, `ProductReviews`
and their assets are fully deleted with **no dangling imports, routes, or asset
references** (verified `find` + `grep`). i18n EN/TR parity is complete — every `t()`
key used in the reviewed components resolves in both `messages/en.json` and
`messages/tr.json`, and all referenced routes (`/faq`, `/legal/*`, `/account/orders`,
`/delivery`, `/contacts`) exist on disk. DOMPurify/`jsonLdScript` XSS sinks are
correctly sanitized.

However the RU→TR swap is **incomplete**: the most legally-material RU residue — the
seller's legal address and bank account — is still Russian (Moscow / PAO Sberbank) in
both locale files, and the footer copyright still reads `american-creator.ru`.
Separately, because `localePrefix: 'always'` prefixes every URL with `/en` or `/tr`,
the `robots.txt` `Disallow` rules no longer match any real path, so checkout/account/
basket are left crawlable. No crashes, injection, or auth-bypass defects were found.

## Critical Issues

### CR-01: Russian legal entity + Sberbank bank account shipped on the TR storefront

**File:** `messages/en.json:220-224`, `messages/tr.json:220-224`
**Issue:** The contacts "Legal Info" block (rendered by `contacts/page.tsx:298-319`)
still contains the Russian seller identity in **both** locales:
```
"contacts.legalLine1": "Legal address: 108801, Moscow, Sosenkoye settlement,"
"contacts.legalLine2": "Kommunarka village, Aleksandry Monakhovoy St., 88, ..."
"contacts.legalLine3": "Current account: 40802810638000019658"
"contacts.legalLine4": "Bank name: PAO Sberbank"
"contacts.legalLine5": "Correspondent account: 30101810400000000225"
```
This is the exact RU residue the phase was meant to remove. It is user-facing on the
contacts page and is legally material: TR *mesafeli satış* (distance-selling) rules —
a stated hard constraint in `CLAUDE.md` — require the correct Turkish seller legal
identity and bank details. Publishing a Moscow address + a Russian Sberbank RUB
account as the merchant of record is incorrect content and a compliance defect, not a
cosmetic one. The phase's own swap list ("RU phone/email/socials/payment icons")
omitted this block, so it was simply overlooked.
**Fix:** Replace all five `contacts.legalLine*` values with the TR entity's legal
address / VKN-TCKN / IBAN (or a TR placeholder consistent with the rest of the swap)
in both `en.json` and `tr.json`. If real details are not yet available, gate the block
behind a "pending" placeholder rather than shipping the Russian ones.

## Warnings

### WR-01: Footer copyright still hardcodes the RU domain `american-creator.ru`

**File:** `src/components/Footer.tsx:214`
**Issue:** `2026 &copy; american-creator.ru` is rendered in the shared footer on every
page of the TR storefront. This is RU-brand residue that the swap missed. (Note the
`seo.ts:22` comment reference to `american-creator.ru` is fine — it is an explanatory
comment warning *against* using that domain — but this footer string is live output.)
**Fix:** Replace with the TR go-live domain (or a neutral `© 2026 American Creator`):
```tsx
2026 &copy; American Creator
```

### WR-02: robots.txt `Disallow` rules never match — transactional pages stay crawlable

**File:** `public/robots.txt:6-9`
**Issue:** `routing.localePrefix` is `'always'` (`src/i18n/routing.ts`), so every real
URL is `/en/...` or `/tr/...` (confirmed by `sitemap.ts` emitting `${SITE_URL}/en...`).
robots.txt path matching is a literal prefix from the start of the path, so
`Disallow: /account` does **not** match `/en/account` or `/tr/account`. The result:
`/checkout`, `/account`, `/basket`, `/login` are all left indexable — the opposite of
the file's intent. `seo.test.ts:220` enshrines the broken pattern, so tests pass while
the rule is inert.
**Fix:** Disallow the locale-prefixed variants (or use a wildcard):
```
Disallow: /*/account
Disallow: /*/basket
Disallow: /*/checkout
Disallow: /*/login
```
and update the assertion in `seo.test.ts` accordingly.

### WR-03: robots.txt `Sitemap:` uses a relative URL

**File:** `public/robots.txt:11`
**Issue:** `Sitemap: /sitemap.xml` is a relative path. The robots.txt spec requires the
`Sitemap` directive to be a fully-qualified absolute URL; crawlers ignore relative
values, so the sitemap is effectively unadvertised.
**Fix:** Emit the absolute URL, e.g. `Sitemap: https://<tr-domain>/sitemap.xml`. Since
the origin is environment-specific (`NEXT_PUBLIC_SITE_URL`), consider generating
`robots.txt` from a `robots.ts` route so the origin is filled at build/runtime instead
of hardcoding it in the static file.

### WR-04: Client default tenant falls back to OMS tenant `tenant_snailmarket`

**File:** `src/lib/api.ts:3`
**Issue:** `const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'tenant_snailmarket';`
The `snailmarket` tenant is the OMS/RU tenant this phase set out to disentangle from.
If `NEXT_PUBLIC_TENANT_ID` is ever unset in an environment, the client silently sends
`X-Tenant-ID: tenant_snailmarket`, pointing the TR storefront at the wrong tenant — a
latent data/isolation bug, not just residue. It also disagrees with the server default
(`server-api.ts:30` → `'demo-tenant'`), so client and server would target different
tenants under the same misconfiguration.
**Fix:** Use a neutral, phase-appropriate default (or fail loudly if unset), and align
client/server defaults:
```ts
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'demo-tenant';
```

### WR-05: Hardcoded English nav labels break i18n on the TR storefront

**File:** `src/components/Footer.tsx:62-63`, `src/components/Header.tsx:781`
**Issue:** Most nav labels use `t()`, but three are hardcoded English literals:
`{ label: 'Delivery & Payment', href: '/delivery' }`, `{ label: 'FAQ', href: '/faq' }`
(Footer), and `{ label: 'Orders', href: '/account/orders' }` (Header mobile drawer).
On the TR locale these render in English while everything around them is Turkish.
`messages/*.json` already carry the surrounding keys but not these labels.
**Fix:** Add keys (e.g. `nav.delivery`, `nav.faq`, `account.myOrders` already exists)
to both locale files and reference them via `t(...)`:
```tsx
{ label: t('nav.delivery'), href: '/delivery' },
{ label: t('nav.faq'), href: '/faq' },
// Header: { label: t('account.myOrders'), href: '/account/orders' },
```

## Info

### IN-01: Product JSON-LD description is always English regardless of locale

**File:** `src/lib/seo.ts:147`
**Issue:** `buildProductJsonLd` calls `buildMetaDescription(product)` with no locale, so
the structured-data `description` (and its price fallback) is always `en`, even when the
page is served under `/tr` (`ProductPage` has `params.locale`). Minor SEO inconsistency
vs the locale-aware `<meta>`/OG output.
**Fix:** Thread locale through: `buildProductJsonLd(product, locale)` →
`buildMetaDescription(product, locale)`.

### IN-02: Stale OMS reference + inconsistent tenant default in server-api

**File:** `src/lib/server-api.ts:8, 30`
**Issue:** The header comment still says the rewrite proxies to
`${BFF}/public/oms/storefront/*`, while the actual base is `/public/arm/storefront`
(`STOREFRONT_BASE`, line 32) — leftover OMS wording from before the ARM swap. The
default tenant here (`'demo-tenant'`) also differs from the client default in
`api.ts` (`'tenant_snailmarket'`), see WR-04.
**Fix:** Update the comment to reference `/public/arm/storefront/*` and align the
default tenant with the client.

### IN-03: buildMetaDescription price-fallback sentence is English-only

**File:** `src/lib/seo.ts:70-73`
**Issue:** When a product has no `description`, the generated fallback
(`"... Shop American Creator: professional products for nail professionals."`) is
hardcoded English even for `locale='tr'` (only the price number is localized). TR
product pages without a description get an English meta description.
**Fix:** Localize the fallback sentence (move the boilerplate into `messages/*.json`
under e.g. `meta.productFallback` and format with name/price), or accept as a known
limitation and document it.

---

_Reviewed: 2026-07-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
