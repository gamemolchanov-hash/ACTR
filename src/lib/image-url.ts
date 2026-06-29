/**
 * Build product image URLs (ARM, Phase 1).
 *
 * ARM отдаёт WebP-варианты по ширине через `/public/arm/storefront/images/:tenantId/*?w=`
 * (публичный эндпоинт). Идём через тот же Next-прокси `/api/storefront/*`.
 * Прежняя OMS-схема `/product-images/p/{rule}/{fp}` убрана.
 */

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'demo-tenant';

const RULE_WIDTH: Record<string, number> = {
  detail: 800,
  card: 400,
  thumb: 200,
  cart: 160,
  cart_sm: 96,
};

export function previewUrl(filePath: string, rule: string): string {
  const w = RULE_WIDTH[rule] ?? 400;
  return `/api/storefront/images/${TENANT_ID}/${filePath}?w=${w}`;
}

export const imgDetail = (fp: string) => previewUrl(fp, 'detail');
export const imgThumb = (fp: string) => previewUrl(fp, 'thumb');
export const imgCard = (fp: string) => previewUrl(fp, 'card');
export const imgCart = (fp: string) => previewUrl(fp, 'cart');
export const imgCartSm = (fp: string) => previewUrl(fp, 'cart_sm');
