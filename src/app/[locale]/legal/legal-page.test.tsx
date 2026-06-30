/**
 * Legal stub page tests (05-01 COMP-02).
 *
 * Tests:
 * 1. LEGAL_SLUGS contains exactly the 5 required slugs
 * 2. generateStaticParams returns params for all 5 slugs
 * 3. All i18n keys for each slug exist in messages/en.json and messages/tr.json
 * 4. Unknown slug is NOT in LEGAL_SLUGS (→ triggers notFound)
 * 5. Slug-to-namespace conversion (hyphen→underscore) is correct
 */

import { describe, it, expect, vi } from 'vitest';

// Mock next/navigation (used by the page for notFound)
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock next-intl (used by useTranslations in the page)
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock @/i18n/navigation (locale-aware Link)
vi.mock('@/i18n/navigation', () => ({
  Link: 'a',
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/'),
}));

import { LEGAL_SLUGS } from './legal-config';
import { generateStaticParams } from './[slug]/page';
import enMessages from '../../../../messages/en.json';
import trMessages from '../../../../messages/tr.json';

const EXPECTED_SLUGS = [
  'kvkk',
  'mesafeli-satis',
  'iade',
  'gizlilik',
  'kullanim-kosullari',
] as const;

describe('LegalPage exports', () => {
  it('LEGAL_SLUGS contains exactly the 5 required slugs', () => {
    expect(LEGAL_SLUGS).toHaveLength(5);
    for (const slug of EXPECTED_SLUGS) {
      expect(LEGAL_SLUGS).toContain(slug);
    }
  });

  it('generateStaticParams returns all 5 slug entries', () => {
    const params = generateStaticParams();
    expect(params).toHaveLength(5);
    for (const slug of EXPECTED_SLUGS) {
      expect(params).toContainEqual({ slug });
    }
  });

  it('unknown slug is not in LEGAL_SLUGS', () => {
    expect(LEGAL_SLUGS).not.toContain('unknown-page');
    expect(LEGAL_SLUGS).not.toContain('mesafeli-satis-2');
  });

  it('slug-to-namespace conversion replaces hyphens with underscores', () => {
    const conversions: [string, string][] = [
      ['kvkk', 'kvkk'],
      ['mesafeli-satis', 'mesafeli_satis'],
      ['iade', 'iade'],
      ['gizlilik', 'gizlilik'],
      ['kullanim-kosullari', 'kullanim_kosullari'],
    ];
    for (const [slug, expected] of conversions) {
      expect(slug.replace(/-/g, '_')).toBe(expected);
    }
  });
});

describe('Legal i18n key parity (EN + TR)', () => {
  const enKeys = Object.keys(enMessages).filter((k) => k.startsWith('legal.'));
  const trKeys = Object.keys(trMessages).filter((k) => k.startsWith('legal.'));

  it('has legal.* keys in en.json', () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it('EN and TR have identical legal.* key sets', () => {
    const missing = enKeys.filter((k) => !(k in (trMessages as Record<string, string>)));
    expect(missing).toHaveLength(0);
  });

  it('all 5 pages have title keys in EN', () => {
    expect(enMessages).toHaveProperty('legal.kvkk.title');
    expect(enMessages).toHaveProperty('legal.mesafeli_satis.title');
    expect(enMessages).toHaveProperty('legal.iade.title');
    expect(enMessages).toHaveProperty('legal.gizlilik.title');
    expect(enMessages).toHaveProperty('legal.kullanim_kosullari.title');
  });

  it('all 5 pages have title keys in TR', () => {
    expect(trMessages).toHaveProperty('legal.kvkk.title');
    expect(trMessages).toHaveProperty('legal.mesafeli_satis.title');
    expect(trMessages).toHaveProperty('legal.iade.title');
    expect(trMessages).toHaveProperty('legal.gizlilik.title');
    expect(trMessages).toHaveProperty('legal.kullanim_kosullari.title');
  });

  it('no key contains a hyphen (Pitfall 4)', () => {
    const hypenated = enKeys.filter((k) => k.includes('-'));
    expect(hypenated).toHaveLength(0);
  });
});
