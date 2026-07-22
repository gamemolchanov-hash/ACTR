/**
 * FBG-428 — Accept-Language detection is disabled (routing.localeDetection: false).
 *
 * Every visitor without a NEXT_LOCALE cookie must land on /tr regardless of the
 * browser's Accept-Language (a `ru,…,en` header used to leak users onto /en).
 * English is reachable only by explicit choice: the language switcher or an
 * existing NEXT_LOCALE cookie, both still honoured by next-intl with detection off.
 *
 * middleware.ts is a thin `createMiddleware(routing)`, so `routing` is the source
 * of truth for redirect behaviour — pin the contract here. (Driving the full
 * middleware in vitest isn't viable: next-intl's middleware submodule imports
 * `next/server` in a way jsdom/node can't resolve. Live behaviour is verified by
 * the FBG-428 curl acceptance checks against prod.)
 */
import { describe, it, expect } from 'vitest';
import { routing } from './i18n/routing';

describe('i18n routing — localeDetection disabled (FBG-428)', () => {
  it('turns Accept-Language detection OFF so no-cookie visitors default to /tr', () => {
    expect(routing.localeDetection).toBe(false);
  });

  it('keeps the FBG-425 guardrails intact (TR default, always-prefixed, en+tr)', () => {
    expect(routing.defaultLocale).toBe('tr');
    expect(routing.localePrefix).toBe('always');
    expect([...routing.locales].sort()).toEqual(['en', 'tr']);
  });

  it('still reads the NEXT_LOCALE cookie so a manual choice (e.g. /en) is remembered', () => {
    // With detection off, the cookie is the only implicit signal next-intl honours;
    // it must stay configured (name + a long maxAge) for the switcher to persist /en.
    expect(routing.localeCookie).toMatchObject({ name: 'NEXT_LOCALE' });
    expect((routing.localeCookie as { maxAge?: number }).maxAge).toBeGreaterThan(0);
  });
});
