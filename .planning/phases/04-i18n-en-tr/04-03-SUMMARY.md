---
phase: 04-i18n-en-tr
plan: "03"
subsystem: i18n-auth-account
tags: [i18n, auth, account, useTranslations, useLocale, fmtMoney, Intl.DateTimeFormat, I18N-01]
dependency_graph:
  requires:
    - src/i18n/navigation.ts (Wave 1 — Link/useRouter)
    - src/lib/money.ts#fmtMoney (Wave 1 — locale-aware 3-arg)
    - messages/en.json + messages/tr.json (Wave 1-2 — appended, 77 keys preserved)
  provides:
    - src/app/[locale]/login/page.tsx (auth.* keys)
    - src/app/[locale]/login/register/page.tsx (auth.* keys, captcha/terms preserved)
    - src/app/[locale]/login/forgot-password/page.tsx (auth.* keys)
    - src/app/[locale]/login/reset-password/page.tsx (auth.* keys)
    - src/app/[locale]/account/page.tsx (account.* keys)
    - src/app/[locale]/account/orders/page.tsx (account.* keys, Intl.DateTimeFormat(bcp47), fmtMoney 3-arg)
    - src/app/[locale]/account/orders/[id]/page.tsx (account.* keys, locale-aware date/money)
    - src/app/[locale]/account/addresses/page.tsx (account.* keys)
    - src/app/[locale]/account/settings/page.tsx (account.* keys)
    - messages/en.json + messages/tr.json (+auth.* 50 keys / +account.* 74 keys)
  affects:
    - /[locale]/login/* (4 auth pages)
    - /[locale]/account/* (5 account pages)
tech_stack:
  added: []
  patterns:
    - useTranslations('auth') / useTranslations('account') in client pages
    - bcp47 = locale === 'tr' ? 'tr-TR' : 'en-US' for money/date
    - Intl.DateTimeFormat(bcp47, {...}) replacing toLocaleDateString('en-GB')
    - fmtMoney(amount, currency, bcp47) — third locale arg now passed in account order views
    - menuItems / benefits arrays moved inside component body to access t() hook
    - ICU named-arg interpolation: t('account.greeting', {name}), t('account.orderDetail', {number})
key_files:
  created: []
  modified:
    - src/app/[locale]/login/page.tsx
    - src/app/[locale]/login/register/page.tsx
    - src/app/[locale]/login/forgot-password/page.tsx
    - src/app/[locale]/login/reset-password/page.tsx
    - src/app/[locale]/account/page.tsx
    - src/app/[locale]/account/orders/page.tsx
    - src/app/[locale]/account/orders/[id]/page.tsx
    - src/app/[locale]/account/addresses/page.tsx
    - src/app/[locale]/account/settings/page.tsx
    - messages/en.json
    - messages/tr.json
decisions:
  - "auth.* and account.* namespaces added to shared messages/*.json (124 new keys each catalog, 201 total, parity maintained)"
  - "Order list date switched from toLocaleDateString('en-GB') to Intl.DateTimeFormat(bcp47, {day/month/year numeric}) — locale-aware (TR uses dd.MM.yyyy)"
  - "Order detail date uses Intl.DateTimeFormat(bcp47, {month:'long'}) — TR month names (Ocak…) when locale=tr"
  - "fmtMoney calls in account/orders + orders/[id] now pass bcp47 third arg; order list/detail were already TRY-correct but not locale-formatted"
  - "TR translations authored inline (Tolgee MCP not available in agent, same as 04-01/04-02) — Tolgee sync deferred to 04-05"
  - "GDPR Danger Zone (Data & Privacy / Download My Data / Delete Account) + register terms checkbox left in English — they were already EN (Phase 3), no Cyrillic to extract; full TR pass for these is a 04-04/static-content concern"
  - "checkout/basket confirmed clean by grep gate (0 non-comment Cyrillic) — no extraction needed, matches plan expectation"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-30"
  tasks: 3
  files: 11
---

# Phase 04 Plan 03: Auth/Account i18n Summary

**One-liner:** login×4 + account×5 pages fully extracted from Cyrillic into auth.*/account.* namespaces via useTranslations; order history dates/prices made locale-aware (Intl.DateTimeFormat(bcp47) + fmtMoney 3-arg); checkout/basket confirmed already clean.

