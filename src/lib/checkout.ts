/**
 * Pure checkout gate + shipping helpers shared between the checkout page and its
 * tests (FBG-393). Keeping the predicate in one module stops the test mirror from
 * drifting out of sync with the button's real disabled condition.
 */

import type {
  ArmGuestAccountStatus,
  ArmShippingRate,
  ArmShippingUnavailableReason,
} from './arm-types';
import type { ValidatedCartItem } from './domain-types';

/**
 * Runtime list of the shipping-unavailable reasons. ARM sends the first three in
 * the shipping response `error` field; the storefront synthesizes `not_configured`
 * (`fedex_configured:false`) and `network` (request threw). Each maps to an honest,
 * reason-specific message. `satisfies` keeps this list in lockstep with the ARM
 * union (single source of truth), so the two can't silently drift apart.
 */
export const SHIPPING_UNAVAILABLE_REASONS = [
  'invalid_postal_code',
  'unsupported_destination',
  'rate_request_failed',
  'not_configured',
  'network',
] as const satisfies readonly ArmShippingUnavailableReason[];

/** Alias of the ARM union — the type itself lives in arm-types (no duplicate). */
export type ShippingUnavailableReason = ArmShippingUnavailableReason;

const REASON_SET = new Set<string>(SHIPPING_UNAVAILABLE_REASONS);

/**
 * i18n key for a shipping-unavailable reason. A known reason maps to its own
 * message; anything unknown/absent falls back to a generic line so a raw reason
 * string never reaches the screen.
 */
export function shippingErrorKey(reason: unknown): string {
  return typeof reason === 'string' && REASON_SET.has(reason)
    ? `checkout.shipping.${reason}`
    : 'checkout.shipping.unavailable_generic';
}

export type ShippingPanelState = 'pending' | 'error' | 'rates';

/**
 * Which block the step-2 shipping panel renders. The pre-fetch window (no rates
 * yet AND no error — first paint of step 2 before the effect fires) and an
 * in-flight request both resolve to `'pending'` (spinner); only a *resolved*
 * failure shows the alert. This stops entering step 2 from flashing a false
 * "unavailable" alert before any request has run (FBG-393 review).
 */
export function shippingPanelState(opts: {
  loading: boolean;
  hasError: boolean;
  ratesCount: number;
}): ShippingPanelState {
  if (opts.loading || (!opts.hasError && opts.ratesCount === 0)) return 'pending';
  if (opts.hasError) return 'error';
  return 'rates';
}

/**
 * Cart total from which a shipping method becomes free — shown under a paid
 * method ("3.000 ₺ ve üzeri siparişlerde ücretsiz"). The value is the method's
 * own `free_shipping_threshold` from ARM (`free_threshold` of /shipping/rates),
 * so the storefront never hardcodes the amount. `null` when there is nothing to
 * announce: no threshold, a non-positive one, or the rate is already free.
 */
export function freeShippingThreshold(
  rate: Pick<ArmShippingRate, 'is_free' | 'free_threshold'>,
): number | null {
  if (rate.is_free) return null;
  const threshold = rate.free_threshold;
  return typeof threshold === 'number' && Number.isFinite(threshold) && threshold > 0
    ? threshold
    : null;
}

/**
 * The smallest cart total that makes ANY offered method free — what the
 * "free shipping from …" banner announces. `null` when no method has a
 * threshold (the banner is then not shown at all).
 */
export function lowestFreeShippingThreshold(
  rates: ReadonlyArray<Pick<ArmShippingRate, 'is_free' | 'free_threshold'>> | undefined,
): number | null {
  const values = (rates ?? [])
    .map((r) => freeShippingThreshold({ is_free: false, free_threshold: r.free_threshold }))
    .filter((v): v is number => v != null);
  return values.length ? Math.min(...values) : null;
}

/**
 * Who the checkout is serving right now (FBG-477). `pending` is the honest
 * third state: the server render and the first client render BOTH look like a
 * guest to `useAuth()` (SSR has no token; the client has just read one from
 * localStorage and is still validating it), so keying the guest-only UI off
 * `!customer` alone would render one markup on the server and another on the
 * client. `hydrated` is the storefront's existing client-ready signal — until it
 * flips, and while the profile request is in flight, the answer is `pending`:
 * the same markup on both sides, and a closed submit gate.
 */
export type CheckoutAuthState = 'pending' | 'guest' | 'member';

