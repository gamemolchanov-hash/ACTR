'use client';

/**
 * Public Creator Club page (FBG-469) — the shopper-facing story of the loyalty
 * programme: wallet card, segmented tier ladder, per-tier rules and the three
 * steps of earning/spending. Mirrors the block composition of the forza-brava
 * rewards page but is built entirely in the ACTR design system (MUI `sx` +
 * `palette`, LiraFix/Futura + Open Sans).
 *
 * DORMANT BY DEFAULT: everything below `/config`'s `loyalty_program` — while the
 * live storefront runs `points_discount` no link to this page is rendered
 * anywhere and the route redirects home. That redirect is owned by `layout.tsx`
 * and happens ON THE SERVER (a plain GET must not answer 200); the check below
 * is only the client-side backstop for a config change mid-session.
 *
 * Every figure (tier count, names, thresholds, cashback rates, wallet cap) comes
 * from `fetchLoyaltyConfig()` / `useAuth()` — nothing about the programme is
 * hardcoded here.
 */

import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import {
  ArrowForward,
  AutoAwesome,
  Bolt,
  Close,
  EmojiEvents,
  MilitaryTech,
  Star,
  WorkspacePremium,
  AccountBalanceWallet,
  TrendingUp,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useFormatLocale } from '@/providers/CurrencyProvider';
import {
  CreatorClubError,
  CreatorTierBar,
  CreatorWalletCard,
  TierStateIcon,
  useTierLabel,
} from '@/components/CreatorClub';
import {
  CASHBACK_WALLET_PROGRAM,
  expiringSoon,
  fetchLoyaltyConfig,
  formatPercent,
  ratePercent,
  tierProgress,
  tierSegments,
  type LoyaltyConfig,
} from '@/lib/loyalty';

const fontMain = 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

/** Neutral tier medallions in brand palette — cycled so any tier count works. */
const TIER_ICONS = [Star, WorkspacePremium, EmojiEvents, MilitaryTech];

