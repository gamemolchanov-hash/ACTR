---
phase: 05-ui
plan: "01"
subsystem: compliance-ui
tags: [legal-pages, i18n, footer, SSG, TR-compliance]
dependency_graph:
  requires: []
  provides: [legal-page-routes, footer-legal-column, legal-i18n-keys]
  affects: [messages/en.json, messages/tr.json, Footer.tsx]
tech_stack:
  added: []
  patterns: [next-intl flat keys, Next.js SSG generateStaticParams, dynamic route [slug], notFound guard]
key_files:
  created:
    - src/app/[locale]/legal/[slug]/page.tsx
    - src/app/[locale]/legal/legal-page.test.tsx
  modified:
    - messages/en.json
    - messages/tr.json
    - src/components/Footer.tsx
decisions:
  - "Breadcrumb Home text hardcoded as 'Home' (not i18n) to avoid adding a delivery.breadcrumbHome dependency; sufficient for stub pages"
  - "sNTitle keys translated to Turkish in TR messages (not just navLabel/title); improves Turkish UX without extra effort"
  - "Test uses vi.mock approach (no NextIntlClientProvider) to avoid next-intl internal next/navigation import issues in vitest"
metrics:
  duration: ~12min
  completed: 2026-06-30
  tasks: 3
  files: 5
---

# Phase 05 Plan 01: Legal Pages + Footer Column Summary

**One-liner:** 5 TR legal stub pages (SSG, next-intl EN+TR) + footer NAV_COL_LEGAL with locale-aware links, satisfying COMP-02.

## What Was Built

### Task 1: i18n Keys (messages/en.json + messages/tr.json)
- Appended 43 flat dotted keys per file (`legal.*`), zero hyphenated key paths
- 5 namespaces: `legal.kvkk` (s1–s4), `legal.mesafeli_satis` (s1–s3), `legal.iade` (s1–s3), `legal.gizlilik` (s1–s2), `legal.kullanim_kosullari` (s1–s2)
- EN: base English strings from research spec; TR: real Turkish for navLabel/title/sNTitle, placeholder body per D-07
- Strict key parity: 43 keys/lang verified by Node parity check

### Task 2: Dynamic Legal SSG Page
- `src/app/[locale]/legal/[slug]/page.tsx` — 'use client' component modelled on delivery/page.tsx
- LEGAL_SLUGS allowlist → `notFound()` for unknown slugs (T-05-01 mitigated)
- `slug.replace(/-/g, '_')` converts URL slug to next-intl namespace key (Pitfall 4 handled)
- `generateStaticParams()` exports all 5 slugs for SSG pre-rendering
- `Link` from `@/i18n/navigation` in breadcrumb (Pitfall 5 handled)
- Renders: breadcrumb / H1 `t('title')` / `palette.bgLight` card / intro / N sections (per SECTION_COUNT map)
- `legal-page.test.tsx`: 9 vitest tests — LEGAL_SLUGS shape, generateStaticParams, i18n parity, slug→namespace conversion, hyphen-key absence

### Task 3: Footer NAV_COL_LEGAL Column
- `NAV_COL_LEGAL` defined after NAV_COL2 with 5 entries using `t('legal.<ns>.navLabel')`
- `ALL_NAV` extended with `...NAV_COL_LEGAL` for mobile single-column list
- 3rd desktop column added inside `Box sx={{ display: 'flex', gap: 8 }}` with same `MuiLink component={Link} sx={navLinkSx}` pattern
- All hrefs use locale-aware `Link` from `@/i18n/navigation`

## Commits

| Hash | Task | Description |
|------|------|-------------|
| 14753f1 | Task 1 | feat(05-ui-01): append legal.* i18n keys EN+TR (43 flat keys) |
| 572c9a2 | Task 2 | feat(05-ui-01): add dynamic legal SSG page + vitest test suite |
| f3093e8 | Task 3 | feat(05-ui-01): add NAV_COL_LEGAL footer column (desktop + mobile) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vitest can't import next-intl due to next/navigation ESM issue**
- **Found during:** Task 2 test execution
- **Issue:** `next-intl` internally imports `next/navigation` without `.js` extension, which vitest ESM resolver rejects ("Did you mean to import next/navigation.js?")
- **Fix:** Added `vi.mock('next-intl', ...)`, `vi.mock('next/navigation', ...)`, and `vi.mock('@/i18n/navigation', ...)` at the top of `legal-page.test.tsx` before the page import. Matches the mocking pattern already used in `ProductReviews.test.tsx`.
- **Files modified:** `src/app/[locale]/legal/legal-page.test.tsx`
- **Commit:** 572c9a2

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `[Placeholder — legal text pending]` for all `intro`/`sNBody` keys | messages/en.json, messages/tr.json | D-07: real legal copy deferred to lawyer; intentional stub |

These stubs are intentional per D-07 and do not prevent plan goal (routes exist, pages render, footer links work). Real legal copy to be added by a lawyer before go-live.

## Threat Flags

No new threat surface introduced beyond the plan's threat model.
- T-05-01 (slug tampering): mitigated by LEGAL_SLUGS allowlist + notFound()
- T-05-02 (info disclosure): accepted — static placeholder text, no user data
- T-05-03 (npm installs): N/A — zero new dependencies

## Self-Check: PASSED

- FOUND: src/app/[locale]/legal/[slug]/page.tsx
- FOUND: src/app/[locale]/legal/legal-page.test.tsx
- FOUND: src/components/Footer.tsx (modified)
- FOUND: messages/en.json, messages/tr.json (modified)
- FOUND commit 14753f1 (Task 1 i18n keys)
- FOUND commit 572c9a2 (Task 2 legal page + tests)
- FOUND commit f3093e8 (Task 3 footer column)