export function checkoutAuthState(opts: {
  hydrated: boolean;
  authLoading: boolean;
  hasCustomer: boolean;
  hasToken: boolean;
}): CheckoutAuthState {
  if (!opts.hydrated || opts.authLoading) return 'pending';
  if (opts.hasCustomer) return 'member';
  // A token that never resolved into a profile: `/auth/me` failed on the network
  // or a 5xx, and only 401/403 drops the session (FBG-50 / D-04) — so the token
  // is still there and this shopper is almost certainly signed in. Gate them as
  // a MEMBER (no üyelik box, no guest-email strictness): a permanent `pending`
  // here was a silent checkout lockout (review round 6), and calling them a
  // guest would collect a pointless consent. The page retries the profile once
  // (see checkout/page.tsx); if the token is truly dead the BFF just treats the
  // order as anonymous server-side — same outcome as a guest, no gate needed.
  if (opts.hasToken) return 'member';
  return 'guest';
}

/** The üyelik (account-creation) consent is a guest-only box. */
export function showUyelikConsent(state: CheckoutAuthState): boolean {
  return state === 'guest';
}

/**
 * Email is mandatory only for a guest: ARM turns a guest checkout into a
 * claimable account, and without an address there is nothing to claim. A member
 * already has an account, so their email stays optional (as before).
 */
export function guestEmailRequired(state: CheckoutAuthState): boolean {
  return state === 'guest';
}

/**
 * Same shape of "looks like an email" the BFF applies (`z.string().email()` over
 * the trimmed value). Not a stricter validator — anything that slips through
 * still comes back as a localized `invalid_email` from ARM.
 */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/**
 * What ARM's refusal to open a payment session means for an order we have just
 * created. The BFF answers with `{ error, status }`:
 *  - 400 "Order is already paid" (storefront-api.ts) — the money is in; the
 *    buyer simply never landed on the confirmation page (reload/back before the
 *    return, or a storefront `success_url` that points elsewhere). Offering a
 *    retry would ask them to pay twice, and `GET /orders/:id` carries no
 *    `payment_status`, so the page cannot discover this on its own;
 *  - 404 for a guest — the ownership gate: the checkout phone belongs to a
 *    registered account, so only that account's JWT can pay (FBG-480);
 *  - 404 for a signed-in buyer — their token SHOULD have opened that gate, so
 *    this is a stale session or an order that isn't theirs. Retrying can't fix
 *    it either, but "sign in, it's someone's account" would be a lie;
 *  - any OTHER 4xx — the request or the storefront config is wrong, not the
 *    moment: `provider: none` answers 400 "No payment provider configured" on
 *    every attempt, so "press again" would loop forever;
 *  - 5xx / no response — transient; a retry is the right offer.
 */
export type PaymentSessionFailure =
  | 'already_paid'
  | 'owner_sign_in'
  | 'unreachable'
  | 'unavailable'
  | 'retry';

export function paymentSessionFailure(opts: {
  status: number | undefined;
  serverError: unknown;
  authState: CheckoutAuthState;
}): PaymentSessionFailure {
  const message = typeof opts.serverError === 'string' ? opts.serverError : '';
  if (opts.status === 400 && /already paid/i.test(message)) return 'already_paid';
  if (opts.status === 404) return opts.authState === 'member' ? 'unreachable' : 'owner_sign_in';
  // Timeout and rate-limit are about the moment, not the request: the BFF
  // limiter allows a bounded number of attempts per window, so waiting and
  // pressing again is exactly the right advice.
  if (opts.status === 408 || opts.status === 429) return 'retry';
  if (opts.status !== undefined && opts.status >= 400 && opts.status < 500) return 'unavailable';
  return 'retry';
}

/** i18n key explaining a payment failure to the buyer. */
export function paymentFailureKey(failure: PaymentSessionFailure): string {
  switch (failure) {
    case 'owner_sign_in':
      return 'checkout.errors.ownerSignInRequired';
    case 'unreachable':
      return 'checkout.errors.orderUnreachable';
    case 'unavailable':
      return 'checkout.errors.paymentUnavailable';
    default:
      return 'checkout.errors.paymentSessionFailed';
  }
}

/** Failures a retry can never resolve — the button must stop offering one. */
export function paymentRetryHopeless(failure: PaymentSessionFailure | null): boolean {
  return failure === 'owner_sign_in' || failure === 'unreachable' || failure === 'unavailable';
}

/** Why the order can't be placed yet, in the order the user should fix it. */
export type CheckoutBlockReason =
  | 'submitting'
  | 'payment_blocked'
  | 'auth_pending'
  | 'consent'
  | 'uyelik'
  | 'guest_email'
  | 'out_of_stock'
  | 'shipping_rate';

