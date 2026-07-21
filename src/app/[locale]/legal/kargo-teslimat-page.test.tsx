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
});
