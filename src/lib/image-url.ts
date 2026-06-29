/**
 * Build preview image URLs for product images.
 * Previews are generated lazily on first request and cached in MinIO.
 */

export function previewUrl(filePath: string, rule: string): string {
  return `/product-images/p/${rule}/${filePath}`;
}

export const imgDetail = (fp: string) => previewUrl(fp, 'detail');
export const imgThumb = (fp: string) => previewUrl(fp, 'thumb');
export const imgCard = (fp: string) => previewUrl(fp, 'card');
export const imgCart = (fp: string) => previewUrl(fp, 'cart');
export const imgCartSm = (fp: string) => previewUrl(fp, 'cart_sm');
