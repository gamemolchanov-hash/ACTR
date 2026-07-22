/**
 * Ön Bilgilendirme Formu (FBG-401) — fills the canonical V2 template
 * (on-bilgilendirme-formu-content.ts) with a concrete order's data and returns
 * ready-to-render Markdown for LegalMarkdown.
 *
 * Pure and side-effect free (the current time is passed in as `generatedAt`, not
 * read here), so the substitution is deterministic and unit-testable. The form
 * is generated client-side in the checkout modal at the cart→payment step,
 * before the payment obligation arises.
 *
 * Notes on field sourcing (see the task acceptance + open questions to client):
 *  - Order number: ARM assigns the real number only in `createOrder`, which runs
 *    AFTER the buyer reads this form and ticks the consent box. There is no draft
 *    order id in the system at display time, so a client-side draft reference is
 *    generated from the generation timestamp (`AC-YYYYMMDD-HHMMSS`). The
 *    persisted snapshot with the real order number + e-mail is a follow-up
 *    (ARM backend needed).
 *  - Taksit is not supported → "Uygulanmamaktadır".
 *  - The grand total ("Ödenecek Toplam Tutar") is the FULL order price — the
 *    checkout's `totalWithShipping` (subtotal − promo + shipping, already
 *    clamped) — passed in and never recomputed here, so it can't diverge from
 *    the checkout (incl. the promo>subtotal clamp edge). "Toplam İndirim" carries
 *    the promo discount ONLY, derived as subtotal + shipping − grandTotal so the
 *    summary reconciles.
 *  - The Creator Club wallet (FBG-385) is a payment instrument (store credit),
 *    NOT a discount on the goods: when applied it is shown as a wallet/card split
 *    in the payment method line, never in "Toplam İndirim" and never lowering the
 *    declared order price. Promo and wallet are mutually exclusive on this
 *    checkout (XOR).
 *  - Variant, essential characteristics and the hygiene-exception SKU list have
 *    no source field on the product yet → "Uygulanmamaktadır" / "Yoktur".
 *  - Delivery carrier/method/period come from the selected ARM shipping rate;
 *    when no rate is selected they read "Belirlenecek". The binding "Taahhüt
 *    Edilen Son Teslim Tarihi" is counted in BUSINESS days (weekends skipped) to
 *    match the "iş günü" period label and never under-promise. Open questions to
 *    the client: whether ARM's estimated_days_* are business days (assumed here)
 *    and the max prep window (PREP_DAYS, hardcoded from §6's "1 ila 2 iş günü");
 *    public holidays are not modelled — the §6 30-day cap stays the backstop.
 */

import {
  ON_BILGILENDIRME_PRODUCT_BLOCK,
  ON_BILGILENDIRME_TEMPLATE,
} from './on-bilgilendirme-formu-content';

const NOT_APPLICABLE = 'Uygulanmamaktadır';
const HYGIENE_NONE = 'Yoktur';
const DELIVERY_TBD = 'Belirlenecek';
const DASH = '—';

/** Card payment via iyzico; taksit is not offered. Wallet split is appended when used. */
const PAYMENT_METHOD_CARD = 'Kredi Kartı / Banka Kartı (iyzico)';

/**
 * Return carrier/method are not configured in the storefront yet (open question
 * to the client — do NOT invent a carrier name). The channel uses the known
 * seller e-mail. The return address itself is fixed in the canon (NİKAR GIDA).
 */
const RETURN_CARRIER = 'İade onayı sırasında Satıcı tarafından bildirilen anlaşmalı taşıyıcı';
const RETURN_METHOD = 'İade talebi onaylandıktan sonra anlaşmalı iade kargosu ile';
const RETURN_CHANNEL =
  'info@american-creator.tr adresine e-posta ile iade talebi oluşturularak iade kodu temin edilir.';

/**
 * Max order-prep window (business days) before hand-off — the upper bound of
 * §6's "1 ila 2 iş günü". Hardcoded pending a shipping-config source, and counted
 * as business days like the carrier estimate (both open questions to the client).
 */
const PREP_DAYS = 2;

export interface OnBilgilendirmeLineInput {
  name?: string | null;
  sku?: string | null;
  quantity: number;
  /** KDV-inclusive unit price (major units); null when the product has no price. */
  unitPrice?: number | null;
  /** KDV-inclusive line total; falls back to unitPrice × quantity. */
  lineTotal?: number | null;
}

