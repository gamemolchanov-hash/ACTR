import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ProductDetail } from '@/components/ProductDetail';
import { fetchProductServer, fetchProductReviewAggregateServer } from '@/lib/server-api';
import { buildProductMetadata, buildProductJsonLd, jsonLdScript } from '@/lib/seo';

interface ProductPageProps {
  params: { locale: string; slug: string; productSlug: string };
}

// Server-rendered SEO metadata: title, description, canonical, OG/Twitter cards
// from a real BFF lookup (FBG-67). Without this, crawlers only saw the static
// layout meta — no product name or price — since rendering is client-side.
//
// Failure handling (FBG-67 review): a genuine 404 → notFound() (proper 404, no
// soft-404). A transient BFF failure makes fetchProductServer throw, which
// surfaces as a 5xx — we must NEVER emit `noindex` on a live product, since
// Google treats noindex as "drop" while it retries 5xx.
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  setRequestLocale(params.locale);
  const product = await fetchProductServer(params.productSlug);
  if (!product) notFound();
  return buildProductMetadata(product);
}

export default async function ProductPage({ params }: ProductPageProps) {
  setRequestLocale(params.locale);
  // Same lookup as generateMetadata — Next dedupes identical fetches per request.
  // Used only to embed Product JSON-LD in the initial HTML; the visible product
  // is still rendered client-side by <ProductDetail> via React Query.
  const product = await fetchProductServer(params.productSlug);
  if (!product) notFound();

  // Aggregate rating for the JSON-LD `aggregateRating` (star snippets, FBG-69).
  // Non-critical: resolves to null on any failure, leaving the page untouched.
  const reviews = await fetchProductReviewAggregateServer(product.id);

  return (
    <>
      <script
        type="application/ld+json"
        // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- JSON-LD, not HTML: jsonLdScript escapes '<' so '</script>' can't break out (tested in seo.test.ts); DOMPurify would corrupt the JSON.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(buildProductJsonLd(product, reviews)) }}
      />
      <Suspense>
        <ProductDetail productId={params.productSlug} />
      </Suspense>
    </>
  );
}
