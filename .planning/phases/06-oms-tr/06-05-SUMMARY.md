---
phase: 06-oms-tr
plan: 05
subsystem: ui
tags: [nextjs, brand-swap, i18n, tr-market]

requires:
  - phase: 06-oms-tr
    provides: "06-01/02/03/04 (BOGO removal, reviews removal, RU business pages removal, /delivery TR rework) — prior slices of the same CLEAN-01/CLEAN-02 cleanup sequence"
provides:
  - "Footer/Header/contacts brand identity fully de-RU'd: TR placeholder phone at all 4 sites, TR placeholder email, WhatsApp+Instagram socials (VK/Wildberries/RU-Telegram dropped), Visa/Mastercard/Troy payment icons (yandex_money/webmoney/qiwi/PayKeeper dropped)"
affects: []

tech-stack:
  added: []
  patterns:
    - "grep-gate + tsc + vitest as the sole verification tool for a static-array/literal brand-swap task (no new component/test needed)"
    - "PIL-generated local placeholder image as fallback when the mandated ~/generate_image.py Gemini script fails on an external auth error, per plan's own critical_notes allowance for a simple placeholder"

key-files:
  created:
    - "public/icons/soc-instagram.png"
    - "public/icons/pay-troy.png"
  modified:
    - "src/components/Footer.tsx"
    - "src/components/Header.tsx"
    - "src/app/[locale]/contacts/page.tsx"

key-decisions:
  - "~/generate_image.py failed with 'API key not valid' (Gemini API, both the GEMINI_API_KEY env var unset and the script's hardcoded fallback key rejected by Google) — this is an external-service auth gate, not a repo bug, and not fixable in-repo. Per this plan's own critical_notes ('A simple placeholder icon is acceptable... do NOT leave a broken/missing <img> src'), generated both soc-instagram.png and pay-troy.png locally via PIL (Pillow, already installed) as neutral flat placeholders instead of blocking the plan on an external API-key issue."
  - "Logged 3 out-of-scope brand/comment leftovers (Footer.tsx:214 copyright line 'american-creator.ru', a stale BOGO comment in api.ts, and RESEARCH-confirmed-out-of-scope test-fixture/comment american-creator.ru refs) to .planning/phases/06-oms-tr/deferred-items.md rather than fixing them — none are named by this plan's D-03/D-04/D-05/D-10 decisions or files_modified list."

requirements-completed: [CLEAN-02]

coverage:
  - id: D1
    description: "RU phone +7 995 757-84-67 replaced with TR placeholder +90 500 000 00 00 at all 4 sites (Footer desktop/mobile, Header, contacts tel: href + display text) plus the wa.me WhatsApp URL; RU email info@american-creator.ru replaced with info@example.com.tr (mailto + display text) in contacts/page.tsx"
    requirement: "CLEAN-02"
    verification:
      - kind: other
        ref: "git grep -n '757-84-67|79957578467|info@american-creator' -- src (0 matches)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (0 errors)"
        status: pass
    human_judgment: true
    rationale: "Plan's own verify block includes a human-check (npm run dev; load /tr footer and /tr/contacts, confirm TR phone/email display and all links resolve) not exercised live this session — no dev server was running."
  - id: D2
    description: "Footer SOCIALS array dropped VK, Wildberries, and the RU Telegram handle (americancreator_ru); kept WhatsApp pointed at the TR placeholder number; added an Instagram placeholder entry; orphaned RU social assets (soc-vk.png, soc-wb.svg, soc-telegram.png) deleted, soc-instagram.png added"
    requirement: "CLEAN-02"
    verification:
      - kind: other
        ref: "git grep -ni 'vk\\.com|wildberries|americancreator_ru' -- src (0 matches)"
        status: pass
      - kind: other
        ref: "[ ! -e public/icons/soc-vk.png ] && [ ! -e public/icons/soc-wb.svg ] && [ ! -e public/icons/soc-telegram.png ] && [ -e public/icons/soc-instagram.png ]"
        status: pass
    human_judgment: true
    rationale: "Plan's own verify block includes a human-check (visual confirmation of social icon row showing only WhatsApp+Instagram) not exercised live this session — no dev server was running."
  - id: D3
    description: "Footer PAYMENT_ICONS array dropped yandex_money/webmoney/qiwi; kept mastercard/visa (unedited sprite bgPos); removed the standalone PayKeeper <img>; added Troy via a standalone <img src=/icons/pay-troy.png>; deleted paykeeper.png/pay-systems.png/payment.svg (verified-unused orphans)"
    requirement: "CLEAN-02"
    verification:
      - kind: other
        ref: "git grep -ni 'paykeeper|yandex_money|webmoney|qiwi' -- src (0 matches)"
        status: pass
      - kind: other
        ref: "[ -e public/icons/pay-troy.png ] && [ ! -e public/icons/paykeeper.png ] && [ ! -e public/icons/pay-systems.png ] && [ ! -e public/icons/payment.svg ] && grep -q pay-troy src/components/Footer.tsx"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (0 errors); npx vitest run (129 passed, 3 pre-existing server-api.test.ts failures, 0 new failures vs 06-04 baseline)"
        status: pass
    human_judgment: true
    rationale: "Plan's own verify block includes a human-check (reload /tr footer, confirm Visa/Mastercard/Troy render with no broken images) not exercised live this session — no dev server was running."

