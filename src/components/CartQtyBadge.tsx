'use client';

import type { ReactNode } from 'react';
import { Badge, type SxProps, type Theme } from '@mui/material';
import { palette } from '@/lib/theme';

/**
 * Красный кружок с количеством ЭТОГО товара в корзине поверх кнопки «В корзину»
 * (карточка каталога, страница товара) — как счётчик у корзины в шапке
 * (владелец 22.09.2026). Ничего не рисует при нуле.
 */
export function CartQtyBadge({
  count,
  children,
  sx,
}: {
  count: number;
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Badge
      badgeContent={count}
      invisible={count <= 0}
      max={99}
      overlap="rectangular"
      data-testid="sf-cart-qty-badge"
      sx={[
        {
          '& .MuiBadge-badge': {
            bgcolor: palette.cartBadge,
            color: 'white',
            fontSize: 11,
            fontWeight: 600,
            minWidth: 18,
            height: 18,
            top: 2,
            right: 2,
            pointerEvents: 'none',
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Badge>
  );
}
