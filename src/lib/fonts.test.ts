/**
 * Self-hosted Jost (variable, OFL) — replaced the unlicensed Futura PT cut on 2026-09-22.
 *
 * Guards the font layer: every declared @font-face resolves to a real local .woff2, the
 * variable face covers the whole weight range the storefront renders (300–700, incl. 450),
 * `font-display:swap` is set, the primary subset is preloaded, the metric-adjusted fallback is
 * present, the OFL text ships next to the files, and the LiraFix ₺ mechanism
 * (commits 22950f4 / fe673ab / feac762) is preserved.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { FONT_FACE_CSS, FONT_PRELOAD_HREF } from './fonts';

const PUBLIC = resolve(__dirname, '../../public');

describe('FONT_FACE_CSS — Jost self-host', () => {
  it('declares the three script subsets as one variable family covering 100–900', () => {
    const faces = [...FONT_FACE_CSS.matchAll(/@font-face\{font-family:"Jost";([^}]*)\}/g)].map((m) => m[1]);
    expect(faces.length).toBe(3);
    for (const face of faces) {
      expect(face).toContain('font-weight:100 900');
      expect(face).toContain('font-display:swap');
      expect(face).toMatch(/unicode-range:U\+/);
    }
  });

  it('every declared file exists under public/fonts and is a woff2', () => {
    const urls = [...FONT_FACE_CSS.matchAll(/url\("(\/fonts\/[^"]+)"\)/g)].map((m) => m[1]);
    const jost = urls.filter((u) => u.startsWith('/fonts/Jost-'));
    expect(jost.sort()).toEqual(['/fonts/Jost-cyrillic.woff2', '/fonts/Jost-latin-ext.woff2', '/fonts/Jost-latin.woff2']);
    for (const u of urls) {
      const buf = readFileSync(resolve(PUBLIC, `.${u}`));
      expect(buf.subarray(0, 4).toString('latin1')).toBe('wOF2');
    }
  });

  it('ships the OFL licence next to the files and no Futura PT remains', () => {
    expect(existsSync(resolve(PUBLIC, './fonts/OFL-Jost.txt'))).toBe(true);
    expect(FONT_FACE_CSS).not.toContain('Futura');
    expect(existsSync(resolve(PUBLIC, './fonts/FuturaPT-Book.woff2'))).toBe(false);
  });

  it('defines a metric-adjusted Arial fallback to curb swap CLS', () => {
    expect(FONT_FACE_CSS).toContain('font-family:"Jost Fallback"');
    expect(FONT_FACE_CSS).toMatch(/size-adjust:\d/);
    expect(FONT_FACE_CSS).toMatch(/ascent-override:\d/);
    expect(FONT_FACE_CSS).toMatch(/descent-override:\d/);
  });

  it('keeps the LiraFix ₺ family scoped to U+20BA and first-in-stack', () => {
    expect(FONT_FACE_CSS).toContain('font-family:"LiraFix"');
    expect(FONT_FACE_CSS).toContain('unicode-range:U+20BA');
  });

  // FBG-424: local()-only src did not resolve on iOS/WKWebView. LiraFix leads with a
  // self-hosted 1-glyph subset, with the local() names kept as fallback.
  it('leads LiraFix src with the self-hosted ₺ subset, local() kept as fallback', () => {
    const face = FONT_FACE_CSS.match(/@font-face\{font-family:"LiraFix";([^}]*)\}/);
    expect(face).not.toBeNull();
    const src = face![1];
    expect(src).toMatch(/src:url\("\/fonts\/lira-subset\.woff2"\) format\("woff2"\),/);
    expect(src.indexOf('url("/fonts/lira-subset.woff2")')).toBeLessThan(src.indexOf('local('));
    for (const name of ['Arial', 'Liberation Sans', 'Helvetica Neue', 'Tahoma', 'Verdana']) {
      expect(src).toContain(`local("${name}")`);
    }
    expect(existsSync(resolve(PUBLIC, './fonts/lira-subset.woff2'))).toBe(true);
  });
});

describe('FONT_PRELOAD_HREF', () => {
  it('points at the latin subset and that file exists', () => {
    expect(FONT_PRELOAD_HREF).toBe('/fonts/Jost-latin.woff2');
    expect(FONT_FACE_CSS).toContain(`url("${FONT_PRELOAD_HREF}")`);
    expect(existsSync(resolve(PUBLIC, `.${FONT_PRELOAD_HREF}`))).toBe(true);
  });
});

describe('source no longer references the commercial family', () => {
  it('no fontFamily stack names "Futura PT"', () => {
    // Guard against a stale stack sneaking back via cherry-pick from the .ru storefront.
    const { execSync } = require('child_process') as typeof import('child_process');
    const out = execSync(
      'grep -rl \'"Futura PT\' src --include=*.ts --include=*.tsx --exclude=fonts.test.ts || true',
      {
        cwd: resolve(__dirname, '../..'),
        encoding: 'utf8',
      },
    );
    expect(out.trim()).toBe('');
  });
});

describe('layout head', () => {
  const layout = readFileSync(resolve(__dirname, '../app/[locale]/layout.tsx'), 'utf8');

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
