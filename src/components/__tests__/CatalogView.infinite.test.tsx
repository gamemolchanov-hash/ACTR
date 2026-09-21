/**
 * Каталог: автоподгрузка при прокрутке вместо пагинации (владелец 21.09.2026).
 * Первая страница рендерится сразу; когда «страж» под сеткой попадает в зону
 * видимости, запрашивается следующая страница и карточки дописываются к списку;
 * после последней страницы страж исчезает. Счётчик «N товаров» — total с сервера.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  fetchProducts: vi.fn(),
  observers: [] as { cb: (entries: { isIntersecting: boolean }[]) => void }[],
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children?: ReactNode; href: string }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/providers/CurrencyProvider', () => ({ useCurrency: () => 'RUB', useFormatLocale: () => 'ru-RU' }));
vi.mock('@/providers/CartProvider', () => ({ useCart: () => ({ addItem: vi.fn() }) }));
vi.mock('@/components/ProductCard', () => ({
  ProductCard: ({ product }: { product: { id: string; name: string } }) => (
    <div data-testid="card">{product.name}</div>
  ),
}));
vi.mock('@/lib/api', () => ({
  fetchProducts: mocks.fetchProducts,
  fetchCategories: vi.fn().mockResolvedValue({ data: [] }),
}));

import { CatalogView } from '../CatalogView';

class FakeIO {
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
    mocks.observers.push({ cb });
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

function page(n: number, total = 30, limit = 12) {
  const start = (n - 1) * limit;
  const count = Math.max(0, Math.min(limit, total - start));
  return {
    data: Array.from({ length: count }, (_, i) => ({ id: `p${start + i + 1}`, name: `Product ${start + i + 1}` })),
    meta: { total, page: n, limit, totalPages: Math.ceil(total / limit) },
  };
}

beforeEach(() => {
  mocks.observers.length = 0;
  mocks.fetchProducts.mockReset();
  mocks.fetchProducts.mockImplementation(({ page: n }: { page: number }) => Promise.resolve(page(n)));
  vi.stubGlobal('IntersectionObserver', FakeIO);
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderCatalog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CatalogView />
    </QueryClientProvider>,
  );
}

describe('CatalogView — автоподгрузка', () => {
  it('грузит первую страницу, по стражу дописывает следующие, после последней страж исчезает', async () => {
    renderCatalog();
    await waitFor(() => expect(screen.getAllByTestId('card')).toHaveLength(12));
    expect(mocks.fetchProducts).toHaveBeenCalledTimes(1);
    expect(mocks.fetchProducts.mock.calls[0][0]).toMatchObject({ page: 1, limit: 12 });
    expect(screen.getByTestId('sf-catalog-load-more')).toBeTruthy();

    await act(async () => mocks.observers.at(-1)!.cb([{ isIntersecting: true }]));
    await waitFor(() => expect(screen.getAllByTestId('card')).toHaveLength(24));
    expect(mocks.fetchProducts.mock.calls[1][0]).toMatchObject({ page: 2 });

    await act(async () => mocks.observers.at(-1)!.cb([{ isIntersecting: true }]));
    await waitFor(() => expect(screen.getAllByTestId('card')).toHaveLength(30));
    expect(screen.queryByTestId('sf-catalog-load-more')).toBeNull();
    expect(mocks.fetchProducts).toHaveBeenCalledTimes(3);
  });

  it('одна страница — стража нет и лишних запросов нет', async () => {
    mocks.fetchProducts.mockImplementation(({ page: n }: { page: number }) => Promise.resolve(page(n, 5)));
    renderCatalog();
    await waitFor(() => expect(screen.getAllByTestId('card')).toHaveLength(5));
    expect(screen.queryByTestId('sf-catalog-load-more')).toBeNull();
    expect(mocks.fetchProducts).toHaveBeenCalledTimes(1);
  });
});
