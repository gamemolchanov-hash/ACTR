'use client';

import { Box, Typography, Button, Link as MuiLink } from '@mui/material';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useConsent } from '@/providers/CookieConsentProvider';

// All three actions must read as equally prominent (KVKK: reject must be no
// harder than accept), so they share one style — none is visually subordinate.
const actionSx = {
  flex: { xs: '1 1 100%', sm: 1 },
  minWidth: { sm: 150 },
  bgcolor: palette.primary,
  color: palette.white,
  borderRadius: '10px',
  py: 1.25,
  px: 2,
  fontSize: 16,
  fontWeight: 450,
  textTransform: 'none' as const,
  whiteSpace: 'nowrap' as const,
  '&:hover': { bgcolor: '#2a3d85' },
};

export function CookieBanner() {
  const t = useTranslations('cookieConsent');
  const { bannerVisible, acceptAll, rejectAll, openPreferences } = useConsent();

  // Server + pre-hydration render nothing → no flash, no hydration mismatch, and
  // no optional cookie/script can slip in before the visitor has decided.
  if (!bannerVisible) return null;

  return (
    <Box
      role="dialog"
      aria-modal={false}
      aria-label={t('banner.title')}
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1250, // above the sticky header (appBar 1100); below MUI modals (1300)
        bgcolor: palette.white,
        borderTop: `1px solid ${palette.primaryLight}`,
        boxShadow: '0 -4px 24px rgba(51, 74, 159, 0.12)',
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 2.5 },
      }}
    >
      <Box
        sx={{
          maxWidth: 1300,
          mx: 'auto',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 3 },
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h3"
            sx={{ fontWeight: 500, fontSize: 20, color: palette.primary, mb: 0.75 }}
          >
            {t('banner.title')}
          </Typography>
          <Typography sx={{ fontSize: 14, color: palette.primary, lineHeight: 1.55 }}>
            {t.rich('banner.body', {
              policy: (chunks) => (
                <MuiLink
                  component={Link}
                  href="/legal/gizlilik"
                  sx={{ color: palette.primary, textDecoration: 'underline', fontWeight: 500 }}
                >
                  {chunks}
                </MuiLink>
              ),
            })}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
            flexShrink: 0,
            width: { xs: '100%', md: 'auto' },
          }}
        >
          <Button variant="contained" disableElevation onClick={rejectAll} sx={actionSx}>
            {t('actions.rejectAll')}
          </Button>
          <Button variant="contained" disableElevation onClick={openPreferences} sx={actionSx}>
            {t('actions.managePreferences')}
          </Button>
          <Button variant="contained" disableElevation onClick={acceptAll} sx={actionSx}>
            {t('actions.acceptAll')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
