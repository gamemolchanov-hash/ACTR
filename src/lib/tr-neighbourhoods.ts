/**
 * Neighbourhoods (mahalle) of a Turkish district — the neighbourhood field of
 * the checkout and the account address book.
 *
 * Source: the PTT postal code lookup (scripts/fetch-ptt-neighbourhoods.py),
 * mapped onto the FulfillmentTR district names of lib/tr-districts by
 * scripts/build-tr-neighbourhoods.mjs → public/tr-neighbourhoods/<version>/<province>.json,
 * one file per province, fetched when the buyer picks the province. A district
 * PTT does not know under the warehouse's name (e.g. "Antalya Merkez") has no
 * list: the field is then free text, as it is for a neighbourhood missing from
 * the list — the list helps, it never blocks an order.
 *
 * ARM has no neighbourhood column (customer addresses, order shipping), so the
 * neighbourhood travels as the head of the street line, the way Turkish
 * addresses are written: "Muallimköy Mah., Deniz Cad.". FulfillmentTR gets it
 * inside `address1`. joinStreet/splitStreet are the only places that know that.
 */
import { useEffect, useState } from 'react';
import { foldKey, isTrProvince } from './tr-provinces';

/** Dataset version = folder name; bump with the data (the files are cached immutable). */
export const NEIGHBOURHOODS_VERSION = '20260928';

export interface Neighbourhood {
  name: string;
  /** PTT postal code; null when PTT lists several for the neighbourhood. */
  zip: string | null;
}

export type ProvinceNeighbourhoods = Record<string, Neighbourhood[]>;

/** File key of a province: its folded name ("Şanlıurfa" → "sanliurfa"). */
export function provinceFileKey(province: string): string {
  return foldKey(province).replace(/\s+/g, '-');
}

export function neighbourhoodsUrl(province: string): string {
  return `/tr-neighbourhoods/${NEIGHBOURHOODS_VERSION}/${provinceFileKey(province)}.json`;
}

const cache = new Map<string, Promise<ProvinceNeighbourhoods>>();

/**
 * Neighbourhoods of every district of `province`, keyed by the district name of
 * lib/tr-districts. A failed read resolves to {} (free-text field) and is not
 * cached, so the next pick of the province tries again.
 */
export function loadNeighbourhoods(province: string): Promise<ProvinceNeighbourhoods> {
  const cached = cache.get(province);
  if (cached) return cached;
  // Started inside the chain so that even a synchronous failure lands in catch.
  const pending = Promise.resolve()
    .then(() => fetch(neighbourhoodsUrl(province)))
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ districts: Record<string, [string, string | null][]> }>;
    })
    .then(({ districts }) => {
      const out: ProvinceNeighbourhoods = {};
      for (const [district, rows] of Object.entries(districts)) {
        out[district] = rows.map(([name, zip]) => ({ name, zip }));
      }
      return out;
    })
    .catch(() => {
      cache.delete(province);
      return {};
    });
  cache.set(province, pending);
  return pending;
}

/** The neighbourhood list of a district; `loading` while its province file is in flight. */
export function useNeighbourhoods(
  province: string,
  district: string,
): { options: Neighbourhood[]; loading: boolean } {
  const [loaded, setLoaded] = useState<{ province: string; data: ProvinceNeighbourhoods } | null>(null);
  useEffect(() => {
    if (!isTrProvince(province)) return;
    let cancelled = false;
    loadNeighbourhoods(province).then((data) => {
      if (!cancelled) setLoaded({ province, data });
    });
    return () => {
      cancelled = true;
    };
  }, [province]);
  if (!isTrProvince(province)) return { options: [], loading: false };
  if (loaded?.province !== province) return { options: [], loading: true };
  return { options: loaded.data[district] ?? [], loading: false };
}

/** Case- and diacritic-insensitive "contains" filter ("muallimkoy" finds "Muallimköy Mah."). */
export function filterNeighbourhoods(options: Neighbourhood[], input: string): Neighbourhood[] {
  const key = foldKey(input);
  if (!key) return options;
  return options.filter((o) => foldKey(o.name).includes(key));
}

