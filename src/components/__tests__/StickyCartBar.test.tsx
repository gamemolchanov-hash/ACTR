/**
 * Липкая панель корзины (порт со старой витрины OMS, владелец 21.09.2026):
 * с непустой корзиной на витринных листингах (главная, каталог, категория)
 * видны счётчик с суммой (→ /basket) и CTA «Оформить заказ» (→ /checkout).
 * Вне листингов — на странице товара, в корзине, чекауте, кабинете — панели нет.
 * Сумма считается для текущего покупателя: скидка клуба вычтена, выход из
 * аккаунта сам перерисовывает панель.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let session: { customer: { id: string } | null; loading: boolean } = {
    customer: null,
    loading: false,
  };
  const auth = {
    get: () => session,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    set: (next: { customer: { id: string } | null; loading?: boolean }) => {
      session = { customer: next.customer, loading: next.loading ?? false };
      listeners.forEach((l) => l());
    },
  };
  return {
    validateCart: vi.fn(),
    pathname: '/',
    auth,
    cart: {
      items: [] as { productId: string; quantity: number }[],
      totalQuantity: 0,
      justAdded: false,
    },
  };
});

// Магазин открыт: без NEXT_PUBLIC_PRELAUNCH=false модуль по умолчанию закрывает заказы и панель.
vi.mock('@/lib/prelaunch', () => ({ PRELAUNCH: false }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => (key === 'cart.stickyBuy' ? 'Buy' : key),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children?: ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => mocks.pathname,
}));

vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'USD',
  useFormatLocale: () => 'en-US',
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  validateCart: mocks.validateCart,
}));

vi.mock('@/providers/CartProvider', () => ({
  useCart: () => mocks.cart,
}));

vi.mock('@/lib/auth-context', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useAuth: () => useSyncExternalStore(mocks.auth.subscribe, mocks.auth.get, mocks.auth.get),
  };
});

import { StickyCartBar } from '../StickyCartBar';

function renderBar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <StickyCartBar />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.set({ customer: null });
  mocks.pathname = '/';
  mocks.cart = {
    items: [{ productId: 'p1', quantity: 2 }],
    totalQuantity: 2,
    justAdded: false,
  };
  mocks.validateCart.mockResolvedValue({
    data: { items: [], subtotal: 3500, allValid: true, category_discount: 0 },
  });
});

afterEach(cleanup);

describe('StickyCartBar', () => {
  it('с непустой корзиной показывает счётчик, сумму и обе ссылки', async () => {
    renderBar();

    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByTestId('sf-sticky-cart-summary').getAttribute('href')).toBe('/basket');
    expect(screen.getByTestId('sf-sticky-cart-checkout').getAttribute('href')).toBe('/checkout');
    expect(screen.getByText(/buy/i)).toBeTruthy();

    await waitFor(() => expect(screen.getByText(/3,500/)).toBeTruthy());
  });

  it('с пустой корзиной не рендерится и не дёргает validate', () => {
    mocks.cart = { items: [], totalQuantity: 0, justAdded: false };
    renderBar();

    expect(screen.queryByTestId('sf-sticky-cart')).toBeNull();
    expect(mocks.validateCart).not.toHaveBeenCalled();
  });

  it.each(['/catalog', '/catalog/gels'])('видна на листинге %s', (path) => {
    mocks.pathname = path;
    renderBar();
    expect(screen.getByTestId('sf-sticky-cart')).toBeTruthy();
  });

  it.each(['/rewards', '/catalog/gels/base-gel-15', '/basket', '/checkout', '/checkout/success', '/account'])(
    'скрыта на %s',
    (path) => {
      mocks.pathname = path;
      renderBar();
      expect(screen.queryByTestId('sf-sticky-cart')).toBeNull();
    },
  );

  it('участнику показывает сумму с вычтенной скидкой клуба, логаут перерисовывает сам', async () => {
    mocks.auth.set({ customer: { id: 'c1' } });
    mocks.validateCart.mockResolvedValue({
      data: { items: [], subtotal: 3500, category_discount: 105, allValid: true },
    });
    renderBar();
    await waitFor(() => expect(screen.getByText(/3,395/)).toBeTruthy());

    mocks.validateCart.mockResolvedValue({
      data: { items: [], subtotal: 3500, category_discount: 0, allValid: true },
    });
    mocks.auth.set({ customer: null });

    await waitFor(() => expect(screen.getByText(/3,500/)).toBeTruthy());
    expect(screen.queryByText(/3,395/)).toBeNull();
  });
});
