/**
 * "Free shipping from …" banner (owner 07.10.2026, port of the ACRU slot): the
 * amount is the lowest free-shipping threshold ARM offers for Turkey, the copy is
 * in the page language, no threshold → no banner; × hides it (guest: locally,
 * signed in: on the account).
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import enFlat from '../../../messages/en.json';
import trFlat from '../../../messages/tr.json';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));

const auth = { value: { token: null as string | null } };
vi.mock('@/lib/auth-context', () => ({ useAuth: () => auth.value }));

const apiMock = vi.hoisted(() => ({ fetchShippingRates: vi.fn() }));
vi.mock('@/lib/api', () => apiMock);

const authApi = vi.hoisted(() => ({ getMyBanners: vi.fn(), dismissMyBanners: vi.fn() }));
vi.mock('@/lib/auth', () => authApi);

import { BannerSlot, DISMISSED_BANNERS_KEY } from '../BannerSlot';

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

function renderSlot(locale: 'en' | 'tr' = 'en') {
  const flat = (locale === 'en' ? enFlat : trFlat) as Record<string, string>;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale={locale} messages={unflatten(flat)} timeZone="Europe/Istanbul">
        <BannerSlot />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const rates = (thresholds: Array<number | null>) =>
  apiMock.fetchShippingRates.mockResolvedValue({
    rates: thresholds.map((t, i) => ({ id: `m${i}`, is_free: false, free_threshold: t, price: 144 })),
  });

const svgText = (slot: HTMLElement) =>
  Array.from(slot.querySelectorAll('svg text')).map((el) => el.textContent);

beforeEach(() => {
  localStorage.clear();
  auth.value = { token: null };
  authApi.getMyBanners.mockResolvedValue([]);
  authApi.dismissMyBanners.mockResolvedValue([]);
  rates([3000]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('BannerSlot — free shipping from the ARM threshold', () => {
  it('announces the lowest threshold, in English, and links to the delivery terms', async () => {
    rates([5000, 3000, null]);
    renderSlot('en');
    const slot = await screen.findByTestId('sf-banner-slot');
    expect(slot.querySelector('a')?.getAttribute('href')).toBe('/delivery');
    expect(svgText(slot)).toEqual(['FREE', 'SHIPPING', 'ORDERS FROM', '₺3.000']);
    expect(screen.getByAltText('Free shipping on orders from ₺3.000')).toBeTruthy();
    // the rates probe is a Turkish destination with an empty cart
    expect(apiMock.fetchShippingRates).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'TR', items: [] }),
    );
  });

  it('Turkish copy puts the amount first ("₺3.000 VE ÜZERİ")', async () => {
    renderSlot('tr');
    const slot = await screen.findByTestId('sf-banner-slot');
    expect(svgText(slot)).toEqual(['ÜCRETSİZ', 'KARGO', '₺3.000', 'VE ÜZERİ']);
    // the line with the amount is the large one
    const [amount, rest] = Array.from(slot.querySelectorAll('svg text')).slice(2);
    expect(Number(amount.getAttribute('font-size'))).toBeGreaterThan(
      Number(rest.getAttribute('font-size')),
    );
  });

  it('no method with a threshold → no banner', async () => {
    rates([null]);
    renderSlot('en');
    await waitFor(() => expect(apiMock.fetchShippingRates).toHaveBeenCalled());
    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
  });

  it('rates request fails → no banner', async () => {
    apiMock.fetchShippingRates.mockRejectedValue(new Error('down'));
    renderSlot('en');
    await waitFor(() => expect(apiMock.fetchShippingRates).toHaveBeenCalled());
    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
  });
});

describe('BannerSlot — close button', () => {
  it('guest: × hides the slot and remembers it locally', async () => {
    renderSlot('en');
    await screen.findByTestId('sf-banner-slot');
    fireEvent.click(screen.getByTestId('sf-banner-close'));
    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
    expect(JSON.parse(localStorage.getItem(DISMISSED_BANNERS_KEY)!)).toEqual(['delivery']);
    expect(authApi.dismissMyBanners).not.toHaveBeenCalled();
  });

  it('guest: a closed banner stays closed on the next visit', async () => {
    localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(['delivery']));
    renderSlot('en');
    await waitFor(() => expect(apiMock.fetchShippingRates).toHaveBeenCalled());
    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
  });

  it('signed in: the account list hides the slot and local ids are pushed up', async () => {
    auth.value = { token: 'jwt' };
    localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(['promo:OLD']));
    authApi.getMyBanners.mockResolvedValue(['delivery']);
    renderSlot('en');
    await waitFor(() => expect(authApi.getMyBanners).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId('sf-banner-slot')).toBeNull());
    expect(authApi.dismissMyBanners).toHaveBeenCalledWith(['promo:OLD']);
    expect(JSON.parse(localStorage.getItem(DISMISSED_BANNERS_KEY)!)).toEqual(['delivery', 'promo:OLD']);
  });

  it('signed in: × sends the banner id to the account', async () => {
    auth.value = { token: 'jwt' };
    renderSlot('en');
    await screen.findByTestId('sf-banner-slot');
    await waitFor(() => expect(authApi.getMyBanners).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('sf-banner-close'));
    expect(authApi.dismissMyBanners).toHaveBeenCalledWith(['delivery']);
    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
  });
});
