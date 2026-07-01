'use client';

import { Box, Typography, Link as MuiLink } from '@mui/material';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { palette } from '@/lib/theme';

const SOCIALS = [
  { icon: '/icons/soc-whatsapp.png', href: 'https://wa.me/905000000000', label: 'WhatsApp' },
  { icon: '/icons/soc-instagram.png', href: 'https://www.instagram.com/', label: 'Instagram' },
];

const PAYMENT_ICONS = [
  { cls: 'mastercard', w: 24, h: 16, bgPos: '-327px -200px' },
  { cls: 'visa', w: 32, h: 10, bgPos: '-40px -204px' },
];

const navLinkSx = {
  fontSize: { xs: 14, md: 16 },
  color: palette.footerText,
  textTransform: 'uppercase' as const,
  '&:hover': { opacity: 0.8 },
};

function SocialIcons() {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {SOCIALS.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <img src={s.icon} alt={s.label} style={{ width: 24, height: 24 }} />
        </a>
      ))}
    </Box>
  );
}

export function Footer() {
  const t = useTranslations();

  const NAV_COL1 = [
    { label: t('nav.catalog'), href: '/catalog' },
    { label: t('nav.new'), href: '/catalog?sort=-date_created' },
  ];

  const NAV_COL2 = [
    { label: t('nav.contacts'), href: '/contacts' },
    { label: 'Delivery & Payment', href: '/delivery' },
    { label: 'FAQ', href: '/faq' },
  ];

  const NAV_COL_LEGAL = [
    { label: t('legal.kvkk.navLabel'), href: '/legal/kvkk' },
    { label: t('legal.mesafeli_satis.navLabel'), href: '/legal/mesafeli-satis' },
    { label: t('legal.iade.navLabel'), href: '/legal/iade' },
    { label: t('legal.gizlilik.navLabel'), href: '/legal/gizlilik' },
    { label: t('legal.kullanim_kosullari.navLabel'), href: '/legal/kullanim-kosullari' },
  ];

  const ALL_NAV = [...NAV_COL1, ...NAV_COL2, ...NAV_COL_LEGAL];

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: palette.footerDark,
        borderRadius: '20px 20px 0 0',
        mt: 8,
        py: { xs: 4, md: 5 },
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 1300, mx: 'auto' }}>
        {/* ============ DESKTOP (md+) ============ */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 4,
          }}
        >
          {/* Logo */}
          <Box sx={{ flexShrink: 0 }}>
            <img
              src="/icons/logo-white.png"
              alt="American Creator"
              style={{ width: 200, height: 'auto' }}
            />
          </Box>

          {/* Nav columns */}
          <Box sx={{ display: 'flex', gap: 8 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {NAV_COL1.map((item) => (
                <MuiLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  underline="none"
                  sx={navLinkSx}
                >
                  {item.label}
                </MuiLink>
              ))}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {NAV_COL2.map((item) => (
                <MuiLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  underline="none"
                  sx={navLinkSx}
                >
                  {item.label}
                </MuiLink>
              ))}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {NAV_COL_LEGAL.map((item) => (
                <MuiLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  underline="none"
                  sx={navLinkSx}
                >
                  {item.label}
                </MuiLink>
              ))}
            </Box>
          </Box>

          {/* Phone */}
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 500, color: palette.footerText }}>
              +90 500 000 00 00
            </Typography>
            <Typography sx={{ fontSize: 14, color: palette.footerSecondary }}>
              {t('common.workingHours')}
            </Typography>
          </Box>

          {/* Social icons */}
          <SocialIcons />
        </Box>

        {/* ============ MOBILE (xs) ============ */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 3, mb: 4 }}>
          {/* Logo + Social icons row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <img
              src="/icons/logo-white.png"
              alt="American Creator"
              style={{ width: 150, height: 'auto' }}
            />
            <SocialIcons />
          </Box>

          {/* Nav — single column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {ALL_NAV.map((item) => (
              <MuiLink
                key={item.href}
                component={Link}
                href={item.href}
                underline="none"
                sx={navLinkSx}
              >
                {item.label}
              </MuiLink>
            ))}
          </Box>

          {/* Phone */}
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 500, color: palette.footerText }}>
              +90 500 000 00 00
            </Typography>
            <Typography sx={{ fontSize: 14, color: palette.footerSecondary }}>
              {t('common.workingHours')}
            </Typography>
          </Box>
        </Box>

        {/* ============ Bottom row (shared) ============ */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'flex-end' },
            gap: 2,
            pt: 3,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Typography sx={{ fontSize: 16, color: palette.primaryLight }}>
            {new Date().getFullYear()} &copy; American Creator
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'flex-start', md: 'flex-end' },
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center' }}>
              {PAYMENT_ICONS.map((p) => (
                <Box
                  key={p.cls}
                  sx={{
                    width: p.w,
                    height: p.h,
                    backgroundImage: 'url(/icons/payment-sprite.svg)',
                    backgroundPosition: p.bgPos,
                    backgroundRepeat: 'no-repeat',
                    display: 'inline-block',
                  }}
                />
              ))}
              <img src="/icons/pay-troy.png" alt="Troy" style={{ width: 24, height: 16 }} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
