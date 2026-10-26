/**
 * "For nail studios" (owner 26.10.2026): the ACRU page with the amounts in lira —
 * −10 % from ₺10.000 for the order, −15 % from ₺20.000 and −20 % from ₺50.000
 * locked in for every next order; the −30 % / VIP card as on .ru. The form
 * speaks the ARM `POST /contact` contract like the contacts page: the fields go
 * into the message, labelled in the site language.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enFlat from '../../../../messages/en.json';
import trFlat from '../../../../messages/tr.json';

const api = vi.hoisted(() => ({ post: vi.fn() }));
const auth = vi.hoisted(() => ({
  customer: null as { id: string; name: string; email: string; phone: string | null } | null,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock('@/lib/api', () => ({ api: { post: api.post } }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ customer: auth.customer }) }));
vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));

import StudiosPage from './page';

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

function renderPage(locale: 'en' | 'tr' = 'tr') {
  const flat = (locale === 'en' ? enFlat : trFlat) as Record<string, string>;
  return render(
    <NextIntlClientProvider locale={locale} messages={unflatten(flat)} timeZone="Europe/Istanbul">
      <StudiosPage />
    </NextIntlClientProvider>,
  );
}

const tr = trFlat as Record<string, string>;
const en = enFlat as Record<string, string>;
const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

beforeEach(() => {
  auth.customer = null;
  api.post.mockReset();
  api.post.mockResolvedValue({ data: { success: true } });
});
afterEach(() => cleanup());

describe('studios page — discount ladder', () => {
  it('tr: −%10 from ₺10.000, −%15 from ₺20.000, −%20 from ₺50.000; the two upper steps are locked in', () => {
    renderPage('tr');
    const tiers = screen.getAllByTestId('sf-studios-tier');
    expect(tiers).toHaveLength(3);

    expect(text(tiers[0])).toContain('−%10');
    expect(text(tiers[0])).toContain('₺10.000 ve üzeri siparişlerde');
    expect(text(tiers[0])).not.toContain(tr['studios.tierNote']);

    expect(text(tiers[1])).toContain('−%15');
    expect(text(tiers[1])).toContain('₺20.000 ve üzeri siparişlerde');
    expect(text(tiers[1])).toContain(tr['studios.tierNote']);

    expect(text(tiers[2])).toContain('−%20');
    expect(text(tiers[2])).toContain('₺50.000 ve üzeri siparişlerde');
    expect(text(tiers[2])).toContain(tr['studios.tierNote']);
  });

  it('tr: the −30 % card for 50 Color Gel and the VIP certificate, as on .ru', () => {
    renderPage('tr');
    const block = text(screen.getByTestId('sf-studios-loyalty'));
    expect(block).toContain('−%30');
    expect(block).toContain('50 adet ve üzeri Color Gel siparişlerinde');
    expect(block).toContain(tr['studios.bulkNote']);
    expect(block).toContain(tr['studios.vipText']);
  });

  it('en: the same amounts in lira, percent after the number', () => {
    renderPage('en');
    const tiers = screen.getAllByTestId('sf-studios-tier');
    expect(text(tiers[0])).toContain('−10%');
    expect(text(tiers[0])).toContain('On orders from ₺10.000');
    expect(text(tiers[1])).toContain('On orders from ₺20.000');
    expect(text(tiers[2])).toContain('On orders from ₺50.000');
    expect(text(tiers[2])).toContain(en['studios.tierNote']);
  });

  it('one h1 on the page (the section headings are h2)', () => {
    const { container } = renderPage('tr');
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(text(container.querySelector('h1') as HTMLElement)).toContain(tr['studios.titleLine1']);
  });
});

describe('studios page — partnership form', () => {
  it('sends e-mail + social links + comment as a labelled message in the site language', async () => {
    renderPage('tr');
    const submit = screen.getByTestId('sf-studios-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('sf-studios-email'), { target: { value: ' salon@example.com ' } });
    expect(submit.disabled).toBe(true); // social links are required too
    fireEvent.change(screen.getByTestId('sf-studios-socials'), {
      target: { value: 'instagram.com/salon' },
    });
    fireEvent.change(screen.getByTestId('sf-studios-comment'), { target: { value: '  3 usta  ' } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith('/contact', {
      name: 'salon@example.com',
      email: 'salon@example.com',
      subject: 'Salon iş birliği başvurusu',
      message:
        'E-posta: salon@example.com\nSosyal medya bağlantıları: instagram.com/salon\nEk yorumlar: 3 usta',
      locale: 'tr',
    });
    expect(await screen.findByText(tr['studios.successMsg'])).toBeTruthy();
  });

  it('en, signed in: e-mail prefilled, name from the profile, no empty comment line', async () => {
    auth.customer = { id: 'c1', name: 'Ayşe Yılmaz', email: 'ayse@example.com', phone: null };
    renderPage('en');
    await waitFor(() =>
      expect((screen.getByTestId('sf-studios-email') as HTMLInputElement).value).toBe('ayse@example.com'),
    );
    fireEvent.change(screen.getByTestId('sf-studios-socials'), { target: { value: '@ayse.nails' } });
    fireEvent.click(screen.getByTestId('sf-studios-submit'));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith('/contact', {
      name: 'Ayşe Yılmaz',
      email: 'ayse@example.com',
      subject: 'Salon partnership application',
      message: 'Email: ayse@example.com\nSocial media links: @ayse.nails',
      locale: 'en',
    });
  });

  it('a failed send shows the error and keeps what was typed', async () => {
    api.post.mockRejectedValueOnce(new Error('429'));
    renderPage('tr');
    fireEvent.change(screen.getByTestId('sf-studios-email'), { target: { value: 'salon@example.com' } });
    fireEvent.change(screen.getByTestId('sf-studios-socials'), { target: { value: 'instagram.com/salon' } });
    fireEvent.click(screen.getByTestId('sf-studios-submit'));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(tr['studios.errorMsg'])).toBeTruthy();
    expect((screen.getByTestId('sf-studios-socials') as HTMLInputElement).value).toBe('instagram.com/salon');
  });
});
