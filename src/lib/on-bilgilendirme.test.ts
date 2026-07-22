/**
 * Ön Bilgilendirme Formu placeholder substitution (FBG-401).
 *
 * The critical acceptance guarantees:
 *  - NO raw `{{…}}` token survives into the rendered form (incl. multi-item
 *    carts, where §4's product block repeats);
 *  - the grand total equals the charge (payTotal) and the summary reconciles,
 *    including the promo>subtotal clamp edge;
 *  - a `|` in any value cannot break the §2/§4 GFM tables.
 * Pure-function tests (deterministic: the timestamp is passed in), so no need to
 * mount the Stripe/auth-heavy checkout page.
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '@/components/LegalMarkdown';
import {
  buildOnBilgilendirmeData,
  renderOnBilgilendirmeFormu,
  formatObfAmount,
  type BuildOnBilgilendirmeInput,
} from './on-bilgilendirme';

const FIXED = new Date(Date.UTC(2026, 6, 22, 11, 30, 0));

function sampleInput(overrides: Partial<BuildOnBilgilendirmeInput> = {}): BuildOnBilgilendirmeInput {
  return {
    generatedAt: FIXED,
    customer: { name: 'Ayşe Yılmaz', phone: '+90 555 111 22 33', email: 'ayse@example.com' },
    address: 'Atatürk Cad., No: 5, İstanbul, 34000, Turkey',
    currencyLabel: 'TL',
    items: [
      { name: 'Pomat A', sku: 'SKU-1', quantity: 2, unitPrice: 100, lineTotal: 200 },
      { name: 'Şampuan B', sku: 'SKU-2', quantity: 1, unitPrice: 50, lineTotal: 50 },
    ],
    subtotal: 250,
    shippingCost: 30,
    grandTotal: 280, // 250 + 30, no discount
    rate: { carrier: 'Yurtiçi Kargo', name: 'Standart', estMin: 1, estMax: 3 },
    kvkkNoticeUrl: 'https://american-creator.tr/legal/kvkk',
    ...overrides,
  };
}

const render = (o: Partial<BuildOnBilgilendirmeInput> = {}) =>
  renderOnBilgilendirmeFormu(buildOnBilgilendirmeData(sampleInput(o)));

/** Every table row across the whole form (each OBF table is 2-column). */
function tableRows(md: string): string[][] {
  return parseMarkdown(md)
    .filter((b): b is Extract<ReturnType<typeof parseMarkdown>[number], { kind: 'table' }> =>
      b.kind === 'table',
    )
    .flatMap((t) => t.rows);
}

describe('renderOnBilgilendirmeFormu', () => {
  it('leaves no raw {{…}} token in the rendered form (multi-item cart)', () => {
    expect(render()).not.toMatch(/\{\{|\}\}/);
  });

  it('emits one Ürün Bilgileri block per cart line', () => {
    const md = render();
    expect((md.match(/\*\*Ürün Bilgileri\*\*/g) || []).length).toBe(2);
    expect(md).toContain('Pomat A');
    expect(md).toContain('Şampuan B');
  });

  it('preserves the canonical doc code and seller requisites', () => {
    const md = render();
    expect(md).toContain('KK-ET-OBF-2026-V2');
    expect(md).toContain('0560146611100001'); // MERSİS
    expect(md).toContain('5601466111'); // VKN
    expect(md).toContain('NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ');
  });

  it('fills order / payment / delivery fields', () => {
    const md = render();
    expect(md).toMatch(/AC-\d{8}-\d{6}/); // client draft reference
    expect(md).toContain('Ayşe Yılmaz');
    expect(md).toContain('Atatürk Cad.');
    expect(md).toContain('Uygulanmamaktadır'); // taksit + variant
    expect(md).toContain('Yoktur'); // hygiene exception list
    expect(md).toContain('Yurtiçi Kargo'); // delivery carrier
    expect(md).toContain('1–3 iş günü'); // estimated period
    expect(md).toMatch(/Ödenecek Toplam Tutar \| 280,00 TL/); // grand total = payTotal
  });

  it('shows the grand total = payTotal and reconciles the summary (discount derived)', () => {
    // subtotal 250 + shipping 30 − payTotal 230 ⇒ total discount 50,00
    const md = render({ grandTotal: 230 });
    expect(md).toMatch(/Toplam İndirim \| 50,00 TL/);
    expect(md).toMatch(/Ödenecek Toplam Tutar \| 230,00 TL/);
  });

  it('matches the charged amount when a promo exceeds the subtotal (clamp edge)', () => {
    // checkout: finalTotal=max(0,100−150)=0 → +shipping 20 → payTotal 20.
    // The form MUST show 20,00 (not 0,00) and discount = 100 + 20 − 20 = 100.
    const md = render({ subtotal: 100, shippingCost: 20, grandTotal: 20 });
    expect(md).toMatch(/Ödenecek Toplam Tutar \| 20,00 TL/);
    expect(md).toMatch(/Toplam İndirim \| 100,00 TL/);
  });

  it('degrades gracefully with a null-price item and no shipping rate (negative case)', () => {
    const md = render({
      items: [{ name: null, sku: 'SKU-X', quantity: 1, unitPrice: null, lineTotal: null }],
      rate: null,
      subtotal: 0,
      shippingCost: 0,
      grandTotal: 0,
    });
    expect(md).not.toMatch(/\{\{|\}\}/);
    expect(md).toContain('Belirlenecek'); // delivery fields TBD, no invented carrier
    expect(md).toContain('SKU-X'); // missing name falls back to SKU
  });

  it('falls back to a dash for a blank customer / address', () => {
    const md = render({ customer: { name: '', phone: '', email: '' }, address: '   ' });
    expect(md).not.toMatch(/\{\{|\}\}/);
    expect(md).toContain('—');
  });

  it('keeps §2/§4 tables 2-column when values contain a "|" (GFM delimiter)', () => {
    const md = render({
      customer: { name: 'Ali | Veli', phone: '+90 | 555', email: 'a@b.co' },
      address: 'Cad. | Sok No 5 | Daire 3',
      items: [{ name: 'Serum | 50ml', sku: 'SKU|1', quantity: 1, unitPrice: 10, lineTotal: 10 }],
    });
    // Structural integrity: no row spilled into a 3rd column.
    for (const row of tableRows(md)) expect(row.length).toBe(2);
    // Content preserved with the delimiter neutralised to a slash.
    const cells = tableRows(md).flat();
    expect(cells).toContain('Ali / Veli');
    expect(cells).toContain('Cad. / Sok No 5 / Daire 3');
    expect(cells).toContain('Serum / 50ml');
    expect(cells).toContain('SKU/1');
  });
});

describe('formatObfAmount', () => {
  it('formats tr-TR with two decimals', () => {
    expect(formatObfAmount(1234.5)).toBe('1.234,50');
    expect(formatObfAmount(0)).toBe('0,00');
  });

  it('returns a dash for a missing amount', () => {
    expect(formatObfAmount(null)).toBe('—');
    expect(formatObfAmount(undefined)).toBe('—');
  });
});
