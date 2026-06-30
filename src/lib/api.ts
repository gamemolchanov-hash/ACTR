import axios from 'axios';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'tenant_snailmarket';

export const api = axios.create({
  baseURL: '/api/storefront',
  timeout: 30_000,
  headers: {
    'X-Tenant-ID': TENANT_ID,
  },
});

// ---------- Types ----------

export interface ProductImage {
  id: string;
  file_path: string;
  sort: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  slug: string | null;
  description: string | null;
  detail_text?: string | null;
  usage_text?: string | null;
  application_text?: string | null;
  badge?: string | null;
  video_url?: string | null;
  volume_ml?: number | null;
  price: number;
  wholesale_price: number | null;
  weight: number | null;
  volume: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  bp_available: number | null;
  category: { id: string; name: string; slug: string } | null;
  images?: ProductImage[];
  date_created: string;
  // BOGO HOOK START — populated by BFF when product is in an active auto_apply promo
  active_promo?: { code: string; label: string; discount_type: string } | null;
  // BOGO HOOK END
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface ValidatedCartItem {
  productId: string;
  valid: boolean;
  name?: string;
  sku?: string;
  unitPrice?: number;
  quantity: number;
  available?: number;
  lineTotal?: number;
  image?: string | null;
  error?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ---------- API Functions (with mock fallback for local dev) ----------

import { MOCK_PRODUCTS, MOCK_CATEGORIES } from './mock-data';
import { armToProduct, armToCategory, armToValidatedCart, armToPromoResult } from './arm-adapter';
import { bearerHeader } from './auth';
import type {
  ArmDistributorProduct,
  ArmCategory,
  ArmPaginated,
  ArmShippingRatesResponse,
  ArmOrderCreateResponse,
  ArmPaymentSession,
  ArmOrder,
} from './arm-types';

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

export async function fetchProducts(params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: string;
  inStock?: string;
}): Promise<PaginatedResponse<Product>> {
  if (USE_MOCKS) {
    let items = [...MOCK_PRODUCTS];
    if (params?.category) items = items.filter((p) => p.category?.slug === params.category);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
      );
    }
    if (params?.inStock === '1') items = items.filter((p) => (p.bp_available ?? 0) > 0);
    if (params?.sort === '-price') items.sort((a, b) => b.price - a.price);
    else if (params?.sort === 'price') items.sort((a, b) => a.price - b.price);
    else if (params?.sort === '-date_created')
      items.sort((a, b) => b.date_created.localeCompare(a.date_created));
    const page = params?.page || 1;
    const limit = params?.limit || 12;
    const start = (page - 1) * limit;
    return {
      data: items.slice(start, start + limit),
      meta: { total: items.length, page, limit, totalPages: Math.ceil(items.length / limit) },
    };
  }
  const { data } = await api.get<ArmPaginated<ArmDistributorProduct>>('/products', { params });
  return { data: data.data.map(armToProduct), meta: data.meta };
}

export async function fetchProduct(id: string): Promise<{ data: Product }> {
  if (USE_MOCKS) {
    const product = MOCK_PRODUCTS.find((p) => p.id === id);
    if (!product) throw new Error('Product not found');
    return { data: product };
  }
  const { data } = await api.get<{ data: ArmDistributorProduct }>(`/products/${id}`);
  return { data: armToProduct(data.data) };
}

export async function fetchCategories(): Promise<{ data: Category[] }> {
  if (USE_MOCKS) return { data: MOCK_CATEGORIES };
  const { data } = await api.get<{ data: ArmCategory[] }>('/categories');
  return { data: data.data.map(armToCategory) };
}

// ---------- Product Reviews (FBG-69) ----------

export interface ProductReview {
  id: string;
  author: string | null;
  rating: number;
  text: string | null;
  verified_purchase: boolean;
  date_created: string;
}

export interface ProductReviewsResponse {
  data: ProductReview[];
  meta: { total: number; page: number; limit: number; totalPages: number; average: number };
}

const EMPTY_REVIEWS: ProductReviewsResponse = {
  data: [],
  meta: { total: 0, page: 1, limit: 20, totalPages: 0, average: 0 },
};

export async function fetchProductReviews(
  productId: string,
  page = 1,
  limit = 20,
): Promise<ProductReviewsResponse> {
  if (USE_MOCKS) return EMPTY_REVIEWS;
  const { data } = await api.get('/reviews', { params: { product: productId, page, limit } });
  return data;
}

