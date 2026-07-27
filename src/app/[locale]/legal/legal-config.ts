/**
 * Shared legal page configuration — exported separately so Next.js Page
 * constraints (only valid exports: generateStaticParams, generateMetadata,
 * default) are not violated.
 */

export const LEGAL_SLUGS = [
  'kvkk',
  'mesafeli-satis',
  'iade',
  'gizlilik',
  'kargo-teslimat',
  'ticari-elektronik-ileti',
  'uyelik-sozlesmesi',
  'acik-riza',
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

/**
 * Number of s1..sN sections for each slug. `kvkk`, `mesafeli-satis`, `gizlilik`,
 * `kargo-teslimat`, `iade`, `ticari-elektronik-ileti`, `uyelik-sozlesmesi` and
 * `acik-riza` render a full Markdown document instead of sections (see their
 * *-content.ts), so they have none.
 */
export const SECTION_COUNT: Record<LegalSlug, number> = {
  'kvkk': 0,
  'mesafeli-satis': 0,
  'iade': 0,
  'gizlilik': 0,
  'kargo-teslimat': 0,
  'ticari-elektronik-ileti': 0,
  'uyelik-sozlesmesi': 0,
  'acik-riza': 0,
};
