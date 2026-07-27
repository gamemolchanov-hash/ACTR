/**
 * Mesafeli Satış Sözleşmesi — DOM guarantees when rendered on the checkout (FBG-458).
 *
 * Renders the filled contract through LegalMarkdown (the same component the
 * checkout modal uses, next to the OBF) rather than mounting the Stripe/auth-heavy
 * checkout page, mirroring the OBF checkout test. Asserts the acceptance criteria
 * that only hold on the DOM: no raw placeholder reaches the screen, every text
 * node renders at ≥16px, a `|` in the data does not corrupt the tables, and the
 * canon cross-references keep the active locale.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import LegalMarkdown from '@/components/LegalMarkdown';
import { buildOnBilgilendirmeData, renderOnBilgilendirmeFormu } from '@/lib/on-bilgilendirme';
import { buildMesafeliSatisData, renderMesafeliSatis } from '@/lib/mesafeli-satis';

afterEach(cleanup);

const baseInput = {
  generatedAt: new Date(Date.UTC(2026, 6, 22, 11, 30, 0)),
  customer: { name: 'Ayşe Yılmaz', phone: '+90 555 111 22 33', email: 'ayse@example.com' },
  address: 'Atatürk Cad., No: 5, İstanbul, 34000, Turkey',
  currencyLabel: 'TL',
  items: [
    { name: 'Pomat A', sku: 'SKU-1', quantity: 2, unitPrice: 100, lineTotal: 200 },
    { name: 'Şampuan B', sku: 'SKU-2', quantity: 1, unitPrice: 50, lineTotal: 50 },
  ],
  subtotal: 250,
  shippingCost: 30,
  walletApplied: 0,
  grandTotal: 280,
  rate: { carrier: 'Yurtiçi Kargo', name: 'Standart', estMin: 1, estMax: 3 },
  kvkkNoticeUrl: 'https://american-creator.tr/legal/kvkk',
};

const markdown = renderMesafeliSatis(buildMesafeliSatisData(baseInput));

describe('Mesafeli Satış Sözleşmesi on checkout', () => {
  it('shows no raw {{…}} placeholder in the DOM (multi-item cart)', () => {
    const { container } = render(<LegalMarkdown source={markdown} />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('{{');
    expect(text).not.toContain('}}');
    expect(text).toContain('Pomat A');
    expect(text).toContain('Şampuan B');
    expect(text).toContain('Ayşe Yılmaz');
    expect(text).toContain('KK-MSS-2026-V4');
    expect(text).toContain('KK-ET-OBF-2026-V2'); // pre-information version
  });

  it('renders the contract text — including table cells — at ≥16px', () => {
    const { container } = render(<LegalMarkdown source={markdown} />);
    const nodes = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, td, th');
    expect(nodes.length).toBeGreaterThan(0);
    for (const el of Array.from(nodes)) {
      const size = parseFloat(window.getComputedStyle(el).fontSize);
      expect(size).toBeGreaterThanOrEqual(16);
    }
  });

  it('sits next to the OBF: both documents fill from one order snapshot, token-free', () => {
    const obf = renderOnBilgilendirmeFormu(buildOnBilgilendirmeData(baseInput));
    for (const doc of [obf, markdown]) {
      expect(doc).not.toMatch(/\{\{|\}\}/);
      expect(doc.length).toBeGreaterThan(0);
    }
    expect(obf).toContain('ÖN BİLGİLENDİRME FORMU');
    expect(markdown).toContain('MESAFELİ SATIŞ SÖZLEŞMESİ');
  });

  it('keeps the active locale on internal page links and opens the PDF in a new tab', () => {
    const { container } = render(<LegalMarkdown source={markdown} locale="en" />);
    const anchors = Array.from(container.querySelectorAll('a'));

    const kvkk = anchors.find((a) => a.getAttribute('href') === '/en/legal/kvkk');
    expect(kvkk).toBeDefined();

    const withdrawalForm = anchors.find(
      (a) => a.getAttribute('href') === '/legal/cayma-bildirim-formu.pdf',
    );
    expect(withdrawalForm).toBeDefined();
    expect(withdrawalForm?.getAttribute('target')).toBe('_blank');
  });

  it('does not corrupt the tables when data contains a "|"', () => {
    const md = renderMesafeliSatis(
      buildMesafeliSatisData({
        ...baseInput,
        address: 'Cad. | Sok No 5',
        items: [{ name: 'Serum | 50ml', sku: 'SKU|1', quantity: 1, unitPrice: 10, lineTotal: 10 }],
      }),
    );
    const { container } = render(<LegalMarkdown source={md} />);
    // No table body row spilled into a third cell.
    for (const row of Array.from(container.querySelectorAll('tbody tr'))) {
      expect(row.querySelectorAll('td').length).toBeLessThanOrEqual(2);
    }
    expect(container.textContent).toContain('Serum / 50ml');
  });
});
