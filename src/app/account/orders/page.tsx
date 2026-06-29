'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { getMyOrders, type OrderSummary } from '@/lib/auth';

const fontMain = '"Futura PT", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

const CDEK_TRACK_URL = 'https://www.cdek.ru/ru/tracking?order_id=';

export default function OrdersPage() {
  const { isLogged, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading && !isLogged) router.replace('/login');
  }, [authLoading, isLogged, router]);

  useEffect(() => {
    if (!isLogged) return;
    setLoading(true);
    getMyOrders(page, 10)
      .then((res) => {
        setOrders(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [isLogged, page]);

  if (authLoading) return null;

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
        <Typography
          sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 0.5 }}
        >
          <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            Главная
          </Link>
          {' / '}
          <Link href="/account" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            Личный кабинет
          </Link>
          {' / Мои заказы'}
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
            МОИ ЗАКАЗЫ
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
              У вас пока нет заказов
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
              Перейти в каталог
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
                      Номер
                    </TableCell>
                    <TableCell
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      Дата
                    </TableCell>
                    <TableCell
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      Статус
                    </TableCell>
                    <TableCell
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      Товары
                    </TableCell>
                    <TableCell
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      Доставка
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      Сумма
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => {
                    const st = order.status;
                    const statusLabel = st?.name || '—';
                    const statusColor = st?.color || '#999';
                    const ds = order.delivery_service;
                    const isCdek =
                      ds?.name?.toLowerCase().includes('сдэк') ||
                      ds?.name?.toLowerCase().includes('cdek');

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
                          {new Date(order.date_created).toLocaleDateString('ru-RU')}
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
                        <TableCell
                          sx={{ fontFamily: fontBody, fontSize: 13, whiteSpace: 'nowrap' }}
                        >
                          {ds ? (
                            <Box>
                              <Typography sx={{ fontSize: 13, color: palette.primary }}>
                                {ds.name}
                              </Typography>
                              {order.track_number && (
                                <Tooltip title="Отследить посылку">
                                  <Box
                                    component={isCdek ? 'a' : 'span'}
                                    onClick={(e: MouseEvent) => e.stopPropagation()}
                                    {...(isCdek
                                      ? {
                                          href: `${CDEK_TRACK_URL}${order.track_number}`,
                                          target: '_blank',
                                          rel: 'noopener',
                                        }
                                      : {})}
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      fontSize: 12,
                                      color: isCdek ? '#2196F3' : palette.primaryLight,
                                      textDecoration: isCdek ? 'underline' : 'none',
                                    }}
                                  >
                                    <LocalShipping sx={{ fontSize: 14 }} />
                                    {order.track_number}
                                  </Box>
                                </Tooltip>
                              )}
                            </Box>
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
                          {order.total?.toLocaleString('ru-RU')} ₽
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
                  Назад
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
                  Далее
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
