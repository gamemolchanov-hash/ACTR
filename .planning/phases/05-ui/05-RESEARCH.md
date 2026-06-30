# Phase 5: Комплаенс-UI — Research

**Researched:** 2026-06-30
**Domain:** TR e-commerce compliance UI (KDV display, KVKK/mesafeli satış consents, legal stub pages)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** ARM prices are KDV-inclusive (TR B2C standard). Price labels carry **«KDV Dahil»**.
- **D-02:** Cart/checkout totals show an informational **«KDV (%20)»** breakdown line computed from brutto: `kdv = total - total / 1.20` (round). This is NOT added to total.
- **D-03:** Fixed rate 20%. If ARM later returns a tax field or category rates — revisit (Deferred).
- **D-04:** Two required checkboxes in checkout: (1) **KVKK** consent, (2) **mesafeli satış sözleşmesi + ön bilgilendirme**. Both gate submit — same pattern as Phase 3 register terms-gate.
- **D-05:** Each checkbox links to its legal page (opens new tab).
- **D-06:** 5 legal stub pages under `[locale]`: KVKK aydınlatma, mesafeli satış sözleşmesi, iade/cayma hakkı, gizlilik, kullanım koşulları.
- **D-07:** Pages are stubs — heading + sections + placeholder text. Strings via next-intl (EN+TR). Real legal text deferred.
- **D-08:** Legal page links in footer + next to consent checkboxes in checkout.

### Claude's Discretion
- Exact layout of KDV label/line (where exactly near price / in Order Summary).
- Legal page route slugs (e.g. `/legal/kvkk`, `/legal/mesafeli-satis`, `/legal/iade`, …) — choose consistently.
- Placeholder section structure inside each legal page.
- i18n key namespacing (`legal.*`, `checkout.consent.*`, `price.kdv*`).

### Deferred Ideas (OUT OF SCOPE)
- Real legal text for the 5 pages (from a lawyer) — stubs only here.
- Variable KDV rates (10%/1% for specific categories) — if ARM returns a tax field; fixed 20% for now.
- e-fatura / fiscal documents and other go-live compliance.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-01 | Prices displayed with KDV (VAT 20%) | ARM API has NO tax fields — client computes `kdv = total - total/1.20`; KDV Dahil label on product price; KDV line in Order Summary |
| COMP-02 | KVKK + mesafeli satış/right of return consents + legal stub pages | Two MUI Checkbox gates in checkout step 2; 5 static pages under [locale]/legal/; footer + checkout links |
</phase_requirements>

---

## Summary

Phase 5 is a pure UI/content phase with no new API contracts or data fetching. All changes are additive — new state fields in checkout, new i18n keys, new page routes, and footer link additions.

**KDV (COMP-01):** The ARM storefront API returns no tax fields at all (confirmed: grep across all BFF storefront source found tax/vat only in fulfillment/betapro providers, never in `/public/arm/storefront/*` handlers). Prices are assumed brutto/KDV-inclusive by market convention (TR B2C). The KDV portion is computed client-side: `kdv = Math.round(total - total / 1.20)`. The "KDV Dahil" label goes on the price display; the "KDV (%20): ₺XX" breakdown line goes in Order Summary (informational row, not added to total). `fmtMoney(kdv, currency, bcp47)` handles formatting.

**Consents (COMP-02):** The Phase 3 register page (`login/register/page.tsx`) provides the exact pattern to reuse: `agreed` boolean state, `!isValid` disables submit button, `if (!agreed) return` early exit in submit handler. For checkout, add `agreedKvkk` + `agreedMesafeli` states with identical gating, inserted in `step2Content` before the "Proceed to Payment" button. No Stripe or ARM API changes needed.

**Legal pages (COMP-02):** 5 stub pages at `[locale]/legal/[slug]/page.tsx` (dynamic route — one file, content keyed by slug from messages JSON). Analog: `delivery/page.tsx` (breadcrumb + h1 + bgLight card + sections via `useTranslations`). Footer gets a new "Legal" nav column appended to `NAV_COL2` or as `NAV_COL3`.

