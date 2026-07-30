'use client';

/**
 * Creator Club visuals (FBG-469) — the dark wallet card and the segmented tier
 * bar, shared by the public `/rewards` page and the private `/account/loyalty`
 * page so both tell the same story in the ACTR design system (MUI `sx` +
 * `palette`, LiraFix/Futura + Open Sans — no Tailwind, no styled-components).
 *
 * Everything is driven by the `/config` tier array: the number of tiers, their
 * names, thresholds and cashback rates come from the backend, so changing the
 * programme in the DB changes these visuals with no code edit.
 *
 * Both components use the root translator with fully-qualified keys (the Header
 * pattern) because they mix the shared `loyalty.*` copy with `rewards.*` copy.
 */

import { Box, Button, Chip, Typography } from '@mui/material';
import {
  AccountBalanceWallet,
  Check,
  Lock,
  LocalFireDepartment,
  Bolt,
} from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { palette } from '@/lib/theme';
import { fmtMoney } from '@/lib/money';
import { useCurrency, useFormatLocale } from '@/providers/CurrencyProvider';
import {
  formatPercent,
  ratePercent,
  tierProgress,
  tierSegments,
  type LoyaltyTier,
} from '@/lib/loyalty';

const fontMain = 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

/** Ink on the dark card — the footer palette, so the two dark surfaces match. */
const CARD_TEXT = palette.footerText;
const CARD_MUTED = palette.footerSecondary;
const EXPIRING = '#ff8a5b';

const overlineSx = {
  fontFamily: fontBody,
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  fontWeight: 600,
};

export interface CreatorWalletCardProps {
  /** Wallet balance in store currency, or null for the guest promo view. */
  balance: number | null;
  /** Σ active XP, or null for a guest (the card then shows no numbers at all). */
  xpActive: number | null;
  /** Current tier label; omitted while the programme has no tier for the member. */
  tierName?: string | null;
  /** Whole-percent cashback for the current tier, or null to hide the badge. */
  cashbackPct?: number | null;
  /** XP about to lapse — hidden when nothing is expiring. */
  expiring?: { xp: number; days: number } | null;
}

/**
 * The dark "wallet card": balance + active XP + current tier with its cashback
 * badge. With `balance === null` (a signed-out visitor on /rewards) it degrades
 * to a promo card with no figures, so the page never implies a guest has money.
 */
