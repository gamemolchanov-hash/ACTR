'use client';

/**
 * Creator Club landing — port of the ACRU/ACSTORE /rewards page (FBG-501/513),
 * which the owner set as the reference for ACTR (07.10.2026).
 *
 * Composition, same as ACRU: hero → dark wallet card (balance | XP | level with
 * the cashback chip) → progress card (segmented XP bar + level dots) → "Your
 * levels" (one card-button per tier with a product shot, lock on locked tiers and
 * a rules modal) → member discount on categories → three "how it works" steps →
 * CTA. Palette, fonts and components are ACTR's own (MUI + LiraFix/Jost + Open
 * Sans), every string goes through next-intl, money through `fmtMoney` in the
 * storefront currency.
 *
 * A guest sees the card with zeros and the first tier active; a signed-in member
 * sees their own balance, tier and XP progress (the /auth/me snapshot from
 * `useAuth`). Every programme figure (tiers, rates, thresholds, XP window and
 * lifetime, wallet cap, category discounts) arrives as a prop from the server
 * and is never duplicated here.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from '@/i18n/navigation';
import { fetchCategories } from '@/lib/api';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useHydrated } from '@/lib/use-hydrated';
import { fmtMoney } from '@/lib/money';
import { useCurrency, useFormatLocale } from '@/providers/CurrencyProvider';
import { CreatorClubError, useTierLabel } from '@/components/CreatorClub';
import { formatPercent, ratePercent, tierProgress } from '@/lib/loyalty';
import type { RewardsProgram } from '@/lib/rewards';

const fontMain = 'LiraFix, "Jost", "Jost Fallback", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';
/** Body copy that may print a lira sign: LiraFix maps only U+20BA, the rest stays Open Sans. */
const fontBodyMoney = `LiraFix, ${fontBody}`;

/** Ink of a tier the visitor has not reached — muted, but still readable on white. */
const LOCKED_INK = 'rgba(51,74,159,0.5)';

/** Product shot per tier (the reference shows products); unknown codes cycle through them. */
const TIER_IMAGES: Record<string, string> = {
  base: '/images/rewards/tier-base.jpg',
  silver: '/images/rewards/tier-silver.jpg',
  gold: '/images/rewards/tier-gold.jpg',
};
const TIER_IMAGE_LIST = Object.values(TIER_IMAGES);
const tierImage = (code: string, i: number) =>
  TIER_IMAGES[code] ?? TIER_IMAGE_LIST[i % TIER_IMAGE_LIST.length];

/** Small spaced label above a large value — shared by the hero and the cards. */
const eyebrowSx = {
  fontFamily: fontBody,
  fontSize: { xs: 11, md: 12 },
  fontWeight: 600,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: palette.primary,
} as const;

/** The same label on the dark wallet card. */
const eyebrowDarkSx = {
  ...eyebrowSx,
  fontSize: 10,
  color: 'rgba(255,255,255,0.55)',
} as const;

const PAGE_SX = { maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, py: { xs: 2, md: 4 } } as const;

