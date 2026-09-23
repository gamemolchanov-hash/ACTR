'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import MarketingStopsList from '@/components/MarketingStopsList';
import { confirmUnsubscribe, isInvalidLink } from '@/lib/unsubscribe';

/**
 * One-click unsubscribe from marketing emails (23.09.2026). The canon promises a
 * one-click opt-out in every email, so the withdrawal is sent as soon as the page
 * opens — from the browser, not on the server GET, which mail link scanners hit
 * on their own — and the page then lists what will no longer arrive. Opting
 * back in happens in «İletişim Tercihleri», where the consent text is shown.
 */

const fontMain = 'LiraFix, "Jost", "Jost Fallback", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

type Phase = 'working' | 'done' | 'invalid' | 'error';

function UnsubscribeInner() {
  const t = useTranslations('unsubscribe');
  const tCommon = useTranslations('common');
  const token = useSearchParams().get('t') || '';
  const [phase, setPhase] = useState<Phase>(token ? 'working' : 'invalid');
  const started = useRef(false);

  const run = () => {
    setPhase('working');
    confirmUnsubscribe(token)
      .then(() => setPhase('done'))
      .catch((err) => setPhase(isInvalidLink(err) ? 'invalid' : 'error'));
  };

  useEffect(() => {
    // StrictMode mounts twice in dev — the POST is idempotent, but send it once.
    if (!token || started.current) return;
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const message = (key: string) => (
    <Typography
      data-testid={`sf-unsubscribe-${phase}`}
      sx={{ fontFamily: fontBody, fontSize: { xs: 14, md: 16 }, color: palette.primary, lineHeight: 1.55 }}
    >
      {t(key)}
    </Typography>
  );

  const prefsLink = (
    <Button
      component={Link}
      href="/account/preferences"
      variant="outlined"
      sx={{
        mt: 2.5,
        borderColor: palette.primary,
        color: palette.primary,
        borderRadius: '10px',
        fontFamily: fontMain,
        textTransform: 'none',
      }}
    >
      {t('prefsLink')}
    </Button>
  );

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 0.5 }}>
          <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {tCommon('home')}
          </Link>
          {` / ${t('breadcrumb')}`}
        </Typography>
        <Typography
          variant="h1"
          sx={{ fontSize: { xs: 24, md: 40 }, fontWeight: 450, letterSpacing: { xs: 2, md: 0 } }}
        >
          {t('title')}
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 3, md: 4 }, mb: { xs: 4, md: 7 } }}>
        <Box
          data-testid="sf-unsubscribe"
          sx={{ bgcolor: palette.bgLight, borderRadius: '20px', maxWidth: 640, p: { xs: 3, md: 4 } }}
        >
          {phase === 'working' && message('loading')}
          {phase === 'done' && (
            <>
              {message('done')}
              <Box sx={{ mt: 2.5 }}>
                <MarketingStopsList />
              </Box>
              {prefsLink}
            </>
          )}
          {phase === 'invalid' && (
            <>
              {message('invalid')}
              {prefsLink}
            </>
          )}
          {phase === 'error' && (
            <>
              {message('error')}
              <Button
                onClick={run}
                variant="outlined"
                sx={{
                  mt: 2.5,
                  borderColor: palette.primary,
                  color: palette.primary,
                  borderRadius: '10px',
                  fontFamily: fontMain,
                  textTransform: 'none',
                }}
              >
                {t('retry')}
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeInner />
    </Suspense>
  );
}
