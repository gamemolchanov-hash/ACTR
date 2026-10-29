/**
 * Степпер страницы товара правит корзину (владелец 29.10.2026): у товара в
 * корзине «+»/«−» сразу меняют её строку, «−» на единице убирает товар, «+»
 * упирается в остаток; пока товара в корзине нет, степпер выбирает, сколько
 * положит кнопка «в корзину».
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const PRODUCT = vi.hoisted(() => ({
  id: 'p1',
  name: 'Base Gel 15 ml',
  sku: 'BG15',
  slug: 'base-gel-15-ml',
  price: 925,
  images: [],
  category: { id: 'c1', name: 'Base Gel', slug: 'base_gel' },
  description: 'short',
  detail_text: null,
  usage_text: null,
  application_text: null,
  bp_available: 5,
  date_created: '2026-01-01',
}));

const cart = vi.hoisted(() => ({
  items: [] as { productId: string; quantity: number }[],
  addItem: vi.fn(),
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => <a {...props}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('@/providers/CurrencyProvider', () => ({ useCurrency: () => 'TRY', useFormatLocale: () => 'tr-TR' }));
vi.mock('@/providers/CartProvider', () => ({ useCart: () => cart }));
vi.mock('@/lib/useRecentlyViewed', () => ({ useRecentlyViewed: () => ({ items: [], addViewed: vi.fn() }) }));
vi.mock('@/lib/prelaunch', () => ({ PRELAUNCH: false }));
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchProduct: vi.fn().mockResolvedValue({ data: PRODUCT }),
}));

import { ProductDetail } from '../ProductDetail';

afterEach(() => {
  cleanup();
  cart.items = [];
  cart.addItem.mockClear();
  cart.updateQuantity.mockClear();
  cart.removeItem.mockClear();
});

async function renderPage(inCart: number) {
  cart.items = inCart > 0 ? [{ productId: 'p1', quantity: inCart }] : [];
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ProductDetail productId="base-gel-15-ml" />
    </QueryClientProvider>,
  );
  return screen.findByTestId('sf-product-qty-value');
}

describe('ProductDetail — степпер правит корзину', () => {
  it('товара нет в корзине: степпер выбирает количество, кнопка кладёт его', async () => {
    const value = await renderPage(0);
    fireEvent.click(screen.getByTestId('sf-product-qty-inc'));
    expect(value.textContent).toBe('2');
    expect(cart.updateQuantity).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('sf-product-add-to-cart'));
    expect(cart.addItem).toHaveBeenCalledWith('p1', 2);
  });

  it('товар в корзине: степпер показывает её количество, «+»/«−» меняют его сразу', async () => {
    const value = await renderPage(2);
    expect(value.textContent).toBe('2');

    fireEvent.click(screen.getByTestId('sf-product-qty-inc'));
    expect(cart.updateQuantity).toHaveBeenLastCalledWith('p1', 3);
    fireEvent.click(screen.getByTestId('sf-product-qty-dec'));
    expect(cart.updateQuantity).toHaveBeenLastCalledWith('p1', 1);
  });

  it('«−» на единице убирает товар из корзины', async () => {
    await renderPage(1);
    fireEvent.click(screen.getByTestId('sf-product-qty-dec'));
    expect(cart.removeItem).toHaveBeenCalledWith('p1');
    expect(cart.updateQuantity).not.toHaveBeenCalled();
  });

  it('в корзине весь остаток → «+» недоступен', async () => {
    await renderPage(5);
    expect((screen.getByTestId('sf-product-qty-inc') as HTMLButtonElement).disabled).toBe(true);
  });

  it('товар в корзине: кнопка «в корзину» добавляет ещё одну штуку', async () => {
    await renderPage(2);
    fireEvent.click(screen.getByTestId('sf-product-add-to-cart'));
    expect(cart.addItem).toHaveBeenCalledWith('p1', 1);
  });
});
