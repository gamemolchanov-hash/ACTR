/**
 * Self-hosted Futura PT (FBG-225).
 *
 * Replaces the render-blocking third-party stylesheet `fonts.cdnfonts.com/css/futura-pt`
 * (est. 730 ms on the critical path, no `font-display`) with local `.woff` faces served
 * from `/public/fonts`. Removing the third party also drops it from the critical request
 * chain (reliability + KVKK).
 *
 * The six weights mirror exactly the faces the storefront renders (300/400/450/500/600/700),
 * mapped 1:1 to the CDN's `FuturaCyrillic*` faces so nothing changes visually. `font-display:swap`
 * keeps text visible immediately (no FOIT). The primary body face (Book/400) is preloaded.
 */

type FontFace = { weight: number; file: string };

// weight → local file. Same mapping the cdnfonts stylesheet used:
// 300 Light · 400 Book · 450 Medium · 500 Demi · 600 Heavy · 700 Bold.
const FUTURA_FACES: FontFace[] = [
  { weight: 300, file: 'FuturaPT-Light.woff' },
  { weight: 400, file: 'FuturaPT-Book.woff' },
  { weight: 450, file: 'FuturaPT-Medium.woff' },
  { weight: 500, file: 'FuturaPT-Demi.woff' },
  { weight: 600, file: 'FuturaPT-Heavy.woff' },
  { weight: 700, file: 'FuturaPT-Bold.woff' },
];

/** Primary body face — preloaded so first paint can use real Futura where installed/cached. */
export const FUTURA_PRELOAD_HREF = '/fonts/FuturaPT-Book.woff';

const futuraFaces = FUTURA_FACES.map(
  ({ weight, file }) =>
    `@font-face{font-family:"Futura PT";font-style:normal;font-weight:${weight};` +
    `font-display:swap;src:local("Futura PT"),url("/fonts/${file}") format("woff");}`,
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
 */
const liraFix =
  `@font-face{font-family:"LiraFix";src:local("Arial"),local("Liberation Sans"),` +
  `local("Helvetica Neue"),local("Tahoma"),local("Verdana");unicode-range:U+20BA;font-display:swap;}`;

/** Static, developer-authored CSS (no external/user input) — safe to inline as-is. */
export const FONT_FACE_CSS = futuraFaces + futuraFallback + liraFix;
