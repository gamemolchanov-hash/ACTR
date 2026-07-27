/**
 * FBG-398 — LegalPage Markdown branch (slug `uyelik-sozlesmesi`).
 *
 * The membership agreement renders a full Markdown document instead of s1..sN
 * sections; non-TR locales get a short "official text is in Turkish" notice, TR
 * does not. Renders the async Server Component directly with a stubbed
 * translator.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));

const TR = {
  title: 'Üyelik Sözleşmesi',
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

describe('LegalPage — uyelik-sozlesmesi Markdown document', () => {
  it('renders the v2 document with the doc code, all sections and legal basis', async () => {
    const { container } = await renderPage('uyelik-sozlesmesi', 'en');
    const text = container.textContent ?? '';
    expect(text).toContain('KK-ET-UYS-2026-V2');
    // Spot-check the section span: first, a middle, and the last (23) heading.
    expect(text).toContain('1. Amaç, Taraflar ve Belgenin Niteliği');
    expect(text).toContain('7. Satıcı ve Operasyonel Hizmet Sağlayıcıların Rolleri');
    expect(text).toContain('23. Bölünebilirlik, Dil, Yürürlük ve İletişim');
    expect(text).toContain('Hukuki Dayanaklar');
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('keeps the §2/§3/§7 requisite tables readable (no glued fields)', async () => {
    const { container } = await renderPage('uyelik-sozlesmesi', 'tr');
    const cellText = Array.from(container.querySelectorAll('th, td')).map((c) => c.textContent);
    // §2: MERSİS and VKN each resolve to their own standalone cell — i.e. the
    // key/value rows were NOT glued into one blob (the classic docx→md defect).
    expect(cellText).toContain('0560146611100001');
    expect(cellText).toContain('Alanya Vergi Dairesi / 5601466111');
    // §7: the fulfillment operator sits in its own first-column cell, kept
    // separate from the "Rol" column.
    expect(cellText).toContain('NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ');
    // The escaped phone `\+90…` resolves to a literal `+`, the backslash gone.
    const text = container.textContent ?? '';
    expect(text).toContain('+90 531 871 30 07');
    expect(text).not.toContain('\\+90');
    expect(text).not.toContain('ŞİRKETİMERSİS');
  });

  it('links referenced legal documents to the active-locale pages; self-reference stays text (FBG-453)', async () => {
    const { container } = await renderPage('uyelik-sozlesmesi', 'tr');
    const hrefByText = (t: string) =>
      Array.from(container.querySelectorAll('a'))
        .find((a) => a.textContent === t)
        ?.getAttribute('href');
    expect(hrefByText('Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni')).toBe('/tr/legal/kvkk');
    expect(hrefByText('Gizlilik ve Çerez Politikası')).toBe('/tr/legal/gizlilik');
    expect(hrefByText('Kargo ve Teslimat Politikası')).toBe('/tr/legal/kargo-teslimat');
    expect(hrefByText('İade ve Cayma Politikası')).toBe('/tr/legal/iade');
    expect(hrefByText('Ticari Elektronik İleti Bilgilendirmesi ve Onay Metni')).toBe(
      '/tr/legal/ticari-elektronik-ileti',
    );
    // The §13 self-reference is intentionally left as plain text, not a link.
    const linkTexts = Array.from(container.querySelectorAll('a')).map((a) => a.textContent);
    expect(linkTexts).not.toContain('Üyelik Sözleşmesi');
  });

  it('carries the page locale into the document links on /en (FBG-453)', async () => {
    const { container } = await renderPage('uyelik-sozlesmesi', 'en');
    const kvkk = Array.from(container.querySelectorAll('a')).find(
      (a) => a.textContent === 'Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni',
    );
    expect(kvkk?.getAttribute('href')).toBe('/en/legal/kvkk');
  });

  it('uses the updated §4 and §13 wording from the canon (FBG-453)', async () => {
    const { container } = await renderPage('uyelik-sozlesmesi', 'tr');
    const text = container.textContent ?? '';
    // §4: the capitalised document names, rest of the paragraph unchanged.
    expect(text).toContain(
      'Üyelik formunda Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni ile Gizlilik ve Çerez Politikası ayrıca erişilebilir kılınır.',
    );
    // §13: first paragraph incl. the "ticari elektronik ileti onayı" tail.
    expect(text).toContain(
      "Üyelik Sözleşmesi'nin kabulü, açık rıza verilmesi veya ticari elektronik ileti onayı verilmesi anlamına gelmez.",
    );
    // the superseded §4 phrasing is gone.
    expect(text).not.toContain('aydınlatma metinleri ayrıca erişilebilir kılınır');
  });

  it('shows the "text is in Turkish" notice on non-TR locales only', async () => {
    const en = await renderPage('uyelik-sozlesmesi', 'en');
    expect(en.container.textContent).toContain('The official text of this policy is in Turkish');
    cleanup();
    const tr = await renderPage('uyelik-sozlesmesi', 'tr');
    expect(tr.container.textContent).toContain('KK-ET-UYS-2026-V2');
    expect(tr.container.textContent).not.toContain('The official text of this policy is in Turkish');
  });
});
