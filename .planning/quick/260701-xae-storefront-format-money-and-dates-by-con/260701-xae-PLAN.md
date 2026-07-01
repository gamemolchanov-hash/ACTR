---
phase: quick-260701-xae
plan: 01
type: execute
wave: 1
depends_on: []
requirements: [260701-xae]
autonomous: true
files_modified:
  - src/lib/format-locale.ts
  - src/lib/format-locale.test.ts
  - src/lib/storefront-config.ts
  - src/providers/CurrencyProvider.tsx
  - src/app/[locale]/layout.tsx
  - src/lib/money.ts
  - src/lib/money.test.ts
  - src/components/ProductCard.tsx
  - src/components/ProductDetail.tsx
  - src/components/Header.tsx
  - src/app/[locale]/basket/page.tsx
  - src/app/[locale]/checkout/page.tsx
  - src/app/[locale]/checkout/success/page.tsx
  - src/app/[locale]/account/orders/page.tsx
  - src/app/[locale]/account/orders/[id]/page.tsx

must_haves:
  truths:
    - "On both /tr and /en, product/cart/checkout/order money renders with the country's canonical locale (tenant TR + TRY -> ₺1.234,50), independent of the UI language."
    - "Order dates render fully numeric (e.g. 01.07.2026) on both /tr and /en, never leaking a country-language month name onto a different UI language."
    - "Switching UI language (tr<->en) still changes translated TEXT and the ?lang product-translation, but does NOT change money/date number formatting."
  artifacts:
    - "src/lib/format-locale.ts (formatLocaleFromCountry) + src/lib/format-locale.test.ts"
    - "getStorefrontConfig() in src/lib/storefront-config.ts returning {currency, country, locale}"
    - "useFormatLocale() in src/providers/CurrencyProvider.tsx"
    - "currencyDisplay:'narrowSymbol' in src/lib/money.ts"
  key_links:
    - "layout.tsx server-resolves config once, computes formatLocale = formatLocaleFromCountry(country, configLocale), and passes initialFormatLocale into CurrencyProvider (no hydration flash — server value as prop)."
    - "Every money call site passes useFormatLocale() as the locale arg (currency stays useCurrency()/order.currency)."
    - "Both date call sites use Intl.DateTimeFormat(formatLocale, {numeric}) instead of the UI bcp47."
---

<objective>
Drive money AND date FORMATTING on the ACTR storefront from the BFF's `config.country`
(ISO-3166-1 alpha-2, e.g. "TR"), independent of the UI language. Number separators,
currency-symbol position and symbol form follow the country's CANONICAL locale
(TR -> tr-TR -> ₺1.234,50); dates render numerically (01.07.2026) so a country-language
month name never leaks onto a different UI language.

Purpose: With tenant currency=TRY + country=TR, both `/tr` and `/en` must render money as
`₺1.234,50` and dates as `01.07.2026`, while the UI language still switches translated text
and the existing `?lang=` product-translation.

Output: New format-locale library + unit test, `getStorefrontConfig()` server helper,
`useFormatLocale()` provider hook, `narrowSymbol` on `fmtMoney`, and all money/date call
sites rewired off the UI bcp47.

Background (DONE — do NOT touch): BFF `/config` already returns `country` alongside
`currency` and `locale`. Verified live: `/api/storefront/config` -> `{currency:"TRY",
country:"TR", locale:"tr-TR", ...}`. This plan is frontend-only. Do NOT touch the BFF or
OMS/autoCRM. Backwards-compatible; preserve SSR/no-flash design.

Locked decisions (build to these exactly):
- D1: Formatting driven by `country`, NOT UI language. UI language (tr/en) stays ONLY for
  translated text + the existing `?lang=` product-translation — do NOT change that.
- D2: Derive the format locale via `new Intl.Locale('und',{region:country}).maximize().toString()`
  with an OVERRIDES map (empty for now) checked first; fallback to `config.locale` if present,
  else 'en-US', when country is null/empty/invalid.
