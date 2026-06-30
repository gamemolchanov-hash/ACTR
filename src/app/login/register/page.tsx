'use client';

import { useState, useRef } from 'react';
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
import RefreshIcon from '@mui/icons-material/Refresh';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { palette } from '@/lib/theme';
import { register, login as doLogin, TERMS_VERSION } from '@/lib/auth';
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

const MIN_SUBMIT_MS = 3000;

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

/* ── simple math captcha ── */

function generateCaptcha(): { a: number; b: number; op: '+' | '-'; answer: number } {
  const ops: Array<'+' | '-'> = ['+', '-'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;
  if (op === '+') {
    a = Math.floor(Math.random() * 20) + 1;
    b = Math.floor(Math.random() * 20) + 1;
    answer = a + b;
  } else {
    a = Math.floor(Math.random() * 20) + 5;
    b = Math.floor(Math.random() * a);
    answer = a - b;
  }
  return { a, b, op, answer };
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { setAuth } = useAuth();

  // anti-bot: honeypot
  const [website, setWebsite] = useState('');

  // anti-bot: captcha
  const [captcha, setCaptcha] = useState(() => generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState('');

  // anti-bot: timestamp
  const loadedAt = useRef(Date.now());

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput('');
  };

  const [snack, setSnack] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'info' | 'success';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhone(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password || !confirmPassword) return;

    // honeypot check
    if (website) return;

    // time check
    if (Date.now() - loadedAt.current < MIN_SUBMIT_MS) {
      setSnack({ open: true, message: 'Слишком быстро. Попробуйте ещё раз.', severity: 'error' });
      return;
    }

    // captcha check
    if (parseInt(captchaInput, 10) !== captcha.answer) {
      setSnack({ open: true, message: 'Неверный ответ. Попробуйте ещё раз.', severity: 'error' });
      refreshCaptcha();
      return;
    }

    if (password.length < 6) {
      setSnack({
        open: true,
        message: 'Пароль должен состоять минимум из 6 знаков.',
        severity: 'error',
      });
      return;
    }

    if (password !== confirmPassword) {
      setSnack({ open: true, message: 'Пароли не совпадают.', severity: 'error' });
      return;
    }

    // terms gate (AUTH-01 / D-07)
    if (!agreed) {
      setSnack({
        open: true,
        message: 'Please accept the Terms & Privacy Policy to register.',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const emailNorm = email.trim().toLowerCase();
      await register({
        name: name.trim(),
        email: emailNorm,
        phone: phone || undefined,
        password,
        terms_accepted: true,
        terms_version: TERMS_VERSION,
      });
      // Auto-login after register (FBG pattern)
      const loginRes = await doLogin(emailNorm, password);
      setAuth(loginRes.token, loginRes.customer, loginRes.loyalty);
      router.push('/');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Registration failed. Please try again.';
      setSnack({ open: true, message: msg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  const router = useRouter();

  const isValid = name && email && phone && password && confirmPassword && captchaInput && agreed;

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
          {' / '}
          <Link href="/login" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            Авторизация
          </Link>
          {' / Регистрация'}
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
          РЕГИСТРАЦИЯ
        </Typography>
      </Box>

      {/* Registration form card */}
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
            maxWidth: 640,
            px: { xs: 3, md: 5 },
            py: { xs: 3, md: 4 },
          }}
        >
          <Box component="form" onSubmit={handleSubmit} autoComplete="off">
            {/* Name */}
            <FieldBlock
              label="Фамилия Имя Отчество"
              required
              hint="Заполните, чтобы мы знали, как к вам обращаться."
            >
              <InputBase
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                sx={inputSx}
              />
            </FieldBlock>

            {/* Email */}
            <FieldBlock
              label="E-mail"
              required
              hint="Для отправки уведомлений о статусе заказа. Используйте как логин для входа в личный кабинет."
            >
              <InputBase
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                sx={inputSx}
              />
            </FieldBlock>

            {/* Phone */}
            <FieldBlock label="Телефон" required hint="Необходим для уточнения деталей заказа.">
              <InputBase
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+7 (___) ___-__-__"
                sx={inputSx}
              />
            </FieldBlock>

            {/* Password */}
            <FieldBlock label="Пароль" required hint="Пароль должен состоять минимум из 6 знаков.">
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
            </FieldBlock>

            {/* Confirm Password */}
            <FieldBlock label="Подтверждение пароля" required>
              <InputBase
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                sx={inputSx}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirm(!showConfirm)}
                      edge="end"
                      sx={{ color: palette.primaryLight }}
                    >
                      {showConfirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
              />
            </FieldBlock>

            {/* Honeypot — invisible to humans, bots fill it */}
            <Box
              sx={{
                position: 'absolute',
                left: '-9999px',
                opacity: 0,
                height: 0,
                overflow: 'hidden',
              }}
              aria-hidden="true"
            >
              <label htmlFor="reg-website">Website</label>
              <input
                id="reg-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </Box>

            {/* Math CAPTCHA */}
            <FieldBlock label="Введите результат" required>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    bgcolor: palette.primary,
                    color: 'white',
                    borderRadius: '10px',
                    px: 2.5,
                    height: { xs: 44, md: 50 },
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: { xs: 18, md: 22 },
                      fontWeight: 700,
                      letterSpacing: 2,
                      color: 'white',
                    }}
                  >
                    <span suppressHydrationWarning>
                      {captcha.a} {captcha.op} {captcha.b} =
                    </span>
                  </Typography>
                </Box>
                <InputBase
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="?"
                  inputProps={{ inputMode: 'numeric', maxLength: 3 }}
                  sx={{
                    ...inputSx,
                    maxWidth: 80,
                    textAlign: 'center',
                    '& input': { textAlign: 'center' },
                  }}
                />
                <IconButton
                  onClick={refreshCaptcha}
                  title="Новый пример"
                  sx={{ color: palette.primary }}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
            </FieldBlock>

            {/* Terms & Privacy checkbox (AUTH-01 / D-07) */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  sx={{
                    color: palette.primaryLight,
                    '&.Mui-checked': { color: palette.primary },
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    fontFamily: fontMain,
                    fontSize: { xs: 13, md: 15 },
                    color: palette.primary,
                  }}
                >
                  I agree to the{' '}
                  <Link href="/terms" style={{ color: palette.primary }}>
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy" style={{ color: palette.primary }}>
                    Privacy Policy
                  </Link>
                </Typography>
              }
              sx={{ mb: 1, alignItems: 'flex-start' }}
            />

            {/* Submit */}
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !isValid}
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
                mt: 1,
                '&:hover': { bgcolor: '#2a3d85' },
              }}
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
          </Box>

          {/* Required fields note + login link */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 2.5,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography
              sx={{
                fontFamily: fontBody,
                fontSize: 12,
                color: palette.primaryLight,
              }}
            >
              <Box component="span" sx={{ color: palette.cartBadge }}>
                *
              </Box>{' '}
              — обязательные поля
            </Typography>

            <Typography
              sx={{
                fontFamily: fontMain,
                fontSize: { xs: 13, md: 16 },
                color: palette.primary,
              }}
            >
              Уже есть аккаунт?{' '}
              <Link
                href="/login"
                style={{
                  color: palette.primary,
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  fontWeight: 500,
                }}
              >
                Войдите
              </Link>
            </Typography>
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

/* ── reusable field block ── */

function FieldBlock({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        sx={{
          fontFamily: '"Futura PT", Helvetica, sans-serif',
          fontWeight: 400,
          fontSize: { xs: 14, md: 18 },
          lineHeight: '20px',
          color: palette.primary,
          mb: 0.75,
        }}
      >
        {label}
        {required && (
          <>
            {' '}
            <Box component="span" sx={{ color: palette.cartBadge }}>
              *
            </Box>
          </>
        )}
      </Typography>
      {children}
      {hint && (
        <Typography
          sx={{
            fontFamily: '"Open Sans", Helvetica, sans-serif',
            fontSize: 12,
            color: palette.primaryLight,
            mt: 0.5,
          }}
        >
          {hint}
        </Typography>
      )}
    </Box>
  );
}
