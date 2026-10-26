'use client';

/**
 * "For nail studios" — the loyalty system for beauty salons, port of the ACRU
 * page (owner 26.10.2026: "as on the Russian site, with my amounts"). Same
 * blocks as american-creator.ru/studios: offer, certificates, the discount
 * ladder by order amount, the -30% / VIP card and the partnership form.
 *
 * The discounts are an offer the managers honour (personal discount on the
 * customer card), not a rule the storefront computes — so the amounts live here
 * as the page copy, in TRY like the rest of the site.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Box, Typography, InputBase, Button, Snackbar, Alert } from '@mui/material';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { fmtMoneyShort } from '@/lib/money';
import { useFormatLocale } from '@/providers/CurrencyProvider';

const fontMain = 'LiraFix, "Jost", "Jost Fallback", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

/* ── colour aliases not in the shared palette ── */
const gradientStart = '#184481';
const secondaryText = '#adb7d9';

/** Discount by order amount (TRY); from the second step it stays on the account. */
const STUDIO_DISCOUNTS = [
  { pct: 10, amount: 10000, lockedIn: false },
  { pct: 15, amount: 20000, lockedIn: true },
  { pct: 20, amount: 50000, lockedIn: true },
] as const;

/** The -30% card: an order of at least this many Color Gel. */
const STUDIO_BULK = { pct: 30, count: 50 } as const;

const CERT_KEYS = ['certEac', 'certCpnp', 'certFda'] as const;

const inputSx = {
  border: `0.5px solid ${palette.primary}`,
  borderRadius: '10px',
  px: 2,
  width: { xs: '100%', md: 640 },
  height: { xs: 35, md: 50 },
  bgcolor: 'white',
  fontFamily: fontMain,
  fontSize: { xs: 16, md: 18 },
  color: palette.primary,
};

const bold = (chunks: ReactNode) => (
  <Box component="span" sx={{ fontWeight: 700 }}>
    {chunks}
  </Box>
);