## What Was Built

### Task 1: Auth pages localization (bd1a889)

All four auth pages switched to `useTranslations('auth')` (+ `useTranslations('common')` for the Home breadcrumb):

- **login/page.tsx** — breadcrumb, page title/subtitle, both column headings (existing/new user), email-phone + password labels and placeholder, remember-me, forgot-password link, sign-in button states, required-fields note, three registration benefits (moved into a `benefits` array inside the component to use `t()`), register button. Auth logic (phone formatting WR-06 guard, needsReset redirect) untouched.
- **login/register/page.tsx** — breadcrumbs, title, all FieldBlock labels/hints, captcha label + refresh tooltip, anti-bot validation snack messages (tooFast/wrongCaptcha/passwordTooShort/passwordMismatch), required-fields note, already-have-account link. Honeypot, math captcha logic, MIN_SUBMIT_MS time-gate, terms gate (D-07), and TERMS_VERSION registration flow all preserved. Terms checkbox text intentionally left EN (was already EN in Phase 3).
- **login/forgot-password/page.tsx** — breadcrumbs, title, sent/error snack messages, the sent-confirmation block (split into forgotCheckEmailPre/Post around the bold email), spam hint, back-to-login, instruction text, send-link button states.
- **login/reset-password/page.tsx** — invalid-link state (title/instruction/request-reset button), breadcrumbs, new-password + confirm labels, placeholder, password validation snack messages, success/expired messages, set-password button states. Token guard and resetPassword flow preserved.

messages/en.json + tr.json: appended `auth.*` (50 keys) and `account.*` (74 keys) namespaces — 124 new keys per catalog, parity maintained (201 keys each).

### Task 2: Account dashboard + order history (355ded3)

- **account/page.tsx** — `menuItems` array moved inside the component body so labels/descriptions use `t('account.*')`; breadcrumb, title, greeting (`t('greeting', {name})` ICU interpolation), sign-out button.
- **account/orders/page.tsx** — `useTranslations('account')` + `useLocale()`; `bcp47 = locale==='tr'?'tr-TR':'en-US'`. Breadcrumbs, title, empty-state + go-to-catalog, all 6 table headers, pagination prev/next via `t()`. **Date** switched from `toLocaleDateString('en-GB')` to `Intl.DateTimeFormat(bcp47, {day/month/year:'2-digit'/'numeric'})`. **Money** `fmtMoney(total, currency)` → `fmtMoney(total, currency, bcp47)`.
- **account/orders/[id]/page.tsx** — same hooks/bcp47; breadcrumbs, order title (`t('orderDetail', {number})`), not-found state, item table headers (Product/Qty/Price/Total), summary block (Summary/Items/VAT(KDV)/To Pay). **Date** uses `Intl.DateTimeFormat(bcp47, {month:'long'})` (TR month names). All `fmtMoney` calls pass `bcp47`. The `№` column header is a symbol (no Cyrillic).

### Task 3: Addresses + settings; checkout/basket confirmation (4ba70a7)

