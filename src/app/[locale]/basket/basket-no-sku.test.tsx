/**
 * The basket never shows a line's SKU (owner 03.11.2026: «скрыть артикул товара
 * из корзины»): the name is there, the SKU from `POST /cart/validate` is not —
 * neither in the desktop table nor in the phone list.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const apiMock = vi.hoisted(() => ({
  validateCart: vi.fn(),
  validatePromo: vi.fn(),
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
vi.mock('@/providers/CartProvider', () => ({
  useCart: () => ({
    items: [{ productId: 'canary', quantity: 2 }],
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
  }),
}));
vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));
vi.mock('@/lib/api', () => apiMock);
vi.mock('@/lib/prelaunch', () => ({ PRELAUNCH: false }));

import BasketPage from './page';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('basket — no SKU', () => {
  it('shows the line name, never its SKU', async () => {
    apiMock.validateCart.mockResolvedValue({
      data: {
        items: [
          { productId: 'canary', sku: 'AC-TR-CAN-015', name: 'CANARY', quantity: 2, unitPrice: 950, lineTotal: 1900, valid: true },
        ],
        subtotal: 1900,
        allValid: true,
      },
    });
    const { container } = render(<BasketPage />);

    expect((await screen.findAllByText('CANARY')).length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain('AC-TR-CAN-015');
  });
});
