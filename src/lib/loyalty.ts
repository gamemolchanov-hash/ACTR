/**
 * Creator Club V1 — loyalty account helpers (FBG-384).
 *
 * Powers the storefront loyalty page: tier thresholds (from `/config`), the
 * cashback-wallet + XP ledger (from `/auth/me/wallet/history` and
 * `/auth/me/loyalty/history`) and the pure tier-progress math.
 *
 * The contract spec lives in the AutoCRM/ACTR vault (§10), NOT in this clone, so
 * every ARM field is parsed defensively (numbers may arrive as strings; optional
 * fields may be absent) exactly like the FBG-385 wallet adapter. Nothing here is
 * a source of truth — the BFF owns balances/XP; these helpers only shape the view.
 *
 * INVARIANT: the FBG storefront (points_discount program) never exposes these
 * endpoints; callers must treat a 404/empty response as "no data", never a crash.
 */
import { api } from './api';
import { bearerHeader, type XpExpiringSoon } from './auth';
import { ENDPOINTS, currencyHeader } from './arm-contract';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A Creator Club tier as configured by the backend (`/config`). */
export interface LoyaltyTier {
  code: string;
  name: string;
  /** Σ active-XP threshold to reach this tier. */
  min_xp: number;
  /** Cashback rate for this tier (fraction, e.g. 0.05). Optional. */
  cashback_rate?: number;
}

/**
 * The one program code that switches Creator Club UI on. Every Creator Club
 * surface (the /rewards page, the account page entry, the header/footer links)
 * is gated on it — the live storefront runs `points_discount` until the owner
 * launches the programme, and an unlaunched programme must stay invisible.
 */
export const CASHBACK_WALLET_PROGRAM = 'cashback_wallet';

/** Progress of the member toward the next tier. */
export interface TierProgress {
  current: LoyaltyTier | null;
  next: LoyaltyTier | null;
  /** 0..100 completion toward `next` (100 when already at the top tier). */
  percent: number;
  /** XP remaining to reach `next`, or null at the top tier / with no config. */
  xpToNext: number | null;
}

/** How one tier reads for the viewer (drives the lock / check / "you are here"). */
export type TierState = 'preview' | 'locked' | 'unlocked' | 'current';

/** One tier's slice of the segmented progress bar (FBG-469). */
export interface TierSegment {
  tier: LoyaltyTier;
  state: TierState;
  /** 0..100 fill of THIS tier's own segment (100 once the next tier is reached). */
  fillPercent: number;
}

/** One merged ledger row (a wallet money movement OR a loyalty XP movement). */
export interface LoyaltyLedgerEntry {
  id: string;
  kind: 'wallet' | 'loyalty';
  /** ISO timestamp (may be empty when the BFF omits it — sorts to the bottom). */
  date: string;
  /** Human label from the BFF, or null → the page shows a per-kind fallback. */
  description: string | null;
  /** Signed amount: money (currency) for wallet, XP for loyalty. */
  amount: number;
  /** Currency for wallet entries (store currency); undefined for loyalty XP. */
  currency?: string;
  /** XP row status (loyalty rows only): active | expired | revoked. */
  status?: string;
}

