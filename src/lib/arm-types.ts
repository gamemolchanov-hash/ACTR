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

// ---------- Checkout ARM types ----------

/** Item in ARM CartValidation response. */
export interface ArmCartValidationItem {
  distributorProductId: string;
  valid: boolean;
  name?: string;
  sku?: string;
  unitPrice?: number;
  /** Present for valid items; absent when valid=false (product_not_found). */
  quantity?: number;
  available?: number;
  lineTotal?: number;
  vatRate?: number;
  image?: string | null;
  error?: string | null;
}

export interface ArmCartValidation {
  items: ArmCartValidationItem[];
  subtotal: number;
  allValid: boolean;
}

/**
 * ARM promo validation response (actual BFF contract from storefront-api.ts).
 * The BFF returns a discriminated union on `status`, not a `valid: boolean` field.
 */
export type ArmPromoValidation =
  | {
      status: 'applied';
      promo: {
        id: string;
        code: string;
        discount_type: string;
        discount_value: number;
        description: string | null;
      };
      discount_amount: number;
      free_shipping: boolean;
    }
  | { status: 'invalid' }
  | { status: 'not_yet_valid'; validFrom: string }
  | { status: 'expired' }
  | { status: 'used_up' }
  | { status: 'customer_limit'; limit: number }
  | { status: 'min_order'; minAmount: number };

/**
 * ARM Creator Club wallet preview (`POST /wallet/validate { total }`, FBG-385).
 * Returns the loyalty program, the live spend cap, the member's balance and the
 * amount the backend would debit for this order total
 * (`max_applicable = min(wallet_balance, total × wallet_cap)`). Amounts are
 * store-currency major units; numeric fields may arrive as strings.
 */
export interface ArmWalletValidation {
  /** Storefront loyalty program — the widget renders only for 'cashback_wallet'. */
  program?: string;
  /** Share of the order total the wallet may cover, ∈ [0,1] (0 = no spend; e.g. 0.4). */
  wallet_cap?: number | string;
  wallet_balance: number | string;
  max_applicable: number | string;
}

export interface ArmShippingRate {
  id: string;
  slug: 'economy' | 'standard' | 'express' | 'overnight';
  name: string;
  carrier: string;
  estimated_days_min: number;
  estimated_days_max: number;
  price: number;
  original_price?: number;
  is_free?: boolean;
  free_threshold?: number | null;
  live_rate?: boolean;
}

/**
 * Reason ARM could not price the route (FBG-393). Present when `rates` is empty;
 * absent/null when rates returned normally. `not_configured`/`network` may also
 * be synthesized client-side (`fedex_configured:false` / request failure).
 */
export type ArmShippingUnavailableReason =
  | 'invalid_postal_code'
  | 'unsupported_destination'
  | 'rate_request_failed'
  | 'not_configured'
  | 'network';

export interface ArmShippingRatesResponse {
  fedex_configured: boolean;
  rates: ArmShippingRate[];
  /** Honest failure reason when `rates` is empty; drives the checkout copy. */
  error?: ArmShippingUnavailableReason | null;
}

export interface ArmOrderCreateResponse {
  data: {
    id: string;
    number: string;
    total: number;
    currency: string;
  };
}

export interface ArmPaymentSession {
  sessionId: string;
  clientSecret?: string;
  publishableKey?: string;
  redirectUrl?: string;
}

export interface ArmOrder {
  id: string;
  number: string;
  date_created: string;
  total: number;
  currency: string;
  /** ARM v2 status is a relation; only code+name are reliably fetched server-side. */
  status: { code: string; name: string; color?: string };
  track_number?: string | null;
  track_url?: string | null;
  items: {
    id: string;
    quantity: number;
    unit_price: number;
    total: number;
    product: { name: string; sku: string };
  }[];
}
