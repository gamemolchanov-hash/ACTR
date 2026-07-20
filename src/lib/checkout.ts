/**
 * Pure checkout gate + shipping helpers shared between the checkout page and its
 * tests (FBG-393). Keeping the predicate in one module stops the test mirror from
 * drifting out of sync with the button's real disabled condition.
 */

import type { ArmShippingUnavailableReason } from './arm-types';

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
 * Whether "Proceed to Payment" is disabled. This is the single source of truth
 * for the button in checkout/page.tsx and the test mirror. The order can be
 * placed only when:
 *  - no request is already in flight (`submitting`),
 *  - both compliance consents are checked (KVKK + mesafeli), and
 *  - a concrete shipping rate is selected.
 * The last clause mirrors the ARM server guard that rejects a zero shipping cost
 * (`Shipping cost cannot be zero`). A free rate (`price:0`/`is_free`) still has a
 * non-empty id, so it counts as a valid selection — the gate keys off "a rate is
 * chosen", not "cost > 0".
 */
export function proceedButtonDisabled(opts: {
  submitting: boolean;
  agreedKvkk: boolean;
  agreedMesafeli: boolean;
  selectedRateId: string;
}): boolean {
  return (
    opts.submitting ||
    !opts.agreedKvkk ||
    !opts.agreedMesafeli ||
    !opts.selectedRateId
  );
}
