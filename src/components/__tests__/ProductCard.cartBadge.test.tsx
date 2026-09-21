/**
 * Красный кружок с количеством товара в корзине на кнопке «В корзину» карточки
 * (владелец 22.09.2026): виден при inCartQuantity > 0, при нуле его нет.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import type { Product } from '@/lib/api';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children?: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/providers/CurrencyProvider', () => ({ useCurrency: () => 'RUB', useFormatLocale: () => 'ru-RU' }));
vi.mock('@/lib/prelaunch', () => ({ PRELAUNCH: false }));

const product = {
  id: 'p1', name: 'Base Gel', sku: 'BG', slug: 'base-gel', price: 1100, images: [],
  category: { id: 'c1', name: 'Base Gel', slug: 'base_gel' }, bp_available: 10, date_created: '2026-01-01',
} as unknown as Product;

afterEach(cleanup);

describe('ProductCard — кружок количества в корзине', () => {
  it('3 в корзине → кружок «3» на кнопке', () => {
    render(<ProductCard product={product} inCartQuantity={3} />);
    const badge = screen.getByTestId('sf-cart-qty-badge').querySelector('.MuiBadge-badge')!;
    expect(badge.textContent).toBe('3');
    expect(badge.className).not.toContain('MuiBadge-invisible');
  });
  it('0 в корзине → кружок скрыт', () => {
    render(<ProductCard product={product} />);
    const badge = screen.getByTestId('sf-cart-qty-badge').querySelector('.MuiBadge-badge')!;
    expect(badge.className).toContain('MuiBadge-invisible');
  });
});
