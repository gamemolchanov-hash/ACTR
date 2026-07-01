---
phase: 06-oms-tr
plan: 04
subsystem: ui
tags: [nextjs, i18n, dead-code-removal, next-intl]

requires:
  - phase: 06-oms-tr
    provides: "06-01/02/03 (BOGO removal, reviews removal, RU business pages removal) — prior slices of the same CLEAN-01/CLEAN-02 cleanup sequence"
provides:
  - "/delivery rewritten for the TR market: no CDEK vocabulary, no CDEK_OPTIONS array, no delivery.cdek*/cityNote*/freeBanner i18n keys, no named carrier"
  - "RU-composite payment-systems.png image block and asset removed from /delivery; accepted payment methods (Visa/Mastercard/Troy) conveyed as text"
affects: [06-05]

tech-stack:
  added: []
  patterns:
    - "grep-gate + i18n parity script as the sole verification tool for a content-rework task (no new component/test needed for a static marketing page rewrite)"

key-files:
  created: []
  modified:
    - "src/app/[locale]/delivery/page.tsx"
    - "messages/en.json"
    - "messages/tr.json"

key-decisions:
  - "Removed the city-delivery-note and free-delivery-banner blocks entirely (rather than repurposing them with new copy) since their backing i18n keys (delivery.cityNote*, delivery.freeBanner) were explicitly on the plan's key-removal list — folding their content into the reworked delivery.desc value instead of inventing replacement keys, per the plan's 284-then-283 key-count targets"
  - "Kept delivery.sectionTitle/paymentTitle/cardStepsTitle/cardStep1-5 values unchanged — they were not CDEK/RU-specific and not on the removal or rework list"

requirements-completed: [CLEAN-01, CLEAN-02]

coverage:
  - id: D1
    description: "CDEK_OPTIONS array + render loop, city-delivery-note blocks, and free-delivery banner removed from delivery/page.tsx; 11 delivery.cdek*/cityNote*/freeBanner i18n keys removed from both locales; delivery.title/desc reworked to neutral TR/EN copy with no named carrier"
    requirement: "CLEAN-01"
    verification:
      - kind: other
        ref: "git grep -ni 'cdek' -- src (0 matches)"
        status: pass
      - kind: other
        ref: "python3 i18n parity check: set(en)==set(tr), no delivery.cdek*/cityNote*/freeBanner key, delivery.title/desc present, 284/284 after task 1"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (0 errors)"
        status: pass
    human_judgment: true
    rationale: "Plan's own verify block includes a human-check (npm run dev; load /tr/delivery and /en/delivery, confirm TR/EN copy renders with no CDEK wording and no dotted-key strings, Footer link resolves) not exercised live this session — no dev server was running."
  - id: D2
    description: "payment-systems.png <Box component=\"img\"> block removed from delivery/page.tsx and the asset deleted; delivery.paymentImgAlt key removed from both locales; delivery.paymentDesc reworked to name Visa/Mastercard/Troy in prose (RU MIR wording dropped)"
    requirement: "CLEAN-02"
    verification:
      - kind: other
        ref: "[ ! -e public/images/delivery/payment-systems.png ] && git grep -n 'payment-systems|paymentImgAlt' -- src (0 matches)"
        status: pass
      - kind: other
        ref: "python3 i18n parity check: set(en)==set(tr), delivery.paymentImgAlt absent, delivery.paymentDesc present, 283/283"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (0 errors); npx vitest run (129 passed, 3 pre-existing server-api.test.ts failures, 0 new failures)"
        status: pass
    human_judgment: true
    rationale: "Plan's own verify block includes a human-check (reload /tr/delivery, confirm no broken payment image, payment copy mentions Visa/Mastercard/Troy in TR) not exercised live this session — no dev server was running."

duration: ~10min
completed: 2026-07-01
status: complete
---

# Phase 6 Plan 4: /delivery TR Rework (CDEK Removal + Payment Image Removal) Summary

**Rewrote /delivery for the TR market: dropped the CDEK_OPTIONS carrier-options array, city-delivery-note, and free-delivery banner (11 i18n keys), and removed the RU-composite payment-systems.png image + asset, replacing both with neutral carrier-agnostic TR/EN copy that names Visa/Mastercard/Troy as text.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2
- **Files modified:** 4 (3 edited: delivery/page.tsx, messages/en.json, messages/tr.json; 1 deleted: payment-systems.png)

## Accomplishments

