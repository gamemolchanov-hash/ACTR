/**
 * FBG-416 — pre-launch gate on the cart.
 *
 * `addItem` is the central choke point: while `PRELAUNCH` is on it must NOT
 * mutate `items`/localStorage and must surface the "store is getting ready"
 * notice (from `prelaunch.*` keys). When the flag is flipped off at launch the
 * cart behaves exactly as before. Both branches are covered here.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { CartProvider, useCart } from './CartProvider';

// Toggleable mock of the single PRELAUNCH constant. A getter keeps the ESM
// live-binding honest so `addItem` reads the current value at call time.
const prelaunch = vi.hoisted(() => ({ value: true }));
vi.mock('@/lib/prelaunch', () => ({
  get PRELAUNCH() {
    return prelaunch.value;
  },
}));

// next-intl in tests returns the key itself (copy is asserted via key names).
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

const STORAGE_KEY = 'storefront_cart';

function Consumer() {
  const { addItem, items, totalQuantity } = useCart();
  return (
    <div>
      <button onClick={() => addItem('p1', 2)}>add</button>
      <span data-testid="count">{items.length}</span>
      <span data-testid="qty">{totalQuantity}</span>
    </div>
  );
}

function renderCart() {
  return render(
    <CartProvider>
      <Consumer />
    </CartProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('CartProvider addItem — pre-launch gate', () => {
  it('PRELAUNCH=true: does not add to cart or localStorage, shows the notice', async () => {
    prelaunch.value = true;
    renderCart();

    fireEvent.click(screen.getByText('add'));

    // Cart is untouched…
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('qty').textContent).toBe('0');
    // …and nothing was persisted.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    // The pre-launch notice is shown (not the "item added" modal).
    expect(await screen.findByText('prelaunch.message')).toBeTruthy();
    expect(screen.getByText('prelaunch.title')).toBeTruthy();
    expect(screen.queryByText('cart.added')).toBeNull();
  });

  it('PRELAUNCH=false: adds to cart and localStorage, no notice', async () => {
    prelaunch.value = false;
    renderCart();

    fireEvent.click(screen.getByText('add'));

    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('qty').textContent).toBe('2');
    // "Item added" modal, not the pre-launch notice.
    expect(screen.getByText('cart.added')).toBeTruthy();
    expect(screen.queryByText('prelaunch.message')).toBeNull();

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(stored).toEqual([{ productId: 'p1', quantity: 2 }]);
    });
  });
});
