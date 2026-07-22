/**
 * FBG-225 — self-hosted Futura PT.
 *
 * Guards the font layer that replaced the render-blocking `fonts.cdnfonts.com` stylesheet:
 * every declared @font-face resolves to a real local .woff, `font-display:swap` is set, the
 * primary face is preloaded, the metric-adjusted fallback is present, and the LiraFix ₺
 * mechanism (commits 22950f4 / fe673ab / feac762) is preserved.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { FONT_FACE_CSS, FUTURA_PRELOAD_HREF } from './fonts';

const PUBLIC = resolve(__dirname, '../../public');

describe('FONT_FACE_CSS — Futura PT self-host', () => {
  it('declares every weight the storefront renders, all with font-display:swap', () => {
    for (const weight of [300, 400, 450, 500, 600, 700]) {
      const face = new RegExp(
        `@font-face\\{font-family:"Futura PT";font-style:normal;font-weight:${weight};[^}]*font-display:swap`,
      );
      expect(FONT_FACE_CSS).toMatch(face);
    }
  });

  it('references only local font files that actually exist in /public', () => {
    const urls = [...FONT_FACE_CSS.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThanOrEqual(6);
    for (const url of urls) {
      // Every src url is self-hosted under /fonts/ (no external host) and on disk.
      expect(url.startsWith('/fonts/')).toBe(true);
      expect(url.endsWith('.woff') || url.endsWith('.woff2')).toBe(true);
      expect(existsSync(resolve(PUBLIC, `.${url}`))).toBe(true);
    }
    // The six Futura PT weight faces stay plain .woff; only the LiraFix ₺ subset is .woff2.
    const woff2 = urls.filter((u) => u.endsWith('.woff2'));
    expect(woff2).toEqual(['/fonts/lira-subset.woff2']);
    expect(urls.filter((u) => u.endsWith('.woff')).length).toBeGreaterThanOrEqual(6);
  });

  it('pulls in no third-party font host (cdnfonts / googleapis)', () => {
    expect(FONT_FACE_CSS).not.toMatch(/cdnfonts|googleapis|https?:\/\//);
  });

  // Weight→face must mirror the cdnfonts stylesheet the 1:1 reference (american-creator.ru)
  // renders with — cdnfonts assigns Medium→450 and Demi→500. This is the pixel-fidelity
  // contract, NOT the ticket's "Medium 500 / Demi 600" shorthand: renumbering would make the
  // most-used weight (500, 59×) render Medium instead of Demi — lighter than the reference.
  it('maps each weight to the exact face cdnfonts served (1:1 rendering)', () => {
    const faces = [
      ...FONT_FACE_CSS.matchAll(
        /@font-face\{font-family:"Futura PT";font-style:normal;font-weight:(\d+);[^}]*url\("\/fonts\/([^"]+)"\)/g,
      ),
    ];
    const byWeight = Object.fromEntries(faces.map((m) => [Number(m[1]), m[2]]));
    expect(byWeight).toEqual({
      300: 'FuturaPT-Light.woff',
      400: 'FuturaPT-Book.woff',
      450: 'FuturaPT-Medium.woff',
      500: 'FuturaPT-Demi.woff',
      600: 'FuturaPT-Heavy.woff',
      700: 'FuturaPT-Bold.woff',
    });
    // Guard the two weights the reviewer flagged: intentionally Demi / Heavy, not Medium / Demi.
    expect(byWeight[500]).toBe('FuturaPT-Demi.woff');
    expect(byWeight[600]).toBe('FuturaPT-Heavy.woff');
  });

  it('defines a metric-adjusted Arial fallback to curb swap CLS', () => {
    expect(FONT_FACE_CSS).toContain('font-family:"Futura PT Fallback"');
    expect(FONT_FACE_CSS).toMatch(/size-adjust:\d/);
    expect(FONT_FACE_CSS).toMatch(/ascent-override:\d/);
    expect(FONT_FACE_CSS).toMatch(/descent-override:\d/);
  });

  it('keeps the LiraFix ₺ family scoped to U+20BA and first-in-stack', () => {
    expect(FONT_FACE_CSS).toContain('font-family:"LiraFix"');
    expect(FONT_FACE_CSS).toContain('unicode-range:U+20BA');
  });

  // FBG-424: local()-only src did not resolve on iOS/WKWebView, so ₺ fell back to
  // Futura PT's ruble-like glyph. LiraFix now leads with a self-hosted 1-glyph subset,
  // with the local() names kept as fallback for environments that still match them.
  it('leads LiraFix src with the self-hosted ₺ subset, local() kept as fallback', () => {
    const face = FONT_FACE_CSS.match(/@font-face\{font-family:"LiraFix";([^}]*)\}/);
    expect(face).not.toBeNull();
    const src = face![1];
    // Self-hosted subset comes first (wins over the Futura face on iOS).
    expect(src).toMatch(/src:url\("\/fonts\/lira-subset\.woff2"\) format\("woff2"\),/);
    expect(src.indexOf('url("/fonts/lira-subset.woff2")')).toBeLessThan(src.indexOf('local('));
    // local() names preserved as fallback.
    for (const name of ['Arial', 'Liberation Sans', 'Helvetica Neue', 'Tahoma', 'Verdana']) {
      expect(src).toContain(`local("${name}")`);
    }
    expect(existsSync(resolve(PUBLIC, './fonts/lira-subset.woff2'))).toBe(true);
  });
});

describe('FUTURA_PRELOAD_HREF', () => {
  it('points at the Book (400) face and that file exists', () => {
    expect(FUTURA_PRELOAD_HREF).toBe('/fonts/FuturaPT-Book.woff');
    expect(FONT_FACE_CSS).toContain(`url("${FUTURA_PRELOAD_HREF}")`);
    expect(existsSync(resolve(PUBLIC, `.${FUTURA_PRELOAD_HREF}`))).toBe(true);
  });
});

describe('layout head', () => {
  const layout = readFileSync(
    resolve(__dirname, '../app/[locale]/layout.tsx'),
    'utf8',
  );

  it('no longer loads the render-blocking cdnfonts stylesheet', () => {
    expect(layout).not.toMatch(/rel="stylesheet"[^>]*cdnfonts|cdnfonts[^>]*rel="stylesheet"/);
    expect(layout).not.toContain('href="https://fonts.cdnfonts.com');
  });

  it('preloads the font as a CORS-mode font resource', () => {
    expect(layout).toContain('rel="preload"');
    expect(layout).toContain('as="font"');
    expect(layout).toContain('crossOrigin="anonymous"');
  });
});
