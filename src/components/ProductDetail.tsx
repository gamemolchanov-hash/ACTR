'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import {
  Box,
  Typography,
  Breadcrumbs,
  Divider,
  Paper,
  IconButton,
  Button,
  CircularProgress,
  Modal,
  Fade,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchProduct } from '@/lib/api';
import type { Product } from '@/lib/api';
import { palette } from '@/lib/theme';
import { useCart } from '@/providers/CartProvider';
import { useRecentlyViewed } from '@/lib/useRecentlyViewed';
import { ProductReviews } from './ProductReviews';
import { fmtMoney } from '@/lib/money';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { imgDetail, imgThumb, imgCard } from '@/lib/image-url';

const fontMain = '"Futura PT", Helvetica, sans-serif';

interface ProductDetailProps {
  productId: string;
}

function RecentlyViewedCard({
  item,
  bcp47,
}: {
  item: import('@/lib/useRecentlyViewed').RecentlyViewedProduct;
  bcp47: string;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [imgFade, setImgFade] = useState(true);
  const imgs = item.images?.length ? item.images : item.image ? [item.image] : [];
  const currentImg = imgs[imgIdx] ?? null;

  const switchImg = (dir: 1 | -1) => {
    setImgFade(false);
    setTimeout(() => {
      setImgIdx((i) => (i + dir + imgs.length) % imgs.length);
      setImgFade(true);
    }, 150);
  };

  return (
    <Box sx={{ flexShrink: 0, width: { xs: 200, md: 220 } }}>
      <Link
        href={`/catalog/${item.categorySlug ?? 'all'}/${item.slug ?? item.id}`}
        style={{ textDecoration: 'none' }}
      >
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: '20px',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'translateY(-4px)' },
          }}
        >
          {/* Image area with arrows */}
          <Box
            sx={{
              width: '100%',
              aspectRatio: '1 / 1',
              bgcolor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {currentImg ? (
              <Box
                component="img"
                src={imgCard(currentImg)}
                alt={item.name}
                sx={{
                  maxWidth: '80%',
                  maxHeight: '80%',
                  objectFit: 'contain',
                  opacity: imgFade ? 1 : 0,
                  transition: 'opacity 0.15s ease-in-out',
                }}
              />
            ) : (
              <Typography sx={{ color: palette.primaryLight, fontSize: 12 }}>—</Typography>
            )}
            {imgs.length > 1 && (
              <>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    switchImg(-1);
                  }}
                  sx={{
                    position: 'absolute',
                    left: 4,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: palette.primary,
                    bgcolor: 'rgba(255,255,255,0.7)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                    width: 28,
                    height: 28,
                  }}
                >
                  <ChevronLeftIcon sx={{ fontSize: 20 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    switchImg(1);
                  }}
                  sx={{
                    position: 'absolute',
                    right: 4,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: palette.primary,
                    bgcolor: 'rgba(255,255,255,0.7)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                    width: 28,
                    height: 28,
                  }}
                >
                  <ChevronRightIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </>
            )}
          </Box>
          {/* Name */}
          <Typography
            sx={{
              fontFamily: '"Futura PT", Helvetica, sans-serif',
              fontWeight: 500,
              fontSize: 16,
              lineHeight: '20px',
              textTransform: 'uppercase',
              color: palette.primary,
              px: 1.5,
              pt: 1.5,
              textAlign: 'center',
            }}
          >
            {item.name}
          </Typography>
          {/* Price — locale-aware */}
          <Typography
            sx={{
              fontSize: 14,
              color: palette.primary,
              opacity: 0.6,
              textAlign: 'center',
              pb: 2,
              pt: 0.5,
            }}
          >
            {fmtMoney(item.price, 'TRY', bcp47)}
          </Typography>
        </Box>
      </Link>
    </Box>
  );
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const t = useTranslations();
  const locale = useLocale();
  const bcp47 = locale === 'tr' ? 'tr-TR' : 'en-US';

  const { addItem } = useCart();
  const { items: recentlyViewed, addViewed } = useRecentlyViewed(productId);
  const recentScrollRef = useRef<HTMLDivElement>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lbLoaded, setLbLoaded] = useState(false);
  const [lbZoom, setLbZoom] = useState(1);
  const [lbPan, setLbPan] = useState({ x: 0, y: 0 });
  const [quantity, setQuantity] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const product = data?.data;

  // Track in recently viewed
  useEffect(() => {
    if (product) addViewed(product);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const images = useMemo(() => {
    if (!product?.images?.length) return [];
    return [...product.images].sort((a, b) => a.sort - b.sort);
  }, [product?.images]);

  const selectedImage = images[selectedImageIndex] ?? null;
  const available = product?.bp_available ?? 0;

  const characteristics = useMemo(() => {
    if (!product) return [];
    const chars: { label: string; value: string }[] = [];
    if (product.sku) chars.push({ label: t('product.sku'), value: product.sku });
    if (product.weight != null && product.weight > 0) {
      const grams = product.weight * 1000;
      chars.push({
        label: t('product.weight'),
        value: grams >= 1 ? `${Math.round(grams)} ${t('product.weightUnit')}` : `${grams} ${t('product.weightUnit')}`,
      });
    }
    if (product.volume != null && product.volume > 0) {
      const ml = product.volume * 1e6;
      chars.push({ label: t('product.volume'), value: `${Math.round(ml)} ${t('product.volumeUnit')}` });
    }
    if (product.length && product.width && product.height) {
      chars.push({
        label: t('product.dimensions'),
        value: `${product.length} x ${product.width} x ${product.height} ${t('product.dimensionUnit')}`,
      });
    }
    if (product.category) chars.push({ label: t('product.category'), value: product.category.name });
    return chars;
  }, [product, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddToCart = useCallback(() => {
    if (product) addItem(product.id, quantity);
  }, [product, quantity, addItem]);

  // Loading
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: palette.primary }} />
      </Box>
    );
  }

  // Error / not found
  if (error || !product) {
    return (
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: 2, py: 6, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          {t('product.notFound')}
        </Typography>
        <Link href="/catalog" style={{ color: palette.primary, fontSize: 18 }}>
          {t('product.backToCatalog')}
        </Link>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', px: 2, py: { xs: 2, md: 3 } }}>
      {/* ── Product Section ── */}
      <Grid container spacing={4} alignItems="flex-start">
        {/* Left: Image gallery */}
        <Grid item xs={12} md={5}>
          {/* Main image */}
          <Box
            onClick={() => {
              if (selectedImage) {
                setLbLoaded(false);
                setLbZoom(1);
                setLbPan({ x: 0, y: 0 });
                setLightboxOpen(true);
              }
            }}
            sx={{
              bgcolor: palette.bgLight,
              borderRadius: '20px',
              height: { xs: 350, md: 612 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              cursor: selectedImage ? 'zoom-in' : 'default',
            }}
          >
            {selectedImage ? (
              <Box
                component="img"
                src={imgDetail(selectedImage.file_path)}
                alt={product.name}
                sx={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
              />
            ) : (
              <Typography sx={{ color: palette.primaryLight, fontSize: 18 }}>
                {product.sku}
              </Typography>
            )}
          </Box>

          {/* Thumbnails */}
          {images.length > 1 && (
            <Box sx={{ display: 'flex', gap: 2, mt: 2, overflowX: 'auto' }}>
              {images.map((img, i) => (
                <Box
                  key={img.id}
                  onClick={() => setSelectedImageIndex(i)}
                  sx={{
                    width: { xs: 100, md: 160 },
                    height: { xs: 96, md: 150 },
                    flexShrink: 0,
                    bgcolor: palette.bgLight,
                    borderRadius: '20px',
                    border:
                      i === selectedImageIndex
                        ? `2px solid ${palette.primary}`
                        : `1px solid ${palette.primaryLight}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <Box
                    component="img"
                    src={imgThumb(img.file_path)}
                    alt={`${product.name} - ${i + 1}`}
                    sx={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }}
                  />
                </Box>
              ))}
            </Box>
          )}

          {/* Image Lightbox */}
          <Modal
            open={lightboxOpen}
            onClose={() => {
              setLightboxOpen(false);
              setLbZoom(1);
              setLbPan({ x: 0, y: 0 });
            }}
            closeAfterTransition
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Fade in={lightboxOpen}>
              <Box
                onClick={() => {
                  if (lbZoom === 1) {
                    setLightboxOpen(false);
                    setLbZoom(1);
                    setLbPan({ x: 0, y: 0 });
                  }
                }}
                sx={{
                  position: 'relative',
                  outline: 'none',
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Close button */}
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxOpen(false);
                    setLbZoom(1);
                    setLbPan({ x: 0, y: 0 });
                  }}
                  sx={{
                    position: 'absolute',
                    top: -40,
                    right: -8,
                    color: 'white',
                    zIndex: 2,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </IconButton>

                {/* Prev arrow */}
                {images.length > 1 && (
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setLbZoom(1);
                      setLbPan({ x: 0, y: 0 });
                      setLbLoaded(false);
                      setSelectedImageIndex((i) => (i - 1 + images.length) % images.length);
                    }}
                    sx={{
                      position: 'absolute',
                      left: { xs: 4, md: -56 },
                      color: 'white',
                      bgcolor: 'rgba(0,0,0,0.3)',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
                      width: 44,
                      height: 44,
                      zIndex: 2,
                    }}
                  >
                    <ChevronLeftIcon sx={{ fontSize: 28 }} />
                  </IconButton>
                )}

                {/* Image container with zoom */}
                {selectedImage && (
                  <Box
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (lbZoom > 1) {
                        setLbZoom(1);
                        setLbPan({ x: 0, y: 0 });
                      } else {
                        setLbZoom(2.5);
                      }
                    }}
                    onWheel={(e) => {
                      e.stopPropagation();
                      const next = Math.min(5, Math.max(1, lbZoom + (e.deltaY < 0 ? 0.4 : -0.4)));
                      if (next === 1) setLbPan({ x: 0, y: 0 });
                      setLbZoom(next);
                    }}
                    onMouseDown={(e) => {
                      if (lbZoom <= 1) return;
                      e.preventDefault();
                      const startX = e.clientX - lbPan.x;
                      const startY = e.clientY - lbPan.y;
                      const onMove = (ev: MouseEvent) =>
                        setLbPan({ x: ev.clientX - startX, y: ev.clientY - startY });
                      const onUp = () => {
                        window.removeEventListener('mousemove', onMove);
                        window.removeEventListener('mouseup', onUp);
                      };
                      window.addEventListener('mousemove', onMove);
                      window.addEventListener('mouseup', onUp);
                    }}
                    onTouchStart={(e) => {
                      if (lbZoom <= 1 || e.touches.length !== 1) return;
                      const t2 = e.touches[0];
                      const startX = t2.clientX - lbPan.x;
                      const startY = t2.clientY - lbPan.y;
                      const onMove = (ev: TouchEvent) => {
                        ev.preventDefault();
                        const tt = ev.touches[0];
                        setLbPan({ x: tt.clientX - startX, y: tt.clientY - startY });
                      };
                      const onEnd = () => {
                        window.removeEventListener('touchmove', onMove);
                        window.removeEventListener('touchend', onEnd);
                      };
                      window.addEventListener('touchmove', onMove, { passive: false });
                      window.addEventListener('touchend', onEnd);
                    }}
                    sx={{
                      position: 'relative',
                      overflow: 'hidden',
                      maxWidth: '90vw',
                      maxHeight: '85vh',
                      borderRadius: '8px',
                      cursor: lbZoom > 1 ? 'grab' : 'zoom-in',
                      '&:active': { cursor: lbZoom > 1 ? 'grabbing' : 'zoom-in' },
                      userSelect: 'none',
                    }}
                  >
                    {/* Loading spinner */}
                    {!lbLoaded && (
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1,
                        }}
                      >
                        <CircularProgress sx={{ color: 'white' }} />
                      </Box>
                    )}
                    {/* Blurred preview while loading */}
                    {!lbLoaded && (
                      <Box
                        component="img"
                        src={imgDetail(selectedImage.file_path)}
                        alt=""
                        sx={{
                          maxWidth: '90vw',
                          maxHeight: '85vh',
                          objectFit: 'contain',
                          filter: 'blur(8px)',
                          opacity: 0.6,
                        }}
                      />
                    )}
                    {/* Full-res image */}
                    <Box
                      component="img"
                      src={`/product-images/${selectedImage.file_path}`}
                      alt={product.name}
                      onLoad={() => setLbLoaded(true)}
                      sx={{
                        maxWidth: '90vw',
                        maxHeight: '85vh',
                        objectFit: 'contain',
                        transform: `scale(${lbZoom}) translate(${lbPan.x / lbZoom}px, ${lbPan.y / lbZoom}px)`,
                        transition: lbZoom === 1 ? 'transform 0.2s ease-out' : 'none',
                        display: lbLoaded ? 'block' : 'none',
                      }}
                    />
                  </Box>
                )}

                {/* Next arrow */}
                {images.length > 1 && (
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setLbZoom(1);
                      setLbPan({ x: 0, y: 0 });
                      setLbLoaded(false);
                      setSelectedImageIndex((i) => (i + 1) % images.length);
                    }}
                    sx={{
                      position: 'absolute',
                      right: { xs: 4, md: -56 },
                      color: 'white',
                      bgcolor: 'rgba(0,0,0,0.3)',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
                      width: 44,
                      height: 44,
                      zIndex: 2,
                    }}
                  >
                    <ChevronRightIcon sx={{ fontSize: 28 }} />
                  </IconButton>
                )}

                {/* Bottom bar: counter + zoom hint */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -36,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  {images.length > 1 && (
                    <Typography sx={{ color: 'white', fontSize: 14, fontFamily: fontMain }}>
                      {selectedImageIndex + 1} / {images.length}
                    </Typography>
                  )}
                  <Typography
                    sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: fontMain }}
                  >
                    {lbZoom > 1 ? `${Math.round(lbZoom * 100)}%` : t('product.zoomHint')}
                  </Typography>
                </Box>
              </Box>
            </Fade>
          </Modal>
        </Grid>

        {/* Right: Product info */}
        <Grid item xs={12} md={7}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator="/"
            sx={{ mb: 1, '& .MuiBreadcrumbs-separator': { color: palette.primaryLight } }}
          >
            <Link
              href="/"
              style={{
                textDecoration: 'none',
                color: palette.primaryLight,
                fontFamily: '"Inter", Helvetica',
                fontSize: 13,
              }}
            >
              {t('common.home')}
            </Link>
            <Link
              href="/catalog"
              style={{
                textDecoration: 'none',
                color: palette.primaryLight,
                fontFamily: '"Inter", Helvetica',
                fontSize: 13,
              }}
            >
              {t('nav.catalog')}
            </Link>
            {product.category && (
              <Link
                href={`/catalog/${product.category.slug}`}
                style={{
                  textDecoration: 'none',
                  color: palette.primaryLight,
                  fontFamily: '"Inter", Helvetica',
                  fontSize: 13,
                }}
              >
                {product.category.name}
              </Link>
            )}
          </Breadcrumbs>

          {/* Stock chip */}
          {available > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  px: '25px',
                  py: '10px',
                  bgcolor: 'white',
                  borderRadius: '40px',
                  border: `1px solid ${palette.primary}`,
                }}
              >
                <img src="/icons/check-circle.svg" alt="" width={22} height={22} />
                <Typography
                  sx={{
                    fontFamily: '"Futura PT", Helvetica',
                    fontWeight: 450,
                    color: palette.primary,
                    fontSize: 14,
                    lineHeight: '14px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('product.inStock')}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Title */}
          <Typography
            variant="h1"
            sx={{
              mb: 1,
            }}
          >
            {product.name}
          </Typography>

          {/* Subtitle / short description */}
          {product.description && (
            <Typography
              variant="body1"
              sx={{
                mt: '14px',
                mb: '44px',
                lineHeight: '20px',
                whiteSpace: 'pre-line',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {product.description}
            </Typography>
          )}

          {/* Characteristics */}
          {characteristics.length > 0 && (
            <>
              <Typography variant="h2" sx={{ mt: product.description ? 0 : '44px', mb: '22px' }}>
                {t('product.characteristics')}
              </Typography>

              <Box sx={{ mb: '86px' }}>
                {characteristics.map((char, idx) => (
                  <Box key={idx}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1.5,
                      }}
                    >
                      <Typography variant="body1" sx={{ lineHeight: '20px' }}>
                        {char.label}
                      </Typography>
                      <Typography variant="body1" sx={{ lineHeight: '20px' }}>
                        {char.value}
                      </Typography>
                    </Box>
                    <Divider sx={{ borderColor: palette.primaryLight }} />
                  </Box>
                ))}
              </Box>
            </>
          )}

          {/* Price — locale-aware (WR-01/WR-05) + KDV Dahil label (D-01) */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h1">{fmtMoney(product.price, 'TRY', bcp47)}</Typography>
              <Typography variant="body1" sx={{ lineHeight: '20px' }}>
                {t('product.perUnit')}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontSize: 12,
                color: palette.primaryLight,
                fontFamily: '"Futura PT", Helvetica',
                mt: 0.5,
              }}
            >
              {t('price.kdvDahil')}
            </Typography>
          </Box>

          {/* Quantity + Add to cart */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 4, flexWrap: 'wrap' }}>
            {/* Quantity selector */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                px: '10px',
                py: '10px',
                bgcolor: palette.bgLight,
                borderRadius: '10px',
                border: `1px solid ${palette.primary}`,
                height: '51px',
              }}
            >
              <IconButton onClick={() => setQuantity((q) => Math.max(1, q - 1))} sx={{ p: 0 }}>
                <RemoveIcon sx={{ color: palette.primary, width: 30, height: 30 }} />
              </IconButton>
              <Typography
                sx={{
                  fontFamily: fontMain,
                  fontWeight: 500,
                  color: palette.primary,
                  fontSize: 18,
                  lineHeight: '21px',
                  minWidth: 24,
                  textAlign: 'center',
                  userSelect: 'none',
                }}
              >
                {quantity}
              </Typography>
              <IconButton
                onClick={() => setQuantity((q) => Math.min(available || 99, q + 1))}
                sx={{ p: 0 }}
              >
                <AddIcon sx={{ color: palette.primary, width: 30, height: 30 }} />
              </IconButton>
            </Box>

            {/* Add to cart button */}
            <Button
              variant="contained"
              startIcon={<ShoppingCartOutlinedIcon />}
              onClick={handleAddToCart}
              disabled={available <= 0}
              sx={{
                bgcolor: palette.primary,
                borderRadius: '10px',
                px: '40px',
                py: '15px',
                fontFamily: fontMain,
                fontWeight: 500,
                fontSize: 18,
                lineHeight: '21px',
                textTransform: 'none',
                height: '51px',
                '&:hover': { bgcolor: '#2a3d85' },
              }}
            >
              {t('product.addToCart')}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* ── Info Panels (Description + Usage + Application) ── */}
      {(product.detail_text || product.usage_text || product.application_text) && (
        <Grid container spacing={2} sx={{ mt: 4 }}>
          {product.detail_text && (
            <Grid item xs={12} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: '20px',
                  borderColor: palette.primaryLight,
                  p: 3,
                  minHeight: { md: 452 },
                }}
              >
                <Typography variant="h3" sx={{ mb: 2 }}>
                  {t('product.description')}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ lineHeight: '20px' }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.detail_text) }}
                />
              </Paper>
            </Grid>
          )}
          {product.usage_text && (
            <Grid item xs={12} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: '20px',
                  borderColor: palette.primaryLight,
                  p: 3,
                  minHeight: { md: 452 },
                }}
              >
                <Typography variant="h3" sx={{ mb: 2 }}>
                  {t('product.usage')}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ lineHeight: '20px' }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.usage_text) }}
                />
              </Paper>
            </Grid>
          )}
          {product.application_text && (
            <Grid item xs={12} md={6}>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: '20px',
                  borderColor: palette.primaryLight,
                  p: 3,
                  minHeight: { md: 452 },
                }}
              >
                <Typography variant="h3" sx={{ mb: 2 }}>
                  {t('product.application')}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ lineHeight: '20px' }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.application_text) }}
                />
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── Reviews (FBG-69) ── */}
      <ProductReviews productId={product.id} />

      {/* ── Recently Viewed ── */}
      {recentlyViewed.length > 0 && (
        <Box
          sx={{
            bgcolor: palette.bgLight,
            borderRadius: '20px',
            mt: 4,
            mb: 4,
            px: { xs: 2, md: 4 },
            py: 4,
          }}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
          >
            <Typography variant="h3">{t('product.recentlyViewed')}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                onClick={() => {
                  recentScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
                }}
                sx={{
                  width: 32,
                  height: 32,
                  p: 0,
                  border: '1px solid #D6DBEC',
                  borderRadius: '50%',
                }}
              >
                <svg
                  width="8"
                  height="15"
                  viewBox="0 0 8 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.5 0.5L0.5 7.5L7.5 14.5"
                    stroke="#D6DBEC"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
              <IconButton
                onClick={() => {
                  recentScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
                }}
                sx={{
                  width: 32,
                  height: 32,
                  p: 0,
                  border: '1px solid #D6DBEC',
                  borderRadius: '50%',
                }}
              >
                <svg
                  width="8"
                  height="15"
                  viewBox="0 0 8 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0.499999 0.5L7.5 7.5L0.5 14.5"
                    stroke="#D6DBEC"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
            </Box>
          </Box>

          <Box
            ref={recentScrollRef}
            sx={{
              display: 'flex',
              gap: 2.5,
              overflowX: 'auto',
              pb: 1,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {recentlyViewed.map((item) => (
              <RecentlyViewedCard key={item.id} item={item} bcp47={bcp47} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
