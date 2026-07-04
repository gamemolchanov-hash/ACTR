/**
 * Доменные типы витрины ACTR (FBG-232).
 *
 * Плоские типы, на которые написаны UI-компоненты (ProductCard, CatalogView,
 * checkout…). Это ВЫХОД адаптера `arm-adapter.ts` (ARM distributor-product →
 * `Product`), а не сырые формы ARM (те — в `arm-types.ts`). Вынесены из `api.ts`,
 * чтобы компоненты не тянули типы из транспортного модуля; `api.ts` их re-export'ит
 * для обратной совместимости импортов.
 */

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

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
  discount_type?: 'percent' | 'fixed';
  discount_value?: number;
  discount_amount?: number;
  description?: string | null;
}
