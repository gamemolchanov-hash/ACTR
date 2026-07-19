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
import { bearerHeader } from './auth';
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

/** Progress of the member toward the next tier. */
export interface TierProgress {
  current: LoyaltyTier | null;
  next: LoyaltyTier | null;
  /** 0..100 completion toward `next` (100 when already at the top tier). */
  percent: number;
  /** XP remaining to reach `next`, or null at the top tier / with no config. */
  xpToNext: number | null;
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
}

/** A page of merged ledger entries plus the paginator's page count. */
export interface LedgerPage {
  entries: LoyaltyLedgerEntry[];
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Defensive coercion (BFF numeric fields may be strings)
// ---------------------------------------------------------------------------

/** Coerce an ARM numeric field (may be a string) to a finite number; else 0. */
function toNum(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
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
  const name = r.name != null ? String(r.name) : '';
  const minXp = typeof r.min_xp === 'string' ? parseFloat(r.min_xp) : (r.min_xp as number);
  if (!code || !name || !Number.isFinite(minXp)) return null;
  const tier: LoyaltyTier = { code, name, min_xp: minXp };
  if (r.cashback_rate != null) tier.cashback_rate = toNum(r.cashback_rate);
  return tier;
}

/** Map a raw wallet-history row to a ledger entry. */
export function adaptWalletEntry(raw: unknown, idx = 0): LoyaltyLedgerEntry {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: r.id != null ? String(r.id) : `w-${idx}`,
    kind: 'wallet',
    date: String(r.created_at ?? r.date ?? ''),
    description: r.description != null ? String(r.description) : null,
    amount: toNum(r.amount),
    currency: r.currency != null ? String(r.currency) : undefined,
  };
}

/** Map a raw loyalty-history row to a ledger entry (amount = XP delta). */
export function adaptLoyaltyEntry(raw: unknown, idx = 0): LoyaltyLedgerEntry {
  const r = (raw ?? {}) as Record<string, unknown>;
  // XP delta may be under `xp`, `points` or `amount` depending on the BFF build.
  const xp = r.xp ?? r.points ?? r.amount;
  return {
    id: r.id != null ? String(r.id) : `l-${idx}`,
    kind: 'loyalty',
    date: String(r.created_at ?? r.date ?? ''),
    description: r.description != null ? String(r.description) : null,
    amount: toNum(xp),
  };
}

/** Merge ledger entries newest-first (stable for equal/empty dates). */
export function mergeLedger(entries: LoyaltyLedgerEntry[]): LoyaltyLedgerEntry[] {
  return [...entries].sort((a, b) => ts(b.date) - ts(a.date));
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
  const xp = Number.isFinite(xpActive) ? Math.max(0, xpActive) : 0;
  const sorted = [...tiers]
    .filter((t) => Number.isFinite(t.min_xp))
    .sort((a, b) => a.min_xp - b.min_xp);

  if (sorted.length === 0) return { current: null, next: null, percent: 0, xpToNext: null };

  let currentIdx = currentCode ? sorted.findIndex((t) => t.code === currentCode) : -1;
  if (currentIdx === -1) {
    // Highest tier the member has actually reached (fallback: the first tier).
    currentIdx = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (xp >= sorted[i].min_xp) currentIdx = i;
    }
  }

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

/** Fetch the configured Creator Club tiers from `/config` (defensive, never throws shape). */
export async function fetchLoyaltyConfig(): Promise<LoyaltyTier[]> {
  const { data } = await api.get(ENDPOINTS.config, { headers: currencyHeader() });
  const loyalty = data?.data?.loyalty ?? data?.loyalty ?? {};
  const rawTiers = Array.isArray(loyalty?.tiers) ? loyalty.tiers : [];
  return rawTiers
    .map(adaptTier)
    .filter((t: LoyaltyTier | null): t is LoyaltyTier => t !== null);
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
