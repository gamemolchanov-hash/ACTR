/**
 * REL-02 (usability audit 03.11.2026) — one order = one attempt key.
 *
 * The key repeats while the order stays the same (a press after a lost answer gets
 * ARM's first order back), changes with the order, and is dropped once the order is
 * booked. "Lost answer" is only what ARM did not answer itself.
 *
 * On this storefront the body also carries the legal snapshot, stamped with the
 * moment of acceptance — so the attempt keeps those stamps too: a repeat of the same
 * order sends the same body, any other order is stamped anew.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ATTEMPT_KEY_PATTERN,
  clearCheckoutDraft,
  clearOrderAttempt,
  orderAnswerLost,
  OrderAnswerError,
  orderAttemptKey,
  orderAttemptMoments,
} from './checkout';

const BODY = JSON.stringify({ items: [{ distributorProductId: 'dp1', quantity: 2 }], locale: 'tr' });

beforeEach(() => sessionStorage.clear());

describe('orderAttemptKey', () => {
  it('repeats the key for the same body and shopper', () => {
    const first = orderAttemptKey(BODY, 'guest');
    expect(first).toMatch(ATTEMPT_KEY_PATTERN);
    expect(orderAttemptKey(BODY, 'guest')).toBe(first);
  });

  it('gives a changed order a new key', () => {
    const first = orderAttemptKey(BODY, 'guest');
    const changed = BODY.replace('"quantity":2', '"quantity":3');
    expect(orderAttemptKey(changed, 'guest')).not.toBe(first);
  });

  it('gives the same basket a new key once the shopper signed in', () => {
    const asGuest = orderAttemptKey(BODY, 'guest');
    expect(orderAttemptKey(BODY, 'c1')).not.toBe(asGuest);
  });

  it('keeps no part of the order body in the tab', () => {
    orderAttemptKey(BODY, 'guest');
    const stored = sessionStorage.getItem('checkout_order_attempt') ?? '';
    expect(stored).not.toContain('dp1');
  });

  it('starts over after the order was booked or the checkout finished', () => {
    const first = orderAttemptKey(BODY, 'guest');
    clearOrderAttempt();
    const second = orderAttemptKey(BODY, 'guest');
    expect(second).not.toBe(first);
    clearCheckoutDraft();
    expect(orderAttemptKey(BODY, 'guest')).not.toBe(second);
  });

  it('replaces a saved key ARM would refuse', () => {
    sessionStorage.setItem('checkout_order_attempt', JSON.stringify({ key: 'bad key!', fingerprint: 'x' }));
    expect(orderAttemptKey(BODY, 'guest')).toMatch(ATTEMPT_KEY_PATTERN);
  });
});

describe('orderAttemptMoments — the stamps of the legal snapshot', () => {
  const FIRST = {
    acceptedAt: new Date('2026-11-03T10:00:00.000Z'),
    shownAt: new Date('2026-11-03T09:58:30.000Z'),
  };
  const LATER = {
    acceptedAt: new Date('2026-11-03T10:00:07.000Z'),
    shownAt: new Date('2026-11-03T10:00:07.000Z'),
  };

  it('gives a repeat of the same order the stamps of its first press', () => {
    expect(orderAttemptMoments(BODY, 'guest', () => FIRST)).toEqual(FIRST);
    expect(orderAttemptMoments(BODY, 'guest', () => LATER)).toEqual(FIRST);
  });

  it('stamps a changed order anew', () => {
    orderAttemptMoments(BODY, 'guest', () => FIRST);
    const changed = BODY.replace('"quantity":2', '"quantity":3');
    expect(orderAttemptMoments(changed, 'guest', () => LATER)).toEqual(LATER);
  });

  it('stamps the same basket anew once the shopper signed in', () => {
    orderAttemptMoments(BODY, 'guest', () => FIRST);
    expect(orderAttemptMoments(BODY, 'c1', () => LATER)).toEqual(LATER);
  });

  it('stamps anew after the attempt is over', () => {
    orderAttemptMoments(BODY, 'guest', () => FIRST);
    clearOrderAttempt();
    expect(orderAttemptMoments(BODY, 'guest', () => LATER)).toEqual(LATER);
    clearCheckoutDraft();
    expect(orderAttemptMoments(BODY, 'guest', () => FIRST)).toEqual(FIRST);
  });

  it('keeps only a hash and the two times in the tab', () => {
    orderAttemptMoments(BODY, 'guest', () => FIRST);
    const stored = sessionStorage.getItem('checkout_order_attempt_moments') ?? '';
    expect(stored).not.toContain('dp1');
    expect(stored).toContain(FIRST.acceptedAt.toISOString());
  });

  it('stamps anew when the saved times are unreadable', () => {
    orderAttemptMoments(BODY, 'guest', () => FIRST);
    const saved = JSON.parse(sessionStorage.getItem('checkout_order_attempt_moments')!);
    sessionStorage.setItem(
      'checkout_order_attempt_moments',
      JSON.stringify({ ...saved, acceptedAt: 'not a date' }),
    );
    expect(orderAttemptMoments(BODY, 'guest', () => LATER)).toEqual(LATER);
  });
});

describe('orderAnswerLost', () => {
  const axiosError = (response?: { status: number; data?: unknown }) => ({
    isAxiosError: true,
    message: 'Network Error',
    response,
  });

  it('counts a dropped connection and the timeout as a lost answer', () => {
    expect(orderAnswerLost(axiosError())).toBe(true);
    expect(orderAnswerLost({ ...axiosError(), message: 'timeout of 30000ms exceeded', code: 'ECONNABORTED' })).toBe(true);
  });

  it("counts a gateway page instead of ARM's answer as lost", () => {
    expect(orderAnswerLost(axiosError({ status: 502, data: '<html>Bad gateway</html>' }))).toBe(true);
    expect(orderAnswerLost(axiosError({ status: 504 }))).toBe(true);
    // The storefront proxy itself failed to reach ARM: Next answers 500 with no body.
    expect(orderAnswerLost(axiosError({ status: 500, data: '' }))).toBe(true);
  });

  it('counts a 2xx without the order as lost', () => {
    expect(orderAnswerLost(new OrderAnswerError())).toBe(true);
  });

  it('keeps everything ARM answered itself', () => {
    expect(orderAnswerLost(axiosError({ status: 400, data: { error: 'Out of stock', code: 'x' } }))).toBe(false);
    expect(orderAnswerLost(axiosError({ status: 409, data: { error: 'busy', code: 'order_in_progress' } }))).toBe(false);
    expect(orderAnswerLost(axiosError({ status: 503, data: { error: 'Temporarily unavailable' } }))).toBe(false);
    expect(orderAnswerLost(axiosError({ status: 429, data: { error: 'Too many requests' } }))).toBe(false);
  });

  it('does not blame the network for a bug in the page', () => {
    expect(orderAnswerLost(new TypeError('x is undefined'))).toBe(false);
    expect(orderAnswerLost(null)).toBe(false);
  });
});