export function RewardsView({ program }: { program: RewardsProgram }) {
  const t = useTranslations();
  const locale = useLocale();
  const tierLabel = useTierLabel();
  const currency = useCurrency();
  const formatLocale = useFormatLocale();
  // `loading`: the token is still being validated after a reload. Until /me
  // answers the shopper is formally signed out, and without this pause a
  // returning member would see a flash of guest zeros and the "join" CTA.
  const { customer, loyalty, loading: authLoading, refreshProfile } = useAuth();
  // The token is read from localStorage on the client only: the SSR markup has
  // `loading = false` (guest zeros + CTA), so a first client render with a
  // token would mismatch (React #418). The pause starts after hydration.
  const hydrated = useHydrated();
  const authPending = hydrated && authLoading;

  // The wallet figures live in the /me snapshot AuthProvider loads once per page
  // load; re-read it on entry so a balance spent at checkout earlier in the
  // session is not still shown here (FBG-469 review).
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const isLogged = !!customer;
  // A profile without `tier_code` (the programme is not live for it) shows the
  // guest zeros instead of an endless spinner.
  const showPersonal = isLogged && !!loyalty?.tier_code;

  const [selectedTier, setSelectedTier] = useState<number | null>(null);

  const { tiers } = program;
  const nf = new Intl.NumberFormat(formatLocale);
  const xp = (n: number) => nf.format(n);
  /** A config rate (fraction) as a localised percent number — "5", "3,5" — or null. */
  const pct = (rate?: number | null) => {
    const p = ratePercent(rate);
    return p == null ? null : formatPercent(p, formatLocale);
  };

  // Member price on categories (FBG-600). Rates come from the programme, names
  // from the public category list: the config carries ids only, so a different
  // set of categories or rates changes this block with no code edit.
  const categoryDiscounts = program.categoryDiscounts;
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: !!categoryDiscounts,
  });
  const discountedCategories = useMemo(() => {
    const ids = new Set(categoryDiscounts?.categoryIds ?? []);
    return (categoriesData?.data ?? []).filter((c) => ids.has(c.id));
  }, [categoriesData, categoryDiscounts]);
  const categoryNamesText = useMemo(() => {
    const names = discountedCategories.map((c) => c.name);
    if (names.length === 0) return null;
    try {
      return new Intl.ListFormat(locale, { type: 'conjunction' }).format(names);
    } catch {
      return names.join(', ');
    }
  }, [discountedCategories, locale]);
  // Tiers the discount actually gives something to: a zero rate is not an offer.
  const discountTiers = tiers.filter((tier) => (categoryDiscounts?.rates[tier.code] ?? 0) > 0);

  const tierCode = (showPersonal ? loyalty?.tier_code : undefined) ?? tiers[0]?.code;
  const xpActive = showPersonal ? Math.max(0, Number(loyalty?.xp_active) || 0) : 0;
  const progress = tierProgress(xpActive, tiers, tierCode);

  // Active tier: the first one for a guest.
  const activeIndex = Math.max(
    0,
    tiers.findIndex((tier) => tier.code === tierCode),
  );
  const activeTier = tiers[activeIndex];
  const activeRate = pct(
    showPersonal ? (loyalty?.cashback_rate ?? activeTier?.cashback_rate) : activeTier?.cashback_rate,
  );

  // wallet_cap: 0 is a real answer (spending is off) and null means "not sent" —
  // neither may turn into an invented percent (FBG-469 review).
  const capPct = program.walletCap != null && program.walletCap > 0 ? pct(program.walletCap) : null;
  const walletSpendOff = program.walletCap === 0;
  const unit = fmtMoney(1, currency, formatLocale, 0);

  const spinner = <CircularProgress size={24} sx={{ mt: 1.5, color: 'white' }} />;

  const steps = [
    {
      num: '01',
      Icon: AutoAwesomeOutlinedIcon,
      title: t('rewards.step1EarnTitle'),
      text: t('rewards.step1EarnDesc', { unit }),
    },
    {
      num: '02',
      Icon: SavingsOutlinedIcon,
      title: t('rewards.step2Title'),
      text: t('rewards.step2Desc'),
    },
    {
      num: '03',
      Icon: AccountBalanceWalletOutlinedIcon,
      title: t('rewards.step3Title'),
      text: walletSpendOff
        ? t('rewards.step3DescNoSpend')
        : capPct != null
          ? t('rewards.step3Desc', { percent: capPct })
          : t('rewards.step3DescNoCap'),
    },
  ];

  const dialogTier = selectedTier !== null ? tiers[selectedTier] : null;
  const dialogRate = dialogTier ? pct(dialogTier.cashback_rate) : null;

  return (
    <Box sx={PAGE_SX}>
      <Breadcrumb />

      {/* ── Hero ── */}
      <Box sx={{ textAlign: 'center', mt: { xs: 3, md: 5 }, mb: { xs: 4, md: 6 } }}>
        <Typography sx={eyebrowSx}>{t('rewards.programLabel')}</Typography>
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 34, md: 56 },
            lineHeight: { xs: '40px', md: '64px' },
            fontWeight: 450,
            color: palette.primary,
            mt: { xs: 1.5, md: 2 },
          }}
        >
          {t('loyalty.title')}
        </Typography>
        <Typography
          sx={{
            fontFamily: fontBody,
            fontSize: { xs: 15, md: 17 },
            color: palette.primary,
            maxWidth: 560,
            mx: 'auto',
            mt: 2,
          }}
        >
          {t('rewards.subtitle')}
        </Typography>
      </Box>

      {/* ── Wallet: dark card — balance, XP and tier ── */}
      <Box
        sx={{
          bgcolor: palette.primary,
          color: 'white',
          borderRadius: '24px',
          p: { xs: 2.5, md: 4 },
          mb: 1.5,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ mb: { xs: 2.5, md: 3.5 }, gap: 1.5, flexWrap: 'wrap' }}
        >
          {/*
            On a phone the wallet icon IS the label: the eyebrow broke into two
            lines next to the XP figure and pushed the card around (ACRU, owner's
            mobile review 26.08). The words stay for screen readers (aria-label
            on the icon tile) and come back visually from `md`.
          */}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              role="img"
              aria-label={t('loyalty.walletLabel')}
              sx={{
                width: 48,
                height: 48,
                flexShrink: 0,
                borderRadius: '16px',
                bgcolor: 'rgba(255,255,255,0.09)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 22, color: 'rgba(255,255,255,0.6)' }} />
            </Box>
            <Box>
              <Typography aria-hidden sx={{ ...eyebrowDarkSx, display: { xs: 'none', md: 'block' } }}>
                {t('loyalty.walletLabel')}
              </Typography>
              {authPending ? (
                spinner
              ) : (
                <Typography
                  data-testid="sf-rewards-balance"
                  sx={{
                    fontFamily: fontMain,
                    // 24 px on a phone: "₺1.530,00" and "30.600 XP" share one 350-px row
                    fontSize: { xs: 24, md: 36 },
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                    lineHeight: 1.1,
                    color: 'white',
                    mt: 0.5,
                  }}
                >
                  {fmtMoney(showPersonal ? Number(loyalty?.wallet_balance) || 0 : 0, currency, formatLocale)}
                </Typography>
              )}
            </Box>
          </Stack>
          <Box sx={{ textAlign: 'right', flexShrink: 0, alignSelf: 'center', ml: 'auto' }}>
            <Typography sx={eyebrowDarkSx}>{t('loyalty.kindLoyalty')}</Typography>
            {authPending ? (
              spinner
            ) : (
              <Typography
                data-testid="sf-rewards-xp"
                sx={{
                  fontFamily: fontMain,
                  fontSize: { xs: 24, md: 36 },
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                  lineHeight: 1.1,
                  color: 'white',
                  mt: 0.5,
                }}
              >
                {xp(xpActive)}{' '}
                <Box component="span" sx={{ fontSize: { xs: 16, md: 18 } }}>
                  {t('loyalty.xpUnit')}
                </Box>
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            bgcolor: 'rgba(255,255,255,0.08)',
            borderRadius: '16px',
            px: 2,
            py: 1.5,
            gap: 1,
            // the cashback chip wraps under the tier name instead of covering it
            flexWrap: 'wrap',
            rowGap: 1,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                flexShrink: 0,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ fontFamily: fontMain, fontSize: 16, fontWeight: 500, color: 'white' }}>
                {activeIndex + 1}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ ...eyebrowDarkSx, fontSize: 9 }}>{t('loyalty.tierLabel')}</Typography>
              <Typography
                data-testid="sf-rewards-tier"
                sx={{ fontFamily: fontMain, fontSize: 16, fontWeight: 500, lineHeight: 1.2, color: 'white' }}
              >
                {activeTier ? tierLabel(activeTier) : '—'}
              </Typography>
            </Box>
          </Stack>
          {activeRate != null && (
            <Chip
              icon={<BoltOutlinedIcon sx={{ fontSize: 15, '&&': { color: 'white' } }} />}
              label={t('loyalty.cashback', { rate: activeRate })}
              sx={{
                flexShrink: 0,
                bgcolor: 'rgba(255,255,255,0.12)',
                color: 'white',
                fontFamily: fontMain,
                fontSize: 15,
                fontWeight: 500,
              }}
            />
          )}
        </Stack>

        {showPersonal && !authPending && (
          <Typography sx={{ mt: 0.5, textAlign: 'right' }}>
            <Link
              href="/account/loyalty"
              style={{
                fontFamily: fontBody,
                fontSize: 13,
                color: 'rgba(255,255,255,0.8)',
                display: 'inline-block',
                padding: '12px 0', // ≥40 px tap target on a phone
              }}
            >
              {t('rewards.historyLink')}
            </Link>
          </Typography>
        )}
      </Box>

      {/* ── Progress: segmented XP bar and tier dots ── */}
      {tiers.length > 1 && (
        <Box sx={{ bgcolor: palette.bgLight, borderRadius: '20px', p: { xs: 2.5, md: 3.5 }, mb: 1.5 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2.5, gap: 1 }}
          >
            {progress.next ? (
              <>
                <Typography
                  data-testid="sf-rewards-progress"
                  sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primary, textAlign: 'center' }}
                >
                  {t.rich('rewards.progressToNext', {
                    tier: tierLabel(progress.next),
                    xp: xp(progress.xpToNext ?? 0),
                    b: (chunks) => <strong>{chunks}</strong>,
                  })}
                </Typography>
                {pct(progress.next.cashback_rate) != null && (
                  <Chip
                    icon={<TrendingUpOutlinedIcon sx={{ fontSize: 15, '&&': { color: palette.primary } }} />}
                    label={t('rewards.progressUnlocks', { rate: pct(progress.next.cashback_rate) ?? '' })}
                    size="small"
                    sx={{ bgcolor: 'white', color: palette.primary, fontFamily: fontBody, fontSize: 12 }}
                  />
                )}
              </>
            ) : (
              <Typography
                sx={{ fontFamily: fontBody, fontSize: 14, fontWeight: 600, color: palette.primary, mx: 'auto' }}
              >
                {t('loyalty.maxTier')}
              </Typography>
            )}
          </Stack>

          {/* XP bar: one segment per tier step, width by its XP range. */}
          <Stack direction="row" spacing="3px" sx={{ height: 10 }}>
            {tiers.slice(0, -1).map((tier, i) => {
              const segStart = tier.min_xp;
              const segEnd = tiers[i + 1].min_xp;
              const totalRange = tiers[tiers.length - 1].min_xp - tiers[0].min_xp || 1;
              let fillPct = 0;
              if (xpActive >= segEnd) fillPct = 100;
              else if (xpActive > segStart) fillPct = ((xpActive - segStart) / (segEnd - segStart || 1)) * 100;
              return (
                <Box
                  key={tier.code}
                  sx={{
                    width: `${((segEnd - segStart) / totalRange) * 100}%`,
                    bgcolor: 'white',
                    borderRadius: '5px',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${fillPct}%`,
                      height: '100%',
                      bgcolor: palette.primary,
                      borderRadius: '5px',
                      transition: 'width 1s ease-out',
                    }}
                  />
                </Box>
              );
            })}
          </Stack>

          {/* Tier dots under the bar. */}
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
            {tiers.map((tier, i) => {
              const isActive = i === activeIndex;
              const isReached = i <= activeIndex;
              const rate = pct(tier.cashback_rate);
              return (
                <Box
                  key={tier.code}
                  aria-current={isActive ? 'step' : undefined}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isReached ? palette.primary : 'white',
                      border: `2px solid ${isReached ? palette.primary : palette.primaryLight}`,
                      transform: isActive ? 'scale(1.12)' : 'none',
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: fontMain,
                        fontSize: 13,
                        fontWeight: 500,
                        color: isReached ? 'white' : LOCKED_INK,
                      }}
                    >
                      {i + 1}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: fontMain,
                      fontSize: { xs: 13, md: 15 },
                      fontWeight: isActive ? 500 : 450,
                      color: isReached ? palette.primary : LOCKED_INK,
                      mt: 0.75,
                    }}
                  >
                    {tierLabel(tier)}
                  </Typography>
                  {rate != null && (
                    <Typography sx={{ fontFamily: fontBody, fontSize: { xs: 12, md: 13 }, color: palette.primary }}>
                      {t('loyalty.cashback', { rate })}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* ── Your levels: product cards with the rules modal ── */}
      {tiers.length > 0 && (
        <Box sx={{ bgcolor: palette.bgLight, borderRadius: '20px', p: { xs: 1.5, md: 3 }, mb: 1.5 }}>
          <Typography sx={{ ...eyebrowSx, textAlign: 'center', mt: { xs: 0.5, md: 0 }, mb: 2.5 }}>
            {t('rewards.tiersTitle')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: `repeat(${Math.min(tiers.length, 3)}, minmax(0, 1fr))`,
                md: `repeat(${Math.min(tiers.length, 4)}, minmax(0, 1fr))`,
              },
              gap: { xs: 1, md: 2.5 },
            }}
          >
            {tiers.map((tier, i) => {
              const isCurrent = i === activeIndex;
              const isUnlocked = i <= activeIndex;
              const isLocked = !isUnlocked;
              const name = tierLabel(tier);
              const rate = pct(tier.cashback_rate);
              const ink = isCurrent ? 'white' : isLocked ? LOCKED_INK : palette.primary;
              const mutedInk = isCurrent ? 'rgba(255,255,255,0.75)' : isLocked ? LOCKED_INK : palette.primary;
              return (
                <Box
                  key={tier.code}
                  component="button"
                  type="button"
                  data-testid="sf-rewards-tier-card"
                  data-tier={tier.code}
                  onClick={() => setSelectedTier(i)}
                  aria-label={t('rewards.tierCardAria', { tier: name })}
                  aria-haspopup="dialog"
                  sx={{
                    font: 'inherit',
                    textAlign: 'center',
                    cursor: 'pointer',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    p: 0,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all .3s',
                    bgcolor: isCurrent ? palette.primary : 'white',
                    color: isCurrent ? 'white' : palette.primary,
                    border: isCurrent ? `1px solid ${palette.primary}` : '1px solid transparent',
                    '&:hover': { borderColor: palette.primary },
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      width: '100%',
                      boxSizing: 'border-box',
                      minHeight: 36,
                      gap: 0.5,
                      px: { xs: 1, md: 1.5 },
                      py: 1,
                      borderBottom: isCurrent ? '1px solid rgba(255,255,255,0.15)' : `1px solid ${palette.bgLight}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: fontBody,
                        fontSize: { xs: 11, md: 12 },
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                        color: mutedInk,
                      }}
                    >
                      {t('rewards.xpThreshold', { xp: xp(tier.min_xp) })}
                    </Typography>
                    {isCurrent && (
                      <Typography
                        sx={{
                          fontFamily: fontBody,
                          fontSize: 9,
                          fontWeight: 600,
                          // ACTR's body1 brings primary ink and a 23px line: white on the
                          // dark card, and a line that keeps the header as tall as its neighbours.
                          lineHeight: 1.6,
                          color: 'white',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          bgcolor: 'rgba(255,255,255,0.18)',
                          borderRadius: '999px',
                          px: 0.75,
                          py: 0.25,
                        }}
                      >
                        {t('rewards.youShort')}
                      </Typography>
                    )}
                    {isLocked && (
                      <LockOutlinedIcon
                        aria-label={t('rewards.lockedLabel')}
                        sx={{ fontSize: 13, color: LOCKED_INK }}
                      />
                    )}
                    {isUnlocked && !isCurrent && (
                      <CheckCircleOutlineIcon
                        aria-label={t('rewards.unlockedLabel')}
                        sx={{ fontSize: 14, color: palette.primary }}
                      />
                    )}
                  </Stack>

                  <Box sx={{ pt: 2, px: { xs: 1, md: 1.5 }, width: '100%', boxSizing: 'border-box' }}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: { xs: 72, md: 96 },
                        height: { xs: 72, md: 96 },
                        mx: 'auto',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        bgcolor: isCurrent ? 'rgba(255,255,255,0.9)' : palette.bgLight,
                      }}
                    >
                      <Box
                        component="img"
                        src={tierImage(tier.code, i)}
                        alt={name}
                        loading="lazy"
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          p: 0.5,
                          boxSizing: 'border-box',
                          filter: isLocked ? 'grayscale(1) blur(1px) opacity(0.35)' : 'none',
                        }}
                      />
                      {isLocked && (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <LockOutlinedIcon sx={{ fontSize: 20, color: LOCKED_INK }} />
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      px: { xs: 1, md: 1.5 },
                      pb: 2,
                      pt: 1,
                      width: '100%',
                      boxSizing: 'border-box',
                      flexGrow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: fontBody,
                        fontSize: { xs: 11, md: 12 },
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: mutedInk,
                      }}
                    >
                      {t('rewards.levelLabel', { n: i + 1 })}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: fontMain,
                        fontSize: { xs: 13, sm: 15, md: 18 },
                        fontWeight: 500,
                        lineHeight: 1.2,
                        textTransform: 'uppercase',
                        overflowWrap: 'anywhere',
                        color: ink,
                      }}
                    >
                      {name}
                    </Typography>
                    {rate != null && (
                      <Typography
                        sx={{
                          fontFamily: fontMain,
                          fontSize: { xs: 24, md: 28 },
                          fontWeight: 500,
                          lineHeight: 1.1,
                          color: ink,
                        }}
                      >
                        {t('rewards.ratePercent', { rate })}
                      </Typography>
                    )}
                    <Stack
                      direction="row"
                      justifyContent="center"
                      alignItems="center"
                      sx={{ mt: 'auto', pt: 1, color: mutedInk }}
                    >
                      <Typography
                        sx={{
                          fontFamily: fontBody,
                          fontSize: { xs: 10, md: 12 },
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          color: 'inherit',
                        }}
                      >
                        {t('rewards.details')}
                      </Typography>
                      <ChevronRightIcon sx={{ fontSize: 14 }} />
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* ── Member discount on categories: tier rates from the config (FBG-600) ── */}
      {categoryDiscounts && discountTiers.length > 0 && (
        <Box
          data-testid="sf-rewards-category-discount"
          sx={{ bgcolor: palette.bgLight, borderRadius: '20px', p: { xs: 2.5, md: 3.5 }, mb: { xs: 4, md: 5 } }}
        >
          <Typography sx={{ ...eyebrowSx, textAlign: 'center', mb: 1.5 }}>
            {t('rewards.categoryDiscountTitle')}
          </Typography>
          <Typography
            sx={{
              fontFamily: fontBody,
              fontSize: { xs: 14, md: 15 },
              lineHeight: 1.6,
              color: palette.primary,
              textAlign: 'center',
              maxWidth: 620,
              mx: 'auto',
            }}
          >
            {categoryNamesText
              ? t('rewards.categoryDiscountText', {
                  categories: categoryNamesText,
                  count: discountedCategories.length,
                })
              : t('rewards.categoryDiscountTextGeneric')}
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1.25, sm: 2 }}
            justifyContent="center"
            sx={{ mt: 2.5 }}
          >
            {discountTiers.map((tier) => {
              const isCurrent = tier.code === tierCode;
              return (
                <Stack
                  key={tier.code}
                  direction="row"
                  spacing={1}
                  alignItems="baseline"
                  justifyContent="center"
                  sx={{
                    bgcolor: isCurrent ? palette.primary : 'white',
                    color: isCurrent ? 'white' : palette.primary,
                    border: `1px solid ${isCurrent ? palette.primary : palette.primaryLight}`,
                    borderRadius: '16px',
                    px: 2,
                    py: 1.25,
                    minWidth: { sm: 150 },
                  }}
                >
                  <Typography sx={{ fontFamily: fontBody, fontSize: 13, color: 'inherit' }}>
                    {tierLabel(tier)}
                  </Typography>
                  <Typography
                    sx={{ fontFamily: fontMain, fontSize: 22, fontWeight: 500, lineHeight: 1, color: 'inherit' }}
                  >
                    {t('rewards.discountRate', { rate: pct(categoryDiscounts.rates[tier.code]) ?? '' })}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>

          <Typography sx={{ textAlign: 'center', mt: 2 }}>
            <Link
              href={discountedCategories.length === 1 ? `/catalog/${discountedCategories[0].slug}` : '/catalog'}
              style={{ fontFamily: fontBody, fontSize: 15, color: palette.primary }}
            >
              {t('rewards.categoryDiscountLink')}
            </Link>
          </Typography>
        </Box>
      )}

      {/* ── How it works: white card with a thin frame ── */}
      <Box
        sx={{
          bgcolor: 'white',
          border: `1px solid ${palette.primaryLight}`,
          boxShadow: '0 1px 3px rgba(51,74,159,0.06)',
          borderRadius: '20px',
          p: { xs: 3, md: 4.5 },
          mb: { xs: 4, md: 5 },
          mt: categoryDiscounts && discountTiers.length > 0 ? 0 : { xs: 2.5, md: 3.5 },
        }}
      >
        <Typography
          sx={{
            ...eyebrowSx,
            fontSize: 12,
            textAlign: 'center',
            mb: { xs: 2.5, md: 3.5 },
          }}
        >
          {t('rewards.howItWorks')}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 3, sm: 3, md: 5 }}>
          {steps.map(({ num, Icon, title, text }) => (
            <Box
              key={num}
              sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: palette.bgLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                }}
              >
                <Icon sx={{ fontSize: 18, color: 'rgba(51,74,159,0.6)' }} />
              </Box>
              <Typography sx={{ fontFamily: fontMain, fontSize: 13, color: 'rgba(51,74,159,0.5)' }}>
                {num}
              </Typography>
              <Typography
                sx={{ fontFamily: fontBody, fontSize: { xs: 15, md: 16 }, fontWeight: 700, color: palette.primary, mt: 0.25 }}
              >
                {title}
              </Typography>
              <Typography
                sx={{
                  fontFamily: fontBodyMoney,
                  // Step copy is reading text, not a caption (ACRU, owner 21.09):
                  // body size and full ink, not 65 % opacity.
                  fontSize: { xs: 14, md: 15 },
                  lineHeight: 1.6,
                  color: palette.primary,
                  maxWidth: 260,
                  mt: 0.75,
                }}
              >
                {text}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* ── CTA ── */}
      {!authPending && (
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Button
            component={Link}
            href={isLogged ? '/catalog' : '/login/register'}
            data-testid="sf-rewards-cta"
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            sx={{
              borderRadius: '999px',
              px: 5,
              py: 1.5,
              fontFamily: fontMain,
              fontSize: 16,
              textTransform: 'none',
            }}
          >
            {isLogged ? t('rewards.ctaMember') : t('rewards.ctaGuest')}
          </Button>
          {!isLogged && (
            <Typography sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primary, mt: 1.5 }}>
              {t.rich('rewards.signInHint', {
                link: (chunks) => (
                  <Link href="/login" style={{ color: palette.primary }}>
                    {chunks}
                  </Link>
                ),
              })}
            </Typography>
          )}
        </Box>
      )}

      {/* ── Tier modal: earning and spending rules ── */}
      <Dialog
        open={dialogTier !== null}
        onClose={() => setSelectedTier(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px' } }}
      >
        {dialogTier && (
          <Box sx={{ position: 'relative' }}>
            <IconButton
              onClick={() => setSelectedTier(null)}
              aria-label={t('rewards.close')}
              sx={{ position: 'absolute', top: 10, right: 10, bgcolor: palette.bgLight }}
              size="small"
            >
              <CloseIcon sx={{ fontSize: 16, color: palette.primary }} />
            </IconButton>

            <Box sx={{ p: 3, pb: 2, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 88,
                  height: 88,
                  mx: 'auto',
                  mb: 1.5,
                  borderRadius: '16px',
                  bgcolor: palette.bgLight,
                  overflow: 'hidden',
                }}
              >
                <Box
                  component="img"
                  src={tierImage(dialogTier.code, selectedTier ?? 0)}
                  alt={tierLabel(dialogTier)}
                  sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 1, boxSizing: 'border-box' }}
                />
              </Box>
              <Typography sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primary }}>
                {dialogTier.min_xp > 0
                  ? t('rewards.earnUnlockDesc', { xp: xp(dialogTier.min_xp) })
                  : t('rewards.earnUnlockStart')}
              </Typography>
              <Stack direction="row" spacing={1.25} justifyContent="center" alignItems="center" sx={{ mt: 1 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    bgcolor: palette.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography sx={{ fontFamily: fontMain, fontSize: 14, color: 'white' }}>
                    {(selectedTier ?? 0) + 1}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: fontMain, fontSize: 28, fontWeight: 500, color: palette.primary }}>
                  {tierLabel(dialogTier)}
                </Typography>
              </Stack>
            </Box>

            <Box sx={{ px: 3, pb: 2 }}>
              <Typography sx={{ fontFamily: fontMain, fontSize: 17, fontWeight: 500, color: palette.primary, mb: 1.5 }}>
                {t('rewards.earnTitle')}
              </Typography>
              <Stack spacing={1.5}>
                <Rule
                  title={
                    dialogRate != null
                      ? t('rewards.ruleCashbackTitle', { rate: dialogRate })
                      : t('rewards.earnShoppingTitle')
                  }
                  detail={dialogRate != null ? t('rewards.ruleCashbackDesc') : t('rewards.earnShoppingNoRate')}
                />
                <Rule
                  title={t('rewards.ruleXpTitle', { unit })}
                  detail={
                    program.windowDays != null && program.xpTtlDays != null
                      ? t('rewards.ruleXpDesc', { windowDays: program.windowDays, ttlDays: program.xpTtlDays })
                      : t('rewards.ruleXpDescNoTerms')
                  }
                />
              </Stack>
            </Box>

            <Divider sx={{ mx: 3 }} />

            <Box sx={{ px: 3, py: 2 }}>
              <Typography sx={{ fontFamily: fontMain, fontSize: 17, fontWeight: 500, color: palette.primary, mb: 1.5 }}>
                {t('rewards.spendTitle')}
              </Typography>
              <Rule
                title={
                  capPct != null
                    ? t('rewards.ruleWalletTitle', { percent: capPct })
                    : t('rewards.spendWalletTitle')
                }
                detail={
                  walletSpendOff
                    ? t('rewards.spendWalletNoSpend')
                    : capPct != null
                      ? t('rewards.ruleWalletDesc')
                      : t('rewards.spendWalletNoCap')
                }
              />
            </Box>

            <Box sx={{ bgcolor: palette.bgLight, px: 3, py: 2 }}>
              <Typography
                sx={{ fontFamily: fontBody, fontSize: 14, lineHeight: 1.55, color: palette.primary, textAlign: 'center' }}
              >
                {t('rewards.reversalNote')}
              </Typography>
            </Box>
          </Box>
        )}
      </Dialog>
    </Box>
  );
}

