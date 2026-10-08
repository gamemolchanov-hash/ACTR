/**
 * The footer phone comes from the storefront config (`/config` → `contact_phone`,
 * the distributor's phone in Portal) — never from a hardcoded copy. No phone → no
 * number. The only social icon is the brand's Turkish Instagram (no WhatsApp).
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import trFlat from '../../../messages/tr.json';
import { StoreContactProvider } from '@/providers/StoreContactProvider';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/providers/CookieConsentProvider', () => ({
  useConsent: () => ({ openPreferences: vi.fn() }),
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

function renderFooter(phone: string | null) {
  return render(
    <NextIntlClientProvider locale="tr" messages={messages} timeZone="Europe/Istanbul">
      <StoreContactProvider phone={phone}>
        <Footer />
      </StoreContactProvider>
    </NextIntlClientProvider>,
  );
}

afterEach(() => cleanup());

describe('Footer — contact phone from the storefront config', () => {
  it('shows the configured phone (desktop + mobile)', () => {
    renderFooter('+90 531 871 30 07');

    expect(screen.getAllByText('+90 531 871 30 07')).toHaveLength(2);
  });

  it('hides the phone when no phone is configured', () => {
    const { container } = renderFooter(null);

    expect(container.textContent).not.toMatch(/\+90/);
  });

  it('links Instagram to the Turkish brand page and has no WhatsApp icon', () => {
    const { container } = renderFooter('+90 531 871 30 07');

    expect(screen.queryAllByRole('link', { name: 'WhatsApp' })).toHaveLength(0);
    expect(container.querySelector('a[href*="wa.me"]')).toBeNull();
    const instagram = screen.getAllByRole('link', { name: 'Instagram' });
    expect(instagram).toHaveLength(2); // desktop + mobile
    for (const a of instagram) {
      expect(a.getAttribute('href')).toBe(
        'https://www.instagram.com/americancreator.turkiye?stkn=NWt4ZXZtYmwxNDMz',
      );
    }
  });
});
