/**
 * Banner slot: the banners uploaded by the staff in the back office (`GET /banners`),
 * in API order, rotating. Nothing is built into the storefront — no banners, no slot.
 * The id for the close button is `banner:<id>`; a banner past its `ends_at` is
 * skipped; a failing `/banners` leaves the slot empty.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
// `data-intl-link` marks the locale-aware Link, so a plain <a> is told apart from it
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} data-intl-link="" {...rest}>
      {children}
    </a>
  ),
}));

const auth = { value: { token: null as string | null } };
vi.mock('@/lib/auth-context', () => ({ useAuth: () => auth.value }));

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: apiMock }));

const authApi = vi.hoisted(() => ({ getMyBanners: vi.fn(), dismissMyBanners: vi.fn() }));
vi.mock('@/lib/auth', () => authApi);

import { BannerSlot, DISMISSED_BANNERS_KEY } from '../BannerSlot';

/** The component's ROTATE_MS. */
const ROTATE_MS = 5000;
const NOW = new Date('2026-11-12T10:00:00Z');

/** `GET /banners` reply; any other request is a failure (the slot asks for nothing else). */
function reply(banners: unknown[] | Error) {
  apiMock.get.mockImplementation((url: string) => {
    if (url !== '/banners') return Promise.reject(new Error(`unexpected GET ${url}`));
    return banners instanceof Error
      ? Promise.reject(banners)
      : Promise.resolve({ data: { data: banners } });
  });
}

const banner = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  alt: `Banner ${id}`,
  href: '/catalog',
  desktop: { path: `banners/${id}/desktop.webp`, width: 2912, height: 360 },
  mobile: { path: `banners/${id}/mobile.webp`, width: 1280, height: 200 },
  ends_at: null,
  ...over,
});

/** Renders the slot and lets the pending requests settle (fake timers are on). */
async function renderSlot() {
  const view = render(<BannerSlot />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return view;
}
const tick = (ms = ROTATE_MS) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const uploadedImg = () => screen.getByTestId('sf-banner-uploaded') as HTMLImageElement;
/** What the slot shows now: the banner's alt. */
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
  reply([]);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('BannerSlot — uploaded banners', () => {
  it('shows the banner: image from the product-image route, size, alt', async () => {
    reply([banner('b1')]);
    await renderSlot();

    const img = uploadedImg();
    // same public image route as product photos, the original — no `?w=`
    expect(img.getAttribute('src')).toMatch(imageUrl('banners/b1/desktop.webp'));
    expect(img.getAttribute('alt')).toBe('Banner b1');
    // the browser reserves the room before the image loads
    expect(img.getAttribute('width')).toBe('2912');
    expect(img.getAttribute('height')).toBe('360');
    expect(img.style.width).toBe('100%');
    expect(img.style.height).toBe('auto');

    const source = img.closest('picture')!.querySelector('source')!;
    expect(source.getAttribute('media')).toBe('(max-width: 599px)');
    expect(source.getAttribute('srcset')).toMatch(imageUrl('banners/b1/mobile.webp'));

    expect((img.closest('a') as HTMLElement).style.borderRadius).toBe('20px');
  });

  it('no mobile image → no <source>, the desktop image serves every width', async () => {
    reply([banner('b1', { mobile: null })]);
    await renderSlot();
    expect(uploadedImg().closest('picture')!.querySelector('source')).toBeNull();
  });

  it('a storefront path goes through the locale-aware Link', async () => {
    reply([banner('b1', { href: '/catalog/color_gel' })]);
    await renderSlot();
    const link = uploadedImg().closest('a')!;
    expect(link.getAttribute('href')).toBe('/catalog/color_gel');
    expect(link.hasAttribute('data-intl-link')).toBe(true);
  });

  it('an http(s) address is a plain <a> in the same tab', async () => {
    reply([banner('b1', { href: 'https://example.com/sale?x=1' })]);
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
    reply([banner('b1', { href })]);
    await renderSlot();
    expect(uploadedImg().closest('a')).toBeNull();
    expect(screen.getByTestId('sf-banner-slot').querySelector('a')).toBeNull();
    // still in the rounded container
    expect((uploadedImg().closest('div[style]') as HTMLElement).style.borderRadius).toBe('20px');
  });

  it('a banner past ends_at is skipped, one still inside its window is shown', async () => {
    reply([
      banner('old', { ends_at: '2026-11-12T09:59:59Z' }),
      banner('live', { ends_at: '2026-11-12T10:10:00Z' }),
    ]);
    await renderSlot();
    expect(shownAlt()).toBe('Banner live');
    // the expired one never comes up
    await tick();
    expect(shownAlt()).toBe('Banner live');
  });

  it('a malformed entry (no id / no image) is dropped, the rest are shown', async () => {
    reply([{ alt: 'no id' }, { id: 'x', alt: 'no image' }, null, banner('ok')]);
    await renderSlot();
    expect(shownAlt()).toBe('Banner ok');
  });
});

describe('BannerSlot — nothing is built in', () => {
  it('no banners → no slot; the only request is /banners', async () => {
    reply([]);
    await renderSlot();
    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
    expect(apiMock.get.mock.calls.map((call) => call[0])).toEqual(['/banners']);
  });

  it('every banner is past its window → no slot', async () => {
    reply([banner('old', { ends_at: '2026-11-12T09:59:59Z' })]);
    await renderSlot();
    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
  });

  it('/banners fails → no slot, nothing logged', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    reply(
      Object.assign(new Error('Request failed with status code 404'), {
        response: { status: 404 },
      }),
    );
    await renderSlot();

    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    error.mockRestore();
    warn.mockRestore();
  });

  it('a reply without a list → no slot', async () => {
    apiMock.get.mockResolvedValue({ data: {} });
    await renderSlot();
    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
  });
});

