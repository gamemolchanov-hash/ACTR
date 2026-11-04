'use client';

import { useTranslations } from 'next-intl';
import { Typography, type SxProps, type Theme } from '@mui/material';
import { stockLabel } from '@/lib/checkout';
import type { ValidatedCartItem } from '@/lib/domain-types';

/**
 * The note under a basket line the warehouse does not cover right now: "Out of stock" /
 * "Only N left in stock" (basket and "Your order" on the checkout; port of ACRU
 * d16418a, 04.11.2026) — instead of ARM's code `insufficient_stock`. Lines in stock
 * render nothing.
 */
export function StockNote({
  item,
  sx,
}: {
  item: Pick<ValidatedCartItem, 'valid' | 'quantity' | 'available'>;
  sx?: SxProps<Theme>;
}) {
  const t = useTranslations();
  const label = stockLabel(item);
  if (!label) return null;
  return (
    <Typography data-testid="sf-stock-note" sx={[{ color: '#d32f2f' }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {label.key === 'basket.stock.short' ? t(label.key, { count: label.count }) : t(label.key)}
    </Typography>
  );
}
