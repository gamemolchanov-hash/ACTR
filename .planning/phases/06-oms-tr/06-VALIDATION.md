---
phase: 06
slug: oms-tr
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Phase 06 is deletion/brand-swap: verification is dominated by **absence-grep gates**,
> **type integrity** (`tsc`), and **i18n key parity**, not new-behavior unit tests.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | `vitest.config.ts` (present) |
| **Quick run command** | `npx tsc --noEmit` (import/type integrity after each deletion) |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | tsc ~15–30s · vitest ~20–40s |

> ⚠️ **`npm run lint` is non-functional** in this repo (no ESLint config; `next lint` prompts
> interactively) — verified by research. Do NOT use lint as a gate. Use `tsc --noEmit` + `vitest run`.
> **Baseline before Phase 6:** `tsc --noEmit` clean; `vitest run` = 141/144 (3 pre-existing
> `server-api.test.ts` failures, unrelated — do not let these mask new regressions).

---

## Sampling Rate

- **After every task commit:** `npx tsc --noEmit` (catches dangling imports from deletions immediately)
- **After every plan wave:** `npx vitest run` (expect ≤3 pre-existing failures; any NEW failure = red)
- **Before `/gsd-verify-work`:** `tsc --noEmit` clean AND `vitest run` at baseline (no new failures)
- **Max feedback latency:** ~40 seconds

---

## Absence-Grep Gates (phase-specific — the core of a deletion phase)

After all removal tasks, each of these MUST return **0 matches** in `src/**` (non-comment):

| Gate | Command (expect 0) | Requirement |
|------|--------------------|-------------|
| BOGO gone | `git grep -n "BOGO HOOK\|promo-bogo\|active_promo" -- src` | CLEAN-01 |
| Reviews gone | `git grep -ni "ProductReviews\|aggregateRating" -- src` | CLEAN-01 |
| CDEK gone | `git grep -ni "cdek\|сдэк" -- src` | CLEAN-01 |
| PayKeeper/RU-pay gone | `git grep -ni "paykeeper\|yandex_money\|webmoney\|qiwi" -- src` | CLEAN-01/02 |
| RU pages gone | `git grep -n "/partners\|/studios" -- src` (routes + nav + sitemap) | CLEAN-01 |
| Bitrix redirects gone | `grep -c "\.php\|ankety\|/personal\|/auth\|categoryMap" next.config.js` → 0 | CLEAN-01 |
| RU socials gone | `git grep -ni "vk\.com\|wildberries\|americancreator_ru" -- src` | CLEAN-02 |
| RU phone/email gone | `git grep -n "757-84-67\|79957578467\|info@american-creator" -- src` | CLEAN-02 |

**Live-code guards (MUST still be present — deletion must NOT remove these):**
- `git grep -n "validatePromo\|PromoValidationResult\|promoCode" -- src` → **still > 0** (CART-06 live promo).
- `/legal/[slug]`, KDV, KVKK consent (Phase 5) untouched.

---

## i18n Parity Gate

- `messages/en.json` and `messages/tr.json` must have **identical key sets** after removals.
- Baseline: 388/388 keys per locale; ~104 keys removed per locale (`promo.*`, `product.reviews*`,
  `studios.*`, `partners.*`, `delivery.cdek*`, `nav.studios`, `nav.partners`).
- Gate: key-count(en) == key-count(tr); no surviving page references a removed key (else next-intl
  throws at render — verify via `tsc`/build + route smoke).

---

## Per-Task Verification Map

*Populated after planning (task IDs assigned). Deletion tasks map to absence-grep gates above;
brand-swap tasks map to presence assertions (TR placeholder strings) + `tsc`.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | CLEAN-01 | — | dead code absent | grep-gate | `git grep -n "BOGO HOOK" -- src` → 0 | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure (vitest + tsc) covers all phase verification — no new framework install.*
- [ ] Record baseline before removals: `npx vitest run` (confirm 141/144) + `npx tsc --noEmit` (clean).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Removed routes 404 | CLEAN-01 | Needs running dev server | `npm run dev`; GET `/tr/partners`, `/tr/studios` → 404 |
| Surviving redirects resolve | CLEAN-01 | Runtime redirect behavior | Hit remaining trailing-slash redirects → 200 on target route |
| Footer/brand render TR placeholders | CLEAN-02 | Visual | Load `/tr`; footer shows TR phone/socials, Visa/MC/Troy icons, no VK/WB |

---

## Validation Sign-Off

- [ ] All removal tasks map to an absence-grep gate (0-match)
- [ ] All brand-swap tasks map to a presence assertion + `tsc`
- [ ] Live-code guards asserted still-present (validatePromo, legal, KDV)
- [ ] i18n EN/TR parity gate green
- [ ] No NEW vitest failures vs 141/144 baseline; `tsc --noEmit` clean
- [ ] `nyquist_compliant: true` set in frontmatter (by nyquist-auditor after execution)

**Approval:** pending
