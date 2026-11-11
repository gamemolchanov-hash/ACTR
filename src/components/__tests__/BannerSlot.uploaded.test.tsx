/**
 * Banners uploaded by managers in the back office (`GET /banners`): they are the
 * first slides, in API order, the built-in "free shipping" slide follows and the
 * slides rotate; the id for the close button is `banner:<id>`; a banner past its
 * `ends_at` is skipped; a failing `/banners` (404 until the BFF ships) leaves the
 * built-in slide.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import enFlat from '../../../messages/en.json';

// `data-intl-link` marks the locale-aware Link, so a plain <a> is told apart from it
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} data-intl-link="" {...rest}>
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

const apiMock = vi.hoisted(() => ({ fetchShippingRates: vi.fn(), api: { get: vi.fn() } }));
vi.mock('@/lib/api', () => apiMock);

const authApi = vi.hoisted(() => ({ getMyBanners: vi.fn(), dismissMyBanners: vi.fn() }));
vi.mock('@/lib/auth', () => authApi);

import { BannerSlot, DISMISSED_BANNERS_KEY } from '../BannerSlot';

/** The component's ROTATE_MS. */
const ROTATE_MS = 5000;
const NOW = new Date('2026-11-12T10:00:00Z');
/** Alt of the built-in slide for a ₺3.000 threshold. */
const DELIVERY = 'Free shipping on orders from ₺3.000';

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
const messages = unflatten(enFlat as Record<string, string>);

/** What `GET /banners` answers: a list, or an error (404 until the BFF ships). */
function banners(list: unknown[] | Error) {
  apiMock.api.get.mockImplementation((url: string) => {
    if (url !== '/banners') return Promise.reject(new Error(`unexpected GET ${url}`));
    return list instanceof Error ? Promise.reject(list) : Promise.resolve({ data: { data: list } });
  });
}
const rates = (thresholds: Array<number | null>) =>
  apiMock.fetchShippingRates.mockResolvedValue({
    rates: thresholds.map((t, i) => ({ id: `m${i}`, is_free: false, free_threshold: t, price: 144 })),
  });

const banner = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  alt: `Banner ${id}`,
  href: '/catalog',
  desktop: { path: `banners/${id}/desktop.webp`, width: 2880, height: 360 },
  mobile: { path: `banners/${id}/mobile.webp`, width: 1280, height: 200 },
  ends_at: null,
  ...over,
});

/** Lets the pending requests and the react-query notifications settle (fake timers are on). */
const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
  });
async function renderSlot() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Istanbul">
        <BannerSlot />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  await flush();
  return view;
}
const tick = (ms = ROTATE_MS) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const uploadedImg = () => screen.getByTestId('sf-banner-uploaded') as HTMLImageElement;
/** What the slot shows now: the alt of the slide's image. */
const shownAlt = () =>
  screen.getByTestId('sf-banner-slot').querySelector('img')?.getAttribute('alt');
