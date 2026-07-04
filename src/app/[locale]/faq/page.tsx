'use client';

import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useTranslations } from 'next-intl';

export default function FaqPage() {
  const t = useTranslations('faq');

  const FAQ_ITEMS = [
    { q: t('q0'), a: t('a0') },
    { q: t('q1'), a: t('a1') },
    { q: t('q2'), a: t('a2') },
    { q: t('q3'), a: t('a3') },
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
            fontSize: { xs: 24, md: 40 },
            lineHeight: { xs: '30px', md: '50px' },
            fontWeight: 450,
          }}
        >
          {t('title')}
        </Typography>
      </Box>

      {/* ── FAQ Items ── */}
      <Box
        sx={{
          maxWidth: 1300,
          mx: 'auto',
          px: { xs: 2.5, md: 2 },
          mt: { xs: 3, md: 4 },
          mb: { xs: 4, md: 8 },
        }}
      >
        {FAQ_ITEMS.map((item, idx) => (
          <Accordion
            key={idx}
            defaultExpanded={idx === 0}
            disableGutters
            elevation={0}
            sx={{
              borderBottom: `1px solid ${palette.primaryLight}`,
              '&:before': { display: 'none' },
              bgcolor: 'transparent',
            }}
          >
            <AccordionSummary
              expandIcon={<FaqExpandIcon />}
              sx={{
                px: 0,
                py: { xs: 1.5, md: 2.5 },
                '& .MuiAccordionSummary-content': { m: 0 },
                '& .MuiAccordionSummary-expandIconWrapper': { color: palette.primary },
                '& .MuiAccordionSummary-expandIconWrapper .icon-add': { display: 'flex' },
                '& .MuiAccordionSummary-expandIconWrapper .icon-close': { display: 'none' },
                '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded .icon-add': {
                  display: 'none',
                },
                '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded .icon-close': {
                  display: 'flex',
                },
                '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'none' },
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica',
                  fontSize: { xs: 18, md: 20 },
                  fontWeight: 450,
                  lineHeight: '26px',
                  color: palette.primary,
                  textTransform: 'uppercase',
                  pr: 3,
                }}
              >
                {item.q}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pb: 3 }}>
              <Typography
                sx={{
                  fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica',
                  fontSize: 18,
                  fontWeight: 400,
                  lineHeight: '22px',
                  color: palette.primary,
                }}
              >
                {item.a}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
}

function FaqExpandIcon() {
  return (
    <>
      <AddIcon className="icon-add" sx={{ fontSize: 28 }} />
      <CloseIcon className="icon-close" sx={{ fontSize: 28 }} />
    </>
  );
}
