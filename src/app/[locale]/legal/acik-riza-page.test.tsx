/**
 * FBG-455 — LegalPage Markdown branch (slug `acik-riza`).
 *
 * The "Açık Rıza Metni" v3 renders a full Markdown document instead of s1..sN
 * sections; non-TR locales get a short "official text is in Turkish" notice, TR
 * does not. This test pins the canon (doc code KK-KVKK-AR-2026-V3), the two
 * consent modules with their Unicode checkboxes left as plain text (never an
 * <input>), and the §7 in-page link to the KVKK clarification text staying in
 * the active locale. Renders the async Server Component directly with a stubbed
 * translator.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));

const TR = {
  title: 'Açık Rıza Metni',
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

describe('LegalPage — acik-riza Markdown document', () => {
  it('renders the v3 document header (doc code / version / table)', async () => {
    const { container } = await renderPage('acik-riza', 'en');
    expect(container.textContent).toContain('KK-KVKK-AR-2026-V3');
    expect(container.textContent).toContain('3.0');
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('renders both consent modules with checkboxes kept as plain text', async () => {
    const { container } = await renderPage('acik-riza', 'tr');
    const text = container.textContent ?? '';
    expect(text).toContain('Web Onay Kutusu - Modül A');
    expect(text).toContain('Web/Form Onay Kutusu - Modül B');
    // consent sentence fragments
    expect(text).toContain('bana özel ürün sıralaması, öneri ve kampanya profili oluşturulması');
    expect(text).toContain('gönüllü olarak paylaştığım sağlık bilgilerimin, fotoğraf ve belgelerin');
    // the □ glyph survives as document text, never turned into a form control
    expect(text).toContain('□');
    expect(container.querySelector('input')).toBeNull();
  });

  it('keeps the modular-consent intro and the legal-basis section', async () => {
    const { container } = await renderPage('acik-riza', 'tr');
    const text = container.textContent ?? '';
    expect(text).toContain('Ayrı ve Modüler Rıza');
    expect(text).toContain('Hiçbir kutu önceden işaretlenmez');
    expect(text).toContain('Hukuki Dayanaklar');
    expect(text).toContain('6698 sayılı Kişisel Verilerin Korunması Kanunu');
  });

  it('links §7 to the KVKK clarification text and keeps the active locale', async () => {
    const en = await renderPage('acik-riza', 'en');
    const enLink = Array.from(en.container.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === '/en/legal/kvkk',
    );
    expect(enLink).toBeTruthy();
    expect(enLink?.textContent).toContain('Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni');
    cleanup();

    const tr = await renderPage('acik-riza', 'tr');
    const trLink = Array.from(tr.container.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === '/tr/legal/kvkk',
    );
    expect(trLink).toBeTruthy();
    // the "KVKK İlgili Kişi Başvuru Formu" mention next to it stays plain text
    expect(tr.container.querySelector('a[href$="/legal/basvuru-formu"]')).toBeNull();
  });

  it('shows the "text is in Turkish" notice on non-TR locales but not on TR', async () => {
    const en = await renderPage('acik-riza', 'en');
    expect(en.container.textContent).toContain('The official text of this policy is in Turkish');
    cleanup();
    const tr = await renderPage('acik-riza', 'tr');
    expect(tr.container.textContent).not.toContain('The official text of this policy is in Turkish');
  });
});
