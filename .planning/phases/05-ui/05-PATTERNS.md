# Phase 5: Комплаенс-UI — Pattern Map

**Mapped:** 2026-06-30
**Files analyzed:** 13 (3 new, 10 edits)
**Analogs found:** 13 / 13

---

## File Classification

| New/Modified File | Flag | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `src/lib/kdv.ts` | NEW | utility | transform | `src/lib/money.ts` | role-match |
| `src/lib/kdv.test.ts` | NEW | test | transform | `src/components/__tests__/` | role-match |
| `src/app/[locale]/legal/[slug]/page.tsx` | NEW | page (SSG) | request-response | `src/app/[locale]/delivery/page.tsx` | exact |
| `src/app/[locale]/checkout/page.tsx` | EDIT | page (client) | request-response | self (lines 344–345, 757–838, 931–969) | self |
| `src/components/ProductCard.tsx` | EDIT | component | request-response | self (lines 133–145) | self |
| `src/components/ProductDetail.tsx` | EDIT | component | request-response | self (line 735) | self |
| `src/components/Footer.tsx` | EDIT | component | request-response | self (lines 64–77, 110–137) | self |
| `messages/en.json` | EDIT | config/i18n | — | self (existing namespace structure) | self |
| `messages/tr.json` | EDIT | config/i18n | — | self | self |

---

## Pattern Assignments

### `src/lib/kdv.ts` (NEW — utility, transform)

**Analog:** `src/lib/money.ts`

**Imports pattern** (`src/lib/money.ts` lines 1–23 — full file):
```typescript
// money.ts shows the pure-function export style with JSDoc + fallback
export function fmtMoney(amount: number, currency?: string, locale?: string): string { ... }
```

**Core pattern** — new file should follow same style:
```typescript
/**
 * Extract KDV (Turkish VAT) portion from a KDV-inclusive (brutto) price.
 * TR B2C prices are KDV-inclusive by law (D-01, D-03).
 *
 * @param gross  - KDV-inclusive price (brutto)
 * @param rate   - KDV rate as decimal, default 0.20 (20%, fixed per D-03)
 * @returns      KDV portion rounded to nearest integer (whole TRY kuruş-free)
 */
export function kdvFromBrutto(gross: number, rate = 0.20): number {
  return Math.round(gross - gross / (1 + rate));
}
```

No imports needed — pure math. Export named (not default), matching `money.ts` style.

---

### `src/lib/kdv.test.ts` (NEW — test)

**Analog:** check existing test files
```
src/components/__tests__/   (Phase 3/4 Jest + RTL tests)
```

**Core pattern** — plain Jest unit test for pure function:
```typescript
import { kdvFromBrutto } from '@/lib/kdv';

describe('kdvFromBrutto', () => {
  it('extracts 20% KDV from 1000 TRY → 167', () => {
    expect(kdvFromBrutto(1000)).toBe(167);
  });
  it('returns 0 for zero amount', () => {
    expect(kdvFromBrutto(0)).toBe(0);
  });
  it('accepts custom rate', () => {
    expect(kdvFromBrutto(1000, 0.10)).toBe(91);
  });
});
```

Run: `npm test -- --testPathPattern="kdv" --passWithNoTests`

---

### `src/app/[locale]/legal/[slug]/page.tsx` (NEW — page, SSG)

**Analog:** `src/app/[locale]/delivery/page.tsx` (full file, 314 lines)

**Imports pattern** (`delivery/page.tsx` lines 1–6):
```typescript
'use client';

import { Box, Typography } from '@mui/material';
import { Link } from '@/i18n/navigation';   // ← locale-aware Link (REQUIRED for legal hrefs)
import { palette } from '@/lib/theme';
import { useTranslations } from 'next-intl';
```

For legal page add `notFound` from `next/navigation`:
```typescript
import { notFound } from 'next/navigation';
```

