---
phase: quick-260701-xae
plan: 01
subsystem: ui
tags: [i18n, intl, money-formatting, date-formatting, next-intl, storefront]

requires:
  - phase: quick-260701-viz
    provides: getStorefrontCurrency() server helper, CurrencyProvider/useCurrency() client context
provides:
  - "formatLocaleFromCountry() — derives the CANONICAL number/date format locale from a BFF-provided ISO-3166-1 country code, independent of UI language"
  - "getStorefrontConfig() — server helper returning {currency, country, locale} in one BFF fetch"
  - "useFormatLocale() — client hook exposing the country-derived format locale via a second context nested in CurrencyProvider"
  - "narrowSymbol on fmtMoney() so TRY renders as symbol regardless of UI language"
  - "All money/date call sites (product cards, product detail, header search, basket, checkout, checkout success, order list/detail) formatted via useFormatLocale() instead of the per-UI-language bcp47 tag"
affects: [i18n, storefront-checkout, storefront-account]

tech-stack:
  added: []
  patterns:
    - "Country-driven formatting: Intl.NumberFormat/DateTimeFormat locale arg comes from formatLocaleFromCountry(config.country), NOT the UI locale — UI language stays scoped to translated text + ?lang product-translation"
    - "Server-resolve-once + prop-thread: layout.tsx computes formatLocale once server-side and passes initialFormatLocale into CurrencyProvider, avoiding hydration mismatch/flash (mirrors the existing initialCurrency pattern)"

key-files:
  created:
    - src/lib/format-locale.ts
    - src/lib/format-locale.test.ts
  modified:
    - src/lib/storefront-config.ts
    - src/providers/CurrencyProvider.tsx
    - src/app/[locale]/layout.tsx
    - src/lib/money.ts
    - src/components/ProductCard.tsx
    - src/components/ProductDetail.tsx
    - src/components/Header.tsx
    - src/app/[locale]/basket/page.tsx
    - src/app/[locale]/checkout/page.tsx
    - src/app/[locale]/checkout/success/page.tsx
    - src/app/[locale]/account/orders/page.tsx
    - src/app/[locale]/account/orders/[id]/page.tsx

key-decisions:
  - "Worktree base (5acffda) predated the quick-260701-viz commits that created CurrencyProvider.tsx/storefront-config.ts (prerequisites this plan's Task 1 needed to modify). Fast-forward merged to 719c605 (main tip, already in the orchestrator's accepted-base set) to pick up those files rather than recreating them — a non-destructive, history-preserving fast-forward."
  - "formatLocaleFromCountry resolves the country's CANONICAL locale via Intl.Locale('und',{region}).maximize() rather than building <uiLang>-<country>, per D3 (en-TR would produce wrong grouping ₺1,234.50 instead of ₺1.234,50)"
  - "Order-detail date changed from {month:'long'} to fully numeric {day:'2-digit',month:'2-digit',year:'numeric'} (D5) so a country-language month name never leaks onto a different UI language"

requirements-completed: [260701-xae]

