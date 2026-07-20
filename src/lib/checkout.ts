/**
 * Pure checkout gate + shipping helpers shared between the checkout page and its
 * tests (FBG-393). Keeping the predicate in one module stops the test mirror from
 * drifting out of sync with the button's real disabled condition.
 */

/**
 * Reasons ARM (or the client, for network/config failures) could not price a
 * route. ARM sends the first three in the shipping response `error` field; the
 * storefront synthesizes `not_configured` (`fedex_configured:false`) and
 * `network` (request threw). Each maps to an honest, reason-specific message.
 */
export const SHIPPING_UNAVAILABLE_REASONS = [
  'invalid_postal_code',
  'unsupported_destination',
  'rate_request_failed',
  'not_configured',
  'network',
] as const;

export type ShippingUnavailableReason = (typeof SHIPPING_UNAVAILABLE_REASONS)[number];

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
