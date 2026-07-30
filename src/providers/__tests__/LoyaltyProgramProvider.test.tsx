/**
 * FBG-469 review — the chrome must follow the Creator Club switch immediately.
 *
 * The header/footer links used to read the programme from the locale layout,
 * which caches `/config` for 5 minutes, so a switched-off programme stayed
 * advertised (and a launch stayed invisible) for that window. The provider asks
 * the storefront itself through the uncached proxy, once per page load, and
 * stays `null` — links hidden — while the answer is unknown.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

const fetchLoyaltyConfig = vi.hoisted(() => vi.fn());
vi.mock('@/lib/loyalty', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/loyalty')>()),
  fetchLoyaltyConfig,
}));

import { LoyaltyProgramProvider, useLoyaltyProgram } from '../LoyaltyProgramProvider';

function Probe() {
  const program = useLoyaltyProgram();
  return <span data-testid="program">{program ?? 'unknown'}</span>;
}

const shown = () => screen.getByTestId('program').textContent;

beforeEach(() => {
  fetchLoyaltyConfig.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('LoyaltyProgramProvider', () => {
  it('publishes the live programme from /config', async () => {
    fetchLoyaltyConfig.mockResolvedValue({ program: 'cashback_wallet', tiers: [], walletCap: null });
    render(
      <LoyaltyProgramProvider>
        <Probe />
      </LoyaltyProgramProvider>,
    );

    await waitFor(() => expect(shown()).toBe('cashback_wallet'));
    // Exactly one request per page load — the chrome shares it.
    expect(fetchLoyaltyConfig).toHaveBeenCalledTimes(1);
  });

  it('publishes a dormant programme verbatim (callers compare, not guess)', async () => {
    fetchLoyaltyConfig.mockResolvedValue({ program: 'points_discount', tiers: [], walletCap: null });
    render(
      <LoyaltyProgramProvider>
        <Probe />
      </LoyaltyProgramProvider>,
    );

    await waitFor(() => expect(shown()).toBe('points_discount'));
  });

  it('stays unknown while loading and after a failed request (links stay hidden)', async () => {
    fetchLoyaltyConfig.mockRejectedValue(new Error('BFF down'));
    render(
      <LoyaltyProgramProvider>
        <Probe />
      </LoyaltyProgramProvider>,
    );

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
