/**
 * Ön Bilgilendirme Formu placeholder substitution (FBG-401).
 *
 * The critical acceptance guarantees:
 *  - NO raw `{{…}}` token survives into the rendered form (incl. multi-item
 *    carts, where §4's product block repeats);
 *  - "Ödenecek Toplam Tutar" is the full order price (never lowered by the
 *    wallet) and the summary reconciles, including the promo>subtotal clamp edge;
 *  - the Creator Club wallet is a payment split, not a discount;
 *  - a `|` or a line break in any value cannot break the §2/§4 GFM tables.
 * Pure-function tests (deterministic: the timestamp is passed in), so no need to
 * mount the Stripe/auth-heavy checkout page.
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '@/components/LegalMarkdown';
import {
  buildOnBilgilendirmeData,
  renderOnBilgilendirmeFormu,
  formatObfAmount,
  addBusinessDays,
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
    walletApplied: 0,
    grandTotal: 280, // full order price: 250 + 30, no promo
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
    expect(md).toMatch(/Ödenecek Toplam Tutar \| 280,00 TL/); // full order price
  });

  it('promises the delivery date in business days, not calendar days (Friday order)', () => {
    const friday = new Date(2026, 6, 24, 10, 0, 0); // 24.07.2026 is a Friday
    expect(friday.getDay()).toBe(5);
    const md = render({
      generatedAt: friday,
      rate: { carrier: 'Yurtiçi Kargo', name: 'Standart', estMin: 3, estMax: 3 },
    });
    const fmt = new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    // prep 2 + transit 3 = 5 business days from Friday, skipping the weekend.
    const expected = fmt.format(addBusinessDays(friday, 5));
    expect(md).toContain(`Taahhüt Edilen Son Teslim Tarihi: ${expected}`);
    // The naive +5 calendar days would fall earlier (crosses a weekend) — the
    // binding date must not under-promise.
    const naive = fmt.format(new Date(friday.getTime() + 5 * 24 * 60 * 60 * 1000));
    expect(expected).not.toBe(naive);
  });

  it('derives the promo-only discount from the order price and reconciles the summary', () => {
    // full price 280 with a 50 promo ⇒ grandTotal 230, total discount 50,00
    const md = render({ grandTotal: 230 });
    expect(md).toMatch(/Toplam İndirim \| 50,00 TL/);
    expect(md).toMatch(/Ödenecek Toplam Tutar \| 230,00 TL/);
  });

  it('shows the wallet as a payment split, not a discount, keeping the full price', () => {
    // subtotal 250 + shipping 30, no promo → order price 280; wallet 50 covers
    // part, card pays 230. "Toplam İndirim" stays 0 and "Ödenecek" is the full 280.
    const md = render({ walletApplied: 50, grandTotal: 280 });
    expect(md).toMatch(/Toplam İndirim \| 0,00 TL/);
    expect(md).toMatch(/Ödenecek Toplam Tutar \| 280,00 TL/);
    expect(md).toContain('Creator Club Cüzdanı (50,00 TL)');
    expect(md).toContain('(230,00 TL)'); // card share
  });

  it('matches the checkout price when a promo exceeds the subtotal (clamp edge)', () => {
    // checkout: finalTotal=max(0,100−150)=0 → +shipping 20 → order price 20.
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
      walletApplied: 0,
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

  it('keeps §2/§4 tables intact when values contain a line break / tab', () => {
    // A newline in a value would otherwise end the table row early and drop the
    // rest of the §4 product table (price/SKU/qty vanish).
    const md = render({
      customer: { name: 'Ayşe\nYılmaz', phone: '+90 555', email: 'a@b.co' },
      address: 'Cad. No 5\r\nDaire 3',
      items: [{ name: 'Serum\n50ml', sku: 'SKU\t1', quantity: 1, unitPrice: 10, lineTotal: 10 }],
    });
    for (const row of tableRows(md)) expect(row.length).toBe(2);
    const cells = tableRows(md).flat();
    expect(cells).toContain('Ayşe Yılmaz'); // newline collapsed to a space
    expect(cells).toContain('Serum 50ml');
    expect(cells).toContain('SKU 1');
    expect(cells).toContain('Cad. No 5 Daire 3');
    // §4 product table survived in full — the unit price row is still present.
    expect(md).toContain('KDV Dâhil Birim Fiyat');
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

describe('addBusinessDays', () => {
  it('skips the weekend: +1 business day from Friday is Monday (3 calendar days)', () => {
    const friday = new Date(2026, 6, 24); // Friday
    expect(friday.getDay()).toBe(5);
    const next = addBusinessDays(friday, 1);
    expect(next.getDay()).toBe(1); // Monday
    expect((next.getTime() - friday.getTime()) / (24 * 60 * 60 * 1000)).toBe(3);
  });

  it('never lands on a weekend and never precedes the naive calendar date', () => {
    const start = new Date(2026, 6, 24, 9, 0, 0);
    for (let n = 1; n <= 20; n++) {
      const res = addBusinessDays(start, n);
      expect(res.getDay() === 0 || res.getDay() === 6).toBe(false);
      const naive = new Date(start.getTime() + n * 24 * 60 * 60 * 1000);
      expect(res.getTime()).toBeGreaterThanOrEqual(naive.getTime());
    }
  });
});