- D3: Format with the country's CANONICAL locale (tr-TR), NOT `<uiLang>-<country>` (en-TR
  would give wrong grouping ₺1,234.50).
- D4: `fmtMoney` adds `currencyDisplay:'narrowSymbol'` (TRY -> ₺ even outside Turkish UI);
  keep its existing signature + currency/locale fallbacks.
- D5: Dates use the format locale + a NUMERIC format ({day:'2-digit',month:'2-digit',
  year:'numeric'}) to avoid leaking month names.

Out of scope (deliberate): `src/lib/seo.ts` (server-side SEO meta-description price) keeps its
own `bcp47` — it is a network-free/pure module used for metadata TEXT, not on-page money
display, and threading country into it would break its pure/testable design; it is NOT in the
task's file wiring. `src/app/api/storefront/[...path]/route.ts` `?lang=<bcp47>` product-translation
injection stays UNTOUCHED (D1). Optional follow-up: fold country-formatting into seo.ts later.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

# Formatter + wiring
@src/lib/money.ts
@src/lib/money.test.ts
@src/lib/currency-default.test.ts
@src/lib/storefront-config.ts
@src/providers/CurrencyProvider.tsx
@src/app/[locale]/layout.tsx

# Call sites (money)
@src/components/ProductCard.tsx
@src/components/ProductDetail.tsx
@src/components/Header.tsx
@src/app/[locale]/basket/page.tsx
@src/app/[locale]/checkout/page.tsx
@src/app/[locale]/checkout/success/page.tsx

