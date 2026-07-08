/**
 * FBG-232 — единый контракт ARM (пути + заголовки) закреплён здесь, чтобы
 * клиентский (api.ts) и серверный (server-api.ts) пути не дрейфовали. Дрейф этих
 * литералов уже давал протухшие тесты (ad0028e) — этот файл его ловит.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  ENDPOINTS,
  ARM_STOREFRONT_BASE_PATH,
  LOCALE_TO_BCP47,
  currencyHeader,
  productLangParam,
  storefrontCurrency,
  tenantHeader,
  tenantId,
} from './arm-contract';

describe('ARM contract — endpoint paths (single source of truth)', () => {
  it('exposes the ARM storefront paths used by both transport layers', () => {
    expect(ENDPOINTS.products).toBe('/products');
    expect(ENDPOINTS.product('198')).toBe('/products/198');
    expect(ENDPOINTS.categories).toBe('/categories');
    expect(ENDPOINTS.config).toBe('/config');
    expect(ENDPOINTS.cartValidate).toBe('/cart/validate');
    expect(ENDPOINTS.promoValidate).toBe('/promo/validate');
    expect(ENDPOINTS.shippingRates).toBe('/shipping/rates');
    expect(ENDPOINTS.orders).toBe('/orders');
    expect(ENDPOINTS.order('o1')).toBe('/orders/o1');
    expect(ENDPOINTS.paymentCreateSession).toBe('/payment/create-session');
  });

  it('exposes every ARM auth path (client uses these exclusively)', () => {
    expect(ENDPOINTS.auth.register).toBe('/auth/register');
    expect(ENDPOINTS.auth.login).toBe('/auth/login');
    expect(ENDPOINTS.auth.forgotPassword).toBe('/auth/forgot-password');
    expect(ENDPOINTS.auth.resetPassword).toBe('/auth/reset-password');
    expect(ENDPOINTS.auth.me).toBe('/auth/me');
    expect(ENDPOINTS.auth.addresses).toBe('/auth/me/addresses');
    expect(ENDPOINTS.auth.address('a1')).toBe('/auth/me/addresses/a1');
    expect(ENDPOINTS.auth.orders).toBe('/auth/me/orders');
    expect(ENDPOINTS.auth.order('n1')).toBe('/auth/me/orders/n1');
    expect(ENDPOINTS.auth.profile).toBe('/auth/me/profile');
    expect(ENDPOINTS.auth.changePassword).toBe('/auth/me/change-password');
    expect(ENDPOINTS.auth.export).toBe('/auth/me/export');
    expect(ENDPOINTS.auth.deleteAccount).toBe('/auth/me/delete-account');
  });

  it('leaves segment encoding to the caller (client raw, server encodeURIComponent)', () => {
    // The client sends known ids as-is; the server wraps them in encodeURIComponent.
    // Same builder → both transport layers produce identical paths for the same input.
    expect(ENDPOINTS.product('a/b c')).toBe('/products/a/b c');
    expect(ENDPOINTS.product(encodeURIComponent('a/b c'))).toBe('/products/a%2Fb%20c');
  });

  it('pins the ARM storefront mount base (shared by server-api / proxy / config)', () => {
    expect(ARM_STOREFRONT_BASE_PATH).toBe('/public/arm/storefront');
  });
});

describe('ARM contract — headers (client + server share one builder)', () => {
  const ORIG_CURRENCY = process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY;
  const ORIG_TENANT = process.env.NEXT_PUBLIC_TENANT_ID;

  afterEach(() => {
    if (ORIG_CURRENCY === undefined) delete process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY;
    else process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY = ORIG_CURRENCY;
    if (ORIG_TENANT === undefined) delete process.env.NEXT_PUBLIC_TENANT_ID;
    else process.env.NEXT_PUBLIC_TENANT_ID = ORIG_TENANT;
  });

  it('X-Currency defaults to TRY (TR market) when the env var is unset', () => {
    delete process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY;
    expect(storefrontCurrency()).toBe('TRY');
    expect(currencyHeader()).toEqual({ 'X-Currency': 'TRY' });
  });

  it('X-Currency honours the NEXT_PUBLIC_STOREFRONT_CURRENCY override (read at call time)', () => {
    process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY = 'EUR';
    expect(currencyHeader()).toEqual({ 'X-Currency': 'EUR' });
  });

  it('X-Tenant-ID reads NEXT_PUBLIC_TENANT_ID and falls back to a shared default', () => {
    delete process.env.NEXT_PUBLIC_TENANT_ID;
    expect(tenantHeader()).toEqual({ 'X-Tenant-ID': tenantId() });
    expect(tenantId()).toBeTruthy();

    process.env.NEXT_PUBLIC_TENANT_ID = 'tenant_x';
    expect(tenantHeader()).toEqual({ 'X-Tenant-ID': 'tenant_x' });
  });
});

describe('ARM contract — product ?lang param (FBG-258, single source of truth)', () => {
  it('maps short locales to the full BCP-47 codes the BFF validates', () => {
    // BFF regex /^[a-z]{2}-[A-Z]{2}$/ — short en/tr must never leak through.
    expect(LOCALE_TO_BCP47.en).toBe('en-US');
    expect(LOCALE_TO_BCP47.tr).toBe('tr-TR');
  });

  it('returns tr-TR for the Turkish locale (requests the translation)', () => {
    expect(productLangParam('tr')).toBe('tr-TR');
  });

  it('returns undefined for English → no ?lang param, base EN content', () => {
    expect(productLangParam('en')).toBeUndefined();
  });

  it('returns undefined when locale is omitted (locale-agnostic client fetch)', () => {
    expect(productLangParam()).toBeUndefined();
    expect(productLangParam(undefined)).toBeUndefined();
  });

  it('falls back to undefined (base EN) for an unknown locale', () => {
    expect(productLangParam('de')).toBeUndefined();
  });
});