export interface CheckoutGateOpts {
  submitting: boolean;
  authState: CheckoutAuthState;
  agreedKvkk: boolean;
  agreedMesafeli: boolean;
  agreedUyelik: boolean;
  email: string;
  selectedRateId: string;
  /**
   * How many basket lines the warehouse does not cover right now (`stockProblems`,
   * cart/validate). While they are in the basket POST /orders answers 400
   * `insufficient_stock`, so the shopper removes them first with the warning's
   * button (port of ACRU d16418a, 04.11.2026).
   */
  stockProblems?: number;
  /**
   * ARM has already answered 201 for this checkout. Everything below was
   * validated when the order was created and the inputs are frozen since, so
   * only the payment session is still outstanding — re-checking the consents
   * would strand the shopper after a reload (the boxes are deliberately not
   * persisted, but the order is).
   */
  orderPlaced: boolean;
  /**
   * The last payment attempt failed in a way a retry cannot resolve (see
   * PaymentSessionFailure), so the button must stop firing the same doomed
   * request. The explanation is already on screen with its own way out.
   */
  paymentBlocked: boolean;
}

/**
 * The single source of truth for both the Proceed button and the submit handler
 * in checkout/page.tsx (D-04/COMP-02 "gate the handler, not only the button").
 * The order can be placed only when:
 *  - no request is already in flight (`submitting`),
 *  - the auth state has resolved — a `pending` state must not be read as "guest"
 *    (it would let a member through) nor as "member" (it would skip the üyelik
 *    consent for a guest),
 *  - both compliance consents are checked (KVKK + mesafeli),
 *  - a guest also accepted the üyelik agreement and gave a usable email, and
 *  - a concrete shipping rate is selected.
 * The last clause mirrors the ARM server guard that rejects a zero shipping cost
 * (`Shipping cost cannot be zero`). A free rate (`price:0`/`is_free`) still has a
 * non-empty id, so it counts as a valid selection — the gate keys off "a rate is
 * chosen", not "cost > 0".
 */
export function checkoutBlockReason(opts: CheckoutGateOpts): CheckoutBlockReason | null {
  if (opts.submitting) return 'submitting';
  if (opts.paymentBlocked) return 'payment_blocked';
  if (opts.orderPlaced) return null;
  if (opts.authState === 'pending') return 'auth_pending';
  if (!opts.agreedKvkk || !opts.agreedMesafeli) return 'consent';
  if (showUyelikConsent(opts.authState) && !opts.agreedUyelik) return 'uyelik';
  if (guestEmailRequired(opts.authState) && !looksLikeEmail(opts.email)) return 'guest_email';
  if (opts.stockProblems) return 'out_of_stock';
  if (!opts.selectedRateId) return 'shipping_rate';
  return null;
}

/**
 * Whether "Proceed to Payment" is disabled — the button face of the same gate.
 * Every block disables it EXCEPT `guest_email`: that field lives on step 1, so a
 * greyed-out button would strand the shopper with nothing to click and no way to
 * learn what is missing. The handler keeps refusing that case (and says so),
 * which is also what makes the handler gate observable rather than decorative.
 */
export function proceedButtonDisabled(opts: CheckoutGateOpts): boolean {
  const reason = checkoutBlockReason(opts);
  return reason !== null && reason !== 'guest_email';
}

/**
 * i18n key explaining a block to the shopper. `submitting`/`auth_pending` are
 * transient, `shipping_rate` already has its own hint under the button,
 * `out_of_stock` has its own warning with the remove button (`stockProblems`), and
 * `payment_blocked` keeps the message the failed attempt put on screen — so
 * those stay silent.
 */
