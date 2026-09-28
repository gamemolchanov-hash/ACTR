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
 * Plate code of each province (the PTT il code). A Turkish postal code starts
 * with it — "41400" is Kocaeli (41) — which the checkout uses to fill the
 * province from the zip (checked against all 72 956 PTT postal codes, 28.09.2026).
 */
export const TR_PROVINCE_PLATES: Readonly<Record<TrProvince, number>> = {
  'Adana': 1,
  'Adıyaman': 2,
  'Afyonkarahisar': 3,
  'Ağrı': 4,
  'Aksaray': 68,
  'Amasya': 5,
  'Ankara': 6,
  'Antalya': 7,
  'Ardahan': 75,
  'Artvin': 8,
  'Aydın': 9,
  'Balıkesir': 10,
  'Bartın': 74,
  'Batman': 72,
  'Bayburt': 69,
  'Bilecik': 11,
  'Bingöl': 12,
  'Bitlis': 13,
  'Bolu': 14,
  'Burdur': 15,
  'Bursa': 16,
  'Çanakkale': 17,
  'Çankırı': 18,
  'Çorum': 19,
  'Denizli': 20,
  'Diyarbakır': 21,
  'Düzce': 81,
  'Edirne': 22,
  'Elazığ': 23,
  'Erzincan': 24,
  'Erzurum': 25,
  'Eskişehir': 26,
  'Gaziantep': 27,
  'Giresun': 28,
  'Gümüşhane': 29,
  'Hakkari': 30,
  'Hatay': 31,
  'Iğdır': 76,
  'Isparta': 32,
  'İstanbul': 34,
  'İzmir': 35,
  'Kahramanmaraş': 46,
  'Karabük': 78,
  'Karaman': 70,
  'Kars': 36,
  'Kastamonu': 37,
  'Kayseri': 38,
  'Kırıkkale': 71,
  'Kırklareli': 39,
  'Kırşehir': 40,
  'Kilis': 79,
  'Kocaeli': 41,
  'Konya': 42,
  'Kütahya': 43,
  'Malatya': 44,
  'Manisa': 45,
  'Mardin': 47,
  'Mersin': 33,
  'Muğla': 48,
  'Muş': 49,
  'Nevşehir': 50,
  'Niğde': 51,
  'Ordu': 52,
  'Osmaniye': 80,
  'Rize': 53,
  'Sakarya': 54,
  'Samsun': 55,
  'Siirt': 56,
  'Sinop': 57,
  'Sivas': 58,
  'Şanlıurfa': 63,
  'Şırnak': 73,
  'Tekirdağ': 59,
  'Tokat': 60,
  'Trabzon': 61,
  'Tunceli': 62,
  'Uşak': 64,
  'Van': 65,
  'Yalova': 77,
  'Yozgat': 66,
  'Zonguldak': 67,
};

const PROVINCE_BY_PLATE: ReadonlyMap<number, TrProvince> = new Map(
  (Object.entries(TR_PROVINCE_PLATES) as [TrProvince, number][]).map(([p, plate]) => [plate, p]),
);

/** Province of a 5-digit Turkish postal code, by its plate prefix; null for anything else. */
export function provinceByZip(zip: string | null | undefined): TrProvince | null {
  const m = /^(\d{2})\d{3}$/.exec((zip ?? '').trim());
  return m ? PROVINCE_BY_PLATE.get(Number(m[1])) ?? null : null;
}

/**
 * Case/diacritic-insensitive lookup key: trim, collapse inner whitespace,
 * lowercase with the Turkish locale (so ASCII "I" folds to dotless "ı" the
 * way Turkish casing rules expect), strip NFD combining marks (drops the
 * cedilla/diaeresis/etc. added to a base letter), then fold the remaining
 * dotless "ı" onto plain "i" — so an ASCII-only spelling (e.g. "sanliurfa")
 * matches its Turkish-lettered canonical name ("Şanlıurfa").
 */
export function foldKey(value: string): string {
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
