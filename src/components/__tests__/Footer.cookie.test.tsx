/**
 * FBG-395 — the footer carries a "Çerez Tercihleri" entry (on every page) that
 * opens the Tercih Merkezi. It's a button (opens the dialog, not a route) and
 * exposes the screen-reader label from the ticket. Real TR catalog so the copy
 * and aria-label are asserted verbatim; useConsent is stubbed with a spy.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import trFlat from '../../../messages/tr.json';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

const openPreferences = vi.fn();
vi.mock('@/providers/CookieConsentProvider', () => ({
  useConsent: () => ({ openPreferences }),
}));

import { Footer } from '../Footer';

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

afterEach(() => {
  cleanup();
  openPreferences.mockClear();
});

describe('Footer — Çerez Tercihleri (FBG-395)', () => {
  it('renders the cookie-preferences button (desktop + mobile) with the SR aria-label', () => {
    render(
      <NextIntlClientProvider locale="tr" messages={messages} timeZone="Europe/Istanbul">
        <Footer />
      </NextIntlClientProvider>,
    );

    const buttons = screen.getAllByRole('button', {
      name: 'Çerez tercihlerinizi görüntüleyin ve değiştirin',
    });
    // Both the desktop legal column and the mobile nav column carry one.
    expect(buttons).toHaveLength(2);
    for (const btn of buttons) expect(btn.textContent).toContain('Çerez Tercihleri');
  });

  it('opens the preference centre when clicked', () => {
    render(
      <NextIntlClientProvider locale="tr" messages={messages} timeZone="Europe/Istanbul">
        <Footer />
      </NextIntlClientProvider>,
    );

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'Çerez tercihlerinizi görüntüleyin ve değiştirin',
      })[0],
    );
    expect(openPreferences).toHaveBeenCalledTimes(1);
  });
});