export async function submitReview(
  input: { product: string; rating: number; text?: string },
  token: string,
): Promise<{ data: { id: string; status: string; verified_purchase: boolean }; message: string }> {
  const { data } = await api.post('/reviews', input, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

// ---------- Checkout ----------

/** Returns X-Currency header for ARM checkout endpoints. */
function currencyHeader(): Record<string, string> {
  // TR market default — must match the display layer (money.ts/seo.ts use TRY).
  // USD here makes cart/validate return product_not_found for TRY-priced products.
  return { 'X-Currency': process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY' };
}

/** Maps a CartItem to the ARM distributorProductId form. */
function toArm(i: CartItem) {
  return { distributorProductId: i.productId, quantity: i.quantity };
}

// ---------- Promo Codes ----------

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
  discount_type?: 'percent' | 'fixed';
  discount_value?: number;
  discount_amount?: number;
  description?: string | null;
}

/**
 * Validate a promo code against a subtotal.
 * ARM contract: POST /promo/validate { code, subtotal }
 */
export async function validatePromo(
  code: string,
  subtotal: number,
): Promise<{ data: PromoValidationResult }> {
  const { data } = await api.post(
    '/promo/validate',
    { code, subtotal },
    { headers: currencyHeader() },
  );
  return { data: armToPromoResult(data.data) };
}

/**
 * Validate cart items against ARM inventory.
 * ARM contract: POST /cart/validate { items:[{distributorProductId,quantity}] }
 * Returns adapted ValidatedCartItem[] (no BOGO auto_promo — ARM doesn't support it).
 */
export async function validateCart(items: CartItem[]): Promise<{
  data: {
    items: ValidatedCartItem[];
    subtotal: number;
    allValid: boolean;
  };
}> {
  const { data } = await api.post(
    '/cart/validate',
    { items: items.map(toArm) },
    { headers: currencyHeader() },
  );
  return { data: armToValidatedCart(data.data) };
}

// ---------- Shipping ----------

export interface FetchShippingRatesParams {
  country: string;
  postalCode: string;
  items: CartItem[];
  currency?: string;
}

/**
 * Fetch available shipping rates from ARM.
 * ARM contract: GET /shipping/rates?country&postalCode&currency&items=JSON
 */
export async function fetchShippingRates(
  params: FetchShippingRatesParams,
): Promise<ArmShippingRatesResponse> {
  const { data } = await api.get('/shipping/rates', {
    params: {
      country: params.country,
      postalCode: params.postalCode,
      currency: params.currency || process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY',
      items: JSON.stringify(params.items.map(toArm)),
    },
    headers: currencyHeader(),
  });
  return data.data ?? data;
}

// ---------- Orders ----------

export interface CreateOrderPayload {
  customer: { name: string; phone: string; email?: string };
  shipping: {
    address?: string;
    street?: string;
    building?: string;
    block?: string;
    apartment?: string;
    city?: string;
    zip?: string;
    /** ISO-3166-1 alpha-2, e.g. "TR" */
    country: string;
    cost?: number;
    method?: string;
  };
  items: CartItem[];
  comment?: string;
  /** Promo code to apply (camelCase per ARM OpenAPI). */
  promoCode?: string;
}

/**
 * Create a guest order via ARM.
 * ARM contract: POST /orders CreateOrder → { data:{id,number,total,currency} }
 * Items are mapped to {distributorProductId,quantity} internally.
 */
export async function createOrder(payload: CreateOrderPayload): Promise<ArmOrderCreateResponse> {
  const body = {
    customer: payload.customer,
    shipping: payload.shipping,
    items: payload.items.map(toArm),
    comment: payload.comment,
    promoCode: payload.promoCode,
  };
  // D-06: bearerHeader() attaches Authorization for logged-in users; returns {} for guests
  const { data } = await api.post('/orders', body, {
    headers: { ...currencyHeader(), ...bearerHeader() },
  });
  return data;
}

/**
 * Create a Stripe payment session for an order.
 * ARM contract: POST /payment/create-session {orderId,successUrl,cancelUrl}
 */
export async function createPaymentSession(
  orderId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<{ data: ArmPaymentSession }> {
  const { data } = await api.post('/payment/create-session', {
    orderId,
    successUrl,
    cancelUrl,
  });
  return { data: data.data ?? data };
}

/**
 * Fetch a guest order by UUID.
 * ARM contract: GET /orders/{id}
 */
export async function fetchOrder(id: string): Promise<{ data: ArmOrder }> {
  const { data } = await api.get(`/orders/${id}`);
  return { data: data.data ?? data };
}
