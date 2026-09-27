/**
 * orderStatusLabel — ARM status names are Russian, the buyer sees a key.
 * armToPromoResult — a rejected promo carries its machine reason.
 */
import { describe, it, expect } from 'vitest';
import { ORDER_STATUS_CODES, orderStatusLabel } from './order-status';
import { armToPromoResult } from './arm-adapter';
import enRaw from '../../messages/en.json';
import trRaw from '../../messages/tr.json';

const t = (key: string) => `t:${key}`;

describe('orderStatusLabel', () => {
  it('maps a known ARM status code to its orderStatus key, never the Russian name', () => {
    expect(orderStatusLabel(t, { code: 'new', name: 'Новый' })).toBe('t:orderStatus.new');
    expect(orderStatusLabel(t, { code: 'shipped', name: 'Отгружен' })).toBe('t:orderStatus.shipped');
  });

  it('falls back to a Latin name, else to the code, for an unknown status', () => {
    expect(orderStatusLabel(t, { code: 'on_hold', name: 'On hold' })).toBe('On hold');
    expect(orderStatusLabel(t, { code: 'on_hold', name: 'Удержан' })).toBe('on_hold');
    expect(orderStatusLabel(t, null)).toBe('—');
  });

  it('has an en + tr text for every known code', () => {
    const en = enRaw as Record<string, string>;
    const tr = trRaw as Record<string, string>;
    for (const code of ORDER_STATUS_CODES) {
      expect(en[`orderStatus.${code}`]?.trim()).toBeTruthy();
      expect(tr[`orderStatus.${code}`]?.trim()).toBeTruthy();
    }
  });
});

describe('armToPromoResult — rejection reason', () => {
  it('passes the ARM status through as `reason`', () => {
    expect(armToPromoResult({ status: 'expired' } as never)).toMatchObject({ valid: false, reason: 'expired' });
    expect(armToPromoResult({ status: 'min_order', minAmount: 500 } as never)).toMatchObject({
      valid: false,
      reason: 'min_order',
    });
  });

  it('reads an unknown status as invalid', () => {
    expect(armToPromoResult({ status: 'something_new' } as never)).toMatchObject({
      valid: false,
      reason: 'invalid',
    });
  });

  it('has an en + tr text for every reason', () => {
    const en = enRaw as Record<string, string>;
    const tr = trRaw as Record<string, string>;
    for (const r of ['invalid', 'not_yet_valid', 'expired', 'used_up', 'customer_limit', 'min_order', 'checkFailed']) {
      expect(en[`basket.promo.${r}`]?.trim()).toBeTruthy();
      expect(tr[`basket.promo.${r}`]?.trim()).toBeTruthy();
    }
  });
});
