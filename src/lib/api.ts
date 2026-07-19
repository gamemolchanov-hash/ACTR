import axios from 'axios';

import {
  ENDPOINTS,
  currencyHeader,
  productLangParam,
  storefrontCurrency,
  tenantHeader,
} from './arm-contract';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from './mock-data';
import {
  armToProduct,
  armToCategory,
  armToValidatedCart,
  armToPromoResult,
  armToWalletValidation,
} from './arm-adapter';
import { bearerHeader } from './auth';
import type {
  ProductImage,
  Product,
  Category,
  CartItem,
  ValidatedCartItem,
  PaginatedResponse,
  PromoValidationResult,
  WalletValidationResult,
} from './domain-types';
import type {
  ArmDistributorProduct,
  ArmCategory,
  ArmPaginated,
  ArmShippingRatesResponse,
  ArmOrderCreateResponse,
  ArmPaymentSession,
  ArmOrder,
} from './arm-types';

export const api = axios.create({
  baseURL: '/api/storefront',
  timeout: 30_000,
  headers: tenantHeader(),
});

// ---------- Types ----------
// Доменные типы живут в ./domain-types (FBG-232); X-Currency helper — в ./arm-contract.
// Re-export сохраняет обратную совместимость импортов из '@/lib/api' (компоненты не
// правим) и публичную сигнатуру currencyHeader() (используется тестами currency-default).

export type {
  ProductImage,
  Product,
  Category,
  CartItem,
  ValidatedCartItem,
  PaginatedResponse,
  PromoValidationResult,
  WalletValidationResult,
};
export { currencyHeader };

// ---------- API Functions (with mock fallback for local dev) ----------

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
  const { data } = await api.get<ArmPaginated<ArmDistributorProduct>>(ENDPOINTS.products, {
    params,
    headers: currencyHeader(),
  });
  return { data: data.data.map(armToProduct), meta: data.meta };
}

export async function fetchProduct(id: string, locale?: string): Promise<{ data: Product }> {
  if (USE_MOCKS) {
    const product = MOCK_PRODUCTS.find((p) => p.id === id);
    if (!product) throw new Error('Product not found');
    return { data: product };
  }
  // FBG-258: локаль tr → ?lang=tr-TR — BFF COALESCE'ит перевод поверх базовых EN-полей;
  // при отсутствии перевода отдаётся база (translation_locale=null, безопасный фолбэк).
  // en (и неизвестные локали) → без параметра: базовый EN, как раньше. Локаль берётся из
  // URL (next-intl useLocale), а не из cookie — согласованно с SSR/SEO (server-api.ts).
  const lang = productLangParam(locale);
  const { data } = await api.get<{ data: ArmDistributorProduct }>(
    ENDPOINTS.product(id),
    lang ? { params: { lang } } : undefined,
  );
  return { data: armToProduct(data.data) };
}

export async function fetchCategories(): Promise<{ data: Category[] }> {
  if (USE_MOCKS) return { data: MOCK_CATEGORIES };
  const { data } = await api.get<{ data: ArmCategory[] }>(ENDPOINTS.categories, {
    headers: currencyHeader(),
  });
  return { data: data.data.map(armToCategory) };
}

// ---------- Checkout ----------

/** Maps a CartItem to the ARM distributorProductId form. */
function toArm(i: CartItem) {
  return { distributorProductId: i.productId, quantity: i.quantity };
}

// ---------- Promo Codes ----------

/**
 * Validate a promo code against a subtotal.
 * ARM contract: POST /promo/validate { code, subtotal }
 */
export async function validatePromo(
  code: string,
  subtotal: number,
): Promise<{ data: PromoValidationResult }> {
  const { data } = await api.post(
    ENDPOINTS.promoValidate,
    { code, subtotal },
    { headers: currencyHeader() },
  );
  return { data: armToPromoResult(data.data) };
}

// ---------- Creator Club wallet (FBG-385) ----------

/**
 * Preview how much of the Creator Club wallet can be applied to an order.
 * ARM contract: POST /wallet/validate { amount, total } (Bearer-protected) →
 * { balance, applicable }. `applicable` is already clamped by the 40% rule; the
 * frontend clamps again for instant UX and the backend re-clamps on order create.
 * Bearer is required — this is a logged-in-only endpoint; guests never call it.
 */
export async function validateWallet(
  amount: number,
  total: number,
): Promise<{ data: WalletValidationResult }> {
  const { data } = await api.post(
    ENDPOINTS.walletValidate,
    { amount, total },
    { headers: { ...currencyHeader(), ...bearerHeader() } },
  );
  return { data: armToWalletValidation(data.data ?? data) };
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
    ENDPOINTS.cartValidate,
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
  const { data } = await api.get(ENDPOINTS.shippingRates, {
    params: {
      country: params.country,
      postalCode: params.postalCode,
      currency: params.currency || storefrontCurrency(),
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
  /**
   * Creator Club wallet debit (FBG-385). Sent to ARM only for a logged-in
   * customer (JWT present) and only when > 0 — see createOrder. Mutually
   * exclusive with promoCode; the BFF enforces the XOR as the last defence.
   */
  walletAmountToApply?: number;
}

/**
 * Create a guest order via ARM.
 * ARM contract: POST /orders CreateOrder → { data:{id,number,total,currency} }
 * Items are mapped to {distributorProductId,quantity} internally.
 */
export async function createOrder(payload: CreateOrderPayload): Promise<ArmOrderCreateResponse> {
  // D-06: bearerHeader() attaches Authorization for logged-in users; returns {} for guests
  const auth = bearerHeader();
  const hasJwt = 'Authorization' in auth;
  const body: Record<string, unknown> = {
    customer: payload.customer,
    shipping: payload.shipping,
    items: payload.items.map(toArm),
    comment: payload.comment,
    promoCode: payload.promoCode,
  };
  // FBG-385: the wallet debit is a logged-in-only action — attach
  // walletAmountToApply only with a JWT and a positive amount. Guests carry no
  // Creator Club wallet, so it must never appear in a guest order (regression).
  if (hasJwt && typeof payload.walletAmountToApply === 'number' && payload.walletAmountToApply > 0) {
    body.walletAmountToApply = payload.walletAmountToApply;
  }
  const { data } = await api.post(ENDPOINTS.orders, body, {
    headers: { ...currencyHeader(), ...auth },
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
  const { data } = await api.post(ENDPOINTS.paymentCreateSession, {
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
  const { data } = await api.get(ENDPOINTS.order(id));
  return { data: data.data ?? data };
}