**Primary recommendation:** Follow the three-slice approach — (1) KDV label+line, (2) checkout consent gate, (3) 5 legal stub pages + footer links — in that order of dependency (each slice is independent).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| KDV % computation | Browser / Client | — | Pure math from brutto already in client state (`subtotal`, `totalWithShipping`); no server round-trip needed |
| KDV Dahil label on product price | Browser / Client | — | ProductCard / ProductDetail are client components rendering ARM prices |
| KDV breakdown in Order Summary | Browser / Client | — | `orderSummary` JSX block in checkout/page.tsx is client-rendered |
| Consent checkbox state + submit gate | Browser / Client | — | `CheckoutPage` is `'use client'`; `agreedKvkk/agreedMesafeli` are local useState |
| Legal page content | Browser / Client (SSG) | — | Static stub content, no data fetching; Next.js will statically optimize |
| i18n strings (legal/consent/price keys) | Frontend Server (SSR) | Browser | next-intl provides strings via `useTranslations` (client) or `getTranslations` (server) |
| Footer legal links | Browser / Client | — | Footer.tsx is `'use client'` component |

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 14.x | App Router, SSG for legal pages | Already in use |
| @mui/material | 5.x | Checkbox, FormControlLabel, Typography, Link | Already in use — all consent + legal UI |
| next-intl | 3.x | All new EN+TR strings via useTranslations | Already in use |
| react | 18.x | useState for consent booleans | Already in use |

**No new packages required for this phase.** All capability is covered by existing dependencies. [VERIFIED: codebase grep]

### Supporting (existing utilities to reuse)

| Utility | Path | Purpose |
|---------|------|---------|
| `fmtMoney` | `src/lib/money.ts` | Format KDV breakdown amount (supports bcp47 locale arg) |
| `Link` from `@/i18n/navigation` | `src/i18n/navigation.ts` | Locale-aware links to legal pages from footer + checkout |
| `palette` | `src/lib/theme.ts` | Design tokens for consistent styling |

---

## Package Legitimacy Audit

**No new packages installed in this phase.** All UI is built from existing MUI + next-intl already in the project. Audit: N/A.

---

## Architecture Patterns

### System Architecture Diagram

```
[Checkout page — 'use client']
  step2Content
    ├── agreedKvkk state ─────────► Checkbox → link to /legal/kvkk (new tab)
    ├── agreedMesafeli state ──────► Checkbox → link to /legal/mesafeli-satis (new tab)
    └── handleSubmit gate: if (!agreedKvkk || !agreedMesafeli) return

[Order Summary — same page]
  Subtotal row
  KDV (%20) row ─── computed: Math.round(subtotal - subtotal/1.20)
  Shipping row
  TOTAL row

[ProductCard / ProductDetail — client]
  price display
    └── «KDV Dahil» label (small, muted)

[Footer.tsx — 'use client']
  NAV_COL2 (or new NAV_COL_LEGAL)
    └── 5 legal page links

[src/app/[locale]/legal/[slug]/page.tsx — static]
  params.slug → messages key lookup → stub content
  slugs: kvkk | mesafeli-satis | iade | gizlilik | kullanim-kosullari

[messages/en.json + messages/tr.json]
  legal.*          ← 5 pages × (title + sections)
  checkout.consent.*  ← 2 checkbox labels + snack error
  price.kdvDahil, price.kdvLine  ← KDV label/line text
```

### Recommended Project Structure

```
src/app/[locale]/
├── legal/
│   └── [slug]/
│       └── page.tsx          # single dynamic stub page (SSG)
├── checkout/
│   └── page.tsx              # EDIT: add agreedKvkk/agreedMesafeli state + KDV row
src/components/
└── Footer.tsx                # EDIT: add legal nav links
messages/
├── en.json                   # APPEND: legal.*, checkout.consent.*, price.kdv*
└── tr.json                   # APPEND: same keys in real Turkish
```

### Pattern 1: KDV Informational Line in Order Summary

