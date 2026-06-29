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
} from '@mui/material';
import { ArrowBack, LocalShipping } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { getMyOrder, type OrderDetail } from '@/lib/auth';

const fontMain = '"Futura PT", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

const CDEK_TRACK_URL = 'https://www.cdek.ru/ru/tracking?order_id=';

const PAYMENT_LABELS: Record<string, string> = {
  paid: 'Оплачен',
  unpaid: 'Не оплачен',
  partial: 'Оплачен частично',
  refunded: 'Возврат',
};

const TARIFF_LABELS: Record<string, string> = {
  courier: 'Курьер',
  pickup: 'Пункт выдачи',
  pvz: 'Пункт выдачи',
  postamat: 'Постамат',
};

const money = (v: number | string | null | undefined) =>
  `${Number(v ?? 0).toLocaleString('ru-RU')} ₽`;

export default function OrderDetailPage() {
  const { isLogged, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || '');

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLogged) router.replace('/login');
  }, [authLoading, isLogged, router]);

  useEffect(() => {
    if (!isLogged || !id) return;
    setLoading(true);
    getMyOrder(id)
      .then((o) => setOrder(o))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [isLogged, id]);

  if (authLoading) return null;

  const ds = order?.delivery_service;
  const isCdek =
    !!ds?.name &&
    (ds.name.toLowerCase().includes('сдэк') || ds.name.toLowerCase().includes('cdek'));

  const addressParts = order
    ? [
        order.shipping_zip,
        order.shipping_region,
        order.shipping_city,
        order.shipping_street && `ул. ${order.shipping_street}`,
        order.shipping_building && `д. ${order.shipping_building}`,
        order.shipping_block && `корп. ${order.shipping_block}`,
        order.shipping_apartment && `кв. ${order.shipping_apartment}`,
      ].filter(Boolean)
    : [];
  const address = addressParts.length ? addressParts.join(', ') : order?.shipping_address || '';

  const discount = Number(order?.discount ?? 0);
  const promoDiscount = Number(order?.promo_discount ?? 0);

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
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
          {' / '}
          <Link
            href="/account/orders"
            style={{ color: palette.primaryLight, textDecoration: 'none' }}
          >
            Мои заказы
          </Link>
          {order ? ` / Заказ ${order.number}` : ''}
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
            {order ? `Заказ ${order.number}` : 'Заказ'}
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
              Заказ не найден
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
              К списку заказов
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
                от{' '}
                {new Date(order.date_created).toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </Typography>
              {order.payment_status && (
                <Typography
                  sx={{
                    fontFamily: fontBody,
                    fontSize: 14,
                    color: order.payment_status === 'paid' ? '#2e7d32' : palette.primaryLight,
                  }}
                >
                  {PAYMENT_LABELS[order.payment_status] || order.payment_status}
                </Typography>
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
                      Товар
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
                      Кол-во
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
                      Цена
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
                      Сумма
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
                          {money(price)}
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
                          {money(price * item.quantity)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Totals + delivery */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3,
                alignItems: 'flex-start',
              }}
            >
              {/* Delivery / recipient */}
              <Box
                sx={{
                  flex: 1,
                  bgcolor: palette.bgLight,
                  borderRadius: '20px',
                  p: 3,
                  width: '100%',
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
                  Доставка
                </Typography>
                {ds?.name && (
                  <Row
                    label="Способ"
                    value={`${ds.name}${order.delivery_tariff_type ? `, ${TARIFF_LABELS[order.delivery_tariff_type] || order.delivery_tariff_type}` : ''}`}
                  />
                )}
                {address && <Row label="Адрес" value={address} />}
                {(order.recipient_name || order.recipient_phone) && (
                  <Row
                    label="Получатель"
                    value={[order.recipient_name, order.recipient_phone].filter(Boolean).join(', ')}
                  />
                )}
                {order.track_number && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: fontBody,
                        fontSize: 13,
                        color: palette.primaryLight,
                        minWidth: 90,
                      }}
                    >
                      Трек-номер
                    </Typography>
                    <Tooltip title="Отследить посылку">
                      <Box
                        component={isCdek ? 'a' : 'span'}
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
                          fontFamily: fontBody,
                          fontSize: 13,
                          color: isCdek ? '#2196F3' : palette.primary,
                          textDecoration: isCdek ? 'underline' : 'none',
                        }}
                      >
                        <LocalShipping sx={{ fontSize: 15 }} />
                        {order.track_number}
                      </Box>
                    </Tooltip>
                  </Box>
                )}
                {!ds?.name && !address && !order.track_number && (
                  <Typography
                    sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primaryLight }}
                  >
                    Информация о доставке появится после оформления отгрузки.
                  </Typography>
                )}
              </Box>

              {/* Totals */}
              <Box
                sx={{
                  width: { xs: '100%', md: 320 },
                  bgcolor: palette.bgLight,
                  borderRadius: '20px',
                  p: 3,
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
                  Итог
                </Typography>
                <TotalRow label="Товары" value={money(order.subtotal)} />
                {discount > 0 && <TotalRow label="Скидка" value={`−${money(discount)}`} />}
                {promoDiscount > 0 && (
                  <TotalRow
                    label={`Промокод${order.promo_code?.code ? ` ${order.promo_code.code}` : ''}`}
                    value={`−${money(promoDiscount)}`}
                    accent
                  />
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
                    К оплате
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: fontMain,
                      fontSize: 20,
                      fontWeight: 600,
                      color: palette.primary,
                    }}
                  >
                    {money(order.total)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
      <Typography
        sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, minWidth: 90 }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primary }}>
        {value}
      </Typography>
    </Box>
  );
}

function TotalRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
      <Typography
        sx={{
          fontFamily: fontBody,
          fontSize: 14,
          color: accent ? '#e6007e' : palette.primaryLight,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: fontBody,
          fontSize: 14,
          color: accent ? '#e6007e' : palette.primary,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
