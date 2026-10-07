'use client';

import { Suspense } from 'react';
import { CatalogView } from '@/components/CatalogView';
import { BannerSlot } from '@/components/BannerSlot';
import { PRELAUNCH } from '@/lib/prelaunch';
import PrelaunchNotice from '@/components/PrelaunchNotice';

/**
 * Home = catalog, same as ACRU and ACSTORE (owner, 27.09.2026): product grid,
 * categories and filters instead of the hero banner; above it the banner slot
 * with the "free shipping from …" banner (owner, 07.10.2026).
 */
export default function HomePage() {
  /* ============ PRE-LAUNCH (FBG-416/FBG-426) ============ */
  // While the shop is getting ready, show the same notice as the basket and
  // checkout. NEXT_PUBLIC_PRELAUNCH=false (build-time) opens it — see
  // src/lib/prelaunch.ts.
  if (PRELAUNCH) return <PrelaunchNotice />;
  return (
    <>
      <BannerSlot />
      <Suspense>
        <CatalogView />
      </Suspense>
    </>
  );
}
