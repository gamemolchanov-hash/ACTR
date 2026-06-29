/**
 * Формы ответов ARM storefront API (`/public/arm/storefront/*`).
 * Каталог ARM отдаёт distributor-product: цена/сток на уровне дистрибьютора +
 * вложенный мастер-товар. Адаптируется в тип `Product` компонентов AC (arm-adapter.ts).
 */

export interface ArmProductImage {
  id?: string;
  file_path: string;
  sort?: number;
}

export interface ArmProductInner {
  id: string;
  sku: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  detail_text?: string | null;
  application_text?: string | null;
  usage_text?: string | null;
  ingredients?: string | null;
  video_url?: string | null;
  weight?: number | null;
  volume_ml?: number | null;
  hold_level?: number | null;
  date_created?: string;
  images?: ArmProductImage[];
  category?: { id: string; name: string; slug: string } | null;
}

/** Строка каталога: id = distributorProductId (его ждут cart/order endpoints). */
export interface ArmDistributorProduct {
  id: string;
  price: string | number;
  wholesale_price?: number | null;
  compare_at_price?: number | null;
  stock_available: number | null;
  badge?: string | null;
  local_sku?: string | null;
  vat_rate?: number | null;
  product: ArmProductInner;
  category?: { id: string; name: string; slug: string } | null;
}

export interface ArmCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ArmPaginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
