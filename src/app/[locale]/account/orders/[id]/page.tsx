'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import { ArrowBack, LocalShipping } from '@mui/icons-material';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { getMyOrder, safeHttpUrl, type CustomerOrder } from '@/lib/auth';
import { fmtMoney } from '@/lib/money';
import { useTranslations } from 'next-intl';
import { useFormatLocale } from '@/providers/CurrencyProvider';

const fontMain = '"Futura PT", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

export default function OrderDetailPage() {
  const t = useTranslations('account');
  const tCommon = useTranslations('common');
  const formatLocale = useFormatLocale();

  const { customer, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || '');

  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !customer) router.replace('/login');
  }, [authLoading, customer, router]);

  useEffect(() => {
    if (!customer || !id) return;
    setLoading(true);
    getMyOrder(id)
      .then(({ data }) => setOrder(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [customer, id]);

  if (authLoading) return null;

  const currency = order?.currency || 'TRY';
  const itemsSubtotal = order?.items?.reduce(
    (sum, item) => sum + Number(item.unit_price) * item.quantity,
    0,
  ) ?? 0;
  const vat = order?.vat_amount != null ? Number(order.vat_amount) : null;

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
        <Typography
          sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 0.5 }}
        >
          <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {tCommon('home')}
          </Link>
          {' / '}
          <Link href="/account" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {t('breadcrumb')}
          </Link>
          {' / '}
          <Link
            href="/account/orders"
            style={{ color: palette.primaryLight, textDecoration: 'none' }}
          >
            {t('myOrders')}
          </Link>
          {order ? ` / ${t('orderDetail', { number: order.number })}` : ''}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Button
            component={Link}
            href="/account/orders"
            sx={{ minWidth: 'auto', p: 0.5, color: palette.primary }}
          >
            <ArrowBack />
          </Button>
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: 22, md: 34 }, fontWeight: 450, letterSpacing: { xs: 1, md: 0 } }}
          >
            {order ? t('orderDetail', { number: order.number }) : t('orderTitleFallback')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2.5, md: 2 }, mb: { xs: 4, md: 7 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress sx={{ color: palette.primary }} />
          </Box>
        ) : notFound || !order ? (
          <Box sx={{ bgcolor: palette.bgLight, borderRadius: '20px', p: 4, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: fontMain, fontSize: 18, color: palette.primary, mb: 2 }}>
              {t('orderNotFound')}
            </Typography>
            <Button
              component={Link}
              href="/account/orders"
              variant="contained"
              sx={{
                bgcolor: palette.primary,
                borderRadius: '10px',
                textTransform: 'none',
                fontFamily: fontMain,
                px: 4,
              }}
            >
              {t('backToOrders')}
            </Button>
          </Box>
        ) : (
          <>
            {/* Status row */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
              <Chip
                label={order.status?.name || '—'}
                sx={{
                  bgcolor: order.status?.color || '#999',
                  color: 'white',
                  fontFamily: fontBody,
                  fontSize: 13,
                  height: 30,
                }}
              />
              <Typography sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primaryLight }}>
                {new Intl.DateTimeFormat(formatLocale, {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }).format(new Date(order.date_created))}
              </Typography>
              {safeHttpUrl(order.track_url) && (
                <Tooltip title="Track shipment">
                  <IconButton
                    component="a"
                    href={safeHttpUrl(order.track_url)!}
                    target="_blank"
                    rel="noopener"
                    size="small"
                    sx={{ color: palette.primary }}
                  >
                    <LocalShipping fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Items table */}
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: '20px',
                boxShadow: 'none',
                border: `1px solid ${palette.bgLight}`,
                mb: 3,
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: palette.bgLight }}>
                    <TableCell
                      sx={{
                        fontFamily: fontMain,
                        fontWeight: 500,
                        color: palette.primary,
                        width: 48,
                      }}
                    >
                      №
                    </TableCell>
                    <TableCell
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      {t('itemProduct')}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontFamily: fontMain,
                        fontWeight: 500,
                        color: palette.primary,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('itemQty')}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontFamily: fontMain,
                        fontWeight: 500,
                        color: palette.primary,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('itemPrice')}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontFamily: fontMain,
                        fontWeight: 500,
                        color: palette.primary,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('itemTotal')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items?.map((item, idx) => {
                    const price = Number(item.unit_price ?? 0);
                    return (
                      <TableRow key={item.id}>
                        <TableCell sx={{ fontFamily: fontBody, color: palette.primaryLight }}>
                          {idx + 1}
                        </TableCell>
                        <TableCell
                          sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primary }}
                        >
                          {item.product?.name || '—'}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ fontFamily: fontBody, color: palette.primary }}
                        >
                          {item.quantity}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontFamily: fontBody,
                            color: palette.primary,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {fmtMoney(price, currency, formatLocale)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontFamily: fontMain,
                            fontWeight: 500,
                            color: palette.primary,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {fmtMoney(price * item.quantity, currency, formatLocale)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Totals */}
            <Box
              sx={{
                width: { xs: '100%', md: 320 },
                bgcolor: palette.bgLight,
                borderRadius: '20px',
                p: 3,
                ml: { xs: 0, md: 'auto' },
              }}
            >
              <Typography
                sx={{
                  fontFamily: fontMain,
                  fontSize: 16,
                  fontWeight: 500,
                  color: palette.primary,
                  mb: 2,
                }}
              >
                {t('summary')}
              </Typography>
              <TotalRow label={t('summaryItems')} value={fmtMoney(itemsSubtotal, currency, formatLocale)} />
              {vat != null && vat > 0 && (
                <TotalRow label={t('summaryVat')} value={fmtMoney(vat, currency, formatLocale)} />
              )}
              <Divider sx={{ my: 1.5 }} />
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
              >
                <Typography
                  sx={{
                    fontFamily: fontMain,
                    fontSize: 16,
                    fontWeight: 600,
                    color: palette.primary,
                  }}
                >
                  {t('summaryToPay')}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fontMain,
                    fontSize: 20,
                    fontWeight: 600,
                    color: palette.primary,
                  }}
                >
                  {fmtMoney(Number(order.total), currency, formatLocale)}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
      <Typography sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primaryLight }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: fontBody,
          fontSize: 14,
          color: palette.primary,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
