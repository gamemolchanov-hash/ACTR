# Phase 6: OMS-TR Cleanup + Brand Swap - Pattern Map

**Mapped:** 2026-07-01
**Nature of phase:** DELETION + BRAND-SWAP (not new-feature). No new components are introduced.
This map targets (1) the two genuinely reworked artifacts (payment-icon rendering, `/delivery`
content) where an in-repo analog materially helps the planner, and (2) the edit/delete surface
for every file in RESEARCH.md's verified consumer graph, so the planner can sequence deletions
without leaving dangling imports.

## File Classification

| File | Role | Data Flow | Action | Closest Analog | Match Quality |
|------|------|-----------|--------|-----------------|----------------|
| `src/components/Footer.tsx` | component | request-response (static render) | EDIT (SOCIALS, PAYMENT_ICONS, phone, nav links) | itself (edit-in-place; icon-render sub-pattern below) | n/a — edit target |
| `src/components/Header.tsx` | component | request-response | EDIT (remove nav.studios/partners, phone) | itself | n/a — edit target |
| `src/app/[locale]/contacts/page.tsx` | component (page) | request-response | EDIT (phone, email placeholders) | `Footer.tsx` phone block (shares literal string) | exact (same string, same swap) |
| `src/app/[locale]/delivery/page.tsx` | component (page) | transform (static content) | REWRITE (drop CDEK_OPTIONS, TR copy, payment image) | `src/app/[locale]/faq/page.tsx` | exact — same static-content page shape (breadcrumb+title+content block, `useTranslations('<namespace>')`, MUI `Box`/`Typography`, no data fetching) |
| `src/features/promo-bogo/**` (4 files) | component/utility | event-driven (banner/badge) | DELETE (whole dir) | n/a | n/a — deletion, no analog needed |
| `src/components/ProductCard.tsx` | component | CRUD (renders catalog item) | EDIT (remove BOGO HOOK block, lines ~13-15,43-45) | n/a | n/a — edit target |
| `src/app/[locale]/{page.tsx,catalog/page.tsx,catalog/[slug]/page.tsx}` | route/page | request-response | EDIT (remove BOGO HOOK import+usage) | n/a | n/a — edit target |
| `src/lib/api.ts` | service | CRUD/request-response | EDIT (remove `active_promo` field + reviews interfaces/fns; KEEP `validatePromo`/`PromoValidationResult`/`promoCode`) | n/a | n/a — edit target, isolation-critical |
| `src/lib/arm-adapter.ts` | service (transform) | transform | EDIT (remove `active_promo: null` line) | n/a | n/a — edit target |
| `src/components/ProductReviews.tsx` + `__tests__/ProductReviews.test.tsx` | component + test | request-response | DELETE (whole files) | n/a | n/a — deletion |
| `src/components/ProductDetail.tsx` | component | request-response | EDIT (remove `<ProductReviews/>` import+usage) | n/a | n/a — edit target |
| `src/lib/seo.ts` | utility | transform (JSON-LD builder) | EDIT (remove `ReviewAggregate` interface, `reviews` param, `aggregateRating` block) | n/a | n/a — edit target |
| `src/lib/seo.test.ts` | test | — | EDIT (delete aggregateRating test, trim reviews-arg assertions) | n/a | n/a — edit target |
| `src/lib/server-api.ts` | service | request-response (server-side fetch) | EDIT (remove `fetchProductReviewAggregateServer` + import) | n/a | n/a — edit target |
| `src/app/[locale]/catalog/[slug]/[productSlug]/page.tsx` | route/page | request-response | EDIT (drop reviews fetch + JSON-LD 2nd arg) | n/a | n/a — edit target |
| `src/app/[locale]/partners/**` (4 files), `src/app/[locale]/studios/page.tsx` | route/page | request-response | DELETE (whole dirs) | n/a | n/a — deletion |
| `src/app/sitemap.ts` | config/route | transform (static path list) | EDIT (drop partners/studios from `STATIC_PATHS`, `sitemap.ts:28-32`) | n/a | n/a — edit target (one-line-per-entry diff) |
| `next.config.js` | config | request-response (redirects) | EDIT (prune `categoryMap`, `.php`, `/personal*`, `/auth*`, `/ankety*`, `/help/delivery`, `/info/faq`; keep trailing-slash hygiene) | n/a | n/a — edit target |
| `messages/{en,tr}.json` | config | transform (i18n dictionary) | EDIT (remove ~104 keys/locale: `promo.*`, `product.reviews*`, `studios.*`, `partners.*`, `nav.studios`, `nav.partners`, `delivery.cdek*`) | n/a | n/a — edit target, must keep EN/TR parity |
| `public/robots.txt` | config/static | transform | EDIT per D-11 (RU domain → placeholder; update `seo.test.ts:240` in same commit) | `src/lib/seo.ts` `SITE_URL` env pattern | role-match (same "avoid hardcoded RU domain" intent, different mechanism — static file vs env var) |
| `public/icons/{soc-vk.png,soc-wb.svg,paykeeper.png,pay-systems.png,payment.svg}`, `public/images/{delivery/payment-systems.png,partners/**,studios/**}` | static asset | file-I/O | DELETE | n/a | n/a — deletion |

