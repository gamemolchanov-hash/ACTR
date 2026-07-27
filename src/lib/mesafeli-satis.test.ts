/**
 * Mesafeli Satış Sözleşmesi V4 placeholder substitution (FBG-458).
 *
 * The critical acceptance guarantees mirror the OBF's:
 *  - NO raw `{{…}}` token survives into the rendered contract (incl. multi-item
 *    carts, where §5's product block repeats once per line);
 *  - the order summary reconciles with the cart (subtotal / discount / shipping /
 *    grand total), including the promo>subtotal clamp edge and the wallet split;
 *  - the contract's "Ön Bilgilendirme Sürümü" is the single OBF document version
 *    (no second hardcode);
 *  - a `|` or a line break in any value cannot break the §1/§5 GFM tables.
 * Pure-function tests (deterministic: the timestamp is passed in).
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '@/components/LegalMarkdown';
import { ON_BILGILENDIRME_DOC_CODE } from './on-bilgilendirme-formu-content';
import {
  buildMesafeliSatisData,
  renderMesafeliSatis,
  type BuildMesafeliSatisInput,
} from './mesafeli-satis';

const FIXED = new Date(Date.UTC(2026, 6, 22, 11, 30, 0));

function sampleInput(overrides: Partial<BuildMesafeliSatisInput> = {}): BuildMesafeliSatisInput {
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

const render = (o: Partial<BuildMesafeliSatisInput> = {}) =>
  renderMesafeliSatis(buildMesafeliSatisData(sampleInput(o)));

/** Every table row across the whole contract. */
function tableRows(md: string): string[][] {
  return parseMarkdown(md)
    .filter((b): b is Extract<ReturnType<typeof parseMarkdown>[number], { kind: 'table' }> =>
      b.kind === 'table',
    )
    .flatMap((t) => t.rows);
}