coverage:
  - id: D1
    description: "formatLocaleFromCountry() resolves a country code to its canonical BCP-47 locale, with fallback + non-2-letter guard"
    requirement: "260701-xae"
    verification:
      - kind: unit
        ref: "src/lib/format-locale.test.ts — 5 cases (TR->tr*, US->en*, null+fallback, null default, non-2-letter guard)"
        status: pass
    human_judgment: false
  - id: D2
    description: "getStorefrontConfig() returns {currency, country, locale}; getStorefrontCurrency() delegates to it (backwards-compat)"
    requirement: "260701-xae"
    verification:
      - kind: unit
        ref: "src/lib/currency-default.test.ts — currencyHeader()/source-invariant checks unaffected"
        status: pass
    human_judgment: false
  - id: D3
    description: "fmtMoney() adds currencyDisplay:'narrowSymbol'"
    requirement: "260701-xae"
    verification:
      - kind: unit
        ref: "src/lib/money.test.ts — 6 cases, all green with narrowSymbol added, no expected-string changes needed"
        status: pass
    human_judgment: false
  - id: D4
    description: "All money display call sites (ProductCard, ProductDetail + RecentlyViewedCard, Header search x2, basket, checkout, checkout success, order list, order detail) use useFormatLocale() as the fmtMoney locale arg instead of the per-UI bcp47"
    requirement: "260701-xae"
    verification:
      - kind: other
        ref: "grep -rl bcp47 across the 6+2 call-site files returns 0; npx tsc --noEmit clean"
        status: pass
    human_judgment: true
    rationale: "Visual money-rendering correctness (₺1.234,50 on both /tr and /en) requires a human spot-check in the running app; static grep/tsc gates only prove the wiring, not the rendered output."
  - id: D5
    description: "Order list + order detail dates render fully numeric via formatLocale (no month-name leakage)"
    requirement: "260701-xae"
    verification:
      - kind: other
        ref: "grep -c \"month: 'long'\" account/orders/[id]/page.tsx == 0; grep Intl.DateTimeFormat(formatLocale in both order files == 1 each"
        status: pass
    human_judgment: true
    rationale: "Visual date-rendering correctness (01.07.2026 on both /tr and /en) requires a human spot-check in the running app."

duration: 20min
completed: 2026-07-02
status: complete
---

# Quick Task 260701-xae Summary

**Money and date formatting on the ACTR storefront now driven by `config.country` (canonical locale via `Intl.Locale.maximize()`), independent of the UI language — TRY renders as `₺1.234,50` and order dates as `01.07.2026` on both `/tr` and `/en`.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-02
- **Tasks:** 3
- **Files modified:** 12 modified + 2 created = 14

## Accomplishments
- New `formatLocaleFromCountry()` engine + unit tests resolve a BFF-provided ISO-3166-1 country code to its canonical BCP-47 locale (D2/D3), with a validated 2-letter guard and try/catch fallback (T-xae-01).
- `getStorefrontConfig()` server helper extends the existing currency-only fetch to also return `country`/`locale` in a single call; `getStorefrontCurrency()` now delegates to it for backwards-compat.
- `useFormatLocale()` client hook exposes the country-derived format locale via a second context nested inside `CurrencyProvider`, with the server value threaded in as `initialFormatLocale` (no hydration flash, mirrors the existing `initialCurrency` pattern).
- `fmtMoney()` gained `currencyDisplay:'narrowSymbol'` so TRY renders as `₺` regardless of UI language (D4).
- Every money display call site (product cards, product detail + recently-viewed, header search suggestions, basket, checkout, checkout success, order list, order detail) now formats via `useFormatLocale()` instead of the per-UI-language `bcp47` tag; Header's `useLocale()` is preserved for its language switcher only.
- Order-list and order-detail dates render via `formatLocale`; order-detail changed from a long month name to a fully numeric format (`01.07.2026`) so a country-language month name can never leak onto a different UI language (D5).

## Task Commits

Each task was committed atomically:

1. **Task 1: Format-locale engine, config helper, provider hook, narrowSymbol** - `e327fd9` (feat)
2. **Task 2: Rewire money display call sites off the UI bcp47** - `43dd296` (feat)
3. **Task 3: Rewire order date + per-order money call sites (numeric dates)** - `1f81844` (feat)

_Task 1 followed TDD (RED test file committed together with the GREEN implementation in a single small commit, per plan instruction to land format-locale/config/provider/money plumbing together so `tsc --noEmit` stays clean throughout)._

