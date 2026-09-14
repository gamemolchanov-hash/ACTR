/**
 * Снимок юридических документов заказа для ARM (`POST /orders` → `legal`):
 * заполненные Ön Bilgilendirme Formu и Mesafeli Satış Sözleşmesi ровно в том
 * виде, в каком покупатель их видел и принял на чекауте. ARM хранит их на
 * заказе, шлёт PDF в письме подтверждения и отдаёт в кабинете (§ 6 и § 18
 * договора: «kalıcı veri saklayıcısı»).
 */

import {
  buildOnBilgilendirmeData,
  renderOnBilgilendirmeFormu,
  type BuildOnBilgilendirmeInput,
} from './on-bilgilendirme';
import { ON_BILGILENDIRME_DOC_CODE } from './on-bilgilendirme-formu-content';
import { buildMesafeliSatisData, MESAFELI_SATIS_DOC_CODE, renderMesafeliSatis } from './mesafeli-satis';

export interface OrderLegalDocument {
  kind: 'on_bilgilendirme' | 'mesafeli_satis';
  code: string;
  title: string;
  markdown: string;
  shownAt: string;
}

export interface OrderLegalPayload {
  acceptedAt: string;
  documents: OrderLegalDocument[];
}

/**
 * Оба документа из одних и тех же данных заказа. `shownAt` — момент, когда форма
 * была сформирована (открыта в модале) или, если покупатель её не открывал, момент
 * нажатия «Öde ve Siparişi Tamamla» (тот же, что `acceptedAt`).
 */
export function buildLegalPayload(input: BuildOnBilgilendirmeInput, acceptedAt: Date = new Date()): OrderLegalPayload {
  const shownAt = input.generatedAt.toISOString();
  return {
    acceptedAt: acceptedAt.toISOString(),
    documents: [
      {
        kind: 'on_bilgilendirme',
        code: ON_BILGILENDIRME_DOC_CODE,
        title: 'Ön Bilgilendirme Formu',
        markdown: renderOnBilgilendirmeFormu(buildOnBilgilendirmeData(input)),
        shownAt,
      },
      {
        kind: 'mesafeli_satis',
        code: MESAFELI_SATIS_DOC_CODE,
        title: 'Mesafeli Satış Sözleşmesi',
        markdown: renderMesafeliSatis(buildMesafeliSatisData(input)),
        shownAt,
      },
    ],
  };
}