# Call sites (dates + per-order money)
@src/app/[locale]/account/orders/page.tsx
@src/app/[locale]/account/orders/[id]/page.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Format-locale engine, config helper, provider hook, narrowSymbol</name>
  <files>src/lib/format-locale.ts, src/lib/format-locale.test.ts, src/lib/storefront-config.ts, src/providers/CurrencyProvider.tsx, src/app/[locale]/layout.tsx, src/lib/money.ts, src/lib/money.test.ts</files>
  <behavior>
    format-locale.test.ts (write FIRST, RED, then implement):
    - formatLocaleFromCountry('TR') -> string whose lowercase starts with 'tr' (canonical, e.g. 'tr-Latn-TR' or 'tr-TR').
    - formatLocaleFromCountry('US') -> string whose lowercase starts with 'en'.
    - formatLocaleFromCountry(null, 'tr-TR') -> 'tr-TR' (fallback used).
    - formatLocaleFromCountry(null) -> 'en-US' (default fallback).
    - formatLocaleFromCountry('TUR', 'en-GB') -> 'en-GB' (non-2-letter guarded to fallback).
    money.test.ts stays green after adding narrowSymbol; adjust an expected string ONLY if narrowSymbol changes it, preserving the WR-05 fallback semantics (no-arg -> TRY, not USD/$).
  </behavior>
  <action>
    Implement the format-locale/config/provider/money plumbing so call sites (Tasks 2-3) have
    a single source of truth. Per D2/D3/D4. All edits are small and must land together so
    `npx tsc --noEmit` stays clean.

    1. NEW src/lib/format-locale.ts — export `formatLocaleFromCountry(country?: string | null,
       fallbackLocale?: string): string`. Normalize country to trimmed uppercase; compute
       `fallback = fallbackLocale || 'en-US'`. Guard: if it is not exactly two ASCII letters,
       return fallback. Then check a module-level `const OVERRIDES: Record<string,string> = {}`
       (empty for now) and return the mapped value if present. Otherwise inside a try, return
       `new Intl.Locale('und', { region: cc }).maximize().toString()` (falling back if that is
       empty); on any throw return fallback. Add a JSDoc header explaining that separators +
       symbol position follow the LANGUAGE subtag, so we resolve the country's CANONICAL locale
       rather than building a mixed uiLang-region tag.

    2. NEW src/lib/format-locale.test.ts — vitest cases exactly as in the behavior block.

    3. src/lib/storefront-config.ts — add `export type StorefrontConfig = { currency: string;
       country: string | null; locale: string | null }` and `export async function
       getStorefrontConfig(): Promise<StorefrontConfig>`. Reuse the SAME never-throw fetch as
       getStorefrontCurrency (X-Tenant-ID + optional X-Storefront-Key headers, BFF
       `/public/arm/storefront/config`, `next: { revalidate: 300 }`). Read from `data?.data`
       first then `data`: currency via the existing fallback chain (config.currency ->
       NEXT_PUBLIC_STOREFRONT_CURRENCY -> 'TRY'), `country: data?.data?.country ?? data?.country
       ?? null`, `locale: data?.data?.locale ?? data?.locale ?? null`. On catch return
       `{ currency: NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY', country: null, locale: null }`.
       Keep `getStorefrontCurrency()` exported for backwards-compat; have it delegate:
       `return (await getStorefrontConfig()).currency`. Keep `import 'server-only'`.

    4. src/providers/CurrencyProvider.tsx — add a second context `FormatLocaleContext`
       (string | undefined). Add `initialFormatLocale: string` to CurrencyProvider props and
       wrap children in `<FormatLocaleContext.Provider value={initialFormatLocale}>` INSIDE the
       existing currency provider (server value passed as prop -> no hydration mismatch). Keep
       `useCurrency(): string` unchanged. Add `export function useFormatLocale(): string` that
       returns the context value, falling back to 'en-US' when undefined.

    5. src/app/[locale]/layout.tsx — replace the `getStorefrontCurrency` import with
       `getStorefrontConfig` and add `import { formatLocaleFromCountry } from '@/lib/format-locale'`.
       Replace `const currency = await getStorefrontCurrency();` with a single fetch destructured
       as `const { currency, country, locale: configLocale } = await getStorefrontConfig();`
       (alias `locale` -> `configLocale` to avoid colliding with the route `locale` param) and
       `const formatLocale = formatLocaleFromCountry(country, configLocale ?? undefined);`. Pass
       `initialFormatLocale={formatLocale}` alongside `initialCurrency={currency}` on
       CurrencyProvider.

    6. src/lib/money.ts — add `currencyDisplay: 'narrowSymbol'` to the Intl.NumberFormat options
       (D4). Keep the signature, the currency/locale fallbacks, and the unknown-currency catch
       branch untouched. Update the JSDoc to mention narrowSymbol.

    7. src/lib/money.test.ts — run it; only adjust an expected string if narrowSymbol changed it,
       keeping the WR-05 fallback intent.
  </action>
  <verify>
    <automated>cd /home/lexun/work/puz/ACTR && npx vitest run src/lib/format-locale.test.ts src/lib/money.test.ts src/lib/currency-default.test.ts && test "$(grep -c narrowSymbol src/lib/money.ts)" -ge 1 && npx tsc --noEmit</automated>
  </verify>
  <done>format-locale.test.ts green (TR->tr, US->en, null->fallback, non-2-letter->fallback); money.test + currency-default.test green; narrowSymbol present in money.ts; getStorefrontConfig + useFormatLocale exported; layout passes initialFormatLocale; tsc clean.</done>
</task>

