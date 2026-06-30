---
phase: 03-account
reviewed: 2026-06-30T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - src/lib/auth.ts
  - src/lib/auth-context.tsx
  - src/lib/api.ts
  - src/app/login/page.tsx
  - src/app/login/register/page.tsx
  - src/app/reset-password/page.tsx
  - src/app/account/page.tsx
  - src/app/account/orders/page.tsx
  - src/app/account/orders/[id]/page.tsx
  - src/app/account/addresses/page.tsx
  - src/app/account/settings/page.tsx
  - src/app/checkout/page.tsx
  - src/components/Header.tsx
  - src/components/ProductReviews.tsx
  - src/components/__tests__/ProductReviews.test.tsx
findings:
  critical: 1
  warning: 6
  info: 5
  total: 12
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-06-30
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 3 ports the american-creator.ru auth/account UI onto the ARM Portal API for the
**Turkish** market (TRY, EN+TR). The token-handling and FBG-50 auth-failure plumbing is
mostly sound: `isAuthFailure` correctly returns `true` only for 401/403, the proxy route
forwards `Authorization`/`X-Currency` server-side and keeps `X-Storefront-Key` out of the
client bundle, `createOrder` attaches `bearerHeader()` for the guest-vs-authenticated
linking path (D-06), and the GDPR/KVKK delete flow gates on a password while export uses the
bearer-token GET.

The dominant problem is that this is a **near-verbatim Russian-market port that was not
localized for Turkey**. The most damaging instance is the hardcoded Russian phone formatter,
which actively corrupts phone numbers entered by Turkish users — breaking both registration
data and phone-based login (BLOCKER). Several display surfaces still render ruble symbols,
`ru-RU` formatting, and Russian-only plural/date rules on a TRY store. There is also a
session-resilience gap (authenticated users are bounced to `/login` on a transient network
error despite the token being preserved) and an unsanitized tracking-URL `href`.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Russian phone formatter corrupts Turkish phone numbers (registration data + phone login)

**File:** `src/app/login/register/page.tsx:41-53`, `src/app/login/page.tsx:38-55`
**Issue:** `formatPhone()` is hardcoded to the Russian dialing plan: it strips a leading `7`
or `8`, force-prefixes `+7`, and truncates the subscriber part to **10 digits**
(`d.slice(0,3)`…`d.slice(8,10)`). The market is Turkey (+90). A Turkish user typing
`0532 123 45 67` → digits `05321234567` → (does not start with 7/8) → rendered as
`+7 (053) 212-34-56`, dropping the final digits and applying the wrong country code.

Consequences:
- **Registration:** the mangled string is sent as `phone` in the `register()` payload
  (`register/page.tsx:165`) and stored against the account — every TR customer's phone is
  persisted incorrectly.
- **Login:** `login/page.tsx` runs the same formatter on the login identifier via
  `handleLoginChange` → `formatPhone`, so a customer attempting to sign in **by phone** can
  never produce the value the backend stored. Phone-based authentication is broken for the
  entire target market.

**Fix:** Replace the RU-specific formatter with a TR-aware one (or a permissive
international format) and stop truncating to 10 digits. Minimal correct version:
```ts
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  // TR mobile: 10 local digits after the country/trunk code
  const local = digits.startsWith('90') ? digits.slice(2)
              : digits.startsWith('0')  ? digits.slice(1)
              : digits;
  const d = local.slice(0, 10);
  let r = '+90';
  if (d.length) r += ` (${d.slice(0, 3)}`;
  if (d.length >= 3) r += `) ${d.slice(3, 6)}`;
  if (d.length >= 6) r += ` ${d.slice(6, 8)}`;
  if (d.length >= 8) r += ` ${d.slice(8, 10)}`;
  return r;
}
```
Also update the `+7 (___) ___-__-__` placeholders (`login/page.tsx:218`, `register/page.tsx:277`).

## Warnings

### WR-01: Header renders ruble prices and a Russian phone on a TRY store

**File:** `src/components/Header.tsx:262`, `src/components/Header.tsx:567`, `src/components/Header.tsx:127`
**Issue:** Search-suggestion prices are formatted as `{p.price.toLocaleString('ru-RU')} ₽` —
i.e. grouped with Russian separators and suffixed with the **ruble** symbol — even though the
store sells in TRY. The contact strip also hardcodes a Russian number `+7 995 757-84-67`.
Customers see incorrect currency in the live search dropdown.
**Fix:** Route prices through the shared `fmtMoney(price, currency)` helper (which honours
`NEXT_PUBLIC_STOREFRONT_CURRENCY`/`X-Currency`) instead of the inline `ru-RU`/`₽` literal, and
replace the hardcoded phone with a configured TR contact value.

### WR-02: ProductReviews uses ru-RU date format and Russian-only pluralization

**File:** `src/components/ProductReviews.tsx:36`, `src/components/ProductReviews.tsx:106`
**Issue:** `fmtDate` formats with `'ru-RU'`, and the count label uses a Russian plural rule
(`'отзыв' : 'отзывов'`). On an EN+TR storefront this produces Cyrillic month names and
incorrect/irrelevant pluralization.
**Fix:** Use the active locale (EN/TR) for `toLocaleDateString` and replace the hardcoded
Russian plural with locale-aware copy (e.g. `Intl.PluralRules` or the i18n dictionary).

### WR-03: Unsanitized `track_url` rendered directly as an anchor `href`

