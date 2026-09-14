import { describe, expect, it } from 'vitest';

import { buildLegalPayload } from './legal-snapshot';
import { ON_BILGILENDIRME_DOC_CODE } from './on-bilgilendirme-formu-content';
import { MESAFELI_SATIS_DOC_CODE } from './mesafeli-satis';
import { MESAFELI_SATIS_TEMPLATE } from '@/app/[locale]/legal/mesafeli-satis-content';

describe('buildLegalPayload — снимок документов заказа для ARM', () => {
  const generatedAt = new Date('2026-09-14T09:30:00+03:00');
  const input = {
    generatedAt,
    customer: { name: 'Ayşe Yılmaz', phone: '+905551112233', email: 'ayse@example.com' },
    address: 'Oba Mah. 225 Sk. No: 8B, Alanya / Antalya',
    currencyLabel: 'TL',
    items: [{ name: 'Base Gel 15 ml', sku: 'BG15', quantity: 2, unitPrice: 450, lineTotal: 900 }],
    subtotal: 900,
    shippingCost: 0,
    walletApplied: 0,
    grandTotal: 900,
    rate: { carrier: 'Yurtiçi Kargo', name: 'Standart', estMin: 2, estMax: 4 },
    kvkkNoticeUrl: 'https://american-creator.tr/legal/kvkk',
  };

  it('оба документа, коды версий из канона, текст с данными покупателя', () => {
    const acceptedAt = new Date('2026-09-14T09:31:00+03:00');
    const legal = buildLegalPayload(input, acceptedAt);
    expect(legal.acceptedAt).toBe(acceptedAt.toISOString());
    expect(legal.documents.map((d) => [d.kind, d.code])).toEqual([
      ['on_bilgilendirme', ON_BILGILENDIRME_DOC_CODE],
      ['mesafeli_satis', MESAFELI_SATIS_DOC_CODE],
    ]);
    for (const d of legal.documents) {
      expect(d.shownAt).toBe(generatedAt.toISOString());
      expect(d.markdown).toContain('Ayşe Yılmaz');
      expect(d.markdown).toContain('Base Gel 15 ml');
      expect(d.markdown.length).toBeGreaterThan(1000);
    }
  });

  it('код договора совпадает с шапкой канонического шаблона', () => {
    expect(MESAFELI_SATIS_TEMPLATE).toContain(MESAFELI_SATIS_DOC_CODE);
  });
});