/** The listed neighbourhood a typed/stored value folds to, else null. */
export function matchNeighbourhood(
  options: Neighbourhood[],
  value: string | null | undefined,
): Neighbourhood | null {
  const key = foldKey(value ?? '');
  if (!key) return null;
  return options.find((o) => foldKey(o.name) === key) ?? null;
}

/** "Muallimköy Mah." + "Deniz Cad." → "Muallimköy Mah., Deniz Cad." — the street line ARM stores. */
export function joinStreet(neighbourhood: string, street: string): string {
  return [neighbourhood.trim(), street.trim()].filter(Boolean).join(', ');
}

/** The list with the neighbourhoods of `zip` first; the rest keep their order. */
export function withZipFirst(options: Neighbourhood[], zip: string): Neighbourhood[] {
  const z = zip.trim();
  if (!/^\d{5}$/.test(z)) return options;
  return [...options.filter((o) => o.zip === z), ...options.filter((o) => o.zip !== z)];
}

export interface AddressPick {
  province: string;
  /** District / ilçe. */
  city: string;
  neighbourhood: string;
}

/**
 * What a typed postal code fills in. The province comes from its plate prefix
 * (the caller passes it, see provinceByZip) and the district from the PTT data —
 * a PTT postal code belongs to exactly one district. A neighbourhood that fits
 * the code stays; otherwise the code's only neighbourhood is filled in, a listed
 * one of another code is dropped, and free text stays when the code has several.
 * A code PTT does not know (or a warehouse zone without a list) fills only the
 * province.
 */
export function fillFromZip(
  current: AddressPick,
  province: string,
  data: ProvinceNeighbourhoods,
  zip: string,
): AddressPick {
  const z = zip.trim();
  const hits = Object.entries(data).flatMap(([district, rows]) =>
    rows.filter((r) => r.zip === z).map((r) => ({ district, name: r.name })),
  );
  const districts = [...new Set(hits.map((h) => h.district))];
  let { city, neighbourhood } = current;
  if (current.province !== province) {
    city = '';
    neighbourhood = '';
  }
  if (districts.length > 0 && !districts.includes(city)) {
    // Several districts only where the warehouse lists one twice (an old name).
    city = districts.length === 1 ? districts[0] : '';
    neighbourhood = '';
  }
  const hoods = hits.filter((h) => h.district === city).map((h) => h.name);
  if (hoods.length > 0 && !hoods.includes(neighbourhood)) {
    if (hoods.length === 1) neighbourhood = hoods[0];
    else if (matchNeighbourhood(data[city] ?? [], neighbourhood)) neighbourhood = '';
  }
  return { province, city, neighbourhood };
}

// Head of a street line that names a neighbourhood or village, folded:
// "… mah." / "… mahallesi" / "… mh." / "… koyu" / "… koy".
const NEIGHBOURHOOD_HEAD = /(^|\s)(mah\.?|mahallesi|mh\.?|koyu|koy)$/;

/**
 * Inverse of joinStreet for a stored street line: the head before the first
 * comma is the neighbourhood when it is a listed one or reads like one
 * ("… Mah."). Anything else — an address saved before the field existed — is
 * all street, and the buyer picks the neighbourhood again.
 */
export function splitStreet(
  line: string | null | undefined,
  options: Neighbourhood[] = [],
): { neighbourhood: string; street: string } {
  const text = (line ?? '').trim();
  const comma = text.indexOf(',');
  const head = (comma === -1 ? text : text.slice(0, comma)).trim();
  const rest = comma === -1 ? '' : text.slice(comma + 1).trim();
  const listed = matchNeighbourhood(options, head);
  if (listed) return { neighbourhood: listed.name, street: rest };
  if (head && NEIGHBOURHOOD_HEAD.test(foldKey(head))) return { neighbourhood: head, street: rest };
  return { neighbourhood: '', street: text };
}
