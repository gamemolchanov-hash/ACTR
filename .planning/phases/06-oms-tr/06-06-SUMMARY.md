---
phase: 06-oms-tr
plan: 06
subsystem: ui
tags: [i18n, next-intl, mui, content-only]

# Dependency graph
requires:
  - phase: 06-oms-tr (05)
    provides: TR phone/email/socials/payment-icon brand swap (D-03/D-04/D-05/D-10)
provides:
  - "contacts.legalLine1-5 in messages/en.json and messages/tr.json swapped to a TR seller-identity disclosure using the [Placeholder] pending-field convention (no RU legal/bank residue)"
  - "Footer.tsx copyright line neutralized to a dynamic-year brand-only line (no RU-project domain)"
affects: [06-VERIFICATION (re-verify), pre-go-live [Placeholder] sweep]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "[Placeholder] pending-field token for not-yet-known legal/seller-identity facts (established Phase-5 precedent, reused here)"

key-files:
  created: []
  modified:
    - messages/en.json
    - messages/tr.json
    - src/components/Footer.tsx

key-decisions:
  - "Used the literal [Placeholder] token for all 5 legal-block values in both locales rather than fabricating any TR address/VKN/IBAN/bank name — matches Phase-5 legal.kvkk.*/legal.mesafeli_satis.* precedent and avoids shipping a second legally-material inaccuracy."
  - "Footer copyright drops the domain entirely (brand name only, no substitute .tr domain) per UI-SPEC — consistent with the existing generic instagram.com/ social link precedent."

patterns-established: []

requirements-completed: [CLEAN-01, CLEAN-02]

coverage:
  - id: D1
    description: "Contacts page legal/seller-identity block (contacts.legalLine1-5, both EN and TR locales) no longer ships RU Moscow address / PAO Sberbank RUB account; renders the TR [Placeholder] disclosure instead"
    requirement: "CLEAN-01"
    verification:
      - kind: unit
        ref: "git grep -n 'Moscow|Moskova|PAO Sberbank|Sosenkoye|Kommunarka|40802810638000019658|30101810400000000225' -- messages/ -> 0 matches"
        status: pass
      - kind: unit
        ref: "grep -qF exact-value assertions on 6 of the 10 swapped keys (en.json legalLine1/3/5, tr.json legalLine1/3/5)"
        status: pass
      - kind: unit
        ref: "python3 -c set(en)==set(tr) and len==283 parity check"
        status: pass
    human_judgment: true
    rationale: "Plan's own <human-check> requires visual confirmation on /en/contacts and /tr/contacts that the right-hand legal block renders the 5-line disclosure with correct localized labels and unchanged fine-print styling — not exercised this session (no fresh page load performed by the executor beyond static grep/tsc gates)."
  - id: D2
    description: "Site-wide footer copyright neutralized to a dynamic-year brand-only line (no RU-project domain)"
    requirement: "CLEAN-02"
    verification:
      - kind: unit
        ref: "git grep -n 'american-creator.ru' -- src/components/Footer.tsx -> 0 matches"
        status: pass
      - kind: unit
        ref: "grep -qF '{new Date().getFullYear()} &copy; American Creator' src/components/Footer.tsx"
        status: pass
    human_judgment: true
    rationale: "Plan's own <human-check> requires a visual reload of any page footer to confirm current-year rendering, unchanged size/color/position — not exercised this session."

# Metrics
duration: 2min
completed: 2026-07-01
status: complete
---

# Phase 06 Plan 06: Gap Closure (Contacts Legal Block + Footer Copyright) Summary

**Swapped RU seller-identity legal block and RU-domain footer copyright to neutral TR/brand-only content via 2 value-only i18n edits + 1 JSX text-node edit — both residual gaps from 06-VERIFICATION.md closed.**

## Performance

