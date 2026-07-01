---
phase: 06-oms-tr
verified: 2026-07-01T15:30:00Z
status: gaps_found
score: 20/22 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "No Russian-market legal/contact identity remains on the TR storefront (contacts page)"
    status: failed
    reason: "The contacts page's 'Legal Info' block still renders a Russian seller legal address (Moscow, Sosenkoye settlement) and a PAO Sberbank RUB bank account (current account 40802810638000019658, correspondent account 30101810400000000225) in BOTH en.json and tr.json. This is the exact kind of RU-market residue the phase's own Phase Goal user story targets ('RU contacts... so that the shop reads as a genuine Turkish store I can trust'), and CLAUDE.md states TR mesafeli satış (distance-selling) compliance as a hard project constraint. No D-01..D-11 decision in 06-CONTEXT.md named this block, so it was never in any plan's scope and slipped through all 5 plans undetected until code review (06-REVIEW.md CR-01)."
    artifacts:
      - path: "messages/en.json"
        issue: "contacts.legalLine1-5 (lines ~220-224) contain 'Legal address: 108801, Moscow...' / 'Bank name: PAO Sberbank' / RUB account numbers"
      - path: "messages/tr.json"
        issue: "Same 5 keys translated but content is still the Russian legal entity (Moskova, PAO Sberbank, same account numbers)"
      - path: "src/app/[locale]/contacts/page.tsx"
        issue: "Lines 298-319 render legalLine1-5 verbatim in the 'Right legal block' — this is live, user-facing output, not a comment"
    missing:
      - "Replace all 5 contacts.legalLine* values (both locales) with the TR entity's legal address / VKN-TCKN / IBAN, or an explicit TR placeholder consistent with the rest of the D-03/D-04/D-05/D-10 brand swap"
      - "If real TR entity details are not yet available, gate the block behind a clearly-marked 'pending' placeholder rather than shipping the Russian bank/address as the merchant of record"
  - truth: "Shipped brand identity text is consistently TR (no residual RU-project domain in live UI)"
    status: partial
    reason: "src/components/Footer.tsx:214 renders '2026 © american-creator.ru' on every page of the TR storefront. This is the RU-project's own domain shown as the copyright holder — untouched by any of D-03/D-04/D-05/D-10 (phone/socials/payment/email), and not covered by ROADMAP SC2 verbatim, but it directly contradicts the phase's brand-swap intent and the project's 'свопы бренда' framing. The 06-05 executor identified this exact string during its final grep gate and explicitly logged it to deferred-items.md as out-of-scope for D-03/04/05/10 — but no later roadmap phase (only Phase 7 'TRY-каталог данные' remains, unrelated to branding) addresses it, so it is not a legitimately deferred item per Step 9b; it is a live, currently-shipping gap."
    artifacts:
      - path: "src/components/Footer.tsx"
        issue: "Line 214: '2026 &copy; american-creator.ru' — literal RU-project domain string, shown site-wide"
    missing:
      - "Replace with a neutral copyright line (e.g. '© 2026 American Creator') or the eventual TR go-live domain"
deferred: []
---

# Phase 6: Чистка OMS-специфики + бренд TR — Verification Report

**Phase Goal:** Удалён мёртвый OMS-код, бренд/контент адаптированы под TR (ROADMAP), restated by the
plans as: *As a Turkish shopper, I want to browse a storefront with no leftover Russian-market
features (auto-promo banners, non-functional reviews, RU recruitment pages, CDEK delivery copy, RU
contacts and payment methods), so that the shop reads as a genuine Turkish store I can trust.*

