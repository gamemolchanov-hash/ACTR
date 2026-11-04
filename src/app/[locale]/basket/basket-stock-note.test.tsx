/**
 * A basket line the warehouse does not cover (04.11.2026, port of ACRU d16418a): the
 * .tr basket printed ARM's code `insufficient_stock` under the name (desktop) and
 * nothing at all on the phone. Now both say "Out of stock" / "Only N left in stock".
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const apiMock = vi.hoisted(() => ({
  validateCart: vi.fn(),
  validatePromo: vi.fn(),
}));
// One reference for every render — the page's effects on `items` must not loop.
const cart = vi.hoisted(() => ({
  value: {
    items: [
      { productId: 'gel', quantity: 2 },
      { productId: 'coffee', quantity: 3 },
    ],
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useLocale: () => 'tr',
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock('@/providers/CartProvider', () => ({ useCart: () => cart.value }));
vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));
vi.mock('@/lib/api', () => apiMock);
vi.mock('@/lib/prelaunch', () => ({ PRELAUNCH: false }));

import BasketPage from './page';

const GEL = {
  productId: 'gel',
  sku: 'AC-TR-BG-030',
  name: 'BASE GEL',
  quantity: 2,
  unitPrice: 950,
  lineTotal: 1900,
  available: 120,
  valid: true,
};
const COFFEE = {
  productId: 'coffee',
  sku: 'AC-TR-CG-087',
  name: 'COFFEE',
  quantity: 3,
  unitPrice: 925,
  lineTotal: 2775,
  available: 0,
  valid: false,
  error: 'insufficient_stock',
};

function validation(items: Record<string, unknown>[]) {
  return {
    data: {
      items,
      subtotal: items.filter((i) => i.valid).reduce((s, i) => s + Number(i.lineTotal), 0),
      allValid: items.every((i) => i.valid),
    },
  };
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('basket — a line without stock', () => {
  it('says "Out of stock" on desktop and phone, never the code insufficient_stock', async () => {
    apiMock.validateCart.mockResolvedValue(validation([GEL, COFFEE]));
    const { container } = render(<BasketPage />);

    const notes = await screen.findAllByTestId('sf-stock-note');
    // desktop table + phone card of the same line; the line in stock has none
    expect(notes.map((n) => n.textContent)).toEqual(['basket.stock.out', 'basket.stock.out']);
    expect(container.textContent).not.toContain('insufficient_stock');
  });

  it('part in stock — "Only N left in stock"', async () => {
    apiMock.validateCart.mockResolvedValue(validation([GEL, { ...COFFEE, available: 2 }]));
    render(<BasketPage />);

    const notes = await screen.findAllByTestId('sf-stock-note');
    expect(notes.map((n) => n.textContent)).toEqual([
      'basket.stock.short:{"count":2}',
      'basket.stock.short:{"count":2}',
    ]);
  });
});