export interface BuildOnBilgilendirmeInput {
  /** Moment the form is generated — drives the draft ref, date/time, promised date. */
  generatedAt: Date;
  customer: { name?: string; phone?: string; email?: string };
  /** Single formatted address; billing and shipping are the same on this checkout. */
  address: string;
  /** Currency word shown next to amounts (e.g. "TL" for TRY). */
  currencyLabel: string;
  items: OnBilgilendirmeLineInput[];
  subtotal: number;
  shippingCost: number;
  /** Creator Club wallet debit (store credit) — a payment split, not a discount. */
  walletApplied: number;
  /**
   * Full order price to be paid — the checkout's `totalWithShipping`
   * (subtotal − promo + shipping, already clamped). The form's "Ödenecek Toplam
   * Tutar" equals this exactly; "Toplam İndirim" (promo only) is derived from it
   * so the summary reconciles. The wallet-covered part vs card is split in the
   * payment method line.
   */
  grandTotal: number;
  /** Selected ARM shipping rate, or null when none is chosen yet. */
  rate: {
    carrier?: string | null;
    name?: string | null;
    estMin?: number | null;
    estMax?: number | null;
  } | null;
  kvkkNoticeUrl: string;
}

export interface OnBilgilendirmeData {
  /** One resolved placeholder map per cart line (expands §4's product block). */
  lines: Record<string, string>[];
  /** Order-level placeholder map (everything outside the per-product block). */
  order: Record<string, string>;
}