const imageUrl = (path: string) =>
  new RegExp(`^/api/storefront/images/[^/]+/${path.replace(/[.]/g, '\\.')}$`);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  localStorage.clear();
  auth.value = { token: null };
  authApi.getMyBanners.mockResolvedValue([]);
  authApi.dismissMyBanners.mockResolvedValue([]);
  rates([3000]);
  banners([]);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('BannerSlot — uploaded banners', () => {
  it('shows the uploaded banner first: image from the product-image route, size, alt', async () => {
    banners([banner('b1')]);
    await renderSlot();

    expect(apiMock.api.get).toHaveBeenCalledWith('/banners');
    const img = uploadedImg();
    // same public image route as product photos, the original — no `?w=`
    expect(img.getAttribute('src')).toMatch(imageUrl('banners/b1/desktop.webp'));
    expect(img.getAttribute('alt')).toBe('Banner b1');
    // the browser reserves the room before the image loads
    expect(img.getAttribute('width')).toBe('2880');
    expect(img.getAttribute('height')).toBe('360');
    expect(img.style.width).toBe('100%');
    expect(img.style.height).toBe('auto');

    const source = img.closest('picture')!.querySelector('source')!;
    expect(source.getAttribute('media')).toBe('(max-width: 599px)');
    expect(source.getAttribute('srcset')).toMatch(imageUrl('banners/b1/mobile.webp'));

    // same rounded container as the built-in slide, without its SVG copy
    expect((img.closest('a') as HTMLElement).style.borderRadius).toBe('20px');
    expect(screen.getByTestId('sf-banner-slot').querySelector('svg text')).toBeNull();
    expect(screen.queryByTestId('sf-banner-delivery')).toBeNull();
  });

  it('no shipping threshold → the uploaded banner is still shown', async () => {
    rates([null]);
    banners([banner('b1')]);
    await renderSlot();
    expect(shownAlt()).toBe('Banner b1');
    await tick(ROTATE_MS * 2);
    expect(shownAlt()).toBe('Banner b1');
  });

  it('the rates request fails → the uploaded banner is still shown', async () => {
    apiMock.fetchShippingRates.mockRejectedValue(new Error('down'));
    banners([banner('b1')]);
    await renderSlot();
    expect(shownAlt()).toBe('Banner b1');
  });

  it('no mobile image → no <source>, the desktop image serves every width', async () => {
    banners([banner('b1', { mobile: null })]);
    await renderSlot();
    expect(uploadedImg().closest('picture')!.querySelector('source')).toBeNull();
  });

  it('a storefront path goes through the locale-aware Link', async () => {
    banners([banner('b1', { href: '/catalog/color_gel' })]);
    await renderSlot();
    const link = uploadedImg().closest('a')!;
    expect(link.getAttribute('href')).toBe('/catalog/color_gel');
    expect(link.hasAttribute('data-intl-link')).toBe(true);
  });

  it('an http(s) address is a plain <a> in the same tab', async () => {
    banners([banner('b1', { href: 'https://example.com/sale?x=1' })]);
    await renderSlot();
    const link = uploadedImg().closest('a')!;
    expect(link.getAttribute('href')).toBe('https://example.com/sale?x=1');
    expect(link.hasAttribute('data-intl-link')).toBe(false);
    expect(link.hasAttribute('target')).toBe(false);
  });

  it.each([
    ['null', null],
    ['an empty string', ''],
    ['a javascript: address', 'javascript:alert(1)'],
    ['a protocol-relative address', '//evil.example/x'],
    ['a relative path', 'catalog'],
    ['another scheme', 'mailto:shop@example.com'],
  ])('href is %s → the banner is not a link', async (_name, href) => {
    banners([banner('b1', { href })]);
    await renderSlot();
    expect(uploadedImg().closest('a')).toBeNull();
    expect(screen.getByTestId('sf-banner-slot').querySelector('a')).toBeNull();
    // still in the rounded container
    expect((uploadedImg().closest('div[style]') as HTMLElement).style.borderRadius).toBe('20px');
  });

  it('a banner past ends_at is skipped, one still inside its window is shown', async () => {
    banners([
      banner('old', { ends_at: '2026-11-12T09:59:59Z' }),
      banner('live', { ends_at: '2026-11-12T10:10:00Z' }),
    ]);
    await renderSlot();
    expect(shownAlt()).toBe('Banner live');
    // 2 slides (live, delivery): the expired one never comes up
    await tick();
    expect(shownAlt()).toBe(DELIVERY);
    await tick();
    expect(shownAlt()).toBe('Banner live');
  });

  it('a malformed entry (no id / no image) is dropped, the rest are shown', async () => {
    banners([{ alt: 'no id' }, { id: 'x', alt: 'no image' }, null, banner('ok')]);
    await renderSlot();
    expect(shownAlt()).toBe('Banner ok');
  });
});

describe('BannerSlot — /banners unavailable', () => {
  const notFound = () =>
    Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } });

  it('404 (BFF not deployed yet) → the built-in slide only, nothing logged', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    banners(notFound());
    await renderSlot();

    expect(screen.queryByTestId('sf-banner-uploaded')).toBeNull();
    const slot = screen.getByTestId('sf-banner-slot');
    expect(slot.querySelector('a')?.getAttribute('href')).toBe('/delivery');
    expect(shownAlt()).toBe(DELIVERY);
    expect(Array.from(slot.querySelectorAll('svg text')).map((el) => el.textContent)).toEqual([
      'FREE',
      'SHIPPING',
      'ORDERS FROM',
      '₺3.000',
    ]);
    await tick(ROTATE_MS * 2);
    expect(shownAlt()).toBe(DELIVERY);

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    error.mockRestore();
    warn.mockRestore();
  });

  it('404 and no threshold → no slot, as before', async () => {
    rates([null]);
    banners(notFound());
    await renderSlot();
    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
  });

  it('a reply without a list → the built-in slide only', async () => {
    apiMock.api.get.mockResolvedValue({ data: {} });
    await renderSlot();
    expect(screen.queryByTestId('sf-banner-uploaded')).toBeNull();
    expect(shownAlt()).toBe(DELIVERY);
  });
});

