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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { ArrowBack, Visibility, VisibilityOff } from '@mui/icons-material';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { updateProfile, changePassword, exportAccount, deleteAccount } from '@/lib/auth';
import { useTranslations } from 'next-intl';

const fontMain = 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    fontFamily: fontBody,
    color: palette.primary,
  },
};

export default function SettingsPage() {
  const t = useTranslations('account');
  const tCommon = useTranslations('common');

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

  // GDPR Danger Zone state
  const [exporting, setExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

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
      setSnack({ open: true, message: t('profileSaved'), severity: 'success' });
    } catch (err: any) {
      setSnack({
        open: true,
        message: err?.response?.data?.message || t('profileSaveError'),
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
        message: t('passwordTooShort'),
        severity: 'error',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSnack({ open: true, message: t('passwordMismatch'), severity: 'error' });
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
      setSnack({ open: true, message: t('passwordChanged'), severity: 'success' });
      setTimeout(() => {
        signOut();
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg =
        code === 'wrong_password'
          ? t('wrongPassword')
          : err?.response?.data?.message || t('passwordChangeError');
      setSnack({ open: true, message: msg, severity: 'error' });
    } finally {
      setChangingPw(false);
    }
  };

  // GDPR Art.20 — export account data as JSON blob (AUTH-07 / D-09 / T-03-13)
  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportAccount();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'american-creator-account-data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setSnack({ open: true, message: 'Export failed. Try again.', severity: 'error' });
    } finally {
      setExporting(false);
    }
  };

  // GDPR Art.17 — delete account with password re-auth (AUTH-07 / D-09 / T-03-12)
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount({ password: deletePassword });
      setDeleteDialogOpen(false);
      signOut();
      router.push('/');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Could not delete account. Check your password.';
      setSnack({ open: true, message: msg, severity: 'error' });
    } finally {
      setDeleting(false);
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
            {tCommon('home')}
          </Link>
          {' / '}
          <Link href="/account" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {t('breadcrumb')}
          </Link>
          {` / ${t('settingsBreadcrumb')}`}
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
            {t('settingsTitle')}
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
            {t('profileSection')}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label={t('nameLabel')}
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
              helperText={t('emailCannotChange')}
            />
            <TextField
              label={t('phoneLabel')}
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
            {saving ? t('saving') : t('save')}
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
            {t('passwordSection')}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label={t('currentPassword')}
              type={showPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              sx={inputSx}
              helperText={t('currentPasswordHint')}
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
              label={t('newPasswordLabel')}
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              sx={inputSx}
              helperText={t('newPasswordHint')}
            />
            <TextField
              label={t('confirmPasswordLabel')}
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
            {changingPw ? t('changingPassword') : t('changePasswordBtn')}
          </Button>
        </Box>
        {/* GDPR Danger Zone (AUTH-07 / D-09) */}
        <Box
          sx={{
            bgcolor: palette.bgLight,
            borderRadius: '20px',
            p: { xs: 3, md: 4 },
            mt: 3,
            maxWidth: 600,
            border: '1px solid',
            borderColor: 'error.light',
          }}
        >
          <Typography
            sx={{
              fontFamily: fontMain,
              fontSize: 20,
              fontWeight: 500,
              color: 'error.main',
              mb: 1,
              textTransform: 'uppercase',
            }}
          >
            Data & Privacy
          </Typography>
          <Typography
            sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 3 }}
          >
            Manage your personal data. These actions are irreversible.
          </Typography>

          {/* Export -- GDPR Art.20 */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontFamily: fontMain, fontWeight: 500, fontSize: 15, color: palette.primary, mb: 0.5 }}>
              Download My Data
            </Typography>
            <Typography sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 1.5 }}>
              Get a copy of your profile, addresses, and order history as a JSON file.
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleExport}
              disabled={exporting}
              sx={{
                borderRadius: '10px',
                fontFamily: fontMain,
                fontSize: 14,
                textTransform: 'none',
                px: 3,
              }}
            >
              {exporting ? 'Preparing...' : 'Download My Data'}
            </Button>
          </Box>

          <Box sx={{ borderTop: '1px solid', borderColor: 'error.light', pt: 2 }}>
            <Typography sx={{ fontFamily: fontMain, fontWeight: 500, fontSize: 15, color: 'error.main', mb: 0.5 }}>
              Delete Account
            </Typography>
            <Typography sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mb: 1.5 }}>
              Permanently anonymise your account and remove saved addresses. This cannot be undone.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={() => { setDeleteDialogOpen(true); setDeletePassword(''); }}
              sx={{
                borderRadius: '10px',
                fontFamily: fontMain,
                fontSize: 14,
                textTransform: 'none',
                px: 3,
              }}
            >
              Delete Account
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Delete Account confirmation dialog (T-03-12: password re-auth required) */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => { if (!deleting) setDeleteDialogOpen(false); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: fontMain, color: 'error.main' }}>
          Delete Account
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: fontBody, fontSize: 14, color: palette.primary, mb: 2 }}>
            This will permanently anonymise your account and delete all saved addresses.
            Enter your password to confirm.
          </Typography>
          <TextField
            label="Current password"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            fullWidth
            autoComplete="current-password"
            sx={inputSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ fontFamily: fontMain, textTransform: 'none', color: palette.primaryLight }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteAccount}
            disabled={!deletePassword || deleting}
            sx={{ fontFamily: fontMain, textTransform: 'none', borderRadius: '8px' }}
          >
            {deleting ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogActions>
      </Dialog>

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
