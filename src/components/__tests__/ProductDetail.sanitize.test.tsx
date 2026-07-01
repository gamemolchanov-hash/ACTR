/**
 * Sprint 3 (security remediation) — XSS regression test.
 *
 * ProductDetail renders admin-managed rich text (detail_text / usage_text /
 * application_text) via dangerouslySetInnerHTML. These sinks MUST go through
 * DOMPurify.sanitize() so stored XSS in product content can't execute.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductDetail } from '../ProductDetail';
import type { Product } from '@/lib/api';

const XSS_PAYLOAD = '<img src=x onerror=alert(1)><script>alert(1)</script><b>ok</b>';

const product: Product = {
  id: 'p1',
  name: 'Test Product',
  sku: 'SKU-1',
  slug: 'test-product',
  description: null,
  detail_text: XSS_PAYLOAD,
  usage_text: XSS_PAYLOAD,
  application_text: XSS_PAYLOAD,
  price: 1000,
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

vi.mock('@/lib/api', () => ({
  fetchProduct: vi.fn(async () => ({ data: product })),
}));

vi.mock('@/providers/CartProvider', () => ({
  useCart: () => ({ addItem: vi.fn() }),
}));

vi.mock('@/lib/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({ items: [], addViewed: vi.fn() }),
}));

// Phase 4 (i18n): ProductDetail now uses next-intl hooks. This XSS test only
// asserts sanitization, so a key-returning translation mock is enough.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

// Mock the next-intl navigation wrapper so the test doesn't pull in
// `next/navigation` (createNavigation) — unresolvable under vitest/jsdom.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => <a {...props}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

function renderProductDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductDetail productId="p1" />
    </QueryClientProvider>,
  );
}

describe('ProductDetail XSS sanitization', () => {
  it('strips <script> and onerror but keeps benign markup in all three rich-text panels', async () => {
    const { container } = renderProductDetail();

    // All three info panels rendered (test is not vacuous)
    // Phase 4 (i18n): headings are now t('product.*'); the mock returns the key.
    expect(await screen.findByText('product.description')).toBeTruthy();
    expect(screen.getByText('product.usage')).toBeTruthy();
    expect(screen.getByText('product.application')).toBeTruthy();

    const html = container.innerHTML;

    // Benign markup survives — one <b>ok</b> per panel
    expect(html).toContain('<b>ok</b>');
    expect(screen.getAllByText('ok')).toHaveLength(3);

    // Active payloads are stripped
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('alert(1)');
  });
});
