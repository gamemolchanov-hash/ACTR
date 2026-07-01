'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from '@mui/material';
import { ArrowBack, LocalShipping } from '@mui/icons-material';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { getMyOrders, safeHttpUrl, type CustomerOrder } from '@/lib/auth';
import { fmtMoney } from '@/lib/money';
import { useTranslations } from 'next-intl';
import { useFormatLocale } from '@/providers/CurrencyProvider';

const fontMain = 'LiraFix, "Futura PT", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

export default function OrdersPage() {
  const t = useTranslations('account');
  const tCommon = useTranslations('common');
  const formatLocale = useFormatLocale();

  const { customer, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading && !customer) router.replace('/login');
  }, [authLoading, customer, router]);

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    getMyOrders(page, 10)
      .then((res) => {
        setOrders(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [customer, page]);

  if (authLoading) return null;

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
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
          {` / ${t('myOrders')}`}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Button
            component={Link}
            href="/account"
            sx={{ minWidth: 'auto', p: 0.5, color: palette.primary }}
          >
            <ArrowBack />
          </Button>
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: 24, md: 40 }, fontWeight: 450, letterSpacing: { xs: 2, md: 0 } }}
          >
            {t('myOrdersTitle')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mb: { xs: 4, md: 7 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress sx={{ color: palette.primary }} />
          </Box>
        ) : orders.length === 0 ? (
          <Box sx={{ bgcolor: palette.bgLight, borderRadius: '20px', p: 4, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: fontMain, fontSize: 18, color: palette.primary, mb: 2 }}>
              {t('noOrders')}
            </Typography>
            <Button
              component={Link}
              href="/catalog"
              variant="contained"
              sx={{
                bgcolor: palette.primary,
                borderRadius: '10px',
                textTransform: 'none',
                fontFamily: fontMain,
                px: 4,
              }}
            >
              {t('goToCatalog')}
            </Button>
          </Box>
        ) : (
          <>
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: '20px',
                boxShadow: 'none',
                border: `1px solid ${palette.bgLight}`,
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: palette.bgLight }}>
                    <TableCell
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      {t('orderNumber')}
                    </TableCell>
                    <TableCell
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      {t('orderDate')}
                    </TableCell>
                    <TableCell
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      {t('orderStatus')}
                    </TableCell>
                    <TableCell
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      {t('orderItems')}
                    </TableCell>
                    <TableCell
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      {t('orderTracking')}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      {t('orderTotal')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => {
                    const st = order.status;
                    const statusLabel = st?.name || '—';
                    const statusColor = st?.color || '#999';

                    return (
                      <TableRow
                        key={order.id}
                        onClick={() => router.push(`/account/orders/${order.id}`)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: palette.bgLight } }}
                      >
                        <TableCell
                          sx={{ fontFamily: fontBody, fontWeight: 600, color: palette.primary }}
                        >
                          {order.number}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontFamily: fontBody,
                            color: palette.primaryLight,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {new Intl.DateTimeFormat(formatLocale, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          }).format(new Date(order.date_created))}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabel}
                            size="small"
                            sx={{
                              bgcolor: statusColor,
                              color: 'white',
                              fontFamily: fontBody,
                              fontSize: 12,
                            }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontFamily: fontBody,
                            fontSize: 13,
                            color: palette.primary,
                            maxWidth: 300,
                          }}
                        >
                          {order.items
                            ?.slice(0, 2)
                            .map((i) => `${i.product?.name || '—'} x${i.quantity}`)
                            .join(', ')}
                          {(order.items?.length ?? 0) > 2 && ` (+${order.items!.length - 2})`}
                        </TableCell>
                        <TableCell sx={{ fontFamily: fontBody, fontSize: 13 }}>
                          {safeHttpUrl(order.track_url) ? (
                            <Tooltip title="Track shipment">
                              <IconButton
                                component="a"
                                href={safeHttpUrl(order.track_url)!}
                                target="_blank"
                                rel="noopener"
                                onClick={(e) => e.stopPropagation()}
                                size="small"
                                sx={{ color: palette.primary }}
                              >
                                <LocalShipping fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Typography sx={{ fontSize: 13, color: palette.primaryLight }}>
                              —
                            </Typography>
                          )}
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
                          {fmtMoney(Number(order.total), order.currency, formatLocale)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  sx={{ fontFamily: fontMain, color: palette.primary }}
                >
                  {t('prevPage')}
                </Button>
                <Typography
                  sx={{ fontFamily: fontBody, lineHeight: '36px', color: palette.primaryLight }}
                >
                  {page} / {totalPages}
                </Typography>
                <Button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  sx={{ fontFamily: fontMain, color: palette.primary }}
                >
                  {t('nextPage')}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
