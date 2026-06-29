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
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/providers/CartProvider';
import { useAuth } from '@/lib/auth-context';
import { palette } from '@/lib/theme';
import { fetchProducts, type Product } from '@/lib/api';
import { imgThumb } from '@/lib/image-url';

const NAV_ITEMS = [
  { label: 'Каталог', href: '/catalog' },
  { label: 'Новинки', href: '/catalog?sort=-date_created' },
  { label: 'Nail-Студиям', href: '/studios' },
  { label: 'Партнерам', href: '/partners' },
  { label: 'Контакты', href: '/contacts' },
];

function productHref(p: Product) {
  return `/catalog/${p.category?.slug ?? 'all'}/${p.slug ?? p.id}`;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { totalQuantity } = useCart();
  const { customer, isLogged, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(
    searchParams.get('search') || searchParams.get('q') || '',
  );
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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
            +7 995 757-84-67
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
            По будням с 9:00 до 18:00
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
                placeholder="Поиск"
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
                alt="Поиск"
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
                      Ничего не найдено
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
                              {p.price.toLocaleString('ru-RU')} ₽
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
                        Все результаты →
                      </Typography>
                    </Box>
                  </>
                )}
              </Paper>
            )}
          </Box>
        </ClickAwayListener>

        {isLogged ? (
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
              {customer?.name?.split(' ')[0] || 'Кабинет'}
            </MuiLink>
            <MuiLink
              component="button"
              onClick={logout}
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
              Выйти
            </MuiLink>
          </Box>
        ) : (
          <Link href="/login" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/icons/login.svg" alt="Войти" style={{ width: 86, height: 33 }} />
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
            <img src="/icons/cart.svg" alt="Корзина" style={{ width: 38, height: 35 }} />
          </Badge>
        </Link>
      </Box>

      {/* ===== MOBILE (xs only): two rows ===== */}
      {/* Mobile: single row — logo + Войти + cart + burger */}
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
        {isLogged ? (
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
              {customer?.name?.split(' ')[0] || 'Кабинет'}
            </MuiLink>
            <MuiLink
              component="button"
              onClick={logout}
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
              Выйти
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
            Войти
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
            <img src="/icons/cart.svg" alt="Корзина" style={{ width: 28, height: 26 }} />
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
                placeholder="Поиск"
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
                alt="Поиск"
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
                      Ничего не найдено
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
                              {p.price.toLocaleString('ru-RU')} ₽
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
                        Все результаты →
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
            Меню
          </Typography>
          <IconButton onClick={() => setMenuOpen(false)}>
            <CloseIcon sx={{ color: palette.primary }} />
          </IconButton>
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
          {(isLogged
            ? [
                { label: 'Личный кабинет', href: '/account' },
                { label: 'Мои заказы', href: '/account/orders' },
              ]
            : [{ label: 'Войти', href: '/login' }]
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
          {isLogged && (
            <ListItemButton
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
            >
              <ListItemText
                primary="Выйти"
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
