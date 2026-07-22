/**
 * Creator Club wallet clamp rules (FBG-385).
 *
 * The widget must never let a member request more than min(balance, total×40%),
 * and the submit path must zero the debit for guests or when a promo is active
 * (XOR — owner rule §10). These are the pure predicates behind both.
 */
import { describe, it, expect } from 'vitest';
import { WALLET_DEFAULT_RATIO, walletCeiling, clampWalletAmount, effectiveWalletAmount } from './wallet';

describe('walletCeiling — min(balance, total × cap), default cap fallback', () => {
  it('caps at the default 40% of the total when no cap is given and balance is larger', () => {
    // 40% of 1000 = 400, balance 900 → 400 wins
    expect(walletCeiling(900, 1000)).toBe(400);
  });

  it('caps at the balance when it is the smaller bound', () => {
    // 40% of 1000 = 400, balance 250 → 250 wins
    expect(walletCeiling(250, 1000)).toBe(250);
  });

  it('is 0 for a zero total', () => {
    expect(walletCeiling(500, 0)).toBe(0);
  });

  it('is 0 for a zero balance', () => {
    expect(walletCeiling(0, 1000)).toBe(0);
  });

  it('never returns a negative for negative inputs', () => {
    expect(walletCeiling(-50, 1000)).toBe(0);
    expect(walletCeiling(500, -1000)).toBe(0);
  });

  it('collapses non-finite inputs to 0', () => {
    expect(walletCeiling(Number.NaN, 1000)).toBe(0);
    expect(walletCeiling(500, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('exposes the default fallback ratio as a named constant', () => {
    expect(WALLET_DEFAULT_RATIO).toBe(0.4);
  });

  it('rounds the default cap to 2 decimals (kuruş)', () => {
    // 40% of 100.01 = 40.004 → 40.00
    expect(walletCeiling(1000, 100.01)).toBe(40);
  });
});

describe('walletCeiling — honours the server cap', () => {
  it('uses a 30% server cap (not the 40% default)', () => {
    // 30% of 1000 = 300, balance 900 → 300 wins
    expect(walletCeiling(900, 1000, 0.3)).toBe(300);
  });

  it('uses a 50% server cap (not the 40% default)', () => {
    // 50% of 1000 = 500, balance 900 → 500 wins
    expect(walletCeiling(900, 1000, 0.5)).toBe(500);
  });

  it('still bounds by balance when the balance is below the server cap', () => {
    // 50% of 1000 = 500, balance 250 → 250 wins
    expect(walletCeiling(250, 1000, 0.5)).toBe(250);
  });

  it('falls back to the default cap for a non-positive or non-finite cap', () => {
    expect(walletCeiling(900, 1000, 0)).toBe(400);
    expect(walletCeiling(900, 1000, -0.3)).toBe(400);
    expect(walletCeiling(900, 1000, Number.NaN)).toBe(400);
  });
});

describe('clampWalletAmount — [0, ceiling]', () => {
  it('clamps a request above the 40% cap down to the cap', () => {
    expect(clampWalletAmount(999, 900, 1000)).toBe(400);
  });

  it('clamps a request above the balance down to the balance', () => {
    expect(clampWalletAmount(999, 250, 1000)).toBe(250);
  });

  it('passes a request within bounds through unchanged', () => {
    expect(clampWalletAmount(150, 900, 1000)).toBe(150);
  });

  it('returns 0 for a non-positive request', () => {
    expect(clampWalletAmount(0, 900, 1000)).toBe(0);
    expect(clampWalletAmount(-100, 900, 1000)).toBe(0);
  });

  it('returns 0 for a non-finite request', () => {
    expect(clampWalletAmount(Number.NaN, 900, 1000)).toBe(0);
  });

  it('clamps to the server cap ceiling when a cap is supplied (30% < default)', () => {
    // 30% of 1000 = 300 — a request of 400 is pulled down to 300
    expect(clampWalletAmount(400, 900, 1000, 0.3)).toBe(300);
  });

  it('allows more than the default when the server cap is higher (50%)', () => {
    // 50% of 1000 = 500 — a request of 450 passes through
    expect(clampWalletAmount(450, 900, 1000, 0.5)).toBe(450);
  });
});

describe('effectiveWalletAmount — XOR + auth backstop', () => {
  it('returns the applied amount for a logged-in user with no promo', () => {
    expect(effectiveWalletAmount({ loggedIn: true, promoActive: false, applied: 120 })).toBe(120);
  });

  it('returns 0 for a guest even with an applied amount', () => {
    expect(effectiveWalletAmount({ loggedIn: false, promoActive: false, applied: 120 })).toBe(0);
  });

  it('returns 0 when a promo is active (mutual exclusion)', () => {
    expect(effectiveWalletAmount({ loggedIn: true, promoActive: true, applied: 120 })).toBe(0);
  });

  it('returns 0 for a non-positive or non-finite applied amount', () => {
    expect(effectiveWalletAmount({ loggedIn: true, promoActive: false, applied: 0 })).toBe(0);
    expect(effectiveWalletAmount({ loggedIn: true, promoActive: false, applied: -5 })).toBe(0);
    expect(effectiveWalletAmount({ loggedIn: true, promoActive: false, applied: Number.NaN })).toBe(0);
  });
});
