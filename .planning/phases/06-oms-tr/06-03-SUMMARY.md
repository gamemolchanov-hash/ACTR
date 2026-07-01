---
phase: 06-oms-tr
plan: 03
subsystem: ui
tags: [nextjs, seo, dead-code-removal, i18n, redirects, sitemap]

requires:
  - phase: 06-oms-tr
    provides: "06-01 (BOGO removal), 06-02 (reviews removal + robots.txt de-RU) — prior slices of the same CLEAN-01 cleanup sequence"
provides:
  - "Storefront with zero RU-recruitment pages (/partners*, /studios) — routes, nav links, sitemap entries, and images all removed"
  - "next.config.js redirects() reduced to 3 trailing-slash hygiene entries, all legacy Bitrix/RU redirects gone"
affects: [06-04, 06-05]

tech-stack:
  added: []
  patterns:
    - "grep-gate as the sole verification tool for a pure-deletion task (no dedicated unit test needed for static marketing pages or a config-only redirects() prune)"

key-files:
  created: []
  modified:
    - "src/components/Header.tsx"
    - "src/components/Footer.tsx"
    - "src/app/sitemap.ts"
    - "next.config.js"
    - "messages/en.json"
    - "messages/tr.json"

key-decisions:
  - "Executed exactly as planned: Task 1 deletes partners/studios routes+images+nav+sitemap entries in one commit (all 4 consumer types share one deletion boundary per RESEARCH.md gap #1), Task 2 purges the 77 i18n keys, Task 3 prunes next.config.js redirects to 3 trailing-slash entries"
  - "Stale generated .next/types/app/[locale]/{partners,studios} type-declaration files (gitignored build artifacts referencing the just-deleted page.tsx modules) had to be removed to get tsc --noEmit clean — not a plan deviation, standard consequence of deleting a Next.js App Router route while .next/ build output still references it"
  - "The redirects() comment describing what was removed had to avoid literally spelling out the grep-gate's own search terms (e.g. writing '.php' or 'ankety' in a code comment trips the same grep used to verify they're gone) — reworded to a generic 'legacy Bitrix/RU URL-migration redirects removed' phrasing that still documents intent without failing its own verification gate"

requirements-completed: []

coverage:
  - id: D1
    description: "partners/studios routes, nav links (Header/Footer), sitemap.ts STATIC_PATHS entries, and public images all removed; nav.new and all other nav items retained"
    requirement: "CLEAN-01"
    verification:
      - kind: other
        ref: "git grep -n \"'/studios'\\|'/partners\\|nav.studios\\|nav.partners\" -- src (0 matches)"
        status: pass
      - kind: unit
        ref: "npx vitest run src/app/sitemap.test.ts (7 passed)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (0 errors, after clearing stale .next/types entries for the deleted routes)"
        status: pass
    human_judgment: true
    rationale: "Plan's own verify block includes a human-check (curl 404s for /tr/partners, /tr/studios, /en/partners, /en/studios and visual confirmation nav no longer shows Studios/Partners) that was not exercised live in this session (no dev server running); grep-gate + route-directory-absence + sitemap test are strong proxies but the literal 404 response was not observed."
  - id: D2
    description: "77 studios.*/partners.*/nav.studios/nav.partners i18n keys purged from both locales with EN/TR parity held (372 -> 295 keys each)"
    requirement: "CLEAN-01"
    verification:
      - kind: other
        ref: "python3 i18n parity check: set(en) == set(tr), no studios./partners./nav.studios/nav.partners key, 295/295"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (0 errors)"
        status: pass
    human_judgment: false
  - id: D3
    description: "next.config.js redirects() pruned to 3 trailing-slash hygiene entries (/contacts/, /basket/, /catalog/); all RU/Bitrix redirects removed; open-redirect invariant confirmed (all destinations static same-origin literals)"
    requirement: "CLEAN-01"
    verification:
      - kind: other
        ref: "grep -cE \"\\.php|ankety|/personal|/auth\\b|categoryMap|vse_tovary|must_have|novinki|help/delivery|info/faq\" next.config.js -> 0"
        status: pass
      - kind: other
        ref: "node -e \"require('./next.config.js')\" (loads without error, exit 0)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (0 errors)"
        status: pass
    human_judgment: true
    rationale: "Plan's verify block includes a human-check (curl -sI against a running dev server for /basket/, /contacts/ -> 301 and /help/delivery, /ankety -> 404) not exercised live this session; node -e require + grep-gate confirm syntax validity and absence of legacy patterns but not the live HTTP redirect behavior."

