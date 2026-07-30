import 'server-only';

/**
 * Server-only helpers over BFF `/public/arm/storefront/config`.
 *
 * Mirrors the injection logic in `src/app/api/storefront/[...path]/route.ts`
 * (X-Tenant-ID + X-Storefront-Key, server-side only). This module MUST NOT
 * be imported by client components — `import 'server-only'` above enforces
 * that at build time.
 *
 * TWO readers, deliberately separate (FBG-469 review):
 *
 *  - `getStorefrontConfig()` — display settings (currency/country/locale) for
 *    every page. Cached for 5 minutes: it runs in the locale layout of every
 *    route, and a stale currency label is harmless (it changes with a deploy).
 *
 *  - `getLoyaltyProgram()` — the Creator Club launch state. Read with
 *    `cache: 'no-store'`, because it GATES a route: with the 5-minute data cache
 *    a switched-off programme stayed reachable (and linked) for up to 5 minutes,
 *    and a launch was delayed by the same window. Only ever call it from a
 *    `force-dynamic` segment, otherwise it opts that route out of static
 *    rendering.
 *
 * Neither throws. Because of that the results carry `available`, so a caller can
 * tell a real storefront answer from a local fallback: display defaults are
 * harmless, gating decisions are not (an error is "unknown", never "off").
 */

import { ENDPOINTS, ARM_STOREFRONT_BASE_PATH, tenantId } from './arm-contract';

export type StorefrontConfig = {
  currency: string;
  country: string | null;
  locale: string | null;
  /**
   * `true` when `/config` actually answered (2xx + a readable body); `false`
   * when the request failed, so every field above is a local fallback rather
   * than a storefront answer.
   */
  available: boolean;
};

/** Creator Club launch state as of RIGHT NOW (no data cache). */
export type LoyaltyProgramState = {
  /** Programme code from `config.loyalty_program.program`, or null when absent. */
  program: string | null;
  /** `false` → the request failed: the programme is unknown, NOT switched off. */
  available: boolean;
};

const BFF = (process.env.BFF_INTERNAL_URL || 'http://localhost:4000').replace(/\/+$/, '');
const STOREFRONT_KEY = process.env.ARM_STOREFRONT_KEY || '';

/** `/config` body as the BFF sends it — fields may be nested under `data`. */
interface RawConfig {
  currency?: string;
  country?: string | null;
  locale?: string | null;
  loyalty_program?: { program?: string | null } | null;
  data?: RawConfig;
}

/**
 * GET `/config` with the server-side headers and the caller's cache policy.
 * Returns the parsed body, or null when the storefront did not answer with one
 * (transport error, non-2xx, unreadable body).
 */
async function readConfig(
  cacheInit: RequestInit & { next?: { revalidate?: number } },
): Promise<RawConfig | null> {
  try {
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId() };
    if (STOREFRONT_KEY) headers['X-Storefront-Key'] = STOREFRONT_KEY;

    const res = await fetch(`${BFF}${ARM_STOREFRONT_BASE_PATH}${ENDPOINTS.config}`, {
      headers,
      ...cacheInit,
    });

    // A 5xx/404 body is not a storefront answer — surface it as "unavailable"
    // instead of letting the `??` chains below turn it into plausible defaults.
    if (!res.ok) return null;

    const data = await res.json();
    return data && typeof data === 'object' ? (data as RawConfig) : null;
  } catch {
    return null;
  }
}

export async function getStorefrontConfig(): Promise<StorefrontConfig> {
  const data = await readConfig({ next: { revalidate: 300 } });

  if (!data) {
    return {
      currency: process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY',
      country: null,
      locale: null,
      available: false,
    };
  }

  return {
    currency:
      data?.data?.currency ?? data?.currency ?? process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY ?? 'TRY',
    country: data?.data?.country ?? data?.country ?? null,
    locale: data?.data?.locale ?? data?.locale ?? null,
    available: true,
  };
}

/**
 * Creator Club launch state, read fresh on every call (`cache: 'no-store'`).
 *
 * The storefront must open and close the programme the moment the owner flips it
 * in ARM, so this read carries NO TTL — see the module header.
 */
export async function getLoyaltyProgram(): Promise<LoyaltyProgramState> {
  const data = await readConfig({ cache: 'no-store' });
  if (!data) return { program: null, available: false };

  const program = data?.data?.loyalty_program?.program ?? data?.loyalty_program?.program;
  return { program: program != null ? String(program) : null, available: true };
}

/** @deprecated Use `getStorefrontConfig()` — kept for backwards-compat call sites. */
export async function getStorefrontCurrency(): Promise<string> {
  return (await getStorefrontConfig()).currency;
}
