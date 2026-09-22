/**
 * Self-hosted Jost (variable, SIL OFL 1.1) — the storefront's display/body typeface.
 *
 * 2026-09-22 — replaces Futura PT (ParaType, commercial; the previous files were an unlicensed
 * cut, fsType=4 "preview & print" — not embeddable on the web). Jost is a Futura-inspired
 * geometric sans by Indestructible Type (https://github.com/indestructible-type/Jost), free for
 * web embedding under the OFL — see `public/fonts/OFL-Jost.txt`. Files are the Google Fonts
 * variable build (wght 100–900) split by script, so a page only downloads the subsets it uses:
 * `latin` (preloaded — every page), `latin-ext` (Turkish/EU diacritics), `cyrillic` (RU copy).
 *
 * The storefront styles request weights 300/400/450/500/600/700; a single variable face with
 * `font-weight:100 900` serves all of them exactly (no synthetic bold, no nearest-weight snapping).
 * `font-display:swap` keeps text visible immediately (no FOIT).
 */

type FontSubset = { name: string; file: string; unicodeRange: string };

/** Google Fonts subset split (unicode-range copied from the served CSS, v20). */
const JOST_SUBSETS: FontSubset[] = [
  {
    name: 'latin',
    file: 'Jost-latin.woff2',
    unicodeRange:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,' +
      'U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  {
    name: 'latin-ext',
    file: 'Jost-latin-ext.woff2',
    unicodeRange:
      'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,' +
      'U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  },
  {
    name: 'cyrillic',
    file: 'Jost-cyrillic.woff2',
    unicodeRange: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
  },
];

/** Primary face — preloaded so first paint can use the real font on every page. */
export const FONT_PRELOAD_HREF = '/fonts/Jost-latin.woff2';
/** @deprecated alias kept for callers that still import the old name. */
export const FUTURA_PRELOAD_HREF = FONT_PRELOAD_HREF;

const jostFaces = JOST_SUBSETS.map(
  ({ file, unicodeRange }) =>
    `@font-face{font-family:"Jost";font-style:normal;font-weight:100 900;font-display:swap;` +
    `src:url("/fonts/${file}") format("woff2");unicode-range:${unicodeRange};}`,
).join('');

/**
 * Metric-adjusted fallback over Arial, so the swap-in of the real face causes (almost) no layout
 * shift (CLS). Computed from Jost-latin with fontTools: unitsPerEm 1000, hhea asc 1070 / desc -375,
 * OS/2 xAvgCharWidth 546; Arial xAvgCharWidth 904 @ 2048 (0.4414). size-adjust = 0.546 / 0.4414 =
 * 123.7 %; ascent/descent overrides are the Jost metrics divided by that size-adjust.
 */
const jostFallback =
  `@font-face{font-family:"Jost Fallback";src:local("Arial"),local("Liberation Sans");` +
  `ascent-override:86.5%;descent-override:30.3%;line-gap-override:0%;size-adjust:123.7%;}`;

/**
 * LiraFix (keep — commits 22950f4, fe673ab, feac762). Maps ONLY the lira codepoint (U+20BA) to a
 * clean sans-serif glyph and sits FIRST in every price stack (`LiraFix, "Jost", …`). Per-glyph
 * fallback then uses Jost for every other character.
 *
 * FBG-424: the local()-only src did NOT resolve on iOS / in-app browsers (WKWebView) — WebKit
 * matches local() by PostScript name (`ArialMT`/`HelveticaNeue`, not `Arial`/`Helvetica Neue`) and
 * restricts local() lookups for privacy. Fix: lead `src` with a self-hosted 1-glyph subset
 * (`/fonts/lira-subset.woff2`, U+20BA only, from Inter/OFL — see
 * public/fonts/LICENSE-lira-subset.txt) so ₺ renders everywhere; the local() names stay as fallback.
 * `unicode-range:U+20BA` is unchanged, so this face is still fetched only when a ₺ is on the page.
 */
const liraFix =
  `@font-face{font-family:"LiraFix";src:url("/fonts/lira-subset.woff2") format("woff2"),` +
  `local("Arial"),local("Liberation Sans"),local("Helvetica Neue"),local("Tahoma"),local("Verdana");` +
  `unicode-range:U+20BA;font-display:swap;}`;

/** Static, developer-authored CSS (no external/user input) — safe to inline as-is. */
export const FONT_FACE_CSS = jostFaces + jostFallback + liraFix;
