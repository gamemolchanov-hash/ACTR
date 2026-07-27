/**
 * FBG-456 — LegalPage Markdown branch (slug `mesafeli-satis`).
 *
 * /legal/mesafeli-satis renders the lawyer's full V4 canon (KK-MSS-2026-V4).
 * By its "Uygulama Niteliği" clause the contract is a dynamic per-order template;
 * the public page shows the template with every one of its 31 `{{order tokens}}`
 * replaced by a visible blank ("___________"), so no raw token is exposed. This
 * test pins the doc header, that no token / `<u>` / stub placeholder survives,
 * the canon cross-references (five locale-preserving page links + one PDF), that
 * "Ön Bilgilendirme Formu" is NOT a link, and the EN notice. Renders the async
 * Server Component directly with a stubbed translator.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));

const TR = {
  title: 'Mesafeli Satış Sözleşmesi',
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

const anchors = (container: HTMLElement) => Array.from(container.querySelectorAll('a'));
const hrefs = (container: HTMLElement) => anchors(container).map((a) => a.getAttribute('href'));

describe('LegalPage — mesafeli-satis Markdown document', () => {
  it('renders the v4 document header untouched (doc code / version)', async () => {
    const { container } = await renderPage('mesafeli-satis', 'en');
    expect(container.textContent).toContain('KK-MSS-2026-V4');
    expect(container.textContent).toContain('4.0');
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('renders canon body: the "Uygulama Niteliği" callout, §20 and the closing records', async () => {
    const { container } = await renderPage('mesafeli-satis', 'tr');
    const text = container.textContent ?? '';
    expect(text).toContain('Uygulama Niteliği');
    expect(text).toContain('20. Yürürlük, Kabul ve Dil');
    expect(text).toContain('Elektronik Kabul Kaydı');
    expect(text).toContain('Hukuki Dayanaklar');
  });

  it('replaces every {{order token}} with a visible blank — no raw token survives', async () => {
    const { container } = await renderPage('mesafeli-satis', 'tr');
    // No raw mustache token reaches the DOM.
    expect(container.innerHTML).not.toMatch(/\{\{[a-z0-9_]+\}\}/);
    // The blank stands in for each of the 31 order fields (35 occurrences).
    const blanks = (container.textContent ?? '').match(/_{11}/g) ?? [];
    expect(blanks.length).toBeGreaterThanOrEqual(31);
  });

  it('leaves no stub placeholder or unconverted <u> markup', async () => {
    const { container } = await renderPage('mesafeli-satis', 'tr');
    const html = container.innerHTML;
    expect(container.textContent).not.toContain('[Placeholder');
    expect(html).not.toContain('%LOCALE%');
    expect(html).not.toContain('<u>');
  });

  it('links the Cayma Bildirim Formu to its published PDF (new tab, no locale)', async () => {
    const { container } = await renderPage('mesafeli-satis', 'tr');
    const pdf = anchors(container).find(
      (a) => a.getAttribute('href') === '/legal/cayma-bildirim-formu.pdf',
    );
    expect(pdf).toBeDefined();
    expect(pdf?.textContent).toContain('Cayma Bildirim Formu');
    expect(pdf?.getAttribute('target')).toBe('_blank');
  });

  it('keeps the current locale on the five internal page cross-references', async () => {
    const en = await renderPage('mesafeli-satis', 'en');
    expect(hrefs(en.container)).toEqual(
      expect.arrayContaining([
        '/en/legal/uyelik-sozlesmesi',
        '/en/legal/kargo-teslimat',
        '/en/legal/iade',
        '/en/legal/gizlilik',
        '/en/legal/kvkk',
      ]),
    );
    cleanup();
    const tr = await renderPage('mesafeli-satis', 'tr');
    expect(hrefs(tr.container)).toEqual(
      expect.arrayContaining([
        '/tr/legal/uyelik-sozlesmesi',
        '/tr/legal/kargo-teslimat',
        '/tr/legal/iade',
        '/tr/legal/gizlilik',
        '/tr/legal/kvkk',
      ]),
    );
  });

  it('does NOT turn "Ön Bilgilendirme Formu" into a link (it has no public page)', async () => {
    const { container } = await renderPage('mesafeli-satis', 'tr');
    // The phrase is present as plain text…
    expect(container.textContent).toContain('Ön Bilgilendirme Formu');
    // …but no anchor carries it or points to an on-bilgilendirme route.
    for (const a of anchors(container)) {
      expect(a.textContent).not.toContain('Ön Bilgilendirme Formu');
      expect(a.getAttribute('href')).not.toContain('bilgilendirme');
    }
  });

  it('shows the "text is in Turkish" notice on non-TR locales but not on TR', async () => {
    const en = await renderPage('mesafeli-satis', 'en');
    expect(en.container.textContent).toContain('The official text of this policy is in Turkish');
    cleanup();
    const tr = await renderPage('mesafeli-satis', 'tr');
    expect(tr.container.textContent).not.toContain(
      'The official text of this policy is in Turkish',
    );
  });

  it('replaced the old s1..s3 stub keys with title/navLabel/enNotice in both locales', () => {
    for (const m of [enMessages, trMessages] as Record<string, string>[]) {
      expect(m['legal.mesafeli_satis.title']).toBeTruthy();
      expect(m['legal.mesafeli_satis.navLabel']).toBeTruthy();
      expect(m['legal.mesafeli_satis.enNotice']).toBeTruthy();
      expect(m['legal.mesafeli_satis.intro']).toBeUndefined();
      expect(m['legal.mesafeli_satis.s1Title']).toBeUndefined();
      expect(m['legal.mesafeli_satis.s3Body']).toBeUndefined();
    }
  });
});
