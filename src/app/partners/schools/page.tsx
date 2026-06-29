'use client';

import { useState } from 'react';
import { Box, Typography, InputBase, Button, Snackbar, Alert } from '@mui/material';
import Link from 'next/link';
import { palette } from '@/lib/theme';
import { api } from '@/lib/api';

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

export default function SchoolsPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    links: '',
    comment: '',
  });
  const [sending, setSending] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; ok: boolean }>({ open: false, ok: true });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.city || !form.links) return;
    setSending(true);
    try {
      await api.post('/contact', { ...form, source: 'schools' });
      setForm({ name: '', email: '', phone: '', city: '', links: '', comment: '' });
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
            Главная
          </Link>
          {' / '}
          <Link href="/partners" style={{ color: palette.primaryLight, textDecoration: 'none' }}>
            Партнерам
          </Link>
          {' / Школам'}
        </Typography>

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 30, md: 40 },
            lineHeight: { xs: '35px', md: '50px' },
            fontWeight: 450,
          }}
        >
          АНКЕТА ДЛЯ ШКОЛ
        </Typography>
      </Box>

      {/* ── Hero image ── */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: { xs: 2, md: 3 } }}>
        <Box
          component="img"
          src="/images/partners/ankety_schools.png"
          alt="Школам"
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
          Ответим Вам в течении нескольких рабочих дней
        </Typography>

        {/* Name */}
        <Field label="Название" required>
          <InputBase sx={inputSx} value={form.name} onChange={set('name')} />
        </Field>

        {/* Email */}
        <Field label="Email" required>
          <InputBase sx={inputSx} value={form.email} onChange={set('email')} type="email" />
        </Field>

        {/* Phone */}
        <Field label="Номер телефона" required>
          <InputBase sx={inputSx} value={form.phone} onChange={set('phone')} type="tel" />
        </Field>

        {/* City */}
        <Field label="Город (центрального офиса и список городов где находятся школы)" required>
          <InputBase sx={inputSx} value={form.city} onChange={set('city')} />
        </Field>

        {/* Links */}
        <Field label="Ссылки на сайт или соц. сети" required>
          <InputBase sx={inputSx} value={form.links} onChange={set('links')} />
        </Field>

        {/* Comment */}
        <Field label="Дополнительные комментарии">
          <InputBase
            multiline
            rows={4}
            value={form.comment}
            onChange={set('comment')}
            sx={{ ...inputSx, height: 'auto', alignItems: 'flex-start', py: 1.5 }}
          />
        </Field>

        <Typography sx={{ fontSize: 13, color: palette.primaryLight, mt: 1, mb: 3 }}>
          * обязательные поля
        </Typography>

        <Button
          variant="contained"
          disabled={
            sending || !form.name || !form.email || !form.phone || !form.city || !form.links
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
          {sending ? 'Отправка...' : 'Отправить'}
        </Button>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.ok ? 'success' : 'error'} variant="filled">
          {snack.ok
            ? 'Заявка отправлена! Мы свяжемся с вами.'
            : 'Ошибка отправки. Попробуйте позже.'}
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