/** tr-TR money with 2 decimals; a dash when the amount is missing (price: null). */
export function formatObfAmount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return DASH;
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Client-side draft reference (no ARM order number exists pre-payment). */
function draftOrderRef(d: Date): string {
  return `AC-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(
    d.getHours(),
  )}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

function formatDateTimeTr(d: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatDateTr(d: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

function formatDaysTr(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null && max == null) return DELIVERY_TBD;
  const a = min ?? max!;
  const b = max ?? min!;
  return a === b ? `${a} iş günü` : `${a}–${b} iş günü`;
}

/**
 * Advance `start` by `days` business days, skipping Saturdays and Sundays.
 * Local-weekday semantics — a delivery promise is read against the buyer's
 * calendar. Exported for tests.
 */
export function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start.getTime());
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay(); // 0 = Sunday, 6 = Saturday
    if (wd !== 0 && wd !== 6) added += 1;
  }
  return d;
}

/**
 * Binding "son teslim tarihi" = generation date + max prep + carrier's max
 * transit, counted in BUSINESS days so the date matches the "iş günü" period
 * label and is never earlier than actually achievable (weekends push it out).
 * Falls back to "Belirlenecek" when the carrier gives no estimate.
 */
function promisedDeliveryDate(d: Date, estMax: number | null | undefined): string {
  if (estMax == null) return DELIVERY_TBD;
  return formatDateTr(addBusinessDays(d, PREP_DAYS + estMax));
}

function nonEmpty(value: string | null | undefined, fallback: string): string {
  const trimmed = (value ?? '').trim();
  return trimmed || fallback;
}

/**
 * Make a value safe to drop into a GFM table cell. LegalMarkdown reads a table
 * row-by-row and splits on a raw `|` BEFORE any inline/escape parsing, so BOTH a
 * `|` and a line break in a substituted value (free-text address, customer name,
 * ARM product name/SKU) corrupt §2/§4: a `|` spills into extra columns, and a
 * newline/tab ends the row early and drops the rest of the table. Escaping to
 * `\|` would not survive splitRow either, so the delimiter is turned into a
 * slash and any line break / tab is collapsed to a single space.
 */
function sanitizeCellValue(value: string): string {
  return value
    .replace(/\|/g, '/')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
}

function sanitizeMap(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, sanitizeCellValue(v)]));
}

/**
 * Replace `{{key}}` tokens from `map`. Unknown tokens are left intact on purpose,
 * so a forgotten field surfaces as a visible `{{…}}` (caught by tests) rather
 * than silently disappearing.
 */
function applyPlaceholders(src: string, map: Record<string, string>): string {
  return src.replace(/\{\{([a-z0-9_]+)\}\}/gi, (full, key) => (key in map ? map[key] : full));
}

/** Map raw checkout state → the resolved placeholder maps used by the renderer. */
export function buildOnBilgilendirmeData(input: BuildOnBilgilendirmeInput): OnBilgilendirmeData {
  const currency = input.currencyLabel;

  const lines: Record<string, string>[] = input.items.map((it) => {
    const lineTotal =
      it.lineTotal ?? (it.unitPrice != null ? it.unitPrice * it.quantity : null);
    return {
      product_name: nonEmpty(it.name, nonEmpty(it.sku, DASH)),
      sku: nonEmpty(it.sku, DASH),
      variant_or_not_applicable: NOT_APPLICABLE,
      essential_characteristics: NOT_APPLICABLE,
      quantity: String(it.quantity),
      unit_price_vat_included: formatObfAmount(it.unitPrice),
      discount_amount: formatObfAmount(0),
      line_total: formatObfAmount(lineTotal),
      currency,
    };
  });

  // "Toplam İndirim" = promo discount only, derived from the full order price so
  // the summary reconciles (Ara Toplam − Toplam İndirim + Teslimat = Ödenecek).
  // The wallet is NOT a discount — it splits the payment below.
  const additionalCosts = 0;
  const totalDiscount = Math.max(
    0,
    input.subtotal + input.shippingCost + additionalCosts - input.grandTotal,
  );

  // Creator Club wallet is store credit: show the wallet/card split in the
  // payment method, not as a discount. Card share = full order price − wallet.
  const cardAmount = Math.max(0, input.grandTotal - input.walletApplied);
  const paymentMethod =
    input.walletApplied > 0
      ? `Creator Club Cüzdanı (${formatObfAmount(input.walletApplied)} ${currency}) + ` +
        `${PAYMENT_METHOD_CARD} (${formatObfAmount(cardAmount)} ${currency})`
      : PAYMENT_METHOD_CARD;

  const order: Record<string, string> = {
    order_number: draftOrderRef(input.generatedAt),
    order_date_time: formatDateTimeTr(input.generatedAt),
    customer_full_name: nonEmpty(input.customer.name, DASH),
    customer_phone: nonEmpty(input.customer.phone, DASH),
    customer_email: nonEmpty(input.customer.email, DASH),
    billing_address: nonEmpty(input.address, DASH),
    shipping_address: nonEmpty(input.address, DASH),
    subtotal: formatObfAmount(input.subtotal),
    total_discount: formatObfAmount(totalDiscount),
    shipping_cost: formatObfAmount(input.shippingCost),
    additional_costs: formatObfAmount(additionalCosts),
    grand_total: formatObfAmount(input.grandTotal),
    currency,
    selected_payment_method: paymentMethod,
    installment_count_or_not_applicable: NOT_APPLICABLE,
    delivery_carrier_full_trade_name: nonEmpty(input.rate?.carrier, DELIVERY_TBD),
    delivery_method: nonEmpty(input.rate?.name, DELIVERY_TBD),
    estimated_delivery_period: formatDaysTr(input.rate?.estMin, input.rate?.estMax),
    promised_delivery_date: promisedDeliveryDate(input.generatedAt, input.rate?.estMax),
    return_carrier_full_trade_name: RETURN_CARRIER,
    return_method: RETURN_METHOD,
    return_request_channel_and_code_method: RETURN_CHANNEL,
    sku_hygiene_exception_list_or_none: HYGIENE_NONE,
    kvkk_notice_url: input.kvkkNoticeUrl,
  };

  // Sanitize every substituted value against GFM-table-breaking chars (see
  // sanitizeCellValue). Numbers/constants carry none, so it's a no-op for them.
  return { lines: lines.map(sanitizeMap), order: sanitizeMap(order) };
}

/** Fill the canonical template with order data → ready-to-render Markdown. */
export function renderOnBilgilendirmeFormu(data: OnBilgilendirmeData): string {
  const blocks = data.lines
    .map((line) => applyPlaceholders(ON_BILGILENDIRME_PRODUCT_BLOCK, line))
    .join('\n\n');
  // Function replacement so `$`/`$&` in the joined blocks are treated literally.
  const withBlocks = ON_BILGILENDIRME_TEMPLATE.replace('{{product_blocks}}', () => blocks);
  return applyPlaceholders(withBlocks, data.order);
}
