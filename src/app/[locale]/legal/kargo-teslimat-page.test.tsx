/**
 * FBG-396 — LegalPage Markdown branch (slug `kargo-teslimat`).
 *
 * The shipping policy renders a full Markdown document instead of s1..sN
 * sections; non-TR locales get a short "official text is in Turkish" notice,
 * TR does not. Renders the async Server Component directly with a stubbed
 * translator.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));

const TR = {
  title: 'Kargo ve Teslimat Politikası',
  enNotice: 'The official text of this policy is in Turkish (Türkçe).',
} as Record<string, string>;

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => TR[key] ?? key,
}));

import LegalPage from './[slug]/page';

afterEach(cleanup);

const renderPage = async (slug: string, locale: string) => {
  const ui = await LegalPage({ params: Promise.resolve({ slug, locale }) });
  return render(ui);
};

describe('LegalPage — kargo-teslimat Markdown document', () => {
  it('renders the v2 document with tables and both parties on the EN page', async () => {
    const { container } = await renderPage('kargo-teslimat', 'en');
    expect(container.textContent).toContain('KK-TK-KTP-2026-V2');
    // Satıcı MERSİS + NİKAR VKN — the acceptance-critical requisites.
    expect(container.textContent).toContain('0560146611100001');
    expect(container.textContent).toContain('6311761487');
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('un-glues the §2 requisite cells (fields on separate lines)', async () => {
    const { container } = await renderPage('kargo-teslimat', 'tr');
    // The docx→md export concatenated the fields; <br> line breaks separate them.
    // A <br> contributes no text, so the split shows in the element tree.
    const brCells = Array.from(container.querySelectorAll('td')).filter((td) =>
      td.querySelector('br'),
    );
    expect(brCells.length).toBeGreaterThan(0);
    // the break lands right after the company suffix, not inside a word.
    const satici = brCells.find((td) => td.innerHTML.includes('ŞİRKETİ<br'));
    expect(satici).toBeTruthy();
  });

  it('shows the "text is in Turkish" notice on non-TR locales', async () => {
    const { container } = await renderPage('kargo-teslimat', 'en');
    expect(container.textContent).toContain('The official text of this policy is in Turkish');
  });

  it('does NOT show the EN notice on the TR page', async () => {
    const { container } = await renderPage('kargo-teslimat', 'tr');
    expect(container.textContent).toContain('KK-TK-KTP-2026-V2');
    expect(container.textContent).not.toContain('The official text of this policy is in Turkish');
  });

  it('links İade ve Cayma Politikası (§1/§4/§7/§13) and the §1 sözleşme, carrying the locale (FBG-457)', async () => {
    const { container } = await renderPage('kargo-teslimat', 'tr');
    const iadeLinks = Array.from(container.querySelectorAll('a')).filter(
      (a) => a.textContent === 'İade ve Cayma Politikası',
    );
    // §1, §4, §7 and §13 each reference the return policy → four locale-aware links.
    expect(iadeLinks.length).toBe(4);
    expect(iadeLinks.every((a) => a.getAttribute('href') === '/tr/legal/iade')).toBe(true);
    // §1 also links the distance-sales contract.
    const mesafeli = Array.from(container.querySelectorAll('a')).find(
      (a) => a.textContent === 'Mesafeli Satış Sözleşmesi',
    );
    expect(mesafeli?.getAttribute('href')).toBe('/tr/legal/mesafeli-satis');
  });

  it('leaves "Ön Bilgilendirme Formu" (§1) as plain text, not a link (FBG-457)', async () => {
    const { container } = await renderPage('kargo-teslimat', 'tr');
    expect(container.textContent).toContain('Ön Bilgilendirme Formu');
    const linkTexts = Array.from(container.querySelectorAll('a')).map((a) => a.textContent);
    expect(linkTexts).not.toContain('Ön Bilgilendirme Formu');
  });

  it('uses the revised §16 wording and links KVKK + Gizlilik with the TR locale (FBG-457)', async () => {
    const { container } = await renderPage('kargo-teslimat', 'tr');
    const text = container.textContent ?? '';
    // §16 second sentence rewritten to the client's 27.07.2026 canon; the
    // first sentence and the rest of the paragraph are unchanged.
    expect(text).toContain(
      "Kişisel verilerin işlenmesine ve aktarılmasına ilişkin ayrıntılı açıklamalar, Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni ile Gizlilik ve Çerez Politikası'nda yer almaktadır.",
    );
    // the superseded phrasing is gone.
    expect(text).not.toContain('İnternet Sitesi KVKK Aydınlatma Metni');
    const hrefByText = (t: string) =>
      Array.from(container.querySelectorAll('a'))
        .find((a) => a.textContent === t)
        ?.getAttribute('href');
    expect(hrefByText('Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni')).toBe(
      '/tr/legal/kvkk',
    );
    expect(hrefByText('Gizlilik ve Çerez Politikası')).toBe('/tr/legal/gizlilik');
  });

  it('carries the page locale into the §16 links on /en (FBG-457)', async () => {
    const { container } = await renderPage('kargo-teslimat', 'en');
    const kvkk = Array.from(container.querySelectorAll('a')).find(
      (a) => a.textContent === 'Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni',
    );
    expect(kvkk?.getAttribute('href')).toBe('/en/legal/kvkk');
    const gizlilik = Array.from(container.querySelectorAll('a')).find(
      (a) => a.textContent === 'Gizlilik ve Çerez Politikası',
    );
    expect(gizlilik?.getAttribute('href')).toBe('/en/legal/gizlilik');
  });
});
