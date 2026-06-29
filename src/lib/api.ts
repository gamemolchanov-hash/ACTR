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
import { armToProduct, armToCategory } from './arm-adapter';
import type { ArmDistributorProduct, ArmCategory, ArmPaginated } from './arm-types';

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

// ---------- Delivery ----------

export interface DeliveryService {
  id: string;
  code: string;
  name: string;
}

export async function fetchDeliveryServices(): Promise<{ data: DeliveryService[] }> {
  const { data } = await api.get('/delivery-services');
  return data;
}

export interface CdekCity {
  code: number;
  city: string;
  region: string;
}

export async function searchCdekCities(city: string): Promise<{ data: CdekCity[] }> {
  const { data } = await api.get('/cdek/cities', { params: { city } });
  return data;
}

export interface CdekPoint {
  code: string;
  name: string;
  type: 'PVZ' | 'POSTAMAT';
  city_code: number;
  city: string;
  work_time: string;
  location: {
    address: string;
    address_full: string;
  };
}

export async function fetchCdekPoints(
  cityCode: number,
  type: 'PVZ' | 'POSTAMAT' | 'ALL',
): Promise<{ data: CdekPoint[] }> {
  const { data } = await api.get('/cdek/points', { params: { city_code: cityCode, type } });
  return data;
}

// ---------- Checkout ----------

export interface CreateOrderPayload {
  customer: { name: string; phone: string; email?: string };
  shipping: {
    address?: string;
    city?: string;
    zip?: string;
    country?: string;
    region?: string;
    district?: string;
    street?: string;
    building?: string;
    block?: string;
    apartment?: string;
    delivery_service?: string;
    delivery_type?: string;
    delivery_cost?: number;
    delivery_tariff_type?: string;
    pickup_point_code?: string;
  };
  items: CartItem[];
  comment?: string;
  payment_method?: string;
  promo_code?: string;
}

export interface CreateOrderResponse {
  data: {
    id: string;
    number: string;
    subtotal?: number;
    promo_discount?: number;
    total: number;
    paymentUrl?: string;
    paymentFields?: Record<string, string>;
  };
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

export async function validatePromo(
  code: string,
  items: CartItem[],
  customerPhone?: string,
): Promise<{ data: PromoValidationResult }> {
  const { data } = await api.post('/validate-promo', {
    code,
    items,
    customer_phone: customerPhone,
  });
  return data;
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  const { data } = await api.post('/orders', payload);
  return data;
}

export async function validateCart(items: CartItem[]): Promise<{
  data: {
    items: ValidatedCartItem[];
    subtotal: number;
    allValid: boolean;
    // BOGO HOOK START
    auto_promo?: {
      valid: boolean;
      discount_amount: number;
      free_quantity: number;
      eligible_quantity?: number;
      code: string;
      description: string | null;
      promo_id: string;
      discount_type: 'bogo';
    } | null;
    // BOGO HOOK END
  };
}> {
  const { data } = await api.post('/cart/validate', { items });
  return data;
}
