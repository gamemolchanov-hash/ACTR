'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppBar,
  Badge,
  Box,
  Typography,
  InputBase,
  Link as MuiLink,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  CircularProgress,
  ClickAwayListener,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useCart } from '@/providers/CartProvider';
import { useAuth } from '@/lib/auth-context';
import { palette } from '@/lib/theme';
import { fetchProducts, type Product } from '@/lib/api';
import { imgThumb } from '@/lib/image-url';
import { fmtMoney } from '@/lib/money';

function productHref(p: Product) {
  return `/catalog/${p.category?.slug ?? 'all'}/${p.slug ?? p.id}`;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations();
  const { totalQuantity } = useCart();
  const { customer, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(
    searchParams.get('search') || searchParams.get('q') || '',
  );
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // BCP-47 locale for number formatting
  const bcp47 = locale === 'tr' ? 'tr-TR' : 'en-US';

  const NAV_ITEMS = [
    { label: t('nav.catalog'), href: '/catalog' },
    { label: t('nav.new'), href: '/catalog?sort=-date_created' },
    { label: t('nav.contacts'), href: '/contacts' },
  ];

  const handleSearch = () => {
    setShowSuggestions(false);
    const q = searchValue.trim();
    if (q) {
      router.push(`/catalog?search=${encodeURIComponent(q)}`);
    } else {
      router.push('/catalog');
    }
  };

  const onSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoading(true);
    setShowSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetchProducts({ search: q, limit: 5 });
        setSuggestions(res.data);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Language switcher: switch locale and set NEXT_LOCALE cookie
  const switchLocale = (next: string) => {
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=${365 * 24 * 3600};SameSite=Lax`;
    router.replace(pathname, { locale: next });
  };

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white' }}>
      {/* ===== DESKTOP (sm+): single row ===== */}
      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          maxWidth: 1300,
          mx: 'auto',
          width: '100%',
          px: 2,
          alignItems: 'center',
          height: 72,
          gap: 2,
        }}
      >
        <Link href="/">
          <img src="/logo.png" alt="American Creator" style={{ width: 240, height: 57 }} />
        </Link>

        <Box sx={{ ml: 3, display: { xs: 'none', lg: 'block' } }}>
          <Typography
            sx={{
              fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
              fontSize: 20,
              fontWeight: 500,
              lineHeight: '26px',
              color: palette.primary,
            }}
          >
            +90 500 000 00 00
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
              fontSize: 14,
              fontWeight: 300,
              lineHeight: '14px',
              color: palette.primary,
            }}
          >
            {t('common.workingHours')}
          </Typography>
        </Box>

        <ClickAwayListener onClickAway={() => setShowSuggestions(false)}>
          <Box sx={{ position: 'relative', flex: 1, maxWidth: { lg: 530 } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                border: `0.5px solid ${palette.primary}`,
                borderRadius: '10px',
                px: 2,
                height: { sm: 45, lg: 50 },
                bgcolor: 'white',
              }}
            >
              <InputBase
                placeholder={t('common.search')}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                sx={{
                  flex: 1,
                  fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
                  fontSize: { sm: 14, lg: 18 },
                  fontWeight: 400,
                  color: palette.primary,
                  '& ::placeholder': { color: '#adb7d9' },
                }}
              />
              <img
                src="/icons/search.svg"
                alt={t('common.search')}
                onClick={handleSearch}
                style={{ width: 26, height: 26, cursor: 'pointer' }}
              />
            </Box>
            {showSuggestions && (
              <Paper
                elevation={4}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 0.5,
                  zIndex: 1300,
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} sx={{ color: palette.primary }} />
                  </Box>
                ) : suggestions.length === 0 ? (
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography sx={{ fontSize: 14, color: palette.primaryLight }}>
                      {t('common.noResults')}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {suggestions.map((p) => {
                      const img = p.images?.sort((a, b) => a.sort - b.sort)[0];
                      return (
                        <Box
                          key={p.id}
                          component={Link}
                          href={productHref(p)}
                          onClick={() => setShowSuggestions(false)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            px: 2,
                            py: 1,
                            textDecoration: 'none',
                            color: 'inherit',
                            '&:hover': { bgcolor: palette.bgLight },
                            cursor: 'pointer',
                          }}
                        >
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              flexShrink: 0,
                              borderRadius: '6px',
                              overflow: 'hidden',
                              bgcolor: '#f5f5f5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {img ? (
                              <img
                                src={imgThumb(img.file_path)}
                                alt={p.name}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              <Box sx={{ width: '100%', height: '100%', bgcolor: '#eee' }} />
                            )}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: palette.primary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.name}
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: palette.primaryLight }}>
                              {fmtMoney(p.price, 'TRY', bcp47)}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                    <Box
                      component="button"
                      onClick={handleSearch}
                      sx={{
                        display: 'block',
                        width: '100%',
                        border: 'none',
                        borderTop: `1px solid ${palette.bgLight}`,
                        bgcolor: 'white',
                        py: 1.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: palette.bgLight },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: palette.primary,
                          textAlign: 'center',
                        }}
                      >
                        {t('common.allResults')}
                      </Typography>
                    </Box>
                  </>
                )}
              </Paper>
            )}
          </Box>
        </ClickAwayListener>

        {/* Language switcher */}
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          {(['en', 'tr'] as const).map((lng) => (
            <Box
              key={lng}
              component="button"
              onClick={() => switchLocale(lng)}
              sx={{
                px: 1,
                py: 0.5,
                border: `1px solid ${locale === lng ? palette.primary : palette.bgLight}`,
                borderRadius: '4px',
                bgcolor: locale === lng ? palette.primary : 'transparent',
                color: locale === lng ? 'white' : palette.primary,
                cursor: 'pointer',
                fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'uppercase' as const,
              }}
            >
              {t(`lang.${lng}`)}
            </Box>
          ))}
        </Box>

        {!!customer ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MuiLink
              component={Link}
              href="/account"
              underline="none"
              sx={{
                fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
                fontSize: 14,
                color: palette.primary,
                whiteSpace: 'nowrap',
              }}
            >
              {customer?.name?.split(' ')[0] || t('common.cabinet')}
            </MuiLink>
            <MuiLink
              component="button"
              onClick={signOut}
              underline="none"
              sx={{
                fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
                fontSize: 13,
                color: palette.primaryLight,
                cursor: 'pointer',
                border: 'none',
                bgcolor: 'transparent',
                p: 0,
              }}
            >
              {t('common.signOut')}
            </MuiLink>
          </Box>
        ) : (
          <Link href="/login" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/icons/login.svg" alt={t('common.signIn')} style={{ width: 86, height: 33 }} />
          </Link>
        )}
        <Link href="/basket">
          <Badge
            badgeContent={totalQuantity}
            invisible={totalQuantity === 0}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: palette.cartBadge,
                color: 'white',
                fontSize: 11,
                minWidth: 18,
                height: 18,
                top: 6,
                right: 6,
              },
            }}
          >
            <img src="/icons/cart.svg" alt={t('common.cart')} style={{ width: 38, height: 35 }} />
          </Badge>
        </Link>
      </Box>

      {/* ===== MOBILE (xs only): two rows ===== */}
      {/* Mobile: single row — logo + sign in + cart + burger */}
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          alignItems: 'center',
          px: 2,
          height: 56,
          gap: 1.5,
        }}
      >
        <Link href="/" style={{ flexShrink: 0 }}>
          <img src="/logo.png" alt="American Creator" style={{ height: 36, width: 'auto' }} />
        </Link>
        <Box sx={{ flex: 1 }} />
        {!!customer ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <MuiLink
              component={Link}
              href="/account"
              underline="none"
              sx={{
                fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
                fontSize: 14,
                color: palette.primary,
                whiteSpace: 'nowrap',
              }}
            >
              {customer?.name?.split(' ')[0] || t('common.cabinet')}
            </MuiLink>
            <MuiLink
              component="button"
              onClick={signOut}
              underline="none"
              sx={{
                fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
                fontSize: 13,
                color: palette.primaryLight,
                whiteSpace: 'nowrap',
                border: 'none',
                bgcolor: 'transparent',
                cursor: 'pointer',
                p: 0,
              }}
            >
              {t('common.signOut')}
            </MuiLink>
          </Box>
        ) : (
          <MuiLink
            component={Link}
            href="/login"
            underline="none"
            sx={{
              fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
              fontSize: 14,
              color: palette.primary,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {t('common.signIn')}
          </MuiLink>
        )}
        <Link href="/basket" style={{ flexShrink: 0, display: 'flex' }}>
          <Badge
            badgeContent={totalQuantity}
            invisible={totalQuantity === 0}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: palette.cartBadge,
                color: 'white',
                fontSize: 10,
                minWidth: 16,
                height: 16,
                top: 4,
                right: 4,
              },
            }}
          >
            <img src="/icons/cart.svg" alt={t('common.cart')} style={{ width: 28, height: 26 }} />
          </Badge>
        </Link>
        <IconButton onClick={() => setMenuOpen(true)} sx={{ p: 0.5, flexShrink: 0 }}>
          <MenuIcon sx={{ fontSize: 24, color: palette.primary }} />
        </IconButton>
      </Box>

      {/* Mobile row 2: search bar */}
      <Box sx={{ display: { xs: 'block', sm: 'none' }, px: 2, pb: 1 }}>
        <ClickAwayListener onClickAway={() => setShowSuggestions(false)}>
          <Box sx={{ position: 'relative' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                border: `0.5px solid ${palette.primary}`,
                borderRadius: '10px',
                px: 1.5,
                width: '100%',
                height: 36,
                bgcolor: 'white',
              }}
            >
              <InputBase
                placeholder={t('common.search')}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                sx={{
                  flex: 1,
                  fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
                  fontSize: 14,
                  color: palette.primary,
                  '& ::placeholder': { color: '#adb7d9' },
                }}
              />
              <img
                src="/icons/search.svg"
                alt={t('common.search')}
                onClick={handleSearch}
                style={{ width: 20, height: 20, cursor: 'pointer' }}
              />
            </Box>
            {showSuggestions && (
              <Paper
                elevation={4}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 0.5,
                  zIndex: 1300,
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={20} sx={{ color: palette.primary }} />
                  </Box>
                ) : suggestions.length === 0 ? (
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography sx={{ fontSize: 13, color: palette.primaryLight }}>
                      {t('common.noResults')}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {suggestions.map((p) => {
                      const img = p.images?.sort((a, b) => a.sort - b.sort)[0];
                      return (
                        <Box
                          key={p.id}
                          component={Link}
                          href={productHref(p)}
                          onClick={() => setShowSuggestions(false)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.5,
                            py: 0.75,
                            textDecoration: 'none',
                            color: 'inherit',
                            '&:hover': { bgcolor: palette.bgLight },
                          }}
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              flexShrink: 0,
                              borderRadius: '4px',
                              overflow: 'hidden',
                              bgcolor: '#f5f5f5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {img ? (
                              <img
                                src={imgThumb(img.file_path)}
                                alt={p.name}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              <Box sx={{ width: '100%', height: '100%', bgcolor: '#eee' }} />
                            )}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: palette.primary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.name}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: palette.primaryLight }}>
                              {fmtMoney(p.price, 'TRY', bcp47)}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                    <Box
                      component="button"
                      onClick={handleSearch}
                      sx={{
                        display: 'block',
                        width: '100%',
                        border: 'none',
                        borderTop: `1px solid ${palette.bgLight}`,
                        bgcolor: 'white',
                        py: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: palette.bgLight },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: palette.primary,
                          textAlign: 'center',
                        }}
                      >
                        {t('common.allResults')}
                      </Typography>
                    </Box>
                  </>
                )}
              </Paper>
            )}
          </Box>
        </ClickAwayListener>
      </Box>

      {/* ===== DESKTOP NAV BAR (sm+) ===== */}
      <Box
        sx={{
          bgcolor: palette.bgLight,
          height: { sm: 48, lg: 60 },
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            maxWidth: 1300,
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            px: 2,
            gap: { sm: 1.5, md: 2, lg: 3 },
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === '/catalog' && pathname?.startsWith('/catalog'));
            return (
              <MuiLink
                key={item.label}
                component={Link}
                href={item.href}
                underline="none"
                sx={{
                  fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
                  fontSize: { sm: 14, md: 16, lg: 18 },
                  fontWeight: isActive ? 700 : 400,
                  lineHeight: '23px',
                  color: palette.primary,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                {item.label}
              </MuiLink>
            );
          })}
        </Box>
      </Box>

      {/* ===== MOBILE MENU DRAWER ===== */}
      <Drawer
        anchor="left"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        PaperProps={{ sx: { width: 280, bgcolor: 'white' } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography
            sx={{
              fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: palette.primary,
              textTransform: 'uppercase',
            }}
          >
            {t('nav.menu')}
          </Typography>
          <IconButton onClick={() => setMenuOpen(false)}>
            <CloseIcon sx={{ color: palette.primary }} />
          </IconButton>
        </Box>

        {/* Mobile language switcher */}
        <Box sx={{ display: 'flex', gap: 1, px: 2, pb: 1 }}>
          {(['en', 'tr'] as const).map((lng) => (
            <Box
              key={lng}
              component="button"
              onClick={() => {
                setMenuOpen(false);
                switchLocale(lng);
              }}
              sx={{
                px: 1.5,
                py: 0.5,
                border: `1px solid ${locale === lng ? palette.primary : palette.bgLight}`,
                borderRadius: '4px',
                bgcolor: locale === lng ? palette.primary : 'transparent',
                color: locale === lng ? 'white' : palette.primary,
                cursor: 'pointer',
                fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
                fontSize: 13,
                fontWeight: 500,
                textTransform: 'uppercase' as const,
              }}
            >
              {t(`lang.${lng}`)}
            </Box>
          ))}
        </Box>

        <List>
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === '/catalog' && pathname?.startsWith('/catalog'));
            return (
              <ListItemButton
                key={item.label}
                component={Link}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                selected={isActive}
                sx={{ '&.Mui-selected': { bgcolor: palette.bgLight } }}
              >
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    sx: {
                      fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
                      fontSize: 18,
                      fontWeight: isActive ? 700 : 400,
                      color: palette.primary,
                      textTransform: 'uppercase',
                    },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Divider sx={{ mx: 2, my: 1 }} />

        <List>
          {(!!customer
            ? [
                { label: t('common.account'), href: '/account' },
                { label: 'Orders', href: '/account/orders' },
              ]
            : [{ label: t('common.signIn'), href: '/login' }]
          ).map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              selected={pathname === item.href}
              sx={{ '&.Mui-selected': { bgcolor: palette.bgLight } }}
            >
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  sx: {
                    fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
                    fontSize: 18,
                    fontWeight: 400,
                    color: palette.primary,
                    textTransform: 'uppercase',
                  },
                }}
              />
            </ListItemButton>
          ))}
          {!!customer && (
            <ListItemButton
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
            >
              <ListItemText
                primary={t('common.signOut')}
                primaryTypographyProps={{
                  sx: {
                    fontFamily: '"Futura PT", "Ubuntu", Arial, sans-serif',
                    fontSize: 18,
                    fontWeight: 400,
                    color: palette.primaryLight,
                    textTransform: 'uppercase',
                  },
                }}
              />
            </ListItemButton>
          )}
        </List>
      </Drawer>
    </AppBar>
  );
}
