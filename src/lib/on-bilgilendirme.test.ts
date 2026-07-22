/**
 * Ön Bilgilendirme Formu placeholder substitution (FBG-401).
 *
 * The critical acceptance guarantee is that NO raw `{{…}}` token survives into
 * the rendered form — including on a multi-item cart, where §4's product block
 * repeats. These are pure-function tests (deterministic: the timestamp is passed
 * in), so they don't need to mount the Stripe/auth-heavy checkout page.
 */
import { describe, it, expect } from 'vitest';
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
    promoDiscount: 0,
    walletApplied: 0,
    shippingCost: 30,
    rate: { carrier: 'Yurtiçi Kargo', name: 'Standart', estMin: 1, estMax: 3 },
    kvkkNoticeUrl: 'https://american-creator.tr/legal/kvkk',
    ...overrides,
  };
}

const render = (o: Partial<BuildOnBilgilendirmeInput> = {}) =>
  renderOnBilgilendirmeFormu(buildOnBilgilendirmeData(sampleInput(o)));

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
    expect(md).toContain('280,00'); // grand total: 250 − 0 + 30
  });

  it('folds wallet + promo into total discount and recomputes the grand total', () => {
    const md = render({ promoDiscount: 20, walletApplied: 30 });
    // total discount 50,00 → grand total 250 − 50 + 30 = 230,00
    expect(md).toContain('50,00');
    expect(md).toContain('230,00');
  });

  it('degrades gracefully with a null-price item and no shipping rate (negative case)', () => {
    const md = render({
      items: [{ name: null, sku: 'SKU-X', quantity: 1, unitPrice: null, lineTotal: null }],
      rate: null,
      subtotal: 0,
      shippingCost: 0,
    });
    expect(md).not.toMatch(/\{\{|\}\}/);
    expect(md).toContain('Belirlenecek'); // delivery fields TBD, no invented carrier
    expect(md).toContain('SKU-X'); // missing name falls back to SKU
  });

  it('falls back to a dash for a blank customer / address', () => {
    const md = render({
      customer: { name: '', phone: '', email: '' },
      address: '   ',
    });
    expect(md).not.toMatch(/\{\{|\}\}/);
    expect(md).toContain('—');
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
