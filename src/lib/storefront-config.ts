import 'server-only';

/**
 * Server-only helper to resolve the active storefront display currency
 * from BFF `/public/arm/storefront/config` (`config.currency`).
 *
 * Mirrors the injection logic in `src/app/api/storefront/[...path]/route.ts`
 * (X-Tenant-ID + X-Storefront-Key, server-side only). This module MUST NOT
 * be imported by client components — `import 'server-only'` above enforces
 * that at build time.
 *
 * Fallback chain (never throws): config.currency → NEXT_PUBLIC_STOREFRONT_CURRENCY → 'TRY'.
 */

const BFF = (process.env.BFF_INTERNAL_URL || 'http://localhost:4000').replace(/\/+$/, '');
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'demo-tenant';
const STOREFRONT_KEY = process.env.ARM_STOREFRONT_KEY || '';

export async function getStorefrontCurrency(): Promise<string> {
  try {
    const headers: Record<string, string> = { 'X-Tenant-ID': TENANT_ID };
    if (STOREFRONT_KEY) headers['X-Storefront-Key'] = STOREFRONT_KEY;

    const res = await fetch(`${BFF}/public/arm/storefront/config`, {
      headers,
      next: { revalidate: 300 },
    });

    const data = await res.json();
    return (
      data?.data?.currency ?? data?.currency ?? process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY ?? 'TRY'
    );
  } catch {
    return process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';
  }
}
