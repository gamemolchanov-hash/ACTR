'use client';

import { useState } from 'react';
import { Box, Typography, InputBase, Button, Snackbar, Alert } from '@mui/material';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';

const inputSx = {
  border: `0.5px solid ${palette.primary}`,
  borderRadius: '10px',
  px: 2,
  width: '100%',
  height: { xs: 40, md: 50 },
  bgcolor: 'white',
  fontFamily: '"Futura PT", Helvetica',
  fontSize: { xs: 16, md: 18 },
  color: palette.primary,
};

export default function BloggersPage() {
  const t = useTranslations('partners');
  const tb = useTranslations('partners.bloggers');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    socials: '',
    cooperationType: '',
    comment: '',
  });
  const [sending, setSending] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; ok: boolean }>({ open: false, ok: true });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.socials || !form.cooperationType) return;
    setSending(true);
    try {
      await api.post('/contact', { ...form, source: 'bloggers' });
      setForm({ name: '', email: '', phone: '', socials: '', cooperationType: '', comment: '' });
      setSnack({ open: true, ok: true });
    } catch {
      setSnack({ open: true, ok: false });
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* ── Breadcrumb + Title ── */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 4 } }}>
        <Typography
          sx={{
            fontFamily: '"Open Sans", sans-serif',
            fontSize: 13,
            color: palette.primaryLight,
            mb: 0.5,
          }}
        >
          <Link href="/" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {t('breadcrumbHome')}
          </Link>
          {' / '}
          <Link href="/partners" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            {t('breadcrumbLabel')}
          </Link>
          {tb('breadcrumbSep')}
        </Typography>

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 30, md: 40 },
            lineHeight: { xs: '35px', md: '50px' },
            fontWeight: 450,
          }}
        >
          {tb('pageTitle')}
        </Typography>
      </Box>

      {/* ── Hero image ── */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
        <Box
          component="img"
          src="/images/partners/ankety_bloggers.png"
          alt={tb('heroAlt')}
          sx={{
            width: '100%',
            height: { xs: 200, md: 360 },
            objectFit: 'cover',
            borderRadius: '20px',
            display: 'block',
          }}
        />
      </Box>

      {/* ── Form ── */}
      <Box
        sx={{
          maxWidth: 640,
          mx: { xs: 'auto', md: 0 },
          ml: { md: 'calc((100% - 1300px) / 2 + 16px)' },
          px: { xs: 2.5, md: 2 },
          mt: { xs: 3, md: 4 },
          mb: { xs: 4, md: 8 },
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Futura PT", Helvetica',
            fontSize: { xs: 16, md: 18 },
            lineHeight: '20px',
            color: palette.primary,
            mb: { xs: 3, md: 4 },
          }}
        >
          {t('responseTime')}
        </Typography>

        {/* Name */}
        <Field label={tb('fieldName')} required>
          <InputBase sx={inputSx} value={form.name} onChange={set('name')} />
        </Field>

        {/* Email */}
        <Field label="Email" required>
          <InputBase sx={inputSx} value={form.email} onChange={set('email')} type="email" />
        </Field>

        {/* Phone */}
        <Field label={tb('fieldPhone')} required>
          <InputBase sx={inputSx} value={form.phone} onChange={set('phone')} type="tel" />
        </Field>

        {/* Social links */}
        <Field label={tb('fieldSocials')} required>
          <InputBase sx={inputSx} value={form.socials} onChange={set('socials')} />
        </Field>

        {/* Cooperation type */}
        <Field label={tb('fieldCoopType')} required>
          <InputBase sx={inputSx} value={form.cooperationType} onChange={set('cooperationType')} />
        </Field>

        {/* Comment */}
        <Field label={t('fieldComment')}>
          <InputBase
            multiline
            rows={4}
            value={form.comment}
            onChange={set('comment')}
            sx={{ ...inputSx, height: 'auto', alignItems: 'flex-start', py: 1.5 }}
          />
        </Field>

        <Typography sx={{ fontSize: 13, color: palette.primaryLight, mt: 1, mb: 3 }}>
          {t('requiredFields')}
        </Typography>

        <Button
          variant="contained"
          disabled={
            sending ||
            !form.name ||
            !form.email ||
            !form.phone ||
            !form.socials ||
            !form.cooperationType
          }
          onClick={handleSubmit}
          sx={{
            bgcolor: palette.primary,
            color: 'white',
            borderRadius: '10px',
            fontFamily: '"Futura PT", Helvetica',
            fontSize: 18,
            fontWeight: 450,
            textTransform: 'none',
            px: 5,
            py: '15px',
            width: { xs: '100%', md: 'auto' },
            '&:hover': { bgcolor: '#2a3d85' },
          }}
        >
          {sending ? t('sending') : t('submit')}
        </Button>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.ok ? 'success' : 'error'} variant="filled">
          {snack.ok ? t('successMsg') : t('errorMsg')}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        sx={{
          fontFamily: '"Futura PT", Helvetica',
          fontSize: { xs: 16, md: 18 },
          color: palette.primary,
          mb: 1,
        }}
      >
        {label}
        {required && (
          <Box component="span" sx={{ color: palette.cartBadge }}>
            {' *'}
          </Box>
        )}
      </Typography>
      {children}
    </Box>
  );
}
