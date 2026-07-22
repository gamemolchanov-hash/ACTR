/**
 * FBG-438 — the wallet widget must honour the server `wallet_cap` from
 * /wallet/validate, not a hardcoded 40%.
 *
 * With wallet_cap:0.3 the slider ceiling and the numeric-input clamp are both
 * 30% of the total (not 40%); with 0.5 they rise to 50%. The cap hint echoes the
 * live percent. When the preview call fails the widget renders nothing so it can
 * never block checkout (regression guard).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { WalletValidationResult } from '@/lib/domain-types';

const validateWallet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ validateWallet }));

// Echo interpolation params so a test can assert the live cap percent is passed.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key} ${JSON.stringify(params)}` : key,
}));

vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'en-US',
}));

import WalletWidget from '../WalletWidget';

function mockPreview(over: Partial<WalletValidationResult>) {
  validateWallet.mockResolvedValue({
    data: {
      program: 'cashback_wallet',
      balance: 1000,
      applicable: 300,
      cap: 0.3,
      ...over,
    } satisfies WalletValidationResult,
  });
}

beforeEach(() => {
  validateWallet.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('WalletWidget — server cap drives the slider/input', () => {
  it('caps the slider at 30% of the total when wallet_cap is 0.3', async () => {
    mockPreview({ cap: 0.3, applicable: 300 });
    render(<WalletWidget total={1000} applied={0} onChange={vi.fn()} promoActive={false} />);

    const slider = await screen.findByRole('slider');
    // 30% of 1000 = 300 — not the 40% default (400).
    expect(slider.getAttribute('aria-valuemax')).toBe('300');
    // The cap hint reflects the live percent, not a hardcoded 40.
    expect(document.body.textContent).toContain('"percent":30');
  });

  it('clamps a numeric-input request above the 30% cap down to the cap', async () => {
    const onChange = vi.fn();
    mockPreview({ cap: 0.3, applicable: 300 });
    render(<WalletWidget total={1000} applied={0} onChange={onChange} promoActive={false} />);

    await screen.findByRole('slider');
    // User types 400 (40% of total) — the widget must pull it back to 300 (30%).
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '400' } });
    expect(onChange).toHaveBeenLastCalledWith(300);
  });

  it('lets the member apply up to 50% when the server raises wallet_cap to 0.5', async () => {
    const onChange = vi.fn();
    mockPreview({ cap: 0.5, applicable: 500 });
    render(<WalletWidget total={1000} applied={0} onChange={onChange} promoActive={false} />);

    const slider = await screen.findByRole('slider');
    expect(slider.getAttribute('aria-valuemax')).toBe('500');
    expect(document.body.textContent).toContain('"percent":50');
    // 450 is within the 500 ceiling → passes through unclamped.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '450' } });
    expect(onChange).toHaveBeenLastCalledWith(450);
  });

  it('shows no slider for a no-spend server cap (wallet_cap:0), not a 40% slider', async () => {
    mockPreview({ cap: 0, applicable: 0, balance: 1000 });
    render(<WalletWidget total={1000} applied={0} onChange={vi.fn()} promoActive={false} />);

    // Widget still renders (balance > 0), but the ceiling is 0 → empty branch,
    // never a slider capped at the 40% default.
    await screen.findByText('checkout.wallet.empty');
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('sends { total } (no requested amount) to the preview endpoint', async () => {
    mockPreview({ cap: 0.4, applicable: 400 });
    render(<WalletWidget total={1000} applied={0} onChange={vi.fn()} promoActive={false} />);

    await screen.findByRole('slider');
    expect(validateWallet).toHaveBeenCalledWith(1000);
  });

  it('renders nothing when the preview call fails — never blocks checkout', async () => {
    validateWallet.mockRejectedValue(new Error('BFF down'));
    const { container } = render(
      <WalletWidget total={1000} applied={0} onChange={vi.fn()} promoActive={false} />,
    );

    await waitFor(() => expect(validateWallet).toHaveBeenCalled());
    expect(screen.queryByRole('slider')).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});