duration: ~5min
completed: 2026-07-01
status: complete
---

# Phase 6 Plan 5: TR Brand Swap — Phone/Email/Socials/Payment Icons Summary

**Swapped the RU brand-contact identity for TR placeholders: phone at all 4 sites, email, socials (WhatsApp+Instagram, dropped VK/Wildberries/RU-Telegram), and Footer payment icons (Visa/Mastercard/Troy, dropped yandex_money/webmoney/qiwi/PayKeeper) — the final "clean TR store" slice of Phase 6.**

## Performance

- **Duration:** ~5 min
- **Tasks:** 2
- **Files modified:** 11 (3 edited: Footer.tsx, Header.tsx, contacts/page.tsx; 2 created: soc-instagram.png, pay-troy.png; 6 deleted: soc-vk.png, soc-wb.svg, soc-telegram.png, paykeeper.png, pay-systems.png, payment.svg)

## Accomplishments

- Replaced the RU phone `+7 995 757-84-67` with the TR placeholder `+90 500 000 00 00` at all 4 verified sites: `Footer.tsx` desktop and mobile Typography blocks, `Header.tsx` desktop Typography block, and `contacts/page.tsx`'s clickable `tel:` link (both `href` and display text updated together to preserve the clickable link shape)
- Replaced the WhatsApp URL `wa.me/79957578467` with `wa.me/905000000000` in `Footer.tsx`'s `SOCIALS` array
- Replaced the RU email `info@american-creator.ru` with the de-RU placeholder `info@example.com.tr` in `contacts/page.tsx` (both the `mailto:` href and the display text)
- Edited Footer's `SOCIALS` array: deleted the VK entry (`soc-vk.png`/vk.com), deleted the Wildberries entry (`soc-wb.svg`/wildberries.ru), removed the Telegram entry carrying the RU handle `americancreator_ru` entirely (per D-04's "drop the RU handle" instruction), kept WhatsApp pointed at the TR placeholder number, and added a new Instagram entry (`/icons/soc-instagram.png`, `https://www.instagram.com/`)
- Deleted the orphaned RU social assets `public/icons/soc-vk.png`, `soc-wb.svg`, `soc-telegram.png`
- Edited Footer's `PAYMENT_ICONS` array: deleted `yandex_money`, `webmoney`, `qiwi` entries; kept `mastercard`/`visa` unchanged (still rendering off the existing, untouched `payment-sprite.svg`)
- Removed the standalone PayKeeper `<img>` block from the Footer's bottom row
- Added Troy via the existing standalone-`<img>` idiom already used for PayKeeper (`<img src="/icons/pay-troy.png" alt="Troy" style={{ width: 24, height: 16 }} />`), placed in the same flex row as the sprite-rendered Visa/Mastercard boxes — no new sprite position introduced, `payment-sprite.svg` untouched
- Deleted the orphaned/RU payment assets `public/icons/paykeeper.png`, `pay-systems.png`, `payment.svg` (verified unused per RESEARCH.md)
- Generated both new placeholder assets (`soc-instagram.png`, `pay-troy.png`) locally via Python/Pillow after the project-mandated `~/generate_image.py` script failed with an external Gemini API-key error (see Deviations)
- Verified live-guard: KDV (`kdvFromBrutto`), KVKK/mesafeli consent, and `/legal/[slug]` remain fully untouched (44 references still present elsewhere in `src`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Swap phone + email + socials to TR placeholders (D-03/D-10/D-04)** - `c9fb500` (feat)
2. **Task 2: Swap Footer payment icons to Visa/Mastercard/Troy (D-05)** - `db2f4fa` (feat)

_No TDD tasks in this plan — pure literal-value/array edit + asset swap, verified via grep-gates + tsc + vitest, per RESEARCH.md/PATTERNS.md guidance._

## Files Created/Modified

- `src/components/Footer.tsx` - `SOCIALS` array (WhatsApp+Instagram only), `PAYMENT_ICONS` array (Visa/Mastercard only + standalone Troy `<img>`), TR phone display text (desktop + mobile), PayKeeper `<img>` removed
- `src/components/Header.tsx` - TR phone display text
- `src/app/[locale]/contacts/page.tsx` - TR phone (`tel:` href + display text), TR placeholder email (`mailto:` href + display text)
- (created) `public/icons/soc-instagram.png` - Instagram social icon placeholder (PIL-generated)
- (created) `public/icons/pay-troy.png` - Troy payment badge placeholder (PIL-generated, neutral non-trademark "TROY" wordmark)
- (deleted) `public/icons/soc-vk.png`, `soc-wb.svg`, `soc-telegram.png` - orphaned RU social assets
- (deleted) `public/icons/paykeeper.png`, `pay-systems.png`, `payment.svg` - orphaned RU/unused payment assets

## Decisions Made

- Used a PIL-generated local placeholder instead of `~/generate_image.py` for both new icons — the mandated script returned `400 INVALID_ARGUMENT: API key not valid` (neither `GEMINI_API_KEY` env var nor the script's hardcoded fallback key authenticated with Google). This is an external-service auth failure, not a repo defect, and not something Rule 1/2/3 auto-fix can resolve by editing code. The plan's own `critical_notes` explicitly pre-authorizes this fallback ("A simple placeholder icon is acceptable... do NOT leave a broken/missing `<img>` src"), so no checkpoint/pause was needed — proceeded directly with the sanctioned fallback.
- Logged 3 out-of-scope brand/comment leftovers to `.planning/phases/06-oms-tr/deferred-items.md` (Footer.tsx:214 copyright line still reading "american-creator.ru", a stale BOGO comment reference in `api.ts`, and comment/test-fixture `american-creator.ru` refs already confirmed out-of-scope by RESEARCH.md's A3) rather than fixing them — none are named by this plan's D-03/D-04/D-05/D-10 decisions, and the copyright-line fix in particular would be scope creep beyond this plan's `files_modified` list.

## Deviations from Plan

### Auto-fixed Issues

None requiring the Rule 1-3 auto-fix protocol — no bugs, missing critical functionality, or blocking issues were encountered in the plan's own scope.

**1. [Fallback per plan's own critical_notes — not a Rule 1/2/3 deviation] Used PIL instead of `~/generate_image.py`**
- **Found during:** Task 1 (Instagram icon) and Task 2 (Troy icon)
- **Issue:** `~/generate_image.py` failed both times with `400 INVALID_ARGUMENT: API key not valid` (Gemini API key rejected)
- **Fix:** Generated both placeholder PNGs locally with Python/Pillow (already installed, no new package), matching the plan's explicit fallback allowance for "a simple placeholder icon"
- **Files affected:** `public/icons/soc-instagram.png`, `public/icons/pay-troy.png`
- **Commits:** `c9fb500` (soc-instagram.png), `db2f4fa` (pay-troy.png)

## Issues Encountered

- `~/generate_image.py "..." <output.png>` failed with a Gemini API-key authentication error both times it was invoked (image generation step of Task 1 and Task 2). No `GEMINI_API_KEY` env var is set in this environment, and the script's hardcoded fallback key was rejected by Google's API (`API_KEY_INVALID`). This is an external service credential issue outside this repo's control — flagged here rather than silently retried, per the authentication-gate protocol, but resolved without a user checkpoint because the plan's `critical_notes` already pre-authorizes a simple placeholder fallback for exactly this scenario.

## User Setup Required

None for this plan's own scope. If real Instagram/Troy branding assets are desired before go-live (or if `~/generate_image.py`'s Gemini API key should be fixed for future asset-generation needs), that is a deploy-track / global-tooling concern, not part of this plan.

## Verification Summary

- `git grep -n "757-84-67|79957578467|info@american-creator" -- src` → 0
- `git grep -ni "vk\.com|wildberries|americancreator_ru" -- src` → 0
- `git grep -ni "paykeeper|yandex_money|webmoney|qiwi" -- src` → 0
- `[ ! -e public/icons/soc-vk.png ]`, `[ ! -e public/icons/soc-wb.svg ]`, `[ ! -e public/icons/soc-telegram.png ]` → true (assets deleted)
- `[ -e public/icons/soc-instagram.png ]`, `[ -e public/icons/pay-troy.png ]` → true (placeholders created)
- `[ ! -e public/icons/paykeeper.png ]`, `[ ! -e public/icons/pay-systems.png ]`, `[ ! -e public/icons/payment.svg ]` → true (assets deleted)
- `grep -q "pay-troy" src/components/Footer.tsx` → true
- Live-guard: `git grep -n "kdvFromBrutto|/legal/|mesafeli|kvkk" -- src` → 44 matches (untouched, Phase 5 intact)
- Full phase-6 cleanup grep-gate (all RU terms: cdek, paykeeper, bogo-as-feature, vk.com, wildberries, yandex_money, webmoney, qiwi, "+7 995") → 0 matches (except the pre-existing, RESEARCH-confirmed-out-of-scope `bogo` code comment in `api.ts` and `american-creator.ru` comment/test-fixture/copyright-line occurrences — see deferred-items.md)
- `npx tsc --noEmit` → 0 errors
- `npx vitest run` → 132 tests, 129 passed, 3 pre-existing `server-api.test.ts` failures (unchanged baseline from 06-04: `armToProduct` reads `p.name` of undefined), **0 new failures**

**Not exercised live this session:** dev-server-based manual checks (`npm run dev`; loading `/tr` footer and `/tr/contacts` to visually confirm TR phone/email display, social icon row shows only WhatsApp+Instagram, payment row shows Visa/Mastercard/Troy with no broken images, all links resolve). No dev server was running in this session; the automated grep-gates + tsc + vitest give high confidence but the literal rendered page was not observed. Flagged as `human_judgment: true` in the coverage block for D1/D2/D3.

## Known Stubs

- `public/icons/soc-instagram.png` and `public/icons/pay-troy.png` are locally-generated, non-branded placeholder images (a simple line-art camera glyph and a flat "TROY" wordmark badge respectively) — intentional per this plan's own design (A1 assumption in RESEARCH.md: placeholders are acceptable, real licensed assets are a deploy-track item before go-live). Not a stub blocking this plan's goal — both render correctly as functioning `<img>` elements, just not final branded artwork.
- The Instagram social href (`https://www.instagram.com/`) and Troy badge are placeholder values by design (per D-04/D-05 and RESEARCH.md's explicit "Claude's Discretion" / A1 assumption) — real TR handle and licensed Troy asset are deploy-track items, not part of this milestone's scope.

## Threat Flags

None — this plan only edits static literal values (phone/email strings, array entries) and adds/removes static image assets in `Footer.tsx`/`Header.tsx`/`contacts/page.tsx`; no new endpoints, auth paths, file-access patterns, or trust-boundary changes were introduced beyond what the plan's own `<threat_model>` already covers (T-06-10, T-06-11, T-06-SC — all addressed by the grep-gates and vitest/tsc run above).

## Next Phase Readiness

- CLEAN-02 fully satisfied: phone (D-03), email (D-10), socials (D-04), payment icons (D-05) all swapped to TR placeholders at every verified consumer site
- All RU brand grep gates return 0 (except pre-existing, RESEARCH-confirmed out-of-scope comment/test-fixture references, now logged in `deferred-items.md`)
- Phase-5 compliance code (KDV/KVKK/mesafeli/legal) demonstrably untouched (44 references intact)
- `pay-troy.png` + `soc-instagram.png` placeholders created and referenced; `tsc` clean; `vitest` green (no new failures)
- This was the final plan (5 of 5) of Phase 6 (oms-tr) — Phase 6 cleanup + TR brand swap is now complete pending final phase-level review
- Recommend a dev-server-based manual visual spot-check of `/tr` footer and `/tr/contacts` before phase close, per this plan's own human-check verification steps (not exercised live this session)
- Recommend replacing `soc-instagram.png`/`pay-troy.png` placeholders with real licensed/branded assets before go-live (deploy-track, per RESEARCH.md A1)
- `.planning/phases/06-oms-tr/deferred-items.md` created — 3 out-of-scope leftover items logged for a future brand-swap slice or explicit decision before go-live

## Self-Check: PASSED

All modified files verified present on disk (`src/components/Footer.tsx`, `src/components/Header.tsx`, `src/app/[locale]/contacts/page.tsx`); new assets confirmed present (`public/icons/soc-instagram.png`, `public/icons/pay-troy.png`); deleted assets confirmed absent (`soc-vk.png`, `soc-wb.svg`, `soc-telegram.png`, `paykeeper.png`, `pay-systems.png`, `payment.svg`); both commits (`c9fb500`, `db2f4fa`) verified present in `git log --oneline -2`.

---
*Phase: 06-oms-tr*
*Completed: 2026-07-01*

## Self-Check Verification Run

All files/commits confirmed present via direct filesystem/git checks at write-time (see Self-Check section above).