duration: ~15min
completed: 2026-07-01
status: complete
---

# Phase 6 Plan 3: RU Business Pages Removal + Bitrix Redirect Pruning Summary

**Deleted the entire /partners+/studios RU-recruitment marketing surface (routes, nav links, sitemap entries, images) and pruned next.config.js redirects() from 32 Bitrix/RU-legacy entries down to 3 trailing-slash hygiene rules for existing TR routes.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3
- **Files modified:** 24 (18 deleted in Task 1 across routes+images, 2 edited in Task 1 for nav+sitemap, 2 edited in Task 2 for i18n, 1 edited in Task 3 for redirects)

## Accomplishments

- Deleted `src/app/[locale]/partners/**` (page + shops/bloggers/schools subpages) and `src/app/[locale]/studios/` entirely, plus their `public/images/{partners,studios}/**` assets (13 image files)
- Removed the `nav.studios`/`nav.partners` entries from both `Header.tsx` and `Footer.tsx` nav arrays, keeping `nav.new` and every other nav item untouched (scoped precisely per plan note, since both files are edited again in 06-05)
- Removed the 5 `STATIC_PATHS` entries (`/partners`, `/partners/shops`, `/partners/bloggers`, `/partners/schools`, `/studios`) from `src/app/sitemap.ts` — closing RESEARCH.md's gap #1 (sitemap.xml no longer advertises 5 now-404 URLs)
- Purged 77 `studios.*`/`partners.*`/`nav.studios`/`nav.partners` keys from both `messages/en.json` and `messages/tr.json` (372 → 295 keys each), EN/TR parity held (verified `set(en) == set(tr)`)
- Rewrote `next.config.js` `redirects()` from a 32-redirect Bitrix-migration function (categoryMap + two `Object.entries` loops, `.php` variants, `/ankety*`, `/auth*`, `/personal*`, `/help/delivery`, `/info/faq`, `/novinki.php`, `vse_tovary`/`must_have` product+category redirects) down to exactly 3 trailing-slash hygiene entries (`/contacts/`, `/basket/`, `/catalog/`) — every surviving destination is a static same-origin literal targeting an existing TR route
- Verified the open-redirect invariant (ASVS V14 / T-06-06): no surviving redirect destination is templated from user input or query params

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete partners/studios routes, nav links, sitemap entries, and images** - `76c128d` (feat)
2. **Task 2: Purge studios.*/partners.*/nav.* i18n keys (EN/TR parity)** - `287273a` (feat)
3. **Task 3: Prune next.config.js redirects to trailing-slash hygiene only (D-07)** - `a07a4be` (fix)

_No TDD tasks in this plan — pure deletion/edit, verified via grep-gates + tsc + vitest, per RESEARCH.md guidance._

## Files Created/Modified

- `src/components/Header.tsx` - Removed `nav.studios`/`nav.partners` entries from `NAV_ITEMS`; `nav.new` and other items untouched
- `src/components/Footer.tsx` - Removed `nav.studios`/`nav.partners` entries from `NAV_COL1`
- `src/app/sitemap.ts` - Removed 5 `STATIC_PATHS` entries for partners/studios routes
- `next.config.js` - `redirects()` reduced from 32 entries to 3 (trailing-slash hygiene only)
- `messages/en.json` / `messages/tr.json` - Removed 77 `studios.*`/`partners.*`/`nav.studios`/`nav.partners` keys (372 → 295 keys each)
- (deleted) `src/app/[locale]/partners/{page.tsx,shops/page.tsx,bloggers/page.tsx,schools/page.tsx}`, `src/app/[locale]/studios/page.tsx`
- (deleted) `public/images/partners/{ankety_magazinam.png,ankety_bloggers.png,ankety_schools.png,magazinam.jpeg,bloggers.png,schools.png}`, `public/images/studios/{decorative-gel.png,decorative-gel-mobile.png,product-bottle.png,salon-woman.png,hero-products.png,cream-smear.png,divider.svg}`

