'use client';

import { Box, Typography } from '@mui/material';
import { useTranslations, useLocale } from 'next-intl';
import { fmtMoney } from '@/lib/money';
import type { AutoPromoData } from './useAutoPromo';

/**
 * Basket plashka shown when an auto-applied BOGO promo is active.
 * Replaces the "enter promo code" input.
 */
export function PromoPlashka({ data }: { data: AutoPromoData }) {
  const t = useTranslations();
  const locale = useLocale();
  const bcp47 = locale === 'tr' ? 'tr-TR' : 'en-US';

  const gifts = data.free_quantity || 0;
  const formattedAmount = fmtMoney(data.discount_amount, 'TRY', bcp47);

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
            ? t('promo.gift', { count: gifts, amount: formattedAmount })
            : t('promo.giftAdd')}
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
