'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Breadcrumbs,
  Link as MuiLink,
  Button,
  InputBase,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
/* custom trash icon matching Figma design */
const TrashIcon = ({ size = 28 }: { size?: number }) => (
  <img src="/icons/trash.svg" alt="" style={{ width: size, height: size }} />
);
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link } from '@/i18n/navigation';
import CloseIcon from '@mui/icons-material/Close';
import { useCart } from '@/providers/CartProvider';
import {
  validateCart,
  validatePromo,
  type ValidatedCartItem,
  type PromoValidationResult,
} from '@/lib/api';
import { palette } from '@/lib/theme';
import { imgCart, imgCartSm } from '@/lib/image-url';
import { fmtMoney } from '@/lib/money';
import { useCurrency, useFormatLocale } from '@/providers/CurrencyProvider';

/* ---- Figma design tokens (from styleguide.css) ---- */
const font = 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica';
const h1 = { fontFamily: font, fontWeight: 500, fontSize: 40, lineHeight: '50px' } as const;
const h2 = { fontFamily: font, fontWeight: 500, fontSize: 24 } as const;
const h3 = { fontFamily: font, fontWeight: 400, fontSize: 20 } as const;
const text = { fontFamily: font, fontWeight: 400, fontSize: 18, lineHeight: '20px' } as const;
const btn = { fontFamily: font, fontWeight: 500, fontSize: 18, lineHeight: '21px' } as const;
const info = { fontFamily: font, fontWeight: 300, fontSize: 14, lineHeight: '14px' } as const;

const c = {
  main: 'rgba(51, 74, 159, 1)', // #334a9f
  bg: 'rgba(246, 249, 255, 1)', // #f6f9ff
  '20': 'rgba(214, 219, 236, 1)', // #d6dbec
  '40': 'rgba(173, 183, 217, 1)', // #adb7d9
};

/* ---- Table column widths (from Figma absolute positions) ---- */
const COL_PRICE = 181;
const COL_QTY = 181;
const COL_TOTAL = 191;
const COL_RIGHT_TOTAL = COL_PRICE + 1 + COL_QTY + 1 + COL_TOTAL; // 555

