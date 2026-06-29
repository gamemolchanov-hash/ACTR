'use client';

import Link from 'next/link';
import { Box } from '@mui/material';
import {
  BANNER_DESKTOP_SRC,
  BANNER_DESKTOP_WIDTH,
  BANNER_DESKTOP_HEIGHT,
  BANNER_MOBILE_SRC,
  BANNER_MOBILE_WIDTH,
  BANNER_MOBILE_HEIGHT,
  MOBILE_MEDIA,
  CTA_HREF,
  PROMO_BANNER_ALT,
  isPromoActiveNow,
} from './config';

/**
 * Home-page promo banner. Renders nothing outside the promo date window.
 */
export function PromoBanner() {
  if (!isPromoActiveNow()) return null;

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', px: 2, py: 2 }}>
      <Link
        href={CTA_HREF}
        style={{ display: 'block', textDecoration: 'none' }}
        aria-label={PROMO_BANNER_ALT}
      >
        <picture>
          <source media={MOBILE_MEDIA} srcSet={BANNER_MOBILE_SRC} />
          <img
            src={BANNER_DESKTOP_SRC}
            alt={PROMO_BANNER_ALT}
            width={BANNER_DESKTOP_WIDTH}
            height={BANNER_DESKTOP_HEIGHT}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 12,
            }}
            loading="eager"
            decoding="async"
          />
        </picture>
      </Link>
    </Box>
  );
}
