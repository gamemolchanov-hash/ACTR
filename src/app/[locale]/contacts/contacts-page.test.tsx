/**
 * Contacts page (BS-15, 30.09.2026): no e-mail / phone lines under the title,
 * and the form speaks the ARM `POST /contact` contract `{ name, email, message }`
 * — the OMS-era `{ email, comment, source }` got 400 on every submit. `locale` is
 * the site language: the letter to the manager comes in it.
 * Seller requisites block (BS-19, 30.09.2026): real legal name, address,
 * VKN / MERSİS, trade registry and KEP instead of the `[Placeholder]` lines.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

const api = vi.hoisted(() => ({ post: vi.fn() }));
const intl = vi.hoisted(() => ({ locale: 'tr' }));
const auth = vi.hoisted(() => ({
  customer: null as { id: string; name: string; email: string; phone: string | null } | null,
}));

vi.mock('next-intl', () => ({
  useLocale: () => intl.locale,
  useTranslations: (namespace?: string) => (key: string) =>
    `${namespace ? `${namespace}.` : ''}${key}`,
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock('@/lib/api', () => ({ api: { post: api.post } }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ customer: auth.customer }) }));

import ContactsPage from './page';
import enRaw from '../../../../messages/en.json';
import trRaw from '../../../../messages/tr.json';

const en = enRaw as Record<string, string>;
const tr = trRaw as Record<string, string>;
const LEGAL_KEYS = [1, 2, 3, 4, 5, 6].map((n) => `contacts.legalLine${n}`);

const field = (container: HTMLElement, selector: 'textarea' | 'input') => {
  const el = container.querySelector(`${selector}:not([aria-hidden="true"])`);
  if (!el) throw new Error(`no ${selector}`);
  return el as HTMLTextAreaElement | HTMLInputElement;
};

beforeEach(() => {
  auth.customer = null;
  intl.locale = 'tr';
  api.post.mockReset();
  api.post.mockResolvedValue({ data: { success: true } });
});
afterEach(() => cleanup());

describe('contacts page', () => {
  it('shows no e-mail or phone lines under the title', () => {
    const { container } = render(<ContactsPage />);
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(screen.queryByText('info@american-creator.tr')).toBeNull();
  });

  it('guest on /en: sends name + email + message + locale (name falls back to the e-mail)', async () => {
    intl.locale = 'en';
    const { container } = render(<ContactsPage />);
    fireEvent.change(field(container, 'textarea'), { target: { value: '  Merhaba  ' } });
    fireEvent.change(field(container, 'input'), { target: { value: ' guest@example.com ' } });
    fireEvent.click(screen.getByText('contacts.submit'));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith('/contact', {
      name: 'guest@example.com',
      email: 'guest@example.com',
      message: 'Merhaba',
      locale: 'en',
    });
  });

  it('signed-in buyer: e-mail prefilled, name from the profile', async () => {
    auth.customer = { id: 'c1', name: 'Ayşe Yılmaz', email: 'ayse@example.com', phone: null };
    const { container } = render(<ContactsPage />);
    await waitFor(() => expect(field(container, 'input').value).toBe('ayse@example.com'));

    fireEvent.change(field(container, 'textarea'), { target: { value: 'Sipariş sorusu' } });
    fireEvent.click(screen.getByText('contacts.submit'));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith('/contact', {
      name: 'Ayşe Yılmaz',
      email: 'ayse@example.com',
      message: 'Sipariş sorusu',
      locale: 'tr',
    });
  });

  it('seller requisites: six lines in order, no e-mail link for KEP', () => {
    const { container } = render(<ContactsPage />);
    const text = container.textContent ?? '';
    const at = LEGAL_KEYS.map((key) => text.indexOf(key));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('requisites are filled in both locales (no placeholders, no IBAN/bank)', () => {
    for (const dict of [en, tr]) {
      const block = LEGAL_KEYS.map((key) => dict[key]).join('\n');
      expect(LEGAL_KEYS.every((key) => typeof dict[key] === 'string')).toBe(true);
      expect(block).not.toContain('Placeholder');
      expect(block).not.toMatch(/IBAN|Bank/i);
      expect(block).toContain('Kızıl Kalina Kozmetik Ltd. Şti.');
      expect(block).toContain('5601466111 / 0560146611100001');
      expect(block).toContain('31978');
      expect(block).toContain('kizilkalina@hs03.kep.tr');
      expect(block).toContain('Alanya, Antalya 07460, Türkiye');
    }
  });
});
