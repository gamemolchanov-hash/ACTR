'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { ArrowBack, Whatshot } from '@mui/icons-material';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { fmtMoney } from '@/lib/money';
import { useCurrency, useFormatLocale } from '@/providers/CurrencyProvider';
import {
  fetchLoyaltyConfig,
  fetchLoyaltyLedger,
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
  const currency = useCurrency();
  const formatLocale = useFormatLocale();

  const { customer, loyalty, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
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
      .then(setTiers)
      .catch(() => setTiers([]));
  }, [customer]);

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

  const xpActive = loyalty?.xp_active ?? 0;
  const progress = tierProgress(xpActive, tiers, loyalty?.tier_code);
  const balance = loyalty?.wallet_balance ?? 0;
  const expiring = loyalty?.xp_expiring_soon;
  const rawRate = loyalty?.cashback_rate ?? progress.current?.cashback_rate;
  // Rate is a fraction (0.05) per the vault spec; tolerate a percent (5) too.
  const cashbackPct =
    rawRate != null && rawRate > 0 ? Math.round(rawRate <= 1 ? rawRate * 100 : rawRate) : null;
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
        {/* Tier + wallet summary */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
            mb: 3,
          }}
        >
          <Card
            sx={{ bgcolor: palette.bgLight, borderRadius: '20px', boxShadow: 'none', border: 'none' }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 0.5 }}
              >
                {t('tierLabel')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography
                  sx={{ fontFamily: fontMain, fontSize: 26, fontWeight: 500, color: palette.primary }}
                >
                  {tierLabel}
                </Typography>
                {cashbackPct != null && (
                  <Chip
                    label={t('cashback', { rate: cashbackPct })}
                    size="small"
                    sx={{ bgcolor: palette.primary, color: 'white', fontFamily: fontBody }}
                  />
                )}
              </Box>

              {progress.current && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress.percent}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: palette.primaryLight,
                      '& .MuiLinearProgress-bar': { bgcolor: palette.primary, borderRadius: 4 },
                    }}
                  />
                  <Typography
                    sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mt: 1 }}
                  >
                    {progress.next && progress.xpToNext != null
                      ? t('nextTier', {
                          xp: nfXp.format(progress.xpToNext),
                          tier: progress.next.name,
                        })
                      : t('maxTier')}
                  </Typography>
                </Box>
              )}

              {expiring && expiring.xp > 0 && (
                <Chip
                  icon={<Whatshot sx={{ color: `${DEBIT} !important` }} />}
                  label={t('expiringBadge', { xp: nfXp.format(expiring.xp), days: expiring.days })}
                  sx={{
                    mt: 2,
                    bgcolor: 'transparent',
                    border: `1px solid ${DEBIT}`,
                    color: DEBIT,
                    fontFamily: fontBody,
                  }}
                />
              )}
            </CardContent>
          </Card>

          <Card
            sx={{ bgcolor: palette.bgLight, borderRadius: '20px', boxShadow: 'none', border: 'none' }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 0.5 }}
              >
                {t('walletLabel')}
              </Typography>
              <Typography
                sx={{ fontFamily: fontMain, fontSize: 34, fontWeight: 500, color: palette.primary }}
              >
                {fmtMoney(balance, currency, formatLocale)}
              </Typography>
              <Typography
                sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mt: 0.5 }}
              >
                {t('walletHint')}
              </Typography>
            </CardContent>
          </Card>
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
                          label={e.kind === 'wallet' ? t('kindWallet') : t('kindLoyalty')}
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