/** A page of merged ledger entries plus the paginator's page count. */
export interface LedgerPage {
  entries: LoyaltyLedgerEntry[];
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Defensive coercion (BFF numeric fields may be strings)
// ---------------------------------------------------------------------------

/**
 * Coerce an ARM numeric field (may be a string) to a finite number, or null when
 * it is absent/unparseable. Keeps "0" (a meaningful backend answer for rates and
 * caps) apart from "no value" — collapsing the two advertises terms the backend
 * never sent (FBG-469 review).
 */
function toFiniteNum(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

/** Coerce an ARM numeric field (may be a string) to a finite number; else 0. */
function toNum(v: unknown): number {
  return toFiniteNum(v) ?? 0;
}

/** Epoch millis for sorting; unparseable/empty dates sink to the bottom. */
function ts(date: string): number {
  const t = Date.parse(date);
  return Number.isFinite(t) ? t : 0;
}

// ---------------------------------------------------------------------------
// Pure adapters + logic (unit-tested — no network)
// ---------------------------------------------------------------------------

/**
 * Map a raw `/config` tier to `LoyaltyTier`, or null when it lacks the fields
 * the progress bar needs (code/name/finite min_xp). Nulls are filtered out.
 */
export function adaptTier(raw: unknown): LoyaltyTier | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const code = r.code != null ? String(r.code) : '';
  const minXp = typeof r.min_xp === 'string' ? parseFloat(r.min_xp) : (r.min_xp as number);
  if (!code || !Number.isFinite(minXp)) return null;
  // BFF tiers carry no display name (only code/min_xp/cashback_rate per
  // openapi.yaml LoyaltyProgramPublic) — derive a label from the code.
  const name = r.name != null ? String(r.name) : code.charAt(0).toUpperCase() + code.slice(1);
  const tier: LoyaltyTier = { code, name, min_xp: minXp };
  // A configured 0 means "this tier earns nothing" and must survive; only an
  // absent or unparseable rate is dropped (→ the UI shows no rate at all).
  const rate = toFiniteNum(r.cashback_rate);
  if (rate != null) tier.cashback_rate = rate;
  return tier;
}

/** Map a raw wallet-history row to a ledger entry. */
export function adaptWalletEntry(raw: unknown, idx = 0): LoyaltyLedgerEntry {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: r.id != null ? String(r.id) : `w-${idx}`,
    kind: 'wallet',
    // BFF sends Directus rows verbatim: the timestamp is `date_created` and the
    // human label is `note` (openapi.yaml WalletLedgerEntry).
    date: String(r.date_created ?? r.created_at ?? r.date ?? ''),
    description: r.note != null ? String(r.note) : null,
    amount: toNum(r.amount),
    currency: r.currency != null ? String(r.currency) : undefined,
  };
}

/** Map a raw loyalty-history row to a ledger entry (amount = XP delta). */
export function adaptLoyaltyEntry(raw: unknown, idx = 0): LoyaltyLedgerEntry {
  const r = (raw ?? {}) as Record<string, unknown>;
  // XP delta may be under `xp`, `points` or `amount` depending on the BFF build.
  const xp = r.amount ?? r.xp ?? r.points;
  return {
    id: r.id != null ? String(r.id) : `l-${idx}`,
    kind: 'loyalty',
    date: String(r.date_created ?? r.created_at ?? r.date ?? ''),
    description: null,
    amount: toNum(xp),
    // Lapsed/clawed-back grants must not render as live credits (XpLedgerEntry
    // status: active | expired | revoked).
    status: r.status != null ? String(r.status) : undefined,
  };
}

/** Merge ledger entries newest-first (stable for equal/empty dates). */
export function mergeLedger(entries: LoyaltyLedgerEntry[]): LoyaltyLedgerEntry[] {
  return [...entries].sort((a, b) => ts(b.date) - ts(a.date));
}

/** Σ active-XP, clamped to a usable number (BFF may omit it / send junk). */
function safeXp(xpActive: number): number {
  return Number.isFinite(xpActive) ? Math.max(0, xpActive) : 0;
}

/** Configured tiers, lowest threshold first (junk thresholds dropped). */
function sortTiers(tiers: LoyaltyTier[]): LoyaltyTier[] {
  return [...tiers].filter((t) => Number.isFinite(t.min_xp)).sort((a, b) => a.min_xp - b.min_xp);
}

/**
 * Index of the member's current tier in `sorted`: pinned by `currentCode` (from
 * /me `tier_code`) when it matches a configured code, else the highest tier
 * whose threshold the member has reached (never below the first tier).
 */
function resolveCurrentIndex(xp: number, sorted: LoyaltyTier[], currentCode?: string): number {
  const pinned = currentCode ? sorted.findIndex((t) => t.code === currentCode) : -1;
  if (pinned !== -1) return pinned;
  let idx = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (xp >= sorted[i].min_xp) idx = i;
  }
  return idx;
}

/**
 * Normalise an ARM rate to percent: the spec sends a fraction (0.05 → 5), but a
 * percent (5) is tolerated too. Returns null only for an absent or nonsensical
 * rate (junk/negative) so callers hide the badge; a configured 0 comes back as 0,
 * because "this tier earns nothing" is a real answer and hiding it would imply an
 * unknown-but-nonzero rate (FBG-469 review).
 *
 * The BFF allows ANY finite fraction, so the fractional part is kept: rounding
 * 0.035 to "4%" would advertise financial terms the backend never granted. Only
 * the binary-floating-point tail is trimmed (0.035 × 100 = 3.5000000000000004),
 * at two decimals — a hundredth of a percent is below the granularity the ARM
 * admin exposes. Callers format the number for display with the storefront
 * format locale (3,5 in tr-TR / 3.5 in en-US).
 */