**Core pattern** — breadcrumb + h1 + bgLight card (delivery lines 19–45 + 48–57):
```tsx
export default function LegalPage({ params }: { params: { slug: string } }) {
  const LEGAL_SLUGS = ['kvkk','mesafeli-satis','iade','gizlilik','kullanim-kosullari'] as const;
  if (!LEGAL_SLUGS.includes(params.slug as typeof LEGAL_SLUGS[number])) notFound();

  // KEY: hyphens → underscores for next-intl namespace (Pitfall 4)
  const nsKey = params.slug.replace(/-/g, '_') as string;
  const t = useTranslations(`legal.${nsKey}`);

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* Breadcrumb — delivery/page.tsx lines 19–33 */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 4 } }}>
        <Typography sx={{ fontFamily: '"Open Sans", sans-serif', fontSize: 13, color: palette.primaryLight, mb: 0.5 }}>
          <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {/* t('breadcrumbHome') pattern from delivery */}
            Home
          </Link>
          {' / '}
        </Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 40 }, lineHeight: { xs: '30px', md: '50px' }, fontWeight: 450 }}>
          {t('title')}
        </Typography>
      </Box>

      {/* Content card — delivery lines 48–57 bgLight card pattern */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 3, md: 4 }, mb: { xs: 4, md: 8 } }}>
        <Box sx={{ bgcolor: palette.bgLight, borderRadius: '20px', p: { xs: 3, md: 5 } }}>
          <Typography sx={{ fontFamily: '"Futura PT", Helvetica', fontSize: 18, color: palette.primary, mb: 2 }}>
            {t('intro')}
          </Typography>
          {/* Section pairs: t('s1Title') + t('s1Body'), t('s2Title') + t('s2Body'), … */}
        </Box>
      </Box>
    </Box>
  );
}

// SSG — pre-render all 5 slugs at build time (avoids per-request server render)
export function generateStaticParams() {
  return ['kvkk','mesafeli-satis','iade','gizlilik','kullanim-kosullari'].map((slug) => ({ slug }));
}
```

**Typography style tokens** from `delivery/page.tsx` lines 74–87:
```typescript
// Section heading
sx={{ fontFamily: '"Futura PT", Helvetica', fontSize: 24, fontWeight: 450, lineHeight: '31px', color: palette.primary, textTransform: 'uppercase' }}
// Body paragraph
sx={{ fontFamily: '"Futura PT", Helvetica', fontSize: 18, fontWeight: 450, lineHeight: '21px', color: palette.primary, mt: 2 }}
```

---

### `src/app/[locale]/checkout/page.tsx` — KDV row (EDIT)

**Self-analog:** `src/app/[locale]/checkout/page.tsx`

**Insertion point:** `orderSummary` block lines 931–961. Insert KDV row **after Subtotal (line 935), before Discount check (line 936)**:

```tsx
// Line 201 area — add derived value near finalTotal:
const kdvAmount = kdvFromBrutto(finalTotal);  // import { kdvFromBrutto } from '@/lib/kdv'

// In orderSummary JSX, after line 935 (Subtotal row close), before line 936:
<Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
  <Typography sx={{ color: c['40'], ...info }}>
    {t('price.kdvLine')}  {/* "KDV (%20):" */}
  </Typography>
  <Typography sx={{ color: c['40'], ...info }}>
    {fmtMoney(kdvAmount, currency)}
  </Typography>
</Stack>
{/* informational only — price is already KDV-inclusive (D-01) */}
```

**Style reference** — `info` constant already defined at line 71:
```typescript
const info = { fontFamily: font, fontWeight: 300, fontSize: 14, lineHeight: '14px' } as const;
```
Color `c['40']` (muted) distinguishes the KDV line from the primary `c.main` rows.

---

### `src/app/[locale]/checkout/page.tsx` — consent gate (EDIT)

**Self-analog:** `src/app/[locale]/checkout/page.tsx` + `src/app/[locale]/login/register/page.tsx`

