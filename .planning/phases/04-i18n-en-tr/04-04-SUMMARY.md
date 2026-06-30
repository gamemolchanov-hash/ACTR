---
phase: 04-i18n-en-tr
plan: "04"
subsystem: i18n-static-pages
tags: [i18n, studios, delivery, contacts, faq, partners, errors, useTranslations, getTranslations, I18N-01]
dependency_graph:
  requires:
    - messages/en.json + messages/tr.json (Wave 1-3 — 201 keys base)
    - src/i18n/navigation.ts (Wave 1 — Link/useRouter)
    - src/app/[locale]/layout.tsx (Wave 1 — NextIntlClientProvider)
  provides:
    - src/app/[locale]/studios/page.tsx (studios.* keys)
    - src/app/[locale]/delivery/page.tsx (delivery.* keys)
    - src/app/[locale]/contacts/page.tsx (contacts.* keys)
    - src/app/[locale]/faq/page.tsx (faq.* keys)
    - src/app/[locale]/partners/page.tsx (partners.* keys)
    - src/app/[locale]/partners/shops/page.tsx (partners.shops.* keys)
    - src/app/[locale]/partners/bloggers/page.tsx (partners.bloggers.* keys)
    - src/app/[locale]/partners/schools/page.tsx (partners.schools.* keys)
    - src/app/[locale]/not-found.tsx (errors.* keys, server-side getTranslations)
    - src/app/[locale]/error.tsx (errors.* keys)
    - src/app/[locale]/global-error.tsx (EN fallback, no provider dependency)
    - messages/en.json + messages/tr.json (334 keys total, +133 from wave 4)
  affects:
    - /[locale]/studios
    - /[locale]/delivery
    - /[locale]/contacts
    - /[locale]/faq
    - /[locale]/partners (4 pages)
    - /[locale]/not-found (404)
    - /[locale]/error
    - /[locale]/global-error
tech_stack:
  added: []
  patterns:
    - useTranslations('namespace') for all client components (studios, delivery, contacts, faq, partners, error)
    - getTranslations('namespace') for not-found (Server Component — preserves no-hydration benefit)
    - sub-namespace useTranslations('partners.shops') / ('partners.bloggers') / ('partners.schools') for partner form sub-pages
    - partner shared keys (responseTime/requiredFields/sending/submit/messages) in partners.* namespace
    - EN fallback strings in global-error.tsx (outside NextIntl provider — plan-specified approach)
    - lang="en" in global-error <html> (was lang="ru")
    - Data arrays (DISCOUNTS, CERTS, CDEK_OPTIONS, FAQ_ITEMS, PARTNER_TYPES, QUICK_LINKS) moved inside component body to access t() hook
    - Multi-line JSX with <br/> rendered via separate translation keys (legalLine1-5, cityNote2Line1-3)
key_files:
  created: []
  modified:
    - src/app/[locale]/studios/page.tsx
    - src/app/[locale]/delivery/page.tsx
    - src/app/[locale]/contacts/page.tsx
    - src/app/[locale]/faq/page.tsx
    - src/app/[locale]/partners/page.tsx
    - src/app/[locale]/partners/shops/page.tsx
    - src/app/[locale]/partners/bloggers/page.tsx
    - src/app/[locale]/partners/schools/page.tsx
    - src/app/[locale]/not-found.tsx
    - src/app/[locale]/error.tsx
    - src/app/[locale]/global-error.tsx
    - messages/en.json
    - messages/tr.json
