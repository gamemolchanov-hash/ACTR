/**
 * Ad + Soyad (08.10.2026). e-Arşiv фатура физлицу требует имя и фамилию (GİB,
 * Paraşüt: «Alıcı ünvanı en az 2 kelimeden oluşmalıdır»), а в одно поле
 * «Ad Soyad» покупатели вписывали только имя. На витрине — два поля, в ARM
 * имя хранится одной строкой (`name` клиента, `recipient_name` заказа):
 * склеиваем при отправке, делим по последнему пробелу при показе.
 */

const clean = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

/** «Ayşe Nur Yılmaz» → { first: 'Ayşe Nur', last: 'Yılmaz' }; одно слово — фамилии нет. */
export function splitFullName(full?: string | null): { first: string; last: string } {
  const words = clean(full).split(' ').filter(Boolean);
  if (words.length < 2) return { first: words[0] ?? '', last: '' };
  return { first: words.slice(0, -1).join(' '), last: words[words.length - 1] };
}

export function joinFullName(first?: string | null, last?: string | null): string {
  return [clean(first), clean(last)].filter(Boolean).join(' ');
}

/** И имя, и фамилия заполнены. */
export function isCompleteName(first?: string | null, last?: string | null): boolean {
  return clean(first).length > 0 && clean(last).length > 0;
}
