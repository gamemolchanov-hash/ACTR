/**
 * Ön Bilgilendirme Formu — DOM guarantees when rendered on the checkout (FBG-401).
 *
 * Renders the filled form through LegalMarkdown (the same component the checkout
 * modal uses) rather than mounting the Stripe/auth-heavy checkout page, mirroring
 * the checkout-consent unit-test strategy. Asserts the acceptance criteria that
 * only hold on the actual DOM: no raw placeholder reaches the screen, every text
 * node (incl. table cells) renders at ≥16px (the regulator's ön bilgilendirme
 * minimum), and a `|` in the data does not corrupt the §2/§4 tables.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import LegalMarkdown from '@/components/LegalMarkdown';
import { buildOnBilgilendirmeData, renderOnBilgilendirmeFormu } from '@/lib/on-bilgilendirme';

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
  grandTotal: 280,
  rate: { carrier: 'Yurtiçi Kargo', name: 'Standart', estMin: 1, estMax: 3 },
  kvkkNoticeUrl: 'https://american-creator.tr/legal/kvkk',
};

const markdown = renderOnBilgilendirmeFormu(buildOnBilgilendirmeData(baseInput));

describe('Ön Bilgilendirme Formu on checkout', () => {
  it('shows no raw {{…}} placeholder in the DOM (multi-item cart)', () => {
    const { container } = render(<LegalMarkdown source={markdown} />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('{{');
    expect(text).not.toContain('}}');
    expect(text).toContain('Pomat A');
    expect(text).toContain('Şampuan B');
    expect(text).toContain('Ayşe Yılmaz');
    expect(text).toContain('KK-ET-OBF-2026-V2');
  });

  it('renders the form text — including table cells — at ≥16px', () => {
    const { container } = render(<LegalMarkdown source={markdown} />);
    const nodes = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, td, th');
    expect(nodes.length).toBeGreaterThan(0);
    for (const el of Array.from(nodes)) {
      const size = parseFloat(window.getComputedStyle(el).fontSize);
      expect(size).toBeGreaterThanOrEqual(16);
    }
  });

  it('does not corrupt §2/§4 tables when data contains a "|"', () => {
    const md = renderOnBilgilendirmeFormu(
      buildOnBilgilendirmeData({
        ...baseInput,
        address: 'Cad. | Sok No 5',
        items: [{ name: 'Serum | 50ml', sku: 'SKU|1', quantity: 1, unitPrice: 10, lineTotal: 10 }],
      }),
    );
    const { container } = render(<LegalMarkdown source={md} />);
    // No table body row spilled into a third cell.
    for (const row of Array.from(container.querySelectorAll('tbody tr'))) {
      expect(row.querySelectorAll('td').length).toBe(2);
    }
    expect(container.textContent).toContain('Serum / 50ml');
  });
});