Insert **after** the Subtotal row, **before** the Shipping row in `orderSummary` JSX block (checkout/page.tsx lines ~932–945):

```tsx
// Source: derived from existing Subtotal row pattern in checkout/page.tsx
const kdvAmount = Math.round(subtotal - subtotal / 1.20);

{/* KDV info line — informational only, not added to total */}
<Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
  <Typography sx={{ color: c['40'], ...info }}>
    {t('price.kdvLine')} {/* "KDV (%20):" */}
  </Typography>
  <Typography sx={{ color: c['40'], ...info }}>
    {fmtMoney(kdvAmount, currency)}
  </Typography>
</Stack>
```

Use the `info` style already defined in checkout/page.tsx (`fontWeight: 300, fontSize: 14`), color `c['40']` to distinguish it as informational.

### Pattern 2: «KDV Dahil» Label on Price

```tsx
// Source: derived from ProductCard price display pattern
<Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
  <Typography sx={{ /* price style */ }}>
    {fmtMoney(price, currency)}
  </Typography>
  <Typography sx={{ fontSize: 11, color: c['40'], fontFamily: font }}>
    {t('price.kdvDahil')} {/* "KDV Dahil" */}
  </Typography>
</Box>
```

### Pattern 3: Consent Checkboxes in Checkout Step 2

Based directly on the register page `agreed` pattern (register/page.tsx lines 403–434):

```tsx
// Source: src/app/[locale]/login/register/page.tsx (terms-gate pattern, Phase 3)
// Add to CheckoutPage state:
const [agreedKvkk, setAgreedKvkk] = useState(false);
const [agreedMesafeli, setAgreedMesafeli] = useState(false);

// Gate in handleSubmit (before setSubmitting(true)):
if (!agreedKvkk || !agreedMesafeli) {
  setError(t('checkout.consent.required'));
  return;
}

// Button disabled condition update:
disabled={submitting || !agreedKvkk || !agreedMesafeli}

// JSX — insert before <Button>Proceed to Payment</Button> in step2Content:
<Stack spacing={1} sx={{ mt: 2, mb: 1 }}>
  <FormControlLabel
    control={
      <Checkbox
        checked={agreedKvkk}
        onChange={(e) => setAgreedKvkk(e.target.checked)}
        sx={{ color: c['20'], '&.Mui-checked': { color: c.main } }}
      />
    }
    label={
      <Typography sx={{ ...info, color: c.main }}>
        {t('checkout.consent.kvkkPrefix')}{' '}
        <MuiLink
          component={Link}
          href="/legal/kvkk"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: c.main }}
        >
          {t('checkout.consent.kvkkLink')}
        </MuiLink>
        {t('checkout.consent.kvkkSuffix')}
      </Typography>
    }
    sx={{ alignItems: 'flex-start' }}
  />
  <FormControlLabel
    control={
      <Checkbox
        checked={agreedMesafeli}
        onChange={(e) => setAgreedMesafeli(e.target.checked)}
        sx={{ color: c['20'], '&.Mui-checked': { color: c.main } }}
      />
    }
    label={
      <Typography sx={{ ...info, color: c.main }}>
        {t('checkout.consent.mesafeliPrefix')}{' '}
        <MuiLink component={Link} href="/legal/mesafeli-satis" target="_blank" rel="noopener noreferrer" sx={{ color: c.main }}>
          {t('checkout.consent.mesafeliLink')}
        </MuiLink>
        {' '}{t('checkout.consent.mesafeliSuffix')}
      </Typography>
    }
    sx={{ alignItems: 'flex-start' }}
  />
</Stack>
```

### Pattern 4: Legal Stub Page (dynamic route)

```tsx
// Source: derived from delivery/page.tsx structure
// File: src/app/[locale]/legal/[slug]/page.tsx
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';

const LEGAL_SLUGS = ['kvkk', 'mesafeli-satis', 'iade', 'gizlilik', 'kullanim-kosullari'] as const;
type LegalSlug = typeof LEGAL_SLUGS[number];

export default function LegalPage({ params }: { params: { slug: string } }) {
  if (!LEGAL_SLUGS.includes(params.slug as LegalSlug)) notFound();
  const t = useTranslations(`legal.${params.slug.replace(/-/g, '_')}`);
  // Render: breadcrumb + h1 + bgLight card + section headings + placeholder paragraphs
}

// generateStaticParams for SSG:
export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}
```

