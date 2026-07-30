'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { fmtMoney } from '@/lib/money';
import { useCurrency, useFormatLocale } from '@/providers/CurrencyProvider';
import { CreatorTierBar, CreatorWalletCard } from '@/components/CreatorClub';
import {
  CASHBACK_WALLET_PROGRAM,
  expiringSoon,
  fetchLoyaltyConfig,
  fetchLoyaltyLedger,
  ratePercent,
  tierProgress,
  type LoyaltyTier,
  type LoyaltyLedgerEntry,
} from '@/lib/loyalty';
import { useTranslations } from 'next-intl';

const fontMain = 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

const CREDIT = '#2e7d32';
const DEBIT = palette.cartBadge;

export default function LoyaltyPage() {
  const t = useTranslations('loyalty');
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');
  const tRewards = useTranslations('rewards');
  const currency = useCurrency();
  const formatLocale = useFormatLocale();

  const { customer, loyalty, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [program, setProgram] = useState<string | null>(null);
  const [entries, setEntries] = useState<LoyaltyLedgerEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState(false);

  useEffect(() => {
    if (!authLoading && !customer) router.replace('/login');
  }, [authLoading, customer, router]);

  useEffect(() => {
    if (!customer) return;
    // Tier thresholds are public config; a failure just hides the progress bar.
    fetchLoyaltyConfig()
      .then((cfg) => {
        setProgram(cfg.program);
        setTiers(cfg.tiers);
      })
      .catch(() => setTiers([]));
  }, [customer]);

  // Dormant until the storefront runs cashback_wallet: the page must not exist
  // for shoppers before the programme launches (FBG-384 review). Backstop only —
  // the authoritative redirect is server-side in layout.tsx (FBG-469 review).
  useEffect(() => {
    if (program != null && program !== CASHBACK_WALLET_PROGRAM) router.replace('/account');
  }, [program, router]);

  useEffect(() => {
    if (!customer) return;
    setLedgerLoading(true);
    setLedgerError(false);
    fetchLoyaltyLedger(page, 10)
      .then((res) => {
        setEntries(res.entries);
        setTotalPages(res.totalPages);
      })
      .catch(() => {
        setEntries([]);
        setLedgerError(true);
      })
      .finally(() => setLedgerLoading(false));
  }, [customer, page]);

  if (authLoading || !customer) return null;
  if (program !== CASHBACK_WALLET_PROGRAM) return null;

  const xpActive = loyalty?.xp_active ?? 0;
  const progress = tierProgress(xpActive, tiers, loyalty?.tier_code);
  const balance = loyalty?.wallet_balance ?? 0;
  // Real BFF shape: {amount, expires_at} — the day count is derived client-side.
  const expiring = expiringSoon(loyalty?.xp_expiring_soon);
  const cashbackPct = ratePercent(loyalty?.cashback_rate ?? progress.current?.cashback_rate);
  const tierLabel =
    progress.current?.name ??
    loyalty?.tier_code ??
    t('tierFallback', { n: loyalty?.loyalty_tier ?? 1 });

  const nfXp = new Intl.NumberFormat(formatLocale);
  const formatAmount = (e: LoyaltyLedgerEntry): string => {
    if (e.kind === 'wallet') {
      const money = fmtMoney(Math.abs(e.amount), e.currency || currency, formatLocale);
      return `${e.amount < 0 ? '−' : '+'}${money}`;
    }
    const xp = nfXp.format(Math.abs(e.amount));
    return `${e.amount < 0 ? '−' : '+'}${xp} ${t('xpUnit')}`;
  };

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
        <Typography
          sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 0.5 }}
        >
          <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {tCommon('home')}
          </Link>
          {' / '}
          <Link href="/account" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {tAccount('breadcrumb')}
          </Link>
          {` / ${t('breadcrumb')}`}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Button
            component={Link}
            href="/account"
            sx={{ minWidth: 'auto', p: 0.5, color: palette.primary }}
          >
            <ArrowBack />
          </Button>
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: 24, md: 40 }, fontWeight: 450, letterSpacing: { xs: 2, md: 0 } }}
          >
            {t('title')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mb: { xs: 4, md: 7 } }}>
        {/* Tier + wallet summary — same visuals as the public /rewards page (FBG-469) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <CreatorWalletCard
            balance={balance}
            xpActive={xpActive}
            tierName={tierLabel}
            cashbackPct={cashbackPct}
            expiring={expiring}
          />

          <CreatorTierBar tiers={tiers} xpActive={xpActive} tierCode={loyalty?.tier_code} />

          <Box>
            <Button
              component={Link}
              href="/rewards"
              endIcon={<ArrowForward />}
              sx={{ fontFamily: fontMain, fontSize: 15, color: palette.primary, px: 0 }}
            >
              {tRewards('accountLink')}
            </Button>
          </Box>
        </Box>

        {/* Activity ledger */}
        <Typography
          variant="h2"
          sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 500, color: palette.primary, mb: 2 }}
        >
          {t('historyTitle')}
        </Typography>

        {ledgerLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress sx={{ color: palette.primary }} />
          </Box>
        ) : ledgerError ? (
          <Box sx={{ bgcolor: palette.bgLight, borderRadius: '20px', p: 4, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: fontMain, fontSize: 18, color: palette.primary }}>
              {t('error')}
            </Typography>
          </Box>
        ) : entries.length === 0 ? (
          <Box sx={{ bgcolor: palette.bgLight, borderRadius: '20px', p: 4, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: fontMain, fontSize: 18, color: palette.primary }}>
              {t('noHistory')}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer
              component={Paper}
              sx={{ borderRadius: '20px', boxShadow: 'none', border: `1px solid ${palette.bgLight}` }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: palette.bgLight }}>
                    <TableCell sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}>
                      {t('historyDate')}
                    </TableCell>
                    <TableCell sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}>
                      {t('historyType')}
                    </TableCell>
                    <TableCell sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}>
                      {t('historyDescription')}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: fontMain, fontWeight: 500, color: palette.primary }}
                    >
                      {t('historyAmount')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={`${e.kind}-${e.id}`}>
                      <TableCell
                        sx={{ fontFamily: fontBody, color: palette.primaryLight, whiteSpace: 'nowrap' }}
                      >
                        {e.date
                          ? new Intl.DateTimeFormat(formatLocale, {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            }).format(new Date(e.date))
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            e.kind === 'wallet'
                              ? t('kindWallet')
                              : e.status && e.status !== 'active'
                                ? `${t('kindLoyalty')} · ${e.status === 'expired' ? t('statusExpired') : t('statusRevoked')}`
                                : t('kindLoyalty')
                          }
                          size="small"
                          sx={{
                            bgcolor: palette.primaryLight,
                            color: palette.primary,
                            fontFamily: fontBody,
                            fontSize: 12,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primary }}>
                        {e.description ||
                          (e.kind === 'wallet' ? t('walletEntry') : t('loyaltyEntry'))}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontFamily: fontMain,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          color: e.amount < 0 ? DEBIT : CREDIT,
                        }}
                      >
                        {formatAmount(e)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  sx={{ fontFamily: fontMain, color: palette.primary }}
                >
                  {tAccount('prevPage')}
                </Button>
                <Typography
                  sx={{ fontFamily: fontBody, lineHeight: '36px', color: palette.primaryLight }}
                >
                  {page} / {totalPages}
                </Typography>
                <Button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  sx={{ fontFamily: fontMain, color: palette.primary }}
                >
                  {tAccount('nextPage')}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
