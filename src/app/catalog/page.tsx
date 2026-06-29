'use client';

import { Suspense } from 'react';
import { CatalogView } from '@/components/CatalogView';
// BOGO HOOK START
import { PromoBanner } from '@/features/promo-bogo';
// BOGO HOOK END

export default function CatalogPage() {
  return (
    <>
      {/* BOGO HOOK START */}
      <PromoBanner />
      {/* BOGO HOOK END */}
      <Suspense>
        <CatalogView />
      </Suspense>
    </>
  );
}