## Files Created/Modified
- `src/lib/format-locale.ts` - `formatLocaleFromCountry()` — country code → canonical BCP-47 locale
- `src/lib/format-locale.test.ts` - 5 unit tests covering TR/US/null/non-2-letter cases
- `src/lib/storefront-config.ts` - `getStorefrontConfig()` returns `{currency, country, locale}`; `getStorefrontCurrency()` delegates
- `src/providers/CurrencyProvider.tsx` - added `FormatLocaleContext` + `useFormatLocale()`
- `src/app/[locale]/layout.tsx` - resolves config once, computes `formatLocale`, passes `initialFormatLocale`
- `src/lib/money.ts` - added `currencyDisplay:'narrowSymbol'`
- `src/components/ProductCard.tsx` - price uses `useFormatLocale()`
- `src/components/ProductDetail.tsx` - product price + `RecentlyViewedCard` price use `useFormatLocale()`
- `src/components/Header.tsx` - desktop + mobile search-suggestion prices use `useFormatLocale()`; language switcher still uses `useLocale()`
- `src/app/[locale]/basket/page.tsx` - all 8 fmtMoney call sites (promo, subtotal, discount, total, per-item unit/line x2) use `useFormatLocale()`
- `src/app/[locale]/checkout/page.tsx` - all 7 fmtMoney call sites (shipping rate, unit price, subtotal, KDV, promo discount, shipping in summary, total) use `useFormatLocale()`
- `src/app/[locale]/checkout/success/page.tsx` - order-total fmtMoney uses `useFormatLocale()`, currency stays `order.currency`
- `src/app/[locale]/account/orders/page.tsx` - order-list date + order-total money use `useFormatLocale()`
- `src/app/[locale]/account/orders/[id]/page.tsx` - order-detail date (now numeric) + all item/summary/total fmtMoney calls use `useFormatLocale()`

## Decisions Made
- **Worktree base was behind a prerequisite parallel task.** This plan's Task 1 needed to modify `src/providers/CurrencyProvider.tsx` and `src/lib/storefront-config.ts`, which did not exist at the worktree's assigned base commit (5acffda) — they were added by the separate `quick-260701-viz` task, merged into `main` afterward. Fast-forward merged the worktree branch to `719c605` (main tip, already one of the orchestrator's accepted base commits, and a strict fast-forward descendant of 5acffda) to pick up those files rather than recreating conflicting duplicates. No commits were rewritten or discarded.
- Format locale is resolved via the country's own canonical locale (`Intl.Locale.maximize()`), not `<uiLang>-<country>`, because the latter would produce incorrect number grouping/decimal separators (D3).
- Order-detail date format changed from `{month:'long'}` to fully numeric per D5 — this is an explicit plan requirement, not a deviation.

## Deviations from Plan

None beyond the worktree fast-forward noted above (which was necessary to access files this plan's own Task 1 was scoped to modify, and is documented as a decision, not a code deviation). All three tasks executed exactly as specified in `260701-xae-PLAN.md`.

## Issues Encountered
- `cd /home/lexun/work/puz/ACTR` in the plan's verify commands resolves to the main working tree, not this worktree (`.claude/worktrees/agent-a8b465a0e1c2d6e73`) — all verification commands were run from the worktree root directly (no `cd`) instead of using the plan's literal `cd` prefix, to avoid operating on the wrong checkout.

## Known Stubs
None.

## Threat Flags
None — `format-locale.ts` implements exactly the mitigation specified in the plan's `<threat_model>` (T-xae-01: two-letter guard + try/catch fallback before constructing `Intl.Locale`). No new network endpoints, auth paths, or trust-boundary changes introduced.

## Next Phase Readiness
- All automated gates pass: `npx tsc --noEmit` clean; `npx vitest run` shows only the 3 pre-existing, unrelated `armToProduct`/`server-api.test.ts` fixture-mismatch failures (unchanged by this task, out of scope per the task constraints).
- `grep -rn "Intl.DateTimeFormat(bcp47" src/` returns nothing; remaining `bcp47` references are confined to the intentionally-untouched `seo.ts`, `server-api.ts` (comments), the `?lang` route handler + its test, and one catalog-page comment — exactly matching the plan's out-of-scope list (D1).
- Manual spot-check still recommended (non-blocking, coverage D4/D5 above): with tenant currency=TRY + country=TR, confirm `/tr` and `/en` both render `₺1.234,50` and order dates as `01.07.2026`, and that toggling UI language changes only text.

---
*Quick task: 260701-xae*
*Completed: 2026-07-02*

## Self-Check: PASSED

All 14 key-files verified present on disk; all 3 task commit hashes (`e327fd9`, `43dd296`, `1f81844`) verified present in git log.