## Pattern Assignments

### `src/components/Footer.tsx` — payment icon rendering (D-05)

**Current pattern (sprite + bgPos), `Footer.tsx:19-25` and render at `Footer.tsx:236-250`:**
```typescript
const PAYMENT_ICONS = [
  { cls: 'mastercard', w: 24, h: 16, bgPos: '-327px -200px' },
  { cls: 'visa', w: 32, h: 10, bgPos: '-40px -204px' },
  { cls: 'yandex_money', w: 25, h: 18, bgPos: '-671px -199px' },   // DELETE
  { cls: 'webmoney', w: 17, h: 18, bgPos: '-127px -199px' },        // DELETE
  { cls: 'qiwi', w: 19, h: 20, bgPos: '-165px -198px' },            // DELETE
];
// render:
{PAYMENT_ICONS.map((p) => (
  <Box key={p.cls} sx={{
    width: p.w, height: p.h,
    backgroundImage: 'url(/icons/payment-sprite.svg)',
    backgroundPosition: p.bgPos,
    backgroundRepeat: 'no-repeat',
    display: 'inline-block',
  }} />
))}
```

**Recommended target pattern:** Keep `mastercard`/`visa` sprite entries as-is (no new asset
needed — RESEARCH.md confirms they already work off `payment-sprite.svg`), drop the 3 RU entries,
and add Troy via the **existing standalone-`<img>` pattern already used elsewhere in this same
file** rather than inventing a new sprite-position hack. The file already has a proven
`<img src=... alt=... style={{...}} />` idiom for standalone payment/brand marks — reuse it:

**Analog — standalone `<img>` badge pattern**, `Footer.tsx:235`:
```typescript
<img src="/icons/paykeeper.png" alt="PayKeeper" style={{ height: 36, width: 'auto' }} />
```
Apply the same shape for Troy: `<img src="/icons/pay-troy.png" alt="Troy" style={{ width: 24, height: 16 }} />`
placed alongside the sprite-rendered mastercard/visa `<Box>` entries in the same flex row
(`Footer.tsx:236` container `Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center' }}`).
This avoids editing the shared `payment-sprite.svg` (risk of misaligning existing bgPos offsets
for mastercard/visa) and matches Don't Hand-Roll guidance (RESEARCH.md) to use a simple flat
`<img>` asset, not a trademark-risk reproduction. A Troy asset must be generated (no existing
file) — candidate: `~/generate_image.py` per global CLAUDE.md, output to `public/icons/pay-troy.png`,
treated as a placeholder like every other TR brand swap this phase.

