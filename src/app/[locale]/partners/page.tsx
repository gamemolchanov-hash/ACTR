'use client';

import { Box, Typography, Button } from '@mui/material';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useTranslations } from 'next-intl';

export default function PartnersPage() {
  const t = useTranslations('partners');

  const PARTNER_TYPES = [
    {
      title: t('shops.cardTitle'),
      description: t('shops.cardDesc'),
      href: '/partners/shops',
      image: '/images/partners/magazinam.jpeg',
    },
    {
      title: t('bloggers.cardTitle'),
      description: t('bloggers.cardDesc'),
      href: '/partners/bloggers',
      image: '/images/partners/bloggers.png',
    },
    {
      title: t('schools.cardTitle'),
      description: t('schools.cardDesc'),
      href: '/partners/schools',
      image: '/images/partners/schools.png',
    },
  ];

  const QUICK_LINKS = [
    { label: t('quickShops'), href: '/partners/shops' },
    { label: t('quickSchools'), href: '/partners/schools' },
    { label: t('quickBloggers'), href: '/partners/bloggers' },
    { label: t('quickStudios'), href: '/studios' },
  ];

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
            fontSize: { xs: 30, md: 40 },
            lineHeight: { xs: '35px', md: '50px' },
            fontWeight: 450,
          }}
        >
          {t('title')}
        </Typography>
      </Box>

      {/* ── Intro text ── */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
        <Typography
          sx={{
            fontFamily: '"Futura PT", Helvetica',
            fontSize: { xs: 16, md: 18 },
            lineHeight: '22px',
            color: palette.primary,
            maxWidth: 700,
          }}
        >
          {t('intro')}
        </Typography>
      </Box>

      {/* ── Partner type cards ── */}
      <Box
        sx={{
          maxWidth: 1300,
          mx: 'auto',
          px: { xs: 2.5, md: 2 },
          mt: { xs: 3, md: 5 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 2.5 },
        }}
      >
        {PARTNER_TYPES.map((pt) => (
          <Box
            key={pt.title}
            sx={{
              flex: 1,
              border: `1px solid ${palette.primaryLight}`,
              borderRadius: '20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={pt.image}
              alt={pt.title}
              sx={{
                width: '100%',
                height: { xs: 200, md: 268 },
                objectFit: 'cover',
              }}
            />

            <Typography
              sx={{
                fontFamily: '"Futura PT", Helvetica',
                fontSize: 24,
                fontWeight: 450,
                lineHeight: '31px',
                color: palette.primary,
                textTransform: 'uppercase',
                mt: { xs: 3, md: 5 },
                px: 2,
              }}
            >
              {pt.title}
            </Typography>

            <Typography
              sx={{
                fontFamily: '"Futura PT", Helvetica',
                fontSize: 16,
                fontWeight: 400,
                lineHeight: '20px',
                color: palette.primary,
                mt: 2,
                mb: 4,
                px: 2,
                minHeight: { md: 40 },
              }}
            >
              {pt.description}
            </Typography>

            <Button
              component={Link}
              href={pt.href}
              variant="contained"
              sx={{
                mt: 'auto',
                mb: { xs: 3, md: 5 },
                bgcolor: palette.primary,
                color: 'white',
                borderRadius: '10px',
                fontFamily: '"Futura PT", Helvetica',
                fontSize: 18,
                fontWeight: 450,
                textTransform: 'none',
                px: 5,
                py: '15px',
                '&:hover': { bgcolor: '#2a3d85' },
              }}
            >
              {t('learnMore')}
            </Button>
          </Box>
        ))}
      </Box>

      {/* ── Quick nav chips ── */}
      <Box
        sx={{
          maxWidth: 1300,
          mx: 'auto',
          px: { xs: 2.5, md: 2 },
          mt: { xs: 4, md: 6 },
          mb: { xs: 4, md: 8 },
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        {QUICK_LINKS.map((ql) => (
          <Button
            key={ql.label}
            component={Link}
            href={ql.href}
            variant="outlined"
            sx={{
              borderColor: palette.primaryLight,
              color: palette.primary,
              borderRadius: '40px',
              fontFamily: '"Futura PT", Helvetica',
              fontSize: 16,
              fontWeight: 400,
              textTransform: 'none',
              px: 3,
              py: 1,
              '&:hover': {
                borderColor: palette.primary,
                bgcolor: palette.bgLight,
              },
            }}
          >
            {ql.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
