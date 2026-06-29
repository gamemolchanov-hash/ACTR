'use client';

import { Box, Typography } from '@mui/material';
import type { AutoPromoData } from './useAutoPromo';

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';

/**
 * Basket plashka shown when an auto-applied BOGO promo is active.
 * Replaces the "enter promo code" input.
 */
export function PromoPlashka({ data }: { data: AutoPromoData }) {
  const gifts = data.free_quantity || 0;
  const giftWord = pluralize(gifts, ['товар', 'товара', 'товаров']);

  return (
    <Box
      sx={{
        bgcolor: '#fff5f7',
        border: '1px solid #e91e63',
        borderRadius: '12px',
        px: 2.5,
        py: 2,
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 0.5,
        maxWidth: 520,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            bgcolor: '#e91e63',
            color: 'white',
            borderRadius: '20px',
            px: 1.5,
            py: '4px',
            fontFamily: '"Futura PT", Helvetica, sans-serif',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          1+1
        </Box>
        <Typography
          sx={{
            fontFamily: '"Futura PT", Helvetica, sans-serif',
            fontWeight: 500,
            fontSize: 18,
            color: '#c2185b',
          }}
        >
          {gifts > 0
            ? `Подарок: ${gifts} ${giftWord} (−${fmt(data.discount_amount)})`
            : 'Добавьте ещё один товар акции — он будет в подарок'}
        </Typography>
      </Box>
      {data.description && (
        <Typography
          sx={{
            fontFamily: '"Futura PT", Helvetica, sans-serif',
            fontWeight: 300,
            fontSize: 13,
            color: '#666',
            ml: 6,
          }}
        >
          {data.description}
        </Typography>
      )}
    </Box>
  );
}

function pluralize(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (lastDigit > 1 && lastDigit < 5) return forms[1];
  if (lastDigit === 1) return forms[0];
  return forms[2];
}
