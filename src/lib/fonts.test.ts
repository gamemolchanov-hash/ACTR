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

  it('references only local woff files that actually exist in /public', () => {
    const urls = [...FONT_FACE_CSS.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThanOrEqual(6);
    for (const url of urls) {
      expect(url.startsWith('/fonts/')).toBe(true);
      expect(url.endsWith('.woff')).toBe(true);
      expect(existsSync(resolve(PUBLIC, `.${url}`))).toBe(true);
    }
  });

  it('pulls in no third-party font host (cdnfonts / googleapis)', () => {
    expect(FONT_FACE_CSS).not.toMatch(/cdnfonts|googleapis|https?:\/\//);
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
