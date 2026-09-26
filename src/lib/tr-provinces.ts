/**
 * Turkey's 81 provinces (il) — single source of truth for the storefront.
 *
 * FulfillmentTR's order API wants `province` = il (one of these 81 names) and
 * `city` = ilçe (the district, free text). ARM maps
 * `shipping.state` → `province` and `shipping.city` → `city` (POST /orders),
 * and the customer address book's `state` column the same way
 * (POST /me/addresses). So the storefront collects il as `state` and ilçe as
 * `city` throughout — see checkout/page.tsx and account/addresses/page.tsx.
 *
 * Stored as a literal, Turkish-alphabetical-order tuple (no runtime sort), so
 * server and client render the identical list.
 */
export const TR_PROVINCES = [
  'Adana',
  'Adıyaman',
  'Afyonkarahisar',
  'Ağrı',
  'Aksaray',
  'Amasya',
  'Ankara',
  'Antalya',
  'Ardahan',
  'Artvin',
  'Aydın',
  'Balıkesir',
  'Bartın',
  'Batman',
  'Bayburt',
  'Bilecik',
  'Bingöl',
  'Bitlis',
  'Bolu',
  'Burdur',
  'Bursa',
  'Çanakkale',
  'Çankırı',
  'Çorum',
  'Denizli',
  'Diyarbakır',
  'Düzce',
  'Edirne',
  'Elazığ',
  'Erzincan',
  'Erzurum',
  'Eskişehir',
  'Gaziantep',
  'Giresun',
  'Gümüşhane',
  'Hakkari',
  'Hatay',
  'Iğdır',
  'Isparta',
  'İstanbul',
  'İzmir',
  'Kahramanmaraş',
  'Karabük',
  'Karaman',
  'Kars',
  'Kastamonu',
  'Kayseri',
  'Kırıkkale',
  'Kırklareli',
  'Kırşehir',
  'Kilis',
  'Kocaeli',
  'Konya',
  'Kütahya',
  'Malatya',
  'Manisa',
  'Mardin',
  'Mersin',
  'Muğla',
  'Muş',
  'Nevşehir',
  'Niğde',
  'Ordu',
  'Osmaniye',
  'Rize',
  'Sakarya',
  'Samsun',
  'Siirt',
  'Sinop',
  'Sivas',
  'Şanlıurfa',
  'Şırnak',
  'Tekirdağ',
  'Tokat',
  'Trabzon',
  'Tunceli',
  'Uşak',
  'Van',
  'Yalova',
  'Yozgat',
  'Zonguldak',
] as const;

export type TrProvince = (typeof TR_PROVINCES)[number];

/**
 * Case/diacritic-insensitive lookup key: trim, collapse inner whitespace,
 * lowercase with the Turkish locale (so ASCII "I" folds to dotless "ı" the
 * way Turkish casing rules expect), strip NFD combining marks (drops the
 * cedilla/diaeresis/etc. added to a base letter), then fold the remaining
 * dotless "ı" onto plain "i" — so an ASCII-only spelling (e.g. "sanliurfa")
 * matches its Turkish-lettered canonical name ("Şanlıurfa").
 */
function foldKey(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i');
}

const PROVINCE_BY_KEY: ReadonlyMap<string, TrProvince> = new Map(
  TR_PROVINCES.map((p) => [foldKey(p), p]),
);

/**
 * Normalizes a stored/typed province to its canonical name when it folds to
 * one of the 81; otherwise returns the trimmed, whitespace-collapsed raw
 * value unchanged (so an old free-text value is not silently lost) — blank
 * or nullish input returns ''.
 */
export function normalizeProvince(value: string | null | undefined): string {
  if (value == null) return '';
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed === '') return '';
  return PROVINCE_BY_KEY.get(foldKey(trimmed)) ?? trimmed;
}

/** Exact membership in TR_PROVINCES — no folding (use normalizeProvince first). */
export function isTrProvince(value: unknown): value is TrProvince {
  return typeof value === 'string' && (TR_PROVINCES as readonly string[]).includes(value);
}

/** "<district> / <province>" — either side may be blank and is dropped. */
export function formatDistrictProvince(
  district: string | null | undefined,
  province: string | null | undefined,
): string {
  const d = (district ?? '').trim();
  const p = normalizeProvince(province);
  return [d, p].filter(Boolean).join(' / ');
}
