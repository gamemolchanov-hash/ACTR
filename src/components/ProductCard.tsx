'use client';

import { Box, Card, CardContent, Typography, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import type { Product } from '@/lib/api';
import { imgCard } from '@/lib/image-url';
import { fmtMoney } from '@/lib/money';
// BOGO HOOK START
import { PromoBadge } from '@/features/promo-bogo';
// BOGO HOOK END

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string, quantity: number) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const bcp47 = locale === 'tr' ? 'tr-TR' : 'en-US';

  const [quantity, setQuantity] = useState(1);
  const available = product.bp_available ?? 0;
  const primaryImage = product.images?.sort((a, b) => a.sort - b.sort)[0] ?? null;

  return (
    <Card
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
      {/* BOGO HOOK START */}
      <PromoBadge product={product} />
      {/* BOGO HOOK END */}
      <Link
        href={`/catalog/${product.category?.slug ?? 'all'}/${product.slug ?? product.id}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        {/* Best seller chip — top left, above image */}
        {available > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 2, pt: 1.5 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: `1px solid ${palette.primaryLight}`,
                borderRadius: '40px',
                px: 1.5,
                py: '4px',
                bgcolor: 'white',
              }}
            >
              <img src="/icons/trending-topic.png" alt="" style={{ width: 17, height: 17 }} />
              <Typography
                sx={{
                  fontFamily: '"Futura PT", Helvetica, sans-serif',
                  fontSize: 12,
                  color: palette.primary,
                  lineHeight: 1,
                }}
              >
                {t('catalog.bestSeller')}
              </Typography>
            </Box>
          </Box>
        )}

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
            p: 2,
            '&:last-child': { pb: 2 },
          }}
        >
          {/* Name */}
          <Typography
            sx={{
              fontFamily: '"Futura PT", Helvetica, sans-serif',
              fontWeight: 500,
              fontSize: 16,
              lineHeight: '22px',
              textTransform: 'uppercase',
              color: palette.primary,
              mb: '4px',
              textAlign: 'center',
            }}
          >
            {product.name}
          </Typography>
        </CardContent>
      </Link>

      <Box sx={{ px: 2, pb: 2 }}>
        {/* Price — locale-aware (WR-01/WR-05) */}
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 400,
            color: palette.primary,
            mb: '12px',
            textAlign: 'center',
          }}
        >
          {fmtMoney(product.price, 'TRY', bcp47)}
        </Typography>

        {/* Actions: quantity + "Add to cart" */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 'auto' }}>
          {/* Quantity selector */}
          <Box
            sx={{
              display: 'flex',
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

          {/* Add to cart */}
          <Box
            component="button"
            onClick={() => onAddToCart?.(product.id, quantity)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${palette.primary}`,
              borderRadius: '10px',
              height: 40,
              flex: 1,
              bgcolor: palette.primary,
              color: 'white',
              fontFamily: '"Futura PT", Helvetica, sans-serif',
              fontSize: 14,
              fontWeight: 450,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#2a3d85' },
              '&:disabled': { opacity: 0.5, cursor: 'default' },
            }}
            disabled={available <= 0}
          >
            {t('catalog.addToCart')}
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