- **Duration:** ~2 min (content-only edits, no new deps/builds)
- **Started:** 2026-07-01T13:22:47Z
- **Completed:** 2026-07-01T13:23:58Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- Gap 1 (blocker) closed: `contacts.legalLine1`..`legalLine5` in both `messages/en.json` and `messages/tr.json` now render the fixed TR seller-identity disclosure (`Legal name / Ünvan`, `Registered address / Yasal adres`, `Tax ID / MERSİS No / VKN / MERSİS No`, `IBAN`, `Bank / Banka`), each using the literal `[Placeholder]` token — the RU Moscow address + PAO Sberbank RUB current/correspondent account is fully removed from both locales.
- Gap 2 (warning) closed: `src/components/Footer.tsx:214` copyright line is now `{new Date().getFullYear()} &copy; American Creator` — the hardcoded `2026 &copy; american-creator.ru` (stale year + RU-project domain) is gone site-wide.
- EN/TR i18n parity held: both files parse as JSON, identical 283-key sets, no key added/removed (value-only swap).
- `npx tsc --noEmit` clean (0 errors); `npx vitest run` shows 129 passed / 3 pre-existing failures (documented `server-api.test.ts` ARM-shape baseline) — no new regressions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Swap contacts legal/seller-identity block to TR [Placeholder] disclosure (Gap 1, blocker)** - `8070dc8` (fix)
2. **Task 2: Neutralize footer copyright to dynamic-year brand line (Gap 2, warning)** - `3d4833e` (fix)

_Note: no TDD tasks in this plan (content-only value/JSX-text edits)._

## Files Created/Modified
- `messages/en.json` - `contacts.legalLine1`-`legalLine5` values swapped to TR seller-identity disclosure with `[Placeholder]` token (EN labels)
- `messages/tr.json` - same 5 keys swapped, TR labels (`Ünvan`, `Yasal adres`, `VKN / MERSİS No`, `IBAN`, `Banka`), same `[Placeholder]` token
- `src/components/Footer.tsx` - line 214 copyright text node replaced with `{new Date().getFullYear()} &copy; American Creator`; wrapping `<Typography sx={{ fontSize: 16, color: palette.primaryLight }}>` unchanged

## Decisions Made
- Used the literal `[Placeholder]` token for every not-yet-known legal/seller-identity value in both locales (mandatory per UI-SPEC and threat T-06-12 mitigation) rather than fabricating a real-looking TR address/VKN/IBAN/bank name — avoids shipping a second legally-material inaccuracy and is auto-surfaced by the pre-go-live `[Placeholder]` sweep (05-SECURITY.md T-05-02).
- Footer copyright drops the domain entirely (brand name only, no substitute `.tr` domain), matching the existing generic `instagram.com/` social-link precedent noted in the UI-SPEC.

## Deviations from Plan

None - plan executed exactly as written. Both tasks were pure content/text-node swaps with no structural, JSX, or key-set changes; no auto-fixes, no architectural questions, no auth gates encountered.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both residual gaps from `06-VERIFICATION.md` (Gap 1 blocker, Gap 2 warning) are closed at the code level; a re-verification pass (`/gsd-plan-phase` or the phase's verifier) should re-run `06-VERIFICATION.md`'s gates plus the two `<human-check>` visual confirmations (`/en/contacts`, `/tr/contacts`, and any-page footer) to move Phase 6 status from `gaps_found` to fully verified.
- The `[Placeholder]` tokens now present in `contacts.legalLine1-5` (10 total across both locales) join the existing Phase-5 `legal.kvkk.*`/`legal.mesafeli_satis.*` placeholders as pre-go-live checklist items — a real TR legal name/address/VKN-MERSİS/IBAN/bank must be supplied before deployment (tracked in STATE.md Pending Todos / 05-SECURITY.md T-05-02).
- No blockers for Phase 7 (TRY catalog data) — this plan touched only `messages/*.json` values and one Footer text node, fully isolated from catalog/ARM integration code.

---
*Phase: 06-oms-tr*
*Completed: 2026-07-01*

## Self-Check: PASSED

- FOUND: messages/en.json
- FOUND: messages/tr.json
- FOUND: src/components/Footer.tsx
- FOUND: commit 8070dc8
- FOUND: commit 3d4833e