**Register analog — state + gate** (register lines 87, 154, 190, 407–440):
```typescript
// register/page.tsx line 87
const [agreed, setAgreed] = useState(false);
// line 154
if (!agreed) { setError(...); return; }
// line 190
const isValid = name && email && ... && agreed;
// line 440
disabled={loading || !isValid}
```

**Checkout adaptation** — add to `CheckoutPage` state block (near line 182):
```typescript
const [agreedKvkk, setAgreedKvkk] = useState(false);
const [agreedMesafeli, setAgreedMesafeli] = useState(false);
```

**Gate in `handleSubmit`** — insert at top of function (line 345, before `setSubmitting(true)`):
```typescript
if (!agreedKvkk || !agreedMesafeli) {
  setError(t('checkout.consent.required'));
  return;
}
```

**Button disabled** — checkout button at line 831:
```tsx
// BEFORE:
disabled={submitting}
// AFTER:
disabled={submitting || !agreedKvkk || !agreedMesafeli}
```

**Checkbox JSX** — insert in `step2Content` (line 757+), before the `<Button>` at line 828. Copy MUI pattern from register lines 404–434:
```tsx
// register/page.tsx lines 404–434 — exact MUI Checkbox+FormControlLabel+Link pattern
<FormControlLabel
  control={
    <Checkbox
      checked={agreed}
      onChange={(e) => setAgreed(e.target.checked)}
      sx={{ color: palette.primaryLight, '&.Mui-checked': { color: palette.primary } }}
    />
  }
  label={
    <Typography sx={{ fontFamily: fontMain, fontSize: { xs: 13, md: 15 }, color: palette.primary }}>
      I agree to the{' '}
      <Link href="/terms" style={{ color: palette.primary }}>Terms of Service</Link>
      {' '}and{' '}
      <Link href="/privacy" style={{ color: palette.primary }}>Privacy Policy</Link>
    </Typography>
  }
  sx={{ mb: 1, alignItems: 'flex-start' }}
/>
```

Checkout uses `c.main` / `c['20']` (not `palette.primary`) and `Link` from `@/i18n/navigation` with `target="_blank" rel="noopener noreferrer"`. Two `FormControlLabel` blocks: one for KVKK (`/legal/kvkk`), one for mesafeli (`/legal/mesafeli-satis`).

**Checkout imports to add:**
```typescript
import { kdvFromBrutto } from '@/lib/kdv';
// Checkbox already used in checkout via RadioGroup — add to MUI import if not present:
import { ..., Checkbox, FormControlLabel } from '@mui/material';
```

---

### `src/components/ProductCard.tsx` — KDV Dahil label (EDIT)

**Self-analog:** `src/components/ProductCard.tsx` lines 133–145

**Current price block** (lines 133–145):
```tsx
<Box sx={{ px: 2, pb: 2 }}>
  {/* Price — locale-aware (WR-01/WR-05) */}
  <Typography
    sx={{ fontSize: 16, fontWeight: 400, color: palette.primary, mb: '12px', textAlign: 'center' }}
  >
    {fmtMoney(product.price, 'TRY', bcp47)}
  </Typography>
```

**Edit:** Wrap price + add label below (or inline baseline):
```tsx
<Box sx={{ px: 2, pb: 2 }}>
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: '12px' }}>
    <Typography sx={{ fontSize: 16, fontWeight: 400, color: palette.primary }}>
      {fmtMoney(product.price, 'TRY', bcp47)}
    </Typography>
    <Typography sx={{ fontSize: 11, color: palette.primaryLight, fontFamily: '"Futura PT", Helvetica' }}>
      {t('price.kdvDahil')}
    </Typography>
  </Box>
```

**Add import** (if not already present):
```typescript
import { useTranslations } from 'next-intl';
// in component:
const t = useTranslations();
```

---

### `src/components/ProductDetail.tsx` — KDV Dahil label (EDIT)

**Self-analog:** `src/components/ProductDetail.tsx` line 735

**Current:**
```tsx
<Typography variant="h1">{fmtMoney(product.price, 'TRY', bcp47)}</Typography>
```

