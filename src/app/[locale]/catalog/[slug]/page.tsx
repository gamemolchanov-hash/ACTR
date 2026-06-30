'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { CatalogView } from '@/components/CatalogView';
// BOGO HOOK START
import { PromoBanner } from '@/features/promo-bogo';
// BOGO HOOK END

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <>
      {/* BOGO HOOK START */}
      <PromoBanner />
      {/* BOGO HOOK END */}
      <Suspense>
        <CatalogView categorySlug={slug} />
      </Suspense>
    </>
  );
}
