/**
 * KVKK cookie-consent core (FBG-395).
 *
 * Pure, SSR-safe logic for the Tercih Merkezi / cookie banner: the consent
 * record shape, its versioning + 12-month TTL, and the default-deny gate that
 * every optional (non-`necessary`) script MUST consult before it runs. No React,
 * no MUI — so it can be unit-tested directly and imported from both server- and
 * client-side modules without crossing the RSC boundary.
 *
 * Also home to the single consent-gated writer of the `NEXT_LOCALE` cookie
 * (`persistLocalePreference` / `clearLocalePreference`). `NEXT_LOCALE` is a
 * *functional* cookie: it may only be written once the visitor has granted the
 * İşlevsel category, and must be removed the moment that grant is withdrawn.
 */

/** localStorage key holding the visitor's consent decision. */
export const CONSENT_STORAGE_KEY = 'actr_cookie_consent';

/**
 * Banner/CMP version. Bump this whenever a cookie provider or category is added
 * or the declared purposes change materially — a mismatch re-prompts the visitor
 * (KVKK: fresh consent on material change). See memory `cookie-consent-versioning`.
 */
export const BANNER_VERSION = 1;

/**
 * Version of the published "Gizlilik ve Çerez Politikası" this consent maps to
 * (doc code, shown on /legal/gizlilik). A newer policy re-prompts the visitor.
 */
export const POLICY_VERSION = 'KK-KVKK-GCP-2026-V3';

/** KVKK: consent is valid for 12 months, then the banner is shown again. */
export const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export type OptionalCategory = 'functional' | 'analytics' | 'marketing';
export type ConsentCategory = 'necessary' | OptionalCategory;

/** The three optional categories, in display order. */
export const OPTIONAL_CATEGORIES: readonly OptionalCategory[] = [
  'functional',
  'analytics',
  'marketing',
];

/** How the record was produced — kept for auditing/versioning. */
export type ConsentStatus = 'accepted_all' | 'rejected_all' | 'custom';

export interface ConsentCategories {
  /** Always granted — required for the site to function. */
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface OptionalSelection {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentRecord {
  status: ConsentStatus;
  categories: ConsentCategories;
  /** ms epoch of the decision (date + time). */
  timestamp: number;
  bannerVersion: number;
  policyVersion: string;
}

/** Optional categories all off — the KVKK default before any decision. */
export function defaultCategories(): ConsentCategories {
  return { necessary: true, functional: false, analytics: false, marketing: false };
}

function isCategories(value: unknown): value is ConsentCategories {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    c.necessary === true &&
    typeof c.functional === 'boolean' &&
    typeof c.analytics === 'boolean' &&
    typeof c.marketing === 'boolean'
  );
}

/** Parse a stored consent string; returns null on anything malformed. */
export function parseConsent(raw: string | null): ConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!isCategories(parsed.categories)) return null;
    if (typeof parsed.timestamp !== 'number' || !Number.isFinite(parsed.timestamp)) return null;
    if (typeof parsed.bannerVersion !== 'number') return null;
    if (typeof parsed.policyVersion !== 'string') return null;
    const status = parsed.status;
    if (status !== 'accepted_all' && status !== 'rejected_all' && status !== 'custom') return null;
    return {
      status,
      categories: parsed.categories,
      timestamp: parsed.timestamp,
      bannerVersion: parsed.bannerVersion,
      policyVersion: parsed.policyVersion,
    };
  } catch {
    return null;
  }
}

/**
 * A record is "current" when it matches the live banner + policy versions and is
 * within the 12-month TTL. Stale/expired/version-mismatched records re-prompt.
 */
export function isConsentCurrent(record: ConsentRecord | null, now: number): boolean {
  if (!record) return false;
  if (record.bannerVersion !== BANNER_VERSION) return false;
  if (record.policyVersion !== POLICY_VERSION) return false;
  // Guard against a future timestamp (clock skew / tampering) as well as expiry.
  if (now < record.timestamp) return false;
  if (now - record.timestamp > CONSENT_TTL_MS) return false;
  return true;
}

/**
 * The gate. `necessary` always runs; an optional category runs only when there is
 * a current consent record that grants it. Default-deny: null/invalid/expired →
 * false. Optional scripts MUST call this before executing or setting cookies.
 */
export function canRun(
  category: ConsentCategory,
  record: ConsentRecord | null,
  now: number,
): boolean {
  if (category === 'necessary') return true;
  if (!isConsentCurrent(record, now)) return false;
  return record!.categories[category] === true;
}

/** Build a stamped consent record for the current banner + policy version. */
export function buildConsentRecord(
  status: ConsentStatus,
  optional: OptionalSelection,
  now: number = Date.now(),
): ConsentRecord {
  return {
    status,
    categories: { necessary: true, ...optional },
    timestamp: now,
    bannerVersion: BANNER_VERSION,
    policyVersion: POLICY_VERSION,
  };
}

/**
 * Read the stored decision, returning it only when still current; stale/invalid
 * records yield null (→ banner re-prompt). SSR-safe: returns null without a window.
 */
export function readStoredConsent(now: number = Date.now()): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
  const record = parseConsent(raw);
  return isConsentCurrent(record, now) ? record : null;
}

/**
 * Persist the decision. Throws on storage failure so the caller can surface the
 * "kaydedilemedi" error toast and leave the banner up (nothing committed).
 */
export function writeStoredConsent(record: ConsentRecord): void {
  if (typeof window === 'undefined') {
    throw new Error('writeStoredConsent called without a window');
  }
  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
}

// ---------------------------------------------------------------------------
// NEXT_LOCALE — the only functional cookie in the current inventory.
//
// next-intl's own cookie sync (server middleware + client `syncLocaleCookie`) is
// neutralised (Set-Cookie stripped in middleware; locale switches routed around
// the sync), so this pair is the SOLE writer of NEXT_LOCALE. It is written only
// with İşlevsel consent and cleared the instant that consent is withdrawn.
// ---------------------------------------------------------------------------

const LOCALE_COOKIE = 'NEXT_LOCALE';
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const KNOWN_LOCALES = ['en', 'tr'];

/**
 * Write NEXT_LOCALE — but only when İşlevsel consent is currently granted, and
 * only for a known locale (guards against cookie injection from an unexpected
 * value). A no-op otherwise, so the locale keeps working from the URL without
 * being persisted.
 */
export function persistLocalePreference(locale: string, now: number = Date.now()): void {
  if (typeof document === 'undefined') return;
  if (!KNOWN_LOCALES.includes(locale)) return;
  if (!canRun('functional', readStoredConsent(now), now)) return;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};SameSite=Lax`;
}

/** Remove NEXT_LOCALE (used when İşlevsel consent is withdrawn). */
export function clearLocalePreference(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
}
