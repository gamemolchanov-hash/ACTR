/**
 * FBG-454 — LegalPage Markdown branch (slug `kvkk`).
 *
 * The KVKK clarification text renders the lawyer's full V3 canon
 * (KK-KVKK-AM-2026-V3) instead of the old s1..s4 stub sections; non-TR locales
 * get a short "official text is in Turkish" notice, TR does not. This test pins
 * the doc header, that the stub placeholders are gone, the three canon
 * cross-references (one PDF, two locale-preserving page links) and the EN
 * notice. Renders the async Server Component directly with a stubbed translator.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));

const TR = {
  title: 'Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni',
  enNotice: 'The official text of this policy is in Turkish (Türkçe).',
} as Record<string, string>;

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => TR[key] ?? key,
}));

import LegalPage from './[slug]/page';
import enMessages from '../../../../messages/en.json';
import trMessages from '../../../../messages/tr.json';

afterEach(cleanup);

const renderPage = async (slug: string, locale: string) => {
  const ui = await LegalPage({ params: Promise.resolve({ slug, locale }) });
  return render(ui);
};

const hrefs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));

describe('LegalPage — kvkk Markdown document', () => {
  it('renders the v3 document header untouched (doc code / version)', async () => {
    const { container } = await renderPage('kvkk', 'en');
    expect(container.textContent).toContain('KK-KVKK-AM-2026-V3');
    expect(container.textContent).toContain('3.0');
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('renders canon body: the "Belgenin Niteliği" callout, §12 and the legal-basis list', async () => {
    const { container } = await renderPage('kvkk', 'tr');
    const text = container.textContent ?? '';
    expect(text).toContain('Belgenin Niteliği');
    expect(text).toContain('12. Güncellemeler, Dil ve İletişim');
    expect(text).toContain('Hukuki Dayanaklar');
    expect(text).toContain('2026/347 sayılı İlke Kararı');
  });

  it('leaves no stub placeholder or unconverted <u> markup', async () => {
    const { container } = await renderPage('kvkk', 'tr');
    const html = container.innerHTML;
    expect(container.textContent).not.toContain('[Placeholder');
    expect(html).not.toContain('%LOCALE%');
    expect(html).not.toContain('<u>');
  });

  it('links the KVKK başvuru form to its published PDF', async () => {
    const { container } = await renderPage('kvkk', 'tr');
    const pdf = Array.from(container.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === '/legal/kvkk-basvuru-formu.pdf',
    );
    expect(pdf).toBeDefined();
    expect(pdf?.textContent).toContain('KVKK İlgili Kişi Başvuru Formu');
    // downloadable file opens in a new tab
    expect(pdf?.getAttribute('target')).toBe('_blank');
  });

  it('keeps the current locale on the two internal page links', async () => {
    const en = await renderPage('kvkk', 'en');
    expect(hrefs(en.container)).toEqual(
      expect.arrayContaining(['/en/legal/acik-riza', '/en/legal/ticari-elektronik-ileti']),
    );
    cleanup();
    const tr = await renderPage('kvkk', 'tr');
    expect(hrefs(tr.container)).toEqual(
      expect.arrayContaining(['/tr/legal/acik-riza', '/tr/legal/ticari-elektronik-ileti']),
    );
  });

  it('shows the "text is in Turkish" notice on non-TR locales but not on TR', async () => {
    const en = await renderPage('kvkk', 'en');
    expect(en.container.textContent).toContain('The official text of this policy is in Turkish');
    cleanup();
    const tr = await renderPage('kvkk', 'tr');
    expect(tr.container.textContent).not.toContain('The official text of this policy is in Turkish');
  });

  it('replaced the old s1..s4 stub keys with title/navLabel/enNotice in both locales', () => {
    for (const m of [enMessages, trMessages] as Record<string, string>[]) {
      expect(m['legal.kvkk.title']).toBeTruthy();
      expect(m['legal.kvkk.navLabel']).toBeTruthy();
      expect(m['legal.kvkk.enNotice']).toBeTruthy();
      expect(m['legal.kvkk.intro']).toBeUndefined();
      expect(m['legal.kvkk.s1Title']).toBeUndefined();
      expect(m['legal.kvkk.s4Body']).toBeUndefined();
    }
  });
});
