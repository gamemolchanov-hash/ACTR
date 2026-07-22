/**
 * Creator Club V2 — wallet (cashback) client-side helpers (FBG-385).
 *
 * The backend is the source of truth for the debited amount (`/wallet/validate`
 * previews it, order-create re-clamps it). These helpers only drive the live
 * checkout UX so the widget never lets the user request more than the rules
 * allow before the round-trip lands.
 */

/**
 * Fallback wallet cap (share of the order total the wallet may cover) used only
 * until `/wallet/validate` answers with the live `wallet_cap` from the storefront
 * loyalty config. The server is authoritative for the real cap on every request;
 * this constant just keeps the UI sane during the first round-trip (and if the
 * field is ever absent from an older BFF response).
 */
export const WALLET_DEFAULT_RATIO = 0.4;

/** Round to 2 decimals (kuruş) — kills FP dust in the previewed amount. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Sanitize a server cap into a usable ratio. A finite `cap >= 0` is honoured —
 * `0` is a meaningful "no spend" config (ceiling collapses to 0), NOT a missing
 * value. Only a negative / non-finite cap falls back to WALLET_DEFAULT_RATIO.
 */
function safeCap(cap: number): number {
  return Number.isFinite(cap) && cap >= 0 ? cap : WALLET_DEFAULT_RATIO;
}

/**
 * Highest amount the wallet can cover for a given order total:
 * `min(balance, total × cap)`, never negative. `cap` is the server's `wallet_cap`
 * (share of total, e.g. 0.4), defaulting to WALLET_DEFAULT_RATIO before the first
 * `/wallet/validate` response. Inputs are store-currency major units (TRY);
 * non-finite inputs collapse to 0.
 */
export function walletCeiling(
  balance: number,
  total: number,
  cap: number = WALLET_DEFAULT_RATIO,
): number {
  const safeBalance = Number.isFinite(balance) ? Math.max(0, balance) : 0;
  const ceiling = (Number.isFinite(total) ? Math.max(0, total) : 0) * safeCap(cap);
  return round2(Math.min(safeBalance, ceiling));
}

/**
 * Clamp a requested wallet amount into `[0, walletCeiling(balance, total, cap)]`.
 * Front-end live preview only; the backend re-clamps authoritatively when the
 * order is created. Non-finite / non-positive requests collapse to 0.
 */
export function clampWalletAmount(
  requested: number,
  balance: number,
  total: number,
  cap: number = WALLET_DEFAULT_RATIO,
): number {
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  return round2(Math.min(requested, walletCeiling(balance, total, cap)));
}

/**
 * Front-end XOR + auth backstop mirrored into the submit path: the wallet debit
 * only ever leaves the browser for a logged-in customer with no active promo
 * (owner rule §10 — wallet and promo are mutually exclusive). The BFF enforces
 * the same XOR as the last line of defence; this keeps the payload honest.
 */
export function effectiveWalletAmount(opts: {
  loggedIn: boolean;
  promoActive: boolean;
  applied: number;
}): number {
  if (!opts.loggedIn || opts.promoActive) return 0;
  return Number.isFinite(opts.applied) && opts.applied > 0 ? opts.applied : 0;
}

/**
 * Known machine-readable checkout error codes (BFF StorefrontError.code) that
 * have localized en/tr messages. Anything else falls back to the server text.
 */
const CHECKOUT_ERROR_CODES = new Set([
  'wallet_promo_conflict',
  'wallet_requires_auth',
  'wallet_unavailable',
  'token_revoked',
  'account_deactivated',
]);

/** i18n key for a known checkout error code, or null → use the server text. */
export function checkoutErrorKey(code: unknown): string | null {
  return typeof code === 'string' && CHECKOUT_ERROR_CODES.has(code)
    ? `checkout.errors.${code}`
    : null;
}
