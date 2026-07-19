/**
 * Creator Club V2 — wallet (cashback) client-side helpers (FBG-385).
 *
 * The backend is the source of truth for the debited amount (`/wallet/validate`
 * previews it, order-create re-clamps it). These helpers only drive the live
 * checkout UX so the widget never lets the user request more than the rules
 * allow before the round-trip lands.
 */

/**
 * Owner rule (docs/loyalty-creator-club.md §10): a wallet may cover at most 40%
 * of the order total. Kept as a named constant so UI and tests agree on the cap.
 */
export const WALLET_MAX_RATIO = 0.4;

/** Round to 2 decimals (kuruş) — kills FP dust in the previewed amount. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Highest amount the wallet can cover for a given order total:
 * `min(balance, total × 40%)`, never negative. Inputs are store-currency major
 * units (TRY). Non-finite inputs collapse to 0.
 */
export function walletCeiling(balance: number, total: number): number {
  const safeBalance = Number.isFinite(balance) ? Math.max(0, balance) : 0;
  const cap = (Number.isFinite(total) ? Math.max(0, total) : 0) * WALLET_MAX_RATIO;
  return round2(Math.min(safeBalance, cap));
}

/**
 * Clamp a requested wallet amount into `[0, walletCeiling(balance, total)]`.
 * Front-end live preview only; the backend re-clamps authoritatively when the
 * order is created. Non-finite / non-positive requests collapse to 0.
 */
export function clampWalletAmount(requested: number, balance: number, total: number): number {
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  return round2(Math.min(requested, walletCeiling(balance, total)));
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