export default function RewardsPage() {
  const t = useTranslations();
  const tierLabel = useTierLabel();
  const formatLocale = useFormatLocale();
  const router = useRouter();
  const { customer, loyalty, loading: authLoading } = useAuth();

  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [configAttempt, setConfigAttempt] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLoyaltyConfig()
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        setConfigError(false);
      })
      // A failed request is NOT an answer: storing a dormant config here would
      // throw the visitor off a page the server layout just confirmed is live,
      // with no way back. Surface a retry instead (FBG-469 review).
      .catch(() => {
        if (!cancelled) setConfigError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [configAttempt]);

  // Backstop only — the authoritative gate is the server redirect in layout.tsx.
  const program = config?.program ?? null;
  useEffect(() => {
    if (program != null && program !== CASHBACK_WALLET_PROGRAM) router.replace('/');
  }, [program, router]);

  // Wait for the session to resolve: rendering the guest view for a member whose
  // token is still being validated would push them to registration (FBG-198).
  if (authLoading) return null;

  if (configError && !config) {
    return (
      <Box sx={{ overflow: 'hidden' }}>
        <PageHeader compact />
        <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2.5, md: 2 }, mb: { xs: 5, md: 8 } }}>
          <CreatorClubError onRetry={() => setConfigAttempt((n) => n + 1)} />
        </Box>
      </Box>
    );
  }

  if (!config || config.program !== CASHBACK_WALLET_PROGRAM) return null;

  const isMember = !!customer;
  const xpActive = isMember ? (loyalty?.xp_active ?? 0) : null;
  const balance = isMember ? (loyalty?.wallet_balance ?? 0) : null;
  const progress = tierProgress(xpActive ?? 0, config.tiers, loyalty?.tier_code);
  const segments = tierSegments(xpActive, config.tiers, loyalty?.tier_code);
  const cashbackPct = isMember
    ? ratePercent(loyalty?.cashback_rate ?? progress.current?.cashback_rate)
    : null;
  // Localised label — the BFF sends no display name, only a code (FBG-469 review).
  const tierName = isMember ? tierLabel(progress.current, loyalty?.tier_code) || null : null;

  const expiring = isMember ? expiringSoon(loyalty?.xp_expiring_soon) : null;

  const capPct = ratePercent(config.walletCap);
  // wallet_cap: 0 is a real answer — the server forbids spending the wallet, so
  // say that instead of "covers part of the order" (FBG-469 review).
  const walletSpendOff = config.walletCap === 0;
  const nf = new Intl.NumberFormat(formatLocale);

  const spendCopy = (withCap: string, noCap: string, off: string): string => {
    if (walletSpendOff) return t(off);
    return capPct != null
      ? t(withCap, { percent: formatPercent(capPct, formatLocale) })
      : t(noCap);
  };

  const steps = [
    { icon: Bolt, title: t('rewards.step1Title'), desc: t('rewards.step1Desc') },
    { icon: TrendingUp, title: t('rewards.step2Title'), desc: t('rewards.step2Desc') },
    {
      icon: AccountBalanceWallet,
      title: t('rewards.step3Title'),
      desc: spendCopy('rewards.step3Desc', 'rewards.step3DescNoCap', 'rewards.step3DescNoSpend'),
    },
  ];

  const selectedSeg = selected != null ? segments[selected] : undefined;
  const selectedRate = selectedSeg ? ratePercent(selectedSeg.tier.cashback_rate) : null;

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <PageHeader />

      <Box
        sx={{
          maxWidth: 900,
          mx: 'auto',
          px: { xs: 2.5, md: 2 },
          mb: { xs: 5, md: 8 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CreatorWalletCard
          balance={balance}
          xpActive={xpActive}
          tierName={tierName}
          cashbackPct={cashbackPct}
          expiring={expiring}
        />

        <CreatorTierBar tiers={config.tiers} xpActive={xpActive} tierCode={loyalty?.tier_code} />

        {/* ── Tier cards ── */}
        {segments.length > 0 && (
          <Box sx={{ bgcolor: palette.bgLight, borderRadius: '20px', p: { xs: 2, md: 3 } }}>
            <Typography
              sx={{
                fontFamily: fontBody,
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: palette.primaryLight,
                textAlign: 'center',
                mb: 2,
              }}
            >
              {t('rewards.tiersTitle')}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                // auto-fit on xs so any tier count wraps instead of overflowing a
                // 320px phone; a fixed row (max 4 columns) once there is room.
                gridTemplateColumns: {
                  xs: 'repeat(auto-fit, minmax(120px, 1fr))',
                  md: `repeat(${Math.min(segments.length, 4)}, 1fr)`,
                },
                gap: { xs: 1.5, md: 2 },
              }}
            >
              {segments.map((seg, i) => {
                const Icon = TIER_ICONS[i % TIER_ICONS.length];
                const isCurrent = seg.state === 'current';
                const isLocked = seg.state === 'locked';
                const rate = ratePercent(seg.tier.cashback_rate);
                return (
                  <Box
                    key={seg.tier.code}
                    component="button"
                    type="button"
                    onClick={() => setSelected(i)}
                    aria-label={tierLabel(seg.tier)}
                    aria-haspopup="dialog"
                    sx={{
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: '16px',
                      p: 2,
                      bgcolor: isCurrent ? palette.primary : palette.white,
                      border: `1px solid ${isCurrent ? palette.primary : palette.primaryLight}`,
                      opacity: isLocked ? 0.65 : 1,
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 16px rgba(43,54,116,0.12)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: fontBody,
                          fontSize: 9,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          color: isCurrent ? palette.white : palette.primaryLight,
                        }}
                      >
                        {seg.tier.min_xp > 0
                          ? t('rewards.xpThreshold', { xp: nf.format(seg.tier.min_xp) })
                          : t('rewards.startLabel')}
                      </Typography>
                      {isCurrent ? (
                        <Typography
                          sx={{
                            fontFamily: fontBody,
                            fontSize: 9,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            color: palette.white,
                            bgcolor: 'rgba(255,255,255,0.18)',
                            borderRadius: 40,
                            px: 1,
                            py: 0.25,
                          }}
                        >
                          {t('rewards.youBadge')}
                        </Typography>
                      ) : (
                        <TierStateIcon state={seg.state} />
                      )}
                    </Box>

                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        mx: 'auto',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isCurrent ? 'rgba(255,255,255,0.12)' : palette.bgLight,
                      }}
                    >
                      <Icon
                        sx={{ fontSize: 30, color: isCurrent ? palette.white : palette.primary }}
                      />
                    </Box>

                    <Typography
                      sx={{
                        fontFamily: fontBody,
                        fontSize: 9,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: isCurrent ? 'rgba(255,255,255,0.6)' : palette.primaryLight,
                        mt: 1.5,
                      }}
                    >
                      {t('rewards.levelLabel', { n: i + 1 })}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: fontMain,
                        fontSize: 17,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        color: isCurrent ? palette.white : palette.primary,
                      }}
                    >
                      {tierLabel(seg.tier)}
                    </Typography>
                    {rate != null && (
                      <Typography
                        sx={{
                          fontFamily: fontMain,
                          fontSize: { xs: 20, md: 24 },
                          fontWeight: 500,
                          lineHeight: 1.2,
                          color: isCurrent ? palette.white : palette.primary,
                        }}
                      >
                        {t('loyalty.cashback', { rate: formatPercent(rate, formatLocale) })}
                      </Typography>
                    )}
                    <Typography
                      sx={{
                        fontFamily: fontBody,
                        fontSize: 9,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        color: isCurrent ? 'rgba(255,255,255,0.7)' : palette.primaryLight,
                        mt: 1,
                      }}
                    >
                      {t('rewards.details')}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* ── How it works ── */}
        <Box
          sx={{
            border: `1px solid ${palette.primaryLight}`,
            borderRadius: '20px',
            p: { xs: 2.5, md: 4 },
          }}
        >
          <Typography
            sx={{
              fontFamily: fontBody,
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: palette.primaryLight,
              textAlign: 'center',
              mb: 3,
            }}
          >
            {t('rewards.howItWorks')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <Box
                key={title}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    bgcolor: palette.bgLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon sx={{ fontSize: 20, color: palette.primary }} />
                </Box>
                <Typography
                  sx={{ fontFamily: fontMain, fontSize: 12, color: palette.primaryLight }}
                >
                  {`0${i + 1}`}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fontMain,
                    fontSize: 17,
                    fontWeight: 500,
                    color: palette.primary,
                    textAlign: 'center',
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fontBody,
                    fontSize: 13,
                    color: palette.primaryLight,
                    textAlign: 'center',
                  }}
                >
                  {desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── CTA ── */}
        <Box sx={{ textAlign: 'center', mt: { xs: 1, md: 2 } }}>
          <Button
            component={Link}
            href={isMember ? '/catalog' : '/login/register'}
            variant="contained"
            color="primary"
            endIcon={<ArrowForward />}
            sx={{ borderRadius: 40, px: 4, py: 1.5, fontFamily: fontMain, fontSize: 16 }}
          >
            {isMember ? t('rewards.ctaMember') : t('rewards.ctaGuest')}
          </Button>
        </Box>
      </Box>

      {/* ── Tier rules modal ── */}
      <Dialog
        open={selectedSeg != null}
        onClose={() => setSelected(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px' } }}
      >
        {selectedSeg && (
          <DialogContent sx={{ p: { xs: 3, md: 4 }, position: 'relative' }}>
            <IconButton
              onClick={() => setSelected(null)}
              aria-label={t('rewards.close')}
              sx={{ position: 'absolute', top: 12, right: 12, color: palette.primaryLight }}
            >
              <Close />
            </IconButton>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography
                sx={{ fontFamily: fontBody, fontSize: 12, color: palette.primaryLight }}
              >
                {selectedSeg.tier.min_xp > 0
                  ? t('rewards.xpThreshold', { xp: nf.format(selectedSeg.tier.min_xp) })
                  : t('rewards.startLabel')}
              </Typography>
              <Typography
                sx={{
                  fontFamily: fontMain,
                  fontSize: 28,
                  fontWeight: 500,
                  color: palette.primary,
                  textTransform: 'uppercase',
                }}
              >
                {tierLabel(selectedSeg.tier)}
              </Typography>
            </Box>

            <Typography
              sx={{ fontFamily: fontMain, fontSize: 16, fontWeight: 500, color: palette.primary }}
            >
              {t('rewards.earnTitle')}
            </Typography>
            <Rule
              title={t('rewards.earnShoppingTitle')}
              detail={
                selectedRate != null
                  ? t('rewards.earnShoppingDesc', { rate: formatPercent(selectedRate, formatLocale) })
                  : t('rewards.earnShoppingNoRate')
              }
            />
            <Rule
              title={t('rewards.earnUnlockTitle')}
              detail={
                selectedSeg.tier.min_xp > 0
                  ? t('rewards.earnUnlockDesc', { xp: nf.format(selectedSeg.tier.min_xp) })
                  : t('rewards.earnUnlockStart')
              }
            />

            <Box sx={{ height: '1px', bgcolor: palette.primaryLight, my: 2.5 }} />

            <Typography
              sx={{ fontFamily: fontMain, fontSize: 16, fontWeight: 500, color: palette.primary }}
            >
              {t('rewards.spendTitle')}
            </Typography>
            <Rule
              title={t('rewards.spendWalletTitle')}
              detail={spendCopy(
                'rewards.spendWalletDesc',
                'rewards.spendWalletNoCap',
                'rewards.spendWalletNoSpend',
              )}
            />
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
}

/**
 * Breadcrumb + hero, shared by the loaded page and its load-error state.
 *
 * `compact` drops the marketing lines (overline + subtitle): when `/config`
 * could not be read we cannot prove the programme is live, so the page shows its
 * name and the retry — never the promise of cashback (FBG-469 review).
 */
function PageHeader({ compact = false }: { compact?: boolean }) {
  const t = useTranslations();
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
      <Typography sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 0.5 }}>
        <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
          {t('common.home')}
        </Link>
        {` / ${t('loyalty.breadcrumb')}`}
      </Typography>

      <Box sx={{ textAlign: 'center', mt: { xs: 2, md: 4 }, mb: { xs: 3, md: 4 } }}>
        {!compact && (
          <Typography
            sx={{
              fontFamily: fontBody,
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: palette.primaryLight,
            }}
          >
            {t('rewards.programLabel')}
          </Typography>
        )}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 32, md: 52 },
            lineHeight: { xs: '38px', md: '58px' },
            fontWeight: 450,
            mt: 1,
          }}
        >
          {t('loyalty.title')}
        </Typography>
        {!compact && (
          <Typography
            sx={{
              fontFamily: fontBody,
              fontSize: { xs: 14, md: 16 },
              color: palette.primaryLight,
              maxWidth: 520,
              mx: 'auto',
              mt: 1.5,
            }}
          >
            {t('rewards.subtitle')}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/** One "how to earn / how to spend" bullet inside the tier modal. */
function Rule({ title, detail }: { title: string; detail: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mt: 1.5 }}>
      <AutoAwesome sx={{ fontSize: 16, color: palette.primaryLight, mt: '2px' }} />
      <Box>
        <Typography
          sx={{ fontFamily: fontBody, fontSize: 13, fontWeight: 600, color: palette.primary }}
        >
          {title}
        </Typography>
        <Typography sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight }}>
          {detail}
        </Typography>
      </Box>
    </Box>
  );
}
