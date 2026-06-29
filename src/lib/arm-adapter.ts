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
    active_promo: null, // OMS BOGO у ARM нет
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
      quantity: it.quantity,
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
 * Maps ARM PromoValidation response to the vitrine's PromoValidationResult shape.
 * Normalises discount_type to 'percent' | 'fixed' where applicable.
 */
export function armToPromoResult(p: ArmPromoValidation): PromoValidationResult {
  let discountType: 'percent' | 'fixed' | undefined;
  if (p.discount_type === 'percent' || p.discount_type === 'percentage') {
    discountType = 'percent';
  } else if (p.discount_type === 'fixed' || p.discount_type === 'amount') {
    discountType = 'fixed';
  }
  return {
    valid: p.valid,
    code: p.code,
    discount_type: discountType,
    discount_value: p.discount_value,
    discount_amount: p.discount_amount,
    description: p.description ?? null,
    error: p.error,
  };
}