**Edit:** Add label below price `Typography`:
```tsx
<Typography variant="h1">{fmtMoney(product.price, 'TRY', bcp47)}</Typography>
<Typography sx={{ fontSize: 12, color: palette.primaryLight, fontFamily: '"Futura PT", Helvetica', mt: 0.5 }}>
  {t('price.kdvDahil')}
</Typography>
```

Same `useTranslations` import pattern as ProductCard.

---

### `src/components/Footer.tsx` — NAV_COL_LEGAL (EDIT)

**Self-analog:** `src/components/Footer.tsx` lines 64–77 (NAV_COL1/COL2 definition) and lines 110–137 (desktop column render).

**Current NAV_COL structure** (lines 64–77):
```typescript
const NAV_COL1 = [
  { label: t('nav.catalog'), href: '/catalog' },
  ...
];
const NAV_COL2 = [
  { label: t('nav.contacts'), href: '/contacts' },
  { label: 'Delivery & Payment', href: '/delivery' },
  { label: 'FAQ', href: '/faq' },
];
const ALL_NAV = [...NAV_COL1, ...NAV_COL2]; // mobile flat list
```

**Add after NAV_COL2:**
```typescript
const NAV_COL_LEGAL = [
  { label: t('legal.kvkk.navLabel'),              href: '/legal/kvkk' },
  { label: t('legal.mesafeli_satis.navLabel'),     href: '/legal/mesafeli-satis' },
  { label: t('legal.iade.navLabel'),               href: '/legal/iade' },
  { label: t('legal.gizlilik.navLabel'),           href: '/legal/gizlilik' },
  { label: t('legal.kullanim_kosullari.navLabel'), href: '/legal/kullanim-kosullari' },
];
const ALL_NAV = [...NAV_COL1, ...NAV_COL2, ...NAV_COL_LEGAL]; // extend mobile list
```

**Desktop column render** — add 3rd column after NAV_COL2 block (lines 124–136), same pattern:
```tsx
{/* Desktop nav columns — lines 110–137 */}
<Box sx={{ display: 'flex', gap: 8 }}>
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    {NAV_COL1.map((item) => (
      <MuiLink key={item.href} component={Link} href={item.href} underline="none" sx={navLinkSx}>
        {item.label}
      </MuiLink>
    ))}
  </Box>
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    {NAV_COL2.map(...)}
  </Box>
  {/* NEW: 3rd column */}
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    {NAV_COL_LEGAL.map((item) => (
      <MuiLink key={item.href} component={Link} href={item.href} underline="none" sx={navLinkSx}>
        {item.label}
      </MuiLink>
    ))}
  </Box>
</Box>
```

Mobile: `ALL_NAV` already extended above — no additional JSX change needed.

---

### `messages/en.json` + `messages/tr.json` — append keys (EDIT)

**Self-analog:** existing namespace structure in both files.

**Keys to append** (full EN block from RESEARCH.md lines 358–432):
```json
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
    "kvkk": { "navLabel": "KVKK", "title": "KVKK Clarification Text", "intro": "[Placeholder — legal text pending]", "s1Title": "Data Controller", "s1Body": "[Placeholder]", "s2Title": "Processed Data", "s2Body": "[Placeholder]", "s3Title": "Purpose of Processing", "s3Body": "[Placeholder]", "s4Title": "Your Rights", "s4Body": "[Placeholder]" },
    "mesafeli_satis": { "navLabel": "Mesafeli Satış", "title": "Mesafeli Satış Sözleşmesi", "intro": "[Placeholder — legal text pending]", "s1Title": "Parties", "s1Body": "[Placeholder]", "s2Title": "Subject", "s2Body": "[Placeholder]", "s3Title": "Right of Return (14 days)", "s3Body": "[Placeholder — 14-day withdrawal right per TR law]" },
    "iade": { "navLabel": "İade / Cayma", "title": "Return & Right of Withdrawal", "intro": "[Placeholder — legal text pending]", "s1Title": "14-Day Right of Withdrawal", "s1Body": "[Placeholder]", "s2Title": "Return Conditions", "s2Body": "[Placeholder]", "s3Title": "Refund Process", "s3Body": "[Placeholder]" },
    "gizlilik": { "navLabel": "Gizlilik", "title": "Privacy Policy", "intro": "[Placeholder — legal text pending]", "s1Title": "Data We Collect", "s1Body": "[Placeholder]", "s2Title": "How We Use Your Data", "s2Body": "[Placeholder]" },
    "kullanim_kosullari": { "navLabel": "Kullanım Koşulları", "title": "Terms of Use", "intro": "[Placeholder — legal text pending]", "s1Title": "Acceptance of Terms", "s1Body": "[Placeholder]", "s2Title": "Use of Service", "s2Body": "[Placeholder]" }
  }
}
```