export function blockReasonKey(reason: CheckoutBlockReason | null): string | null {
  switch (reason) {
    case 'consent':
      return 'checkout.consent.required';
    case 'uyelik':
      return 'checkout.consent.uyelikRequired';
    case 'guest_email':
      return 'checkout.consent.emailRequired';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Warehouse stock of the basket lines (port of ACRU d16418a, 04.11.2026)
// ---------------------------------------------------------------------------

/**
 * A basket line the warehouse does not cover right now. `available` — how many
 * pieces can be bought (0 — out of stock or no longer sold).
 */
export interface StockProblem {
  productId: string;
  name: string | null;
  quantity: number;
  available: number;
}

/** POST /orders refusals meaning "the warehouse does not cover a basket line". */
export const STOCK_ERROR_CODES = new Set<string>([
  'insufficient_stock',
  'product_unavailable',
  'product_not_found',
]);

/**
 * The lines POST /orders would refuse (`insufficient_stock` / `product_unavailable` /
 * `product_not_found`): cart/validate marks them `valid: false`. The checkout used to
 * hide them from "Your order" but still sent them with the order — the shopper saw a
 * ₺0.00 summary and an error without the item's name.
 */
export function stockProblems(validated: readonly ValidatedCartItem[]): StockProblem[] {
  return validated
    .filter((v) => !v.valid)
    .map((v) => ({
      productId: v.productId,
      name: v.name || v.sku || null,
      quantity: v.quantity,
      available: Math.max(0, Math.floor(v.available ?? 0)),
    }));
}

/**
 * What "Remove and continue" does with a line: keep what the warehouse has when part
 * of the quantity is in stock, otherwise drop the line from the basket.
 */
export function stockFix(p: StockProblem): { remove: true } | { remove: false; quantity: number } {
  return p.available > 0 && p.available < p.quantity
    ? { remove: false, quantity: p.available }
    : { remove: true };
}

/** The note under a basket line without stock (basket and "Your order"); null — the line is fine. */
export function stockLabel(
  item: Pick<ValidatedCartItem, 'valid' | 'quantity' | 'available'>,
): { key: 'basket.stock.out' } | { key: 'basket.stock.short'; count: number } | null {
  if (item.valid) return null;
  const available = Math.max(0, Math.floor(item.available ?? 0));
  return available > 0 && available < item.quantity
    ? { key: 'basket.stock.short', count: available }
    : { key: 'basket.stock.out' };
}

// ---------------------------------------------------------------------------
// Placed-order marker (FBG-477 review)
// ---------------------------------------------------------------------------

/**
 * An order ARM has already booked but whose payment hasn't started yet. It lives
 * beside the `checkout_form` draft (same store, same lifetime) because React
 * state does not survive the reload a shopper reaches for when a payment fails —
 * and without it the next submit would place a SECOND order for the same basket,
 * with a live first one left behind.
 *
 * The amount travels with the id on purpose: from this point on the basket is no
 * longer what is being paid for. ARM booked a fixed total, and the shopper can
 * still change the cart from /basket or another tab — so any figure recomputed
 * from the live basket would contradict what the payment actually charges.
 */
const PENDING_ORDER_KEY = 'checkout_pending_order';

export interface PendingOrder {
  orderId: string;
  /** Human-readable number — what the buyer quotes to support if payment dies. */
  number: string;
  /**
   * What the payment will actually take: the booked order total minus whatever
   * ARM already debited from the Creator Club wallet. Storing the net (rather
   * than the order value) is deliberate — this figure sits directly above the
   * Stripe form, so it must be the same number the form charges.
   */
  amountDue: number;
  currency: string;
}

function isPendingOrder(value: unknown): value is PendingOrder {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.orderId === 'string' &&
    v.orderId.length > 0 &&
    typeof v.number === 'string' &&
    typeof v.amountDue === 'number' &&
    typeof v.currency === 'string'
  );
}

export function savePendingOrder(order: PendingOrder): void {
  try {
    sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(order));
  } catch {}
}

