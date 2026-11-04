/**
 * Warehouse stock of the basket lines (04.11.2026, port of ACRU d16418a). The .tr basket
 * showed ARM's raw code `insufficient_stock` under such a line, and the checkout hid it
 * from "Your order" (₺0.00 summary) while still sending it with the order. Lines with
 * `valid: false` from cart/validate are problems: while they are in the basket "Proceed
 * to Payment" is disabled, and "Remove and continue" drops the line or shrinks it to the
 * stock.
 */
import { describe, it, expect } from 'vitest';
import {
  STOCK_ERROR_CODES,
  blockReasonKey,
  checkoutBlockReason,
  proceedButtonDisabled,
  stockFix,
  stockLabel,
  stockProblems,
} from './checkout';
import { checkoutErrorKey } from './wallet';
import type { ValidatedCartItem } from './domain-types';

const line = (over: Partial<ValidatedCartItem>): ValidatedCartItem => ({
  productId: 'dp-1',
  valid: true,
  name: 'Base Gel 30 ml',
  sku: 'AC-BG-030',
  quantity: 1,
  available: 120,
  ...over,
});

const gate = {
  submitting: false,
  authState: 'member' as const,
  agreedKvkk: true,
  agreedMesafeli: true,
  agreedUyelik: false,
  email: 'buyer@example.com',
  selectedRateId: 'rate-1',
  paymentBlocked: false,
  orderPlaced: false,
};

describe('stockProblems', () => {
  it('takes only valid:false lines — with name, quantity and stock', () => {
    const problems = stockProblems([
      line({}),
      line({
        productId: 'dp-coffee',
        valid: false,
        name: 'COFFEE',
        sku: 'AC-CG-087',
        available: 0,
        error: 'insufficient_stock',
      }),
    ]);
    expect(problems).toEqual([{ productId: 'dp-coffee', name: 'COFFEE', quantity: 1, available: 0 }]);
  });

  it('a product gone from the catalog (product_not_found, no name, no stock) is a problem too, stock 0', () => {
    const problems = stockProblems([
      { productId: 'dp-gone', valid: false, quantity: 2, error: 'product_not_found' },
    ]);
    expect(problems).toEqual([{ productId: 'dp-gone', name: null, quantity: 2, available: 0 }]);
  });

  it('falls back to the SKU without a name', () => {
    const [p] = stockProblems([line({ valid: false, name: undefined, sku: 'AC-CG-087', available: 0 })]);
    expect(p.name).toBe('AC-CG-087');
  });

  it('a basket in stock has no problems', () => {
    expect(stockProblems([line({}), line({ productId: 'dp-2', quantity: 3, available: 3 })])).toEqual([]);
  });
});

describe('stockFix — what "Remove and continue" does', () => {
  it('no stock — remove the line', () => {
    expect(stockFix({ productId: 'dp', name: 'COFFEE', quantity: 1, available: 0 })).toEqual({ remove: true });
  });

  it('part in stock — keep what there is', () => {
    expect(stockFix({ productId: 'dp', name: 'VENERATE', quantity: 3, available: 2 })).toEqual({
      remove: false,
      quantity: 2,
    });
  });

  it('withdrawn from sale with "enough" stock — remove (stock does not fix it)', () => {
    expect(stockFix({ productId: 'dp', name: 'X', quantity: 1, available: 5 })).toEqual({ remove: true });
  });
});

describe('stockLabel — the note in the basket and in "Your order"', () => {
  it('a line in stock gets no note', () => {
    expect(stockLabel(line({}))).toBeNull();
  });

  it('out of stock → "Out of stock"', () => {
    expect(stockLabel(line({ valid: false, available: 0 }))).toEqual({ key: 'basket.stock.out' });
    expect(stockLabel({ valid: false, quantity: 1 })).toEqual({ key: 'basket.stock.out' });
  });

  it('part → "Only N left in stock"', () => {
    expect(stockLabel(line({ valid: false, quantity: 3, available: 2 }))).toEqual({
      key: 'basket.stock.short',
      count: 2,
    });
  });
});

describe('checkout gate with lines out of stock', () => {
  it('a problem line → out_of_stock, the button is disabled, the warning itself explains', () => {
    const reason = checkoutBlockReason({ ...gate, stockProblems: 1 });
    expect(reason).toBe('out_of_stock');
    expect(proceedButtonDisabled({ ...gate, stockProblems: 1 })).toBe(true);
    expect(blockReasonKey(reason)).toBeNull();
  });

  it('no problems — the gate is open', () => {
    expect(checkoutBlockReason({ ...gate, stockProblems: 0 })).toBeNull();
    expect(checkoutBlockReason(gate)).toBeNull();
  });

  it('an order already placed is not held by the basket lines (the payment retries that order)', () => {
    expect(checkoutBlockReason({ ...gate, stockProblems: 1, orderPlaced: true })).toBeNull();
  });

  it('the consents still come first', () => {
    expect(checkoutBlockReason({ ...gate, agreedKvkk: false, stockProblems: 1 })).toBe('consent');
  });

  it('POST /orders refusals about the warehouse — localized, not ARM English', () => {
    for (const code of ['insufficient_stock', 'product_unavailable', 'product_not_found']) {
      expect(STOCK_ERROR_CODES.has(code)).toBe(true);
      expect(checkoutErrorKey(code)).toBe(`checkout.errors.${code}`);
    }
    expect(STOCK_ERROR_CODES.has('email_taken')).toBe(false);
  });
});