/** Home / Creator Club. */
function Breadcrumb() {
  const t = useTranslations();
  return (
    <Typography sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primary }}>
      <Link href="/" style={{ color: palette.primary, textDecoration: 'none' }}>
        {t('common.home')}
      </Link>
      {` / ${t('loyalty.breadcrumb')}`}
    </Typography>
  );
}

/** One "how to earn / how to spend" bullet inside the tier modal. */
function Rule({ title, detail }: { title: string; detail: string }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <CheckCircleOutlineIcon sx={{ fontSize: 16, color: palette.primary, opacity: 0.45, mt: 0.25 }} />
      <Box>
        <Typography sx={{ fontFamily: fontBodyMoney, fontSize: 13, fontWeight: 600, color: palette.primary }}>
          {title}
        </Typography>
        <Typography sx={{ fontFamily: fontBody, fontSize: 14, lineHeight: 1.55, color: palette.primary, mt: 0.25 }}>
          {detail}
        </Typography>
      </Box>
    </Stack>
  );
}

/**
 * `/config` could not be read, so the server cannot prove the programme is live:
 * show the page name and a retry — never the promise of cashback, and never a
 * redirect that would bounce shoppers off a live page during a BFF blip
 * (FBG-469 review). Retry re-runs the server component.
 */
export function RewardsUnavailable() {
  const t = useTranslations();
  const router = useRouter();
  return (
    <Box sx={PAGE_SX}>
      <Breadcrumb />
      <Box sx={{ textAlign: 'center', mt: { xs: 3, md: 5 }, mb: { xs: 3, md: 4 } }}>
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 34, md: 56 },
            lineHeight: { xs: '40px', md: '64px' },
            fontWeight: 450,
            color: palette.primary,
          }}
        >
          {t('loyalty.title')}
        </Typography>
      </Box>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <CreatorClubError onRetry={() => router.refresh()} />
      </Box>
    </Box>
  );
}
