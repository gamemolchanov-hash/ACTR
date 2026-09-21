'use client';

import { Box, Card, CardContent, Typography, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import type { Product } from '@/lib/api';
import { imgCard } from '@/lib/image-url';
import { fmtMoney } from '@/lib/money';
import { PRELAUNCH } from '@/lib/prelaunch';
import { useCurrency, useFormatLocale } from '@/providers/CurrencyProvider';
import { memberPriceOf } from '@/lib/member-price';
import { MemberPriceBadge } from '@/components/MemberPriceBadge';
import { CartQtyBadge } from '@/components/CartQtyBadge';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string, quantity: number) => void;
  /** Сколько этого товара уже в корзине — красный кружок на кнопке (0 — без кружка). */
  inCartQuantity?: number;
  /** 0-based position in the catalog grid. Leading cards get LCP priority. */
  index?: number;
}

/**
 * How many leading cards are treated as above-the-fold and get LCP priority
 * (eager load + fetchPriority="high"). Mobile catalog is 1 column, desktop 3,
 * so 4 covers the first visible row without over-prioritising (FBG-226).
 */
const PRIORITY_CARD_COUNT = 4;

export function ProductCard({ product, onAddToCart, index = 0, inCartQuantity = 0 }: ProductCardProps) {
  // Creator Club member price of this row (server-side figure; null = list price).
  const memberPrice = memberPriceOf(product.price, product.member_price);
  const t = useTranslations();
  const currency = useCurrency();
  const formatLocale = useFormatLocale();

  const [quantity, setQuantity] = useState(1);
  const available = product.bp_available ?? 0;
  const primaryImage = product.images?.sort((a, b) => a.sort - b.sort)[0] ?? null;
  // LCP optimisation (FBG-226): eagerly fetch + prioritise the first row of
  // cards, lazy-load the rest so they don't compete with the LCP image.
  const priority = index < PRIORITY_CARD_COUNT;

  return (
    <Card
      data-testid="sf-catalog-product-card"
      data-sku={product.sku}
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)' },
      }}
    >
      {/* Best seller chip — absolute overlay on top-left of product image */}
      {available > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 8, md: 12 },
            left: { xs: 8, md: 16 },
            zIndex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: { xs: '4px', md: '6px' },
            border: `1px solid ${palette.primaryLight}`,
            borderRadius: '40px',
            px: { xs: 1, md: 1.5 },
            py: { xs: '3px', md: '4px' },
            bgcolor: 'white',
          }}
        >
          <img src="/icons/trending-topic.png" alt="" style={{ width: 14, height: 14 }} />
          <Typography
            sx={{
              fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica, sans-serif',
              fontSize: { xs: 11, md: 12 },
              color: palette.primary,
              lineHeight: 1,
            }}
          >
            {t('catalog.bestSeller')}
          </Typography>
        </Box>
      )}

      {product.active_promo && (
        <Box
          data-testid="sf-promo-chip"
          sx={{
            position: 'absolute',
            top: { xs: 8, md: 12 },
            right: { xs: 8, md: 12 },
            zIndex: 1,
            px: 1.2,
            py: 0.4,
            borderRadius: '12px',
            bgcolor: palette.primary,
            color: '#fff',
            fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica, sans-serif',
            fontSize: { xs: 11, md: 13 },
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {product.active_promo.label}
        </Box>
      )}

      <Link
        href={`/catalog/${product.category?.slug ?? 'all'}/${product.slug ?? product.id}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        {/* Product image */}
        <Box
          sx={{
            width: '100%',
            aspectRatio: '1 / 1',
            bgcolor: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {primaryImage ? (
            <Box
              component="img"
              src={imgCard(primaryImage.file_path)}
              alt={product.name}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding={priority ? 'auto' : 'async'}
              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <Typography sx={{ color: palette.primaryLight, fontSize: 14 }}>
              {product.sku}
            </Typography>
          )}
        </Box>

        <CardContent
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 1.25, md: 2 },
            pb: { xs: 0.5, md: 2 },
            '&:last-child': { pb: { xs: 0.5, md: 2 } },
          }}
        >
          {/* Name */}
          <Typography
            sx={{
              fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica, sans-serif',
              fontWeight: 500,
              fontSize: { xs: 13, md: 16 },
              lineHeight: { xs: '17px', md: '22px' },
              textTransform: 'uppercase',
              color: palette.primary,
              mb: '4px',
              textAlign: { xs: 'left', md: 'center' },
            }}
          >
            {product.name}
          </Typography>
          {/* Подпись: объём или категория (компактная карточка телефона, образец FBG) */}
          {(Number(product.volume_ml) > 0 || product.category?.name) && (
            <Typography
              data-testid="sf-catalog-product-subtitle"
              sx={{
                fontFamily: '"Open Sans", Helvetica, sans-serif',
                fontSize: 12,
                lineHeight: '16px',
                color: palette.primaryLight,
                textAlign: { xs: 'left', md: 'center' },
              }}
            >
              {Number(product.volume_ml) > 0
                ? t('catalog.volumeMl', { ml: Math.round(Number(product.volume_ml)) })
                : product.category?.name}
            </Typography>
          )}
        </CardContent>
      </Link>

      <Box
        sx={{
          px: { xs: 1.25, md: 2 },
          pb: { xs: 1.25, md: 2 },
          display: 'flex',
          flexDirection: { xs: 'row', md: 'column' },
          // Узкий экран: кнопка переносится под цену, а не вылезает из карточки (21.09).
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          alignItems: { xs: 'center', md: 'stretch' },
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        {/* Price — locale-aware (WR-01/WR-05) + KDV Dahil label (D-01).
            Pre-launch (FBG-427): show "coming soon" instead of the price and
            hide the (now meaningless) KDV Dahil line. */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'flex-start', md: 'center' },
            mb: { xs: 0, md: '12px' },
            minWidth: 0,
          }}
        >
          {/* Creator Club (порт .ru): участнику на «цветник» — цена участника,
              зачёркнутый прайс и плашка «−N% Creator Club»; нет member_price → как раньше. */}
          {memberPrice !== null && !PRELAUNCH ? (
            <>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
                }}
              >
                <Typography
                  data-testid="sf-member-price"
                  sx={{ fontSize: 16, fontWeight: 500, color: palette.primary, textAlign: 'center' }}
                >
                  {fmtMoney(memberPrice, currency, formatLocale)}
                </Typography>
                <Typography
                  component="s"
                  data-testid="sf-catalog-product-list-price"
                  sx={{ fontSize: 13, fontWeight: 400, color: 'rgba(51,74,159,0.45)' }}
                >
                  {fmtMoney(product.price, currency, formatLocale)}
                </Typography>
              </Box>
              <MemberPriceBadge listPrice={product.price} memberPrice={memberPrice} sx={{ mt: '4px' }} />
            </>
          ) : (
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 400,
                color: palette.primary,
                textAlign: 'center',
              }}
            >
              {PRELAUNCH ? t('prelaunch.comingSoon') : fmtMoney(product.price, currency, formatLocale)}
            </Typography>
          )}
          {/* ACTR: подпись «KDV Dahil» под ценой (D-01), в pre-launch скрыта */}
          {!PRELAUNCH && (
            <Typography
              sx={{
                fontSize: 11,
                color: palette.primaryLight,
                fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica',
                textAlign: 'center',
              }}
            >
              {t('price.kdvDahil')}
            </Typography>
          )}
        </Box>

        {/* Actions: quantity + "Add to cart" */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: { xs: 0, md: 'auto' }, flexShrink: 0 }}>
          {/* Quantity selector — на телефоне скрыт, «в корзину» кладёт одну штуку */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${palette.primary}`,
              borderRadius: '10px',
              height: 40,
              flex: 1,
            }}
          >
            <IconButton
              size="small"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              sx={{ color: palette.primary, width: 36, height: 40, borderRadius: '10px 0 0 10px' }}
            >
              <RemoveIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 500,
                color: palette.primary,
                minWidth: 24,
                textAlign: 'center',
                userSelect: 'none',
              }}
            >
              {quantity}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setQuantity((q) => Math.min(available || 99, q + 1))}
              sx={{ color: palette.primary, width: 36, height: 40, borderRadius: '0 10px 10px 0' }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* Add to cart — красный кружок с количеством этого товара в корзине (владелец 22.09) */}
          <CartQtyBadge count={inCartQuantity} sx={{ flex: { xs: '0 0 auto', md: 1 }, display: 'flex' }}>
            <Box
              component="button"
              onClick={() => onAddToCart?.(product.id, quantity)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${palette.primary}`,
                borderRadius: '10px',
                height: { xs: 36, md: 40 },
                flex: 1,
                width: { xs: 44, md: '100%' },
                bgcolor: palette.primary,
                color: 'white',
                fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica, sans-serif',
                fontSize: 14,
                fontWeight: 450,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#2a3d85' },
                '&:disabled': { opacity: 0.5, cursor: 'default' },
              }}
              disabled={available <= 0}
              aria-label={t('catalog.addToCart')}
            >
              <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                {t('catalog.addToCart')}
              </Box>
              <ShoppingCartOutlinedIcon sx={{ display: { xs: 'block', md: 'none' }, fontSize: 18 }} />
            </Box>
          </CartQtyBadge>
        </Box>
      </Box>
    </Card>
  );
}