**Note on key namespacing:** next-intl key names cannot contain hyphens as part of the namespace path. Use underscores: `legal.mesafeli_satis.*`, `legal.kullanim_kosullari.*`. The slug itself remains hyphenated in the URL.

### Pattern 5: Footer Legal Links

```tsx
// Source: src/components/Footer.tsx — append to NAV_COL2 or add NAV_COL_LEGAL
const NAV_COL_LEGAL = [
  { label: t('legal.kvkk.navLabel'), href: '/legal/kvkk' },
  { label: t('legal.mesafeli_satis.navLabel'), href: '/legal/mesafeli-satis' },
  { label: t('legal.iade.navLabel'), href: '/legal/iade' },
  { label: t('legal.gizlilik.navLabel'), href: '/legal/gizlilik' },
  { label: t('legal.kullanim_kosullari.navLabel'), href: '/legal/kullanim-kosullari' },
];
```

### Anti-Patterns to Avoid

- **KDV double-counting:** Do NOT add `kdvAmount` to the total. The KDV line is purely informational — the total already includes KDV. Only display the extracted amount.
- **Blocking Stripe with consent check:** Consent state must be evaluated in `handleSubmit` BEFORE `createOrder` is called, not after. Gate the order creation, not just the button.
- **Hardcoded TR legal strings:** All label/heading text must go through `useTranslations` — even placeholder text. Never hardcode Turkish strings in JSX.
- **hyphen in next-intl namespace path:** `useTranslations('legal.mesafeli-satis')` will fail. Use `legal.mesafeli_satis` as the message namespace key, hyphen only in the URL slug.
- **Forgetting `generateStaticParams`:** Without it the dynamic `[slug]` legal page will be server-rendered on each request. Add `generateStaticParams` to get SSG.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checkbox consent UI | Custom toggle/gate component | MUI `Checkbox` + `FormControlLabel` | Already used in register — consistent pattern |
| KDV % calculation | Tax service / API call | `Math.round(total - total / 1.20)` | ARM returns no tax field; fixed 20% rate by decision D-03 |
| Locale-aware money format | Custom number formatter | `fmtMoney(amount, currency, bcp47)` — `src/lib/money.ts` | Already exists, handles TRY formatting correctly |
| Legal page routing | Custom slug resolver | Next.js dynamic `[slug]` + `generateStaticParams` | Framework provides SSG for known slugs |
| i18n message interpolation | Manual string concat | `t('key', { rate: 20 })` via next-intl | Avoids untranslatable fragments |

---

## Common Pitfalls

### Pitfall 1: KDV Double-Count
**What goes wrong:** Developer adds `kdvAmount` to the displayed total, making prices appear 20% higher.
**Why it happens:** Confusing "informational breakdown" with "additional tax added at checkout" (EU-style tax-exclusive pricing model).
**How to avoid:** The KDV line appears in the summary between Subtotal and Shipping but is NOT included in the TOTAL computation. Comment the code: `// informational only — prices are already KDV-inclusive`.
**Warning signs:** `totalWithShipping` computation changes; TOTAL row shows more than Subtotal+Shipping.

