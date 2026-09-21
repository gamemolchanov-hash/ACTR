'use client';

/**
 * «−N% Creator Club» — why THIS price is lower than the catalogue one (port of
 * the .ru storefront badge, FBG-600).
 *
 * Takes the two prices it describes, not a ready percent: a member's rate is
 * positive on every page, so a percent-only badge could end up under the full
 * price of a product outside the discounted categories. Deriving it from the
 * prices makes that impossible — no member price → no badge, and the percent
 * always matches the numbers printed next to it.
 *
 * One component for the catalogue card, the product page and the basket.
 */

import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import { useTranslations } from 'next-intl';
import { memberDiscountPercentOf } from '@/lib/member-price';
import { palette } from '@/lib/theme';

export function MemberPriceBadge({
  listPrice,
  memberPrice,
  sx,
}: {
  /** Catalogue price of the line. */
  listPrice?: number | null;
  /** Member price of the same line — absent means this line is not discounted. */
  memberPrice?: number | null;
  sx?: SxProps<Theme>;
}) {
  const t = useTranslations('memberPrice');
  const percent = memberDiscountPercentOf([{ unitPrice: listPrice, memberPrice }]);
  if (percent <= 0) return null;

  return (
    <Box
      data-testid="sf-member-badge"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '40px',
        border: `1px solid ${palette.primary}`,
        bgcolor: palette.bgLight,
        px: 1.25,
        py: '2px',
        ...sx,
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Futura PT", Helvetica, sans-serif',
          fontWeight: 500,
          fontSize: 12,
          lineHeight: '16px',
          color: palette.primary,
          whiteSpace: 'nowrap',
        }}
      >
        {t('badge', { percent })}
      </Typography>
    </Box>
  );
}