**SOCIALS analog — same file, `Footer.tsx:8-17` and render `Footer.tsx:34-59`:**
```typescript
const SOCIALS = [
  { icon: '/icons/soc-telegram.png', href: 'https://t.me/americancreator_ru', label: 'Telegram' }, // swap handle or remove
  { icon: '/icons/soc-whatsapp.png', href: 'https://wa.me/79957578467', label: 'WhatsApp' },        // swap number
  { icon: '/icons/soc-vk.png', href: 'https://vk.com/american_creator', label: 'VK' },              // DELETE
  { icon: '/icons/soc-wb.svg', href: 'https://www.wildberries.ru/...', label: 'WB' },                // DELETE
];
```
Render loop (`SocialIcons()`, lines 34-59) needs no structural change — it's array-driven; editing
the `SOCIALS` array is the entire task. Same shape applies to any Instagram entry added.

**Phone pattern — 3 sites, same literal string `+7 995 757-84-67` (D-03), verified locations:**
- `Footer.tsx:163` (desktop) and `Footer.tsx:204` (mobile) — plain `<Typography>{'+7 995 757-84-67'}</Typography>`
- `Header.tsx:140` — same `<Typography>` shape, `fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif'`
- `contacts/page.tsx:107` — `<Typography component="a" href="tel:+79957578467">+7 995 757-84-67</Typography>`
  (note: this one is a clickable `tel:` link, not plain text — preserve the `tel:` href format when
  swapping to a TR number, just update both the `href` and the display text)
- WhatsApp `wa.me/79957578467` in `Footer.tsx:10` is a 4th site carrying the same digits, in URL form.

All 4 sites are independent string literals — no shared constant to edit once. Planner should
edit all 4 in the same commit to avoid a partial-swap state.

### `src/app/[locale]/delivery/page.tsx` — TR rework (D-02)

**Analog:** `src/app/[locale]/faq/page.tsx` (closest existing static-content, no-data-fetch page)

**Structural pattern to copy** (`faq/page.tsx:1-45`):
```typescript
'use client';
import { Box, Typography } from '@mui/material';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useTranslations } from 'next-intl';

export default function FaqPage() {
  const t = useTranslations('faq');           // <-- delivery/page.tsx already does this identically
  // breadcrumb + h1 block — IDENTICAL markup already present in delivery/page.tsx:20-45
  // (same palette.primaryLight breadcrumb, same h1 sx block) — no change needed there.
}
```
`delivery/page.tsx`'s breadcrumb+title block (lines 20-45) is already structurally identical to
`faq/page.tsx` — this confirms the page already follows the established static-page pattern; the
rework is content-only:
1. Delete `CDEK_OPTIONS` array (`delivery/page.tsx:11-15`) and its render loop (`delivery/page.tsx:106-150`
   — currently maps `CDEK_OPTIONS` to bordered `<Box>` cards) — replace with either a neutral
   TR-copy block (no per-carrier options) or a simplified single-carrier-agnostic list, per
   Claude's Discretion.
2. `payment-systems.png` `<Box component="img">` at `delivery/page.tsx:262-267` — replace `src`
   with a TR Visa/Mastercard/Troy composite, or delete the `<Box>` block entirely per D-06 (planner
   choice; RESEARCH.md notes the underlying asset file itself must also be deleted/replaced in
   `public/images/delivery/`).
3. i18n keys `delivery.cdek0/1/2*`, `delivery.cityNote*`, `delivery.freeBanner` removed from
   `messages/{en,tr}.json`; keep `delivery.title/desc/payment*` reworked with new TR copy values
   (same keys, new string content — not a key-removal for these).

### `src/app/[locale]/contacts/page.tsx` — brand placeholder edits (D-03/D-10)

**Analog:** none needed — this file already contains both target strings; the edit is in-place
string replacement at exactly 3 sites: `contacts/page.tsx:80` (`mailto:` href),
`contacts/page.tsx:92` (display text, same email), `contacts/page.tsx:96/107` region (`tel:` href +
display text, per excerpt above).

