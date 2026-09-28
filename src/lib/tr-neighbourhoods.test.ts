/**
 * Neighbourhood (mahalle) helpers — the street-line format ARM stores, the
 * search, and the per-province data files (see tr-neighbourhoods.ts).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { TR_PROVINCES, TR_PROVINCE_PLATES, provinceByZip } from './tr-provinces';
import { districtsOf } from './tr-districts';
import {
  NEIGHBOURHOODS_VERSION,
  fillFromZip,
  filterNeighbourhoods,
  joinStreet,
  loadNeighbourhoods,
  matchNeighbourhood,
  neighbourhoodsUrl,
  provinceFileKey,
  splitStreet,
  withZipFirst,
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

  it('reads "Mahallesi", "Mh.", "Köy" as the listed "Mah." / "Köyü"', () => {
    const list: Neighbourhood[] = [
      { name: 'Oba Mah.', zip: '07400' },
      { name: 'Obaalacami Mah.', zip: '07400' },
      { name: 'Mahmutlar Mah.', zip: '07450' },
      { name: 'Karaköy Köyü', zip: '07400' },
    ];
    expect(filterNeighbourhoods(list, 'Oba Mahallesi').map((n) => n.name)).toEqual(['Oba Mah.']);
    expect(filterNeighbourhoods(list, 'oba mahal').map((n) => n.name)).toEqual(['Oba Mah.']);
    expect(filterNeighbourhoods(list, 'Oba Mh.').map((n) => n.name)).toEqual(['Oba Mah.']);
    expect(filterNeighbourhoods(list, 'karakoy koy').map((n) => n.name)).toEqual(['Karaköy Köyü']);
    // A name that merely starts like "mahalle" is a name, not the suffix.
    expect(filterNeighbourhoods(list, 'mahmut').map((n) => n.name)).toEqual(['Mahmutlar Mah.']);
    expect(filterNeighbourhoods(list, 'oba').map((n) => n.name)).toEqual(['Oba Mah.', 'Obaalacami Mah.']);
    expect(matchNeighbourhood(list, 'OBA MAHALLESİ')).toEqual(list[0]);
  });

  it('finds by any part of the name, ASCII typing included', () => {
    expect(filterNeighbourhoods(KADIKOY, 'fener').map((n) => n.name)).toEqual(['Fenerbahçe Mah.']);
    expect(filterNeighbourhoods(KADIKOY, 'İÇEREN').map((n) => n.name)).toEqual(['İçerenköy Mah.']);
    expect(filterNeighbourhoods(KADIKOY, '')).toBe(KADIKOY);
  });
});

describe('postal code first', () => {
  const KOCAELI = {
    Gebze: [
      { name: 'Adem Yavuz Mah.', zip: '41400' },
      { name: 'Muallimköy Mah.', zip: '41400' },
    ],
    Darıca: [
      { name: 'Bayramoğlu Mah.', zip: '41700' },
      { name: 'Osmangazi Mah.', zip: '41780' },
    ],
  };
  const blank = { province: '', city: '', neighbourhood: '' };

  it('reads the province off the plate prefix', () => {
    expect(provinceByZip('41400')).toBe('Kocaeli');
    expect(provinceByZip(' 34710 ')).toBe('İstanbul');
    expect(provinceByZip('06100')).toBe('Ankara');
    expect(provinceByZip('81000')).toBe('Düzce');
    expect(provinceByZip('4140')).toBeNull();
    expect(provinceByZip('99000')).toBeNull();
    expect(provinceByZip('00000')).toBeNull();
    expect(new Set(Object.values(TR_PROVINCE_PLATES)).size).toBe(81);
  });

  it("fills the district and the code's only neighbourhood", () => {
    expect(fillFromZip(blank, 'Kocaeli', KOCAELI, '41700')).toEqual({
      province: 'Kocaeli',
      city: 'Darıca',
      neighbourhood: 'Bayramoğlu Mah.',
    });
  });

  it('fills the district only when the code has several neighbourhoods', () => {
    expect(fillFromZip(blank, 'Kocaeli', KOCAELI, '41400')).toEqual({
      province: 'Kocaeli',
      city: 'Gebze',
      neighbourhood: '',
    });
  });

  it('keeps a pick that fits the code and free text, drops a listed one of another code', () => {
    const picked = { province: 'Kocaeli', city: 'Gebze', neighbourhood: 'Muallimköy Mah.' };
    expect(fillFromZip(picked, 'Kocaeli', KOCAELI, '41400')).toEqual(picked);
    const typed = { province: 'Kocaeli', city: 'Darıca', neighbourhood: 'Yeni Sanayi Sitesi' };
    expect(fillFromZip(typed, 'Kocaeli', { Darıca: [...KOCAELI.Darıca, { name: 'Zirve Mah.', zip: '41700' }] }, '41700'))
      .toEqual(typed);
    const other = { province: 'Kocaeli', city: 'Darıca', neighbourhood: 'Osmangazi Mah.' };
    expect(fillFromZip(other, 'Kocaeli', { Darıca: [...KOCAELI.Darıca, { name: 'Zirve Mah.', zip: '41700' }] }, '41700'))
      .toEqual({ ...other, neighbourhood: '' });
  });

  it('switches province and district when the code points elsewhere', () => {
    const istanbul = { province: 'İstanbul', city: 'Kadıköy', neighbourhood: 'Caferağa Mah.' };
    expect(fillFromZip(istanbul, 'Kocaeli', KOCAELI, '41780')).toEqual({
      province: 'Kocaeli',
      city: 'Darıca',
      neighbourhood: 'Osmangazi Mah.',
    });
  });

  it('fills only the province for a code PTT does not list', () => {
    expect(fillFromZip(blank, 'Kocaeli', KOCAELI, '41999')).toEqual({ province: 'Kocaeli', city: '', neighbourhood: '' });
    const kept = { province: 'Kocaeli', city: 'Gebze', neighbourhood: 'Muallimköy Mah.' };
    expect(fillFromZip(kept, 'Kocaeli', KOCAELI, '41999')).toEqual(kept);
  });

  it('names the district of an unlisted code by its first digits, when they point to one', () => {
    const antalya = {
      Alanya: [{ name: 'Oba Mah.', zip: '07400' }, { name: 'Mahmutlar Mah.', zip: '07450' }],
      Gazipaşa: [{ name: 'Pazarcı Mah.', zip: '07900' }],
    };
    // "07460" is not a PTT code, but every 074xx code is Alanya.
    expect(fillFromZip(blank, 'Antalya', antalya, '07460')).toEqual({
      province: 'Antalya',
      city: 'Alanya',
      neighbourhood: '',
    });
    // 07xxx spans both districts: the province only.
    expect(fillFromZip(blank, 'Antalya', antalya, '07100')).toEqual({ province: 'Antalya', city: '', neighbourhood: '' });
    // The real data: 07460 → Alanya.
    const dir = resolve(__dirname, '../../public/tr-neighbourhoods', NEIGHBOURHOODS_VERSION);
    const real = JSON.parse(readFileSync(resolve(dir, 'antalya.json'), 'utf-8')).districts as Record<
      string,
      [string, string | null][]
    >;
    const data = Object.fromEntries(
      Object.entries(real).map(([d, rows]) => [d, rows.map(([name, zip]) => ({ name, zip }))]),
    );
    expect(fillFromZip(blank, 'Antalya', data, '07460').city).toBe('Alanya');
  });

  it("lists the code's neighbourhoods first", () => {
    const list = [...KOCAELI.Darıca, { name: 'Zirve Mah.', zip: '41700' }];
    expect(withZipFirst(list, '41700').map((n) => n.name)).toEqual(['Bayramoğlu Mah.', 'Zirve Mah.', 'Osmangazi Mah.']);
    expect(withZipFirst(list, '417')).toBe(list);
  });

  it('matches the data: every PTT code starts with its province plate', () => {
    const dir = resolve(__dirname, '../../public/tr-neighbourhoods', NEIGHBOURHOODS_VERSION);
    for (const p of TR_PROVINCES) {
      const { districts } = JSON.parse(readFileSync(resolve(dir, `${provinceFileKey(p)}.json`), 'utf-8')) as {
        districts: Record<string, [string, string | null][]>;
      };
      for (const rows of Object.values(districts)) {
        for (const [, zip] of rows) if (zip) expect(provinceByZip(zip)).toBe(p);
      }
    }
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
