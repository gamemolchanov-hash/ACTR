/**
 * FBG-395 — the geo locale default must not persist NEXT_LOCALE without İşlevsel
 * consent. The redirect still happens (the locale lives in the URL); only the
 * cookie is gated. Uses the real consent gate (no mock) so the document.cookie
 * side-effect is asserted for real.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import {
  buildConsentRecord,
  writeStoredConsent,
  CONSENT_STORAGE_KEY,
} from '@/lib/consent';

const routerSpy = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => routerSpy }));
vi.mock('@/i18n/navigation', () => ({ usePathname: () => '/' }));

import { GeoLocaleInit } from '../GeoLocaleInit';

beforeEach(() => {
  routerSpy.replace.mockClear();
  localStorage.removeItem(CONSENT_STORAGE_KEY);
  document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
  global.fetch = vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ geo_country: 'TR' }) }),
  ) as unknown as typeof fetch;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GeoLocaleInit — consent-gated NEXT_LOCALE (FBG-395)', () => {
  it('redirects a TR visitor to /tr but does NOT persist NEXT_LOCALE without consent', async () => {
    render(<GeoLocaleInit currentLocale="en" />);
    await waitFor(() => expect(routerSpy.replace).toHaveBeenCalledWith('/tr'));
    expect(document.cookie).not.toContain('NEXT_LOCALE=');
  });

  it('persists NEXT_LOCALE when İşlevsel consent is present', async () => {
    writeStoredConsent(
      buildConsentRecord('custom', { functional: true, analytics: false, marketing: false }),
    );
    render(<GeoLocaleInit currentLocale="en" />);
    await waitFor(() => expect(routerSpy.replace).toHaveBeenCalledWith('/tr'));
    expect(document.cookie).toContain('NEXT_LOCALE=tr');
  });

  it('does nothing when a NEXT_LOCALE cookie already exists (explicit choice wins)', async () => {
    document.cookie = 'NEXT_LOCALE=en;path=/';
    render(<GeoLocaleInit currentLocale="en" />);
    await Promise.resolve();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(routerSpy.replace).not.toHaveBeenCalled();
  });

  it('does not redirect when the visitor is already on /tr', async () => {
    render(<GeoLocaleInit currentLocale="tr" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(routerSpy.replace).not.toHaveBeenCalled();
  });
});