## Decisions Made

- Deleted all 4 consumer types (routes, nav links, sitemap entries, images) in a single Task 1 commit rather than splitting further, since the plan's own file list groups them together and RESEARCH.md's gap #1 (sitemap.ts) is a natural extension of the same deletion, not a separate feature
- Removed stale `.next/types/app/[locale]/{partners,studios}` generated type-declaration files after Task 1 — these are gitignored Next.js build artifacts that referenced the just-deleted `page.tsx` modules and caused `tsc --noEmit` to fail on generated (not source) code; deleting them is the standard fix, not a source-code change
- Reworded the `next.config.js` removal-summary comment to avoid literally including the grep-gate's own search terms (`.php`, `ankety`, etc.) — the acceptance criteria's grep for those exact strings would otherwise match the comment describing what was removed, producing a false "still present" signal

## Deviations from Plan

None - plan executed exactly as written. Two minor operational notes (not deviations, no code/behavior change):

1. Stale `.next/types` generated files required deletion to unblock `tsc --noEmit` (gitignored build artifact, not source)
2. The redirects() removal comment's exact wording was adjusted mid-task to not trip its own grep-gate acceptance criterion

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification Summary

- `git grep -n "'/studios'\|'/partners\|nav.studios\|nav.partners" -- src` → 0
- `[ ! -e "src/app/[locale]/partners" ] && [ ! -e "src/app/[locale]/studios" ]` → both absent
- `[ ! -e "public/images/partners" ] && [ ! -e "public/images/studios" ]` → both absent
- `npx vitest run src/app/sitemap.test.ts` → 7 passed
- i18n parity script → 295/295, no `studios.*`/`partners.*`/`nav.studios`/`nav.partners` key in either locale
- `grep -cE "\.php|ankety|/personal|/auth\b|categoryMap|vse_tovary|must_have|novinki|help/delivery|info/faq" next.config.js` → 0
- `node -e "require('./next.config.js')"` → loads without error (exit 0)
- `npx tsc --noEmit` → 0 errors
- `npx vitest run` (full suite) → 132 tests, 129 passed, 3 pre-existing `server-api.test.ts` failures (unchanged baseline), **0 new failures**

**Not exercised live this session:** dev-server-based manual checks (curl 404s for `/tr/partners`, `/tr/studios`; curl 301 for `/basket/`, `/contacts/` and 404 for `/help/delivery`, `/ankety`). No dev server was running in this session; the automated grep-gate + tsc + `node -e require` + sitemap-test gates give high confidence but the literal HTTP behavior was not observed. Flagged as `human_judgment: true` in the coverage block for D1/D3.

## Next Phase Readiness

- CLEAN-01 (RU pages + Bitrix redirects portion) fully satisfied: routes, nav, sitemap, images, i18n keys all removed; redirects pruned to trailing-slash hygiene only
- D-01 + D-07 honored exactly (incl. RESEARCH sitemap gap #1); surviving redirects target existing routes; open-redirect invariant confirmed
- EN/TR parity held (295/295); tsc clean; no new vitest failures
- Header.tsx and Footer.tsx nav edits scoped precisely to the studios/partners links only — 06-05's later phone/socials/payment-icon edits to the same two files should apply cleanly
- No blockers for plan 06-04 (next slice of Phase 6 cleanup per RESEARCH.md's recommended sequencing: CDEK/delivery rework, D-02)
- Recommend a dev-server-based manual 404/redirect spot-check before phase close, per the plan's own human-check verification step (not exercised live this session)

## Self-Check: PASSED

All modified files verified present on disk (`Header.tsx`, `Footer.tsx`, `sitemap.ts`, `next.config.js`, `messages/{en,tr}.json`); all deleted files/directories confirmed absent (`src/app/[locale]/{partners,studios}`, `public/images/{partners,studios}`); all 3 commits (`76c128d`, `287273a`, `a07a4be`) verified present in `git log --oneline -4`.

---
*Phase: 06-oms-tr*
*Completed: 2026-07-01*
