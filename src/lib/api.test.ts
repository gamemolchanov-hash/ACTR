/**
 * Phase 7 (DATA-01/D-07) — client catalog fetchers must send X-Currency.
 *
 * Root cause: `currencyHeader()` already exists and is correctly wired into
 * the 4 checkout endpoints (validatePromo/validateCart/fetchShippingRates/
 * createOrder), but `fetchProducts`/`fetchCategories` — the actual `/catalog`
 * listing path — send NO currency header at all today. This file asserts the
 * NEW behavior (RED until Task 2 wires currencyHeader() into both calls).
 *
 * Mocks `axios` (not global `fetch`) since `api.ts`'s `api` instance is
 * `axios.create(...)`; no existing test file mocks axios, so this scaffold is
 * assembled per 07-PATTERNS.md (idiomatic vitest, not an in-repo precedent).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('axios', () => ({
  default: {
    create: () => ({ get: mockGet, post: mockPost }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // USE_MOCKS must be off, otherwise fetchProducts/fetchCategories
  // short-circuit to MOCK_PRODUCTS/MOCK_CATEGORIES and never call axios.
  delete process.env.NEXT_PUBLIC_USE_MOCKS;
  // Leave NEXT_PUBLIC_STOREFRONT_CURRENCY unset so the default TRY applies.
  delete process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY;
  mockGet.mockResolvedValue({
    data: { data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 } },
  });
});

describe('fetchProducts — X-Currency header', () => {
  it('sends X-Currency: TRY on /products', async () => {
    const { fetchProducts } = await import('./api');
    await fetchProducts();
    expect(mockGet).toHaveBeenCalledWith(
      '/products',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Currency': 'TRY' }),
      }),
    );
  });
});

describe('fetchCategories — X-Currency header', () => {
  it('sends X-Currency: TRY on /categories', async () => {
    mockGet.mockResolvedValue({ data: { data: [] } });
    const { fetchCategories } = await import('./api');
    await fetchCategories();
    expect(mockGet).toHaveBeenCalledWith(
      '/categories',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Currency': 'TRY' }),
      }),
    );
  });
});
