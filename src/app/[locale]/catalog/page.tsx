'use client';

import { Suspense } from 'react';
import { CatalogView } from '@/components/CatalogView';
import { BannerSlot } from '@/components/BannerSlot';

export default function CatalogPage() {
  return (
    <>
      <BannerSlot />
      <Suspense>
        <CatalogView />
      </Suspense>
    </>
  );
}
