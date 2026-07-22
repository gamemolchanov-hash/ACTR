/**
 * Storefront sitemap.xml route.
 *
 * I18N-04 (04-05): each entry now uses localizedEntry() which emits the
 * canonical URL (the site default locale) plus alternates.languages for both
 * /en/ and /tr/, giving search engines hreflang signals for every
 * catalog/category/product page.
 *
 * FBG-425: the default locale is now TR (Turkish market), so the canonical <loc>
 * and the explicit hreflang="x-default" both point at the /tr/ variant — the two
 * signals stay in lock-step (no canonical=EN vs x-default=TR mismatch).
 *
 * Failure handling (FBG-67): during the production build the BFF may be
 * unreachable — degrade to static URLs and let the first runtime revalidation
 * fill in the catalog. At runtime, rethrow so Next serves the last good ISR
 * version instead of caching a truncated sitemap.
 */
import type { MetadataRoute } from 'next';
import { fetchAllProductsServer, fetchCategoriesServer } from '@/lib/server-api';
import { SITE_URL } from '@/lib/seo';
import { routing } from '@/i18n/routing';

// Regenerate the sitemap at most hourly (catalog changes are not time-critical).
export const revalidate = 3600;

// Public, indexable pages with no dynamic segment (path relative to SITE_URL).
const STATIC_PATHS = [
  '/',
  '/catalog',
  '/delivery',
  '/faq',
  '/contacts',
];

/**
 * Build a sitemap entry for a path that is available in all supported locales.
 * Canonical URL = the site default locale (TR, FBG-425); alternates.languages
 * lists every locale plus an explicit x-default that mirrors the canonical.
 *
 * Pattern 10 from 04-PATTERNS.md (I18N-04, D-07).
 *
 * T-04-12: URLs are built from routing.locales + SITE_URL (not user input).
 */
function localeUrl(locale: string, path: string): string {
  // Root path '/' → /${locale}, all others → /${locale}${path}
  return path === '/' ? `${SITE_URL}/${locale}` : `${SITE_URL}/${locale}${path}`;
}

function localizedEntry(
  path: string,
  opts?: {
    priority?: number;
    changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
    lastModified?: Date;
  },
): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = localeUrl(locale, path);
  }
  // Canonical = the site default locale (TR); x-default mirrors it so both SEO
  // signals name the same variant (FBG-425).
  const canonical = localeUrl(routing.defaultLocale, path);
  languages['x-default'] = canonical;
  return {
    url: canonical,
    ...(opts?.changeFrequency ? { changeFrequency: opts.changeFrequency } : {}),
    ...(opts?.priority !== undefined ? { priority: opts.priority } : {}),
    ...(opts?.lastModified ? { lastModified: opts.lastModified } : {}),
    alternates: { languages },
  };
}

function staticEntries(): MetadataRoute.Sitemap {
  return STATIC_PATHS.map((path) => localizedEntry(path, {
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.5,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products;
  let categories;
  try {
    [products, categories] = await Promise.all([fetchAllProductsServer(), fetchCategoriesServer()]);
  } catch (err) {
    // During the production build the BFF may be unreachable — ship the static
    // URLs now and let the first runtime revalidation fill in the catalog, so
    // the build never hard-depends on a live BFF.
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return staticEntries();
    }
    // At runtime, refuse to publish a sitemap missing every product/category:
    // re-throw so Next serves the last good (ISR) version instead of caching a
    // truncated one for `revalidate` seconds (FBG-67 review).
    throw err;
  }

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) =>
    localizedEntry(`/catalog/${category.slug}`, {
      changeFrequency: 'daily',
      priority: 0.7,
    }),
  );

  const productEntries: MetadataRoute.Sitemap = products.map((product) => {
    const categorySlug = product.category?.slug ?? 'all';
    const productSlug = product.slug ?? product.id;
    return localizedEntry(`/catalog/${categorySlug}/${productSlug}`, {
      lastModified: product.date_created ? new Date(product.date_created) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  return [...staticEntries(), ...categoryEntries, ...productEntries];
}