- Removed the `CDEK_OPTIONS` array and its render loop (three bordered carrier-option cards), plus the city-delivery-note paragraphs and the free-delivery banner block from `src/app/[locale]/delivery/page.tsx` — no named carrier remains anywhere on the page
- Removed 11 `delivery.cdek0/1/2Name`, `delivery.cdek0/1/2Time`, `delivery.cityNote1`, `delivery.cityNote2Line1/2/3`, `delivery.freeBanner` keys from both `messages/en.json` and `messages/tr.json`
- Reworked `delivery.title`/`delivery.desc` values to neutral, carrier-agnostic TR/EN delivery copy conveying general shipping expectations (2-5 business days, tracking-link-by-email) without naming any courier
- Removed the `<Box component="img" src="/images/delivery/payment-systems.png">` block from the payment section and deleted the underlying asset `public/images/delivery/payment-systems.png`
- Removed the now-unused `delivery.paymentImgAlt` key from both locales (its only consumer was the removed image block)
- Reworked `delivery.paymentDesc` values to name TR-accepted payment methods in prose (Visa, Mastercard, Troy), dropping the RU "MIR" wording
- Kept the `/delivery` route intact (not deleted, per D-02) — Footer's "Delivery & Payment" link still resolves to it
- Maintained EN/TR i18n parity throughout: 295 → 284 keys (Task 1) → 283 keys (Task 2), `set(en) == set(tr)` at every step

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace CDEK options with neutral TR delivery copy (+ purge cdek i18n keys)** - `174d8a6` (feat)
2. **Task 2: Remove the RU payment-systems.png image block + asset (D-06)** - `a7bc9de` (feat)

_No TDD tasks in this plan — pure content-rework/deletion, verified via grep-gates + i18n parity script + tsc + vitest, per RESEARCH.md/PATTERNS.md guidance._

## Files Created/Modified

- `src/app/[locale]/delivery/page.tsx` - Removed `CDEK_OPTIONS` array + render loop, city-delivery-note blocks, free-delivery banner, and the payment-systems.png image block; kept breadcrumb/title/payment-text structure and card-steps section unchanged
- `messages/en.json` / `messages/tr.json` - Removed 11 `delivery.cdek*`/`cityNote*`/`freeBanner` keys + `delivery.paymentImgAlt`; reworked `delivery.title`/`delivery.desc`/`delivery.paymentDesc` values to neutral TR/EN content (295 → 283 keys each)
- (deleted) `public/images/delivery/payment-systems.png`

## Decisions Made

- Folded the city-delivery-note and free-delivery-banner content into the reworked `delivery.desc` value rather than inventing new replacement i18n keys, since those specific keys were explicitly targeted for removal by the plan's key-count math (295 → 284 → 283)
- Left `delivery.sectionTitle`, `delivery.paymentTitle`, `delivery.cardStepsTitle`, and `delivery.cardStep1-5` values unchanged — none were CDEK-specific or RU-payment-specific, and none were on the plan's removal/rework list

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. First attempt at the i18n edit used a full-file JSON re-dump (`json.dump`) which stripped the file's cosmetic blank-line group separators, producing a large unrelated diff; reverted and redid the edit as targeted line-range replacements to keep the diff scoped to the actual key changes.

## User Setup Required

None - no external service configuration required.

## Verification Summary

- `git grep -ni "cdek" -- src` → 0
- `git grep -n "payment-systems\|paymentImgAlt" -- src` → 0
- `[ ! -e "public/images/delivery/payment-systems.png" ]` → true (asset deleted)
- i18n parity script → 283/283 both locales, no `delivery.cdek*`/`cityNote*`/`freeBanner`/`paymentImgAlt` key in either locale, `delivery.title`/`desc`/`paymentDesc` present with reworked values
- `npx tsc --noEmit` → 0 errors
- `npx vitest run` → 132 tests, 129 passed, 3 pre-existing `server-api.test.ts` failures (unchanged baseline: `armToProduct` reads `p.name` of undefined), **0 new failures**

**Not exercised live this session:** dev-server-based manual checks (`npm run dev`; loading `/tr/delivery` and `/en/delivery` to visually confirm TR/EN copy renders, no CDEK wording, no dotted-key strings, Footer link resolves; confirming no broken payment image and that payment copy mentions Visa/Mastercard/Troy in TR). No dev server was running in this session; the automated grep-gates + i18n parity script + tsc + vitest give high confidence but the literal rendered page was not observed. Flagged as `human_judgment: true` in the coverage block for D1/D2.

## Next Phase Readiness

- CLEAN-01 (CDEK portion) fully satisfied: no CDEK code/keys/vocabulary anywhere in `src`; `/delivery` route kept and rendering with reworked copy
- CLEAN-02 (D-06) fully satisfied: RU payment image block + asset removed; TR-accepted payment methods (Visa/Mastercard/Troy) conveyed as text
- D-02 + D-06 honored exactly (route kept, no named carrier); EN/TR parity held (283/283); tsc + vitest green (no new failures)
- No blockers for plan 06-05 (final slice of Phase 6 cleanup — brand swaps: phone/socials/payment-icon edits to Header.tsx/Footer.tsx/contacts/page.tsx per PATTERNS.md)
- Recommend a dev-server-based manual visual spot-check of `/tr/delivery` and `/en/delivery` before phase close, per this plan's own human-check verification step (not exercised live this session)

## Self-Check: PASSED

All modified files verified present on disk (`src/app/[locale]/delivery/page.tsx`, `messages/en.json`, `messages/tr.json`); deleted asset confirmed absent (`public/images/delivery/payment-systems.png`); both commits (`174d8a6`, `a7bc9de`) verified present in `git log --oneline -3`.

---
*Phase: 06-oms-tr*
*Completed: 2026-07-01*
