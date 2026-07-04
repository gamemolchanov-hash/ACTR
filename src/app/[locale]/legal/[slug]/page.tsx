import { notFound } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/palette';
import { getTranslations } from 'next-intl/server';
import { LEGAL_SLUGS, SECTION_COUNT } from '../legal-config';
import type { LegalSlug } from '../legal-config';

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

interface Props {
  params: { slug: string; locale: string };
}

export default async function LegalPage({ params }: Props) {
  if (!LEGAL_SLUGS.includes(params.slug as LegalSlug)) {
    notFound();
  }

  const slug = params.slug as LegalSlug;
  const nsKey = slug.replace(/-/g, '_');
  const t = await getTranslations(`legal.${nsKey}` as any);

  const sectionCount = SECTION_COUNT[slug];
  const sections = Array.from({ length: sectionCount }, (_, i) => i + 1);

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
            Home
          </Link>
          {' / '}
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

      {/* ── Content card ── */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 3, md: 4 }, mb: { xs: 4, md: 8 } }}>
        <Box
          sx={{
            bgcolor: palette.bgLight,
            borderRadius: '20px',
            p: { xs: 3, md: 5 },
          }}
        >
          {/* Intro */}
          <Typography
            sx={{
              fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica',
              fontSize: 18,
              fontWeight: 400,
              lineHeight: '24px',
              color: palette.primary,
              mb: 4,
            }}
          >
            {t('intro')}
          </Typography>

          {/* Sections */}
          {sections.map((n) => (
            <Box key={n} sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica',
                  fontSize: 20,
                  fontWeight: 450,
                  lineHeight: '26px',
                  color: palette.primary,
                  textTransform: 'uppercase',
                  mb: 1,
                }}
              >
                {t(`s${n}Title` as Parameters<typeof t>[0])}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica',
                  fontSize: 16,
                  fontWeight: 400,
                  lineHeight: '22px',
                  color: palette.primary,
                }}
              >
                {t(`s${n}Body` as Parameters<typeof t>[0])}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
