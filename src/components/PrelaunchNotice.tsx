'use client';

import { Box, Typography, Button } from '@mui/material';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/palette';

const font = 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica';

/**
 * Pre-launch notice (FBG-416) — shown on the basket and checkout pages while
 * ordering is disabled. All copy comes from the `prelaunch.*` i18n keys so it
 * renders in the active locale (EN/TR) with no hardcoded strings. The CTA
 * points back to the catalog, which stays open for browsing.
 */
export default function PrelaunchNotice() {
  const t = useTranslations();
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: 2, py: { xs: 6, md: 10 }, textAlign: 'center' }}>
      <Typography
        sx={{
          fontFamily: font,
          fontWeight: 500,
          fontSize: { xs: 28, md: 40 },
          lineHeight: 1.25,
          textTransform: 'uppercase',
          color: palette.primary,
          mb: 2,
        }}
      >
        {t('prelaunch.title')}
      </Typography>
      <Typography
        sx={{
          fontFamily: font,
          fontWeight: 400,
          fontSize: 18,
          lineHeight: 1.5,
          color: palette.primary,
          mb: 4,
        }}
      >
        {t('prelaunch.message')}
      </Typography>
      <Button
        component={Link}
        href="/catalog"
        variant="contained"
        sx={{
          bgcolor: palette.primary,
          color: palette.white,
          borderRadius: '10px',
          px: 5,
          py: 1.5,
          fontFamily: font,
          fontSize: 18,
          fontWeight: 450,
          textTransform: 'none',
          '&:hover': { bgcolor: '#2a3d85' },
        }}
      >
        {t('prelaunch.cta')}
      </Button>
    </Box>
  );
}
