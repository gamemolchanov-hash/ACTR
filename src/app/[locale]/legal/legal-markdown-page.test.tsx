/**
 * FBG-394 — LegalPage Markdown branch (slug `gizlilik`).
 *
 * The privacy policy renders a full Markdown document instead of s1..sN
 * sections; non-TR locales get a short "official text is in Turkish" notice,
 * TR does not. Renders the async Server Component directly with a stubbed
 * translator.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));

const TR = {
  title: 'Gizlilik ve Çerez Politikası',
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

describe('LegalPage — gizlilik Markdown document', () => {
  it('renders the v3 document with tables on the EN page', async () => {
    const { container } = await renderPage('gizlilik', 'en');
    expect(container.textContent).toContain('KK-KVKK-GCP-2026-V3');
    expect(container.textContent).toContain('0560146611100001');
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('shows the "text is in Turkish" notice on non-TR locales', async () => {
    const { container } = await renderPage('gizlilik', 'en');
    expect(container.textContent).toContain('The official text of this policy is in Turkish');
  });

  it('does NOT show the EN notice on the TR page', async () => {
    const { container } = await renderPage('gizlilik', 'tr');
    expect(container.textContent).toContain('KK-KVKK-GCP-2026-V3');
    expect(container.textContent).not.toContain('The official text of this policy is in Turkish');
  });
});
