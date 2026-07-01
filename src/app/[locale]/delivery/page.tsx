'use client';

import { Box, Typography } from '@mui/material';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useTranslations } from 'next-intl';

export default function DeliveryPage() {
  const t = useTranslations('delivery');

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* ── Breadcrumb + Title ── */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 4 } }}>
        <Typography
          sx={{
            fontFamily: '"Open Sans", sans-serif',
            fontSize: 13,
            color: palette.primaryLight,
            mb: 0.5,
          }}
        >
          <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {t('breadcrumbHome')}
          </Link>
          {t('breadcrumbSep')}
        </Typography>

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 24, md: 40 },
            lineHeight: { xs: '30px', md: '50px' },
            fontWeight: 450,
          }}
        >
          {t('title')}
        </Typography>
      </Box>

      {/* ── Delivery block ── */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 3, md: 4 } }}>
        <Box
          sx={{
            bgcolor: palette.bgLight,
            borderRadius: '20px',
            position: 'relative',
            overflow: { xs: 'hidden', md: 'visible' },
            pb: { xs: 4, md: 5 },
          }}
        >
          {/* Decorative bubbles image */}
          <Box
            component="img"
            src="/images/delivery/decorative-bubbles.png"
            alt=""
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              right: 0,
              top: -182,
              width: 400,
              pointerEvents: 'none',
            }}
          />

          {/* Delivery title */}
          <Typography
            sx={{
              fontFamily: '"Futura PT", Helvetica',
              fontSize: 24,
              fontWeight: 450,
              lineHeight: '31px',
              color: palette.primary,
              textTransform: 'uppercase',
              mx: { xs: 2.5, md: 5 },
              pt: { xs: 3, md: 5 },
            }}
          >
            {t('sectionTitle')}
          </Typography>

          {/* Delivery description */}
          <Typography
            sx={{
              fontFamily: '"Futura PT", Helvetica',
              fontSize: 18,
              fontWeight: 450,
              lineHeight: '21px',
              color: palette.primary,
              mx: { xs: 2.5, md: 5 },
              mt: 5,
              mr: { md: '420px' },
            }}
          >
            {t('desc')}
          </Typography>
        </Box>
      </Box>

      {/* ── Payment block ── */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: 5, mb: { xs: 4, md: 8 } }}>
        <Box
          sx={{
            border: `1px solid ${palette.primary}`,
            borderRadius: '20px',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            overflow: 'hidden',
          }}
        >
          {/* Left: payment info */}
          <Box
            sx={{
              flex: 5,
              p: { xs: 3, md: 5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Futura PT", Helvetica',
                  fontSize: 24,
                  fontWeight: 450,
                  lineHeight: '31px',
                  color: palette.primary,
                  textTransform: 'uppercase',
                }}
              >
                {t('paymentTitle')}
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Futura PT", Helvetica',
                  fontSize: 18,
                  fontWeight: 400,
                  lineHeight: '20px',
                  color: palette.primary,
                  mt: 2.5,
                }}
              >
                {t('paymentDesc')}
              </Typography>
            </Box>
          </Box>

          {/* Right: card details */}
          <Box
            sx={{
              flex: 4,
              bgcolor: palette.bgLight,
              p: { xs: 3, md: 5 },
              borderRadius: '20px',
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Futura PT", Helvetica',
                fontSize: 20,
                fontWeight: 500,
                lineHeight: '26px',
                color: palette.primary,
                textTransform: 'uppercase',
              }}
            >
              {t('cardStepsTitle')}
            </Typography>
            <Box
              component="ol"
              sx={{
                fontFamily: '"Futura PT", Helvetica',
                fontSize: 18,
                fontWeight: 400,
                lineHeight: '24px',
                color: palette.primary,
                mt: 2.5,
                pl: 2.5,
              }}
            >
              <li>{t('cardStep1')}</li>
              <li>{t('cardStep2')}</li>
              <li>{t('cardStep3')}</li>
              <li>{t('cardStep4')}</li>
              <li>{t('cardStep5')}</li>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
