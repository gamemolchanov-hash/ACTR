/**
 * One-click unsubscribe (23.09.2026): the canon promises a one-click opt-out in
 * every email, so the page withdraws as soon as it opens (from the browser, not
 * on the server GET) and then lists what will no longer arrive.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

const params = vi.hoisted(() => ({ t: 'cust-1.sig' as string | null }));
const api = vi.hoisted(() => ({ confirmUnsubscribe: vi.fn() }));

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    `${namespace ? `${namespace}.` : ''}${key}`,
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 't' ? params.t : null) }),
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock('@/lib/unsubscribe', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/unsubscribe')>()),
  confirmUnsubscribe: api.confirmUnsubscribe,
}));

import UnsubscribePage from './page';

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status } });

beforeEach(() => {
  params.t = 'cust-1.sig';
  api.confirmUnsubscribe.mockReset();
});
afterEach(() => cleanup());

describe('unsubscribe page (one click)', () => {
  it('withdraws on open, once, and lists what stops arriving', async () => {
    api.confirmUnsubscribe.mockResolvedValue(undefined);
    render(<UnsubscribePage />);

    await waitFor(() => expect(screen.getByTestId('sf-unsubscribe-done')).toBeTruthy());
    expect(api.confirmUnsubscribe).toHaveBeenCalledTimes(1);
    expect(api.confirmUnsubscribe).toHaveBeenCalledWith('cust-1.sig');
    expect(screen.getByTestId('sf-marketing-stops')).toBeTruthy();
    expect(screen.getByText('unsubscribe.stopsHeading')).toBeTruthy();
  });

  it('no token or 404 → invalid link, nothing sent without a token', async () => {
    params.t = null;
    render(<UnsubscribePage />);
    expect(screen.getByTestId('sf-unsubscribe-invalid')).toBeTruthy();
    expect(api.confirmUnsubscribe).not.toHaveBeenCalled();
    cleanup();

    params.t = 'forged';
    api.confirmUnsubscribe.mockRejectedValue(httpError(404));
    render(<UnsubscribePage />);
    await waitFor(() => expect(screen.getByTestId('sf-unsubscribe-invalid')).toBeTruthy());
  });

  it('server failure → error with a retry', async () => {
    api.confirmUnsubscribe.mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce(undefined);
    render(<UnsubscribePage />);
    await waitFor(() => expect(screen.getByTestId('sf-unsubscribe-error')).toBeTruthy());

    fireEvent.click(screen.getByText('unsubscribe.retry'));
    await waitFor(() => expect(screen.getByTestId('sf-unsubscribe-done')).toBeTruthy());
    expect(api.confirmUnsubscribe).toHaveBeenCalledTimes(2);
  });
});