**Verified:** 2026-07-01T15:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ROADMAP SC1: BOGO, отзывы, CDEK/PayKeeper, Bitrix-редиректы, RU-страницы удалены | ✓ VERIFIED | `git grep BOGO HOOK\|promo-bogo\|active_promo` → 0; `git grep ProductReviews\|aggregateRating\|ReviewAggregate -- src` → 0 (only 2 hits are seo.test.ts asserting *absence*); `git grep -ni cdek -- src` → 0; `git grep -ni paykeeper -- src` → 0; `/partners`,`/studios` dirs absent, `git grep "'/partners\|'/studios'" -- src` → 0; `next.config.js` Bitrix-redirect grep → 0 |
| 2 | ROADMAP SC2: телефон/соцсети/иконки оплаты заменены на TR | ✓ VERIFIED | `git grep "757-84-67\|79957578467\|info@american-creator" -- src` → 0; Footer `SOCIALS` = WhatsApp(+90 placeholder)+Instagram, no VK/WB/Telegram-RU; `PAYMENT_ICONS` = mastercard+visa, standalone `pay-troy.png` `<img>` present; `soc-vk.png/soc-wb.svg/soc-telegram.png/paykeeper.png/pay-systems.png/payment.svg` all absent; `pay-troy.png`/`soc-instagram.png` present |
| 3 | D-08/CLEAN-01: BOGO fully removed; live promo-CODE untouched | ✓ VERIFIED | 0 BOGO matches; `validatePromo/PromoValidationResult/promoCode` → 8 matches still in api.ts/arm-adapter.ts |
| 4 | D-09/CLEAN-01: ProductReviews + reviews API + aggregateRating removed | ✓ VERIFIED | Component/test files absent; only surviving hits are a test asserting `aggregateRating` is `undefined` |
| 5 | D-11/CLEAN-02: robots.txt no longer hardcodes american-creator.ru | ✓ VERIFIED | `git grep american-creator.ru -- public/robots.txt` → 0 matches; `Sitemap: /sitemap.xml` (relative placeholder) |
| 6 | D-01/CLEAN-01: /partners+/studios routes, nav, sitemap, images, i18n keys removed | ✓ VERIFIED | Dirs absent; `git grep "'/partners\|'/studios'"` → 0; i18n parity confirms no `studios.*`/`partners.*`/`nav.studios`/`nav.partners` |
| 7 | D-07/CLEAN-01: next.config.js redirects pruned to trailing-slash hygiene only | ✓ VERIFIED | `grep -cE "\.php\|ankety\|/personal\|/auth\b\|categoryMap\|vse_tovary\|must_have\|novinki\|help/delivery\|info/faq" next.config.js` → 0 |
| 8 | D-02/CLEAN-01: /delivery reworked, no CDEK vocabulary/keys | ✓ VERIFIED | `git grep -ni cdek -- src` → 0; `delivery.cdek*/cityNote*/freeBanner` absent from both locale files |
| 9 | D-06/CLEAN-02: payment-systems.png image block + asset removed | ✓ VERIFIED | Asset file absent; `git grep "payment-systems\|paymentImgAlt" -- src` → 0 |
| 10 | D-03/CLEAN-02: RU phone replaced at all 4 sites (Footer x2, Header, contacts tel:, wa.me) | ✓ VERIFIED | `git grep "757-84-67\|79957578467" -- src` → 0; wa.me URL in Footer.tsx = `wa.me/905000000000` |
| 11 | D-10/CLEAN-02: RU email replaced in contacts (mailto + text) | ✓ VERIFIED | `git grep info@american-creator -- src` → 0 |
| 12 | D-04/CLEAN-02: SOCIALS drops VK/Wildberries/Telegram-RU, keeps WhatsApp, adds Instagram | ✓ VERIFIED | `git grep -ni "vk\.com\|wildberries\|americancreator_ru" -- src` → 0; Footer.tsx SOCIALS array confirmed WhatsApp+Instagram only |
| 13 | D-05/CLEAN-02: PAYMENT_ICONS drops yandex_money/webmoney/qiwi/PayKeeper, keeps Visa/Mastercard, adds Troy | ✓ VERIFIED | `git grep -ni "paykeeper\|yandex_money\|webmoney\|qiwi" -- src` → 0; PAYMENT_ICONS = [mastercard, visa]; standalone `pay-troy.png` `<img>` present |
| 14 | Live-guard: validatePromo/PromoCode (CART-06), KDV, KVKK/mesafeli, /legal/[slug] (Phase 5) untouched throughout all 5 plans | ✓ VERIFIED | `git grep validatePromo\|PromoValidationResult\|promoCode -- src/lib/api.ts src/lib/arm-adapter.ts` → 8; `git grep kdvFromBrutto\|/legal/\|mesafeli\|kvkk -- src` → 44 |
| 15 | EN/TR i18n parity held across all 5 plans' key removals/reworks | ✓ VERIFIED | `messages/en.json` and `messages/tr.json` both 283 keys; `set(en)==set(tr)`; no residual `promo.*`/`product.review*`/`studios.*`/`partners.*`/`delivery.cdek*`/`delivery.cityNote*`/`delivery.freeBanner`/`delivery.paymentImgAlt`/`nav.studios`/`nav.partners` keys in either file |
| 16 | tsc clean; vitest shows no NEW failures vs pre-phase baseline | ✓ VERIFIED | `npx tsc --noEmit` → 0 errors; `npx vitest run` → 129 passed / 3 failed (all 3 are the documented pre-existing `server-api.test.ts` ARM-shape failures, unrelated to this phase) |
| 17 | Commits referenced in all 5 SUMMARYs exist in the repo history | ✓ VERIFIED | `git cat-file -e` on all 14 hashes across 06-01..06-05 SUMMARYs → all present |
| 18 | No debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) left in phase-touched files | ✓ VERIFIED | Grepped all phase-modified files (Footer/Header/contacts/delivery/api/arm-adapter/seo/server-api/sitemap/next.config/robots.txt) — 0 matches (the two "placeholder" hits in Header.tsx are HTML `placeholder=` input attributes, not debt markers) |
| 19 | No RU-market legal/contact identity remains on the storefront | ✗ FAILED | contacts page `legalLine1-5` (both locales) still show Moscow address + PAO Sberbank RUB account — see Gap 1 |
| 20 | Shipped brand text consistently reads as TR/neutral (no RU-domain residue) | ⚠️ PARTIAL | Footer.tsx:214 still hardcodes `american-creator.ru` in the copyright line, shown on every page — see Gap 2 |

