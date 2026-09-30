/**
 * Contacts page (BS-15, 30.09.2026): no e-mail / phone lines under the title,
 * and the form speaks the ARM `POST /contact` contract `{ name, email, message }`
 * — the OMS-era `{ email, comment, source }` got 400 on every submit.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

const api = vi.hoisted(() => ({ post: vi.fn() }));
const auth = vi.hoisted(() => ({
  customer: null as { id: string; name: string; email: string; phone: string | null } | null,
}));

vi.mock('next-intl', () => ({
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

const field = (container: HTMLElement, selector: 'textarea' | 'input') => {
  const el = container.querySelector(`${selector}:not([aria-hidden="true"])`);
  if (!el) throw new Error(`no ${selector}`);
  return el as HTMLTextAreaElement | HTMLInputElement;
};

beforeEach(() => {
  auth.customer = null;
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

  it('guest: sends name + email + message (name falls back to the e-mail)', async () => {
    const { container } = render(<ContactsPage />);
    fireEvent.change(field(container, 'textarea'), { target: { value: '  Merhaba  ' } });
    fireEvent.change(field(container, 'input'), { target: { value: ' guest@example.com ' } });
    fireEvent.click(screen.getByText('contacts.submit'));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith('/contact', {
      name: 'guest@example.com',
      email: 'guest@example.com',
      message: 'Merhaba',
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
    });
  });
});
