import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ProductDetail } from '@/components/ProductDetail';
import { fetchProductServer } from '@/lib/server-api';
import { buildProductMetadata, buildProductJsonLd, jsonLdScript } from '@/lib/seo';

interface ProductPageProps {
  // Next 15: dynamic route params are async (awaited before use).
  params: Promise<{ locale: string; slug: string; productSlug: string }>;
}

// Server-rendered SEO metadata: title, description, canonical, OG/Twitter cards
// from a real BFF lookup (FBG-67). Without this, crawlers only saw the static
// layout meta — no product name or price — since rendering is client-side.
//
// Failure handling (FBG-67 review): a genuine 404 → notFound() (proper 404, no
// soft-404). A transient BFF failure makes fetchProductServer throw, which
// surfaces as a 5xx — we must NEVER emit `noindex` on a live product, since
// Google treats noindex as "drop" while it retries 5xx.
//
// I18N-04 (04-05): locale threaded to fetchProductServer (?lang for BFF) and
// buildProductMetadata (hreflang alternates, OG locale, locale-aware canonical).
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale, productSlug } = await params;
  setRequestLocale(locale);
  // I18N-03: pass locale so BFF returns localized product name/description (?lang=<bcp47>)
  const product = await fetchProductServer(productSlug, locale);
  if (!product) notFound();
  // I18N-04: pass locale for hreflang alternates + OG locale
  return buildProductMetadata(product, locale);
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, productSlug } = await params;
  setRequestLocale(locale);
  // Same lookup as generateMetadata — Next dedupes identical fetches per request.
  // Used only to embed Product JSON-LD in the initial HTML; the visible product
  // is still rendered client-side by <ProductDetail> via React Query.
  // I18N-03: pass locale so JSON-LD contains localized product content
  const product = await fetchProductServer(productSlug, locale);
  if (!product) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- JSON-LD, not HTML: jsonLdScript escapes '<' so '</script>' can't break out (tested in seo.test.ts); DOMPurify would corrupt the JSON.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(buildProductJsonLd(product)) }}
      />
      <Suspense>
        <ProductDetail productId={productSlug} />
      </Suspense>
    </>
  );
}