export function CreatorWalletCard({
  balance,
  xpActive,
  tierName,
  cashbackPct,
  expiring,
}: CreatorWalletCardProps) {
  const t = useTranslations();
  const currency = useCurrency();
  const formatLocale = useFormatLocale();
  const nf = new Intl.NumberFormat(formatLocale);
  const isGuest = balance === null;

  return (
    <Box
      sx={{
        bgcolor: palette.footerDark,
        color: CARD_TEXT,
        borderRadius: '24px',
        p: { xs: 2.5, md: 4 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: '14px',
              bgcolor: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AccountBalanceWallet sx={{ fontSize: 20, color: CARD_MUTED }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ ...overlineSx, color: CARD_MUTED }}>
              {t('loyalty.walletLabel')}
            </Typography>
            {isGuest ? (
              <Typography
                sx={{ fontFamily: fontBody, fontSize: 14, color: CARD_TEXT, mt: 0.5, maxWidth: 420 }}
              >
                {t('rewards.guestWalletHint')}
              </Typography>
            ) : (
              <>
                <Typography
                  sx={{
                    fontFamily: fontMain,
                    fontSize: { xs: 28, md: 34 },
                    fontWeight: 500,
                    lineHeight: 1.1,
                    mt: 0.5,
                  }}
                >
                  {fmtMoney(balance, currency, formatLocale)}
                </Typography>
                <Typography sx={{ fontFamily: fontBody, fontSize: 12, color: CARD_MUTED, mt: 0.5 }}>
                  {t('loyalty.walletHint')}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {!isGuest && xpActive !== null && (
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ ...overlineSx, color: CARD_MUTED }}>
              {t('loyalty.xpActiveLabel')}
            </Typography>
            <Typography
              sx={{
                fontFamily: fontMain,
                fontSize: { xs: 28, md: 34 },
                fontWeight: 500,
                lineHeight: 1.1,
                mt: 0.5,
              }}
            >
              {nf.format(xpActive)}
            </Typography>
          </Box>
        )}
      </Box>

      {(tierName || cashbackPct != null) && (
        <Box
          sx={{
            mt: 2.5,
            px: 2,
            py: 1.5,
            borderRadius: '16px',
            bgcolor: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          {tierName && (
            <Box>
              <Typography sx={{ ...overlineSx, color: CARD_MUTED }}>
                {t('loyalty.tierLabel')}
              </Typography>
              <Typography
                sx={{ fontFamily: fontMain, fontSize: 18, fontWeight: 500, color: CARD_TEXT }}
              >
                {tierName}
              </Typography>
            </Box>
          )}
          {cashbackPct != null && (
            <Chip
              icon={<Bolt sx={{ color: `${CARD_TEXT} !important`, fontSize: 16 }} />}
              label={t('loyalty.cashback', { rate: formatPercent(cashbackPct, formatLocale) })}
              sx={{
                bgcolor: 'rgba(255,255,255,0.12)',
                color: CARD_TEXT,
                fontFamily: fontMain,
              }}
            />
          )}
        </Box>
      )}

      {expiring && expiring.xp > 0 && (
        <Chip
          icon={<LocalFireDepartment sx={{ color: `${EXPIRING} !important` }} />}
          label={t('loyalty.expiringBadge', {
            xp: nf.format(expiring.xp),
            days: expiring.days,
          })}
          sx={{
            mt: 2,
            bgcolor: 'transparent',
            border: `1px solid ${EXPIRING}`,
            color: EXPIRING,
            fontFamily: fontBody,
          }}
        />
      )}
    </Box>
  );
}

export interface CreatorTierBarProps {
  /** Tiers exactly as configured in `/config` (any count, any thresholds). */
  tiers: LoyaltyTier[];
  /** Σ active XP, or null for a guest (segments render as an unfilled preview). */
  xpActive: number | null;
  /** `/me` tier_code — pins the current tier when it matches a configured code. */
  tierCode?: string;
}

/**
 * Segmented tier progress: one segment per configured tier, filled by Σ active
 * XP, with a level dot + name + cashback rate under each. Renders nothing when
 * the programme has no usable tiers (a bogus bar is worse than none).
 */
export function CreatorTierBar({ tiers, xpActive, tierCode }: CreatorTierBarProps) {
  const t = useTranslations();
  const formatLocale = useFormatLocale();
  const nf = new Intl.NumberFormat(formatLocale);

  const segments = tierSegments(xpActive, tiers, tierCode);
  if (segments.length === 0) return null;

  const progress = xpActive === null ? null : tierProgress(xpActive, tiers, tierCode);
  // Whole-ladder completion, for assistive tech only (the visual is per-segment).
  const overall = Math.round(
    segments.reduce((sum, s) => sum + s.fillPercent, 0) / segments.length,
  );

  return (
    <Box
      sx={{
        bgcolor: palette.bgLight,
        borderRadius: '20px',
        p: { xs: 2.5, md: 3 },
      }}
    >
      <Box
        role="progressbar"
        aria-label={t('loyalty.tierLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={overall}
        sx={{ display: 'flex', gap: '4px', height: 10 }}
      >
        {segments.map((seg, i) => (
          <Box
            key={seg.tier.code}
            sx={{
              flex: 1,
              minWidth: 0,
              bgcolor: palette.primaryLight,
              overflow: 'hidden',
              borderTopLeftRadius: i === 0 ? 6 : 0,
              borderBottomLeftRadius: i === 0 ? 6 : 0,
              borderTopRightRadius: i === segments.length - 1 ? 6 : 0,
              borderBottomRightRadius: i === segments.length - 1 ? 6 : 0,
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${seg.fillPercent}%`,
                bgcolor: palette.primary,
                borderRadius: 6,
                transition: 'width 0.6s ease-out',
              }}
            />
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', mt: 1.5 }}>
        {segments.map((seg, i) => {
          const reached = seg.state === 'current' || seg.state === 'unlocked';
          const rate = ratePercent(seg.tier.cashback_rate);
          return (
            <Box
              key={seg.tier.code}
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${reached ? palette.primary : palette.primaryLight}`,
                  bgcolor: reached ? palette.primary : 'transparent',
                  color: reached ? palette.white : palette.primaryLight,
                  fontFamily: fontMain,
                  fontSize: 11,
                  fontWeight: 600,
                  transform: seg.state === 'current' ? 'scale(1.15)' : 'none',
                }}
              >
                {seg.state === 'unlocked' ? <Check sx={{ fontSize: 14 }} /> : i + 1}
              </Box>
              <Typography
                sx={{
                  ...overlineSx,
                  fontSize: 9,
                  color: seg.state === 'current' ? palette.primary : palette.primaryLight,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {seg.tier.name}
              </Typography>
              {rate != null && (
                <Typography sx={{ fontFamily: fontBody, fontSize: 10, color: palette.primaryLight }}>
                  {t('loyalty.cashback', { rate: formatPercent(rate, formatLocale) })}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {progress && (
        <Typography
          sx={{
            fontFamily: fontBody,
            fontSize: 13,
            color: palette.primaryLight,
            mt: 2,
            textAlign: 'center',
          }}
        >
          {progress.next && progress.xpToNext != null
            ? t('loyalty.nextTier', {
                xp: nf.format(progress.xpToNext),
                tier: progress.next.name,
              })
            : t('loyalty.maxTier')}
        </Typography>
      )}
    </Box>
  );
}

/**
 * "Couldn't load the programme" panel with a retry.
 *
 * A failed `/config` must never be stored as a valid answer: it may not redirect
 * a shopper away from a live programme, nor leave the page blank for ever. Both
 * Creator Club pages render this instead and let the visitor try again
 * (FBG-469 review).
 */
export function CreatorClubError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations();
  return (
    <Box sx={{ bgcolor: palette.bgLight, borderRadius: '20px', p: 4, textAlign: 'center' }}>
      <Typography sx={{ fontFamily: fontMain, fontSize: 18, color: palette.primary }}>
        {t('loyalty.error')}
      </Typography>
      <Button
        onClick={onRetry}
        variant="outlined"
        sx={{
          mt: 2,
          borderRadius: 40,
          borderColor: palette.primary,
          color: palette.primary,
          fontFamily: fontMain,
          fontSize: 15,
        }}
      >
        {t('errors.retry')}
      </Button>
    </Box>
  );
}

/** Small round lock/check marker reused by the tier cards on /rewards. */
export function TierStateIcon({ state }: { state: 'preview' | 'locked' | 'unlocked' | 'current' }) {
  const t = useTranslations();
  if (state === 'locked') {
    return <Lock aria-label={t('rewards.lockedLabel')} sx={{ fontSize: 14, color: palette.primaryLight }} />;
  }
  if (state === 'unlocked') {
    return <Check aria-label={t('rewards.unlockedLabel')} sx={{ fontSize: 14, color: palette.primary }} />;
  }
  return null;
}
