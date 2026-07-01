'use client';

import { Suspense, useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, CircularProgress } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/providers/CartProvider';
import { fetchOrder } from '@/lib/api';
import { fmtMoney } from '@/lib/money';
import { palette } from '@/lib/theme';
import type { ArmOrder } from '@/lib/arm-types';
import { useFormatLocale } from '@/providers/CurrencyProvider';

const font = 'LiraFix, "Futura PT", Helvetica';
const c = { main: palette.primary, bg: palette.bgLight };

function SuccessContent() {
  const params = useSearchParams();
  /** `order` query param holds the ARM order UUID returned by createOrder */
  const orderId = params.get('order') || '';
  const { clearCart } = useCart();
  const formatLocale = useFormatLocale();

  const [order, setOrder] = useState<ArmOrder | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Clear cart at the point of confirmed payment success
  useEffect(() => {
    clearCart();
    try {
      sessionStorage.removeItem('checkout_promo');
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch order details from ARM GET /orders/{id}
  useEffect(() => {
    if (!orderId) return;
    setOrderLoading(true);
    fetchOrder(orderId)
      .then((res) => setOrder(res.data))
      .catch(() => setOrderError('Could not load order details.'))
      .finally(() => setOrderLoading(false));
  }, [orderId]);

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
        Order Placed
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
        {orderLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress sx={{ color: c.main }} size={32} />
          </Box>
        )}

        {orderError && (
          <Typography sx={{ fontFamily: font, fontSize: 16, color: '#d32f2f', mb: 1 }}>
            {orderError}
          </Typography>
        )}

        {order && (
          <>
            <Typography sx={{ fontFamily: font, fontSize: 18, color: c.main, mb: 1 }}>
              Order number: <strong>{order.number}</strong>
            </Typography>
            <Typography sx={{ fontFamily: font, fontSize: 18, color: c.main, mb: 1 }}>
              Total: <strong>{fmtMoney(order.total, order.currency, formatLocale)}</strong>
            </Typography>
            <Typography sx={{ fontFamily: font, fontSize: 18, color: c.main, mb: 1 }}>
              Status: {order.status.name}
            </Typography>
          </>
        )}

        {!order && !orderLoading && !orderError && orderId && (
          <Typography sx={{ fontFamily: font, fontSize: 16, color: c.main }}>
            Order ID: {orderId}
          </Typography>
        )}

        <Typography sx={{ fontFamily: font, fontSize: 16, color: c.main, mt: 2 }}>
          We will contact you to confirm your order.
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
        Continue Shopping
      </Button>
    </Box>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress sx={{ color: palette.primary }} size={40} />
            <Typography sx={{ fontFamily: font, color: palette.primary }}>Loading...</Typography>
          </Box>
        </Box>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