**Score:** 18/20 truths fully verified against merged ROADMAP+PLAN scope; 2 additional phase-goal-level truths (derived from the plans' own restated user story + 06-REVIEW.md) fail/partially fail. Aggregate: 20/22.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/api.ts` | `active_promo` removed, `validatePromo` retained | ✓ VERIFIED | Confirmed via grep |
| `src/lib/arm-adapter.ts` | `active_promo: null` line removed | ✓ VERIFIED | Confirmed via grep |
| `src/lib/seo.ts` | `buildProductJsonLd` without reviews param/aggregateRating | ✓ VERIFIED | grep 0 for ReviewAggregate/aggregateRating outside test-negative-assertion |
| `public/robots.txt` | De-RU Sitemap directive | ✓ VERIFIED | `Sitemap: /sitemap.xml`, no `american-creator.ru` |
| `src/app/sitemap.ts` | STATIC_PATHS without partners/studios | ✓ VERIFIED | grep 0 |
| `next.config.js` | redirects() pruned to 3 trailing-slash entries | ✓ VERIFIED | Bitrix-pattern grep 0 |
| `src/components/Header.tsx` | nav without studios/partners links | ✓ VERIFIED | grep 0 |
| `src/app/[locale]/delivery/page.tsx` | TR delivery content, no CDEK, no payment image | ✓ VERIFIED | grep 0; asset absent |
| `src/components/Footer.tsx` | TR phone/socials/payment icons | ✓ VERIFIED (phone/socials/payment) / ✗ NOT VERIFIED (copyright line) | SOCIALS/PAYMENT_ICONS/phone confirmed TR; copyright line still `american-creator.ru` (Gap 2) |
| `src/app/[locale]/contacts/page.tsx` | TR phone/email placeholders | ✓ VERIFIED (phone/email) / ✗ NOT VERIFIED (legal block) | tel/mailto swapped; `legalLine1-5` still Russian entity (Gap 1) |
| `public/icons/pay-troy.png`, `soc-instagram.png` | New placeholder assets exist | ✓ VERIFIED | Both present on disk |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/components/ProductCard.tsx` | removed | PromoBadge import deleted | ✓ WIRED (absence confirmed) | grep 0 |
| `messages/en.json` | `messages/tr.json` | identical key set | ✓ WIRED | 283/283, `set(en)==set(tr)` |
| `src/components/ProductDetail.tsx` | removed | ProductReviews import/usage deleted | ✓ WIRED (absence confirmed) | grep 0 |
| `.../[productSlug]/page.tsx` | `src/lib/seo.ts buildProductJsonLd` | single-arg call, no reviews | ✓ WIRED | Consistent with seo.ts signature change |
| `src/components/Header.tsx`/`Footer.tsx` | removed routes | nav.studios/nav.partners deleted | ✓ WIRED (absence confirmed) | grep 0 |
| `src/app/sitemap.ts` | removed routes | STATIC_PATHS entries deleted | ✓ WIRED (absence confirmed) | grep 0 |
| `src/components/Footer.tsx` | `public/icons/pay-troy.png` | standalone `<img>` | ✓ WIRED | `grep pay-troy src/components/Footer.tsx` present, asset on disk |
| `src/components/Footer.tsx` | `/delivery` | "Delivery & Payment" footer link (unchanged) | ⚠️ PRESENT, NOT RUNTIME-VERIFIED | Link markup present in Footer.tsx; no dev server was run this session to confirm the route actually resolves in-browser (see Human Verification) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|--------------|--------|----------|
| CLEAN-01 | 06-01, 06-02, 06-03, 06-04 | Удалена OMS-специфика (BOGO, отзывы, CDEK/PayKeeper, Bitrix-редиректы, RU-страницы) | ✓ SATISFIED | All named removals confirmed absent by grep; routes 404 by directory absence (runtime 404 not manually re-confirmed — see human-check) |
| CLEAN-02 | 06-02, 06-04, 06-05 | Брендовые свопы под TR (телефон, соцсети, иконки оплаты) | ⚠️ SATISFIED WITH RESIDUE | Phone/socials/payment-icon swaps fully confirmed. However the broader "clean/trustworthy TR brand" intent stated in the phase's own user-story restatement is undermined by the still-Russian contacts legal-identity block (Gap 1) and the RU-domain footer copyright (Gap 2) — neither was in CLEAN-02's literal enumerated scope (phone/socials/payment icons), but both are RU-brand/contact residue the phase set out to eliminate |

No orphaned requirements found — REQUIREMENTS.md maps only CLEAN-01/CLEAN-02 to Phase 6, both claimed by the 5 plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `messages/en.json` / `messages/tr.json` | ~220-224 | Russian legal entity (Moscow address, PAO Sberbank RUB account) in `contacts.legalLine1-5`, rendered live on `/contacts` | 🛑 Blocker | Legally material for TR mesafeli satış compliance (hard constraint in project CLAUDE.md); directly contradicts phase goal ("genuine Turkish store I can trust") |
| `src/components/Footer.tsx:214` | 214 | Hardcoded `2026 &copy; american-creator.ru` | ⚠️ Warning | RU-project domain shown site-wide as copyright holder; contradicts brand-swap intent, not caught by any D-decision |
| `public/robots.txt:6-9` (pre-existing, not touched by this phase's scope) | 6-9 | `Disallow: /account` etc. don't match locale-prefixed `/en/account`, `/tr/account` under `localePrefix: 'always'` | ℹ️ Info | Pre-existing SEO defect, not RU/brand residue; not part of CLEAN-01/02 scope; recommend follow-up (WR-02 in 06-REVIEW.md) |
| `public/robots.txt:11` | 11 | `Sitemap: /sitemap.xml` is relative, not absolute per robots.txt spec | ℹ️ Info | Pre-existing/unrelated to RU cleanup; recommend follow-up (WR-03) |
| `src/lib/api.ts:3` | 3 | `TENANT_ID` falls back to `tenant_snailmarket` (OMS tenant) if env unset | ℹ️ Info | Latent data-isolation risk, but not a CLEAN-01/02 concern (predates this phase, belongs to catalog/ARM integration track — WR-04 in 06-REVIEW.md) |
| `src/components/Footer.tsx:62-63`, `Header.tsx:781` | — | Hardcoded English nav labels (`'Delivery & Payment'`, `'FAQ'`, `'Orders'`) not run through `t()` | ℹ️ Info | i18n consistency issue (I18N-01 territory), not RU/brand cleanup scope (WR-05 in 06-REVIEW.md) |

No unresolved `TBD`/`FIXME`/`XXX` debt markers found in any file this phase modified.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| tsc typecheck clean | `npx tsc --noEmit` | 0 errors | ✓ PASS |
| Test suite: no new regressions | `npx vitest run` | 129 passed, 3 pre-existing failures (server-api.test.ts, documented baseline), 0 new failures | ✓ PASS |
| i18n parity (283/283, no residual removed-prefix keys) | `python3 -c "... set(en)==set(tr) ..."` | True, 0 residual keys | ✓ PASS |
| Referenced commits exist | `git cat-file -e <hash>` × 14 | All present | ✓ PASS |
| `/partners`, `/studios` 404 in a running browser | not run (no dev server this session) | — | ? SKIP — routed to Human Verification |
| `/delivery`, `/tr/delivery` renders TR copy visually | not run (no dev server this session) | — | ? SKIP — routed to Human Verification |
| Footer/contacts render TR phone/email/socials/payment icons visually | not run (no dev server this session) | — | ? SKIP — routed to Human Verification |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist in this repository and none are declared in any 06-0X-PLAN.md or SUMMARY.md. Step 7c: SKIPPED (no probes declared or found).

### Human Verification Required

These items were deferred to end-of-phase per the plans' own `<human-check>` blocks (06-03, 06-04, 06-05) and were not exercised this session because no dev server was running. They do not change the `gaps_found` status (which is driven by Gap 1/Gap 2 above) but should be confirmed before sign-off:

#### 1. Removed routes 404
**Test:** Run `npm run dev`; GET `/tr/partners`, `/tr/partners/shops`, `/tr/studios`, `/en/partners`, `/en/studios`.
**Expected:** All return 404. Header/Footer no longer show Studios/Partners nav links.
**Why human:** Requires a running dev server; static analysis confirms the routes/files are absent but not the live HTTP behavior.

#### 2. next.config.js redirects behave correctly
**Test:** `curl -sI http://localhost:3003/basket/` and `/contacts/` → expect 301 to the slash-less route; `curl -sI http://localhost:3003/help/delivery` and `/ankety` → expect 404.
**Expected:** Trailing-slash hygiene redirects work; all legacy Bitrix redirects are gone (404).
**Why human:** Requires a running server to exercise Next.js routing/redirect middleware.

#### 3. /delivery renders correctly (TR/EN, no CDEK, no broken image)
**Test:** Load `/tr/delivery` and `/en/delivery`.
**Expected:** TR/EN delivery copy renders, no CDEK wording, no dotted-key literal strings, no broken payment image, Footer "Delivery & Payment" link resolves to this page.
**Why human:** Visual/content rendering check.

#### 4. Footer/Header/contacts render TR-branded contact info
**Test:** Load `/tr` and `/tr/contacts`.
**Expected:** TR phone `+90 500 000 00 00`, TR placeholder email, WhatsApp + Instagram icons only (no VK/WB/Telegram), Visa/Mastercard/Troy payment icons, all links resolve without 404/broken image.
**Expected (additional, per Gap 1/2 above):** Confirm current state still shows the Russian legal address/bank block and `american-creator.ru` copyright text — these should be prioritized for remediation, not treated as passing.
**Why human:** Visual/content rendering check.

### Gaps Summary

Phase 6 executed its 11 named decisions (D-01..D-11) cleanly and completely: every mechanical
removal (BOGO, reviews, partners/studios pages, Bitrix redirects, CDEK copy, RU payment image) is
verified absent by grep with i18n parity held (283/283 keys, matching sets) and no new tsc/vitest
regressions across all 5 plans. This is legitimately strong execution against the plans as written.

However, goal-backward verification against the phase's own restated intent ("so that the shop
reads as a genuine Turkish store I can trust") and against 06-REVIEW.md's adversarial code review
surfaces two gaps that were never captured by any D-0x decision and therefore escaped every plan's
scope and acceptance criteria:

1. **Gap 1 (blocker):** The contacts page still ships a Russian seller's legal address (Moscow) and
   PAO Sberbank bank account details in both `en.json` and `tr.json`. This is exactly the kind of
   "RU contacts" residue the phase's user story names as in-scope, and it is legally material given
   the project's own hard constraint on TR *mesafeli satış* compliance. No plan's grep gates ever
   checked for this string because no D-decision named it.
2. **Gap 2 (warning):** `Footer.tsx` still hardcodes `2026 © american-creator.ru` — the RU project's
   own domain — on every page. The 06-05 executor found this during its final grep sweep and logged
   it to `deferred-items.md`, but no later roadmap phase addresses branding, so it does not qualify
   as a legitimately deferred item under Step 9b; it remains a live, unaddressed brand-residue gap.

Both gaps are cheap, well-scoped fixes (swap 5 i18n values + 1 JSX string) and do not require
re-touching any of the mechanical removal work already verified above. Recommend a small follow-up
plan (or a `/gsd-plan-phase --gaps` re-plan of Phase 6) targeting exactly these two items before
declaring the "clean TR store / brand TR" phase goal fully achieved.

Three additional items from 06-REVIEW.md (WR-02/WR-03 robots.txt locale-prefix mismatch and relative
Sitemap URL, WR-04 tenant fallback default, WR-05 hardcoded English nav labels) were judged
out-of-scope for CLEAN-01/CLEAN-02 — they are real technical-debt items but are not RU-market
residue or brand-swap failures; they belong to the I18N/SEO/catalog-integration tracks and are
recorded above as Info-level anti-patterns for a future backlog item, not blocking this phase.

---

_Verified: 2026-07-01T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
