'use client';

import { Box } from '@mui/material';
import { HeroBanner } from '@/components/HeroBanner';
// BOGO HOOK START
import { PromoBanner } from '@/features/promo-bogo';
// BOGO HOOK END

export default function HomePage() {
  return (
    <Box>
      {/* BOGO HOOK START */}
      <PromoBanner />
      {/* BOGO HOOK END */}
      <HeroBanner />
    </Box>
  );
}
