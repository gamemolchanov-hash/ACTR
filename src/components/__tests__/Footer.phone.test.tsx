/**
 * The footer phone and the WhatsApp icon come from the storefront config
 * (`/config` → `contact_phone`, the distributor's phone in Portal) — never from a
 * hardcoded copy. No phone → neither the number nor the WhatsApp icon is shown.
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
  it('shows the configured phone (desktop + mobile) and links WhatsApp to it', () => {
    renderFooter('+90 531 871 30 07');

    expect(screen.getAllByText('+90 531 871 30 07')).toHaveLength(2);
    const whatsapp = screen.getAllByRole('link', { name: 'WhatsApp' });
    expect(whatsapp.length).toBeGreaterThan(0);
    for (const a of whatsapp) expect(a.getAttribute('href')).toBe('https://wa.me/905318713007');
  });

  it('hides the phone and the WhatsApp icon when no phone is configured', () => {
    const { container } = renderFooter(null);

    expect(container.textContent).not.toMatch(/\+90/);
    expect(screen.queryAllByRole('link', { name: 'WhatsApp' })).toHaveLength(0);
    // Instagram stays.
    expect(screen.getAllByRole('link', { name: 'Instagram' }).length).toBeGreaterThan(0);
  });
});