export function ratePercent(rate?: number | null): number | null {
  if (rate == null || !Number.isFinite(rate) || rate < 0) return null;
  const percent = rate <= 1 ? rate * 100 : rate;
  return Math.round(percent * 100) / 100;
}

/**
 * Render a percent from `ratePercent()` for display: no rounding beyond what the
 * backend granted, separators from the storefront format locale (D1/D3 — "3,5"
 * in tr-TR, "3.5" in en-US). Percent values reach i18n messages pre-formatted,
 * exactly like the XP figures.
 */
export function formatPercent(percent: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(percent);
}

/**
 * Shape the `/me` `xp_expiring_soon` descriptor for the burn badge: XP amount
 * (may arrive as a string) plus whole days left, never negative. Returns null
 * when nothing is expiring, so callers simply skip the badge.
 */
export function expiringSoon(
  raw?: XpExpiringSoon | null,
  now: number = Date.now(),
): { xp: number; days: number } | null {
  const xp = raw ? toNum(raw.amount) : 0;
  if (xp <= 0) return null;
  const expiresAt = raw?.expires_at ? Date.parse(raw.expires_at) : Number.NaN;
  const days = Number.isFinite(expiresAt)
    ? Math.max(0, Math.ceil((expiresAt - now) / 86_400_000))
    : 0;
  return { xp, days };
}

/**
 * Split the configured tiers into the segments of the Creator Club progress bar
 * (FBG-469). Purely derived from `/config` — the number of tiers, their names and
 * their thresholds all come from the backend, so a 2- or 4-tier programme renders
 * without a code change.
 *
 * `xpActive === null` means "no member in context" (guest): every segment is a
 * `preview` with no fill, so the public page teases the tiers without implying
 * the visitor has failed to unlock them.
 */
export function tierSegments(
  xpActive: number | null,
  tiers: LoyaltyTier[],
  currentCode?: string,
): TierSegment[] {
  const sorted = sortTiers(tiers);
  if (sorted.length === 0) return [];

  if (xpActive === null) {
    return sorted.map((tier) => ({ tier, state: 'preview' as const, fillPercent: 0 }));
  }

  const xp = safeXp(xpActive);
  const currentIdx = resolveCurrentIndex(xp, sorted, currentCode);

  return sorted.map((tier, i) => {
    const nextMin = sorted[i + 1]?.min_xp;
    let fillPercent: number;
    if (nextMin == null) {
      // Top tier: no upper bound to fill against — full once reached.
      fillPercent = xp >= tier.min_xp ? 100 : 0;
    } else {
      const span = nextMin - tier.min_xp;
      fillPercent =
        span > 0
          ? Math.min(100, Math.max(0, ((xp - tier.min_xp) / span) * 100))
          : xp >= nextMin
            ? 100
            : 0;
    }
    const state: TierState = i < currentIdx ? 'unlocked' : i === currentIdx ? 'current' : 'locked';
    return { tier, state, fillPercent };
  });
}

/**
 * Compute tier progress from Σ active-XP and the configured tiers.
 *
 * `currentCode` (from /me `tier_code`) pins the current tier when it matches a
 * configured code; otherwise the current tier is the highest whose `min_xp` the
 * member has reached. With no usable config this returns all-null so the caller
 * hides the progress bar rather than rendering a bogus one.
 */
export function tierProgress(
  xpActive: number,
  tiers: LoyaltyTier[],
  currentCode?: string,
): TierProgress {
  const xp = safeXp(xpActive);
  const sorted = sortTiers(tiers);

  if (sorted.length === 0) return { current: null, next: null, percent: 0, xpToNext: null };

  const currentIdx = resolveCurrentIndex(xp, sorted, currentCode);

  const current = sorted[currentIdx] ?? null;
  const next = sorted[currentIdx + 1] ?? null;
  if (!next) return { current, next: null, percent: 100, xpToNext: null };

  const base = current?.min_xp ?? 0;
  const span = next.min_xp - base;
  const percent = span > 0 ? Math.min(100, Math.max(0, ((xp - base) / span) * 100)) : 0;
  const xpToNext = Math.max(0, Math.ceil(next.min_xp - xp));
  return { current, next, percent, xpToNext };
}