- **account/addresses/page.tsx** — `useTranslations('account')`; only the Cyrillic bits needed extraction: breadcrumb (Home/My Account/Delivery Addresses), page title, Add button. The form dialog, card content, empty state, and snack messages were already authored in English in Phase 3.
- **account/settings/page.tsx** — `useTranslations('account')`; all Cyrillic extracted: breadcrumbs, SETTINGS/PERSONAL DATA/CHANGE PASSWORD section titles, all TextField labels + helper texts (email-cannot-change, current-password-hint, new-password-hint), save/change button states, and every snack message (profileSaved/profileSaveError, passwordChanged, passwordTooShort, passwordMismatch, wrongPassword, passwordChangeError). FBG-22/T-03-10 sign-out-after-password-change, GDPR export (Art.20) and delete (Art.17, password re-auth T-03-12) flows untouched. The GDPR "Data & Privacy" danger zone text + delete dialog were already EN.
- **checkout/basket** — grep gate confirms 0 non-comment Cyrillic across `basket/page.tsx` and `checkout/**`; no extraction required (matches plan's stated expectation that Phase 2 built these on EN).

## Deviations from Plan

None — plan executed exactly as written. Rules 1-4 not triggered; tsc and build stayed green on first run for each task. The plan's note that order-list/detail money was "TRY-correct but not locale-formatted" was addressed by threading `bcp47` into `fmtMoney` and replacing the hardcoded `en-GB` date with `Intl.DateTimeFormat(bcp47)`.

## Known Stubs

- **Order status labels** (`order.status.name`) render the value supplied by the BFF/ARM, not a fixed client-side enum. The plan suggested `account.orderStatus.<status>` keys, but the ARM status set is dynamic (color + name come from the API), so a fixed key map would risk missing/mismatched statuses. Status text localization therefore depends on BFF/ARM returning locale-aware status names (Phase 7 data work, same track as tr-TR product content). The chip and `—` fallback contain no Cyrillic.
- **GDPR Danger Zone + register terms text** remain in English (were already EN, not Russian). Not a Cyrillic-gate violation; a full EN→TR translation of these legal/GDPR strings is a static-content concern for 04-04, not part of the I18N-01 Cyrillic-removal scope.

## Threat Flags

No new security surface. Per the plan threat model:
- T-04-07 (Tampering): only text/`t()` keys changed; validation logic, Authorization headers, terms gate, captcha, honeypot, password re-auth all preserved.
- T-04-08 (Info disclosure): error messages translated 1:1 without adding stack traces or email-enumeration detail.

## Verification Results

- `npx tsc --noEmit` — clean (run after each task)
- Cyrillic grep gate (auth ×4) — 0 non-comment Cyrillic
- Cyrillic grep gate (account ×5) — 0 non-comment Cyrillic
- Cyrillic grep gate (basket + checkout) — 0 non-comment Cyrillic (confirmation)
- `npm run build` — green; all /en/* and /tr/* auth + account routes generated
- messages/en.json + tr.json — 201 keys each, key sets identical (parity True)

## Open Items for Subsequent Plans

- **Tolgee sync** for new auth.*/account.* keys (124) — deferred to 04-05 (Tolgee finalize), consistent with 04-01/04-02 keys.
- **Order status name localization** — needs ARM/BFF to return locale-aware status names (Phase 7 data), or a future client-side status map if the status set is frozen.
- **GDPR/terms legal-text TR translation** — static-content pass in 04-04 if required by KVKK/mesafeli-satış compliance.

## Self-Check: PASSED

- src/app/[locale]/login/page.tsx — exists, contains useTranslations, 0 Cyrillic
- src/app/[locale]/login/register/page.tsx — exists, contains useTranslations, 0 Cyrillic
- src/app/[locale]/login/forgot-password/page.tsx — exists, contains useTranslations, 0 Cyrillic
- src/app/[locale]/login/reset-password/page.tsx — exists, contains useTranslations, 0 Cyrillic
- src/app/[locale]/account/page.tsx — exists, contains useTranslations, 0 Cyrillic
- src/app/[locale]/account/orders/page.tsx — exists, contains Intl.DateTimeFormat + fmtMoney(...,bcp47), 0 Cyrillic
- src/app/[locale]/account/orders/[id]/page.tsx — exists, contains Intl.DateTimeFormat + fmtMoney(...,bcp47), 0 Cyrillic
- src/app/[locale]/account/addresses/page.tsx — exists, contains useTranslations, 0 Cyrillic
- src/app/[locale]/account/settings/page.tsx — exists, contains useTranslations, 0 Cyrillic
- messages/en.json + messages/tr.json — 201 keys each, parity True
- Commits bd1a889, 355ded3, 4ba70a7 — verified in git log
