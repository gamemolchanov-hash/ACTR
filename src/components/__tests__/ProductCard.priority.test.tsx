/**
 * FBG-226 — LCP: fetchpriority=high for the first catalog cards.
 *
 * The first row of cards (above the fold, incl. the LCP image) must be
 * eagerly fetched with fetchPriority="high"; later cards must be lazy-loaded
 * so they don't compete with the LCP request.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import type { Product } from '@/lib/api';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/providers/CurrencyProvider', () => ({
  useCurrency: () => 'TRY',
  useFormatLocale: () => 'tr-TR',
}));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Test Product',
    sku: 'SKU-1',
    slug: 'test-product',
    description: null,
    price: 1000,
    wholesale_price: null,
    weight: null,
    volume: null,
    length: null,
    width: null,
    height: null,
    bp_available: 5,
    category: null,
    images: [{ id: 'img1', file_path: 'demo/photo.webp', sort: 0 }],
    date_created: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ProductCard LCP priority (FBG-226)', () => {
  it('marks the first card as high-priority and eagerly loaded', () => {
    const { container } = render(<ProductCard product={makeProduct()} index={0} />);
    const img = container.querySelector('img[src*="/api/storefront/images/"]');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('fetchpriority')).toBe('high');
    expect(img?.getAttribute('loading')).toBe('eager');
  });

  it('lazy-loads and async-decodes cards below the fold', () => {
    const { container } = render(<ProductCard product={makeProduct()} index={10} />);
    const img = container.querySelector('img[src*="/api/storefront/images/"]');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('loading')).toBe('lazy');
    expect(img?.getAttribute('decoding')).toBe('async');
    // Below-the-fold images must NOT claim high priority.
    expect(img?.getAttribute('fetchpriority')).not.toBe('high');
  });

  it('treats a card as first-position (priority) when index is omitted', () => {
    const { container } = render(<ProductCard product={makeProduct()} />);
    const img = container.querySelector('img[src*="/api/storefront/images/"]');
    expect(img?.getAttribute('loading')).toBe('eager');
    expect(img?.getAttribute('fetchpriority')).toBe('high');
  });

  it('renders no product <img> (and does not crash) when the product has no image', () => {
    const { container } = render(
      <ProductCard product={makeProduct({ images: [] })} index={0} />,
    );
    expect(container.querySelector('img[src*="/api/storefront/images/"]')).toBeNull();
  });
});
