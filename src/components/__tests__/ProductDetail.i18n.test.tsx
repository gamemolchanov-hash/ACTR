/**
 * FBG-258 — тр-локаль должна запрашивать перевод товара (?lang=tr-TR), а при
 * отсутствии перевода корректно показывать базовый EN-текст.
 *
 * Здесь проверяется КЛИЕНТСКАЯ проводка: ProductDetail берёт активную локаль из
 * next-intl (URL, не cookie) и прокидывает её в fetchProduct — тем самым locale
 * попадает и в ?lang, и в ключ кэша React Query. Контракт самого ?lang покрыт в
 * api.test.ts / arm-contract.test.ts; тут — что компонент реально его дергает и
 * что база EN рендерится без ошибок/пустых блоков (translation_locale=null).
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductDetail } from '../ProductDetail';
import { fetchProduct } from '@/lib/api';
import type { Product } from '@/lib/api';

// Базовый товар: перевода нет (translation_locale=null на стороне BFF) → EN-поля.
const baseEnProduct: Product = {
  id: 'p1',
  name: 'BASE GEL',
  sku: 'SKU-1',
  slug: 'base-gel',
  description: 'English short description',
  detail_text: 'English detail text',
  usage_text: null,
  application_text: null,
  price: 1250,
  wholesale_price: null,
  weight: null,
  volume: null,
  length: null,
  width: null,
  height: null,
  bp_available: 5,
  category: null,
  images: [],
  date_created: '2026-01-01T00:00:00Z',
};

vi.mock('@/lib/api', () => ({ fetchProduct: vi.fn(async () => ({ data: baseEnProduct })) }));
const fetchProductMock = vi.mocked(fetchProduct);

vi.mock('@/providers/CartProvider', () => ({
  useCart: () => ({ addItem: vi.fn() }),
}));

vi.mock('@/lib/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({ items: [], addViewed: vi.fn() }),
}));

vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));

// Активная локаль — tr; useTranslations возвращает ключ (текст здесь не проверяем).
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'tr',
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

function renderProductDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductDetail productId="p1" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchProductMock.mockClear();
});

describe('ProductDetail — locale-aware product fetch (FBG-258)', () => {
  it('threads the active locale (tr) into fetchProduct so ?lang=tr-TR is requested', async () => {
    renderProductDetail();
    // Wait for the query to resolve (title renders).
    expect(await screen.findByText('BASE GEL')).toBeTruthy();
    expect(fetchProductMock).toHaveBeenCalledWith('p1', 'tr');
  });

  it('renders the base EN text when no translation exists (safe fallback, no empty blocks)', async () => {
    renderProductDetail();
    // Base EN name + short description + detail panel all render without error.
    expect(await screen.findByText('BASE GEL')).toBeTruthy();
    expect(screen.getByText('English short description')).toBeTruthy();
    expect(screen.getByText('English detail text')).toBeTruthy();
  });
});