export default function StudiosPage() {
  const t = useTranslations('studios');
  const locale = useLocale();
  const formatLocale = useFormatLocale();
  const { customer } = useAuth();
  const [email, setEmail] = useState('');
  const [socials, setSocials] = useState('');
  const [comment, setComment] = useState('');
  // Signed-in buyer: prefill the e-mail from the profile once it is known; stays editable.
  useEffect(() => {
    if (customer?.email) setEmail((prev) => prev || customer.email);
  }, [customer]);
  const [sending, setSending] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; ok: boolean }>({ open: false, ok: true });

  const canSubmit = !!email.trim() && !!socials.trim() && !sending;

  const handleSubmit = async () => {
    if (!email.trim() || !socials.trim()) return;
    setSending(true);
    try {
      // ARM `POST /contact`: name + email + message (+ subject, locale). The form
      // fields go into the message line by line, labelled in the site language —
      // the letter to the manager comes in the same language (`locale`).
      const lines: Array<[string, string]> = [
        [t('fieldEmail'), email],
        [t('fieldSocials'), socials],
        [t('fieldComment'), comment],
      ];
      await api.post('/contact', {
        name: customer?.name?.trim() || email.trim(),
        email: email.trim(),
        subject: t('leadSubject'),
        message: lines
          .filter(([, value]) => value.trim())
          .map(([label, value]) => `${label}: ${value.trim()}`)
          .join('\n'),
        locale,
      });
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
      {/* ── Breadcrumb + H1 ── */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 4 } }}>
        <Typography
          sx={{
            fontFamily: fontBody,
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

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 30, md: 40 },
            lineHeight: { xs: '35px', md: '50px' },
            fontWeight: 450,
            maxWidth: { xs: 320, md: 760 },
          }}
        >
          {t('titleLine1')}
          <br />
          {t('titleLine2')}
        </Typography>
      </Box>

      {/* ── Hero: product image + gradient card ── */}
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
          {/* left — product image */}
          <Box
            sx={{
              flex: { sm: 1 },
              borderRadius: '20px',
              bgcolor: palette.primary,
              overflow: 'hidden',
            }}
          >
            {/* title duplicate — shown only on mobile (inside the left panel) */}
            <Typography
              sx={{
                display: { xs: 'block', sm: 'none' },
                color: 'white',
                fontFamily: fontMain,
                fontSize: 20,
                fontWeight: 500,
                lineHeight: '26px',
                p: 2.5,
              }}
            >
              {t('heroTitle')}
            </Typography>

            <Box
              component="img"
              src="/images/studios/hero-products.png"
              alt={t('heroImgAlt')}
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

          {/* right — text + decorative images */}
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
            {/* decorative group: cream smear + bottle, positioned as one unit */}
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
              <Box
                component="img"
                src="/images/studios/product-bottle.png"
                alt=""
                sx={{ width: '100%', display: 'block', position: 'relative', zIndex: 1 }}
              />
            </Box>

            <Box sx={{ position: 'relative', zIndex: 2 }}>
              {/* title — hidden on mobile (shown in the left panel instead) */}
              <Typography
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  color: 'white',
                  fontFamily: fontMain,
                  fontSize: 20,
                  fontWeight: 500,
                  lineHeight: '26px',
                  pt: 2.5,
                  pr: { sm: '140px', md: '270px', lg: '270px' },
                }}
              >
                {t('heroTitle')}
              </Typography>

              <Typography
                sx={{
                  color: secondaryText,
                  fontFamily: fontMain,
                  fontSize: { xs: 16, sm: 18 },
                  fontWeight: 400,
                  lineHeight: { xs: '18px', sm: '20px' },
                  mt: 3,
                  pr: { xs: 0, sm: '150px', md: '215px', lg: '270px' },
                }}
              >
                {t('heroText')}
              </Typography>
            </Box>

            {/* bottom: divider + guarantee */}
            <Box sx={{ position: 'relative', zIndex: 0 }}>
              <Box sx={{ borderTop: `1px solid ${secondaryText}`, pt: 2.5 }}>
                <Typography
                  sx={{
                    color: 'white',
                    fontFamily: fontMain,
                    fontSize: 18,
                    fontWeight: 450,
                    lineHeight: '21px',
                    maxWidth: { xs: 170, sm: 307 },
                    mb: { xs: 5, sm: 0 },
                  }}
                >
                  {t('heroGuarantee')}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Certificates ── */}
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
            fontFamily: fontMain,
            fontSize: 20,
            fontWeight: 500,
            lineHeight: '26px',
            color: palette.primary,
            maxWidth: { xs: 300, md: 620 },
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
          {CERT_KEYS.map((key) => (
            <Box
              key={key}
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
                  fontFamily: fontMain,
                  fontSize: 18,
                  fontWeight: 400,
                  lineHeight: '20px',
                  color: palette.primary,
                }}
              >
                {t(key)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Loyalty system ── */}
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
          data-testid="sf-studios-loyalty"
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
              component="h2"
              sx={{
                fontSize: { xs: 30, md: 40 },
                lineHeight: { xs: '35px', md: '50px' },
                fontWeight: 500,
                maxWidth: { xs: 300, md: 514 },
              }}
            >
              {t('loyaltyTitleLine1')}
              <br />
              {t('loyaltyTitleLine2')}
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

          {/* right column — discount ladder */}
          <Box sx={{ flex: { md: 1 }, mt: { xs: 4, md: 0 }, position: 'relative', zIndex: 1 }}>
            {STUDIO_DISCOUNTS.map((d) => (
              <Box key={d.pct} data-testid="sf-studios-tier" sx={{ mb: 4 }}>
                {/* percentage + condition row */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1, md: 2 } }}>
                  <Typography
                    sx={{
                      fontFamily: fontMain,
                      fontSize: { xs: 40, md: 52 },
                      fontWeight: 400,
                      lineHeight: '50px',
                      color: palette.primary,
                      whiteSpace: 'nowrap',
                      minWidth: { xs: 100, md: 150 },
                      textAlign: 'center',
                    }}
                  >
                    {t('discountPct', { pct: d.pct })}
                  </Typography>
                  <Box sx={{ mt: '16px' }}>
                    <Typography
                      sx={{
                        fontFamily: fontMain,
                        fontSize: 18,
                        fontWeight: 400,
                        color: palette.primary,
                      }}
                    >
                      {t.rich('tierCondition', {
                        amount: fmtMoneyShort(d.amount, 'TRY', formatLocale),
                        b: bold,
                      })}
                    </Typography>
                    {/* note on desktop — under the condition */}
                    {d.lockedIn && (
                      <Typography
                        sx={{
                          display: { xs: 'none', md: 'block' },
                          fontFamily: fontMain,
                          fontSize: 14,
                          fontWeight: 300,
                          lineHeight: '16px',
                          color: palette.primary,
                          mt: 1,
                          maxWidth: 320,
                        }}
                      >
                        {t('tierNote')}
                      </Typography>
                    )}
                  </Box>
                </Box>
                {/* note on mobile — full width under the percentage */}
                {d.lockedIn && (
                  <Typography
                    sx={{
                      display: { xs: 'block', md: 'none' },
                      fontFamily: fontMain,
                      fontSize: 14,
                      fontWeight: 300,
                      lineHeight: '16px',
                      color: palette.primary,
                      mt: 1,
                    }}
                  >
                    {t('tierNote')}
                  </Typography>
                )}
              </Box>
            ))}

            {/* -30% blue card */}
            <Box sx={{ position: 'relative', mt: { xs: 10, md: 2 } }}>
              {/* decorative gel — mobile: above the card, top right */}
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
                      fontFamily: fontMain,
                      fontSize: { xs: 40, md: 52 },
                      fontWeight: 400,
                      lineHeight: '50px',
                      color: 'white',
                      whiteSpace: 'nowrap',
                      minWidth: { xs: 'auto', md: 157 },
                    }}
                  >
                    {t('discountPct', { pct: STUDIO_BULK.pct })}
                  </Typography>
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: fontMain,
                        fontSize: 18,
                        fontWeight: 400,
                        color: 'white',
                      }}
                    >
                      {t.rich('bulkCondition', { count: STUDIO_BULK.count, b: bold })}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: fontMain,
                        fontSize: 14,
                        fontWeight: 300,
                        lineHeight: '16px',
                        color: 'white',
                        mt: 1,
                        maxWidth: 280,
                      }}
                    >
                      {t('bulkNote')}
                    </Typography>
                  </Box>
                </Box>

                {/* VIP partner certificate */}
                <Typography
                  sx={{
                    fontFamily: fontMain,
                    fontSize: 18,
                    fontWeight: 450,
                    lineHeight: '21px',
                    color: 'white',
                    mt: 5,
                    position: 'relative',
                    zIndex: 1,
                    maxWidth: { xs: 260, md: 460 },
                  }}
                >
                  {t('vipText')}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Partnership form + image ── */}
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
        {/* salon image (mobile — above the form) */}
        <Box
          component="img"
          src="/images/studios/salon-woman.jpg"
          alt={t('salonImgAlt')}
          loading="lazy"
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
            component="h2"
            sx={{
              fontSize: { xs: 30, md: 40 },
              lineHeight: { xs: '35px', md: '50px' },
              fontWeight: 500,
            }}
          >
            {t('formTitleLine1')}
            <br />
            {t('formTitleLine2')}
          </Typography>

          <Typography
            sx={{
              fontFamily: fontMain,
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
              {t('fieldEmail')}{' '}
              <Box component="span" sx={{ color: palette.cartBadge }}>
                *
              </Box>
            </Typography>
            <InputBase
              sx={inputSx}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputProps={{ 'aria-label': t('fieldEmail'), 'data-testid': 'sf-studios-email' }}
            />
          </Box>

          {/* Social links */}
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ fontSize: { xs: 16, md: 18 }, color: palette.primary, mb: 1 }}>
              {t('fieldSocials')}{' '}
              <Box component="span" sx={{ color: palette.cartBadge }}>
                *
              </Box>
            </Typography>
            <InputBase
              sx={inputSx}
              value={socials}
              onChange={(e) => setSocials(e.target.value)}
              inputProps={{ 'aria-label': t('fieldSocials'), 'data-testid': 'sf-studios-socials' }}
            />
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
              inputProps={{ 'aria-label': t('fieldComment'), 'data-testid': 'sf-studios-comment' }}
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
            disabled={!canSubmit}
            onClick={handleSubmit}
            data-testid="sf-studios-submit"
            sx={{
              mt: 4,
              bgcolor: palette.primary,
              color: 'white',
              borderRadius: '10px',
              fontFamily: fontMain,
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
          src="/images/studios/salon-woman.jpg"
          alt={t('salonImgAlt')}
          loading="lazy"
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
