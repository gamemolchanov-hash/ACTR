'use client';

import { useState, Suspense } from 'react';
import { Box, Typography, InputBase, Button, Snackbar, Alert } from '@mui/material';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { palette } from '@/lib/theme';
import { forgotPassword } from '@/lib/auth';
import { useTranslations } from 'next-intl';

const fontMain = '"Futura PT", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

const inputSx = {
  border: `0.5px solid ${palette.primary}`,
  borderRadius: '10px',
  px: 2,
  bgcolor: 'white',
  fontFamily: fontBody,
  fontSize: { xs: 14, md: 16 },
  color: palette.primary,
  height: { xs: 44, md: 50 },
  width: '100%',
};

function ForgotPasswordInner() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [snack, setSnack] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'info' | 'success';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
      setSnack({
        open: true,
        message: t('forgotSentSuccess'),
        severity: 'success',
      });
    } catch {
      setSnack({
        open: true,
        message: t('forgotSentFailed'),
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
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
          <Link href="/login" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {t('breadcrumbAuth')}
          </Link>
          {` / ${t('breadcrumbForgotPassword')}`}
        </Typography>

        <Typography
          variant="h1"
          sx={{ fontSize: { xs: 24, md: 40 }, fontWeight: 450, letterSpacing: { xs: 2, md: 0 } }}
        >
          {t('forgotTitle')}
        </Typography>
      </Box>

      <Box
        sx={{
          maxWidth: 1300,
          mx: 'auto',
          px: { xs: 2.5, md: 2 },
          mt: { xs: 3, md: 4 },
          mb: { xs: 4, md: 7 },
        }}
      >
        <Box
          sx={{
            bgcolor: palette.bgLight,
            borderRadius: '20px',
            maxWidth: 500,
            px: { xs: 3, md: 5 },
            py: { xs: 3, md: 4 },
          }}
        >
          {sent ? (
            <>
              <Typography
                sx={{
                  fontFamily: fontMain,
                  fontSize: { xs: 15, md: 18 },
                  color: palette.primary,
                  mb: 2,
                }}
              >
                {t('forgotCheckEmailPre')} <b>{email}</b> {t('forgotCheckEmailPost')}
              </Typography>
              <Typography
                sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primaryLight, mb: 3 }}
              >
                {t('forgotCheckSpam')}
              </Typography>
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: palette.primary,
                  color: palette.primary,
                  borderRadius: '10px',
                  fontFamily: fontMain,
                  fontSize: 16,
                  textTransform: 'none',
                  py: '12px',
                }}
              >
                {t('backToLogin')}
              </Button>
            </>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Typography
                sx={{
                  fontFamily: fontMain,
                  fontSize: { xs: 15, md: 18 },
                  color: palette.primary,
                  mb: 3,
                }}
              >
                {t('forgotInstruction')}
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography
                  sx={{
                    fontFamily: fontMain,
                    fontSize: { xs: 14, md: 18 },
                    color: palette.primary,
                    mb: 0.75,
                  }}
                >
                  Email{' '}
                  <Box component="span" sx={{ color: palette.cartBadge }}>
                    *
                  </Box>
                </Typography>
                <InputBase
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  sx={inputSx}
                />
              </Box>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !email}
                fullWidth
                sx={{
                  bgcolor: palette.primary,
                  color: 'white',
                  borderRadius: '10px',
                  fontFamily: fontMain,
                  fontSize: { xs: 16, md: 18 },
                  fontWeight: 450,
                  textTransform: 'none',
                  py: '14px',
                  '&:hover': { bgcolor: '#2a3d85' },
                }}
              >
                {loading ? t('sending') : t('sendLink')}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack({ ...snack, open: false })}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordInner />
    </Suspense>
  );
}
