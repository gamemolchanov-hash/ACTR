'use client';

import { useState } from 'react';
import { Box, Typography, InputBase, Button, Snackbar, Alert } from '@mui/material';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';

/* ── colour aliases not in the shared palette ── */
const gradientStart = '#184481';
const secondaryText = '#adb7d9';

/* ── shared input sx ── */
const inputSx = {
  border: `0.5px solid ${palette.primary}`,
  borderRadius: '10px',
  px: 2,
  width: { xs: '100%', md: 640 },
  height: { xs: 35, md: 50 },
  bgcolor: 'white',
  fontFamily: '"Futura PT", Helvetica',
  fontSize: { xs: 16, md: 18 },
  color: palette.primary,
};

export default function StudiosPage() {
  const t = useTranslations('studios');

  /* ── discount tiers data ── */
  const DISCOUNTS = [
    { pct: '-10%', prefix: t('discountPrefix'), condition: t('discount1Cond') },
    {
      pct: '-15%',
      prefix: t('discountPrefix'),
      condition: t('discount2Cond'),
      note: t('discountFixedNote'),
    },
    {
      pct: '-20%',
      prefix: t('discountPrefix'),
      condition: t('discount3Cond'),
      note: t('discountFixedNote'),
    },
  ];

  /* ── certificates ── */
  const CERTS = [t('cert0'), t('cert1'), t('cert2')];

  const [email, setEmail] = useState('');
  const [socials, setSocials] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; ok: boolean }>({ open: false, ok: true });

  const handleSubmit = async () => {
    if (!email) return;
    setSending(true);
    try {
      await api.post('/contact', { email, socials, comment });
      setEmail('');
      setSocials('');
      setComment('');
      setSnack({ open: true, ok: true });
    } catch {
      setSnack({ open: true, ok: false });
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* ============================================================ */}
      {/* SECTION 1 — Breadcrumb + H1                                  */}
      {/* ============================================================ */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 4 } }}>
        {/* breadcrumb */}
        <Typography
          sx={{
            fontFamily: '"Open Sans", sans-serif',
            fontSize: 13,
            color: palette.primaryLight,
            mb: 0.5,
          }}
        >
          <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {t('breadcrumbHome')}
          </Link>
          {t('breadcrumbSep')}
        </Typography>

        {/* heading */}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 30, md: 40 },
            lineHeight: { xs: '35px', md: '50px' },
            fontWeight: 450,
            maxWidth: { xs: 280, md: 697 },
          }}
        >
          {t('heading')}
        </Typography>
      </Box>

      {/* ============================================================ */}
      {/* SECTION 2 — Hero: product image + gradient card               */}
      {/* ============================================================ */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 3, md: 5 } }}>
        <Box
          sx={{
            background: `linear-gradient(90deg, ${gradientStart} 0%, ${palette.primary} 100%)`,
            borderRadius: '20px',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 0, sm: '20px' },
            overflow: 'visible',
          }}
        >
          {/* LEFT — product image */}
          <Box
            sx={{
              flex: { sm: 1 },
              borderRadius: '20px',
              bgcolor: palette.primary,
              overflow: 'hidden',
            }}
          >
            {/* title duplicate — shown only on mobile (inside left panel) */}
            <Typography
              sx={{
                display: { xs: 'block', sm: 'none' },
                color: 'white',
                fontFamily: '"Futura PT", Helvetica',
                fontSize: 20,
                fontWeight: 500,
                lineHeight: '26px',
                textTransform: 'uppercase',
                p: 2.5,
              }}
            >
              {t('heroTitle')}
            </Typography>

            <Box
              component="img"
              src="/images/studios/hero-products.png"
              alt="American Creator products"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: { xs: '20px', sm: 0 },
                borderTopLeftRadius: '20px',
                borderBottomLeftRadius: '20px',
                display: 'block',
              }}
            />
          </Box>

          {/* RIGHT — text content + decorative images */}
          <Box
            sx={{
              flex: { sm: 2 },
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: { sm: 400 },
              gap: '20px',
              p: { xs: 2.5, sm: '15px 30px 30px' },
            }}
          >
            {/* decorative group: cream smear + bottle — positioned as a single unit */}
            <Box
              sx={{
                position: 'absolute',
                right: { xs: -15, sm: 0, md: 0, lg: 10 },
                bottom: { xs: -100, sm: -130, md: -160, lg: -180 },
                width: { xs: 185, sm: 222, md: 320, lg: 405 },
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              {/* cream smear — behind the bottle */}
              <Box
                component="img"
                src="/images/studios/cream-smear.png"
                alt=""
                sx={{
                  position: 'absolute',
                  bottom: '35%',
                  left: '15%',
                  width: '125%',
                  zIndex: 0,
                }}
              />
              {/* bottle (anchor element, on top of smear) */}
              <Box
                component="img"
                src="/images/studios/product-bottle.png"
                alt=""
                sx={{ width: '100%', display: 'block', position: 'relative', zIndex: 1 }}
              />
            </Box>

            <Box sx={{ position: 'relative', zIndex: 2 }}>
              {/* title — hidden on mobile (shown in left panel instead) */}
              <Typography
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  color: 'white',
                  fontFamily: '"Futura PT", Helvetica',
                  fontSize: 20,
                  fontWeight: 500,
                  lineHeight: '26px',
                  textTransform: 'uppercase',
                  pt: 2.5,
                  pr: { sm: '140px', md: '270px', lg: '270px' },
                }}
              >
                {t('heroTitle')}
              </Typography>

              <Typography
                sx={{
                  color: secondaryText,
                  fontFamily: '"Futura PT", Helvetica',
                  fontSize: { xs: 16, sm: 18 },
                  fontWeight: 400,
                  lineHeight: { xs: '18px', sm: '20px' },
                  mt: 3,
                  pr: { xs: 0, sm: '150px', md: '215px', lg: '270px' },
                }}
              >
                {t('heroDesc')}
              </Typography>
            </Box>

            {/* bottom: divider + guarantee */}
            <Box sx={{ position: 'relative', zIndex: 0 }}>
              <Box
                sx={{
                  borderTop: `1px solid ${secondaryText}`,
                  pt: 2.5,
                }}
              >
                <Typography
                  sx={{
                    color: 'white',
                    fontFamily: '"Futura PT", Helvetica',
                    fontSize: 18,
                    fontWeight: 450,
                    lineHeight: '21px',
                    maxWidth: { xs: 170, sm: 307 },
                    mb: { xs: 5, sm: 0 },
                  }}
                >
                  {t('guarantee')}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ============================================================ */}
      {/* SECTION 3 — Certificates                                      */}
      {/* ============================================================ */}
      <Box
        sx={{
          maxWidth: 1300,
          mx: 'auto',
          px: { xs: 2.5, md: 2 },
          mt: { xs: 12, md: 7 },
          position: 'relative',
          zIndex: 5,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Futura PT", Helvetica',
            fontSize: 20,
            fontWeight: 500,
            lineHeight: '26px',
            color: palette.primary,
            textTransform: 'uppercase',
            maxWidth: { xs: 271, md: 541 },
            mb: 3,
          }}
        >
          {t('certsTitle')}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: { xs: 1.5, md: 2 },
            flexWrap: { xs: 'wrap', md: 'nowrap' },
          }}
        >
          {CERTS.map((cert) => (
            <Box
              key={cert}
              sx={{
                border: `1px solid ${palette.primaryLight}`,
                borderRadius: '20px',
                height: { xs: 114, md: 100 },
                minWidth: { xs: 200, md: 0 },
                flex: { md: 1 },
                display: 'flex',
                alignItems: 'center',
                px: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Futura PT", Helvetica',
                  fontSize: 18,
                  fontWeight: 400,
                  lineHeight: '20px',
                  color: palette.primary,
                }}
              >
                {cert}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ============================================================ */}
      {/* SECTION 4 — Loyalty System                                    */}
      {/* ============================================================ */}
      <Box
        sx={{
          maxWidth: 1300,
          mx: 'auto',
          px: { xs: 2.5, md: 2 },
          mt: { xs: 5, md: 7 },
          position: 'relative',
          zIndex: 5,
        }}
      >
        <Box
          sx={{
            bgcolor: palette.bgLight,
            borderRadius: '20px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            minHeight: { xs: 'auto', md: 594 },
            p: { xs: 2.5, md: 5 },
          }}
        >
          {/* left column */}
          <Box sx={{ flex: { md: '0 0 45%' }, position: 'relative', zIndex: 1 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: 30, md: 40 },
                lineHeight: { xs: '35px', md: '50px' },
                fontWeight: 500,
                maxWidth: { xs: 247, md: 514 },
              }}
            >
              {t('loyaltyTitle')}
            </Typography>

            {/* decorative gel image (desktop) */}
            <Box
              component="img"
              src="/images/studios/decorative-gel.png"
              alt=""
              sx={{
                display: { xs: 'none', md: 'block' },
                position: 'absolute',
                left: -40,
                bottom: -40,
                width: 500,
                pointerEvents: 'none',
              }}
            />
          </Box>

          {/* right column — discount tiers */}
          <Box sx={{ flex: { md: 1 }, mt: { xs: 4, md: 0 }, position: 'relative', zIndex: 1 }}>
            {DISCOUNTS.map((d) => (
              <Box key={d.pct} sx={{ mb: 4 }}>
                {/* percentage + condition row */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: { xs: 1, md: 2 },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"Futura PT", Helvetica',
                      fontSize: { xs: 40, md: 52 },
                      fontWeight: 400,
                      lineHeight: '50px',
                      color: palette.primary,
                      whiteSpace: 'nowrap',
                      minWidth: { xs: 100, md: 150 },
                      textAlign: 'center',
                    }}
                  >
                    {d.pct}
                  </Typography>
                  <Box sx={{ mt: '16px' }}>
                    <Typography
                      sx={{
                        fontFamily: '"Futura PT", Helvetica',
                        fontSize: 18,
                        fontWeight: 400,
                        color: palette.primary,
                      }}
                    >
                      {d.prefix}
                      <Box component="span" sx={{ fontWeight: 700 }}>
                        {d.condition}
                      </Box>
                    </Typography>
                    {/* note on desktop — inline with condition */}
                    {d.note && (
                      <Typography
                        sx={{
                          display: { xs: 'none', md: 'block' },
                          fontFamily: '"Futura PT", Helvetica',
                          fontSize: 14,
                          fontWeight: 300,
                          lineHeight: '14px',
                          color: palette.primary,
                          mt: 1,
                          maxWidth: 320,
                        }}
                      >
                        {d.note}
                      </Typography>
                    )}
                  </Box>
                </Box>
                {/* note on mobile — full width below percentage */}
                {d.note && (
                  <Typography
                    sx={{
                      display: { xs: 'block', md: 'none' },
                      fontFamily: '"Futura PT", Helvetica',
                      fontSize: 14,
                      fontWeight: 300,
                      lineHeight: '14px',
                      color: palette.primary,
                      mt: 1,
                    }}
                  >
                    {d.note}
                  </Typography>
                )}
              </Box>
            ))}

            {/* -30% blue card wrapper */}
            <Box sx={{ position: 'relative', mt: { xs: 10, md: 2 } }}>
              {/* decorative gel — mobile: above card top-right (flipped variant) */}
              <Box
                component="img"
                src="/images/studios/decorative-gel-mobile.png"
                alt=""
                sx={{
                  display: { xs: 'block', md: 'none' },
                  position: 'absolute',
                  top: -180,
                  right: -140,
                  width: 300,
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />
              <Box
                sx={{
                  bgcolor: palette.primary,
                  borderRadius: '20px',
                  p: { xs: 2.5, md: 3 },
                  pl: { md: 6 },
                  py: { md: 4 },
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* semi-transparent overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: { xs: 6, md: 10 },
                    left: { xs: 5, md: 11 },
                    right: { xs: 5, md: 11 },
                    height: { xs: 139, md: 110 },
                    bgcolor: secondaryText,
                    opacity: 0.2,
                    borderRadius: '20px',
                  }}
                />

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 1, sm: 2 },
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"Futura PT", Helvetica',
                      fontSize: { xs: 40, md: 52 },
                      fontWeight: 400,
                      lineHeight: '50px',
                      color: 'white',
                      whiteSpace: 'nowrap',
                      minWidth: { xs: 'auto', md: 157 },
                    }}
                  >
                    -30%
                  </Typography>
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: '"Futura PT", Helvetica',
                        fontSize: 18,
                        fontWeight: 400,
                        color: 'white',
                      }}
                    >
                      {t('discount4Prefix')}{' '}
                      <Box component="span" sx={{ fontWeight: 700 }}>
                        {t('discount4Cond')}
                      </Box>
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"Futura PT", Helvetica',
                        fontSize: 14,
                        fontWeight: 300,
                        lineHeight: '14px',
                        color: 'white',
                        mt: 1,
                        maxWidth: 250,
                      }}
                    >
                      {t('discount4Note')}
                    </Typography>
                  </Box>
                </Box>

                {/* VIP text */}
                <Typography
                  sx={{
                    fontFamily: '"Futura PT", Helvetica',
                    fontSize: 18,
                    fontWeight: 450,
                    lineHeight: '21px',
                    color: 'white',
                    mt: 5,
                    position: 'relative',
                    zIndex: 1,
                    maxWidth: { xs: 224, md: 432 },
                  }}
                >
                  {t('vipText')}
                </Typography>
              </Box>
            </Box>
            {/* close -30% card wrapper */}
          </Box>
        </Box>
      </Box>

      {/* ============================================================ */}
      {/* SECTION 5 — Contact Form + Image                              */}
      {/* ============================================================ */}
      <Box
        sx={{
          maxWidth: 1300,
          mx: 'auto',
          px: { xs: 2.5, md: 2 },
          mt: { xs: 5, md: 8 },
          mb: { xs: 4, md: 0 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { md: 6 },
        }}
      >
        {/* salon image (mobile — above form) */}
        <Box
          component="img"
          src="/images/studios/salon-woman.png"
          alt="Nail studio"
          sx={{
            display: { xs: 'block', md: 'none' },
            width: 280,
            height: 317,
            objectFit: 'cover',
            borderRadius: '20px',
            mx: 'auto',
            mb: 4,
          }}
        />

        {/* left — form */}
        <Box sx={{ flex: { md: '0 0 640px' } }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: 30, md: 40 },
              lineHeight: { xs: '35px', md: '50px' },
              fontWeight: 500,
            }}
          >
            {t('formTitle')}
          </Typography>

          <Typography
            sx={{
              fontFamily: '"Futura PT", Helvetica',
              fontSize: { xs: 16, md: 18 },
              fontWeight: 400,
              lineHeight: { xs: '18px', md: '20px' },
              color: palette.primary,
              mt: 3,
            }}
          >
            {t('formSubtitle')}
          </Typography>

          {/* Email */}
          <Box sx={{ mt: { xs: 4, md: 5 } }}>
            <Typography sx={{ fontSize: { xs: 16, md: 18 }, color: palette.primary, mb: 1 }}>
              Email{' '}
              <Box component="span" sx={{ color: palette.cartBadge }}>
                *
              </Box>
            </Typography>
            <InputBase sx={inputSx} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Box>

          {/* Social links */}
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ fontSize: { xs: 16, md: 18 }, color: palette.primary, mb: 1 }}>
              {t('fieldSocials')}{' '}
              <Box component="span" sx={{ color: palette.cartBadge }}>
                *
              </Box>
            </Typography>
            <InputBase sx={inputSx} value={socials} onChange={(e) => setSocials(e.target.value)} />
          </Box>

          {/* Comments */}
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ fontSize: { xs: 16, md: 18 }, color: palette.primary, mb: 1 }}>
              {t('fieldComment')}
            </Typography>
            <InputBase
              multiline
              rows={6}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              sx={{
                ...inputSx,
                height: 173,
                alignItems: 'flex-start',
                py: 1.5,
              }}
            />
          </Box>

          {/* Submit */}
          <Button
            variant="contained"
            disabled={sending || !email}
            onClick={handleSubmit}
            sx={{
              mt: 4,
              bgcolor: palette.primary,
              color: 'white',
              borderRadius: '10px',
              fontFamily: '"Futura PT", Helvetica',
              fontSize: 18,
              fontWeight: 500,
              textTransform: 'none',
              px: { xs: 2.5, md: 5 },
              py: '15px',
              width: { xs: '100%', md: 'auto' },
              height: { xs: 40, md: 'auto' },
              '&:hover': { bgcolor: '#2a3d85' },
            }}
          >
            {sending ? t('sending') : t('submit')}
          </Button>
        </Box>

        {/* right — salon image (desktop only) */}
        <Box
          component="img"
          src="/images/studios/salon-woman.png"
          alt="Nail studio"
          sx={{
            display: { xs: 'none', md: 'block' },
            width: 610,
            height: 690,
            objectFit: 'cover',
            borderRadius: '20px',
            flexShrink: 0,
          }}
        />
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.ok ? 'success' : 'error'} variant="filled">
          {snack.ok ? t('successMsg') : t('errorMsg')}
        </Alert>
      </Snackbar>
    </Box>
  );
}
