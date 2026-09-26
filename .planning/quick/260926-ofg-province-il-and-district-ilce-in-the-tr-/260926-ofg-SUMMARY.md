---
phase: quick-260926-ofg
plan: 01
subsystem: checkout
tags: [nextjs, mui, react, forms, i18n, address, fulfillment]

requires: []
provides:
  - "src/lib/tr-provinces.ts — single source of Turkey's 81 provinces + normalize/format helpers"
  - "Checkout step 1 collects province (il) as shipping.state, district (ilçe) as city"
  - "Account address book collects province (il) as CustomerAddress.state"
affects: [checkout, account-addresses, fulfillmenttr-integration]

actuals:
  tokens: 7809
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "TR_PROVINCES literal tuple + Turkish-locale case/diacritic folding (foldKey) for legacy free-text normalization"
    - "provinceFromSaved(state) gate: a saved-address value only reaches the UI/API when it passes isTrProvince after normalization; otherwise dropped and re-picked"

key-files:
  created:
    - src/lib/tr-provinces.ts
    - src/lib/tr-provinces.test.ts
    - "src/app/[locale]/account/addresses/addresses-page.test.tsx"
  modified:
    - src/lib/api.ts
    - src/lib/api-order-headers.test.ts
    - "src/app/[locale]/checkout/page.tsx"
    - "src/app/[locale]/checkout/checkout-guest-account.test.tsx"
    - "src/app/[locale]/account/addresses/page.tsx"

key-decisions:
  - "MUI Select's role=combobox lives on an inner div that does not inherit an aria-label set on the outer <Select> prop; used inputProps={{ 'aria-label': ... }} instead so the checkout province select has both a real accessible name and a stable test hook"
  - "Fixed a pre-existing test-mock bug (window.location missing href) that crashed all 35 tests in checkout-guest-account.test.tsx at baseline — Rule 3, blocking the plan's own extensions from being verifiable"

requirements-completed: [QUICK-260926-ofg]

duration: ~40min
completed: 2026-09-26
status: complete
---

# Phase quick-260926-ofg Plan 01: Province (İl) and District (İlçe) in the TR checkout Summary

**TR checkout and account address book now collect Turkey's province (il) via a canonical 81-entry select and send it to ARM as `shipping.state` / address-book `state`, alongside the existing district (ilçe) free-text field — the data FulfillmentTR's order API needs as `province` / `city`.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-09-26
- **Tasks:** 3/3 completed
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments

- New `src/lib/tr-provinces.ts`: `TR_PROVINCES` (81 official province names, Turkish-collated literal tuple), `normalizeProvince` (Turkish-locale case/diacritic folding so `istanbul`/`ISTANBUL`/`sanliurfa` resolve to `İstanbul`/`Şanlıurfa`, non-canonical values kept as trimmed raw text), `isTrProvince` (exact canonical membership), `formatDistrictProvince` (`"<district> / <province>"`). 19 unit tests.
- Checkout step 1: required "Province (İl)" select rendered above the (relabeled) "District (İlçe)" field for TR addresses; Continue is gated on a canonical province; an old/tampered sessionStorage draft is sanitized on hydrate (non-canonical → empty, never reaches shipping.state).
- `createOrder`'s shipping payload now carries `state` (province); the Ön Bilgilendirme Formu / Mesafeli Satış markdown and the step-2 summary render `"<district> / <province>"` via `formatDistrictProvince`.
- Saved-address autofill, saved-card pick, "+ New address" and card-delete all read/reset the province through one gate (`provinceFromSaved`) that normalizes and drops anything non-canonical.
- Account address book (`/account/addresses`): add dialog gains a required Province (İl) select saved as `CustomerAddress.state`; the district field is relabeled; address cards show `"<district> / <province> <postal_code>"`.

## Task Commits

1. **Task 1 (tracer): tr-provinces module + checkout province select → validation → shipping.state** — `81559d0` (feat)
2. **Task 2: checkout — saved-address autofill/pick/reset, legal documents and summary** — `f5a0798` (feat)
3. **Task 3: account address book — province select saved as state, list shows «district / province»; full gates** — `e554f29` (feat)

_Each task's tests were written before the implementation (RED → GREEN) as instructed, then committed as a single commit per the plan's explicit commit step — no separate test/feat commits were requested by the plan for this quick task._

## Files Created/Modified