export default function BasketPage() {
  const currency = useCurrency();
  const formatLocale = useFormatLocale();
  const { items, removeItem, updateQuantity } = useCart();
  const [validated, setValidated] = useState<ValidatedCartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setValidated([]);
      setSubtotal(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    validateCart(items)
      .then((res) => {
        if (cancelled) return;
        setValidated(res.data.items);
        setSubtotal(res.data.subtotal);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [items]);

  // Re-validate promo when subtotal changes (items added/removed)
  useEffect(() => {
    if (!promoResult?.valid || !promoResult.code || subtotal === 0) return;
    // Silently re-validate to update discount_amount
    validatePromo(promoResult.code, subtotal)
      .then((res) => {
        if (res.data.valid) {
          setPromoResult(res.data);
          setPromoError(null);
          sessionStorage.setItem('checkout_promo', JSON.stringify(res.data));
        } else {
          setPromoResult(null);
          setPromoError(res.data.error || null);
          sessionStorage.removeItem('checkout_promo');
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code || promoLoading) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await validatePromo(code, subtotal);
      if (res.data.valid) {
        setPromoResult(res.data);
        setPromoError(null);
        sessionStorage.setItem('checkout_promo', JSON.stringify(res.data));
      } else {
        setPromoResult(null);
        setPromoError(res.data.error || 'Promo code is not valid');
        sessionStorage.removeItem('checkout_promo');
      }
    } catch {
      setPromoError('Error validating promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoResult(null);
    setPromoError(null);
    setPromoInput('');
    sessionStorage.removeItem('checkout_promo');
  };

  const promoDiscount = promoResult?.valid ? promoResult.discount_amount || 0 : 0;
  const finalTotal = Math.max(0, subtotal - promoDiscount);

  /* ---- Breadcrumbs ---- */
  const breadcrumbs = (
    <Breadcrumbs
      separator="/"
      sx={{ mb: 0.5, '& .MuiBreadcrumbs-separator': { color: c['20'], mx: 0.5 } }}
    >
      <MuiLink
        component={Link}
        href="/"
        underline="hover"
        sx={{ fontFamily: '"Open Sans", Helvetica', fontSize: 13, color: c['20'] }}
      >
        Home
      </MuiLink>
      <MuiLink
        component={Link}
        href="/catalog"
        underline="hover"
        sx={{ fontFamily: '"Open Sans", Helvetica', fontSize: 13, color: c['20'] }}
      >
        Catalog
      </MuiLink>
      <Typography sx={{ fontFamily: '"Open Sans", Helvetica', fontSize: 13, color: c['20'] }}>
        Basket
      </Typography>
    </Breadcrumbs>
  );

  /* ============ EMPTY STATE ============ */
  if (items.length === 0) {
    return (
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: 2, py: 4 }}>
        {breadcrumbs}
        <Typography sx={{ ...h1, textTransform: 'uppercase', color: c.main, mb: 3 }}>
          Basket
        </Typography>
        <Typography sx={{ ...text, color: c.main, mb: 1 }}>Your basket is empty</Typography>
        <Typography sx={{ ...text, color: c.main }}>
          Go to{' '}
          <MuiLink
            component={Link}
            href="/catalog"
            underline="hover"
            sx={{ fontWeight: 700, color: c.main }}
          >
            Catalog
          </MuiLink>{' '}
          to continue shopping
        </Typography>
      </Box>
    );
  }

  /* ============ CART WITH ITEMS ============ */
  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', px: 2, py: 4 }}>
      {breadcrumbs}
      <Typography sx={{ ...h1, textTransform: 'uppercase', color: c.main, mb: 4 }}>
        Basket
      </Typography>

      {/* ====== Promo + Summary row ====== */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          mb: 5,
          alignItems: { md: 'flex-start' },
        }}
      >
        {/* Promo — left */}
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ ...text, color: c.main, mb: 1.5 }}>
            Enter promo code for a discount
          </Typography>
          {promoResult?.valid ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  bgcolor: '#e8f5e9',
                  border: '1px solid #4caf50',
                  borderRadius: '10px',
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography sx={{ ...text, color: '#2e7d32', fontWeight: 500 }}>
                  {promoResult.code}
                </Typography>
                <Typography sx={{ ...info, color: '#4caf50' }}>
                  {promoResult.discount_type === 'percent'
                    ? `−${promoResult.discount_value}%`
                    : `−${fmtMoney(promoResult.discount_value || 0, currency, formatLocale)}`}
                </Typography>
                <IconButton size="small" onClick={handleRemovePromo} sx={{ ml: 0.5, p: 0.25 }}>
                  <CloseIcon sx={{ fontSize: 18, color: '#2e7d32' }} />
                </IconButton>
              </Box>
              {promoResult.description && (
                <Typography sx={{ ...info, color: c['40'] }}>{promoResult.description}</Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <InputBase
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyPromo();
                }}
                placeholder="PROMO CODE"
                disabled={promoLoading}
                sx={{
                  border: '0.5px solid',
                  borderColor: promoError ? '#d32f2f' : c.main,
                  borderRadius: '10px',
                  px: 2,
                  height: 50,
                  flex: 1,
                  maxWidth: 419,
                  ...text,
                  color: c.main,
                }}
              />
              <Box
                component="button"
                onClick={handleApplyPromo}
                disabled={promoLoading}
                sx={{
                  width: 50,
                  height: 50,
                  bgcolor: promoLoading ? c['40'] : c.main,
                  border: 'none',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: promoLoading ? 'default' : 'pointer',
                  flexShrink: 0,
                  '&:hover': { bgcolor: promoLoading ? c['40'] : '#2a3d85' },
                }}
              >
                {promoLoading ? (
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                ) : (
                  <ArrowForwardIcon sx={{ color: 'white', fontSize: 24 }} />
                )}
              </Box>
            </Box>
          )}
          {promoError && (
            <Typography sx={{ ...info, color: '#d32f2f', mt: 0.75 }}>{promoError}</Typography>
          )}
        </Box>

        {/* Summary card — right, aligned with Price/Qty/Total columns */}
        <Box
          sx={{
            bgcolor: c.bg,
            borderRadius: '20px',
            px: 4,
            py: 3,
            display: { xs: 'flex', md: 'flex' },
            alignItems: 'center',
            justifyContent: { xs: 'center', md: 'space-between' },
            gap: 4,
            flexShrink: 0,
            width: { md: COL_RIGHT_TOTAL },
            boxSizing: 'border-box',
          }}
        >
          <Box>
            {promoDiscount > 0 && (
              <>
                <Typography sx={{ ...info, color: c['40'], mb: 0.25 }}>
                  Subtotal: {fmtMoney(subtotal, currency, formatLocale)}
                </Typography>
                <Typography sx={{ ...info, color: '#2e7d32', mb: 0.5 }}>
                  Discount: −{fmtMoney(promoDiscount, currency, formatLocale)}
                </Typography>
              </>
            )}
            <Typography sx={{ ...info, color: c.main, mb: 0.5 }}>Total:</Typography>
            <Typography sx={{ ...h2, color: c.main, lineHeight: 1.2 }}>
              {fmtMoney(finalTotal, currency, formatLocale)}
            </Typography>
          </Box>
          <Button
            component={Link}
            href="/checkout"
            variant="contained"
            sx={{
              bgcolor: c.main,
              borderRadius: '10px',
              px: 5,
              py: '15px',
              ...btn,
              color: 'white',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#2a3d85' },
            }}
          >
            Place Order
          </Button>
        </Box>
      </Box>

      {loading && validated.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: c.main }} />
        </Box>
      ) : (
        <>
          {/* ====== Desktop table ====== */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0 }}>
            {/* ---- LEFT: PRODUCT NAME + product rows ---- */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Header */}
              <Box sx={{ height: 90, display: 'flex', alignItems: 'center' }}>
                <Typography sx={{ ...h3, color: c.main, textTransform: 'uppercase' }}>
                  Product
                </Typography>
              </Box>
              {/* Separator */}
              <Box sx={{ height: '1px', bgcolor: c['20'] }} />
              {/* Rows */}
              {validated.map((item, idx) => (
                <Box key={item.productId}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '40px', py: '10px' }}>
                    <IconButton
                      onClick={() => removeItem(item.productId)}
                      sx={{ color: c['20'], p: 0.5, flexShrink: 0 }}
                    >
                      <TrashIcon size={28} />
                    </IconButton>
                    <Box
                      sx={{
                        width: 100,
                        height: 100,
                        bgcolor: c.bg,
                        borderRadius: '10px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {item.image ? (
                        <Box
                          component="img"
                          src={imgCart(item.image)}
                          alt={item.name || ''}
                          sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: 11, color: c['40'] }}>No photo</Typography>
                      )}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{ ...h2, color: c.main, textTransform: 'uppercase', mb: 0.5 }}
                      >
                        {item.name}
                      </Typography>
                      {item.sku && (
                        <Typography sx={{ ...text, color: c.main }}>{item.sku}</Typography>
                      )}
                      {item.error && (
                        <Typography sx={{ fontSize: 13, color: '#d32f2f', mt: 0.5 }}>
                          {item.error}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  {idx < validated.length - 1 && <Box sx={{ height: '1px', bgcolor: c['20'] }} />}
                </Box>
              ))}
            </Box>

            {/* ---- RIGHT: 3-column table with bgLight cells ---- */}
            <Box sx={{ display: 'flex', flexShrink: 0 }}>
              {/* PRICE column */}
              <Box sx={{ width: COL_PRICE }}>
                <Box
                  sx={{
                    height: 90,
                    bgcolor: c.bg,
                    borderRadius: '20px 0 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    sx={{ ...h3, color: c.main, textTransform: 'uppercase', textAlign: 'center' }}
                  >
                    Price / pc
                  </Typography>
                </Box>
                {validated.map((item, idx) => (
                  <Box
                    key={item.productId}
                    sx={{
                      height: 120,
                      bgcolor: c.bg,
                      borderRadius: idx === validated.length - 1 ? '0 0 0 20px' : 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderTop: `1px solid ${c['20']}`,
                    }}
                  >
                    <Typography sx={{ ...btn, color: c.main, textAlign: 'center' }}>
                      {item.unitPrice != null ? fmtMoney(item.unitPrice, currency, formatLocale) : '—'}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Vertical separator */}
              <Box sx={{ width: '1px', bgcolor: c['20'] }} />

              {/* QUANTITY column */}
              <Box sx={{ width: COL_QTY }}>
                <Box
                  sx={{
                    height: 90,
                    bgcolor: c.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      ...h3,
                      color: c.main,
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      lineHeight: 1.3,
                    }}
                  >
                    Quantity,
                    <br />
                    pcs
                  </Typography>
                </Box>
                {validated.map((item) => (
                  <Box
                    key={item.productId}
                    sx={{
                      height: 120,
                      bgcolor: c.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderTop: `1px solid ${c['20']}`,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: c.bg,
                        border: `1px solid ${c.main}`,
                        borderRadius: '10px',
                        height: 40,
                        gap: '15px',
                        px: '10px',
                        py: '5px',
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (item.quantity <= 1) removeItem(item.productId);
                          else updateQuantity(item.productId, item.quantity - 1);
                        }}
                        sx={{ color: c.main, p: 0 }}
                      >
                        <RemoveIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <Typography
                        sx={{
                          ...btn,
                          color: c.main,
                          minWidth: 20,
                          textAlign: 'center',
                          userSelect: 'none',
                        }}
                      >
                        {item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.available != null && item.quantity >= item.available}
                        sx={{ color: c.main, p: 0 }}
                      >
                        <AddIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Vertical separator */}
              <Box sx={{ width: '1px', bgcolor: c['20'] }} />

              {/* TOTAL column */}
              <Box sx={{ width: COL_TOTAL }}>
                <Box
                  sx={{
                    height: 90,
                    bgcolor: c.bg,
                    borderRadius: '0 20px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    sx={{ ...h3, color: c.main, textTransform: 'uppercase', textAlign: 'center' }}
                  >
                    Total
                  </Typography>
                </Box>
                {validated.map((item, idx) => (
                  <Box
                    key={item.productId}
                    sx={{
                      height: 120,
                      bgcolor: c.bg,
                      borderRadius: idx === validated.length - 1 ? '0 0 20px 0' : 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderTop: `1px solid ${c['20']}`,
                    }}
                  >
                    <Typography sx={{ ...btn, color: c.main, textAlign: 'center' }}>
                      {item.lineTotal != null ? fmtMoney(item.lineTotal, currency, formatLocale) : '—'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* ====== Mobile cards ====== */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            {validated.map((item) => (
              <Box
                key={item.productId}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  py: 2,
                  alignItems: 'flex-start',
                  borderBottom: `1px solid ${c['20']}`,
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: c.bg,
                    borderRadius: '10px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {item.image ? (
                    <Box
                      component="img"
                      src={imgCartSm(item.image)}
                      alt={item.name || ''}
                      sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: 10, color: c['40'] }}>No photo</Typography>
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: c.main,
                      textTransform: 'uppercase',
                      mb: 0.5,
                    }}
                  >
                    {item.name}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: c.main, mb: 1 }}>
                    {item.unitPrice != null ? fmtMoney(item.unitPrice, currency, formatLocale) : '—'}
                  </Typography>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: c.bg,
                        border: `1px solid ${c.main}`,
                        borderRadius: '10px',
                        height: 32,
                        gap: '10px',
                        px: '8px',
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (item.quantity <= 1) removeItem(item.productId);
                          else updateQuantity(item.productId, item.quantity - 1);
                        }}
                        sx={{ color: c.main, p: 0 }}
                      >
                        <RemoveIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: c.main,
                          minWidth: 20,
                          textAlign: 'center',
                        }}
                      >
                        {item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.available != null && item.quantity >= item.available}
                        sx={{ color: c.main, p: 0 }}
                      >
                        <AddIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 500, color: c.main }}>
                      {item.lineTotal != null ? fmtMoney(item.lineTotal, currency, formatLocale) : '—'}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  onClick={() => removeItem(item.productId)}
                  sx={{ color: c['20'], p: 0.5, flexShrink: 0 }}
                >
                  <TrashIcon size={20} />
                </IconButton>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
