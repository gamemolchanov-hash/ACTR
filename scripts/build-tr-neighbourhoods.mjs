/**
 * Build public/tr-neighbourhoods/<version>/<province>.json from the raw PTT dump.
 *
 *   node scripts/build-tr-neighbourhoods.mjs ptt-neighbourhoods.json 20260928
 *
 * Input: the JSON written by scripts/fetch-ptt-neighbourhoods.py. Districts are
 * keyed by the FulfillmentTR names of src/lib/tr-districts.ts (the district
 * select), so the storefront looks a list up by what the buyer picked. A
 * warehouse district PTT has no district for (e.g. "Antalya Merkez") gets no
 * list — the field stays free text there. Names go from PTT upper case to
 * Turkish title case ("MUALLİMKÖY MAH." → "Muallimköy Mah."), sorted with the
 * Turkish collator; the postal code is kept when PTT gives exactly one.
 *
 * The version must match NEIGHBOURHOODS_VERSION in src/lib/tr-neighbourhoods.ts
 * (the files are served immutable: new data = new folder). Prints coverage.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const collator = new Intl.Collator('tr');
// Abbreviations kept upper case ("OSB" = Organize Sanayi Bölgesi).
const KEEP_UPPER = new Set(['sb', 'osb', 'kss', 'toki']);

/** Same folding as foldKey in src/lib/tr-provinces.ts. */
const fold = (s) =>
  s
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i');

const cap = (w) => (w ? w[0].toLocaleUpperCase('tr') + w.slice(1) : w);

function title(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => {
      if (KEEP_UPPER.has(fold(w))) return w;
      return w.toLocaleLowerCase('tr').split('(').map(cap).join('(');
    })
    .join(' ');
}

/** { province: [district, ...] } from src/lib/tr-districts.ts. */
function readDistricts() {
  const src = readFileSync(resolve(ROOT, 'src/lib/tr-districts.ts'), 'utf-8');
  const body = src.slice(src.indexOf('TR_DISTRICTS'), src.indexOf('export function districtsOf'));
  const out = {};
  for (const m of body.matchAll(/'([^']+)': \[([\s\S]*?)\]/g)) {
    out[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  }
  return out;
}

// Warehouse names that predate a rename or merger → today's PTT district.
const ALIASES = {
  'Ankara/Kazan': 'Kahramankazan',
  'İstanbul/Eyüp': 'Eyüpsultan',
  'İstanbul/Eminönü': 'Fatih', // merged into Fatih in 2008
};

/** PTT district of a FulfillmentTR district name, or undefined. */
function pttDistrictFor(province, district, pttDistricts) {
  const byFold = new Map(pttDistricts.map((d) => [fold(d.name), d]));
  const key = fold(ALIASES[`${province}/${district}`] ?? district);
  if (byFold.has(key)) return byFold.get(key);
  // The warehouse's central district: "Merkez" / "<Province> Merkez" ↔ PTT "MERKEZ".
  if (key === 'merkez' || key === `${fold(province)} merkez`) {
    return byFold.get('merkez') ?? byFold.get(`${fold(province)} merkez`);
  }
  return undefined;
}

const [rawPath, version] = process.argv.slice(2);
if (!rawPath || !version) {
  console.error('usage: node scripts/build-tr-neighbourhoods.mjs <ptt-neighbourhoods.json> <version>');
  process.exit(1);
}
const raw = JSON.parse(readFileSync(rawPath, 'utf-8'));
const pttByProvince = new Map(raw.provinces.map((p) => [fold(p.name), p]));
const outDir = resolve(ROOT, 'public/tr-neighbourhoods', version);
mkdirSync(outDir, { recursive: true });

let total = 0;
let matched = 0;
let hoods = 0;
const unmatched = [];
for (const [province, districts] of Object.entries(readDistricts())) {
  const ptt = pttByProvince.get(fold(province));
  if (!ptt) throw new Error(`PTT has no province ${province}`);
  const data = {};
  for (const district of districts) {
    total += 1;
    const pd = pttDistrictFor(province, district, ptt.districts);
    if (!pd) {
      unmatched.push(`${province}/${district}`);
      continue;
    }
    matched += 1;
    const rows = new Map(); // title-cased name -> Set(zip)
    for (const [name, zips] of Object.entries(pd.neighbourhoods)) {
      const t = title(name);
      const set = rows.get(t) ?? new Set();
      for (const z of zips) if (z) set.add(z);
      rows.set(t, set);
    }
    data[district] = [...rows.entries()]
      .sort(([a], [b]) => collator.compare(a, b))
      .map(([t, set]) => [t, set.size === 1 ? [...set][0] : null]);
    hoods += data[district].length;
  }
  const fileKey = fold(province).replace(/\s+/g, '-');
  writeFileSync(
    resolve(outDir, `${fileKey}.json`),
    JSON.stringify({ source: `PTT ${raw.fetched}`, districts: data }),
  );
}

console.log(`districts: ${matched}/${total} with a list, ${hoods} neighbourhoods -> ${outDir}`);
console.log(`without a list (${unmatched.length}): ${unmatched.join(', ')}`);
