/**
 * Self-hosted Futura PT (FBG-225; Turkish glyph fix 2026-08-28).
 *
 * Replaces the render-blocking third-party stylesheet `fonts.cdnfonts.com/css/futura-pt`
 * (est. 730 ms on the critical path, no `font-display`) with local faces served from
 * `/public/fonts`. Removing the third party also drops it from the critical request
 * chain (reliability + KVKK).
 *
 * The six weights mirror exactly the faces the storefront renders (300/400/450/500/600/700),
 * mapped 1:1 to the CDN's `FuturaCyrillic*` faces so nothing changes visually. `font-display:swap`
 * keeps text visible immediately (no FOIT). The primary body face (Book/400) is preloaded.
 *
 * 2026-08-28 — files swapped from the cdnfonts `FuturaCyrillic*` .woff cut to woff2 subsets of the
 * original Paratype Futura PT v1.007 OTFs (same version/metrics: upm 1000, hhea 982/-300,
 * OS/2 weights 300/400/450/500/600/700). Reason: the cdnfonts cut is ASCII + Cyrillic ONLY — it
 * has NO Latin-1/Latin-Ext glyphs, so every Turkish letter (Ç ç Ğ ğ İ ı Ö ö Ş ş Ü ü) fell through
 * per-glyph to the size-adjusted Arial fallback and read visibly thinner/foreign ("Çok yakında
 * açılıyoruz" — customer complaint). The subsets keep Latin, Latin-1, Latin Ext-A/B, Cyrillic,
 * punctuation, currency, № ™ and the fi/fl ligatures, with kerning (GPOS) intact.
 */

type FontFace = { weight: number; file: string };

// weight → local .woff2. This mirrors EXACTLY the @font-face rules that
// `fonts.cdnfonts.com/css/futura-pt` served — and that american-creator.ru (our 1:1
// design reference, which loads the very same stylesheet) renders with — so self-hosting
// changes no pixels. Verified against the live CDN CSS:
//
//   cdnfonts @font-face        →  this file
//   font-weight:300  Light     →  FuturaPT-Light.woff2
//   font-weight:400  Book      →  FuturaPT-Book.woff2
//   font-weight:450  Medium    →  FuturaPT-Medium.woff2
//   font-weight:500  Demi      →  FuturaPT-Demi.woff2
//   font-weight:600  Heavy     →  FuturaPT-Heavy.woff2
//   font-weight:700  Bold      →  FuturaPT-Bold.woff2
//
// Note: cdnfonts assigns Medium→450 and Demi→500 — NOT the "Medium 500 / Demi 600"
// shorthand in the ticket. The storefront's most-used weights are 500 (59×) and 450 (36×);
// with an exact match present the browser renders 500=Demi and 450=Medium on the reference.
// Renumbering to the ticket's labels would make 500 resolve to Medium (visibly LIGHTER than
// the reference) — a real 1:1 regression. So we mirror the CDN's actual weights, not the
// ticket's naming. See the weight→file assertions in fonts.test.ts.
const FUTURA_FACES: FontFace[] = [
  { weight: 300, file: 'FuturaPT-Light.woff2' },
  { weight: 400, file: 'FuturaPT-Book.woff2' },
  { weight: 450, file: 'FuturaPT-Medium.woff2' },
  { weight: 500, file: 'FuturaPT-Demi.woff2' },
  { weight: 600, file: 'FuturaPT-Heavy.woff2' },
  { weight: 700, file: 'FuturaPT-Bold.woff2' },
];

/** Primary body face — preloaded so first paint can use real Futura where installed/cached. */
export const FUTURA_PRELOAD_HREF = '/fonts/FuturaPT-Book.woff2';

const futuraFaces = FUTURA_FACES.map(
  ({ weight, file }) =>
    `@font-face{font-family:"Futura PT";font-style:normal;font-weight:${weight};` +
    `font-display:swap;src:local("Futura PT"),url("/fonts/${file}") format("woff2");}`,
).join('');

/**
 * Metric-adjusted fallback over Arial. Overrides computed from FuturaPT-Book with fontTools
 * (unitsPerEm 1000, hhea asc 982 / desc -300, weighted xWidthAvg 384.6; Arial xWidthAvg 904 @ 2048):
 * `size-adjust` shrinks Arial to Futura's advance widths, `ascent/descent-override` match its box —
 * so the swap-in of the real face causes (almost) no layout shift (CLS). Listed right after
 * `"Futura PT"` in every stack; degrades to the stack's generic fallback where Arial / Liberation
 * Sans aren't installed.
 */
const futuraFallback =
  `@font-face{font-family:"Futura PT Fallback";src:local("Arial"),local("Liberation Sans");` +
  `ascent-override:112.69%;descent-override:34.43%;line-gap-override:0%;size-adjust:87.14%;}`;

/**
 * LiraFix (keep — commits 22950f4, fe673ab, feac762). Futura PT's ₺ (U+20BA) reads like a ruble;
 * this tiny family maps ONLY the lira codepoint to a clean sans-serif and sits FIRST in every price
 * stack (`LiraFix, "Futura PT", …`). Per-glyph fallback then uses Arial's ₺ and Futura PT for
 * every other character — same-family composition does not win over the Futura face, so LiraFix must lead.
 *
 * FBG-424: the local()-only src did NOT resolve on iOS / in-app browsers (WKWebView) — WebKit
 * matches local() by PostScript name (`ArialMT`/`HelveticaNeue`, not `Arial`/`Helvetica Neue`) and
 * restricts local() lookups for privacy — so LiraFix fell through to Futura PT and iPhone/Telegram
 * users saw prices as "₽" (looks like rubles — critical on a TR storefront). Fix: lead `src` with a
 * self-hosted 1-glyph subset (`/fonts/lira-subset.woff2`, U+20BA only, from Inter/OFL — see
 * public/fonts/LICENSE-lira-subset.txt) so ₺ renders everywhere; the local() names stay as fallback.
 * `unicode-range:U+20BA` is unchanged, so this face is still fetched only when a ₺ is on the page.
 */
const liraFix =
  `@font-face{font-family:"LiraFix";src:url("/fonts/lira-subset.woff2") format("woff2"),` +
  `local("Arial"),local("Liberation Sans"),local("Helvetica Neue"),local("Tahoma"),local("Verdana");` +
  `unicode-range:U+20BA;font-display:swap;}`;

/** Static, developer-authored CSS (no external/user input) — safe to inline as-is. */
export const FONT_FACE_CSS = futuraFaces + futuraFallback + liraFix;
