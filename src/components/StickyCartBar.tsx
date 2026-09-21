'use client';

/**
 * Липкая панель корзины внизу экрана — порт со старой витрины OMS
 * (`services/storefront/StickyCartBar`, в свою очередь порт UX forza-brava):
 * как только в корзине что-то есть, покупатель на витринных листингах видит
 * счётчик с суммой (клик — в корзину) и кнопку «Оформить заказ». При добавлении
 * товара панель пульсирует (justAdded). Вернуть попросил владелец 21.09.2026.
 *
 * Сумма — из POST /cart/validate (side-effect-free), кешируется по составу
 * корзины И по покупателю: участнику Creator Club сервер считает «цветники»
 * по member-цене, поэтому панель показывает ту же сумму, что и корзина.
 * Панель подписана на AuthContext — вход и выход перерисовывают её сами.
 */

import { Box, Typography } from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useCart } from '@/providers/CartProvider';
import { useAuth } from '@/lib/auth-context';
import { useCurrency, useFormatLocale } from '@/providers/CurrencyProvider';
import { validateCart } from '@/lib/api';
import type { CartItem } from '@/lib/api';
import { fmtMoney } from '@/lib/money';
import { palette } from '@/lib/theme';
import { PRELAUNCH } from '@/lib/prelaunch';

const fontMain = 'LiraFix, "Futura PT", "Futura PT Fallback", "Ubuntu", Arial, sans-serif';

function cartKey(items: CartItem[]): string {
  return items
    .map((i) => `${i.productId}:${i.quantity}`)
    .sort()
    .join('|');
}

export function StickyCartBar() {
  const { items, totalQuantity, justAdded } = useCart();
  const pathname = usePathname();
  const t = useTranslations();
  const currency = useCurrency();
  const formatLocale = useFormatLocale();

  // Подписка на сессию: смена покупателя перерисовывает панель и меняет ключ
  // кеша, поэтому чужая сумма не переживает вход/выход ни на миг.
  const { customer, loading: authLoading } = useAuth();
  const customerId = customer?.id ?? null;
  const { data } = useQuery({
    queryKey: ['cart-bar-total', cartKey(items), customerId, currency],
    queryFn: () => validateCart(items),
    // Пока сессия не разрешилась, не спрашиваем: иначе участник увидит
    // прайсовую сумму до того, как придёт его member-цена.
    enabled: items.length > 0 && !authLoading && !PRELAUNCH,
    staleTime: 60_000,
  });
  // Сумма ДЛЯ ЭТОГО покупателя: скидка клуба уже вычтена, как в корзине
  // (акции/промокоды панель не считает — как и в OMS).
  const subtotal =
    data === undefined
      ? undefined
      : Math.max(
          0,
          data.data.subtotal -
            (Number((data.data as { category_discount?: number }).category_discount) || 0),
        );

  // Как в OMS и у forza-brava: панель живёт лишь на витринных листингах —
  // главной и каталоге с категориями. Страница товара, корзина, чекаут,
  // кабинет и прочие обходятся без неё.
  const segments = (pathname ?? '').split('/').filter(Boolean);
  const isCatalogSurface = pathname === '/' || (segments[0] === 'catalog' && segments.length <= 2);
  if (PRELAUNCH || totalQuantity === 0 || !isCatalogSurface) {
    return null;
  }

  return (
    <Box
      data-testid="sf-sticky-cart"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        bgcolor: palette.primary,
        pb: 'env(safe-area-inset-bottom)',
        boxShadow: justAdded
          ? '0 -4px 24px rgba(51, 74, 159, 0.55)'
          : '0 -4px 16px rgba(31, 42, 84, 0.25)',
        transition: 'box-shadow 0.3s ease-out',
      }}
    >
      <Box
        sx={{
          maxWidth: 1300,
          mx: 'auto',
          px: { xs: 1.5, sm: 2 },
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, sm: 1.5 },
        }}
      >
        <Box
          component={Link}
          href="/basket"
          data-testid="sf-sticky-cart-summary"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.75, sm: 1 },
            height: 40,
            px: { xs: 1.5, sm: 2 },
            flexShrink: 0,
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.25)',
            textDecoration: 'none',
            transform: justAdded ? 'scale(1.06)' : 'none',
            transition: 'transform 0.3s ease-out',
            '&:active': { transform: 'scale(0.97)' },
          }}
        >
          <ShoppingCartOutlinedIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }} />
          <Typography
            sx={{
              fontFamily: fontMain,
              // Узкие телефоны (< 360 px): сумма и кнопка ужимаются от ширины экрана, чтобы
              // «Оформить заказ» не переносился (владелец 21.09, 334 px + «5 192,50 ₽»).
              fontSize: { xs: 'clamp(12px, 3.6vw, 15px)', sm: 15 },
              fontWeight: 700,
              color: 'white',
              transform: justAdded ? 'scale(1.25)' : 'none',
              transition: 'transform 0.3s ease-out',
            }}
          >
            {totalQuantity}
          </Typography>
          {subtotal !== undefined && (
            <>
              <Box sx={{ width: '1px', height: 14, bgcolor: 'rgba(255,255,255,0.25)' }} />
              <Typography
                sx={{
                  fontFamily: fontMain,
                  fontSize: { xs: 'clamp(12px, 3.6vw, 15px)', sm: 15 },
                  fontWeight: 700,
                  color: 'white',
                  whiteSpace: 'nowrap',
                }}
              >
                {fmtMoney(subtotal, currency, formatLocale)}
              </Typography>
            </>
          )}
        </Box>

        <Box
          component={Link}
          href="/checkout"
          data-testid="sf-sticky-cart-checkout"
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 0.5, sm: 1 },
            height: 40,
            px: 1,
            borderRadius: '999px',
            bgcolor: 'white',
            color: palette.primary,
            textDecoration: 'none',
            fontFamily: fontMain,
            fontSize: { xs: 'clamp(11px, 3.4vw, 15px)', sm: 15 },
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: { xs: '0.02em', sm: '0.08em' },
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            '&:active': { transform: 'scale(0.98)' },
            '&:hover': { bgcolor: '#f0f3ff' },
          }}
        >
          {t('cart.stickyBuy')}
          <ArrowForwardIcon sx={{ fontSize: { xs: 14, sm: 16 }, flexShrink: 0 }} />
        </Box>
      </Box>
    </Box>
  );
}
