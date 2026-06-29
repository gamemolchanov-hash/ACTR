/**
 * BOGO promo feature — storefront-side config.
 *
 * Dates control banner/badge visibility (Europe/Moscow). The BFF independently
 * checks dates against the oms_promo_codes row, so this client config is
 * purely a UX guard (avoids showing banner if promo is deactivated server-side).
 *
 * See ./README.md for removal instructions.
 */

// Promo window — Europe/Moscow timezone. Dates are inclusive.
export const PROMO_FROM_ISO = '2026-05-25T00:00:00+03:00';
export const PROMO_TO_ISO = '2026-05-31T23:59:59+03:00';

// Banner image dimensions (intrinsic, for CLS prevention).
export const BANNER_DESKTOP_SRC = '/promo-bogo/banner-desktop.png';
export const BANNER_DESKTOP_WIDTH = 1200;
export const BANNER_DESKTOP_HEIGHT = 150;

export const BANNER_MOBILE_SRC = '/promo-bogo/banner-mobile.png';
export const BANNER_MOBILE_WIDTH = 1280;
export const BANNER_MOBILE_HEIGHT = 190;

// Mobile breakpoint matches MUI default `sm` (600px).
export const MOBILE_MEDIA = '(max-width: 599.95px)';

// CTA destination.
export const CTA_HREF = '/catalog/color_gel';

// Badge text on product cards.
export const BADGE_LABEL = '1+1';

export const PROMO_BANNER_ALT =
  '1+1: второй в подарок — на Color gels и Disguise collection, до 31 мая';

export function isPromoActiveNow(now: Date = new Date()): boolean {
  const from = new Date(PROMO_FROM_ISO);
  const to = new Date(PROMO_TO_ISO);
  return now >= from && now <= to;
}
