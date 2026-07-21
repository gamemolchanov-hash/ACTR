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
  'kullanim-kosullari',
  'kargo-teslimat',
  'ticari-elektronik-ileti',
  'uyelik-sozlesmesi',
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

/**
 * Number of s1..sN sections for each slug. `gizlilik`, `kargo-teslimat`,
 * `iade`, `ticari-elektronik-ileti` and `uyelik-sozlesmesi` render a full
 * Markdown document instead of sections (see their *-content.ts), so they have
 * none.
 */
export const SECTION_COUNT: Record<LegalSlug, number> = {
  'kvkk': 4,
  'mesafeli-satis': 3,
  'iade': 0,
  'gizlilik': 0,
  'kullanim-kosullari': 2,
  'kargo-teslimat': 0,
  'ticari-elektronik-ileti': 0,
  'uyelik-sozlesmesi': 0,
};
