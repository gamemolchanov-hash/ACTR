/**
 * FBG-428 — cookie-less visitors always resolve to /tr; explicit choice wins.
 *
 * These tests drive the REAL middleware (Accept-Language stripping + the underlying
 * next-intl createMiddleware(routing)), so they exercise the actual locale-resolution
 * path — not just the shape of the config. They lock in the acceptance criteria:
 *   - no cookie, any Accept-Language (incl. ru,…,en and en-US) → 307 /tr
 *   - Cookie NEXT_LOCALE=en → 307 /en (explicit choice), and the cookie is NOT
 *     overwritten back to tr (syncCookie must not clobber it)
 */
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import middleware from './middleware';

/** Build a bare-root request with optional Accept-Language + NEXT_LOCALE cookie. */
function makeReq(acceptLanguage?: string, cookieLocale?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (acceptLanguage) headers['Accept-Language'] = acceptLanguage;
  if (cookieLocale) headers['Cookie'] = `NEXT_LOCALE=${cookieLocale}`;
  return new NextRequest('http://localhost:3000/', { headers });
}

/** Pathname the middleware redirects the bare root to (localePrefix: 'always'). */
function redirectPath(res: Response): string | null {
  const location = res.headers.get('location');
  return location ? new URL(location).pathname : null;
}

/** The Set-Cookie value written for NEXT_LOCALE, if any (raw header substring). */
function nextLocaleSetCookie(res: Response): string | null {
  const raw = res.headers.get('set-cookie');
  if (!raw) return null;
  const match = raw.match(/NEXT_LOCALE=([^;,\s]*)/);
  return match ? match[1] : null;
}

describe('i18n middleware — cookie-less → /tr, explicit cookie wins (FBG-428)', () => {
  it('sends a ru,…,en visitor (the client case) to /tr, not /en', () => {
    expect(redirectPath(middleware(makeReq('ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7')))).toBe('/tr');
  });

  it('sends an English-only browser to /tr (Accept-Language is ignored)', () => {
    expect(redirectPath(middleware(makeReq('en-US,en;q=0.9')))).toBe('/tr');
  });

  it('sends a plain ru browser to /tr', () => {
    expect(redirectPath(middleware(makeReq('ru-RU,ru;q=0.9')))).toBe('/tr');
  });

  it('sends a request with no Accept-Language header to /tr', () => {
    expect(redirectPath(middleware(makeReq()))).toBe('/tr');
  });

  it('honours an explicit NEXT_LOCALE=en cookie → /en even with a TR browser', () => {
    expect(redirectPath(middleware(makeReq('tr-TR,tr;q=0.9', 'en')))).toBe('/en');
  });

  it('does NOT overwrite a stored en cookie back to tr on the bare root', () => {
    // Regression guard: syncCookie must leave an already-correct en cookie alone.
    const res = middleware(makeReq('tr-TR,tr;q=0.9', 'en'));
    const set = nextLocaleSetCookie(res);
    // Either no Set-Cookie at all, or one that keeps en — never a downgrade to tr.
    expect(set === null || set === 'en').toBe(true);
    expect(set).not.toBe('tr');
  });

  it('honours a NEXT_LOCALE=tr cookie → /tr', () => {
    expect(redirectPath(middleware(makeReq('en-US,en;q=0.9', 'tr')))).toBe('/tr');
  });
});
