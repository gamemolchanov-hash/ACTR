/**
 * iyzico return flow (22.09.2026) — pure helpers shared by the callback route
 * handler and its tests.
 *
 * iyzico sends the buyer's browser to `callbackUrl` on OUR domain (owner's
 * rule: every iyzico-facing URL lives on american-creator.tr) with the session
 * `token`. The route hands the token to ARM (`POST /payment/iyzico/callback`,
 * which re-reads the result from iyzico) and redirects the buyer by the answer.
 */

export type IyzicoCallbackStatus =
  | 'paid'
  | 'already_paid'
  | 'cancelled_refunded'
  | 'failed'
  | 'pending'
  | 'not_found'
  | 'error';

export const IYZICO_LOCALES = ['en', 'tr'] as const;
export type IyzicoLocale = (typeof IYZICO_LOCALES)[number];

/** Locale of the redirect target: the NEXT_LOCALE cookie, else the site default `tr`. */
export function localeFromCookie(value: string | undefined | null): IyzicoLocale {
  return value === 'en' ? 'en' : 'tr';
}

/** Checkout Form tokens are UUID-like; anything else is not forwarded to ARM. */
export function isPlausibleToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && /^[\w-]{8,128}$/.test(token.trim());
}

/**
 * Where the buyer lands. A paid / pending / already-paid order → the success
 * page (it reads the order and shows its payment state); a declined card → the
 * checkout with `?payment=declined` (the draft + pending-order marker are
 * still there, so the buyer simply pays again — no second order); anything we
 * could not verify → the checkout with `?payment=error`.
 */
export function redirectPathFor(
  status: IyzicoCallbackStatus,
  orderId: string | null,
  locale: IyzicoLocale,
): string {
  switch (status) {
    case 'paid':
    case 'already_paid':
    case 'pending':
    case 'cancelled_refunded':
      return orderId
        ? `/${locale}/checkout/success?order=${encodeURIComponent(orderId)}`
        : `/${locale}/checkout/success`;
    case 'failed':
      return `/${locale}/checkout?payment=declined`;
    default:
      return `/${locale}/checkout?payment=error`;
  }
}

/** Message key for the `?payment=` verdict the callback route sends the buyer back with. */
export function iyzicoReturnErrorKey(verdict: string | null | undefined): string | null {
  if (verdict === 'declined') return 'checkout.errors.paymentDeclined';
  if (verdict === 'error') return 'checkout.errors.paymentReturnError';
  return null;
}

/**
 * Public origin for the callback's 303. Behind Caddy/cloudflared the standalone
 * server sees its own bind address (`req.nextUrl.origin` = `https://0.0.0.0:3003`,
 * stage 22.09.2026), so the site URL baked at build time wins, then the proxy's
 * forwarded host/proto, and the request origin only as the last resort.
 */
export function publicOrigin(headers: Headers, requestOrigin: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\//.test(site)) return site;
  const host = headers.get('x-forwarded-host') || headers.get('host');
  if (host && !/^(0\.0\.0\.0|127\.0\.0\.1|localhost)(:|$)/.test(host)) {
    const proto = headers.get('x-forwarded-proto') || 'https';
    return `${proto}://${host}`;
  }
  return requestOrigin;
}
