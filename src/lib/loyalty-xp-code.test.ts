/**
 * Creator Club XP bonus code (13.10.2026): the member activates a code in the account.
 *
 * activateXpCode posts the code with the Bearer to `/auth/me/loyalty/xp-code`,
 * xpCodeErrorOf turns a BFF refusal into a translation key, and the XP history
 * labels a bonus row with its code.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock('axios', () => ({
  default: { create: () => ({ get: vi.fn(), post: mockPost }) },
}));

import { activateXpCode, adaptLoyaltyEntry, xpCodeErrorOf } from './loyalty';
import enMessages from '../../messages/en.json';
import trMessages from '../../messages/tr.json';

beforeEach(() => {
  mockPost.mockReset();
  localStorage.clear();
});

describe('activateXpCode', () => {
  it('posts the code with the bearer token and reads the credited XP', async () => {
    localStorage.setItem('arm_token', 'jwt-1');
    mockPost.mockResolvedValue({ data: { xp: '500', code: 'CLUB500', tier_code: 'silver' } });

    await expect(activateXpCode('CLUB500')).resolves.toEqual({
      xp: 500,
      code: 'CLUB500',
      tierCode: 'silver',
    });
    expect(mockPost).toHaveBeenCalledWith(
      '/auth/me/loyalty/xp-code',
      { code: 'CLUB500' },
      { headers: { Authorization: 'Bearer jwt-1' } },
    );
  });
});

describe('xpCodeErrorOf', () => {
  const axiosError = (status: number, code?: string) => ({
    response: { status, data: code ? { code, error: 'x' } : {} },
  });

  it('passes known BFF codes through', () => {
    expect(xpCodeErrorOf(axiosError(409, 'xp_code_already_used'))).toBe('xp_code_already_used');
    expect(xpCodeErrorOf(axiosError(400, 'xp_code_checkout_only'))).toBe('xp_code_checkout_only');
    expect(xpCodeErrorOf(axiosError(403, 'xp_code_personal_discount'))).toBe(
      'xp_code_personal_discount',
    );
  });

  it('429 is a rate limit, anything else is unknown', () => {
    expect(xpCodeErrorOf(axiosError(429))).toBe('rate_limited');
    expect(xpCodeErrorOf(axiosError(500, 'internal'))).toBe('unknown');
    expect(xpCodeErrorOf(new Error('network'))).toBe('unknown');
  });

  it('every reason has an English and a Turkish message', () => {
    const en = enMessages as Record<string, string>;
    const tr = trMessages as Record<string, string>;
    for (const reason of [
      'xp_code_invalid',
      'xp_code_checkout_only',
      'xp_code_not_yet_valid',
      'xp_code_expired',
      'xp_code_used_up',
      'xp_code_already_used',
      'xp_code_unavailable',
      'xp_code_personal_discount',
      'rate_limited',
      'unknown',
    ]) {
      expect(en[`loyalty.xpCode.errors.${reason}`]).toBeTruthy();
      expect(tr[`loyalty.xpCode.errors.${reason}`]).toBeTruthy();
    }
  });
});

describe('XP history — bonus-code row', () => {
  it('carries the code of an order-less grant', () => {
    expect(adaptLoyaltyEntry({ id: 'x1', amount: 500, promo_code: { code: 'CLUB500' } }).promoCode).toBe(
      'CLUB500',
    );
    expect(adaptLoyaltyEntry({ id: 'x2', amount: 40, order: { id: 'o1', number: 'N1' } }).promoCode).toBeUndefined();
    expect(adaptLoyaltyEntry({ id: 'x3', amount: 40, promo_code: null }).promoCode).toBeUndefined();
  });
});