## Shared Patterns

### Marker-delimited BOGO removal
**Source:** `src/features/promo-bogo/README.md` (verified) + RESEARCH.md's grep gate.
**Apply to:** All 6 BOGO consumer files (`page.tsx`, `catalog/page.tsx`, `catalog/[slug]/page.tsx`,
`ProductCard.tsx`, `api.ts`, `arm-adapter.ts`).
```bash
git grep -n "BOGO HOOK\|PromoBanner\|PromoBadge\|PromoPlashka\|useAutoPromo\|promo-bogo\|active_promo" -- src public
# expect 0 matches after deletion
```
Every site is bracketed `// BOGO HOOK START` … `// BOGO HOOK END` (or JSX-comment form) except
`arm-adapter.ts:54`'s single-line `active_promo: null`, findable via `grep -n active_promo`.

### Isolation guard — do not touch live promo-CODE feature
**Source:** RESEARCH.md Pitfall 2 / Anti-Patterns.
**Apply to:** `src/lib/api.ts`, `src/lib/arm-adapter.ts`, `src/app/[locale]/basket/page.tsx`.
Only delete identifiers literally named `active_promo` or wrapped in `BOGO HOOK` markers.
`validatePromo`, `PromoValidationResult`, `promoCode`, `promoInput`, `promoResult`,
`handleApplyPromo` are CART-06 (live, required) — never touch.

### i18n key removal — flat-dotted parity
**Source:** `src/i18n/request.ts` (`unflatten()`), Phase 4 CONTEXT.md.
**Apply to:** `messages/en.json`, `messages/tr.json` for every removed key prefix
(`promo.`, `product.reviews*`, `studios.`, `partners.`, `nav.studios`, `nav.partners`,
`delivery.cdek*`).
```python
import json
en = json.load(open('messages/en.json')); tr = json.load(open('messages/tr.json'))
assert len(en) == len(tr) and set(en) == set(tr)
```
Run after every `messages/*.json` edit — missing-key removal degrades silently to a literal
`"key.name"` string in the UI (no build/test failure), per RESEARCH.md Pitfall 5.

### grep-gate as the sole verification tool for deletions
**Source:** RESEARCH.md Code Examples.
**Apply to:** every DELETE-classified file/directory in the table above.
```bash
for term in cdek paykeeper bogo "vk\.com" wildberries yandex_money webmoney qiwi "+7 995" "american-creator\.ru"; do
  grep -rniI "$term" src public --include="*.ts" --include="*.tsx" --include="*.json" --exclude-dir=node_modules
done
```
Expect zero matches per term after the phase closes (except the `american-creator.ru` term, which
is report-only per RESEARCH.md — copyright text/comments may legitimately survive; only
user-facing contact/URL occurrences are in scope).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Troy payment icon asset (`public/icons/pay-troy.png` or similar) | static asset | file-I/O | No existing Troy asset in repo; must be generated (see recommendation above — standalone `<img>`, not new sprite) |
| `next.config.js` redirect pruning | config | request-response | No analog needed — pure subtraction from an existing array; no new redirect entries added |

## Metadata

**Analog search scope:** `src/components/`, `src/app/[locale]/{faq,contacts,delivery}/`,
`src/lib/`, `messages/`, `public/icons/`, `public/images/` — all read directly from the working
tree (no Glob/Grep needed beyond what RESEARCH.md already verified).
**Files scanned:** `Footer.tsx` (full), `delivery/page.tsx` (full), `faq/page.tsx` (head),
`Header.tsx` (targeted lines), `contacts/page.tsx` (targeted lines) — 5 files read this session,
cross-referenced against RESEARCH.md's exhaustive consumer graph for the remaining ~25 files.
**Pattern extraction date:** 2026-07-01
