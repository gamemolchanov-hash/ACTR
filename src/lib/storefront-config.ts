import 'server-only';

/**
 * Server-only helper to resolve the active storefront config
 * from BFF `/public/arm/storefront/config` (`config.currency`, `config.country`,
 * `config.locale`).
 *
 * Mirrors the injection logic in `src/app/api/storefront/[...path]/route.ts`
 * (X-Tenant-ID + X-Storefront-Key, server-side only). This module MUST NOT
 * be imported by client components — `import 'server-only'` above enforces
 * that at build time.
 *
 * Fallback chain (never throws): config.currency → NEXT_PUBLIC_STOREFRONT_CURRENCY → 'TRY'.
 * `country`/`locale` fall back to `null` when absent — callers (e.g.
 * `formatLocaleFromCountry`) apply their own defaulting.
 */

import { ENDPOINTS, ARM_STOREFRONT_BASE_PATH, tenantId } from './arm-contract';

export type StorefrontConfig = {
  currency: string;
  country: string | null;
  locale: string | null;
};

const BFF = (process.env.BFF_INTERNAL_URL || 'http://localhost:4000').replace(/\/+$/, '');
const STOREFRONT_KEY = process.env.ARM_STOREFRONT_KEY || '';

export async function getStorefrontConfig(): Promise<StorefrontConfig> {
  try {
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId() };
    if (STOREFRONT_KEY) headers['X-Storefront-Key'] = STOREFRONT_KEY;

    const res = await fetch(`${BFF}${ARM_STOREFRONT_BASE_PATH}${ENDPOINTS.config}`, {
      headers,
      next: { revalidate: 300 },
    });

    const data = await res.json();
    return {
      currency:
        data?.data?.currency ??
        data?.currency ??
        process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY ??
        'TRY',
      country: data?.data?.country ?? data?.country ?? null,
      locale: data?.data?.locale ?? data?.locale ?? null,
    };
  } catch {
    return {
      currency: process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY',
      country: null,
      locale: null,
    };
  }
}

/** @deprecated Use `getStorefrontConfig()` — kept for backwards-compat call sites. */
export async function getStorefrontCurrency(): Promise<string> {
  return (await getStorefrontConfig()).currency;
}