describe('renderMesafeliSatis', () => {
  it('leaves no raw {{…}} token in the rendered contract (multi-item cart)', () => {
    expect(render()).not.toMatch(/\{\{|\}\}/);
  });

  it('repeats the §5 product block once per cart line', () => {
    const md = render();
    expect((md.match(/\*\*Ürün Adı\*\*/g) || []).length).toBe(2);
    expect(md).toContain('Pomat A');
    expect(md).toContain('Şampuan B');
    // Per-line figures both present (unit / line totals carry no currency suffix in §5).
    expect(md).toMatch(/\*\*Birim Fiyatı\*\* \| 100,00 \|/);
    expect(md).toMatch(/\*\*KDV Dâhil Ürün Toplamı\*\* \| 200,00 \|/);
    expect(md).toMatch(/\*\*Birim Fiyatı\*\* \| 50,00 \|/);
  });

  it('keeps §5 one contiguous table with both products and the totals', () => {
    const rows = tableRows(render());
    const labels = rows.map((r) => r[0]);
    expect(labels.filter((l) => l === '**Ürün Adı**').length).toBe(2);
    // Order header, per-product rows and totals all live in the same table.
    expect(labels).toContain('**Sipariş Numarası**');
    expect(labels).toContain('**Ödenecek Toplam Tutar**');
  });

  it('preserves the canon doc code and seller / fulfilment requisites', () => {
    const md = render();
    expect(md).toContain('KK-MSS-2026-V4'); // contract version
    expect(md).toContain('0560146611100001'); // MERSİS
    expect(md).toContain('NİKAR GIDA TEKSTİL DIŞ TİCARET LİMİTED ŞİRKETİ');
  });

  it('carries the single OBF document version as pre-information version', () => {
    const md = render();
    expect(md).toMatch(
      new RegExp(`\\*\\*Ön Bilgilendirme Sürümü\\*\\* \\| ${ON_BILGILENDIRME_DOC_CODE} \\|`),
    );
  });

  it('fills buyer / order / payment / delivery fields', () => {
    const md = render();
    expect(md).toMatch(/AC-\d{8}-\d{6}/); // client draft reference
    expect(md).toContain('Ayşe Yılmaz');
    expect(md).toContain('Atatürk Cad.');
    expect(md).toContain('Uygulanmamaktadır'); // variant + taksit
    expect(md).toContain('Yurtiçi Kargo'); // delivery carrier
    expect(md).toContain('1–3 iş günü'); // estimated period
    expect(md).toContain('Kredi Kartı / Banka Kartı (iyzico)'); // payment method
  });

  it('reconciles the order summary with the cart', () => {
    const md = render();
    expect(md).toMatch(/\*\*Ara Toplam\*\* \| 250,00 \|/);
    expect(md).toMatch(/\*\*Toplam İndirim\*\* \| 0,00 \|/);
    expect(md).toMatch(/\*\*Teslimat Bedeli\*\* \| 30,00 \|/);
    expect(md).toMatch(/\*\*Ödenecek Toplam Tutar\*\* \| 280,00 \|/);
    expect(md).toMatch(/\*\*Para Birimi\*\* \| TL \|/);
  });

  it('derives the promo-only discount from the order price and reconciles', () => {
    // full price 280 with a 50 promo ⇒ grandTotal 230, total discount 50,00
    const md = render({ grandTotal: 230 });
    expect(md).toMatch(/\*\*Toplam İndirim\*\* \| 50,00 \|/);
    expect(md).toMatch(/\*\*Ödenecek Toplam Tutar\*\* \| 230,00 \|/);
  });

  it('shows the wallet as a payment split, not a discount, keeping the full price', () => {
    const md = render({ walletApplied: 50, grandTotal: 280 });
    expect(md).toMatch(/\*\*Toplam İndirim\*\* \| 0,00 \|/);
    expect(md).toMatch(/\*\*Ödenecek Toplam Tutar\*\* \| 280,00 \|/);
    expect(md).toContain('Creator Club Cüzdanı (50,00 TL)');
    expect(md).toContain('(230,00 TL)'); // card share
  });

  it('matches the checkout price when a promo exceeds the subtotal (clamp edge)', () => {
    const md = render({ subtotal: 100, shippingCost: 20, grandTotal: 20 });
    expect(md).toMatch(/\*\*Ödenecek Toplam Tutar\*\* \| 20,00 \|/);
    expect(md).toMatch(/\*\*Toplam İndirim\*\* \| 100,00 \|/);
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
    expect((md.match(/\*\*Ürün Adı\*\*/g) || []).length).toBe(1);
  });

  it('keeps §5 one contiguous table with no product rows when the cart is empty (edge)', () => {
    const md = render({
      items: [],
      subtotal: 0,
      shippingCost: 0,
      walletApplied: 0,
      grandTotal: 0,
    });
    expect(md).not.toMatch(/\{\{|\}\}/);
    expect(md).not.toContain('**Ürün Adı**'); // no product rows
    const rows = tableRows(md);
    const labels = rows.map((r) => r[0]);
    // §5 stays a real table (header + totals), not split into paragraphs.
    expect(labels).toContain('**Sipariş Numarası**');
    expect(labels).toContain('**Ödenecek Toplam Tutar**');
  });

  it('falls back to a dash for a blank customer / address', () => {
    const md = render({ customer: { name: '', phone: '', email: '' }, address: '   ' });
    expect(md).not.toMatch(/\{\{|\}\}/);
    expect(md).toContain('—');
  });

  it('keeps §1/§5 tables from spilling when values contain a "|" (GFM delimiter)', () => {
    const md = render({
      customer: { name: 'Ali | Veli', phone: '+90 | 555', email: 'a@b.co' },
      address: 'Cad. | Sok No 5 | Daire 3',
      items: [{ name: 'Serum | 50ml', sku: 'SKU|1', quantity: 1, unitPrice: 10, lineTotal: 10 }],
    });
    // No row spilled past 2 columns (the "Uygulama Niteliği" callout is 1-column).
    for (const row of tableRows(md)) expect(row.length).toBeLessThanOrEqual(2);
    const cells = tableRows(md).flat();
    expect(cells).toContain('Ali / Veli');
    expect(cells).toContain('Cad. / Sok No 5 / Daire 3');
    expect(cells).toContain('Serum / 50ml');
    expect(cells).toContain('SKU/1');
  });

  it('keeps §1/§5 tables intact when values contain a line break / tab', () => {
    const md = render({
      customer: { name: 'Ayşe\nYılmaz', phone: '+90 555', email: 'a@b.co' },
      address: 'Cad. No 5\r\nDaire 3',
      items: [{ name: 'Serum\n50ml', sku: 'SKU\t1', quantity: 1, unitPrice: 10, lineTotal: 10 }],
    });
    for (const row of tableRows(md)) expect(row.length).toBeLessThanOrEqual(2);
    const cells = tableRows(md).flat();
    expect(cells).toContain('Ayşe Yılmaz'); // newline collapsed to a space
    expect(cells).toContain('Serum 50ml');
    expect(cells).toContain('SKU 1');
    // §5 product block survived in full — the line-total row is still present.
    expect(md).toContain('KDV Dâhil Ürün Toplamı');
  });
});
