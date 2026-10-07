/**
 * Creator Club landing (/rewards) — the public programme projection the page
 * renders, parsed defensively on the server from `/config.loyalty_program`
 * (port of the ACRU/ACSTORE landing, FBG-501/513).
 *
 * The programme rules live in the BFF (lib/loyalty): tiers, thresholds, cashback
 * rates, wallet cap, XP window/lifetime and category discounts all come from the
 * storefront answer — nothing here is a source of truth. ARM numeric fields may
 * arrive as strings, so every field is coerced; an absent or junk value becomes
 * `null` and the page drops that figure instead of inventing one.
 */
import { adaptTier, type LoyaltyTier } from './loyalty';

/** Member price on selected categories, per tier (FBG-600). */
export interface RewardsCategoryDiscounts {
  /** Ids of the discounted categories (never empty). */
  categoryIds: string[];
  /** Discount fraction 0..1 per tier code. */
  rates: Record<string, number>;
}

/** What the /rewards landing needs — a plain object, safe to pass to a client component. */
export interface RewardsProgram {
  /** 'cashback_wallet' | 'points_discount' | 'none' | '' (unknown). */
  program: string;
  /** Configured tiers, lowest threshold first. */
  tiers: LoyaltyTier[];
  /** Share of an order the wallet may cover (0..1); 0 = spending off; null = unknown. */
  walletCap: number | null;
  /** Rolling window (days) the tier is qualified over, or null when not sent. */
  windowDays: number | null;
  /** Lifetime (days) of an XP grant, or null when not sent. */
  xpTtlDays: number | null;
  /** Category member prices, or null while the mechanic is off. */
  categoryDiscounts: RewardsCategoryDiscounts | null;
}

function finite(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function positiveDays(v: unknown): number | null {
  const n = finite(v);
  return n != null && n > 0 ? Math.round(n) : null;
}

function parseCategoryDiscounts(raw: unknown): RewardsCategoryDiscounts | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const categoryIds = (Array.isArray(r.category_ids) ? r.category_ids : [])
    .filter((id): id is string | number => typeof id === 'string' || typeof id === 'number')
    .map(String)
    .filter(Boolean);
  if (categoryIds.length === 0) return null;
  const rates: Record<string, number> = {};
  if (r.rates && typeof r.rates === 'object') {
    for (const [code, value] of Object.entries(r.rates as Record<string, unknown>)) {
      const rate = finite(value);
      if (rate != null && rate >= 0) rates[code] = rate;
    }
  }
  return { categoryIds, rates };
}

/** Normalise `/config.loyalty_program` into the landing's view model. */
export function parseRewardsProgram(raw: Record<string, unknown> | null | undefined): RewardsProgram {
  const r = raw ?? {};
  const tiers = (Array.isArray(r.tiers) ? r.tiers : [])
    .map(adaptTier)
    .filter((t): t is LoyaltyTier => t !== null)
    .sort((a, b) => a.min_xp - b.min_xp);
  const cap = finite(r.wallet_cap);
  return {
    program: r.program != null ? String(r.program) : '',
    tiers,
    walletCap: cap != null && cap >= 0 && cap <= 1 ? cap : null,
    windowDays: positiveDays(r.window_days),
    xpTtlDays: positiveDays(r.xp_ttl_days),
    categoryDiscounts: parseCategoryDiscounts(r.category_discounts),
  };
}
