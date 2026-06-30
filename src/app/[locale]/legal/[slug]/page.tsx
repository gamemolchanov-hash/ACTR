'use client';

import { notFound } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useTranslations } from 'next-intl';

export const LEGAL_SLUGS = [
  'kvkk',
  'mesafeli-satis',
  'iade',
  'gizlilik',
  'kullanim-kosullari',
] as const;

type LegalSlug = (typeof LEGAL_SLUGS)[number];

/** Number of s1..sN sections for each slug */
const SECTION_COUNT: Record<LegalSlug, number> = {
  'kvkk': 4,
  'mesafeli-satis': 3,
  'iade': 3,
  'gizlilik': 2,
  'kullanim-kosullari': 2,
};

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

interface Props {
  params: { slug: string; locale: string };
}

export default function LegalPage({ params }: Props) {
  if (!LEGAL_SLUGS.includes(params.slug as LegalSlug)) {
    notFound();
  }

  const slug = params.slug as LegalSlug;
  const nsKey = slug.replace(/-/g, '_');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = useTranslations(`legal.${nsKey}` as any);

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
              fontFamily: '"Futura PT", Helvetica',
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
                  fontFamily: '"Futura PT", Helvetica',
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
                  fontFamily: '"Futura PT", Helvetica',
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