<task type="auto">
  <name>Task 2: Rewire money display call sites off the UI bcp47</name>
  <files>src/components/ProductCard.tsx, src/components/ProductDetail.tsx, src/components/Header.tsx, src/app/[locale]/basket/page.tsx, src/app/[locale]/checkout/page.tsx, src/app/[locale]/checkout/success/page.tsx</files>
  <action>
    Make every money display use the country-derived format locale from `useFormatLocale()`
    instead of the UI language. Currency argument stays as it is (useCurrency() or order.currency).
    Per D1/D3/D4.
    <!-- planner-discipline-allow: bcp47 -->

    - ProductCard.tsx: import `useFormatLocale` from '@/providers/CurrencyProvider'; add
      `const formatLocale = useFormatLocale();`; at the price fmtMoney call (product.price)
      pass `formatLocale` as the third arg. `locale` here is used ONLY to derive the old
      per-UI locale, so delete `const locale = useLocale();` and remove `useLocale` from the
      next-intl import.

    - ProductDetail.tsx: import `useFormatLocale`. Rename the RecentlyViewedCard subcomponent
      prop from the old locale string to `formatLocale` (its type + the fmtMoney call inside it
      that formats `item.price`). In the main ProductDetail component add
      `const formatLocale = useFormatLocale();`, pass `formatLocale` as the locale arg to the
      product.price fmtMoney, and pass `formatLocale={formatLocale}` when rendering each
      `<RecentlyViewedCard>`. `locale` is used ONLY for the old per-UI locale here, so delete
      `const locale = useLocale();` and remove `useLocale` from the next-intl import.

    - Header.tsx: import `useFormatLocale`; add `const formatLocale = useFormatLocale();`;
      pass `formatLocale` as the locale arg to BOTH fmtMoney calls (desktop + mobile search
      results). Delete the old per-UI locale const. KEEP `const locale = useLocale();` — it is
      still used by the language switcher (active-state styling + router.replace locale).

    - basket/page.tsx: import `useFormatLocale`; after `const currency = useCurrency();` add
      `const formatLocale = useFormatLocale();`; add `formatLocale` as the third arg to EVERY
      fmtMoney call in the file (subtotal, discount, final total, per-item unit/line totals —
      all of them currently pass only currency).

    - checkout/page.tsx: import `useFormatLocale`; after `const currency = useCurrency();` add
      `const formatLocale = useFormatLocale();`; add `formatLocale` as the third arg to EVERY
      fmtMoney call (shipping rate prices, unit price, subtotal, KDV, promo discount, totals).

    - checkout/success/page.tsx: import `useFormatLocale`; inside the SuccessContent component
      add `const formatLocale = useFormatLocale();`; pass it as the third arg to the order-total
      fmtMoney (keep `order.currency` as the currency arg — per-order currency).

    Do NOT touch src/lib/seo.ts or src/app/api/storefront/[...path]/route.ts (both keep their
    own bcp47 for SEO metadata / the ?lang product-translation — out of scope per D1).
  </action>
  <verify>
    <automated>cd /home/lexun/work/puz/ACTR && npx tsc --noEmit && test "$(grep -rl 'bcp47' src/components/ProductCard.tsx src/components/ProductDetail.tsx src/components/Header.tsx 'src/app/[locale]/basket/page.tsx' 'src/app/[locale]/checkout/page.tsx' 'src/app/[locale]/checkout/success/page.tsx' | wc -l)" -eq 0 && test "$(grep -c formatLocale 'src/app/[locale]/checkout/page.tsx')" -ge 2</automated>
  </verify>
  <done>tsc clean; none of the six money call-site files reference the UI locale token any longer; every fmtMoney call passes useFormatLocale() as the locale arg while keeping its currency arg; Header still has `locale` for its language switcher.</done>
</task>

