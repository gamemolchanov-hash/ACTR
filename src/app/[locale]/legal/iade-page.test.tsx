/**
 * FBG-452 — LegalPage Markdown branch (slug `iade`).
 *
 * The return/withdrawal policy renders a full Markdown document instead of
 * s1..sN sections; non-TR locales get a short "official text is in Turkish"
 * notice, TR does not. This test pins the §12 rewrite ("Ürünün Değerinde
 * Azalma") to the lawyer's new canon: seven paragraphs, the old packaging
 * obligation gone, header/version and the §4 PDF link untouched. Renders the async Server
 * Component directly with a stubbed translator.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));

const TR = {
  title: 'İade ve Cayma Politikası',
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

describe('LegalPage — iade Markdown document', () => {
  it('renders the v2 document header untouched (doc code / version)', async () => {
    const { container } = await renderPage('iade', 'en');
    expect(container.textContent).toContain('KK-TK-ICP-2026-V2');
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('renders the rewritten §12 (all seven canon paragraphs)', async () => {
    const { container } = await renderPage('iade', 'tr');
    const text = container.textContent ?? '';
    // heading renamed to the lawyer's canon (FBG-460); body unchanged from FBG-452
    expect(text).toContain('12. Ürünün Değerinde Azalma');
    // 1 → 7, a fragment of each new paragraph
    expect(text).toContain(
      'Alıcı, cayma hakkı süresi içinde ürünü yalnızca niteliğini, özelliklerini ve işleyişini belirlemek',
    );
    expect(text).toContain('Alıcı yalnızca fiilen oluşan, ispatlanabilen ve hukuken talep edilebilir');
    expect(text).toContain('Ücret iadesinden otomatik olarak herhangi bir tutar düşülmez');
    expect(text).toContain(
      'Depo, lojistik hizmet sağlayıcısı veya iade kabul personeli tek başına değer kaybı tespiti yapamaz',
    );
    expect(text).toContain('somut delillerle ortaya konulması ve ilgili mevzuata göre hukuken talep edilebilir');
    expect(text).toContain('olağan inceleme kapsamında gerçekleştirilen işlemler nedeniyle değer kaybı bulunduğu kabul edilemez');
    expect(text).toContain(
      'Satıcı gerekli gördüğü ölçüde fotoğraf, video, teslim kayıtları, taşıma kayıtları ve diğer teknik delillerden yararlanabilir',
    );
  });

  it('drops the old §12 packaging obligation', async () => {
    const { container } = await renderPage('iade', 'tr');
    const text = container.textContent ?? '';
    // former wording about re-packaging the parcel for the return leg is gone
    expect(text).not.toContain('taşıma etiketi yapıştırılarak');
    expect(text).not.toContain('iade taşımasında zarar görmeyecek şekilde paketlemelidir');
  });

  it('keeps the §4 "Örnek Cayma Bildirim Formu" PDF links', async () => {
    const { container } = await renderPage('iade', 'tr');
    const pdfLinks = Array.from(container.querySelectorAll('a')).filter(
      (a) => a.getAttribute('href') === '/legal/cayma-bildirim-formu.pdf',
    );
    expect(pdfLinks.length).toBeGreaterThanOrEqual(2);
    expect(pdfLinks[0].textContent).toContain('Örnek Cayma Bildirim Formu');
  });

  it('shows the "text is in Turkish" notice on non-TR locales but not on TR', async () => {
    const en = await renderPage('iade', 'en');
    expect(en.container.textContent).toContain('The official text of this policy is in Turkish');
    cleanup();
    const tr = await renderPage('iade', 'tr');
    expect(tr.container.textContent).not.toContain('The official text of this policy is in Turkish');
  });
});