**TR keys** (`messages/tr.json`): same structure, real Turkish labels for `navLabel`/`title`/`kdvDahil`/`kdvLine`/consent labels; `intro`/`sNBody` remain placeholder.

**CRITICAL — key namespace rule** (RESEARCH Pitfall 4): URL slug `mesafeli-satis` → message key `mesafeli_satis` (underscore). Hyphens in next-intl namespace paths fail silently.

---

## Shared Patterns

### `Link` from `@/i18n/navigation` — REQUIRED for all legal hrefs
**Source:** `src/components/Footer.tsx` line 4; `src/app/[locale]/delivery/page.tsx` line 4
**Apply to:** Footer NAV_COL_LEGAL, checkout consent checkboxes, legal page breadcrumb
```typescript
import { Link } from '@/i18n/navigation';
// NOT: import Link from 'next/link'
// Reason: locale-aware — prepends /en/ or /tr/ automatically (Pitfall 5)
```

### `palette` design tokens
**Source:** `src/lib/theme.ts`
**Apply to:** All new/edited UI
- `palette.primary` — main text/heading color
- `palette.primaryLight` — muted labels (KDV Dahil, breadcrumb)
- `palette.bgLight` — card background (legal pages, order summary)
- `palette.footerText` — footer nav links
- `c['40']` (checkout local alias for muted) — KDV info line color

### `useTranslations` usage
**Source:** Every existing component
**Apply to:** All new/edited files
```typescript
// Client components:
const t = useTranslations();            // root namespace (Footer pattern)
const t = useTranslations('legal.kvkk'); // scoped (legal page)
// Server components / generateMetadata:
const t = await getTranslations('legal.kvkk');
```

### MUI `Checkbox + FormControlLabel` pattern
**Source:** `src/app/[locale]/login/register/page.tsx` lines 404–434
**Apply to:** checkout consent checkboxes (two instances)
- `sx={{ alignItems: 'flex-start' }}` on `FormControlLabel` — required when label is multiline
- `&.Mui-checked: { color: c.main }` — matches project color scheme
- `target="_blank" rel="noopener noreferrer"` — mandatory on all consent links

---

## No Analog Found

All files have analogs. No gaps.

---

## Anti-Patterns (from RESEARCH.md — pass to planner)

| Anti-Pattern | File | Consequence |
|---|---|---|
| `useTranslations('legal.mesafeli-satis')` | legal page | next-intl silent failure — use `legal.mesafeli_satis` |
| Add `kdvAmount` to TOTAL | checkout | Double-counts VAT — KDV line is informational only |
| Check consent only on button `disabled` | checkout | Bypassed by keyboard submit — must also check in `handleSubmit` |
| `import Link from 'next/link'` | footer, checkout | No locale prefix — `/legal/kvkk` 404s without `/en/` |
| Omit `generateStaticParams` | legal page | Per-request SSR instead of SSG |

---

## Metadata

**Analog search scope:** `src/app/[locale]/`, `src/components/`, `src/lib/`, `messages/`
**Files scanned:** 9 source files read directly
**Pattern extraction date:** 2026-06-30
