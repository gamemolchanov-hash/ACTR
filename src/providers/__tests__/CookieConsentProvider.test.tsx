/**
 * KVKK Cookie Banner + Tercih Merkezi (FBG-395).
 *
 * Drives the real provider through the real banner/dialog with the real TR
 * message catalog, so the canonical Turkish copy is asserted byte-for-byte and
 * the consent gate is exercised end to end:
 *   - first visit: banner shown, optional scripts gated OFF, nothing stored
 *   - accept-all / reject-all / save / withdraw each write the right record + toast
 *   - storage failure surfaces the error toast and keeps the banner up
 *   - expired / version-mismatched consent re-prompts
 *
 * Only `@/i18n/navigation` is stubbed (Link → <a>), so the copy comes from the
 * catalog, not a key-echo mock.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import trFlat from '../../../messages/tr.json';
import {
  BANNER_VERSION,
  CONSENT_STORAGE_KEY,
  CONSENT_TTL_MS,
  buildConsentRecord,
  type ConsentRecord,
} from '@/lib/consent';
import { CookieConsentProvider, useConsent } from '../CookieConsentProvider';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

// Un-flatten the flat catalog the way src/i18n/request.ts does at runtime.
function unflatten(flat: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let cursor = out;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) cursor[part] = value;
      else cursor = (cursor[part] ??= {}) as Record<string, unknown>;
    });
  }
  return out;
}
const messages = unflatten(trFlat as Record<string, string>);

// Canon TR copy (from the ticket) — asserted verbatim.
const TR = {
  bannerTitle: 'Çerez Tercihleriniz',
  acceptAll: 'Tümünü Kabul Et',
  rejectAll: 'Tümünü Reddet',
  manage: 'Tercihleri Yönet',
  save: 'Seçimlerimi Kaydet',
  functional: 'İşlevsel Çerezler',
  toastAccepted: 'Çerez tercihleriniz kaydedildi. Tüm isteğe bağlı çerezler etkinleştirildi.',
  toastRejected: 'Çerez tercihleriniz kaydedildi. Yalnızca zorunlu çerezler kullanılacaktır.',
  toastSaved: 'Çerez tercihleriniz başarıyla güncellendi.',
  toastRevoked: 'Onayınız geri alındı. İsteğe bağlı çerezler devre dışı bırakıldı.',
  toastError: 'Tercihleriniz kaydedilemedi. Lütfen tekrar deneyiniz.',
};

function GateProbe() {
  const { canRun, openPreferences } = useConsent();
  return (
    <>
      <div data-testid="analytics-gate">{canRun('analytics') ? 'allowed' : 'blocked'}</div>
      <button onClick={openPreferences}>open-prefs</button>
    </>
  );
}

function renderProvider() {
  return render(
    <NextIntlClientProvider locale="tr" messages={messages} timeZone="Europe/Istanbul">
      <CookieConsentProvider>
        <GateProbe />
      </CookieConsentProvider>
    </NextIntlClientProvider>,
  );
}

function storedConsent(): ConsentRecord | null {
  const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as ConsentRecord) : null;
}

beforeEach(() => {
  localStorage.clear();
  document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
});

describe('CookieConsentProvider — first visit gate', () => {
  it('shows the banner and gates optional scripts OFF with nothing stored', () => {
    renderProvider();
    expect(screen.getByText(TR.bannerTitle)).toBeTruthy();
    expect(screen.getByTestId('analytics-gate').textContent).toBe('blocked');
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
    expect(document.cookie).not.toContain('NEXT_LOCALE=');
  });
});

describe('CookieConsentProvider — banner actions', () => {
  it('accept-all enables every optional category and toasts', () => {
    renderProvider();
    fireEvent.click(screen.getByRole('button', { name: TR.acceptAll }));

    expect(screen.queryByText(TR.bannerTitle)).toBeNull();
    expect(screen.getByTestId('analytics-gate').textContent).toBe('allowed');
    expect(screen.getByText(TR.toastAccepted)).toBeTruthy();

    const rec = storedConsent()!;
    expect(rec.status).toBe('accepted_all');
    expect(rec.categories).toMatchObject({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
    expect(rec.policyVersion).toBe('KK-KVKK-GCP-2026-V3');
    expect(rec.bannerVersion).toBe(BANNER_VERSION);
    expect(typeof rec.timestamp).toBe('number');
  });

  it('reject-all keeps only necessary and toasts', () => {
    renderProvider();
    fireEvent.click(screen.getByRole('button', { name: TR.rejectAll }));

    expect(screen.getByTestId('analytics-gate').textContent).toBe('blocked');
    expect(screen.getByText(TR.toastRejected)).toBeTruthy();

    const rec = storedConsent()!;
    expect(rec.status).toBe('rejected_all');
    expect(rec.categories).toMatchObject({
      functional: false,
      analytics: false,
      marketing: false,
    });
  });
});

describe('CookieConsentProvider — Tercih Merkezi', () => {
  it('opens with all optional off; saving functional persists it + writes NEXT_LOCALE, with the update toast', () => {
    renderProvider();
    fireEvent.click(screen.getByRole('button', { name: TR.manage }));

    const funcSwitch = screen.getByRole('checkbox', { name: TR.functional });
    expect((funcSwitch as HTMLInputElement).checked).toBe(false);
    fireEvent.click(funcSwitch);
    fireEvent.click(screen.getByRole('button', { name: TR.save }));

    expect(screen.getByText(TR.toastSaved)).toBeTruthy();
    const rec = storedConsent()!;
    expect(rec.categories).toMatchObject({
      functional: true,
      analytics: false,
      marketing: false,
    });
    // İşlevsel granted → current locale remembered
    expect(document.cookie).toContain('NEXT_LOCALE=tr');
  });

  it('withdrawing İşlevsel deletes NEXT_LOCALE immediately and shows the revocation toast', () => {
    // Seed a full acceptance + a persisted locale cookie.
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify(
        buildConsentRecord('accepted_all', { functional: true, analytics: true, marketing: true }),
      ),
    );
    document.cookie = 'NEXT_LOCALE=tr;path=/';
    renderProvider();

    // No banner (consent is current); open the centre from the footer-style entry.
    expect(screen.queryByText(TR.bannerTitle)).toBeNull();
    fireEvent.click(screen.getByText('open-prefs'));

    const funcSwitch = screen.getByRole('checkbox', { name: TR.functional });
    expect((funcSwitch as HTMLInputElement).checked).toBe(true); // reflects the saved value
    fireEvent.click(funcSwitch); // turn it off
    fireEvent.click(screen.getByRole('button', { name: TR.save }));

    expect(screen.getByText(TR.toastRevoked)).toBeTruthy();
    expect(document.cookie).not.toContain('NEXT_LOCALE=');
    expect(storedConsent()!.categories.functional).toBe(false);
  });
});

describe('CookieConsentProvider — resilience & re-prompt', () => {
  it('on storage failure: shows the error toast, keeps the banner, commits nothing', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded');
      });
    renderProvider();
    fireEvent.click(screen.getByRole('button', { name: TR.acceptAll }));

    expect(screen.getByText(TR.toastError)).toBeTruthy();
    expect(screen.getByText(TR.bannerTitle)).toBeTruthy(); // banner stays
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('analytics-gate').textContent).toBe('blocked');
    spy.mockRestore();
  });

  it('re-prompts when the stored consent has expired (12-month TTL)', () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify(
        buildConsentRecord(
          'accepted_all',
          { functional: true, analytics: true, marketing: true },
          Date.now() - CONSENT_TTL_MS - 1000,
        ),
      ),
    );
    renderProvider();
    expect(screen.getByText(TR.bannerTitle)).toBeTruthy();
    expect(screen.getByTestId('analytics-gate').textContent).toBe('blocked');
  });

  it('re-prompts when the stored policy version no longer matches', () => {
    const stale = {
      ...buildConsentRecord('accepted_all', { functional: true, analytics: true, marketing: true }),
      policyVersion: 'KK-KVKK-GCP-2025-V1',
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stale));
    renderProvider();
    expect(screen.getByText(TR.bannerTitle)).toBeTruthy();
  });

  it('evicts an orphan NEXT_LOCALE on load when there is no consent record (legacy cookie)', () => {
    document.cookie = 'NEXT_LOCALE=en;path=/';
    renderProvider();
    expect(screen.getByText(TR.bannerTitle)).toBeTruthy(); // banner (no consent)
    expect(document.cookie).not.toContain('NEXT_LOCALE='); // orphan removed
  });

  it('evicts NEXT_LOCALE on load when the stored consent has expired', () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify(
        buildConsentRecord(
          'accepted_all',
          { functional: true, analytics: true, marketing: true },
          Date.now() - CONSENT_TTL_MS - 1000,
        ),
      ),
    );
    document.cookie = 'NEXT_LOCALE=en;path=/';
    renderProvider();
    expect(document.cookie).not.toContain('NEXT_LOCALE=');
  });

  it('keeps NEXT_LOCALE on load when İşlevsel consent is current', () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify(
        buildConsentRecord('custom', { functional: true, analytics: false, marketing: false }),
      ),
    );
    document.cookie = 'NEXT_LOCALE=en;path=/';
    renderProvider();
    expect(document.cookie).toContain('NEXT_LOCALE=en'); // legit remembered preference
  });
});