### Pitfall 2: Consent State Not Persisted Across Step Navigation
**What goes wrong:** User agrees, goes back to step 1 to edit address, returns to step 2 — checkboxes are unchecked (useState resets don't survive re-mount if component remounts).
**Why it happens:** `CheckoutPage` is a single component — `useState` persists across step changes since the component doesn't unmount. This is safe as-is. But if the component is ever split, add consent to sessionStorage.
**How to avoid:** Keep consent state in the top-level `CheckoutPage` component (same level as `step`). Do NOT move checkboxes into a child component that could unmount.
**Warning signs:** Checkboxes appear unchecked after `setStep(1)` → `setStep(2)`.

### Pitfall 3: Consent Gate Only on Button, Not in handleSubmit
**What goes wrong:** User bypasses disabled button via keyboard submit or programmatic trigger; order is created without consent.
**How to avoid:** Always check `if (!agreedKvkk || !agreedMesafeli) return` at the TOP of `handleSubmit`, even though button is also disabled.

### Pitfall 4: next-intl Namespace Hyphen Error
**What goes wrong:** `useTranslations('legal.mesafeli-satis')` — next-intl may fail or silently return empty strings because hyphen is not a valid namespace separator character.
**How to avoid:** Message keys use underscores: `legal.mesafeli_satis.title`. URL slugs keep hyphens: `/legal/mesafeli-satis`.

### Pitfall 5: Legal Pages Missing from Locale Routing
**What goes wrong:** `/en/legal/kvkk` works but `/legal/kvkk` (without locale) 404s — users from footer links without locale prefix get a 404.
**Why it happens:** All pages live under `[locale]` in App Router; the middleware redirects `/legal/*` → `/en/legal/*`. This is the existing behavior for all pages.
**How to avoid:** Use `Link` from `@/i18n/navigation` (not `next/link`) for all legal page links in footer and checkout — it prepends the active locale automatically.

---

## Code Examples

### KDV Computation
```typescript
// Source: D-02 decision + standard TR VAT formula
// kdv is the tax portion ALREADY included in the brutto price
const kdvAmount = Math.round(total - total / 1.20);
// E.g., total = 1000 TRY → kdv = 1000 - 833.33 = 166.67 → rounded = 167 TRY
```

### i18n Keys to Append (EN base)
```json
// Append to messages/en.json
{
  "price": {
    "kdvDahil": "KDV Dahil",
    "kdvLine": "KDV (%20):"
  },
  "checkout": {
    "consent": {
      "kvkkPrefix": "I have read and agree to the",
      "kvkkLink": "KVKK Clarification Text",
      "kvkkSuffix": "regarding processing of my personal data.",
      "mesafeliPrefix": "I have read and accept the",
      "mesafeliLink": "Distance Sales Agreement and Pre-Information Form",
      "mesafeliSuffix": "(14-day right of return applies).",
      "required": "Please accept both consent checkboxes to place your order."
    }
  },
  "legal": {
    "kvkk": {
      "navLabel": "KVKK",
      "title": "KVKK Clarification Text",
      "intro": "[Placeholder — legal text pending]",
      "s1Title": "Data Controller",
      "s1Body": "[Placeholder]",
      "s2Title": "Processed Data",
      "s2Body": "[Placeholder]",
      "s3Title": "Purpose of Processing",
      "s3Body": "[Placeholder]",
      "s4Title": "Your Rights",
      "s4Body": "[Placeholder]"
    },
    "mesafeli_satis": {
      "navLabel": "Mesafeli Satış",
      "title": "Mesafeli Satış Sözleşmesi",
      "intro": "[Placeholder — legal text pending]",
      "s1Title": "Parties",
      "s1Body": "[Placeholder]",
      "s2Title": "Subject",
      "s2Body": "[Placeholder]",
      "s3Title": "Right of Return (14 days)",
      "s3Body": "[Placeholder — 14-day withdrawal right per TR law]"
    },
    "iade": {
      "navLabel": "İade / Cayma",
      "title": "Return & Right of Withdrawal",
      "intro": "[Placeholder — legal text pending]",
      "s1Title": "14-Day Right of Withdrawal",
      "s1Body": "[Placeholder]",
      "s2Title": "Return Conditions",
      "s2Body": "[Placeholder]",
      "s3Title": "Refund Process",
      "s3Body": "[Placeholder]"
    },
    "gizlilik": {
      "navLabel": "Gizlilik",
      "title": "Privacy Policy",
      "intro": "[Placeholder — legal text pending]",
      "s1Title": "Data We Collect",
      "s1Body": "[Placeholder]",
      "s2Title": "How We Use Your Data",
      "s2Body": "[Placeholder]"
    },
    "kullanim_kosullari": {
      "navLabel": "Kullanım Koşulları",
      "title": "Terms of Use",
      "intro": "[Placeholder — legal text pending]",
      "s1Title": "Acceptance of Terms",
      "s1Body": "[Placeholder]",
      "s2Title": "Use of Service",
      "s2Body": "[Placeholder]"
    }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Single terms checkbox (Phase 3 register) | Two consent checkboxes in checkout (KVKK + mesafeli) | Both required; same MUI+useState pattern extended |
| No legal pages | 5 stub pages under `[locale]/legal/[slug]` | Dynamic route + generateStaticParams = SSG |
| No KDV display | KDV Dahil label + informational KDV line in Order Summary | Client-computes from brutto; informational only |

**No deprecated approaches in scope.** This phase introduces new UI slices, not refactors.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ARM storefront API returns brutto/KDV-inclusive prices (no tax field) | KDV computation | If ARM later returns `tax_amount`, the client-computed line could differ. Mitigated by D-03 (fixed 20%) and Deferred note. Risk: low for MVP. |
| A2 | 20% is the correct KDV rate for nail/cosmetics products in TR | KDV computation | TR KDV rates: 1%/10%/20%. Nail gel products are classifiable under 20% (general). If reclassified, only the fixed rate constant changes. Risk: low. |

---

## Open Questions

1. **KDV Dahil label on ProductCard vs ProductDetail only?**
   - What we know: D-01 says "prices have a KDV Dahil label" — doesn't specify which views.
   - What's unclear: Should it appear on every price occurrence (card, detail, basket, Order Summary header) or only in product detail + Order Summary?
   - Recommendation: Add to ProductCard price display + ProductDetail price + Order Summary subtotal label (skip individual item prices in Order Summary as they're already in the total context).

2. **Legal pages: separate column in footer or appended to existing nav?**
   - What we know: Footer has NAV_COL1 (catalog/new/studios/partners) and NAV_COL2 (contacts/delivery/faq). Adding 5 links to NAV_COL2 makes it long.
   - Recommendation: Add `NAV_COL_LEGAL` as a third column on desktop; append to single-column mobile list. Discretion area per CONTEXT.md.

3. **Mesafeli satış ön bilgilendirme — one page or two?**
   - What we know: D-06 says "mesafeli satış sözleşmesi" as one of 5 pages. D-04 groups "mesafeli satış sözleşmesi + ön bilgilendirme" as one consent.
   - Recommendation: One page (`/legal/mesafeli-satis`) covering both the contract and the pre-information form sections. Two slugs would require two checkboxes split — one combined page satisfies D-04's combined consent.

---

## Environment Availability

Step 2.6: No new external dependencies. All tooling (Node, Next.js, npm) already confirmed working from Phase 4. Skipped detailed probe.

| Dependency | Available | Notes |
|------------|-----------|-------|
| Node.js / npm | ✓ | Phase 4 verified |
| Next.js 14 dev server | ✓ | `npm run dev` :3003 |
| ARM demo-BFF | ✓ | `make up` :4000 (Phase 4 verified) |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest + React Testing Library (existing, from Phase 3/4 test files) |
| Config file | `jest.config.js` (root) |
| Quick run command | `npm test -- --testPathPattern="legal\|kdv\|consent" --passWithNoTests` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | `kdvFromBrutto(1000)` returns 167 (TRY 1000 → 20% portion) | unit | `npm test -- --testPathPattern="kdv"` | ❌ Wave 0 |
| COMP-01 | Order Summary renders «KDV (%20)» row with correct amount | unit (RTL) | `npm test -- --testPathPattern="checkout\|summary"` | ❌ Wave 0 |
| COMP-01 | ProductCard renders «KDV Dahil» text | unit (RTL) | `npm test -- --testPathPattern="ProductCard"` | ❌ Wave 0 |
| COMP-02 | Checkout submit blocked when consent unchecked | unit (RTL) | `npm test -- --testPathPattern="checkout"` | ❌ Wave 0 |
| COMP-02 | Checkout submit allowed when both consents checked | unit (RTL) | `npm test -- --testPathPattern="checkout"` | ❌ Wave 0 |
| COMP-02 | Legal page renders stub heading for each slug | unit (RTL) | `npm test -- --testPathPattern="legal"` | ❌ Wave 0 |
| COMP-02 | Footer contains links to all 5 legal pages | unit (RTL) | `npm test -- --testPathPattern="Footer"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern="kdv\|legal\|consent\|checkout" --passWithNoTests`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/kdv.test.ts` — unit tests for `kdvFromBrutto` pure function (REQ COMP-01)
- [ ] `src/app/[locale]/checkout/checkout-consent.test.tsx` — consent gate behavior (REQ COMP-02)
- [ ] `src/app/[locale]/legal/legal-page.test.tsx` — stub render for each slug (REQ COMP-02)
- [ ] `src/components/Footer.test.tsx` — legal link presence (REQ COMP-02)

**Recommendation:** Extract KDV computation into a pure utility function `kdvFromBrutto(gross: number, rate = 0.20): number` in `src/lib/kdv.ts` — makes unit testing trivial and avoids duplicating the formula in multiple price display components.

---

## Security Domain

`security_enforcement: true`, ASVS level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Consent checkboxes don't touch auth |
| V3 Session Management | No | No new session logic |
| V4 Access Control | No | Legal pages are public; no auth required |
| V5 Input Validation | No | No user input processed (checkboxes = boolean state) |
| V6 Cryptography | No | No crypto operations |

### Specific Security Notes

- **Consent checkboxes are client-side UI only** — they gate the `createOrder` call in `handleSubmit`. If someone bypasses the JS client and calls `POST /arm/orders` directly, the order is created without consent. This is acceptable for MVP (the API doesn't enforce consent at the BFF level). Pre-go-live: consider passing `kvkk_accepted: true` in the order payload for server-side audit trail.
- **Legal pages are static public content** — no user data, no auth, no XSS risk from placeholder text (it's hardcoded via next-intl JSON, not user-supplied).
- **`target="_blank"` on consent links** — always include `rel="noopener noreferrer"` (prevents tab-napping). Pattern shown in code examples above.

---

## Sources

### Primary (HIGH confidence)
- `src/app/[locale]/checkout/page.tsx` — complete checkout flow, Order Summary JSX, step gating pattern [VERIFIED: codebase]
- `src/app/[locale]/login/register/page.tsx` — exact terms-gate pattern (agreed state, isValid, handleSubmit guard) [VERIFIED: codebase]
- `src/components/Footer.tsx` — NAV_COL1/COL2 structure, Link usage [VERIFIED: codebase]
- `src/app/[locale]/delivery/page.tsx` — legal page analog structure (breadcrumb + bgLight card) [VERIFIED: codebase]
- `src/lib/money.ts` — fmtMoney signature [VERIFIED: codebase]
- `messages/en.json` — 357 existing keys, namespace structure [VERIFIED: codebase]
- ARM BFF grep — no `tax`/`kdv`/`vat` in storefront routes, only in fulfillment providers [VERIFIED: grep /home/lexun/work/autoCRM]

### Secondary (MEDIUM confidence)
- TR KDV rate 20% for general/cosmetics category [ASSUMED — standard TR tax knowledge; D-03 locks this at 20% regardless]
- KVKK legal minimum (two-checkbox pattern: aydınlatma + açık rıza) [ASSUMED — TR legal convention, confirmed by CONTEXT.md decisions D-04/D-05]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing packages, no new deps
- Architecture: HIGH — direct codebase reading of all integration points
- KDV computation: HIGH — confirmed no ARM tax field; formula is standard TR VAT inversion
- Consent gate: HIGH — identical to Phase 3 register pattern already in codebase
- Legal pages: HIGH — delivery page provides exact structural analog
- TR legal compliance minimum: MEDIUM — based on convention; real legal text deferred to lawyer

**Research date:** 2026-06-30
**Valid until:** 2026-07-30 (stable — no external dependencies change this)
