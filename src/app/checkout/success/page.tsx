'use client';

import { Suspense } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { palette } from '@/lib/theme';

const font = '"Futura PT", Helvetica';
const c = { main: palette.primary, bg: palette.bgLight };
const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n) + ' \u20BD';

function SuccessContent() {
  const params = useSearchParams();
  const orderNumber = params.get('order') || '';
  const total = Number(params.get('total') || 0);

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, py: 8, textAlign: 'center' }}>
      <CheckCircleOutlineIcon sx={{ fontSize: 80, color: c.main, mb: 3 }} />

      <Typography
        sx={{
          fontFamily: font,
          fontWeight: 500,
          fontSize: 32,
          color: c.main,
          textTransform: 'uppercase',
          mb: 2,
        }}
      >
        Заказ оформлен
      </Typography>

      <Paper
        elevation={0}
        sx={{
          bgcolor: c.bg,
          borderRadius: '20px',
          p: 4,
          mb: 4,
        }}
      >
        {orderNumber && (
          <Typography sx={{ fontFamily: font, fontSize: 18, color: c.main, mb: 1 }}>
            Номер заказа: <strong>{orderNumber}</strong>
          </Typography>
        )}
        {total > 0 && (
          <Typography sx={{ fontFamily: font, fontSize: 18, color: c.main, mb: 1 }}>
            Сумма: <strong>{fmt(total)}</strong>
          </Typography>
        )}
        <Typography sx={{ fontFamily: font, fontSize: 16, color: c.main, mt: 2 }}>
          Мы свяжемся с вами для подтверждения заказа.
        </Typography>
      </Paper>

      <Button
        component={Link}
        href="/catalog"
        variant="contained"
        sx={{
          bgcolor: c.main,
          borderRadius: '10px',
          px: 5,
          py: '15px',
          fontFamily: font,
          fontWeight: 500,
          fontSize: 18,
          textTransform: 'none',
          '&:hover': { bgcolor: '#2a3d8a' },
        }}
      >
        Продолжить покупки
      </Button>
    </Box>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography sx={{ fontFamily: font, color: palette.primary }}>Загрузка...</Typography>
        </Box>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
