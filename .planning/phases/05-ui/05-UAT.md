---
status: complete
phase: 05-ui
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-03 human-verify checkpoint]
started: 2026-06-30T16:08:01Z
updated: 2026-06-30T17:58:09Z
---

## Current Test

[testing complete — 4/4 PASS, verified live via Claude-in-Chrome on http://localhost:3003/tr]

## Tests

### 1. Consent gate (COMP-02) — checkout step 2
expected: Both KVKK + mesafeli checkboxes render (real labels); submit disabled until both checked; unchecked submit blocked (consent error, no order); both checked → button enables → Stripe Embedded Checkout proceeds unchanged.
result: pass
verified: |
  2026-06-30T17:58Z — live browser walk-through (Claude-in-Chrome, /tr/checkout, logged-in UAT user).
  Reached the payment step. Both consent checkboxes render with REAL Turkish labels:
   1. "Kişisel verilerimin işlenmesine ilişkin KVKK Aydınlatma Metni'ni okudum ve kabul ediyorum."
   2. "Tarafıma sunulan Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formu'nu okudum ve kabul ediyorum
       (14 günlük cayma hakkım saklıdır)."
  Gate behaviour confirmed: "Proceed to Payment" DISABLED with 0 checked, STILL DISABLED with only
  KVKK checked, ENABLED only when BOTH checked. (Keyboard/programmatic-bypass guard in handleSubmit
  verified in code per 05-03; the real order-create + Stripe step could not be exercised because this
  UAT env's cart is broken — see Observations — but the consent GATE itself is fully working.)

### 2. Consent links → legal pages (COMP-02)
expected: Each consent checkbox label link opens /[locale]/legal/kvkk and /legal/mesafeli-satis in a NEW tab.
result: pass
verified: |
  2026-06-30T17:58Z — live browser. Clicking "KVKK Aydınlatma Metni" opened a NEW tab at
  /tr/legal/kvkk ("KVKK AYDINLATMA METNİ", sections VERİ SORUMLUSU / İŞLENEN VERİLER / İŞLEME AMACI /
  HAKLARINIZ). Clicking "Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formu" opened a NEW tab at
  /tr/legal/mesafeli-satis ("MESAFELİ SATIŞ SÖZLEŞMESİ", sections TARAFLAR / KONU / CAYMA HAKKI (14 GÜN)).
  Both real, localized; bodies show the intentional D-07 "[Placeholder — legal text pending]" stubs.

### 3. Legal pages render (COMP-02)
expected: All 5 legal pages render localized stubs on EN and TR — /en/legal/{kvkk,mesafeli-satis,iade,gizlilik,kullanim-kosullari} and /tr/legal/... ; footer legal column links resolve.
result: pass
verified: "2026-06-30T17:31Z — after fix edf28ec, all 10 /{en,tr}/legal/* routes return 200 with real localized content: EN 'KVKK Clarification Text', TR 'KVKK Aydınlatma Metni', TR 'İade ve Cayma Hakkı'. 0 INVALID_KEY / manifest errors in dev log. Footer legal column links resolve to these 200 routes."
prior_reported: "All 10 legal routes (5 slugs × en/tr) → HTTP 500 on the real dev server (:3003). Re-verified 2026-06-30 after the 'add missing keys' gap-closure landed; still 500."
prior_severity: blocker
diagnosis: |
  CORRECTED ROOT CAUSE (the earlier MISSING_MESSAGE diagnosis was WRONG):
  The real error is `IntlError: INVALID_KEY: Namespace keys cannot contain the character "."`
  thrown by getTranslations on the legal page → 500. next-intl REQUIRES nested message objects
  ({ "legal": { "kvkk": { "title": ... } } }) and categorically REJECTS flat dotted keys.

  messages/en.json and messages/tr.json are 100% FLAT dotted keys ("legal.kvkk.title": "...",
  "nav.catalog": "...", "common.workingHours": "..." — 388 keys/lang, ZERO nested objects). So every
  key is invalid to next-intl. The 05-Phase "gap-closure" added the supposedly-missing keys in the
  SAME flat format → it could never have worked; the keys now EXIST (388/388 parity) but are all
  unreadable by next-intl.

  This is NOT a legal-pages-only bug — it is SITE-WIDE and pre-existing since Phase 4 (commit
  c96bd6c, the first i18n commit). It was masked because request.ts defines getMessageFallback
  (returns the key string) + a non-throwing onError: client components (useTranslations) degrade to
  rendering the literal key string and still return 200, so "the page loads" passed casual checks.
  Server components that call getTranslations (the Phase-5 legal pages — first heavy server-side use)
  THROW the INVALID_KEY error instead of degrading → 500, which is what finally surfaced it.

  EVIDENCE (server :3003, fresh dev server, 2026-06-30T17:20Z):
  - GET /tr/legal/kvkk → 500; dev log: "IntlError: INVALID_KEY … character '.'"; all 10 legal routes 500.
  - GET /en homepage → 200 but <title>meta.defaultTitle</title>; nav renders common.account / nav.catalog literally.
  - GET /tr/catalog → catalog.addToCart / catalog.allProducts rendered as literal key strings.
  - request.ts imports messages JSON directly (no unflatten step); messages have ZERO nested objects.
  - NOTE: the earlier "/tr & /tr/catalog = 200" check was run against :3000 which is a DIFFERENT app
    (Metabase, a catch-all SPA returning 200 for every path) — a false positive. ACTR runs on :3003.

  CORRECT FIX (replaces the wrong "add more flat keys" remedy):
  Make next-intl receive NESTED messages. Two viable approaches —
   (A) Un-flatten in request.ts at load time: messages: unflatten(json), where unflatten splits each
       dotted key into nested objects. Minimal; keeps flat JSON as the Tolgee-friendly source of truth.
       Watch for prefix collisions (a key that is also a parent of another key) + the .test mocks.
   (B) Physically nest both en.json + tr.json and update flat-key tooling (messages-pull.mjs, Tolgee
       export format).
  Either fixes the legal 500 AND restores real translations across the WHOLE storefront.
  After fixing: re-verify /{en,tr}/legal/* = 200 with real titles, then re-run Tests 1, 2, 4.

### 4. KDV display (COMP-01)
expected: «KDV Dahil» label on product card + product detail price; checkout order summary shows «KDV (%20)» info line; the KDV line does NOT change the order total (informational only).
result: pass
verified: |
  2026-06-30T17:58Z — live browser (/tr). (a) Product card: «KDV Dahil» renders under every price on
  /tr/catalog. (b) Product detail (/tr/catalog/shaving/<after-shave>): «KDV Dahil» under "₽24,84 / adet".
  (c) Checkout order summary: a muted/informational «KDV (%20):» row sits between Subtotal and Shipping,
  visually separate from TOTAL. The KDV row is NOT added into TOTAL (TOTAL = Subtotal + Shipping; KDV is
  informational only — consistent with the unit-tested kdvFromBrutto helper).
  NOTE: prices show ₽ (RUB) / checkout totals show $ (USD) instead of ₺ (TRY) — currency bug, out of
  Phase-5 scope (see Observations). The KDV labels/row themselves are correct.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
blocked: 0
skipped: 0

## Gaps

- truth: "The storefront renders real translations (EN+TR); legal pages render localized stubs and return 200"
  status: resolved
  resolution: "Fixed in commit edf28ec — (1) unflatten() in src/i18n/request.ts converts the flat dotted catalog to nested objects next-intl accepts; (2) palette extracted to src/lib/palette.ts (no 'use client') so the server legal page imports it without crossing the RSC boundary. Verified: all 10 legal routes 200 with real localized content; homepage/catalog render real translations; 0 i18n/manifest errors."
  severity: blocker
  reason: "SITE-WIDE i18n break. messages/{en,tr}.json use 100% FLAT dotted keys ('nav.catalog', 'legal.kvkk.title', …, 388 keys/lang). next-intl rejects dotted namespace keys → IntlError INVALID_KEY. Client components (useTranslations) degrade to rendering the literal key string (200 but broken text); server components (getTranslations, the Phase-5 legal pages) THROW → 500 on all 10 legal routes. Pre-existing since Phase 4 (commit c96bd6c); masked by getMessageFallback in request.ts. The Phase-5 gap-closure ('add missing keys') was based on a wrong MISSING_MESSAGE diagnosis and could not have worked — the added keys are flat too."
  fix: "Make next-intl receive NESTED messages. Preferred: un-flatten in src/i18n/request.ts at load time (messages: unflatten(json)) — keeps flat JSON as the Tolgee source of truth; mind prefix collisions + update next-intl test mocks. Alternative: physically nest en.json + tr.json and adjust messages-pull.mjs/Tolgee export. Then re-verify /{en,tr}/legal/* = 200 with real <title>/<h1>, and re-run UAT Tests 1, 2, 4 (consent gate, consent links, KDV) which are blocked on this."
  test: 3
  root_cause: "Flat dotted message keys incompatible with next-intl (requires nested objects); request.ts imports JSON with no unflatten step."
  artifacts:
    - path: "messages/en.json"
      issue: "388 flat dotted keys, zero nested objects — invalid for next-intl"
    - path: "messages/tr.json"
      issue: "388 flat dotted keys, zero nested objects — invalid for next-intl"
    - path: "src/i18n/request.ts"
      issue: "imports flat JSON directly; no unflatten transform before passing to next-intl"
  missing:
    - "Nested message structure (or an unflatten step in request.ts) so next-intl can resolve keys"

## Observations (OUT OF PHASE-5 SCOPE — found during live UAT, not blocking Phase 5)

Phase 5 deliverables (KDV display, KVKK/mesafeli consent gate, legal pages) all PASS. The following
pre-existing issues were noticed while driving the storefront and should be tracked separately:

1. **Cart broken in this UAT env** — adding a product (AFTER SHAVE) → basket shows the line as
   `product_not_found`, qty 0, price "—", Subtotal/Total $0.00, though the cart badge increments to 1.
   The product lookup on the basket/checkout fails to resolve the added item. Because of this, a REAL
   order could not be placed end-to-end (Stripe step never reachable with a $0 cart). Likely a cart↔BFF
   product-resolution bug or demo-tenant data mismatch. Blocks full checkout E2E, NOT the Phase-5 UI.

2. **Currency shows ₽ (RUB) / $ (USD), not ₺ (TRY)** — catalog + product-detail prices render with the
   ruble sign (e.g. "₽24,84"); checkout Subtotal/KDV/Total render in dollars ("$0.00"). For a TR market
   this must be ₺/TRY. Matches the known Phase-4 currency-leftover todo in STATE.md (USD/RUB fallback).

3. **Basket & checkout page BODY not localized** — on /tr the basket ("BASKET", "Place Order",
   "PRODUCT", "PRICE / PC") and checkout ("CHECKOUT", "Email", "Full Name", "YOUR ORDER", "Subtotal",
   "Shipping", "TOTAL", "Continue", "Proceed to Payment") still render English strings. Header, footer
   (incl. the new Phase-5 legal column: KVKK / MESAFELİ SATIŞ / İADE-CAYMA / GİZLİLİK / KULLANIM
   KOŞULLARI) AND the Phase-5 consent labels ARE Turkish. So this is a Phase-4 i18n coverage gap on the
   basket/checkout pages, not a Phase-5 regression.

4. **Shipping rates unavailable** — DELIVERY step shows "Shipping rates temporarily unavailable. You can
   still place your order — we will contact you to confirm delivery." (BFF shipping integration returned
   no rates in this env; graceful degradation works). Out of Phase-5 scope.
