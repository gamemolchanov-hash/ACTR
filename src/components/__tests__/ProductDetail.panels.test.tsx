/**
 * Панели «Описание / Применение / Нанесение» (владелец 21.09.2026): свёрнуты,
 * три кнопки в одну строку; клик раскрывает текст под ними, повторный клик
 * сворачивает, открыта не больше одной. Тела всегда в DOM (hidden), чтобы
 * санитизация и SEO не зависели от состояния.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const PRODUCT = vi.hoisted(() => ({
  id: 'p1',
  name: 'Construction Gel 15 ml',
  sku: 'CG15',
  slug: 'construction-gel-15-ml',
  price: 1100,
  images: [],
  category: { id: 'c1', name: 'Construction Gel', slug: 'construction_gel' },
  description: 'short',
  detail_text: '<p>Detail body</p>',
  usage_text: '<p>Usage body</p>',
  application_text: null,
  bp_available: 5,
  date_created: '2026-01-01',
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'ru',
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => <a {...props}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('@/providers/CurrencyProvider', () => ({ useCurrency: () => 'RUB', useFormatLocale: () => 'ru-RU' }));
vi.mock('@/providers/CartProvider', () => ({ useCart: () => ({ addItem: vi.fn() }) }));
vi.mock('@/lib/useRecentlyViewed', () => ({ useRecentlyViewed: () => ({ items: [], addViewed: vi.fn() }) }));
vi.mock('@/lib/prelaunch', () => ({ PRELAUNCH: false }));
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchProduct: vi.fn().mockResolvedValue({ data: PRODUCT }),
}));

import { ProductDetail } from '../ProductDetail';

afterEach(cleanup);

describe('ProductDetail — панели свёрнуты, кнопки в ряд', () => {
  it('кнопки только для заполненных панелей; клик раскрывает, второй клик сворачивает, открыта одна', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ProductDetail productId="p1" />
      </QueryClientProvider>,
    );
    const tabs = await screen.findAllByTestId('sf-product-panel-tab');
    expect(tabs.map((b) => b.getAttribute('data-panel'))).toEqual(['detail', 'usage']);

    const panels = screen.getAllByTestId('sf-product-panel');
    expect(panels.every((p) => p.hasAttribute('hidden'))).toBe(true);
    expect(screen.getByText('Detail body')).toBeTruthy(); // в DOM, но скрыт

    fireEvent.click(tabs[0]);
    expect(panels[0].hasAttribute('hidden')).toBe(false);
    expect(panels[1].hasAttribute('hidden')).toBe(true);
    expect(tabs[0].getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(tabs[1]);
    expect(panels[0].hasAttribute('hidden')).toBe(true);
    expect(panels[1].hasAttribute('hidden')).toBe(false);

    fireEvent.click(tabs[1]);
    expect(panels.every((p) => p.hasAttribute('hidden'))).toBe(true);
  });
});
