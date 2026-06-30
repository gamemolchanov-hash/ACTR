'use client';

import { useState, Suspense } from 'react';
import {
  Box,
  Typography,
  InputBase,
  Button,
  IconButton,
  InputAdornment,
  Snackbar,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { palette } from '@/lib/theme';
import { resetPassword } from '@/lib/auth';

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

function ResetPasswordInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'success';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setSnack({
        open: true,
        message: 'Пароль должен быть не менее 6 символов.',
        severity: 'error',
      });
      return;
    }
    if (password !== confirm) {
      setSnack({ open: true, message: 'Пароли не совпадают.', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSnack({ open: true, message: 'Пароль успешно установлен!', severity: 'success' });
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Ссылка недействительна или истекла.';
      setSnack({ open: true, message: msg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: 2, mt: 5, mb: 10, textAlign: 'center' }}>
        <Typography sx={{ fontFamily: fontMain, fontSize: 20, color: palette.primary, mb: 2 }}>
          Недействительная ссылка
        </Typography>
        <Typography sx={{ fontFamily: fontBody, fontSize: 16, color: palette.primaryLight, mb: 3 }}>
          Запросите новую ссылку для сброса пароля.
        </Typography>
        <Button
          component={Link}
          href="/login/forgot-password"
          variant="contained"
          sx={{
            bgcolor: palette.primary,
            borderRadius: '10px',
            textTransform: 'none',
            px: 4,
            py: 1.5,
          }}
        >
          Запросить сброс пароля
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
        <Typography
          sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 0.5 }}
        >
          <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            Главная
          </Link>
          {' / '}
          <Link href="/login" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            Авторизация
          </Link>
          {' / Новый пароль'}
        </Typography>
        <Typography
          variant="h1"
          sx={{ fontSize: { xs: 24, md: 40 }, fontWeight: 450, letterSpacing: { xs: 2, md: 0 } }}
        >
          НОВЫЙ ПАРОЛЬ
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
          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ mb: 2.5 }}>
              <Typography
                sx={{
                  fontFamily: fontMain,
                  fontSize: { xs: 14, md: 18 },
                  color: palette.primary,
                  mb: 0.75,
                }}
              >
                Новый пароль{' '}
                <Box component="span" sx={{ color: palette.cartBadge }}>
                  *
                </Box>
              </Typography>
              <InputBase
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                sx={inputSx}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: palette.primaryLight }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontFamily: fontMain,
                  fontSize: { xs: 14, md: 18 },
                  color: palette.primary,
                  mb: 0.75,
                }}
              >
                Подтверждение пароля{' '}
                <Box component="span" sx={{ color: palette.cartBadge }}>
                  *
                </Box>
              </Typography>
              <InputBase
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                sx={inputSx}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              disabled={loading || !password || !confirm}
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
              {loading ? 'Сохранение...' : 'Установить пароль'}
            </Button>
          </Box>
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
