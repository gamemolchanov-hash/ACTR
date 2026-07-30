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
  /**
   * Active loyalty programme code (`config.loyalty_program.program`), or null
   * when the BFF omits the descriptor. Read here rather than client-side so the
   * Creator Club links in the header/footer are decided during SSR — one already
   * cached `/config` call, no extra request and no link flashing in and out
   * (FBG-469). The programme is dormant (`points_discount`) on the live store.
   */
  loyaltyProgram: string | null;
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
    const program = data?.data?.loyalty_program?.program ?? data?.loyalty_program?.program;
    return {
      currency:
        data?.data?.currency ??
        data?.currency ??
        process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY ??
        'TRY',
      country: data?.data?.country ?? data?.country ?? null,
      locale: data?.data?.locale ?? data?.locale ?? null,
      loyaltyProgram: program != null ? String(program) : null,
    };
  } catch {
    return {
      currency: process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY',
      country: null,
      locale: null,
      loyaltyProgram: null,
    };
  }
}

/** @deprecated Use `getStorefrontConfig()` — kept for backwards-compat call sites. */
export async function getStorefrontCurrency(): Promise<string> {
  return (await getStorefrontConfig()).currency;
}
