/**
 * Единый контракт ARM storefront API (FBG-232).
 *
 * Единственный источник правды для:
 *   - путей эндпоинтов ARM (`/public/arm/storefront/*`);
 *   - валюты витрины (X-Currency, дефолт TRY) и построения tenant-заголовка.
 *
 * Переиспользуется ОБОИМИ транспортными путями, чтобы контракт не дрейфовал
 * (дрейф этих литералов уже давал протухшие тесты — ad0028e):
 *   - клиентский `api.ts`      (axios → Next-прокси `/api/storefront`);
 *   - серверный  `server-api.ts` (fetch напрямую в BFF);
 *   - прокси-роут `/api/storefront/[...path]` и `storefront-config.ts` — база + tenant.
 *
 * БЕЗОПАСНОСТЬ: модуль импортируется КЛИЕНТСКИМ бандлом (через api.ts), поэтому
 * здесь НЕТ доступа к `ARM_STOREFRONT_KEY` — ключ инжектится строго server-side
 * (route-handler, server-api.ts, storefront-config.ts) и не должен попадать в бандл.
 */

/** База маунта ARM storefront на BFF (`${BFF_INTERNAL_URL}${ARM_STOREFRONT_BASE_PATH}`). */
export const ARM_STOREFRONT_BASE_PATH = '/public/arm/storefront';

/** ARM tenant id — дефолт совпадает с серверными путями (proxy / server-api / config). */
const DEFAULT_TENANT_ID = 'demo-tenant';

/** Активный tenant id. `NEXT_PUBLIC_TENANT_ID` — публичный env, доступен и на клиенте. */
export function tenantId(): string {
  return process.env.NEXT_PUBLIC_TENANT_ID || DEFAULT_TENANT_ID;
}

/** `{ 'X-Tenant-ID': <tenant> }` — tenant-заголовок для ARM-запросов. */
export function tenantHeader(): Record<string, string> {
  return { 'X-Tenant-ID': tenantId() };
}

/**
 * Валюта витрины (X-Currency). TR-рынок: дефолт TRY — обязан совпадать со слоем
 * отображения (money.ts / seo.ts). USD здесь ломал cart/validate (product_not_found)
 * для TRY-товаров — дефолт не менять. Читается в момент вызова (не при инициализации).
 */
export function storefrontCurrency(): string {
  return process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';
}

/** `{ 'X-Currency': <currency> }` — заголовок для ARM catalog/checkout эндпоинтов. */
export function currencyHeader(): Record<string, string> {
  return { 'X-Currency': storefrontCurrency() };
}

/**
 * Пути эндпоинтов ARM storefront (относительно базы: `/api/storefront` через
 * клиентский прокси, `${BFF}${ARM_STOREFRONT_BASE_PATH}` — server-side).
 * Единственное место, где живут эти литералы: и клиент, и сервер строят URL отсюда.
 *
 * Параметризованные пути НЕ кодируют сегмент — это ответственность вызывающего
 * (клиент шлёт известные id как есть; сервер оборачивает в `encodeURIComponent`).
 */
export const ENDPOINTS = {
  products: '/products',
  product: (idOrSlug: string) => `/products/${idOrSlug}`,
  categories: '/categories',
  config: '/config',
  cartValidate: '/cart/validate',
  promoValidate: '/promo/validate',
  shippingRates: '/shipping/rates',
  orders: '/orders',
  order: (id: string) => `/orders/${id}`,
  paymentCreateSession: '/payment/create-session',
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    me: '/auth/me',
    addresses: '/auth/me/addresses',
    address: (id: string) => `/auth/me/addresses/${id}`,
    orders: '/auth/me/orders',
    order: (id: string) => `/auth/me/orders/${id}`,
    profile: '/auth/me/profile',
    changePassword: '/auth/me/change-password',
    export: '/auth/me/export',
    deleteAccount: '/auth/me/delete-account',
  },
} as const;
