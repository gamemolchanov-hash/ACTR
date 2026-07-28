/**
 * KVKK consent core (FBG-395) — the versioned, TTL-bounded consent record and
 * the default-deny gate, plus the consent-gated NEXT_LOCALE writer.
 *
 * These are the pure predicates the banner/provider build on, tested directly
 * (no React mount) per the project's checkout-consent pattern.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BANNER_VERSION,
  POLICY_VERSION,
  CONSENT_TTL_MS,
  CONSENT_STORAGE_KEY,
  buildConsentRecord,
  parseConsent,
  isConsentCurrent,
  canRun,
  readStoredConsent,
  writeStoredConsent,
  persistLocalePreference,
  clearLocalePreference,
  type ConsentRecord,
} from './consent';

const NOW = 1_800_000_000_000; // fixed ms epoch for deterministic TTL math

function record(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  return {
    status: 'custom',
    categories: { necessary: true, functional: true, analytics: false, marketing: false },
    timestamp: NOW,
    bannerVersion: BANNER_VERSION,
    policyVersion: POLICY_VERSION,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
});
afterEach(() => {
  localStorage.clear();
  document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
});

describe('parseConsent', () => {
  it('round-trips a valid record', () => {
    const r = record();
    expect(parseConsent(JSON.stringify(r))).toEqual(r);
  });

  it('rejects null, junk and non-objects', () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent('not json')).toBeNull();
    expect(parseConsent('42')).toBeNull();
    expect(parseConsent('null')).toBeNull();
  });

  it('rejects records with a missing/invalid shape', () => {
    expect(parseConsent(JSON.stringify({ ...record(), categories: undefined }))).toBeNull();
    // necessary must be literally true — a tampered `false` is rejected
    expect(
      parseConsent(JSON.stringify({ ...record(), categories: { necessary: false, functional: true, analytics: false, marketing: false } })),
    ).toBeNull();
    expect(parseConsent(JSON.stringify({ ...record(), timestamp: 'soon' }))).toBeNull();
    expect(parseConsent(JSON.stringify({ ...record(), status: 'bogus' }))).toBeNull();
  });
});

describe('isConsentCurrent', () => {
  it('accepts a fresh record on the live versions', () => {
    expect(isConsentCurrent(record(), NOW)).toBe(true);
  });

  it('re-prompts after the 12-month TTL', () => {
    expect(isConsentCurrent(record({ timestamp: NOW - CONSENT_TTL_MS - 1 }), NOW)).toBe(false);
    expect(isConsentCurrent(record({ timestamp: NOW - CONSENT_TTL_MS + 1 }), NOW)).toBe(true);
  });

  it('re-prompts on a banner or policy version change', () => {
    expect(isConsentCurrent(record({ bannerVersion: BANNER_VERSION + 1 }), NOW)).toBe(false);
    expect(isConsentCurrent(record({ policyVersion: 'KK-KVKK-GCP-2025-V1' }), NOW)).toBe(false);
  });

  it('rejects a future timestamp (clock skew / tampering)', () => {
    expect(isConsentCurrent(record({ timestamp: NOW + 10_000 }), NOW)).toBe(false);
  });
});

describe('canRun — default-deny gate', () => {
  it('always allows necessary, even with no record', () => {
    expect(canRun('necessary', null, NOW)).toBe(true);
  });

  it('denies every optional category without a current record', () => {
    expect(canRun('functional', null, NOW)).toBe(false);
    expect(canRun('analytics', null, NOW)).toBe(false);
    expect(canRun('marketing', null, NOW)).toBe(false);
  });

  it('denies optional categories from an expired record', () => {
    const stale = record({
      categories: { necessary: true, functional: true, analytics: true, marketing: true },
      timestamp: NOW - CONSENT_TTL_MS - 1,
    });
    expect(canRun('analytics', stale, NOW)).toBe(false);
  });

  it('allows only the granted optional categories of a current record', () => {
    const r = record({
      categories: { necessary: true, functional: true, analytics: false, marketing: false },
    });
    expect(canRun('functional', r, NOW)).toBe(true);
    expect(canRun('analytics', r, NOW)).toBe(false);
  });
});

describe('readStoredConsent / writeStoredConsent', () => {
  it('reads back a written current record', () => {
    writeStoredConsent(record());
    expect(readStoredConsent(NOW)).toEqual(record());
  });

  it('drops a stale (expired) record so the banner re-prompts', () => {
    writeStoredConsent(record({ timestamp: NOW - CONSENT_TTL_MS - 1 }));
    expect(readStoredConsent(NOW)).toBeNull();
  });

  it('drops a version-mismatched record', () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify(record({ policyVersion: 'OLD-V1' })),
    );
    expect(readStoredConsent(NOW)).toBeNull();
  });
});

describe('persistLocalePreference — consent-gated NEXT_LOCALE writer', () => {
  it('does NOT write NEXT_LOCALE without functional consent', () => {
    persistLocalePreference('tr', NOW);
    expect(document.cookie).not.toContain('NEXT_LOCALE=');
  });

  it('does NOT write when consent grants everything BUT functional', () => {
    writeStoredConsent(
      buildConsentRecord('custom', { functional: false, analytics: true, marketing: true }, NOW),
    );
    persistLocalePreference('en', NOW);
    expect(document.cookie).not.toContain('NEXT_LOCALE=');
  });

  it('writes NEXT_LOCALE once functional consent is granted', () => {
    writeStoredConsent(
      buildConsentRecord('custom', { functional: true, analytics: false, marketing: false }, NOW),
    );
    persistLocalePreference('tr', NOW);
    expect(document.cookie).toContain('NEXT_LOCALE=tr');
  });

  it('ignores an unknown locale (cookie-injection guard)', () => {
    writeStoredConsent(
      buildConsentRecord('custom', { functional: true, analytics: false, marketing: false }, NOW),
    );
    persistLocalePreference('tr;evil=1', NOW);
    persistLocalePreference('de', NOW);
    expect(document.cookie).not.toContain('NEXT_LOCALE=');
  });

  it('clearLocalePreference removes an existing NEXT_LOCALE cookie', () => {
    document.cookie = 'NEXT_LOCALE=tr;path=/';
    expect(document.cookie).toContain('NEXT_LOCALE=tr');
    clearLocalePreference();
    expect(document.cookie).not.toContain('NEXT_LOCALE=');
  });
});
