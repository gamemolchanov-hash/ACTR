'use client';

import { Box, Typography } from '@mui/material';
import Link from 'next/link';
import { palette } from '@/lib/theme';

const CDEK_OPTIONS = [
  { name: 'СДЭК (Доставка курьером)', time: 'От 2х дней' },
  { name: 'СДЭК (Постамат)', time: 'От 2х дней' },
  { name: 'СДЭК (Пункт выдачи заказов (ПВЗ))', time: 'От 2х дней' },
];

export default function DeliveryPage() {
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
          {' / Условия доставки'}
        </Typography>

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 24, md: 40 },
            lineHeight: { xs: '30px', md: '50px' },
            fontWeight: 450,
          }}
        >
          УСЛОВИЯ ДОСТАВКИ И ОПЛАТЫ
        </Typography>
      </Box>

      {/* ── Delivery block ── */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 3, md: 4 } }}>
        <Box
          sx={{
            bgcolor: palette.bgLight,
            borderRadius: '20px',
            position: 'relative',
            overflow: { xs: 'hidden', md: 'visible' },
            pb: { xs: 4, md: 5 },
          }}
        >
          {/* Decorative bubbles image */}
          <Box
            component="img"
            src="/images/delivery/decorative-bubbles.png"
            alt=""
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              right: 0,
              top: -182,
              width: 400,
              pointerEvents: 'none',
            }}
          />

          {/* Delivery title */}
          <Typography
            sx={{
              fontFamily: '"Futura PT", Helvetica',
              fontSize: 24,
              fontWeight: 450,
              lineHeight: '31px',
              color: palette.primary,
              textTransform: 'uppercase',
              mx: { xs: 2.5, md: 5 },
              pt: { xs: 3, md: 5 },
            }}
          >
            Доставка
          </Typography>

          {/* Delivery description */}
          <Typography
            sx={{
              fontFamily: '"Futura PT", Helvetica',
              fontSize: 18,
              fontWeight: 450,
              lineHeight: '21px',
              color: palette.primary,
              mx: { xs: 2.5, md: 5 },
              mt: 5,
              mr: { md: '420px' },
            }}
          >
            Доставка заказов СДЭК рассчитывается индивидуально по каждому заказу согласно тарифам
            СДЭК. Наш интернет-магазин предлагает несколько вариантов доставки курьерской службой
            СДЭК:
          </Typography>

          {/* CDEK options */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2.5,
              mx: { xs: 2.5, md: 5 },
              mr: { md: '420px' },
              mt: 5,
            }}
          >
            {CDEK_OPTIONS.map((opt) => (
              <Box
                key={opt.name}
                sx={{
                  border: `1px solid ${palette.primaryLight}`,
                  borderRadius: '20px',
                  p: 2.5,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"Futura PT", Helvetica',
                    fontSize: 18,
                    fontWeight: 400,
                    lineHeight: '20px',
                    color: palette.primary,
                  }}
                >
                  {opt.name}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Futura PT", Helvetica',
                    fontSize: 18,
                    fontWeight: 450,
                    lineHeight: '20px',
                    color: palette.primary,
                    mt: 1,
                  }}
                >
                  {opt.time}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Moscow delivery note */}
          <Typography
            sx={{
              fontFamily: '"Futura PT", Helvetica',
              fontSize: 18,
              fontWeight: 450,
              lineHeight: '21px',
              color: palette.primary,
              mx: { xs: 2.5, md: 5 },
              mr: { md: '420px' },
              mt: 5,
            }}
          >
            Доставка курьерской службой по Москве на следующий день.
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Futura PT", Helvetica',
              fontSize: 18,
              fontWeight: 450,
              lineHeight: '21px',
              color: palette.primary,
              mx: { xs: 2.5, md: 5 },
              mr: { md: '420px' },
              mt: 2,
            }}
          >
            Заказ будет доставлен Вам на следующий день, если Вы произвели оплату до 17.00 текущего
            дня.
            <br />
            Прием заказов: пн-пт.
            <br />
            Отгрузка заказов происходит ежедневно.
          </Typography>

          {/* Free delivery banner */}
          <Box
            sx={{
              bgcolor: palette.primary,
              borderRadius: '20px',
              mx: { xs: 2.5, md: 5 },
              mt: 5,
              p: 2.5,
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Futura PT", Helvetica',
                fontSize: { xs: 20, md: 24 },
                fontWeight: 450,
                lineHeight: '31px',
                color: 'white',
                textTransform: 'uppercase',
              }}
            >
              Доставка бесплатная
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Payment block ── */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: 5, mb: { xs: 4, md: 8 } }}>
        <Box
          sx={{
            border: `1px solid ${palette.primary}`,
            borderRadius: '20px',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            overflow: 'hidden',
          }}
        >
          {/* Left: payment info */}
          <Box
            sx={{
              flex: 5,
              p: { xs: 3, md: 5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Futura PT", Helvetica',
                  fontSize: 24,
                  fontWeight: 450,
                  lineHeight: '31px',
                  color: palette.primary,
                  textTransform: 'uppercase',
                }}
              >
                Оплата
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Futura PT", Helvetica',
                  fontSize: 18,
                  fontWeight: 400,
                  lineHeight: '20px',
                  color: palette.primary,
                  mt: 2.5,
                }}
              >
                К оплате принимаются платежные карты: VISA Inc, MasterCard WorldWide, МИР. Для
                оплаты товара банковской картой при оформлении заказа в интернет-магазине выберите
                способ оплаты: банковской картой.
              </Typography>
            </Box>

            {/* Payment systems image */}
            <Box
              component="img"
              src="/images/delivery/payment-systems.png"
              alt="Платёжные системы"
              sx={{ height: 25, width: 'auto', mt: { xs: 4, md: 5 }, alignSelf: 'flex-start' }}
            />
          </Box>

          {/* Right: card details */}
          <Box
            sx={{
              flex: 4,
              bgcolor: palette.bgLight,
              p: { xs: 3, md: 5 },
              borderRadius: '20px',
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Futura PT", Helvetica',
                fontSize: 20,
                fontWeight: 500,
                lineHeight: '26px',
                color: palette.primary,
                textTransform: 'uppercase',
              }}
            >
              При оплате заказа банковской картой, обработка платежа происходит на авторизационной
              странице банка, где Вам необходимо ввести данные Вашей банковской карты:
            </Typography>
            <Box
              component="ol"
              sx={{
                fontFamily: '"Futura PT", Helvetica',
                fontSize: 18,
                fontWeight: 400,
                lineHeight: '24px',
                color: palette.primary,
                mt: 2.5,
                pl: 2.5,
              }}
            >
              <li>тип карты</li>
              <li>номер карты,</li>
              <li>срок действия карты</li>
              <li>Имя держателя карты</li>
              <li>CVC-код</li>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