<task type="auto">
  <name>Task 3: Rewire order date + per-order money call sites (numeric dates)</name>
  <files>src/app/[locale]/account/orders/page.tsx, src/app/[locale]/account/orders/[id]/page.tsx</files>
  <action>
    Format order dates AND per-order money by the country-derived format locale, and make the
    order-detail date fully numeric so a country-language month name never appears on a different
    UI language. Per D1/D3/D4/D5.
    <!-- planner-discipline-allow: bcp47 -->

    - account/orders/page.tsx: import `useFormatLocale` from '@/providers/CurrencyProvider';
      replace the old per-UI locale const with `const formatLocale = useFormatLocale();`. In the
      Intl.DateTimeFormat call (order list date — already {day:'2-digit',month:'2-digit',
      year:'numeric'}) pass `formatLocale` as the locale. In the order-total fmtMoney pass
      `formatLocale` as the locale arg, keeping `order.currency` as the currency. `locale` is
      used ONLY for the old date/money locale here, so delete `const locale = useLocale();` and
      remove `useLocale` from the next-intl import.

    - account/orders/[id]/page.tsx: import `useFormatLocale`; replace the old per-UI locale const
      with `const formatLocale = useFormatLocale();`. In the Intl.DateTimeFormat call (order-detail
      date) pass `formatLocale` as the locale AND change the options to a fully NUMERIC format
      — day '2-digit', month '2-digit', year 'numeric' — replacing the current long month-name
      option (D5: numeric avoids leaking Turkish month names onto /en). In every fmtMoney call
      (items subtotal/VAT/total and per-item price/line total) pass `formatLocale` as the locale
      arg, leaving the currency arg (currency / order.currency) unchanged. `locale` is used ONLY
      for the old locale here, so delete `const locale = useLocale();` and remove `useLocale`
      from the next-intl import.
  </action>
  <verify>
    <automated>cd /home/lexun/work/puz/ACTR && npx tsc --noEmit && test "$(grep -rc 'Intl.DateTimeFormat(formatLocale' 'src/app/[locale]/account/orders/page.tsx' 'src/app/[locale]/account/orders/[id]/page.tsx' | grep -c ':1')" -eq 2 && test "$(grep -rl 'bcp47' 'src/app/[locale]/account/orders/page.tsx' 'src/app/[locale]/account/orders/[id]/page.tsx' | wc -l)" -eq 0 && test "$(grep -c "month: 'long'" 'src/app/[locale]/account/orders/[id]/page.tsx')" -eq 0</automated>
  </verify>
  <done>tsc clean; both order date call sites use Intl.DateTimeFormat(formatLocale, {numeric}); order-detail date is fully numeric (no long month name); order money uses formatLocale + per-order currency; neither file references the old UI locale token.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| BFF /config -> storefront (server) | `country` string is BFF-provided; it flows into `new Intl.Locale('und',{region:country})` and Intl.NumberFormat/DateTimeFormat locale args. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-xae-01 | Denial of Service | formatLocaleFromCountry | low | mitigate | Guard `country` to exactly two ASCII letters before constructing Intl.Locale, and wrap in try/catch returning fallback — a malformed/garbage country cannot throw or produce an invalid locale that breaks rendering. |
| T-xae-02 | Tampering | Intl locale arg at call sites | low | accept | Format locale is a canonical BCP-47 string derived from a validated 2-letter region (never raw user/UI input); Intl treats an unknown-but-well-formed tag as a benign fallback. No new packages installed. |
</threat_model>

<verification>
Full-suite + type + gate checks after all three tasks:

- `cd /home/lexun/work/puz/ACTR && npm test` (vitest run) is green.
- `npx tsc --noEmit` is clean.
- `grep -rn "Intl.DateTimeFormat(bcp47" src/` returns nothing (no date site uses the UI bcp47).
- The only remaining `bcp47` occurrences in src/ are in src/lib/seo.ts, src/lib/server-api.ts
  (comments), src/app/api/storefront/[...path]/route.ts and its test, and the catalog product
  page comment — i.e. the intentionally-untouched ?lang / SEO paths (D1).
- Manual spot-check intent (non-blocking): with tenant currency=TRY + country=TR, `/tr` and
  `/en` both render money as `₺1.234,50` and order dates as `01.07.2026`; toggling UI language
  changes text only.
</verification>

<success_criteria>
- Money on product cards, product detail (+ recently-viewed), header search, basket, checkout,
  checkout success, and order pages formats via the country-derived format locale with
  narrowSymbol (TRY -> ₺1.234,50 on both /tr and /en).
- Order list + order detail dates render fully numeric via the format locale (01.07.2026), with
  no month-name leakage.
- UI language toggle still switches translated text and the ?lang product-translation, but not
  number/date formatting.
- `npm test` green and `npx tsc --noEmit` clean.
</success_criteria>

<output>
Create `.planning/quick/260701-xae-storefront-format-money-and-dates-by-con/260701-xae-SUMMARY.md` when done.

SUMMARY note to bake in: with tenant currency=TRY + country=TR, both `/tr` and `/en` render
money as `₺1.234,50` and dates numeric as `01.07.2026`; UI language still switches text and the
`?lang` product-translation. seo.ts + route.ts `?lang` bcp47 intentionally left untouched.
</output>