export function readPendingOrder(): PendingOrder | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isPendingOrder(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Called at the terminal point of the checkout — see clearCheckoutDraft. */
export function clearPendingOrder(): void {
  try {
    sessionStorage.removeItem(PENDING_ORDER_KEY);
  } catch {}
}

// ---------------------------------------------------------------------------
// Order attempt key (REL-02, usability audit 03.11.2026)
// ---------------------------------------------------------------------------

/**
 * One order the shopper is placing = one attempt key. It travels with POST /orders
 * (`Idempotency-Key`): when the answer is lost — the connection drops, the 30 s timeout
 * fires, a gateway answers with its own error page — the next press repeats the SAME
 * key and ARM answers with the order it has already made instead of booking a second
 * one. A changed order (another basket, address or shopper) gets a new key: it is a
 * different order, not a retry.
 *
 * Only a hash of the request body is kept, never the body: the draft in sessionStorage
 * is personal data enough for one tab. Same lifetime as the draft (clearCheckoutDraft).
 */
const ORDER_ATTEMPT_KEY = 'checkout_order_attempt';

/** What ARM accepts as a key (`packs/arm/bff/services/order-idempotency.ts`). */
export const ATTEMPT_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/** 53-bit string hash (cyrb53): tells one request body from another, nothing more. */
function hash53(text: string): string {
  let h1 = 0xdeadbeef ^ text.length;
  let h2 = 0x41c6ce57 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function newAttemptKey(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

/**
 * The key for this POST /orders: the saved one when the body and the shopper are the
 * same as on the previous press, a fresh one (saved) otherwise. `principal` is who
 * orders — the customer id or `guest`: signing in between two presses makes a
 * different order (ARM books a member's order differently).
 */
export function orderAttemptKey(requestBody: string, principal: string): string {
  const fingerprint = hash53(`${principal}\n${requestBody}`);
  try {
    const raw = sessionStorage.getItem(ORDER_ATTEMPT_KEY);
    const saved = raw ? (JSON.parse(raw) as { key?: unknown; fingerprint?: unknown }) : null;
    if (
      saved &&
      saved.fingerprint === fingerprint &&
      typeof saved.key === 'string' &&
      ATTEMPT_KEY_PATTERN.test(saved.key)
    ) {
      return saved.key;
    }
  } catch {}
  const key = newAttemptKey();
  try {
    sessionStorage.setItem(ORDER_ATTEMPT_KEY, JSON.stringify({ key, fingerprint }));
  } catch {}
  return key;
}

/**
 * The body of an order on this storefront also carries the legal snapshot (Ön
 * Bilgilendirme Formu + Mesafeli Satış Sözleşmesi, lib/legal-snapshot), stamped with
 * the moment the shopper accepted it and the moment the documents were drawn up. ARM
 * keeps the hash of the first body under the key and answers 422 to any other — so a
 * press that repeats the attempt must carry the stamps of the press whose answer was
 * lost, or it would never get that order back. The attempt keeps them: while the
 * order (the body without the snapshot) and the shopper are the attempt's, its stamps
 * come back; any other order is stamped now. Only a hash and the two times are kept.
 */
const ORDER_ATTEMPT_MOMENTS_KEY = 'checkout_order_attempt_moments';

/** The two moments the legal snapshot of an order is stamped with. */
export interface OrderAttemptMoments {
  /** The press of the order button — `legal.acceptedAt`. */
  acceptedAt: Date;
  /** When the documents were drawn up: opened in the modal, else that press — `shownAt`. */
  shownAt: Date;
}

function momentOf(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const moment = new Date(value);
  return Number.isNaN(moment.getTime()) ? null : moment;
}

/**
 * The stamps for this order: the saved ones when `order` (the JSON body without the
 * legal snapshot) and `principal` are those of the open attempt, otherwise `stamp()`'s,
 * saved for the presses that may repeat it.
 */
export function orderAttemptMoments(
  order: string,
  principal: string,
  stamp: () => OrderAttemptMoments,
): OrderAttemptMoments {
  const fingerprint = hash53(`${principal}\n${order}`);
  try {
    const raw = sessionStorage.getItem(ORDER_ATTEMPT_MOMENTS_KEY);
    const saved = raw
      ? (JSON.parse(raw) as { fingerprint?: unknown; acceptedAt?: unknown; shownAt?: unknown })
      : null;
    if (saved && saved.fingerprint === fingerprint) {
      const acceptedAt = momentOf(saved.acceptedAt);
      const shownAt = momentOf(saved.shownAt);
      if (acceptedAt && shownAt) return { acceptedAt, shownAt };
    }
  } catch {}
  const moments = stamp();
  try {
    sessionStorage.setItem(
      ORDER_ATTEMPT_MOMENTS_KEY,
      JSON.stringify({
        fingerprint,
        acceptedAt: moments.acceptedAt.toISOString(),
        shownAt: moments.shownAt.toISOString(),
      }),
    );
  } catch {}
  return moments;
}

/** The order is booked, abandoned or refused for its content: the next press is a new order. */
export function clearOrderAttempt(): void {
  try {
    sessionStorage.removeItem(ORDER_ATTEMPT_KEY);
    sessionStorage.removeItem(ORDER_ATTEMPT_MOMENTS_KEY);
  } catch {}
}

/** A 2xx from POST /orders that does not name the order — as good as a lost answer. */
export class OrderAnswerError extends Error {
  constructor() {
    super('order_answer_without_id');
    this.name = 'OrderAnswerError';
  }
}

/**
 * POST /orders gave no answer to act on: no HTTP response at all (connection drop,
 * the axios timeout), a gateway error page instead of ARM's own error (5xx without
 * `error`), or a 2xx without an order (OrderAnswerError). The order may exist all the
 * same — so the shopper is told that pressing again continues THIS order (the attempt
 * key does that), not "Network Error" or "timeout of 30000ms exceeded".
 * Anything ARM answered itself (400 with its text, 409 `order_in_progress`, 429) is not lost.
 */
export function orderAnswerLost(err: unknown): boolean {
  if (err instanceof OrderAnswerError) return true;
  if (!err || typeof err !== 'object') return false;
  const e = err as { isAxiosError?: unknown; response?: { status?: unknown; data?: unknown } };
  if (e.isAxiosError !== true) return false; // a bug in this page, not the network
  if (!e.response) return true;
  const status = typeof e.response.status === 'number' ? e.response.status : 0;
  const data = e.response.data as { error?: unknown } | null | undefined;
  const armText = !!data && typeof data === 'object' && typeof data.error === 'string';
  return status >= 500 && !armText;
}

/** sessionStorage keys of the checkout draft — one definition, two pages. */
export const CHECKOUT_FORM_KEY = 'checkout_form';
export const CHECKOUT_STEP_KEY = 'checkout_step';
export const CHECKOUT_PROMO_KEY = 'checkout_promo';

/**
 * Drop everything this checkout left behind. Called ONLY from the confirmation
 * page: creating a payment session is not paying for the order, and until the
 * buyer actually lands on success, returning to /checkout (provider cancel,
 * reload, back button) has to resume the booked order rather than look like a
 * fresh basket and place a second one.
 */
export function clearCheckoutDraft(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_FORM_KEY);
    sessionStorage.removeItem(CHECKOUT_STEP_KEY);
    sessionStorage.removeItem(CHECKOUT_PROMO_KEY);
  } catch {}
  clearPendingOrder();
  clearOrderAttempt();
}

// ---------------------------------------------------------------------------
// Account notice hand-off, checkout → success (FBG-477)
// ---------------------------------------------------------------------------

/**
 * `POST /orders` is the ONLY place that reports what happened to the buyer's
 * account, and the shopper leaves the page through a full navigation (Stripe
 * redirect or `location.assign`), so React state can't carry it. `GET /orders/:id`
 * doesn't return `account` either — hence a sessionStorage hand-off, the same
 * class of data (and lifetime) as the `checkout_form` draft next to it.
 */
const ACCOUNT_NOTICE_KEY = 'checkout_account_notice';

export interface AccountNotice {
  /** Order the notice belongs to — guards against showing a previous one. */
  orderId: string;
  status: Extract<ArmGuestAccountStatus, 'created' | 'email_taken'>;
  welcomeEmailSent: boolean;
  /** Address ARM mailed / matched. Never travels through the URL. */
  email: string;
}

function isAccountNotice(value: unknown): value is AccountNotice {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.orderId === 'string' &&
    (v.status === 'created' || v.status === 'email_taken') &&
    typeof v.welcomeEmailSent === 'boolean' &&
    typeof v.email === 'string'
  );
}

