/**
 * FBG-397 — LegalPage Markdown branch (slug `ticari-elektronik-ileti`).
 *
 * The commercial-electronic-message notice renders a full Markdown document
 * instead of s1..sN sections; non-TR locales get a short "official text is in
 * Turkish" notice, TR does not. Renders the async Server Component directly with
 * a stubbed translator.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));

const TR = {
  title: 'Ticari Elektronik İleti Bilgilendirmesi ve Onay Metni',
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

describe('LegalPage — ticari-elektronik-ileti Markdown document', () => {
  it('renders the v2 document with the doc code, MERSİS and tables', async () => {
    const { container } = await renderPage('ticari-elektronik-ileti', 'en');
    expect(container.textContent).toContain('KK-ET-TEI-2026-V2');
    // BÖLÜM A / BÖLÜM B both present.
    expect(container.textContent).toContain('BÖLÜM A');
    expect(container.textContent).toContain('BÖLÜM B');
    expect(container.textContent).toContain('Hukuki Dayanaklar');
    // §2 identity requisite (MERSİS).
    expect(container.textContent).toContain('0560146611100001');
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('un-glues the §18 footer labels (label on its own line)', async () => {
    const { container } = await renderPage('ticari-elektronik-ileti', 'tr');
    // The docx→md export glued the callout label to the footer text;
    // a <br> line break separates them. A <br> contributes no text, so the
    // split shows in the element tree.
    const cells = Array.from(container.querySelectorAll('th, td')).filter((c) =>
      c.querySelector('br'),
    );
    expect(cells.length).toBeGreaterThan(0);
    // "E-posta footer" / "Telefon araması" labels break before the body.
    const glued = cells.find(
      (c) => /footer<br/.test(c.innerHTML) || /araması<br/.test(c.innerHTML),
    );
    expect(glued).toBeTruthy();
  });

  it('renders the ☐ checkboxes (§15) and mustache placeholders verbatim', async () => {
    const { container } = await renderPage('ticari-elektronik-ileti', 'tr');
    // Empty-checkbox glyph survives as plain Unicode.
    expect(container.textContent).toContain('☐');
    // Backslash escape (`{{ $consent\_at }}`) is resolved → literal underscore,
    // and the whole placeholder token stays visible.
    expect(container.textContent).toContain('{{ $consent_at }}');
    expect(container.textContent).toContain('{{ $sms_opt_out_instruction }}');
    expect(container.textContent).toContain('{{ $campaign_url }}');
    // The escaping backslash must NOT leak to the page.
    expect(container.textContent).not.toContain('consent\\_at');
  });

  it('keeps other legal-document names bold, not links', async () => {
    const { container } = await renderPage('ticari-elektronik-ileti', 'tr');
    const strongTexts = Array.from(container.querySelectorAll('strong')).map(
      (s) => s.textContent,
    );
    expect(strongTexts).toContain('Gizlilik ve Çerez Politikası');
    // No anchor points at that document (cross-links are a later task).
    const linkTexts = Array.from(container.querySelectorAll('a')).map((a) => a.textContent);
    expect(linkTexts).not.toContain('Gizlilik ve Çerez Politikası');
  });

  it('shows the "text is in Turkish" notice on non-TR locales only', async () => {
    const en = await renderPage('ticari-elektronik-ileti', 'en');
    expect(en.container.textContent).toContain('The official text of this policy is in Turkish');
    cleanup();
    const tr = await renderPage('ticari-elektronik-ileti', 'tr');
    expect(tr.container.textContent).toContain('KK-ET-TEI-2026-V2');
    expect(tr.container.textContent).not.toContain('The official text of this policy is in Turkish');
  });
});
