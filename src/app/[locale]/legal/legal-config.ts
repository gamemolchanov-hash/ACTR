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
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

/**
 * Number of s1..sN sections for each slug. `gizlilik` and `kargo-teslimat`
 * render a full Markdown document instead of sections (see their *-content.ts),
 * so they have none.
 */
export const SECTION_COUNT: Record<LegalSlug, number> = {
  'kvkk': 4,
  'mesafeli-satis': 3,
  'iade': 3,
  'gizlilik': 0,
  'kullanim-kosullari': 2,
  'kargo-teslimat': 0,
};
