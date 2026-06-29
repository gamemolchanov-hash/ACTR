'use client';

import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import Link from 'next/link';
import { palette } from '@/lib/theme';

const FAQ_ITEMS = [
  {
    q: 'Как осуществляется доставка в регионы?',
    a: 'Товары нашего магазина доставляют покупателям транспортные компании.',
  },
  {
    q: 'Возможен ли самовывоз заказанного товара?',
    a: 'Для Вашего удобства мы используем только службы доставки! Самовывоз невозможен - только доставка! Благодарим за понимание!',
  },
  {
    q: 'Как рассчитать стоимость доставки в определённый город?',
    a: 'Для точного расчета стоимости доставки вашего заказа обращайтесь к операторам call-центра или задайте вопрос через онлайн-консультанта.',
  },
  {
    q: 'Подскажите какой режим работы телефонного консультанта?',
    a: 'Наши операторы работают с 9:00 до 18:00 по будням.',
  },
];

export default function FaqPage() {
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
            Главная
          </Link>
          {' / Вопрос-ответ'}
        </Typography>

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 24, md: 40 },
            lineHeight: { xs: '30px', md: '50px' },
            fontWeight: 450,
          }}
        >
          ВОПРОС-ОТВЕТ
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
                  fontFamily: '"Futura PT", Helvetica',
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
                  fontFamily: '"Futura PT", Helvetica',
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
