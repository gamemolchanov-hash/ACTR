'use client';

/**
 * Creator Club V2 wallet widget on checkout (FBG-385).
 *
 * Shown only to a logged-in customer (the parent gates render — guests never see
 * it, keeping the guest checkout untouched). Lets the member apply part of their
 * cashback wallet to the order: slider + numeric input, live-clamped to
 * `min(balance, total × cap)`, where `cap` is the server `wallet_cap` from
 * `/wallet/validate` (loyalty config, not a hardcoded ratio). That endpoint also
 * previews the authoritative amount; the backend re-clamps and debits on create.
 *
 * XOR with promo: when a promo code is active the widget is disabled with a
 * plain explanation (and the applied amount is forced back to 0). The promo
 * field lives on the basket page, so the reverse direction is inherent — you can
 * only reach a non-zero wallet amount while no promo is active.
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Typography, Slider, TextField, Stack, Button } from '@mui/material';
import { validateWallet } from '@/lib/api';
import { walletCeiling, clampWalletAmount, WALLET_DEFAULT_RATIO } from '@/lib/wallet';
import { fmtMoney } from '@/lib/money';
import { useCurrency, useFormatLocale } from '@/providers/CurrencyProvider';
import { palette } from '@/lib/theme';

const font = 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica';

const c = {
  main: palette.primary, // #334a9f
  bg: palette.bgLight, // #f6f9ff
  muted: palette.footerSecondary, // #adb7d9
};

interface WalletWidgetProps {
  /** Order total (incl. shipping) the wallet applies against. */
  total: number;
  /** Amount currently applied — owned by the parent (checkout page). */
  applied: number;
  /** Live-clamped amount changes bubble up here. */
  onChange: (amount: number) => void;
  /** XOR backstop: an active promo disables the wallet (owner rule §10). */
  promoActive: boolean;
}

export default function WalletWidget({ total, applied, onChange, promoActive }: WalletWidgetProps) {
  const t = useTranslations();
  const currency = useCurrency();
  const formatLocale = useFormatLocale();

  const [balance, setBalance] = useState<number | null>(null);
  const [program, setProgram] = useState<string | null>(null);
  // Server `wallet_cap` (share of total the wallet may cover). Held in state so
  // a server change (30%→50%) drives the slider, not a hardcoded 40%. Defaults
  // to WALLET_DEFAULT_RATIO until the first /wallet/validate response lands.
  const [cap, setCap] = useState<number>(WALLET_DEFAULT_RATIO);
  const [failed, setFailed] = useState(false);
  const [input, setInput] = useState('');

  // Fetch the wallet balance + cap once (per mount), as soon as a positive total
  // is known. Both are static across shipping changes — the ceiling is recomputed
  // locally from `total` and `cap`, so no refetch is needed on total change.
  useEffect(() => {
    if (total <= 0 || balance != null || failed) return;
    let cancelled = false;
    validateWallet(total)
      .then((res) => {
        if (!cancelled) {
          setBalance(res.data.balance);
          setProgram(res.data.program);
          setCap(res.data.cap);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [total, balance, failed]);

  const ceiling = balance != null ? walletCeiling(balance, total, cap) : 0;

  // Promo turned on → drop any applied wallet amount (XOR, mirrors basket:94-117).
  useEffect(() => {
    if (promoActive && applied !== 0) onChange(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoActive]);

  // Total shrank (e.g. cheaper shipping) or cap changed → re-clamp applied to the
  // new ceiling.
  useEffect(() => {
    if (balance == null) return;
    const max = walletCeiling(balance, total, cap);
    if (applied > max) onChange(max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, balance, cap]);

  // Keep the text field in sync with the applied amount (slider ↔ field, reset).
  useEffect(() => {
    setInput(applied > 0 ? String(applied) : '');
  }, [applied]);

  // Debounced authoritative preview: /wallet/validate re-clamps the requested
  // amount server-side; if it returns less, snap the applied amount down.
  useEffect(() => {
    if (promoActive || applied <= 0 || total <= 0) return;
    const id = setTimeout(() => {
      validateWallet(total)
        .then((res) => {
          const server = res.data.applicable;
          if (Number.isFinite(server) && server < applied) onChange(server);
        })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, total, promoActive]);

  // Balance unknown, fetch failed, or the storefront doesn't run cashback_wallet
  // (dormant until the program launches — /wallet/validate answers the zero
  // preview with program:'points_discount' today) → render nothing. The wallet
  // is optional and must never block checkout.
  if (failed || balance == null || program !== 'cashback_wallet') return null;

  const commit = (raw: number) => onChange(clampWalletAmount(raw, balance, total, cap));

  return (
    <Box
      sx={{
        border: `1px solid ${c.main}`,
        borderRadius: '10px',
        p: 2,
        mb: 2,
        bgcolor: c.bg,
      }}
    >
      <Typography sx={{ fontFamily: font, fontWeight: 500, fontSize: 18, color: c.main }}>
        {t('checkout.wallet.title')}
      </Typography>
      <Typography sx={{ fontFamily: font, fontSize: 14, color: c.main, mt: 0.5, mb: 1 }}>
        {t('checkout.wallet.balanceLabel')}: {fmtMoney(balance, currency, formatLocale)}
      </Typography>

      {promoActive ? (
        <Typography sx={{ fontFamily: font, fontSize: 13, color: c.muted }}>
          {t('checkout.wallet.promoActive')}
        </Typography>
      ) : balance <= 0 || ceiling <= 0 ? (
        <Typography sx={{ fontFamily: font, fontSize: 13, color: c.muted }}>
          {t('checkout.wallet.empty')}
        </Typography>
      ) : (
        <>
          <Typography sx={{ fontFamily: font, fontSize: 13, color: c.muted, mb: 1 }}>
            {t('checkout.wallet.capHint', { percent: Math.round(cap * 100) })}{' '}
            {t('checkout.wallet.maxHint', { amount: fmtMoney(ceiling, currency, formatLocale) })}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Slider
              value={Math.min(applied, ceiling)}
              min={0}
              max={ceiling}
              step={1}
              onChange={(_, v) => commit(Array.isArray(v) ? v[0] : v)}
              sx={{ color: c.main, flex: 1 }}
              aria-label={t('checkout.wallet.applyLabel')}
            />
            <TextField
              value={input}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^\d.]/g, '');
                setInput(digits);
                commit(parseFloat(digits) || 0);
              }}
              inputProps={{ inputMode: 'decimal', 'aria-label': t('checkout.wallet.applyLabel') }}
              size="small"
              sx={{ width: 120, bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button
              size="small"
              onClick={() => commit(ceiling)}
              sx={{ fontFamily: font, textTransform: 'none', color: c.main, minWidth: 0 }}
            >
              {t('checkout.wallet.useMax')}
            </Button>
            {applied > 0 && (
              <Button
                size="small"
                onClick={() => commit(0)}
                sx={{ fontFamily: font, textTransform: 'none', color: c.muted, minWidth: 0 }}
              >
                {t('checkout.wallet.reset')}
              </Button>
            )}
          </Stack>
        </>
      )}
    </Box>
  );
}
