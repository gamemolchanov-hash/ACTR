'use client';

import { Suspense } from 'react';
import { CatalogView } from '@/components/CatalogView';
import { PRELAUNCH } from '@/lib/prelaunch';
import PrelaunchNotice from '@/components/PrelaunchNotice';

/**
 * Home = catalog, same as ACRU and ACSTORE (owner, 27.09.2026): product grid,
 * categories and filters instead of the hero banner. The banner slot of those
 * storefronts is not ported — it has no Turkish artwork yet.
 */
export default function HomePage() {
  /* ============ PRE-LAUNCH (FBG-416/FBG-426) ============ */
  // While the shop is getting ready, show the same notice as the basket and
  // checkout. NEXT_PUBLIC_PRELAUNCH=false (build-time) opens it — see
  // src/lib/prelaunch.ts.
  if (PRELAUNCH) return <PrelaunchNotice />;
  return (
    <Suspense>
      <CatalogView />
    </Suspense>
  );
}