export function saveAccountNotice(notice: AccountNotice): void {
  try {
    sessionStorage.setItem(ACCOUNT_NOTICE_KEY, JSON.stringify(notice));
  } catch {}
}

/**
 * Read without consuming. The success page may mount twice (React Strict Mode)
 * or be reloaded (F5) — a destructive read would blank the notice on the second
 * pass. Staleness is handled on the write side instead: every order clears or
 * overwrites the slot, and the reader still checks the order id.
 */
export function readAccountNotice(): AccountNotice | null {
  try {
    const raw = sessionStorage.getItem(ACCOUNT_NOTICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isAccountNotice(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Idempotent — called after every order whose status has nothing to announce. */
export function clearAccountNotice(): void {
  try {
    sessionStorage.removeItem(ACCOUNT_NOTICE_KEY);
  } catch {}
}

/**
 * Which notice (if any) the success page should show. An empty `orderId` means
 * the payment provider sent the shopper to its own configured `success_url`
 * without our query (ARM prefers `paymentConfig.success_url` over the URL we
 * pass) — the stored notice is then the only thing identifying the order, so it
 * is trusted. A DIFFERENT id means the page is showing another order: no notice.
 */
export function resolveAccountNotice(
  stored: AccountNotice | null,
  orderIdFromQuery: string,
): AccountNotice | null {
  if (!stored) return null;
  if (!orderIdFromQuery) return stored;
  return stored.orderId === orderIdFromQuery ? stored : null;
}
