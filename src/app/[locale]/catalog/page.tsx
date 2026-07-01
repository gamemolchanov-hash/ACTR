'use client';

import { Suspense } from 'react';
import { CatalogView } from '@/components/CatalogView';

export default function CatalogPage() {
  return (
    <>
      <Suspense>
        <CatalogView />
      </Suspense>
    </>
  );
}