describe('BannerSlot — rotation', () => {
  it('three slides: uploaded banners in API order, then delivery, and round again', async () => {
    banners([banner('b1'), banner('b2', { href: null })]);
    await renderSlot();

    const seen = [shownAlt()];
    await tick(ROTATE_MS - 1);
    expect(shownAlt()).toBe('Banner b1');
    await tick(1);
    seen.push(shownAlt());
    expect(uploadedImg().getAttribute('src')).toMatch(imageUrl('banners/b2/desktop.webp'));
    await tick();
    seen.push(shownAlt());
    expect(screen.getByTestId('sf-banner-delivery').getAttribute('href')).toBe('/delivery');
    await tick();
    seen.push(shownAlt());
    expect(seen).toEqual(['Banner b1', 'Banner b2', DELIVERY, 'Banner b1']);
  });

  it('a single slide does not rotate', async () => {
    rates([null]);
    banners([banner('b1')]);
    await renderSlot();
    await tick(ROTATE_MS * 3);
    expect(shownAlt()).toBe('Banner b1');
  });

  it('the list shrinks while rotating (a window closes) → the index stays valid', async () => {
    // closes 12 s after the page opened
    banners([banner('b1', { ends_at: '2026-11-12T10:00:12Z' }), banner('b2')]);
    await renderSlot();

    await tick();
    expect(shownAlt()).toBe('Banner b2');
    await tick();
    expect(shownAlt()).toBe(DELIVERY);
    // 15 s: b1 is over — the two slides left keep rotating
    await tick();
    expect(shownAlt()).not.toBe('Banner b1');
    const rest = [shownAlt()];
    await tick();
    rest.push(shownAlt());
    expect(rest.sort()).toEqual(['Banner b2', DELIVERY].sort());
  });
});

describe('BannerSlot — closing uploaded banners', () => {
  it('a dismissed banner:<id> is hidden, the other slides stay', async () => {
    localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(['banner:b1']));
    banners([banner('b1'), banner('b2')]);
    await renderSlot();

    expect(shownAlt()).toBe('Banner b2');
    await tick();
    expect(shownAlt()).toBe(DELIVERY);
    await tick();
    expect(shownAlt()).toBe('Banner b2');
  });

  it('the delivery slide was closed earlier → an uploaded banner still shows', async () => {
    localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(['delivery']));
    banners([banner('b1')]);
    await renderSlot();
    expect(shownAlt()).toBe('Banner b1');
    expect(screen.queryByTestId('sf-banner-delivery')).toBeNull();
  });

  it('guest: × closes everything published now and remembers banner:<id> locally', async () => {
    banners([banner('b1'), banner('b2')]);
    await renderSlot();
    fireEvent.click(screen.getByTestId('sf-banner-close'));

    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
    expect(JSON.parse(localStorage.getItem(DISMISSED_BANNERS_KEY)!)).toEqual([
      'banner:b1',
      'banner:b2',
      'delivery',
    ]);
    expect(authApi.dismissMyBanners).not.toHaveBeenCalled();
  });

  it('a new banner (another id) shows again after the close', async () => {
    localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(['banner:b1', 'delivery']));
    banners([banner('b1'), banner('b3')]);
    await renderSlot();
    expect(shownAlt()).toBe('Banner b3');
  });

  it('signed in: the account list hides the banner, × sends the ids to the account', async () => {
    auth.value = { token: 'jwt' };
    authApi.getMyBanners.mockResolvedValue(['banner:b1']);
    banners([banner('b1'), banner('b2')]);
    await renderSlot();

    expect(shownAlt()).toBe('Banner b2');
    fireEvent.click(screen.getByTestId('sf-banner-close'));
    expect(authApi.dismissMyBanners).toHaveBeenCalledWith(['banner:b2', 'delivery']);
    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
  });
});
