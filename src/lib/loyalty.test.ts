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
  mergeLedger,
  adaptTier,
  adaptWalletEntry,
  adaptLoyaltyEntry,
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
      created_at: '2026-01-01',
      amount: '250.5',
      currency: 'TRY',
      description: 'Cashback',
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

  it('adaptLoyaltyEntry reads the XP delta from xp | points | amount', () => {
    expect(adaptLoyaltyEntry({ id: 'l1', xp: 40 }).amount).toBe(40);
    expect(adaptLoyaltyEntry({ points: '15' }).amount).toBe(15);
    expect(adaptLoyaltyEntry({ amount: 5 }).amount).toBe(5);
    expect(adaptLoyaltyEntry({ id: 'l2' }).kind).toBe('loyalty');
  });

  it('adaptTier drops rows missing code/name/min_xp and coerces min_xp', () => {
    expect(adaptTier({ code: 'g', name: 'Gold', min_xp: '300' })).toEqual({
      code: 'g',
      name: 'Gold',
      min_xp: 300,
    });
    expect(adaptTier({ code: 'g', name: 'Gold' })).toBeNull();
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

describe('loyalty i18n key parity (EN + TR)', () => {
  const enKeys = Object.keys(enMessages).filter((k) => k.startsWith('loyalty.'));
  const trKeys = Object.keys(trMessages).filter((k) => k.startsWith('loyalty.'));

  it('has loyalty.* keys in en.json', () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it('EN and TR have identical loyalty.* key sets', () => {
    expect(enKeys.filter((k) => !(k in (trMessages as Record<string, string>)))).toHaveLength(0);
    expect(trKeys.filter((k) => !(k in (enMessages as Record<string, string>)))).toHaveLength(0);
  });

  it('no loyalty.* value is empty in either locale', () => {
    for (const k of enKeys) {
      expect((enMessages as Record<string, string>)[k]).toBeTruthy();
      expect((trMessages as Record<string, string>)[k]).toBeTruthy();
    }
  });
});
