'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  InputBase,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Snackbar,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { palette } from '@/lib/theme';
import { login as doLogin, type NeedsResetResponse } from '@/lib/auth';
import { useAuth } from '@/lib/auth-context';

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

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const d = digits.startsWith('7')
    ? digits.slice(1)
    : digits.startsWith('8')
      ? digits.slice(1)
      : digits;
  let result = '+7';
  if (d.length > 0) result += ` (${d.slice(0, 3)}`;
  if (d.length >= 3) result += `) ${d.slice(3, 6)}`;
  if (d.length >= 6) result += `-${d.slice(6, 8)}`;
  if (d.length >= 8) result += `-${d.slice(8, 10)}`;
  return result;
}

function isPhone(value: string): boolean {
  return /^[+\d()\s-]/.test(value) && /\d/.test(value) && !value.includes('@');
}

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'info' | 'success';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const router = useRouter();
  const { refresh } = useAuth();

  const handleLoginChange = (value: string) => {
    if (isPhone(value) && !login.includes('@')) {
      setLogin(formatPhone(value));
    } else {
      setLogin(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !password) return;

    setLoading(true);
    try {
      const res = await doLogin({ login, password });

      if ('needsReset' in res && res.needsReset) {
        const nr = res as NeedsResetResponse;
        setSnack({ open: true, message: nr.message, severity: 'info' });
        setTimeout(
          () => router.push(`/login/forgot-password?email=${encodeURIComponent(nr.email)}`),
          1500,
        );
        return;
      }

      await refresh();
      router.push('/');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Ошибка авторизации. Попробуйте ещё раз.';
      setSnack({ open: true, message: msg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* Breadcrumb + Title */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
        <Typography
          sx={{
            fontFamily: fontBody,
            fontSize: 13,
            color: palette.primaryLight,
            mb: 0.5,
          }}
        >
          <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            Главная
          </Link>
          {' / Авторизация'}
        </Typography>

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 24, md: 40 },
            lineHeight: { xs: '30px', md: '50px' },
            fontWeight: 450,
            letterSpacing: { xs: 2, md: 0 },
          }}
        >
          АВТОРИЗАЦИЯ
        </Typography>

        <Typography
          sx={{
            fontFamily: fontMain,
            fontWeight: 400,
            fontSize: { xs: 13, md: 18 },
            lineHeight: '23px',
            color: palette.primary,
            mt: 1,
          }}
        >
          Авторизировавшись, вы сможете управлять своими личными данными, следить за состоянием
          заказов.
        </Typography>
      </Box>

      {/* Two-column card */}
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
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 3, md: 0 },
          }}
        >
          {/* Left column: Login */}
          <Box
            sx={{
              flex: 1,
              bgcolor: palette.bgLight,
              borderRadius: { xs: '20px', md: '20px 0 0 20px' },
              px: { xs: 3, md: 5 },
              py: { xs: 3, md: 4 },
            }}
          >
            <Typography
              sx={{
                fontFamily: fontMain,
                fontWeight: 500,
                fontSize: { xs: 16, md: 20 },
                lineHeight: '26px',
                color: palette.primary,
                textTransform: 'uppercase',
                mb: 3,
              }}
            >
              Я зарегистрированный пользователь
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              {/* Email/Phone */}
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  sx={{
                    fontFamily: fontMain,
                    fontWeight: 400,
                    fontSize: { xs: 14, md: 18 },
                    lineHeight: '20px',
                    color: palette.primary,
                    mb: 0.75,
                  }}
                >
                  Email / Телефон{' '}
                  <Box component="span" sx={{ color: palette.cartBadge }}>
                    *
                  </Box>
                </Typography>
                <InputBase
                  value={login}
                  onChange={(e) => handleLoginChange(e.target.value)}
                  placeholder="email@example.com или +7 (___) ___-__-__"
                  sx={inputSx}
                />
              </Box>

              {/* Password */}
              <Box sx={{ mb: 2 }}>
                <Typography
                  sx={{
                    fontFamily: fontMain,
                    fontWeight: 400,
                    fontSize: { xs: 14, md: 18 },
                    lineHeight: '20px',
                    color: palette.primary,
                    mb: 0.75,
                  }}
                >
                  Пароль{' '}
                  <Box component="span" sx={{ color: palette.cartBadge }}>
                    *
                  </Box>
                </Typography>
                <InputBase
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              {/* Remember me + Forgot password */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      sx={{
                        color: palette.primaryLight,
                        '&.Mui-checked': { color: palette.primary },
                      }}
                    />
                  }
                  label="Запомнить меня"
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontFamily: fontMain,
                      fontSize: { xs: 13, md: 16 },
                      color: palette.primary,
                    },
                  }}
                />
                <Link
                  href="/login/forgot-password"
                  style={{
                    fontFamily: fontMain,
                    fontSize: 14,
                    color: palette.primary,
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Забыли пароль?
                </Link>
              </Box>

              {/* Submit */}
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !login || !password}
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
                {loading ? 'Вход...' : 'Войти'}
              </Button>
            </Box>

            {/* Required fields note */}
            <Typography
              sx={{
                fontFamily: fontBody,
                fontSize: 12,
                color: palette.primaryLight,
                mt: 2,
              }}
            >
              <Box component="span" sx={{ color: palette.cartBadge }}>
                *
              </Box>{' '}
              — обязательные поля
            </Typography>
          </Box>

          {/* Right column: Registration */}
          <Box
            sx={{
              flex: 1,
              bgcolor: 'white',
              border: `1px solid ${palette.primaryLight}`,
              borderRadius: { xs: '20px', md: '0 20px 20px 0' },
              px: { xs: 3, md: 5 },
              py: { xs: 3, md: 4 },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography
              sx={{
                fontFamily: fontMain,
                fontWeight: 500,
                fontSize: { xs: 16, md: 20 },
                lineHeight: '26px',
                color: palette.primary,
                textTransform: 'uppercase',
                mb: 3,
              }}
            >
              Я новый пользователь
            </Typography>

            <Typography
              sx={{
                fontFamily: fontMain,
                fontWeight: 400,
                fontSize: { xs: 13, md: 18 },
                lineHeight: '23px',
                color: palette.primary,
                mb: 3,
              }}
            >
              Зарегистрируйтесь, чтобы получить доступ к личному кабинету, отслеживать заказы и
              получать персональные предложения.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 3 }}>
              {[
                'Просматривайте историю и статус заказов',
                'Сохраняйте адреса доставки',
                'Получайте персональные скидки и акции',
              ].map((text) => (
                <Box key={text} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: palette.primary,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mt: '2px',
                    }}
                  >
                    <Box
                      component="svg"
                      viewBox="0 0 16 16"
                      sx={{ width: 14, height: 14, fill: 'white' }}
                    >
                      <path
                        d="M13.5 4.5l-7 7L3 8"
                        stroke="white"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Box>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: fontMain,
                      fontWeight: 400,
                      fontSize: { xs: 13, md: 16 },
                      lineHeight: '22px',
                      color: palette.primary,
                    }}
                  >
                    {text}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ mt: 'auto' }}>
              <Button
                component={Link}
                href="/login/register"
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: palette.primary,
                  color: palette.primary,
                  borderRadius: '10px',
                  fontFamily: fontMain,
                  fontSize: { xs: 16, md: 18 },
                  fontWeight: 450,
                  textTransform: 'none',
                  py: '14px',
                  '&:hover': {
                    borderColor: '#2a3d85',
                    bgcolor: palette.bgLight,
                  },
                }}
              >
                Зарегистрироваться
              </Button>
            </Box>
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