decisions:
  - "not-found.tsx kept as async Server Component using getTranslations() instead of switching to 'use client' + useTranslations() — preserves the no-hydration benefit documented in the file (FBG-126); satisfies plan intent"
  - "global-error.tsx uses EN fallback strings directly (no useTranslations) per plan — unreliable when provider not mounted; lang changed from 'ru' to 'en'"
  - "partner sub-pages use two useTranslations hooks: useTranslations('partners') for shared form keys (responseTime/requiredFields/sending/submit/successMsg/errorMsg/fieldComment) + useTranslations('partners.shops|bloggers|schools') for page-specific field labels — reduces key duplication"
  - "Multi-line text blocks with <br/> split into N separate translation keys (e.g. contacts.legalLine1-5, delivery.cityNote2Line1-3) rather than dangerouslySetInnerHTML — maintains type safety and XSS safety"
  - "DISCOUNTS/CERTS/CDEK_OPTIONS/FAQ_ITEMS/PARTNER_TYPES arrays moved inside component body so t() hook is available — same pattern as account.menuItems in Wave 3"
  - "messages/en.json + tr.json: +133 new keys each (334 total); studios(31) + delivery(18) + contacts(13) + faq(10) + partners-shared(17) + partners.shops(12) + partners.bloggers(9) + partners.schools(9) + errors(6)"
metrics:
  duration: "~9 minutes"
  completed: "2026-06-30"
  tasks: 3
  files: 13
---

# Phase 04 Plan 04: Static / Info / Partner / Error Pages i18n Summary

**One-liner:** All static/info pages (studios, delivery, contacts, faq), partner pages (partners + shops/bloggers/schools), and error pages (not-found, error, global-error) fully extracted from Cyrillic into scoped translation namespaces; 133 new keys added to each catalog (334 total, EN/TR parity); I18N-01 static-page scope closed.

## What Was Built

### Task 1: Info pages localization — studios / delivery / contacts / faq (bb7d268)

All four information pages migrated to `useTranslations`:

- **studios/page.tsx** — `useTranslations('studios')` (31 keys). DISCOUNTS array (3 tiers with prefix/condition/note) and CERTS array moved inside component. The -30% special tier's text also extracted. VIP text, form title/subtitle, fieldSocials/fieldComment, button states, snackbar messages all via `t()`. Discount amounts translated with cultural adaptation (TRY context: "from 15,000" / "15.000 ve üzeri").
- **delivery/page.tsx** — `useTranslations('delivery')` (18 keys). CDEK_OPTIONS array moved inside component. cityNote2 multi-line block split into 3 separate keys (`cityNote2Line1-3`) for `<br/>` rendering. paymentImgAlt now localized.
- **contacts/page.tsx** — `useTranslations('contacts')` (13 keys). The 5-line legal address block split into `legalLine1-5` keys for `<br/>` rendering. heroImgAlt localized. Form title/subtitle/fieldMessage/sending/submit/messages extracted.
- **faq/page.tsx** — `useTranslations('faq')` (10 keys). FAQ_ITEMS array moved inside component with q0-q3/a0-a3 keys. Breadcrumb/title extracted.

72 new keys per catalog added in this task.

### Task 2: Partner pages localization — partners + shops/bloggers/schools (8838a4e)

All four partner pages migrated:

- **partners/page.tsx** — `useTranslations('partners')` for all keys. PARTNER_TYPES and QUICK_LINKS arrays moved inside component using translated titles/descriptions. cards use `partners.shops.cardTitle`, `partners.bloggers.cardTitle`, `partners.schools.cardTitle` keys (sub-namespace dot access within partners).
- **partners/shops/page.tsx** — Two hooks: `useTranslations('partners')` for shared form keys + `useTranslations('partners.shops')` for page-specific field labels (fieldPhone, fieldCity, fieldCities, fieldBrands, fieldStoreType, storeTypePlaceholder, fieldLinks, heroAlt, pageTitle, breadcrumbSep).
- **partners/bloggers/page.tsx** — Same dual-hook pattern with `useTranslations('partners.bloggers')` for fieldName, fieldPhone, fieldSocials, fieldCoopType, heroAlt, pageTitle, breadcrumbSep.
- **partners/schools/page.tsx** — Same dual-hook pattern with `useTranslations('partners.schools')` for fieldName, fieldPhone, fieldCity, fieldLinks, heroAlt, pageTitle, breadcrumbSep.

Shared keys (responseTime, requiredFields, sending, submit, successMsg, errorMsg, fieldComment) sit in `partners.*` namespace and are reused by all 3 sub-pages — avoids duplication while keeping form sub-pages self-contained.

47 new keys per catalog added in this task.

### Task 3: Error pages localization — not-found / error / global-error (118e1aa)

