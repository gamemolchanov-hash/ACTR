/**
 * FBG-477 — the checkout → success hand-off for what ARM did with the buyer's
 * account. `POST /orders` reports it once and the shopper then leaves the page
 * through a full navigation, so the notice rides sessionStorage.
 *
 * The contract under test: reading is NON-destructive (a reload or a Strict-Mode
 * double mount must show the same block again), staleness is handled on the
 * write side, and anything unreadable degrades to "no notice" rather than
 * throwing on the confirmation page.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clearAccountNotice,
  readAccountNotice,
  resolveAccountNotice,
  saveAccountNotice,
  type AccountNotice,
} from './checkout';

const NOTICE: AccountNotice = {
  orderId: 'ord-1',
  status: 'created',
  welcomeEmailSent: true,
  email: 'ada@example.com',
};

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('account notice storage', () => {
  it('round-trips a saved notice', () => {
    saveAccountNotice(NOTICE);
    expect(readAccountNotice()).toEqual(NOTICE);
  });

  it('reads non-destructively — a second read returns the same notice', () => {
    saveAccountNotice(NOTICE);
    expect(readAccountNotice()).toEqual(NOTICE);
    expect(readAccountNotice()).toEqual(NOTICE);
  });

  it('returns null when nothing was stored', () => {
    expect(readAccountNotice()).toBe(null);
  });

  it('returns null on corrupt JSON instead of throwing', () => {
    sessionStorage.setItem('checkout_account_notice', '{not json');
    expect(readAccountNotice()).toBe(null);
  });

  it('returns null on a well-formed but foreign payload', () => {
    sessionStorage.setItem('checkout_account_notice', JSON.stringify({ status: 'none' }));
    expect(readAccountNotice()).toBe(null);
  });

  it('survives a sessionStorage that throws (private mode / blocked storage)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveAccountNotice(NOTICE)).not.toThrow();
    expect(readAccountNotice()).toBe(null);
  });

  it('overwrites the previous order notice', () => {
    saveAccountNotice(NOTICE);
    saveAccountNotice({ ...NOTICE, orderId: 'ord-2', status: 'email_taken' });
    expect(readAccountNotice()).toEqual({
      ...NOTICE,
      orderId: 'ord-2',
      status: 'email_taken',
    });
  });

  it('clears idempotently', () => {
    saveAccountNotice(NOTICE);
    clearAccountNotice();
    clearAccountNotice();
    expect(readAccountNotice()).toBe(null);
  });
});

describe('resolveAccountNotice', () => {
  it('shows the notice for the matching order', () => {
    expect(resolveAccountNotice(NOTICE, 'ord-1')).toEqual(NOTICE);
  });

  it('shows the notice when the provider dropped our ?order= query', () => {
    // ARM prefers paymentConfig.success_url over the URL we pass, so the query
    // may be missing entirely — the stored notice is then the only order id.
    expect(resolveAccountNotice(NOTICE, '')).toEqual(NOTICE);
  });

  it('hides a notice belonging to a different order', () => {
    expect(resolveAccountNotice(NOTICE, 'ord-other')).toBe(null);
  });

  it('has nothing to show when nothing was stored', () => {
    expect(resolveAccountNotice(null, 'ord-1')).toBe(null);
    expect(resolveAccountNotice(null, '')).toBe(null);
  });
});