describe('BannerSlot — rotation', () => {
  it('banners in API order, one step per ROTATE_MS, and round again', async () => {
    reply([banner('b1'), banner('b2', { href: null }), banner('b3')]);
    await renderSlot();

    expect(shownAlt()).toBe('Banner b1');
    await tick(ROTATE_MS - 1);
    expect(shownAlt()).toBe('Banner b1');
    await tick(1);
    expect(shownAlt()).toBe('Banner b2');
    expect(uploadedImg().getAttribute('src')).toMatch(imageUrl('banners/b2/desktop.webp'));
    await tick();
    expect(shownAlt()).toBe('Banner b3');
    await tick();
    expect(shownAlt()).toBe('Banner b1');
  });

  it('a single banner does not rotate', async () => {
    reply([banner('b1')]);
    await renderSlot();
    await tick(ROTATE_MS * 3);
    expect(shownAlt()).toBe('Banner b1');
  });

  it('the list shrinks while rotating (a window closes) → the index stays valid', async () => {
    // closes 12 s after the page opened
    reply([banner('b1', { ends_at: '2026-11-12T10:00:12Z' }), banner('b2'), banner('b3')]);
    await renderSlot();

    await tick();
    expect(shownAlt()).toBe('Banner b2');
    await tick();
    expect(shownAlt()).toBe('Banner b3');
    // 15 s: b1 is over — the two banners left keep rotating
    await tick();
    expect(shownAlt()).not.toBe('Banner b1');
    const rest = [shownAlt()];
    await tick();
    rest.push(shownAlt());
    expect(rest.sort()).toEqual(['Banner b2', 'Banner b3']);
  });
});

describe('BannerSlot — close button', () => {
  it('a dismissed banner:<id> is hidden, the others stay', async () => {
    localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(['banner:b1']));
    reply([banner('b1'), banner('b2'), banner('b3')]);
    await renderSlot();

    expect(shownAlt()).toBe('Banner b2');
    await tick();
    expect(shownAlt()).toBe('Banner b3');
    await tick();
    expect(shownAlt()).toBe('Banner b2');
  });

  it('guest: × closes everything published now and remembers banner:<id> locally', async () => {
    reply([banner('b1'), banner('b2')]);
    await renderSlot();
    fireEvent.click(screen.getByTestId('sf-banner-close'));

    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
    expect(JSON.parse(localStorage.getItem(DISMISSED_BANNERS_KEY)!)).toEqual([
      'banner:b1',
      'banner:b2',
    ]);
    expect(authApi.dismissMyBanners).not.toHaveBeenCalled();
  });

  it('guest: a closed banner stays closed on the next visit, a new one shows again', async () => {
    localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(['banner:b1']));
    reply([banner('b1')]);
    const { unmount } = await renderSlot();
    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
    unmount();

    reply([banner('b1'), banner('b3')]);
    await renderSlot();
    expect(shownAlt()).toBe('Banner b3');
  });

  it('ids of the slides the storefront used to build in do not hide a banner', async () => {
    localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(['delivery', 'promo:BOGO']));
    reply([banner('b1')]);
    await renderSlot();
    expect(shownAlt()).toBe('Banner b1');
  });

  it('signed in: the account list hides the slot without a click and local ids are pushed', async () => {
    auth.value = { token: 'jwt' };
    localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(['banner:old']));
    authApi.getMyBanners.mockResolvedValue(['banner:b1']);
    reply([banner('b1')]);
    await renderSlot();

    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
    expect(authApi.dismissMyBanners).toHaveBeenCalledWith(['banner:old']);
    expect(JSON.parse(localStorage.getItem(DISMISSED_BANNERS_KEY)!)).toEqual([
      'banner:b1',
      'banner:old',
    ]);
  });

  it('signed in: × sends the published ids to the account', async () => {
    auth.value = { token: 'jwt' };
    authApi.getMyBanners.mockResolvedValue(['banner:b1']);
    reply([banner('b1'), banner('b2')]);
    await renderSlot();

    expect(shownAlt()).toBe('Banner b2');
    fireEvent.click(screen.getByTestId('sf-banner-close'));
    expect(authApi.dismissMyBanners).toHaveBeenCalledWith(['banner:b2']);
    expect(screen.queryByTestId('sf-banner-slot')).toBeNull();
  });
});
