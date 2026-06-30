'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Snackbar,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { ArrowBack, Visibility, VisibilityOff } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { updateProfile, changePassword } from '@/lib/auth';

const fontMain = '"Futura PT", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    fontFamily: fontBody,
    color: palette.primary,
  },
};

export default function SettingsPage() {
  const { customer, loading: authLoading, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const [snack, setSnack] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    if (!authLoading && !customer) router.replace('/login');
  }, [authLoading, customer, router]);

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
    }
  }, [customer]);

  const profileChanged =
    customer && (name !== (customer.name || '') || phone !== (customer.phone || ''));

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone });
      await refreshProfile();
      setSnack({ open: true, message: 'Данные сохранены', severity: 'success' });
    } catch (err: any) {
      setSnack({
        open: true,
        message: err?.response?.data?.message || 'Ошибка сохранения',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setSnack({
        open: true,
        message: 'Пароль должен быть не менее 6 символов',
        severity: 'error',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSnack({ open: true, message: 'Пароли не совпадают', severity: 'error' });
      return;
    }
    setChangingPw(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // FBG-22 / T-03-10: BFF invalidates pre-change tokens (tokens_valid_after) —
      // sign out and require re-login with the fresh token.
      setSnack({ open: true, message: 'Пароль изменён. Войдите заново.', severity: 'success' });
      setTimeout(() => {
        signOut();
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg =
        code === 'wrong_password'
          ? 'Неверный текущий пароль'
          : err?.response?.data?.message || 'Ошибка смены пароля';
      setSnack({ open: true, message: msg, severity: 'error' });
    } finally {
      setChangingPw(false);
    }
  };

  if (authLoading || !customer) return null;

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
          <Link href="/account" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            Личный кабинет
          </Link>
          {' / Настройки'}
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
            НАСТРОЙКИ
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mb: { xs: 4, md: 7 } }}>
        {/* Profile section */}
        <Box
          sx={{
            bgcolor: palette.bgLight,
            borderRadius: '20px',
            p: { xs: 3, md: 4 },
            mb: 3,
            maxWidth: 600,
          }}
        >
          <Typography
            sx={{
              fontFamily: fontMain,
              fontSize: 20,
              fontWeight: 500,
              color: palette.primary,
              mb: 3,
              textTransform: 'uppercase',
            }}
          >
            Личные данные
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="ФИО"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              sx={inputSx}
            />
            <TextField
              label="Email"
              value={customer.email}
              disabled
              fullWidth
              sx={inputSx}
              helperText="Email нельзя изменить"
            />
            <TextField
              label="Телефон"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              sx={inputSx}
            />
          </Box>

          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={!profileChanged || saving}
            sx={{
              mt: 3,
              bgcolor: palette.primary,
              borderRadius: '10px',
              fontFamily: fontMain,
              fontSize: 16,
              textTransform: 'none',
              px: 4,
              '&:hover': { bgcolor: '#2a3d85' },
            }}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </Box>

        {/* Password section */}
        <Box
          id="password"
          sx={{
            bgcolor: palette.bgLight,
            borderRadius: '20px',
            p: { xs: 3, md: 4 },
            maxWidth: 600,
          }}
        >
          <Typography
            sx={{
              fontFamily: fontMain,
              fontSize: 20,
              fontWeight: 500,
              color: palette.primary,
              mb: 3,
              textTransform: 'uppercase',
            }}
          >
            Смена пароля
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Текущий пароль"
              type={showPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              sx={inputSx}
              helperText="Оставьте пустым, если у вас ещё нет пароля"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: palette.primaryLight }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Новый пароль"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              sx={inputSx}
              helperText="Минимум 6 символов"
            />
            <TextField
              label="Подтверждение пароля"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              sx={inputSx}
            />
          </Box>

          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={!newPassword || changingPw}
            sx={{
              mt: 3,
              bgcolor: palette.primary,
              borderRadius: '10px',
              fontFamily: fontMain,
              fontSize: 16,
              textTransform: 'none',
              px: 4,
              '&:hover': { bgcolor: '#2a3d85' },
            }}
          >
            {changingPw ? 'Сохранение...' : 'Изменить пароль'}
          </Button>
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