- **not-found.tsx** — Converted to `async` function using `getTranslations('errors')` from `next-intl/server`. Kept as Server Component (no `'use client'`) to preserve the no-hydration design noted in the original comment (FBG-126). Uses `errors.notFoundTitle`, `errors.notFoundDesc`, `errors.backHome` keys.
- **error.tsx** — Added `useTranslations('errors')` (already `'use client'`). Uses `errors.errorTitle`, `errors.errorDesc`, `errors.retry`. Sentry capture and chunk-recovery logic completely preserved. Comments translated to EN.
- **global-error.tsx** — Per plan: EN fallback strings used directly (no `useTranslations`) because this boundary may render outside the NextIntlClientProvider on root-level errors. Changed `<html lang="ru">` → `<html lang="en">`. All Cyrillic UI text replaced with EN equivalents. Comments translated to EN. T-04-10 mitigation: no stack trace details exposed in the user-visible message.

6 new keys per catalog added in this task (errors.* — used by not-found + error only; global-error uses EN literal strings).

## Deviations from Plan

**1. [Architecture — not-found.tsx] Used getTranslations() (server) instead of useTranslations() (client)**
- **Found during:** Task 3 implementation
- **Issue:** Plan note says "использовать useTranslations('errors')" for both not-found and error. However, not-found.tsx was intentionally a Server Component (no 'use client') to avoid hydration on garbage bot traffic (documented in FBG-126 comment). Adding 'use client' would break this design.
- **Fix:** Used `getTranslations('errors')` from `next-intl/server` instead — equivalent runtime behavior, same keys, correct i18n; preserves server rendering benefit.
- **Files modified:** `src/app/[locale]/not-found.tsx`
- **Impact:** None — functionally equivalent, architecturally better.

## Known Stubs

None. All pages fully wired to translation keys. The contacts/legal address block and delivery/CDEK options contain Russia-specific content (Moscow address, Russian bank details, CDEK carrier) which is preserved as translated strings — this is business-content scope outside I18N-01 (which only requires no Cyrillic in code), and is expected for the current project phase.

## Threat Flags

- **T-04-10 (Information disclosure):** `global-error.tsx` and `error.tsx` updated messages contain no stack traces, error digests, or technical detail. Only general user-facing messages are shown. Threat mitigated as planned.

## Verification Results

- `npx tsc --noEmit` — clean (0 errors, run after each task)
- Cyrillic grep gate — 0 non-comment Cyrillic across all 11 pages (studios, delivery, contacts, faq, partners×4, not-found, error, global-error)
- `npm run build` — green; all /en/* and /tr/* static/partner/error routes generated
- messages/en.json + tr.json — 334 keys each, key sets identical (parity True)

## Self-Check: PASSED

- src/app/[locale]/studios/page.tsx — exists, contains useTranslations('studios'), 0 Cyrillic
- src/app/[locale]/delivery/page.tsx — exists, contains useTranslations('delivery'), 0 Cyrillic
- src/app/[locale]/contacts/page.tsx — exists, contains useTranslations('contacts'), 0 Cyrillic
- src/app/[locale]/faq/page.tsx — exists, contains useTranslations('faq'), 0 Cyrillic
- src/app/[locale]/partners/page.tsx — exists, contains useTranslations('partners'), 0 Cyrillic
- src/app/[locale]/partners/shops/page.tsx — exists, dual useTranslations, 0 Cyrillic
- src/app/[locale]/partners/bloggers/page.tsx — exists, dual useTranslations, 0 Cyrillic
- src/app/[locale]/partners/schools/page.tsx — exists, dual useTranslations, 0 Cyrillic
- src/app/[locale]/not-found.tsx — exists, getTranslations('errors'), 0 Cyrillic
- src/app/[locale]/error.tsx — exists, useTranslations('errors'), 0 Cyrillic
- src/app/[locale]/global-error.tsx — exists, EN fallback strings, lang="en", 0 Cyrillic
- messages/en.json — 334 keys, all new namespaces present
- messages/tr.json — 334 keys, parity True
- Commits bb7d268, 8838a4e, 118e1aa — verified in git log