**File:** `src/app/account/orders/page.tsx:217`, `src/app/account/orders/[id]/page.tsx:154`
**Issue:** `order.track_url` (server-provided) is passed straight into `href={order.track_url}`.
React does not strip a `javascript:`-scheme URL from a non-literal `href`, so a malicious or
mis-ingested tracking URL becomes a script-execution / open-redirect vector when the user
clicks the shipment icon. `rel="noopener"` does not mitigate this.
**Fix:** Validate the scheme before rendering:
```ts
const safeTrackUrl = order.track_url && /^https?:\/\//i.test(order.track_url)
  ? order.track_url : null;
```
Render the icon only when `safeTrackUrl` is set.

### WR-04: Authenticated users are bounced to /login on a transient network/5xx error

**File:** `src/lib/auth-context.tsx:89-105` (+ `account/page.tsx:45-49`, `account/orders/page.tsx:39-41`, `account/settings/page.tsx:66-68`)
**Issue:** On mount, if a valid token exists but the initial `getMe()` fails with a network or
5xx error, `isAuthFailure` correctly preserves the token, but `customer` stays `null` and
`loading` flips to `false`. Every account page then runs `if (!loading && !customer)
router.replace('/login')`, so the user is redirected to login despite the comment promising
"user stays logged in" (line 102-103). There is no retry, so a single transient failure logs
the user out of the UI until a manual reload. This partially defeats the FBG-50 intent.
**Fix:** Distinguish "auth-failed" from "load-failed" in context state (e.g. an `authError`
flag) so pages can show a retry/error state instead of redirecting, or retry `getMe()` on
network/5xx before giving up.

### WR-05: Default-currency fallback is inconsistent ('USD' vs 'TRY')

**File:** `src/lib/money.ts:7`, `src/lib/api.ts:195`, `src/lib/api.ts:271`, `src/app/checkout/page.tsx:81` vs `src/app/account/orders/[id]/page.tsx:57`
**Issue:** When `NEXT_PUBLIC_STOREFRONT_CURRENCY` is unset, `money.ts`, `api.ts` (X-Currency
header + shipping), and the checkout page all fall back to `'USD'`, while the order-detail page
falls back to `'TRY'`. On a TR deployment a missing/typo'd env var silently produces USD
pricing and a USD `X-Currency` header sent to ARM, and order totals can render in a different
currency than the rest of the funnel.
**Fix:** Centralize the fallback to a single `TRY` default for this storefront (one constant
used everywhere), and fail loudly in build/startup if the env var is missing.

### WR-06: `isPhone()` misclassifies emails that begin with a digit and mangles them

**File:** `src/app/login/page.tsx:53-55`, `src/app/login/page.tsx:75-81`
**Issue:** `isPhone()` returns `true` for any value starting with `[+\d()\s-]` that contains a
digit and no `@`. While typing a valid email that starts with a digit (e.g.
`1user@example.com`), the first keystrokes contain no `@`, so `handleLoginChange` runs
`formatPhone` and rewrites the input to `+7 (1...`, making it impossible to enter such an
email and log in.
**Fix:** Defer phone-vs-email detection until the value is unambiguous (e.g. only format once
the user has typed several digits and no alphabetic chars), or detect on blur rather than on
every keystroke.

## Info

### IN-01: Dead exports — `setToken` / `clearToken` are never used

**File:** `src/lib/auth.ts:104-110`
**Issue:** `setToken` and `clearToken` are exported but unreferenced; `AuthContext` writes
`localStorage` directly (`auth-context.tsx:59,69`). Unlike `getToken`, neither guards
`typeof window`, so they are also latent SSR hazards if adopted later.
**Fix:** Remove them, or have `AuthContext.setAuth`/`signOut` call them so token storage has a
single source of truth (and add the `typeof window` guard).

### IN-02: `router` is declared after the handler that uses it

**File:** `src/app/login/register/page.tsx:173` (use) vs `:184` (declaration)
**Issue:** `handleSubmit` calls `router.push('/')` while `const router = useRouter()` is
declared further down the component body. It works (the closure resolves the binding at call
time, after render), but the ordering is confusing and brittle.
**Fix:** Move `const router = useRouter();` up with the other hook calls near the top of the
component.

### IN-03: Account/auth UI is Russian-only despite EN+TR requirement

**File:** `src/app/account/page.tsx`, `src/app/account/orders/page.tsx`, `src/app/account/settings/page.tsx`, `src/app/login/page.tsx`, `src/app/login/register/page.tsx`
**Issue:** Hardcoded Cyrillic strings ("ЛИЧНЫЙ КАБИНЕТ", "Мои заказы", "Главная",
"Авторизация", etc.) are mixed with occasional English copy. The spec requires EN+TR. The UI
is currently un-translatable and ships untranslated Russian to Turkish users.
**Fix:** Extract user-facing strings into the i18n layer (EN+TR) before launch.

### IN-04: Side effect (`migrateToken`) inside a `useState` initializer

**File:** `src/lib/auth-context.tsx:46-50`
**Issue:** `migrateToken()` mutates `localStorage` from within the `useState` initializer. It
is idempotent so it is currently safe, but running side effects in render/initializers is an
anti-pattern (React StrictMode double-invokes initializers in dev).
**Fix:** Run `migrateToken()` once inside a mount `useEffect` and then read the token.

### IN-05: Address deletion has no confirmation

**File:** `src/app/account/addresses/page.tsx:134-148`, `src/app/checkout/page.tsx:640-660`
**Issue:** The delete icon (account) and the inline `×` (checkout) call `deleteMyAddress`
immediately with no confirmation; a stray click removes a saved address. The checkout path
also swallows the error silently (`.catch(() => {})`).
**Fix:** Add a confirmation step for deletion and surface failures to the user (the account
page already refetches on failure; mirror that in checkout).

---

_Reviewed: 2026-06-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
