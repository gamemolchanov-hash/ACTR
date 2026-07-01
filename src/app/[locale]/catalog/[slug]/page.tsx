'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { CatalogView } from '@/components/CatalogView';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <>
      <Suspense>
        <CatalogView categorySlug={slug} />
      </Suspense>
    </>
  );
}
