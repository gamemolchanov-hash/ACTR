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

/**
 * What ARM did with the buyer's account while creating the order (FBG-476).
 *  - `none` — logged-in buyer, or nothing to claim (no email given);
 *  - `linked` — the order joined an existing record (phone/shell match);
 *  - `created` — a fresh claimable shell account, welcome mail attempted;
 *  - `email_taken` — the address belongs to a REGISTERED account, so the order
 *    went to a separate new shell instead. It is NOT visible in that account.
 */
export type ArmGuestAccountStatus = 'none' | 'linked' | 'created' | 'email_taken';

export interface ArmOrderAccount {
  status: ArmGuestAccountStatus;
  /** `false` is normal even for `created` (live reset token / mailer failure). */
  welcome_email_sent: boolean;
}

export interface ArmOrderCreateResponse {
  data: {
    id: string;
    number: string;
    /** Order value: subtotal − discount + shipping. NOT what the card is charged. */
    total: number;
    currency: string;
    /**
     * Amount debited from the Creator Club wallet (FBG-380/385). Omitted when
     * nothing was applied. The payment session charges `total − walletApplied`,
     * so any figure shown before paying has to net it out.
     */
    walletApplied?: number;
    /** Present only on storefronts with `auto_register_guests` on. */
    account?: ArmOrderAccount;
  };
}

/** Online (Stripe) session — hosted (`redirectUrl`) or embedded (`clientSecret`). */
export interface ArmPaymentSession {
  /** Never set on the online payload; the discriminant of the union below. */
  type?: undefined;
  sessionId: string;
  clientSecret?: string;
  publishableKey?: string;
  redirectUrl?: string;
}

/**
 * `provider: 'manual'` — offline payment (FBG-478). ARM answers 200 with no
 * session at all: no `sessionId`, no `clientSecret`, no `redirectUrl`. That is a
 * success (the order stays unpaid until an operator marks it paid in Portal),
 * so it must not be modelled as an online session with a fake id.
 */
export interface ArmManualPayment {
  type: 'manual';
}

export type ArmPaymentSessionResponse = ArmPaymentSession | ArmManualPayment;

// ---------- Ticari elektronik ileti consents (FBG-409 / FBG-410) ----------

/** İYS channels, 1:1 with the İYS taxonomy (E-POSTA / MESAJ / ARAMA). */
export type ArmConsentChannel = 'email' | 'mesaj' | 'arama';

/** MESAJ sub-channels — both ride the single İYS "MESAJ" channel. */
export type ArmConsentSubChannel = 'sms' | 'whatsapp';

export type ArmConsentStatus = 'onay' | 'ret';

/**
 * One consent event sent to ARM. The BFF schema is `.strict()`: `sub_channel` is
 * only valid on `mesaj`, and a `mesaj` GRANT must carry one (a sub-less
 * `mesaj: 'ret'` stays valid — that is the İYS channel-level unsubscribe).
 */
export interface ArmConsentDecision {
  channel: ArmConsentChannel;
  sub_channel?: ArmConsentSubChannel;
  status: ArmConsentStatus;
}

/**
 * Derived current state (latest event wins), already evaluated against the
 * customer's CURRENT email/phone — a contact change stales the old grant. `null`
 * means "never decided". Sendability lives in `mesaj_sms`/`mesaj_whatsapp`
 * (they already fold in an İYS channel-level `ret`); `mesaj` is informational.
 */
export interface ArmConsentState {
  email: ArmConsentStatus | null;
  arama: ArmConsentStatus | null;
  mesaj: ArmConsentStatus | null;
  mesaj_sms: ArmConsentStatus | null;
  mesaj_whatsapp: ArmConsentStatus | null;
}

/** Response of both GET and POST `/auth/me/consents`. */
export interface ArmConsentsResponse {
  /** Canon document id the shown text is pinned to — server-side, never sent. */
  text_version: string;
  consents: ArmConsentState;
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
