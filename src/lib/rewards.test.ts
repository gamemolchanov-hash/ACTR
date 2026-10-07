/**
 * `/config.loyalty_program` → the /rewards view model. ARM numeric fields may
 * arrive as strings and optional fields may be absent: absent or junk values
 * must become null (the page then drops the figure) — never a made-up number.
 */
import { describe, it, expect } from 'vitest';
import { parseRewardsProgram } from './rewards';

describe('parseRewardsProgram', () => {
  it('parses the live ACTR programme', () => {
    const p = parseRewardsProgram({
      program: 'cashback_wallet',
      tiers: [
        { code: 'gold', min_xp: 60000, cashback_rate: 0.25 },
        { code: 'base', min_xp: 0, cashback_rate: 0.05 },
        { code: 'silver', min_xp: '25000', cashback_rate: '0.15' },
      ],
      wallet_cap: 0.4,
      xp_ttl_days: 90,
      window_days: '90',
      category_discounts: {
        category_ids: ['a', 'b'],
        rates: { base: 0.03, silver: '0.05', gold: 0.07 },
      },
    });

    expect(p.program).toBe('cashback_wallet');
    // Sorted by threshold; strings coerced.
    expect(p.tiers.map((t) => [t.code, t.min_xp, t.cashback_rate])).toEqual([
      ['base', 0, 0.05],
      ['silver', 25000, 0.15],
      ['gold', 60000, 0.25],
    ]);
    expect(p.walletCap).toBe(0.4);
    expect(p.xpTtlDays).toBe(90);
    expect(p.windowDays).toBe(90);
    expect(p.categoryDiscounts).toEqual({
      categoryIds: ['a', 'b'],
      rates: { base: 0.03, silver: 0.05, gold: 0.07 },
    });
  });

  it('keeps a wallet cap of 0 (spending off) apart from an absent or out-of-range one', () => {
    expect(parseRewardsProgram({ wallet_cap: 0 }).walletCap).toBe(0);
    expect(parseRewardsProgram({}).walletCap).toBeNull();
    expect(parseRewardsProgram({ wallet_cap: 'junk' }).walletCap).toBeNull();
    expect(parseRewardsProgram({ wallet_cap: 40 }).walletCap).toBeNull();
  });

  it('drops junk tiers and non-positive day counts', () => {
    const p = parseRewardsProgram({
      tiers: [{ code: 'base', min_xp: 0 }, { min_xp: 5 }, { code: 'x', min_xp: 'nope' }, null],
      xp_ttl_days: 0,
      window_days: -3,
    });
    expect(p.tiers.map((t) => t.code)).toEqual(['base']);
    expect(p.xpTtlDays).toBeNull();
    expect(p.windowDays).toBeNull();
  });

  it('has no category discounts without category ids', () => {
    expect(parseRewardsProgram({ category_discounts: { category_ids: [], rates: { base: 0.03 } } }).categoryDiscounts).toBeNull();
    expect(parseRewardsProgram({ category_discounts: null }).categoryDiscounts).toBeNull();
  });

  it('survives a null descriptor', () => {
    expect(parseRewardsProgram(null)).toEqual({
      program: '',
      tiers: [],
      walletCap: null,
      windowDays: null,
      xpTtlDays: null,
      categoryDiscounts: null,
    });
  });
});
