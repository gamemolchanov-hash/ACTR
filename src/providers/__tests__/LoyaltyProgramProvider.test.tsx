/**
 * FBG-469 review — the chrome must follow the Creator Club switch immediately.
 *
 * The header/footer links used to read the programme from the locale layout,
 * which caches `/config` for 5 minutes; then from a single mount-time fetch in
 * this provider — which lives in the persistent locale layout and never
 * remounts, so the answer was pinned for the whole SPA session. It now re-reads
 * on navigation and when the tab returns to the foreground (throttled), and
 * stays `null` — links hidden — whenever the answer is unknown.
 *
 * Only `Date` is faked, so the throttle window can be crossed without touching
 * the real timers `waitFor` relies on.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';

const fetchLoyaltyConfig = vi.hoisted(() => vi.fn());
vi.mock('@/lib/loyalty', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/loyalty')>()),
  fetchLoyaltyConfig,
}));

const pathname = vi.hoisted(() => ({ value: '/' }));
vi.mock('@/i18n/navigation', () => ({ usePathname: () => pathname.value }));

import { LoyaltyProgramProvider, useLoyaltyProgram } from '../LoyaltyProgramProvider';

function Probe() {
  const program = useLoyaltyProgram();
  return <span data-testid="program">{program ?? 'unknown'}</span>;
}

const shown = () => screen.getByTestId('program').textContent;
// A fresh element per render: React bails out of re-rendering an identical
// element reference, which would hide the pathname change from the provider.
const withProvider = () => (
  <LoyaltyProgramProvider>
    <Probe />
  </LoyaltyProgramProvider>
);

/** Programme answer for the next `/config` read. */
function answers(program: string) {
  fetchLoyaltyConfig.mockResolvedValue({ program, tiers: [], walletCap: null });
}

const START = Date.parse('2026-07-30T10:00:00Z');
/** Move past the revalidation throttle (30s). */
function laterThanThrottle(seconds = 31) {
  vi.setSystemTime(new Date(START + seconds * 1000));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(START));
  fetchLoyaltyConfig.mockReset();
  pathname.value = '/';
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LoyaltyProgramProvider', () => {
  it('publishes the live programme from /config', async () => {
    answers('cashback_wallet');
    render(withProvider());

    await waitFor(() => expect(shown()).toBe('cashback_wallet'));
    // Exactly one request per page load — the chrome shares it.
    expect(fetchLoyaltyConfig).toHaveBeenCalledTimes(1);
  });

  it('publishes a dormant programme verbatim (callers compare, not guess)', async () => {
    answers('points_discount');
    render(withProvider());

    await waitFor(() => expect(shown()).toBe('points_discount'));
  });

  it('stays unknown while loading and after a failed request (links stay hidden)', async () => {
    fetchLoyaltyConfig.mockRejectedValue(new Error('BFF down'));
    render(withProvider());

    // Unknown on the first render...
    expect(shown()).toBe('unknown');
    await waitFor(() => expect(fetchLoyaltyConfig).toHaveBeenCalled());
    // ...and still unknown once the request failed — never a fabricated answer.
    expect(shown()).toBe('unknown');
  });

  it('reports unknown outside the provider, so a stray consumer cannot link', () => {
    render(<Probe />);
    expect(shown()).toBe('unknown');
  });
});

describe('LoyaltyProgramProvider — revalidation (never pinned to the session)', () => {
  it('re-reads on client navigation and drops the link once the programme is off', async () => {
    answers('cashback_wallet');
    const { rerender } = render(withProvider());
    await waitFor(() => expect(shown()).toBe('cashback_wallet'));

    // The owner switches Creator Club off while the tab stays open.
    answers('points_discount');
    laterThanThrottle();
    pathname.value = '/catalog';
    rerender(withProvider());

    await waitFor(() => expect(shown()).toBe('points_discount'));
  });

  it('re-reads when the tab comes back to the foreground', async () => {
    answers('points_discount');
    render(withProvider());
    await waitFor(() => expect(shown()).toBe('points_discount'));

    // Programme launched while the tab was in the background.
    answers('cashback_wallet');
    laterThanThrottle();
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(shown()).toBe('cashback_wallet'));
  });

  it('drops back to unknown when a later read fails (no stale link survives)', async () => {
    answers('cashback_wallet');
    const { rerender } = render(withProvider());
    await waitFor(() => expect(shown()).toBe('cashback_wallet'));

    fetchLoyaltyConfig.mockRejectedValue(new Error('BFF down'));
    laterThanThrottle();
    pathname.value = '/catalog';
    rerender(withProvider());

    await waitFor(() => expect(shown()).toBe('unknown'));
  });

  it('throttles repeated triggers so browsing does not fire a request per click', async () => {
    answers('cashback_wallet');
    const { rerender } = render(withProvider());
    await waitFor(() => expect(fetchLoyaltyConfig).toHaveBeenCalledTimes(1));

    // Three more triggers inside the 30s window → still one request.
    for (const next of ['/catalog', '/contacts', '/faq']) {
      pathname.value = next;
      rerender(withProvider());
    }
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(fetchLoyaltyConfig).toHaveBeenCalledTimes(1);

    // Past the window, the next navigation asks again.
    laterThanThrottle();
    pathname.value = '/basket';
    rerender(withProvider());
    await waitFor(() => expect(fetchLoyaltyConfig).toHaveBeenCalledTimes(2));
  });
});
