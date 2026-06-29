'use client';

import { Box, Typography, Link as MuiLink } from '@mui/material';
import Link from 'next/link';
import { palette } from '@/lib/theme';

const NAV_COL1 = [
  { label: 'Каталог', href: '/catalog' },
  { label: 'Новинки', href: '/catalog?sort=-date_created' },
  { label: 'Nail-Студиям', href: '/studios' },
  { label: 'Партнерам', href: '/partners' },
];

const NAV_COL2 = [
  { label: 'Контакты', href: '/contacts' },
  { label: 'Доставка и оплата', href: '/delivery' },
  { label: 'FAQ', href: '/faq' },
];

const ALL_NAV = [...NAV_COL1, ...NAV_COL2];

const SOCIALS = [
  { icon: '/icons/soc-telegram.png', href: 'https://t.me/americancreator_ru', label: 'Telegram' },
  { icon: '/icons/soc-whatsapp.png', href: 'https://wa.me/79957578467', label: 'WhatsApp' },
  { icon: '/icons/soc-vk.png', href: 'https://vk.com/american_creator', label: 'VK' },
  {
    icon: '/icons/soc-wb.svg',
    href: 'https://www.wildberries.ru/brands/2623845-american-creator',
    label: 'WB',
  },
];

const PAYMENT_ICONS = [
  { cls: 'mastercard', w: 24, h: 16, bgPos: '-327px -200px' },
  { cls: 'visa', w: 32, h: 10, bgPos: '-40px -204px' },
  { cls: 'yandex_money', w: 25, h: 18, bgPos: '-671px -199px' },
  { cls: 'webmoney', w: 17, h: 18, bgPos: '-127px -199px' },
  { cls: 'qiwi', w: 19, h: 20, bgPos: '-165px -198px' },
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
          </Box>

          {/* Phone */}
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 500, color: palette.footerText }}>
              +7 995 757-84-67
            </Typography>
            <Typography sx={{ fontSize: 14, color: palette.footerSecondary }}>
              по будням с 9:00 до 18:00
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
              +7 995 757-84-67
            </Typography>
            <Typography sx={{ fontSize: 14, color: palette.footerSecondary }}>
              по будням с 9:00 до 18:00
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
            2026 &copy; american-creator.ru
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'flex-start', md: 'flex-end' },
              gap: 1,
            }}
          >
            <img src="/icons/paykeeper.png" alt="PayKeeper" style={{ height: 36, width: 'auto' }} />
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
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