// ---------------------------------------------------------------------------
// API calls (network — thin wrappers over the proxied ARM endpoints)
// ---------------------------------------------------------------------------

/** Program + tiers from `/config` — the descriptor lives under `loyalty_program`. */
export interface LoyaltyConfig {
  /** 'cashback_wallet' | 'points_discount' | 'none' | '' (unknown). */
  program: string;
  tiers: LoyaltyTier[];
  /**
   * Share of an order the wallet may cover at checkout — a fraction in [0, 1]
   * (e.g. 0.4), or null when the BFF omits it (the copy then drops the percent
   * rather than inventing one). A configured **0 is preserved**: it means wallet
   * spending is switched off, which the page must say out loud instead of
   * degrading to the vague "covers part of the order" line (FBG-469 review).
   * The authoritative per-order cap still comes from /wallet/validate (FBG-438);
   * this is the advertised headline only.
   */
  walletCap: number | null;
}

/**
 * Fetch the Creator Club descriptor from `/config` (defensive, never throws on
 * shape). The BFF key is `loyalty_program` (openapi.yaml LoyaltyProgramPublic);
 * tiers are present only for cashback_wallet storefronts. Callers gate ALL
 * Creator Club UI on `program === 'cashback_wallet'` — the program is dormant
 * on the live storefront until the owner flips it.
 */
export async function fetchLoyaltyConfig(): Promise<LoyaltyConfig> {
  const { data } = await api.get(ENDPOINTS.config, { headers: currencyHeader() });
  const cfg = data?.data ?? data ?? {};
  const descriptor = cfg?.loyalty_program ?? {};
  const rawTiers = Array.isArray(descriptor?.tiers) ? descriptor.tiers : [];
  // `wallet_cap` is a fraction in [0, 1] (BFF `fraction` validator). 0 is valid
  // ("no wallet spending"); only an absent, unparseable or out-of-range value
  // means "unknown".
  const cap = toFiniteNum(descriptor?.wallet_cap);
  return {
    program: descriptor?.program != null ? String(descriptor.program) : '',
    tiers: rawTiers
      .map(adaptTier)
      .filter((t: LoyaltyTier | null): t is LoyaltyTier => t !== null),
    walletCap: cap != null && cap >= 0 && cap <= 1 ? cap : null,
  };
}

async function fetchHistory(
  endpoint: string,
  adapt: (raw: unknown, idx: number) => LoyaltyLedgerEntry,
  page: number,
  limit: number,
): Promise<LedgerPage> {
  const { data } = await api.get(endpoint, {
    headers: { ...bearerHeader(), ...currencyHeader() },
    params: { page, limit },
  });
  const rows = Array.isArray(data?.data) ? data.data : [];
  return {
    entries: rows.map(adapt),
    totalPages: Number(data?.meta?.totalPages) || 1,
  };
}

/**
 * Fetch one page of the merged loyalty ledger (wallet + XP), newest-first.
 *
 * Each source is fetched independently: if only one endpoint is available the
 * page still renders that half (partial data beats a crash). It throws only
 * when BOTH sources fail, so the page can show its error state; a genuinely
 * empty ledger resolves to `{ entries: [], totalPages: 1 }`.
 *
 * Cross-source ordering is per-page (each source paginates on its own), which is
 * acceptable for a V1 activity feed with no unified ledger endpoint.
 */
export async function fetchLoyaltyLedger(page = 1, limit = 10): Promise<LedgerPage> {
  const [wallet, loyalty] = await Promise.allSettled([
    fetchHistory(ENDPOINTS.auth.walletHistory, adaptWalletEntry, page, limit),
    fetchHistory(ENDPOINTS.auth.loyaltyHistory, adaptLoyaltyEntry, page, limit),
  ]);

  if (wallet.status === 'rejected' && loyalty.status === 'rejected') {
    throw wallet.reason;
  }

  const entries: LoyaltyLedgerEntry[] = [];
  let totalPages = 1;
  for (const res of [wallet, loyalty]) {
    if (res.status === 'fulfilled') {
      entries.push(...res.value.entries);
      totalPages = Math.max(totalPages, res.value.totalPages);
    }
  }
  return { entries: mergeLedger(entries), totalPages };
}
