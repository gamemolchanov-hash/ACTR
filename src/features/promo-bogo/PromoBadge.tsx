'use client';

import { Box, Typography } from '@mui/material';
import { BADGE_LABEL, isPromoActiveNow } from './config';

/**
 * "1+1" badge for product cards.
 *
 * Renders nothing unless:
 *   - the promo is currently active (date window), AND
 *   - the BFF tagged this product with `active_promo`.
 *
 * The product is typed loose on purpose — the feature module owns the
 * shape narrowing internally so consumers can pass any product-like value.
 */
export function PromoBadge({ product }: { product: { active_promo?: { label?: string } | null } }) {
  if (!isPromoActiveNow()) return null;
  if (!product?.active_promo) return null;

  const label = product.active_promo.label || BADGE_LABEL;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 2,
        bgcolor: '#e91e63',
        color: 'white',
        borderRadius: '40px',
        px: 1.5,
        py: '4px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        pointerEvents: 'none',
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Futura PT", Helvetica, sans-serif',
          fontWeight: 600,
          fontSize: 13,
          lineHeight: 1,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
