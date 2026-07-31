'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Button, Switch, FormControlLabel, Snackbar, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { getConsents, updateConsents, isAuthFailure } from '@/lib/auth';
import {
  ACTIVE_CHANNELS,
  classifySaveError,
  isPhoneUsableForConsent,
  stateToToggles,
  statusMessageKey,
  toDecision,
  type UiChannel,
} from '@/lib/ticari-ileti';
import type { ArmConsentState } from '@/lib/arm-types';
import { useTranslations, useLocale } from 'next-intl';

/**
 * «İletişim Tercihleri» — withdraw or grant ticari elektronik ileti consent per
 * İYS channel (FBG-410, canon §16/§17).
 *
 * Kept out of /account/settings on purpose: that page carries the Üyelik
 * Sözleşmesi-era profile data, password and GDPR actions, whereas this is a
 * separate legal basis with its own text version and its own audit trail.
 *
 * The declarations shown next to each switch are the canon §15 texts, verbatim
 * and in Turkish in both locales — turning a switch ON here IS giving consent,
 * so the same wording that ARM pins to `text_version` has to be on screen.
 */

const fontMain = 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

export default function PreferencesPage() {
  const t = useTranslations('account');
  const tCommon = useTranslations('common');
  const tConsent = useTranslations('ticariIleti');
  const locale = useLocale();

  const { customer, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [state, setState] = useState<ArmConsentState | null>(null);
  // Switches stay hidden until ARM has answered: an unknown state must never be
  // painted as "everything off" — that is a position the shopper could act on.
  const [reading, setReading] = useState(ACTIVE_CHANNELS.length > 0);
  const [loadError, setLoadError] = useState(false);
  /** The switch the shopper just moved, held until ARM confirms or denies it. */
  const [pending, setPending] = useState<{ channel: UiChannel; on: boolean } | null>(null);
  const [snack, setSnack] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Only the newest read may write state: a retry (or a re-read after an
  // ambiguous save) can overtake an earlier in-flight request.
  const readToken = useRef(0);

  useEffect(() => {
    if (!authLoading && !customer) router.replace('/login');
  }, [authLoading, customer, router]);

  /**
   * ARM derives the state against the card's CURRENT email/phone, so a contact
   * change stales earlier grants (canon §7) — always re-read, never cache it
   * across visits.
   */
  const load = useCallback(async () => {
    const token = ++readToken.current;
    setLoadError(false);
    setReading(true);
    try {
      const res = await getConsents();
      if (token !== readToken.current) return;
      setState(res.consents);
      setPending(null);
      setReading(false);
    } catch (err) {
      if (token !== readToken.current) return;
      if (isAuthFailure(err)) {
        signOut();
        router.replace('/login');
        return;
      }
      // An unreadable state is NOT "everything is off" — show the failure.
      setState(null);
      setPending(null);
      setReading(false);
      setLoadError(true);
    }
  }, [router, signOut]);

  useEffect(() => {
    if (!customer || ACTIVE_CHANNELS.length === 0) return;
    void load();
  }, [customer, load]);

  const toggles = useMemo(() => {
    const base = stateToToggles(state);
    return pending ? { ...base, [pending.channel]: pending.on } : base;
  }, [state, pending]);

  const phoneUsable = isPhoneUsableForConsent(customer?.phone);

  const handleToggle = async (channel: UiChannel, on: boolean) => {
    setPending({ channel, on });
    try {
      const res = await updateConsents([toDecision(channel, on)], locale);
      setState(res.consents);
      setPending(null);
      setSnack({
        open: true,
        message: tConsent(statusMessageKey({ channel, turnedOn: on, serverState: res.consents })),
        severity: 'success',
      });
    } catch (err) {
      const failure = classifySaveError(err);
      if (failure === 'auth') {
        signOut();
        router.replace('/login');
        return;
      }
      setSnack({
        open: true,
        message: tConsent(
          statusMessageKey({ channel, turnedOn: on, serverState: state, failure }),
        ),
        severity: 'error',
      });
      if (failure === 'ambiguous') {
        // ARM appends the consent events BEFORE it clears its cache, sends the
        // teyit and re-reads — so a 5xx / dropped connection can still mean
        // "recorded". Rolling the switch back would contradict what ARM acts
        // on; ask it what actually happened instead.
        await load();
        return;
      }
      // Rejected before anything was written — the old position is the truth.
      setPending(null);
    }
  };

  if (authLoading || !customer) return null;

  const busy = pending !== null;

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
            {t('breadcrumb')}
          </Link>
          {` / ${t('prefs.breadcrumb')}`}
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
            {t('prefs.title')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mb: { xs: 4, md: 7 } }}>
        <Box
          sx={{
            bgcolor: palette.bgLight,
            borderRadius: '20px',
            p: { xs: 3, md: 4 },
            maxWidth: 720,
          }}
        >
          <Typography sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight }}>
            {t('prefs.subtitle')}{' '}
            <Link
              href="/legal/ticari-elektronik-ileti"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: palette.primary }}
            >
              {tConsent('noticeLink')}
            </Link>
          </Typography>

          {ACTIVE_CHANNELS.length === 0 ? (
            <Typography
              sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primary, mt: 3 }}
            >
              {t('prefs.noChannels')}
            </Typography>
          ) : loadError ? (
            <Box sx={{ mt: 3 }}>
              <Typography sx={{ fontFamily: fontBody, fontSize: 14, color: palette.cartBadge }}>
                {t('prefs.loadError')}
              </Typography>
              <Button
                onClick={() => void load()}
                variant="outlined"
                sx={{
                  mt: 1.5,
                  borderColor: palette.primary,
                  color: palette.primary,
                  borderRadius: '10px',
                  fontFamily: fontMain,
                  textTransform: 'none',
                }}
              >
                {t('prefs.retry')}
              </Button>
            </Box>
          ) : reading ? null : (
            <Box sx={{ mt: 3 }}>
              {ACTIVE_CHANNELS.map((channel) => {
                const on = toggles[channel];
                // Withdrawal is never blocked (§10) — only a GRANT needs the
                // contact ARM will attach it to, otherwise the POST 400s.
                const disabled = busy || (channel !== 'email' && !phoneUsable && !on);
                return (
                  <FormControlLabel
                    key={channel}
                    control={
                      <Switch
                        checked={on}
                        disabled={disabled}
                        onChange={(e) => void handleToggle(channel, e.target.checked)}
                        sx={{
                          '& .Mui-checked': { color: palette.primary },
                          '& .Mui-checked + .MuiSwitch-track': { bgcolor: palette.primary },
                        }}
                      />
                    }
                    label={
                      <Typography
                        sx={{
                          fontFamily: fontBody,
                          fontSize: { xs: 12, md: 13 },
                          color: palette.primary,
                          lineHeight: 1.5,
                        }}
                      >
                        {tConsent(`${channel}Label`)}
                      </Typography>
                    }
                    sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, mr: 0 }}
                  />
                );
              })}

              {!phoneUsable && ACTIVE_CHANNELS.some((c) => c !== 'email') && (
                <Typography
                  sx={{ fontFamily: fontBody, fontSize: 12, color: palette.primaryLight, mt: 1 }}
                >
                  {t('prefs.phoneMissing')}{' '}
                  <Link href="/account/settings" style={{ color: palette.primary }}>
                    {t('prefs.phoneMissingLink')}
                  </Link>
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
