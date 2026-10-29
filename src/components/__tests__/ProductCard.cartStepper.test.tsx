/**
 * Степпер карточки каталога правит корзину (владелец 29.10.2026): у товара в
 * корзине «+»/«−» сразу меняют её строку, «−» на единице убирает товар, «+»
 * упирается в остаток; пока товара в корзине нет, степпер выбирает, сколько
 * положит кнопка «в корзину».
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import type { Product } from '@/lib/api';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children?: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/providers/CurrencyProvider', () => ({ useCurrency: () => 'TRY', useFormatLocale: () => 'tr-TR' }));
vi.mock('@/lib/prelaunch', () => ({ PRELAUNCH: false }));

const product = {
  id: 'p1', name: 'Base Gel', sku: 'BG', slug: 'base-gel', price: 925, images: [],
  category: { id: 'c1', name: 'Base Gel', slug: 'base_gel' }, bp_available: 5, date_created: '2026-01-01',
} as unknown as Product;

afterEach(cleanup);

function renderCard(inCartQuantity: number) {
  const onAddToCart = vi.fn();
  const onChangeCartQuantity = vi.fn();
  render(
    <ProductCard
      product={product}
      inCartQuantity={inCartQuantity}
      onAddToCart={onAddToCart}
      onChangeCartQuantity={onChangeCartQuantity}
    />,
  );
  return { onAddToCart, onChangeCartQuantity };
}

describe('ProductCard — степпер правит корзину', () => {
  it('товара нет в корзине: степпер выбирает количество, кнопка кладёт его', () => {
    const { onAddToCart, onChangeCartQuantity } = renderCard(0);
    fireEvent.click(screen.getByTestId('sf-catalog-qty-inc'));
    fireEvent.click(screen.getByTestId('sf-catalog-qty-inc'));
    expect(screen.getByTestId('sf-catalog-qty-value').textContent).toBe('3');
    expect(onChangeCartQuantity).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('sf-catalog-add-to-cart'));
    expect(onAddToCart).toHaveBeenCalledWith('p1', 3);
  });

  it('товар в корзине: степпер показывает её количество, «+»/«−» меняют его сразу', () => {
    const { onChangeCartQuantity } = renderCard(2);
    expect(screen.getByTestId('sf-catalog-qty-value').textContent).toBe('2');

    fireEvent.click(screen.getByTestId('sf-catalog-qty-inc'));
    expect(onChangeCartQuantity).toHaveBeenLastCalledWith('p1', 3);
    fireEvent.click(screen.getByTestId('sf-catalog-qty-dec'));
    expect(onChangeCartQuantity).toHaveBeenLastCalledWith('p1', 1);
  });

  it('«−» на единице убирает товар из корзины (количество 0)', () => {
    const { onChangeCartQuantity } = renderCard(1);
    fireEvent.click(screen.getByTestId('sf-catalog-qty-dec'));
    expect(onChangeCartQuantity).toHaveBeenCalledWith('p1', 0);
  });

  it('в корзине весь остаток → «+» недоступен', () => {
    renderCard(5);
    expect((screen.getByTestId('sf-catalog-qty-inc') as HTMLButtonElement).disabled).toBe(true);
  });

  it('товар в корзине: кнопка «в корзину» добавляет ещё одну штуку', () => {
    const { onAddToCart } = renderCard(2);
    fireEvent.click(screen.getByTestId('sf-catalog-add-to-cart'));
    expect(onAddToCart).toHaveBeenCalledWith('p1', 1);
  });
});
