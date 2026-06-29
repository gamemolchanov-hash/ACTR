/**
 * BOGO promo feature module — storefront side.
 *
 * Removable as a unit. See ./README.md.
 */

export { PromoBanner } from './PromoBanner';
export { PromoBadge } from './PromoBadge';
export { PromoPlashka } from './PromoPlashka';
export { useAutoPromo, type AutoPromoData } from './useAutoPromo';
export { isPromoActiveNow, CTA_HREF as PROMO_CTA_HREF } from './config';
