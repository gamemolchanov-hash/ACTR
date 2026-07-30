'use client';

import { Box } from '@mui/material';
import { HeroBanner } from '@/components/HeroBanner';
import { PRELAUNCH } from '@/lib/prelaunch';
import PrelaunchNotice from '@/components/PrelaunchNotice';

export default function HomePage() {
  /* ============ PRE-LAUNCH (FBG-416/FBG-426) ============ */
  // While the shop is getting ready, show the same notice as the basket and
  // checkout instead of the banner. NEXT_PUBLIC_PRELAUNCH=false (build-time)
  // opens it at launch — see src/lib/prelaunch.ts.
  if (PRELAUNCH) {
    return <PrelaunchNotice />;
  }

  return (
    <Box>
      <HeroBanner />
    </Box>
  );
}
