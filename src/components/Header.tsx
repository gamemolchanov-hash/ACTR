'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
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
import { useRouter as useNextRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';

// Телефон витрины — build-time env; у american-creator.ru публичного телефона нет,
// поэтому пустое значение просто прячет блок (часы работы остаются).
const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || '';
import { useCart } from '@/providers/CartProvider';
import { useAuth } from '@/lib/auth-context';
import { palette } from '@/lib/theme';
import { fetchProducts, type Product } from '@/lib/api';
import { imgThumb } from '@/lib/image-url';
import { fmtMoney } from '@/lib/money';
import { PRELAUNCH } from '@/lib/prelaunch';
import { CASHBACK_WALLET_PROGRAM } from '@/lib/loyalty';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import { useLoyaltyProgram } from '@/providers/LoyaltyProgramProvider';
import { persistLocalePreference } from '@/lib/consent';
import { useCurrency, useFormatLocale } from '@/providers/CurrencyProvider';

function productHref(p: Product) {
  return `/catalog/${p.category?.slug ?? 'all'}/${p.slug ?? p.id}`;
}

function isNavItemActive(itemHref: string, pathname: string | null, catalogSort: string | null) {
  if (itemHref === '/catalog') {
    return !!pathname?.startsWith('/catalog') && catalogSort !== '-date_created';
  }
  if (itemHref === '/catalog?sort=-date_created') {
    return pathname === '/catalog' && catalogSort === '-date_created';
  }
  return pathname === itemHref;
}

// usePathname() (next-intl, see below) never carries the query string, so
// "Catalog" and "New Arrivals" (/catalog vs /catalog?sort=-date_created) are
// indistinguishable through it alone — Catalog always won the highlight.
// useSearchParams() is the only thing that sees the query, but it forces a
// Suspense boundary around whatever reads it (FBG-472 above hit this for the
// whole header). Isolating it to this invisible, render-nothing watcher keeps
// the boundary — and the resulting client-only bailout — to a component with
// no markup, so the rest of the header still prerenders.
function CatalogSortWatcher({ onChange }: { onChange: (sort: string | null) => void }) {
  const sort = useSearchParams().get('sort');
  useEffect(() => {
    onChange(sort);
  }, [sort, onChange]);
  return null;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const nextRouter = useNextRouter();
  const locale = useLocale();
  const t = useTranslations();
  const { totalQuantity } = useCart();
  const { customer, signOut, loyalty } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  // Компактная шапка при прокрутке (образец — forza-brava.com, владелец 21.09): на телефоне
  // сервисная строка (меню / «Войти») схлопывается, остаётся строка логотип/поиск/корзина.
  // Порог с ГИСТЕРЕЗИСОМ (вкл при > 90, выкл при < 30): одиночный порог зацикливается —
  // схлопывание меняет высоту шапки (~20 px) → сдвиг scrollY → повторное пересечение порога.
  const [compact, setCompact] = useState(false);
  // Current ?sort= value, kept in sync by the invisible CatalogSortWatcher below —
  // used only to tell the "Catalog" and "New Arrivals" nav links apart.
  const [catalogSort, setCatalogSort] = useState<string | null>(null);
  useEffect(() => {
    const onScroll = () =>
      setCompact((prev) => (prev ? window.scrollY > 30 : window.scrollY > 90));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // React 19 types: useRef requires an initial value (no zero-arg overload).
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const currency = useCurrency();
  const formatLocale = useFormatLocale();
  // Live programme (uncached /config, see LoyaltyProgramProvider): the Creator
  // Club entry appears ONLY for a confirmed `cashback_wallet` — an unproven or
  // dormant programme is never linked (FBG-469).
  const loyaltyProgram = useLoyaltyProgram();

  const NAV_ITEMS = [
    { label: t('nav.catalog'), href: '/catalog' },
    { label: t('nav.new'), href: '/catalog?sort=-date_created' },
    ...(loyaltyProgram === CASHBACK_WALLET_PROGRAM
      ? [{ label: t('rewards.navLabel'), href: '/rewards' }]
      : []),
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

  // Search box prefill — read from the URL on mount instead of `useSearchParams()`
  // (FBG-472).
  //
  // That hook was the only thing in the whole header that needed a Suspense
  // boundary, and the boundary is what made the header the one piece of chrome
  // that does NOT render with the rest of the page:
  //
  //  - prerendered routes (every `/[locale]/*` page here) bail the ENTIRE header
  //    out of the HTML — the built `/en.html` carried
  //    `<!--$!--><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING">` where
  //    the header belongs, and no `<header>` anywhere;
  //  - `next dev` streams it in as a late boundary (`<!--$?-->` in place, markup
  //    delivered at the end of the document) that hydrates in its OWN pass, after
  //    the provider and the footer are already live — so for as long as that pass
  //    is outstanding the header is inert server markup: no fibers on its nodes,
  //    nav links behaving as plain `<a>` (full page loads), and a published
  //    programme rendering into the footer but not into it.
  //
  // The prefill itself never needed the hook: this layout is persistent, so the
  // state initialiser only ever ran on a full document load, which is exactly
  // when `location.search` is the query being rendered. Same value, no boundary.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('search') || params.get('q');
    // Never overwrite something the visitor has already typed.
    if (q) setSearchValue((current) => current || q);
  }, []);

  // Language switcher (FBG-395): NEXT_LOCALE is a functional cookie, so it is only
  // persisted through the consent gate (a no-op without İşlevsel consent). Navigate
  // with the raw router + explicit locale prefix so next-intl's client cookie sync
  // (syncLocaleCookie) never writes NEXT_LOCALE behind the gate. The language still
  // switches — it lives in the URL — it just isn't remembered without consent.
  const switchLocale = (next: string) => {
    persistLocalePreference(next);
    nextRouter.replace(`/${next}${pathname === '/' ? '' : pathname}`);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      data-compact={compact ? 'true' : 'false'}
      sx={{
        // Телефон: «мутное стекло» как у forza-brava.com — там фона у шапки нет вовсе, только
        // backdrop-blur 24 px; здесь лёгкий белый оттенок ради читаемости логотипа (владелец 21.09:
        // «прозрачнее, как на forza-brava»).
        bgcolor: { xs: 'rgba(255,255,255,0.45)', sm: 'white' },
        backdropFilter: { xs: 'blur(24px) saturate(1.3)', sm: 'none' },
        WebkitBackdropFilter: { xs: 'blur(24px) saturate(1.3)', sm: 'none' },
        borderBottom: { xs: '1px solid rgba(0,0,0,0.06)', sm: 'none' },
      }}
    >
      <Suspense fallback={null}>
        <CatalogSortWatcher onChange={setCatalogSort} />
      </Suspense>

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
          <img src="/logo.svg?v=2" alt="American Creator" style={{ width: 240, height: 57 }} />
        </Link>

        <Box sx={{ ml: 3, display: { xs: 'none', lg: 'block' } }}>
          {CONTACT_PHONE && (
            <Typography
              sx={{
                fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
                fontSize: 20,
                fontWeight: 500,
                lineHeight: '26px',
                color: palette.primary,
              }}
            >
              {CONTACT_PHONE}
            </Typography>
          )}

        </Box>

        {/* touchEvent=false: десктопный и мобильный списки делят одно состояние, и на телефоне
            скрытый «чужой» ClickAwayListener закрывал подсказки по touchend — раньше click,
            тап проваливался в баннер под списком (/delivery). Закрываем только по click. */}
        <ClickAwayListener onClickAway={() => setShowSuggestions(false)} touchEvent={false}>
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
                  fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
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
                              {PRELAUNCH
                                ? t('prelaunch.comingSoon')
                                : fmtMoney(p.price, currency, formatLocale)}
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

        {/* Language switcher — только когда локалей больше одной (ACRU: ru) */}
        {routing.locales.length > 1 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          {routing.locales.map((lng) => (
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
                fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'uppercase' as const,
              }}
            >
              {t(`lang.${lng}`)}
            </Box>
          ))}
        </Box>
        )}

        {/* Пилюля Creator Club как на american-creator.ru: баланс + XP у участника,
            «Вступить» у гостя; только у подтверждённой программы (FBG-469). */}
        {loyaltyProgram === CASHBACK_WALLET_PROGRAM && (!customer || loyalty) && (
          <Box
            component={Link}
            href="/rewards"
            data-testid="sf-header-club-pill"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              height: 44,
              px: 1.5,
              borderRadius: '999px',
              border: `1px solid ${palette.primary}40`,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'border-color 0.15s',
              '&:hover': { borderColor: palette.primary },
            }}
          >
            <StarBorderRoundedIcon sx={{ fontSize: 20, color: palette.primary }} />
            {customer && loyalty ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography
                  sx={{
                    fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
                    fontSize: 14,
                    fontWeight: 700,
                    lineHeight: '16px',
                    color: palette.primary,
                  }}
                >
                  {fmtMoney(Number(loyalty.wallet_balance) || 0, currency, formatLocale)}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
                    fontSize: 11,
                    fontWeight: 400,
                    lineHeight: '12px',
                    color: palette.primaryLight,
                  }}
                >
                  {`${(Number(loyalty.xp_active) || 0).toLocaleString(formatLocale)} XP`}
                </Typography>
              </Box>
            ) : (
              <Typography
                sx={{
                  fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
                  fontSize: 13,
                  fontWeight: 500,
                  color: palette.primary,
                }}
              >
                {t('common.clubJoin')}
              </Typography>
            )}
          </Box>
        )}

        {!!customer ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MuiLink
              component={Link}
              href="/account"
              underline="none"
              sx={{
                fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
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
              data-testid="sf-header-logout"
              underline="none"
              sx={{
                fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
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
          <Link
            href="/login"
            data-testid="sf-header-login"
            style={{ display: 'flex', alignItems: 'center' }}
          >
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

      {/* ===== MOBILE (xs only): сервисная строка + логотип/поиск/корзина (образец — forza-brava.com, 21.09.2026) ===== */}
      <Box sx={{ display: { xs: 'block', sm: 'none' }, px: 1.5, pt: 0.5, pb: 1 }}>
      {/* Row 1: меню слева, язык и вход/имя справа */}
      <Box
        data-testid="sf-header-utility-row"
        aria-hidden={compact}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          // Полоса вдвое тоньше (владелец 21.09): 16 px вместо 30, иконка меню 20 px.
          // При прокрутке (compact) строка схлопывается в 0 — как верхняя строка forza-brava.com.
          height: compact ? 0 : 16,
          mb: compact ? 0 : 0.5,
          opacity: compact ? 0 : 1,
          visibility: compact ? 'hidden' : 'visible',
          overflow: 'hidden',
          transition: 'height .3s ease, margin .3s ease, opacity .3s ease, visibility .3s',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', ml: -0.75 }}>
        <IconButton
          onClick={() => setMenuOpen(true)}
          data-testid="sf-header-menu"
          sx={{ p: 0, flexShrink: 0, height: 20 }}
        >
          <MenuIcon sx={{ fontSize: 20, color: palette.primary }} />
        </IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
        {!!customer && (
          <MuiLink
            component={Link}
            href="/account"
            data-testid="sf-header-account"
            underline="none"
            sx={{
              fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
              fontSize: 13,
              color: palette.primary,
              whiteSpace: 'nowrap',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {customer?.name?.split(' ')[0] || t('common.cabinet')}
          </MuiLink>
        )}
        {!customer && (
          <MuiLink
            component={Link}
            href="/login"
            data-testid="sf-header-login"
            underline="none"
            sx={{
              display: 'flex',
              alignItems: 'center',
              minHeight: 16,
              fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
              fontSize: 13,
              lineHeight: '16px',
              color: palette.primary,
              whiteSpace: 'nowrap',
            }}
          >
            {t('common.signIn')}
          </MuiLink>
        )}

        {/* Language switcher — replaces Sign Out on mobile (FBG-429); Sign Out moved to Drawer */}
        {routing.locales.length > 1 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          {routing.locales.map((lng) => (
            <Box
              key={lng}
              component="button"
              onClick={() => switchLocale(lng)}
              sx={{
                px: 0.5,
                py: 0.25,
                border: `1px solid ${locale === lng ? palette.primary : palette.bgLight}`,
                borderRadius: '4px',
                bgcolor: locale === lng ? palette.primary : 'transparent',
                color: locale === lng ? 'white' : palette.primary,
                cursor: 'pointer',
                fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
                fontSize: 11,
                fontWeight: 500,
                lineHeight: 1.4,
                textTransform: 'uppercase' as const,
              }}
            >
              {t(`lang.${lng}`)}
            </Box>
          ))}
        </Box>
        )}
        </Box>
      </Box>

      {/* Row 2: логотип + поиск + клуб + корзина */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 48 }}>
        <Link href="/" style={{ flexShrink: 0, display: 'flex' }}>
          <img src="/logo.svg?v=2" alt="American Creator" style={{ height: 8, width: 'auto' }} />
        </Link>
        {/* touchEvent=false: десктопный и мобильный списки делят одно состояние, и на телефоне
            скрытый «чужой» ClickAwayListener закрывал подсказки по touchend — раньше click,
            тап проваливался в баннер под списком (/delivery). Закрываем только по click. */}
        <ClickAwayListener onClickAway={() => setShowSuggestions(false)} touchEvent={false}>
          <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                border: `0.5px solid ${palette.primary}`,
                borderRadius: '10px',
                px: 1.5,
                width: '100%',
                height: 40,
                // Полупрозрачное поле — сквозь «стекло» шапки виден каталог (как у forza-brava.com).
                bgcolor: 'rgba(255,255,255,0.35)',
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
                  fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
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
                              {PRELAUNCH
                                ? t('prelaunch.comingSoon')
                                : fmtMoney(p.price, currency, formatLocale)}
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
        {loyaltyProgram === CASHBACK_WALLET_PROGRAM && !customer && (
          <MuiLink
            component={Link}
            href="/rewards"
            data-testid="sf-header-club-pill"
            underline="none"
            sx={{
              // Круглая кнопка со звездой без слова — не отъедает место у поиска
              // (владелец 21.09); подпись «Вступить» — в aria-label и title.
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              // Круглая кнопка: светло-синий контур и контурная звезда, как у пилюли клуба
              // на десктопе (первый вариант, выбран владельцем 21.09).
              border: `1px solid ${palette.primary}40`,
              bgcolor: 'white',
              flexShrink: 0,
              color: palette.primary,
              '&:hover': { borderColor: palette.primary },
            }}
            aria-label={t('common.clubJoin')}
            title={t('common.clubJoin')}
          >
            <StarBorderRoundedIcon sx={{ fontSize: 20 }} />
          </MuiLink>
        )}
        {/* Участник клуба: баланс · XP одной строкой (имя — справа, «Выйти» — в бургер-меню) */}
        {loyaltyProgram === CASHBACK_WALLET_PROGRAM && !!customer && loyalty && (
          <Box
            component={Link}
            href="/rewards"
            data-testid="sf-header-club-pill"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              height: 36,
              px: 1,
              borderRadius: '999px',
              border: `1px solid ${palette.primary}40`,
              flexShrink: 0,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
            }}
          >
            {/* Две строки мелким шрифтом, чтобы не отъедать место у поиска (владелец 21.09). */}
            <StarBorderRoundedIcon sx={{ fontSize: 14, color: palette.primary }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: '12px', color: palette.primary, fontFamily: 'inherit' }}>
                {fmtMoney(Number(loyalty.wallet_balance) || 0, currency, formatLocale)}
              </Typography>
              <Typography sx={{ fontSize: 9, lineHeight: '11px', color: palette.primaryLight, fontFamily: 'inherit' }}>
                {`${(Number(loyalty.xp_active) || 0).toLocaleString(formatLocale)} XP`}
              </Typography>
            </Box>
          </Box>
        )}
        <Link
          href="/basket"
          data-testid="sf-header-cart"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 40,
            minHeight: 40,
          }}
        >
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
      </Box>
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
            const isActive = isNavItemActive(item.href, pathname, catalogSort);
            return (
              <MuiLink
                key={item.label}
                component={Link}
                href={item.href}
                underline="none"
                aria-current={isActive ? 'page' : undefined}
                sx={{
                  fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
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
              fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
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
        {routing.locales.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, px: 2, pb: 1 }}>
          {routing.locales.map((lng) => (
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
                fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
                fontSize: 13,
                fontWeight: 500,
                textTransform: 'uppercase' as const,
              }}
            >
              {t(`lang.${lng}`)}
            </Box>
          ))}
        </Box>
        )}

        <List>
          {NAV_ITEMS.map((item) => {
            const isActive = isNavItemActive(item.href, pathname, catalogSort);
            return (
              <ListItemButton
                key={item.label}
                component={Link}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                sx={{ '&.Mui-selected': { bgcolor: palette.bgLight } }}
              >
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    sx: {
                      fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
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
                { label: t('account.myOrders'), href: '/account/orders' },
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
                    fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
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
                    fontFamily: 'LiraFix, "Jost", "Jost Fallback", "Ubuntu", Arial, sans-serif',
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
