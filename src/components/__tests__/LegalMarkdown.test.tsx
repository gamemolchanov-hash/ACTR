/**
 * FBG-394 — LegalMarkdown renderer + canonical Gizlilik v3 content.
 *
 * Covers the constrained Markdown subset the legal documents use (headings,
 * GFM tables, lists, inline bold/italic, backslash escapes) and asserts the
 * acceptance-critical strings of the v3 privacy policy are present and rendered.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';

// This config does not set test.globals, so @testing-library's auto-cleanup is
// not registered; unmount between cases so global screen/body queries stay unique.
afterEach(cleanup);
import LegalMarkdown, { parseMarkdown } from '../LegalMarkdown';
import { GIZLILIK_MARKDOWN } from '@/app/[locale]/legal/gizlilik-content';
import { KARGO_TESLIMAT_MARKDOWN } from '@/app/[locale]/legal/kargo-teslimat-content';

describe('parseMarkdown', () => {
  it('classifies headings, tables, lists and paragraphs', () => {
    const blocks = parseMarkdown(
      ['# **Title**', '', '| A | B |', '| --- | --- |', '| 1 | 2 |', '', '* one', '* two', '', 'A paragraph.'].join(
        '\n',
      ),
    );
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'table', 'list', 'paragraph']);
  });

  it('treats a header-only pipe block as a single-row table (callout)', () => {
    const blocks = parseMarkdown(['| Şeffaflık İlkesi metni |', '| :---- |'].join('\n'));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: 'table', rows: [['Şeffaflık İlkesi metni']] });
  });

  it('does not mistake **bold** lines for list items', () => {
    const blocks = parseMarkdown('**AMERICAN CREATOR**');
    expect(blocks[0].kind).toBe('paragraph');
  });

  it('joins consecutive plain lines into one paragraph', () => {
    const blocks = parseMarkdown('first line\nsecond line');
    expect(blocks).toEqual([{ kind: 'paragraph', text: 'first line second line' }]);
  });

  it('returns no blocks for empty input', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('\n\n   \n')).toEqual([]);
  });
});

describe('LegalMarkdown rendering', () => {
  it('renders bold via <strong> and resolves backslash escapes', () => {
    const { container } = render(<LegalMarkdown source={'Telefon **X** \\+90 531 ve 1\\. madde'} />);
    expect(container.querySelector('strong')?.textContent).toBe('X');
    // backslash escapes must not leak into the output
    expect(container.textContent).toContain('+90 531');
    expect(container.textContent).toContain('1. madde');
    expect(container.textContent).not.toContain('\\+');
    expect(container.textContent).not.toContain('1\\.');
  });

  it('renders <br> as a hard line break inside a table cell (FBG-396)', () => {
    const { container } = render(
      <LegalMarkdown source={['| K | V |', '| --- | --- |', '| Adres | A<br>B |'].join('\n')} />,
    );
    const cell = container.querySelector('tbody td:last-child');
    expect(cell?.querySelector('br')).not.toBeNull();
    // no raw <br> markup leaks into the rendered text
    expect(container.textContent).not.toContain('<br>');
  });

  it('renders a GFM table with header and body cells', () => {
    const { container } = render(
      <LegalMarkdown source={['| K | V |', '| --- | --- |', '| MERSİS No | 0560146611100001 |'].join('\n')} />,
    );
    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(within(table as HTMLElement).getByText('0560146611100001')).toBeTruthy();
    expect(table?.querySelectorAll('th')).toHaveLength(2);
  });
});

describe('Gizlilik v3 canonical document', () => {
  it('contains the acceptance-critical identifiers verbatim', () => {
    expect(GIZLILIK_MARKDOWN).toContain('KK-KVKK-GCP-2026-V3');
    expect(GIZLILIK_MARKDOWN).toContain('0560146611100001');
    expect(GIZLILIK_MARKDOWN).toContain('MERSİS No');
    expect(GIZLILIK_MARKDOWN).toContain('GİZLİLİK VE ÇEREZ POLİTİKASI');
    // Turkish text is authoritative
    expect(GIZLILIK_MARKDOWN).toContain('Türkçe metin esas alınır');
    // §7.2 callout: the "Şeffaflık İlkesi" heading and body must not be glued
    // together (the Word soft break U+000B was lost on import).
    expect(GIZLILIK_MARKDOWN).not.toContain('İlkesiYurt');
    expect(GIZLILIK_MARKDOWN).toContain('Şeffaflık İlkesi Yurt');
  });

  it('renders the full document with readable tables and section headings', () => {
    render(<LegalMarkdown source={GIZLILIK_MARKDOWN} />);
    expect(screen.getByText('KK-KVKK-GCP-2026-V3')).toBeTruthy();
    expect(screen.getByText('0560146611100001')).toBeTruthy();
    // 15 sections (#) + subsections (##) + the two big data tables render
    const doc = document.body;
    expect(doc.querySelectorAll('table').length).toBeGreaterThanOrEqual(6);
    expect(doc.textContent).toContain('Amaç ve Kapsam');
    expect(doc.textContent).toContain('Hukuki Dayanaklar');
  });
});

describe('Kargo ve Teslimat v2 canonical document (FBG-396)', () => {
  it('contains the acceptance-critical identifiers verbatim', () => {
    expect(KARGO_TESLIMAT_MARKDOWN).toContain('KK-TK-KTP-2026-V2');
    expect(KARGO_TESLIMAT_MARKDOWN).toContain('0560146611100001');
    expect(KARGO_TESLIMAT_MARKDOWN).toContain('6311761487');
    expect(KARGO_TESLIMAT_MARKDOWN).toContain('KARGO VE TESLİMAT POLİTİKASI');
    // All 19 sections + the legal-basis appendix must be present.
    expect(KARGO_TESLIMAT_MARKDOWN).toContain('19\\. Taraflar Arası Sorumluluk Matrisi');
    expect(KARGO_TESLIMAT_MARKDOWN).toContain('Hukuki Dayanaklar');
    // Turkish text is authoritative.
    expect(KARGO_TESLIMAT_MARKDOWN).toContain('Türkçe metin esas alınır');
    // §2 requisites must be un-glued (the docx→md export concatenated them).
    expect(KARGO_TESLIMAT_MARKDOWN).not.toContain('ŞİRKETİMERSİS');
    expect(KARGO_TESLIMAT_MARKDOWN).not.toContain('ŞİRKETİVKN');
    expect(KARGO_TESLIMAT_MARKDOWN).not.toContain('DairesiAdres');
  });

  it('renders the full document with readable, un-glued tables', () => {
    render(<LegalMarkdown source={KARGO_TESLIMAT_MARKDOWN} />);
    const doc = document.body;
    expect(screen.getByText('KK-TK-KTP-2026-V2')).toBeTruthy();
    // §2 (parties) + §19 (matrix) + the header and callout tables.
    expect(doc.querySelectorAll('table').length).toBeGreaterThanOrEqual(4);
    // requisite fields are split onto separate lines via <br> (a <br> adds no
    // text, so this shows in the element tree rather than in textContent).
    const saticiCell = Array.from(doc.querySelectorAll('td')).find((td) =>
      td.innerHTML.includes('ŞİRKETİ<br'),
    );
    expect(saticiCell).toBeTruthy();
    expect(doc.querySelectorAll('td br').length).toBeGreaterThan(0);
  });
});
