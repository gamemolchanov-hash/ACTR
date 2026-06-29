import type { MetadataRoute } from 'next';
import { fetchAllProductsServer, fetchCategoriesServer } from '@/lib/server-api';
import { SITE_URL, productCanonicalUrl } from '@/lib/seo';

// Regenerate the sitemap at most hourly (catalog changes are not time-critical).
export const revalidate = 3600;

// Public, indexable pages with no dynamic segment.
const STATIC_PATHS = [
  '/',
  '/catalog',
  '/delivery',
  '/faq',
  '/contacts',
  '/partners',
  '/partners/shops',
  '/partners/bloggers',
  '/partners/schools',
  '/studios',
];

function staticEntries(): MetadataRoute.Sitemap {
  return STATIC_PATHS.map((path) => ({
    url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
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

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/catalog/${category.slug}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: productCanonicalUrl(product),
    lastModified: product.date_created ? new Date(product.date_created) : undefined,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticEntries(), ...categoryEntries, ...productEntries];
}
