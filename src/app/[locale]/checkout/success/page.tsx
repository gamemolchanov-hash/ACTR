'use client';

import { Suspense, useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Link as MuiLink } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/providers/CartProvider';
import { fetchOrder } from '@/lib/api';
import { fmtMoney } from '@/lib/money';
import { palette } from '@/lib/theme';
import type { ArmOrder } from '@/lib/arm-types';
import {
  clearCheckoutDraft,
  readAccountNotice,
  readPendingOrder,
  resolveAccountNotice,
  type AccountNotice,
} from '@/lib/checkout';
import { useFormatLocale } from '@/providers/CurrencyProvider';

const font = 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica';
const c = { main: palette.primary, bg: palette.bgLight };

function SuccessContent() {
  const t = useTranslations();
  const params = useSearchParams();
  /** `order` query param holds the ARM order UUID returned by createOrder */
  const orderId = params.get('order') || '';
  const { clearCart } = useCart();
  const formatLocale = useFormatLocale();

  const [order, setOrder] = useState<ArmOrder | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  /** Everything the checkout handed over, read once BEFORE it is cleared. */
  const [handoff, setHandoff] = useState<{
    notice: AccountNotice | null;
    pendingOrderId: string;
  } | null>(null);

  // Read what the checkout handed over — the account outcome (createOrder
  // reported it once; GET /orders/{id} never repeats it) and the pending-order
  // marker, which is this page's only order id when ARM's configured
  // `success_url` drops our `?order=` query.
  //
  // Kept first, kept once: the cleanup below consumes the marker, and React
  // Strict Mode re-runs effects in dev — a second read would then find an empty
  // slot and overwrite what the first one captured.
  useEffect(() => {
    setHandoff(
      (prev) =>
        prev ?? {
          notice: readAccountNotice(),
          pendingOrderId: readPendingOrder()?.orderId || '',
        },
    );
  }, []);

  // Terminal point of the checkout: clear the cart and every draft it left
  // behind. The checkout page keeps its draft and its pending-order marker right
  // through the payment redirect on purpose — until the buyer lands here, going
  // back to /checkout must resume THAT order, not start a second one.
  useEffect(() => {
    clearCart();
    clearCheckoutDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notice = resolveAccountNotice(handoff?.notice ?? null, orderId);

  // A payment provider configured with its own `success_url` sends the buyer back
  // without our query — then the checkout's own marker names the order, whoever
  // placed it (the account notice only exists for auto-registered guests).
  const effectiveOrderId = orderId || handoff?.pendingOrderId || notice?.orderId || '';

  // Fetch order details from ARM GET /orders/{id}
  useEffect(() => {
    if (!effectiveOrderId) return;
    setOrderLoading(true);
    fetchOrder(effectiveOrderId)
      .then((res) => setOrder(res.data))
      .catch(() => setOrderError('Could not load order details.'))
      .finally(() => setOrderLoading(false));
  }, [effectiveOrderId]);

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

        {!order && !orderLoading && !orderError && effectiveOrderId && (
          <Typography sx={{ fontFamily: font, fontSize: 16, color: c.main }}>
            Order ID: {effectiveOrderId}
          </Typography>
        )}

        <Typography sx={{ fontFamily: font, fontSize: 16, color: c.main, mt: 2 }}>
          We will contact you to confirm your order.
        </Typography>

        {/* Account outcome (FBG-477). `email_taken` means the order went to a
            separate new record, NOT to the account that owns this address — so
            the sign-in link is offered on its own, never as a way to find this
            order. `created` promises the password email only when ARM actually
            managed to send it. */}
        {notice && (
          <Box
            data-testid="account-notice"
            sx={{ mt: 3, pt: 2, borderTop: `0.5px solid ${c.main}` }}
          >
            <Typography sx={{ fontFamily: font, fontSize: 16, color: c.main }}>
              {notice.status === 'email_taken'
                ? t('checkout.account.emailTaken')
                : notice.welcomeEmailSent
                  ? t('checkout.account.createdSent', { email: notice.email })
                  : t('checkout.account.createdPending')}
            </Typography>
            {notice.status === 'email_taken' && (
              <MuiLink
                component={Link}
                href="/login"
                underline="always"
                sx={{ fontFamily: font, fontSize: 16, color: c.main, display: 'inline-block', mt: 1 }}
              >
                {t('checkout.account.loginCta')}
              </MuiLink>
            )}
          </Box>
        )}
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
