/**
 * Creator Club V1 loyalty helpers (FBG-384).
 *
 * Covers the pure tier-progress + ledger-merge logic, the defensive ARM
 * adapters, the resilient two-source ledger fetch (one source may 404 without
 * crashing the page) and EN/TR key parity for the new loyalty.* namespace.
 *
 * Mocks `axios` (api.ts uses axios.create) — mirrors api-wallet.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted so the (hoisted) axios mock factory can reference mockGet even
// though the static `./loyalty` import triggers axios.create() at module load.
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock('axios', () => ({
  default: { create: () => ({ get: mockGet, post: vi.fn() }) },
}));

import {
  tierProgress,
  tierSegments,
  ratePercent,
  mergeLedger,
  adaptTier,
  adaptWalletEntry,
  adaptLoyaltyEntry,
  expiringSoon,
  fetchLoyaltyConfig,
  formatPercent,
  fetchLoyaltyLedger,
  type LoyaltyTier,
  type LoyaltyLedgerEntry,
} from './loyalty';
import enMessages from '../../messages/en.json';
import trMessages from '../../messages/tr.json';

const TIERS: LoyaltyTier[] = [
  { code: 'welcome', name: 'Welcome', min_xp: 0 },
  { code: 'silver', name: 'Silver', min_xp: 100 },
  { code: 'gold', name: 'Gold', min_xp: 300 },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('tierProgress', () => {
  it('starts at the first tier with 0 XP', () => {
    const p = tierProgress(0, TIERS);
    expect(p.current?.code).toBe('welcome');
    expect(p.next?.code).toBe('silver');
    expect(p.percent).toBe(0);
    expect(p.xpToNext).toBe(100);
  });

  it('computes mid-tier percent and remaining XP', () => {
    const p = tierProgress(150, TIERS);
    expect(p.current?.code).toBe('silver');
    expect(p.next?.code).toBe('gold');
    // (150-100)/(300-100) = 25%
    expect(p.percent).toBe(25);
    expect(p.xpToNext).toBe(150);
  });

  it('caps at the top tier (no next, 100%, null remaining)', () => {
    const p = tierProgress(500, TIERS);
    expect(p.current?.code).toBe('gold');
    expect(p.next).toBeNull();
    expect(p.percent).toBe(100);
    expect(p.xpToNext).toBeNull();
  });

  it('pins the current tier by explicit code from /me', () => {
    const p = tierProgress(50, TIERS, 'gold');
    expect(p.current?.code).toBe('gold');
    expect(p.next).toBeNull();
  });

  it('returns all-null with no configured tiers (hide the bar)', () => {
    const p = tierProgress(200, []);
    expect(p.current).toBeNull();
    expect(p.next).toBeNull();
    expect(p.percent).toBe(0);
    expect(p.xpToNext).toBeNull();
  });

  it('treats a non-finite XP as 0 (no crash)', () => {
    const p = tierProgress(Number.NaN, TIERS);
    expect(p.current?.code).toBe('welcome');
    expect(p.percent).toBe(0);
  });
});

describe('tierSegments (FBG-469 — segmented bar, any tier count)', () => {
  it('renders one preview segment per tier for a guest (no fill, no lock/current)', () => {
    const segs = tierSegments(null, TIERS);
    expect(segs.map((s) => s.state)).toEqual(['preview', 'preview', 'preview']);
    expect(segs.every((s) => s.fillPercent === 0)).toBe(true);
  });

  it('fills passed tiers fully and the current tier partially', () => {
    const segs = tierSegments(150, TIERS);
    expect(segs.map((s) => s.state)).toEqual(['unlocked', 'current', 'locked']);
    // welcome→silver is behind (100%), silver→gold is a quarter done, gold untouched.
    expect(segs.map((s) => s.fillPercent)).toEqual([100, 25, 0]);
  });

  it('marks the top tier current and full once its threshold is reached', () => {
    const segs = tierSegments(500, TIERS);
    expect(segs.map((s) => s.state)).toEqual(['unlocked', 'unlocked', 'current']);
    expect(segs.map((s) => s.fillPercent)).toEqual([100, 100, 100]);
  });

  it('starts a fresh member on the first tier with an empty bar', () => {
    const segs = tierSegments(0, TIERS);
    expect(segs.map((s) => s.state)).toEqual(['current', 'locked', 'locked']);
    expect(segs.map((s) => s.fillPercent)).toEqual([0, 0, 0]);
  });

  it('pins the current tier by /me tier_code even when XP lags behind', () => {
    const segs = tierSegments(50, TIERS, 'gold');
    expect(segs.map((s) => s.state)).toEqual(['unlocked', 'unlocked', 'current']);
  });

  // Acceptance criterion 3: the bar is built from the /config array — a 2- or
  // 4-tier programme must work with no code change.
  it('works with a 2-tier programme', () => {
    const two: LoyaltyTier[] = [
      { code: 'base', name: 'Base', min_xp: 0 },
      { code: 'pro', name: 'Pro', min_xp: 50 },
    ];
    const segs = tierSegments(25, two);
    expect(segs).toHaveLength(2);
    expect(segs.map((s) => s.state)).toEqual(['current', 'locked']);
    expect(segs.map((s) => s.fillPercent)).toEqual([50, 0]);
  });

  it('works with a 4-tier programme', () => {
    const four: LoyaltyTier[] = [
      { code: 'a', name: 'A', min_xp: 0 },
      { code: 'b', name: 'B', min_xp: 100 },
      { code: 'c', name: 'C', min_xp: 200 },
      { code: 'd', name: 'D', min_xp: 400 },
    ];
    const segs = tierSegments(300, four);
    expect(segs).toHaveLength(4);
    expect(segs.map((s) => s.state)).toEqual(['unlocked', 'unlocked', 'current', 'locked']);
    expect(segs.map((s) => s.fillPercent)).toEqual([100, 100, 50, 0]);
  });

  it('sorts unsorted config tiers before computing the bar', () => {
    const segs = tierSegments(150, [TIERS[2], TIERS[0], TIERS[1]]);
    expect(segs.map((s) => s.tier.code)).toEqual(['welcome', 'silver', 'gold']);
  });

  it('returns no segments without usable tiers, and never crashes on junk XP', () => {
    expect(tierSegments(100, [])).toEqual([]);
    expect(tierSegments(Number.NaN, TIERS).map((s) => s.state)).toEqual([
      'current',
      'locked',
      'locked',
    ]);
  });
});

describe('ratePercent', () => {
  it('normalises a fraction, tolerates a percent and rejects junk', () => {
    expect(ratePercent(0.05)).toBe(5);
    expect(ratePercent(1)).toBe(100);
    expect(ratePercent(8)).toBe(8);
    expect(ratePercent(undefined)).toBeNull();
    expect(ratePercent(null)).toBeNull();
    expect(ratePercent(Number.NaN)).toBeNull();
    expect(ratePercent(-0.1)).toBeNull();
  });

  // "This tier earns nothing" is a real answer — hiding it would read as an
  // unknown-but-nonzero rate (FBG-469 review).
  it('keeps a configured zero as 0, not as "no rate"', () => {
    expect(ratePercent(0)).toBe(0);
  });

  // The BFF allows any finite fraction — rounding 0.035 to 4% would advertise
  // terms the backend never granted (FBG-469 review).
  it('keeps fractional rates instead of rounding them to whole percent', () => {
    expect(ratePercent(0.035)).toBe(3.5);
    expect(ratePercent(0.1275)).toBe(12.75);
    expect(ratePercent(0.325)).toBe(32.5);
    // ...while still trimming the binary floating-point tail (0.07 * 100).
    expect(ratePercent(0.07)).toBe(7);
  });
});

describe('formatPercent', () => {
  it('formats a fractional percent with the storefront format locale', () => {
    expect(formatPercent(3.5, 'tr-TR')).toBe('3,5');
    expect(formatPercent(3.5, 'en-US')).toBe('3.5');
    expect(formatPercent(40, 'tr-TR')).toBe('40');
  });
});

describe('expiringSoon', () => {
  const NOW = Date.parse('2026-07-30T00:00:00Z');

  it('coerces a string amount and rounds the remaining days up', () => {
    expect(
      expiringSoon({ amount: '120', expires_at: '2026-08-13T00:00:00Z' }, NOW),
    ).toEqual({ xp: 120, days: 14 });
  });

  it('never reports negative days for XP that already lapsed', () => {
    expect(expiringSoon({ amount: 5, expires_at: '2026-07-01T00:00:00Z' }, NOW)).toEqual({
      xp: 5,
      days: 0,
    });
  });

  it('returns null when nothing is expiring, and tolerates a junk date', () => {
    expect(expiringSoon(null, NOW)).toBeNull();
    expect(expiringSoon(undefined, NOW)).toBeNull();
    expect(expiringSoon({ amount: 0, expires_at: '2026-08-13T00:00:00Z' }, NOW)).toBeNull();
    expect(expiringSoon({ amount: 10, expires_at: 'not-a-date' }, NOW)).toEqual({ xp: 10, days: 0 });
  });
});

describe('fetchLoyaltyConfig', () => {
  it('reads program, tiers and wallet_cap from the /config descriptor', async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          loyalty_program: {
            program: 'cashback_wallet',
            wallet_cap: 0.4,
            tiers: [
              { code: 'base', min_xp: 0, cashback_rate: 0.03 },
              { code: 'gold', min_xp: '500' },
              { code: 'broken' },
            ],
          },
        },
      },
    });

    const cfg = await fetchLoyaltyConfig();
    expect(cfg.program).toBe('cashback_wallet');
    expect(cfg.walletCap).toBe(0.4);
    // The tier without a threshold is dropped rather than rendered as 0 XP.
    expect(cfg.tiers.map((t) => t.code)).toEqual(['base', 'gold']);
  });

  it('degrades to an empty dormant config when the descriptor is missing', async () => {
    mockGet.mockResolvedValue({ data: { data: {} } });
    const cfg = await fetchLoyaltyConfig();
    expect(cfg).toEqual({ program: '', tiers: [], walletCap: null });
  });

  // wallet_cap is a fraction in [0,1]; 0 ("no wallet spending") is a real answer
  // and must not collapse into "unknown" (FBG-469 review).
  it.each([
    [0, 0],
    ['0', 0],
    [1, 1],
    [0.325, 0.325],
    [undefined, null],
    [null, null],
    ['nonsense', null],
    [1.5, null],
    [-0.1, null],
  ])('parses wallet_cap %p as %p', async (raw, expected) => {
    mockGet.mockResolvedValue({
      data: { data: { loyalty_program: { program: 'cashback_wallet', wallet_cap: raw } } },
    });
    expect((await fetchLoyaltyConfig()).walletCap).toBe(expected);
  });
});

describe('mergeLedger', () => {
  it('orders entries newest-first and sinks undated rows to the bottom', () => {
    const rows: LoyaltyLedgerEntry[] = [
      { id: 'a', kind: 'wallet', date: '2026-01-01T00:00:00Z', description: null, amount: 10 },
      { id: 'b', kind: 'loyalty', date: '2026-03-01T00:00:00Z', description: null, amount: 5 },
      { id: 'c', kind: 'wallet', date: '', description: null, amount: -3 },
    ];
    expect(mergeLedger(rows).map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('ARM adapters (defensive coercion)', () => {
  it('adaptWalletEntry coerces string amounts and keeps currency', () => {
    const e = adaptWalletEntry({
      id: 'w1',
      date_created: '2026-01-01',
      amount: '250.5',
      currency: 'TRY',
      note: 'Cashback',
    });
    expect(e).toEqual({
      id: 'w1',
      kind: 'wallet',
      date: '2026-01-01',
      description: 'Cashback',
      amount: 250.5,
      currency: 'TRY',
    });
  });

  it('adaptWalletEntry falls back on missing fields (never NaN/crash)', () => {
    const e = adaptWalletEntry({}, 3);
    expect(e.id).toBe('w-3');
    expect(e.amount).toBe(0);
    expect(e.currency).toBeUndefined();
    expect(e.description).toBeNull();
  });

  it('adaptLoyaltyEntry reads the XP delta (amount first) and passes status through', () => {
    expect(adaptLoyaltyEntry({ id: 'l1', xp: 40 }).amount).toBe(40);
    expect(adaptLoyaltyEntry({ points: '15' }).amount).toBe(15);
    expect(adaptLoyaltyEntry({ amount: 5 }).amount).toBe(5);
    expect(adaptLoyaltyEntry({ id: 'l2' }).kind).toBe('loyalty');
    expect(adaptLoyaltyEntry({ id: 'l3', amount: 10, status: 'expired' }).status).toBe('expired');
    expect(adaptLoyaltyEntry({ id: 'l4', amount: 10, date_created: '2026-05-01' }).date).toBe(
      '2026-05-01',
    );
  });

  it('adaptTier derives the name from the code (BFF sends none) and coerces min_xp', () => {
    expect(adaptTier({ code: 'silver', min_xp: 3000 })).toEqual({
      code: 'silver',
      name: 'Silver',
      min_xp: 3000,
    });
    expect(adaptTier({ code: 'gold', min_xp: 10000, cashback_rate: 0.08 })).toEqual({
      code: 'gold',
      name: 'Gold',
      min_xp: 10000,
      cashback_rate: 0.08,
    });
    expect(adaptTier({ code: 'g', name: 'Gold', min_xp: '300' })).toEqual({
      code: 'g',
      name: 'Gold',
      min_xp: 300,
    });
    // A configured 0 survives ("earns nothing"); junk is dropped as "no rate".
    expect(adaptTier({ code: 'base', min_xp: 0, cashback_rate: 0 })?.cashback_rate).toBe(0);
    expect(adaptTier({ code: 'base', min_xp: 0, cashback_rate: '0' })?.cashback_rate).toBe(0);
    expect(adaptTier({ code: 'base', min_xp: 0, cashback_rate: 'x' })?.cashback_rate).toBeUndefined();
    expect(adaptTier({ code: 'g' })).toBeNull(); // no min_xp
    expect(adaptTier({ name: 'Gold', min_xp: 1 })).toBeNull();
    expect(adaptTier(null)).toBeNull();
  });
});

describe('fetchLoyaltyLedger (two-source merge + resilience)', () => {
  it('merges wallet + loyalty pages, newest-first, taking the max totalPages', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('wallet')) {
        return Promise.resolve({
          data: { data: [{ id: 'w1', created_at: '2026-01-01', amount: '100', currency: 'TRY' }], meta: { totalPages: 2 } },
        });
      }
      return Promise.resolve({
        data: { data: [{ id: 'l1', created_at: '2026-02-01', xp: 50 }], meta: { totalPages: 3 } },
      });
    });

    const res = await fetchLoyaltyLedger(1, 10);
    expect(res.entries.map((e) => e.id)).toEqual(['l1', 'w1']);
    expect(res.totalPages).toBe(3);
  });

  it('still renders one half when the other source fails (no crash)', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('wallet')
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ data: { data: [{ id: 'l1', created_at: '2026-02-01', xp: 50 }], meta: { totalPages: 1 } } }),
    );

    const res = await fetchLoyaltyLedger(1, 10);
    expect(res.entries.map((e) => e.id)).toEqual(['l1']);
  });

  it('throws only when BOTH sources fail (page shows its error state)', async () => {
    mockGet.mockRejectedValue(new Error('down'));
    await expect(fetchLoyaltyLedger(1, 10)).rejects.toThrow('down');
  });
});

// The BFF sends tier codes only, so every code it can ship by default needs a
// localised name — otherwise the TR page falls back to an English-looking label
// derived from the code (FBG-469 review).
describe('tier name catalogue', () => {
  it.each(['base', 'welcome', 'silver', 'gold'])('has EN + TR copy for the %s tier', (code) => {
    const key = `loyalty.tierNames.${code}`;
    expect((enMessages as Record<string, string>)[key]).toBeTruthy();
    expect((trMessages as Record<string, string>)[key]).toBeTruthy();
  });
});

describe.each([['loyalty.'], ['rewards.']])('%s i18n key parity (EN + TR)', (prefix) => {
  const enKeys = Object.keys(enMessages).filter((k) => k.startsWith(prefix));
  const trKeys = Object.keys(trMessages).filter((k) => k.startsWith(prefix));

  it('has keys in en.json', () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it('EN and TR have identical key sets', () => {
    expect(enKeys.filter((k) => !(k in (trMessages as Record<string, string>)))).toHaveLength(0);
    expect(trKeys.filter((k) => !(k in (enMessages as Record<string, string>)))).toHaveLength(0);
  });

  it('no value is empty in either locale', () => {
    for (const k of enKeys) {
      expect((enMessages as Record<string, string>)[k]).toBeTruthy();
      expect((trMessages as Record<string, string>)[k]).toBeTruthy();
    }
  });

  // Guards against EN copy pasted into tr.json (the failure mode that made the
  // Tolgee round-trip mandatory). Brand names and pure-number formats are the
  // only legitimately identical values — extend the allow-list, never the test.
  it('EN and TR copy actually differ (no untranslated leftovers beyond brand names)', () => {
    const BRAND = new Set(
      ['navLabel', 'breadcrumb', 'title', 'metaTitle', 'xpUnit', 'xpThreshold'].map(
        (k) => `${prefix}${k}`,
      ),
    );
    const same = enKeys.filter(
      (k) =>
        !BRAND.has(k) &&
        (enMessages as Record<string, string>)[k] === (trMessages as Record<string, string>)[k],
    );
    expect(same).toEqual([]);
  });
});
