/**
 * Neighbourhood (mahalle) helpers — the street-line format ARM stores, the
 * search, and the per-province data files (see tr-neighbourhoods.ts).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { TR_PROVINCES } from './tr-provinces';
import { districtsOf } from './tr-districts';
import {
  NEIGHBOURHOODS_VERSION,
  filterNeighbourhoods,
  joinStreet,
  loadNeighbourhoods,
  matchNeighbourhood,
  neighbourhoodsUrl,
  provinceFileKey,
  splitStreet,
  type Neighbourhood,
} from './tr-neighbourhoods';

const KADIKOY: Neighbourhood[] = [
  { name: 'Caferağa Mah.', zip: '34710' },
  { name: 'Fenerbahçe Mah.', zip: '34726' },
  { name: 'İçerenköy Mah.', zip: null },
];

describe('joinStreet / splitStreet', () => {
  it('puts the neighbourhood at the head of the street line', () => {
    expect(joinStreet('Muallimköy Mah.', 'Deniz Cad.')).toBe('Muallimköy Mah., Deniz Cad.');
    expect(joinStreet(' ', 'Deniz Cad.')).toBe('Deniz Cad.');
    expect(joinStreet('Muallimköy Mah.', '')).toBe('Muallimköy Mah.');
  });

  it('round-trips a joined line, with or without the list', () => {
    const line = joinStreet('Caferağa Mah.', 'Moda Cad., Kat 2');
    expect(splitStreet(line, KADIKOY)).toEqual({ neighbourhood: 'Caferağa Mah.', street: 'Moda Cad., Kat 2' });
    expect(splitStreet(line)).toEqual({ neighbourhood: 'Caferağa Mah.', street: 'Moda Cad., Kat 2' });
  });

  it('returns the listed spelling for a head typed differently', () => {
    expect(splitStreet('caferaga mah., Moda Cad.', KADIKOY)).toEqual({
      neighbourhood: 'Caferağa Mah.',
      street: 'Moda Cad.',
    });
  });

  it('reads an unlisted head as a neighbourhood only when it looks like one', () => {
    expect(splitStreet('Yeni Mahallesi, Atatürk Cad.').neighbourhood).toBe('Yeni Mahallesi');
    expect(splitStreet('Karaköy Köyü, Merkez Sok.').neighbourhood).toBe('Karaköy Köyü');
    expect(splitStreet('Barış Mah.').neighbourhood).toBe('Barış Mah.');
  });

  it('keeps a line saved before the field existed as all street', () => {
    expect(splitStreet('Moda Cad., Kat 2')).toEqual({ neighbourhood: '', street: 'Moda Cad., Kat 2' });
    expect(splitStreet('Köy Sok., No 3')).toEqual({ neighbourhood: '', street: 'Köy Sok., No 3' });
    expect(splitStreet(null)).toEqual({ neighbourhood: '', street: '' });
  });
});

describe('matchNeighbourhood / filterNeighbourhoods', () => {
  it('folds case and Turkish letters', () => {
    expect(matchNeighbourhood(KADIKOY, ' CAFERAĞA MAH. ')).toEqual(KADIKOY[0]);
    expect(matchNeighbourhood(KADIKOY, 'icerenkoy mah.')).toEqual(KADIKOY[2]);
    expect(matchNeighbourhood(KADIKOY, 'Moda Mah.')).toBeNull();
    expect(matchNeighbourhood(KADIKOY, '')).toBeNull();
  });

  it('finds by any part of the name, ASCII typing included', () => {
    expect(filterNeighbourhoods(KADIKOY, 'fener').map((n) => n.name)).toEqual(['Fenerbahçe Mah.']);
    expect(filterNeighbourhoods(KADIKOY, 'İÇEREN').map((n) => n.name)).toEqual(['İçerenköy Mah.']);
    expect(filterNeighbourhoods(KADIKOY, '')).toBe(KADIKOY);
  });
});

describe('province files', () => {
  it('are named by the folded province, under the dataset version', () => {
    expect(provinceFileKey('Şanlıurfa')).toBe('sanliurfa');
    expect(provinceFileKey('İstanbul')).toBe('istanbul');
    expect(neighbourhoodsUrl('Iğdır')).toBe(`/tr-neighbourhoods/${NEIGHBOURHOODS_VERSION}/igdir.json`);
  });

  const dir = resolve(__dirname, '../../public/tr-neighbourhoods', NEIGHBOURHOODS_VERSION);
  const read = (province: string) =>
    JSON.parse(readFileSync(resolve(dir, `${provinceFileKey(province)}.json`), 'utf-8')) as {
      districts: Record<string, [string, string | null][]>;
    };

  it('exist for each of the 81 provinces and nothing else', () => {
    const files = readdirSync(dir).sort();
    expect(files).toEqual(TR_PROVINCES.map((p) => `${provinceFileKey(p)}.json`).sort());
  });

  it("key lists by the province's own district names, Turkish-collated, without duplicates", () => {
    for (const p of TR_PROVINCES) {
      const { districts } = read(p);
      for (const [district, rows] of Object.entries(districts)) {
        expect(districtsOf(p)).toContain(district);
        const names = rows.map(([name]) => name);
        expect(names.length).toBeGreaterThan(0);
        expect(new Set(names).size).toBe(names.length);
        expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'tr')));
        for (const [name, zip] of rows) {
          expect(name).not.toBe(name.toLocaleUpperCase('tr'));
          if (zip !== null) expect(zip).toMatch(/^\d{5}$/);
        }
      }
    }
  });

  it('carry the warehouse neighbourhood with its postal code', () => {
    expect(read('Kocaeli').districts['Gebze']).toContainEqual(['Muallimköy Mah.', '41400']);
    expect(read('İstanbul').districts['Kadıköy']?.length).toBeGreaterThan(10);
  });
});

describe('loadNeighbourhoods', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches a province once and shares the result', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ districts: { Gebze: [['Muallimköy Mah.', '41400']] } }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const [a, b] = await Promise.all([loadNeighbourhoods('Kocaeli'), loadNeighbourhoods('Kocaeli')]);
    expect(a).toEqual({ Gebze: [{ name: 'Muallimköy Mah.', zip: '41400' }] });
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('resolves a failed read to no lists and tries again next time', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ districts: { Merkez: [['Cumhuriyet Mah.', '74100']] } }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await loadNeighbourhoods('Bartın')).toEqual({});
    expect(await loadNeighbourhoods('Bartın')).toEqual({ Merkez: [{ name: 'Cumhuriyet Mah.', zip: '74100' }] });
  });

  it('survives a missing fetch (free-text field instead of a crash)', async () => {
    vi.stubGlobal('fetch', undefined);
    expect(await loadNeighbourhoods('Ardahan')).toEqual({});
  });
});
