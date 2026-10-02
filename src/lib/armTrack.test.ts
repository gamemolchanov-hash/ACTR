import { afterEach, describe, expect, it, vi } from 'vitest';
import { armTrack } from './armTrack';

afterEach(() => {
  delete window.armTrack;
});

describe('armTrack (own ARM analytics, nav.js)', () => {
  it('queues calls until nav.js replaces the stub', () => {
    armTrack('view_item', { product: 'p1', value: 10 });
    armTrack('add_to_cart', { product: 'p1', qty: 2 });
    expect(window.armTrack?.q).toEqual([
      ['view_item', { product: 'p1', value: 10 }],
      ['add_to_cart', { product: 'p1', qty: 2 }],
    ]);
  });

  it('caps the queue while the script is not loaded (no analytics consent)', () => {
    for (let i = 0; i < 80; i++) armTrack('add_to_cart', { product: `p${i}`, qty: 1 });
    expect(window.armTrack?.q).toHaveLength(50);
  });

  it('hands events to the loaded tracker and never throws', () => {
    const fn = vi.fn();
    window.armTrack = fn;
    armTrack('purchase', { order: 'TR-1001' });
    expect(fn).toHaveBeenCalledWith('purchase', { order: 'TR-1001' });
    window.armTrack = (() => {
      throw new Error('boom');
    }) as unknown as typeof window.armTrack;
    expect(() => armTrack('begin_checkout', { qty: 1 })).not.toThrow();
  });
});