- `src/lib/tr-provinces.ts` - TR_PROVINCES + normalizeProvince/isTrProvince/formatDistrictProvince (single source of truth)
- `src/lib/tr-provinces.test.ts` - 19 unit tests for the list and the three helpers
- `src/lib/api.ts` - `CreateOrderPayload.shipping.state?: string` (province/il, forwarded verbatim by `createOrder`)
- `src/lib/api-order-headers.test.ts` - new describe asserting `shipping.state`/`shipping.city` reach the POST body
- `src/app/[locale]/checkout/page.tsx` - province field/select/validation/payload/autofill/legal-doc/summary wiring
- `src/app/[locale]/checkout/checkout-guest-account.test.tsx` - extended DRAFT, new `province (il)` and `saved address → province` describes, legal-markdown assertion, `window.location.href` mock fix
- `src/app/[locale]/account/addresses/page.tsx` - province select in the add dialog, relabeled district field, `state` in payload, card line
- `src/app/[locale]/account/addresses/addresses-page.test.tsx` - new file: list rendering + add-dialog province tests

## Decisions Made

- Used `inputProps={{ 'aria-label': 'Province (İl)' }}` (not a bare `aria-label` prop) on the checkout's plain `<Select>` — MUI puts the accessible `role="combobox"` on an inner div that only inherits the name from `inputProps`, not from an `aria-label` on the `<Select>` element itself. Verified with a scratch render before wiring it into the real component.
- `provinceFromSaved`/hydrate-gate: every entry point that can populate `form.province` from something outside the current pick (sessionStorage draft, saved-address autofill, saved-address card click) runs the value through `normalizeProvince` + `isTrProvince`; anything that doesn't land on one of the 81 canonical names is dropped to `''` rather than passed through. This matches the plan's T-ofg-01 mitigation and keeps `shipping.state` always either empty or one of the 81 literals.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking pre-existing bug] `window.location` test mock missing `href` crashed every test in `checkout-guest-account.test.tsx`**
- **Found during:** Task 1, before running any of the plan's own new/extended tests — a baseline `npx vitest run` (before any of my changes) already showed all 35 pre-existing tests in this file failing.
- **Issue:** The iyzico-return effect (`checkout/page.tsx`, added in commit `c970b72`, 22.09.2026) runs `new URL(window.location.href)` on every mount. The test's `beforeEach` replaces `window.location` with a plain `{ origin, assign }` object that has no `href` key, so `window.location.href` is `undefined` and `new URL(undefined)` throws `TypeError: Invalid URL`, crashing the whole render.
- **Fix:** Added `href: 'https://american-creator.tr/tr/checkout'` to the mocked `window.location` object.
- **Files modified:** `src/app/[locale]/checkout/checkout-guest-account.test.tsx` (part of the Task 1 diff)
- **Verification:** Confirmed with `git stash` that the bug is present at the pre-task base commit `85fd650` (35/35 tests failing with the same `Invalid URL` error); after the one-line fix all 37 tests in the file (35 original + 2 new) pass, and the full suite extended to 39 after Task 2's additions.
- **Committed in:** `81559d0` (part of the Task 1 commit — this file was already in Task 1's file list)

---

**Total deviations:** 1 auto-fixed (Rule 3).
**Impact on plan:** Necessary to make the plan's own required test file runnable at all; no scope creep — the fix is a one-line test-mock correction, not a change to production behavior (the effect itself is correct for real browsers, where `window.location.href` is always a valid URL).

## Issues Encountered

None beyond the deviation above and the MUI accessible-name detail (both resolved before committing; see Decisions Made).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All three gates green: `npx tsc --noEmit` clean; `npx vitest run` 90 files / 899 tests passed; `npm run build` succeeded (61 static pages generated).
- Cyrillic gates clean: 0 in added lines since base commit `85fd650`, 0 in the four new/modified files checked individually, and `.next/static` has no Cyrillic outside the pre-existing polyfills chunk.
- Three clean commits on `main`, none carrying `Co-Authored-By` or any Claude/Anthropic/AI mention (`git log -3 --format=%B | grep -ciE 'co-authored|claude|anthropic'` → 0).
- Nothing pushed, nothing deployed — the storefront ships this at the next PRELAUNCH-off deploy.
- Ready for the next quick task or phase; no blockers. FulfillmentTR order submission (out of scope here — lives in the autoCRM repo) can now rely on ACTR sending `shipping.state` (province) and `shipping.city` (district) on every new order and on the address book.

---
*Phase: quick-260926-ofg*
*Completed: 2026-09-26*

## Self-Check: PASSED

All 9 created/modified files confirmed present on disk; all 3 task commits (`81559d0`, `f5a0798`, `e554f29`) confirmed in `git log`.
