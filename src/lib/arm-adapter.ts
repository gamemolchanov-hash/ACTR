/**
 * Адаптер ARM → типы компонентов AC.
 *
 * Компоненты витрины (ProductCard, ProductDetail, CatalogView…) написаны под
 * плоский OMS-тип `Product`. ARM отдаёт distributor-product с вложенным мастер-товаром.
 * Здесь — единственная точка маппинга, чтобы компоненты не трогать.
 *
 * ВАЖНО: `Product.id` = `distributorProductId` (ARM `dp.id`) — именно его ждут
 * cart/order endpoints ARM (фазы 2+). Мастер-id товара отдельно не нужен витрине.
 */
import type { Product, Category, ProductImage, ValidatedCartItem, PromoValidationResult } from './api';
import type {
  ArmDistributorProduct,
  ArmProductImage,
  ArmCategory,
  ArmCartValidation,
  ArmPromoValidation,
} from './arm-types';

function adaptImages(imgs?: ArmProductImage[]): ProductImage[] | undefined {
  if (!imgs?.length) return undefined;
  return imgs.map((im, i) => ({
    id: im.id ?? String(i),
    file_path: im.file_path,
    sort: im.sort ?? i,
  }));
}

export function armToProduct(dp: ArmDistributorProduct): Product {
  const p = dp.product;
  return {
    id: dp.id, // distributorProductId
    name: p.name,
    sku: p.sku ?? dp.local_sku ?? '',
    slug: p.slug ?? null,
    description: p.description ?? null,
    detail_text: p.detail_text ?? p.description ?? null,
    usage_text: p.usage_text ?? null,
    application_text: p.application_text ?? null,
    badge: dp.badge ?? null,
    video_url: p.video_url ?? null,
    volume_ml: p.volume_ml ?? null,
    price: Number(dp.price),
    wholesale_price: dp.wholesale_price ?? null,
    weight: p.weight ?? null,
    volume: null,
    length: null,
    width: null,
    height: null,
    bp_available: dp.stock_available ?? null,
    category: p.category ?? dp.category ?? null,
    images: adaptImages(p.images),
    date_created: p.date_created ?? '',
    active_promo: null, // OMS BOGO promos are not supported in ARM
  };
}

export function armToCategory(c: ArmCategory): Category {
  return { id: c.id, name: c.name, slug: c.slug };
}

// ---------- Checkout adapters ----------

/**
 * Maps ARM CartValidation response to the vitrine's ValidatedCartItem[] shape.
 * `productId` = distributorProductId (the id cart/order endpoints expect).
 */
export function armToValidatedCart(v: ArmCartValidation): {
  items: ValidatedCartItem[];
  subtotal: number;
  allValid: boolean;
} {
  return {
    items: v.items.map((it) => ({
      productId: it.distributorProductId,
      valid: it.valid,
      name: it.name,
      sku: it.sku,
      unitPrice: it.unitPrice,
      // quantity is absent for product_not_found invalid items — default to 0
      quantity: it.quantity ?? 0,
      available: it.available,
      lineTotal: it.lineTotal,
      image: it.image ?? null,
      error: it.error ?? null,
    })),
    subtotal: v.subtotal,
    allValid: v.allValid,
  };
}

/**
 * Maps ARM PromoValidation response (discriminated union on `status`) to the
 * vitrine's PromoValidationResult shape.
 *
 * ARM contract (storefront-api.ts PromoValidateResult):
 *   { status: 'applied'; promo:{code,discount_type,discount_value,description}; discount_amount; free_shipping }
 *   | { status: 'invalid' | 'expired' | 'used_up' | 'not_yet_valid' | 'customer_limit' | 'min_order'; ... }
 */
export function armToPromoResult(p: ArmPromoValidation): PromoValidationResult {
  if (p.status !== 'applied') {
    const errorMap: Record<ArmPromoValidation['status'], string> = {
      applied: '',
      invalid: 'Promo code is not valid',
      not_yet_valid: 'Promo code is not yet active',
      expired: 'Promo code has expired',
      used_up: 'Promo code has been used up',
      customer_limit: 'Promo code usage limit reached',
      min_order: 'Order total does not meet the minimum for this promo',
    };
    return { valid: false, error: errorMap[p.status] || 'Promo code is not valid' };
  }

  let discountType: 'percent' | 'fixed' | undefined;
  const dt = p.promo.discount_type;
  if (dt === 'percent' || dt === 'percentage') {
    discountType = 'percent';
  } else if (dt === 'fixed' || dt === 'amount') {
    discountType = 'fixed';
  }

  return {
    valid: true,
    code: p.promo.code,
    discount_type: discountType,
    discount_value: p.promo.discount_value,
    discount_amount: p.discount_amount,
    description: p.promo.description,
  };
}
