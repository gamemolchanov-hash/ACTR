'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { CatalogView } from '@/components/CatalogView';
import { BannerSlot } from '@/components/BannerSlot';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <>
      <BannerSlot />
      <Suspense>
        <CatalogView categorySlug={slug} />
      </Suspense>
    </>
  );
}
