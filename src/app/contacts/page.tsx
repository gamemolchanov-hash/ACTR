'use client';

import { useState } from 'react';
import { Box, Typography, InputBase, Button, Snackbar, Alert } from '@mui/material';
import Link from 'next/link';
import { palette } from '@/lib/theme';
import { api } from '@/lib/api';

const fontMain = '"Futura PT", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';

const inputSx = {
  border: `0.5px solid ${palette.primary}`,
  borderRadius: '10px',
  px: 2,
  bgcolor: 'white',
  fontFamily: fontBody,
  fontSize: { xs: 14, md: 14 },
  color: palette.primary,
};

export default function ContactsPage() {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; ok: boolean }>({ open: false, ok: true });

  const handleSubmit = async () => {
    if (!email || !message) return;
    setSending(true);
    try {
      await api.post('/contact', { email, comment: message, source: 'contacts' });
      setEmail('');
      setMessage('');
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
          {' / Контакты'}
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
          КОНТАКТЫ
        </Typography>
      </Box>

      {/* ── Contact Info ── */}
      <Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2.5, md: 2 }, mt: 1.5 }}>
        <Typography
          component="a"
          href="mailto:info@american-creator.ru"
          sx={{
            fontFamily: fontMain,
            fontWeight: 400,
            fontSize: { xs: 14, md: 18 },
            lineHeight: '20px',
            color: palette.primary,
            textDecoration: 'none',
            display: 'block',
            mb: 0.5,
          }}
        >
          info@american-creator.ru
        </Typography>
        <Typography
          component="a"
          href="tel:+79957578467"
          sx={{
            fontFamily: fontMain,
            fontWeight: 400,
            fontSize: { xs: 14, md: 18 },
            lineHeight: '20px',
            color: palette.primary,
            textDecoration: 'none',
            display: 'block',
          }}
        >
          +7 995 757-84-67
        </Typography>
      </Box>

      {/* ── Main Card: image + form ── */}
      <Box
        sx={{
          maxWidth: 1300,
          mx: 'auto',
          px: { xs: 2.5, md: 2 },
          mt: { xs: 3, md: 3 },
        }}
      >
        <Box
          sx={{
            bgcolor: palette.bgLight,
            borderRadius: '20px',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            overflow: 'hidden',
            /* mobile: centered narrow card */
            width: { xs: 280, md: '100%' },
            mx: { xs: 'auto', md: 0 },
          }}
        >
          {/* Left: hero image (desktop only) */}
          <Box
            component="img"
            src="/images/contacts/contact-hero.png"
            alt="Контакты"
            sx={{
              display: { xs: 'none', md: 'block' },
              width: 444,
              height: 533,
              objectFit: 'cover',
              flexShrink: 0,
              borderRadius: '20px 0 0 20px',
            }}
          />

          {/* Right: contact form */}
          <Box
            sx={{
              flex: 1,
              px: { xs: 3, md: '50px' },
              pt: { xs: 3, md: '38px' },
              pb: { xs: 3, md: '30px' },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Form heading */}
            <Typography
              sx={{
                fontFamily: fontMain,
                fontWeight: 500,
                fontSize: { xs: 16, md: 20 },
                lineHeight: '26px',
                color: palette.primary,
                textTransform: 'uppercase',
                mb: 1,
              }}
            >
              НАПИШИТЕ НАМ
            </Typography>

            <Typography
              sx={{
                fontFamily: fontMain,
                fontWeight: 400,
                fontSize: { xs: 13, md: 18 },
                lineHeight: '20px',
                color: palette.primary,
                mb: { xs: 2, md: 3.5 },
              }}
            >
              Наш менеджер свяжется с вами в течении 24 часов
            </Typography>

            {/* Message field */}
            <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
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
                Сообщение{' '}
                <Box component="span" sx={{ color: palette.cartBadge }}>
                  *
                </Box>
              </Typography>
              <InputBase
                multiline
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                sx={{
                  ...inputSx,
                  width: '100%',
                  alignItems: 'flex-start',
                  py: 1.5,
                  minHeight: { xs: 130, md: 140 },
                }}
              />
            </Box>

            {/* Email field */}
            <Box sx={{ mb: { xs: 2.5, md: 3.5 } }}>
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
                Email{' '}
                <Box component="span" sx={{ color: palette.cartBadge }}>
                  *
                </Box>
              </Typography>
              <InputBase
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{
                  ...inputSx,
                  width: '100%',
                  height: { xs: 35, md: 50 },
                }}
              />
            </Box>

            {/* Submit button */}
            <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}>
              <Button
                variant="contained"
                disabled={sending || !email || !message}
                onClick={handleSubmit}
                sx={{
                  bgcolor: palette.primary,
                  color: 'white',
                  borderRadius: '10px',
                  fontFamily: fontBody,
                  fontSize: 14,
                  fontWeight: 400,
                  textTransform: 'none',
                  px: 5,
                  py: '15px',
                  '&:hover': { bgcolor: '#2a3d85' },
                }}
              >
                {sending ? 'Отправка...' : 'Отправить'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Legal Info ── */}
      <Box
        sx={{
          maxWidth: 1300,
          mx: 'auto',
          px: { xs: 5, md: 2 },
          mt: { xs: 8, md: 6 },
          mb: { xs: 4, md: 7 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 0 },
        }}
      >
        {/* Left legal block */}
        <Box sx={{ width: { md: 494 }, flexShrink: 0 }}>
          <Typography
            sx={{
              fontFamily: fontMain,
              fontWeight: 300,
              fontSize: { xs: 10, md: 14 },
              lineHeight: '14px',
              color: palette.primary,
            }}
          ></Typography>
        </Box>

        {/* Right legal block */}
        <Box sx={{ width: { md: 365 } }}>
          <Typography
            sx={{
              fontFamily: fontMain,
              fontWeight: 300,
              fontSize: { xs: 10, md: 14 },
              lineHeight: '14px',
              color: palette.primary,
            }}
          >
            Юридический адрес: 108801, г. Москва, пос. Сосенское,
            <br />
            п. Коммунарка, ул. Александры Монаховой, д. 88, c. 2, кв 366
            <br />
            Расчётный счёт: 40802810638000019658
            <br />
            Наименование банка: ПАО Сбербанк
            <br />
            Корреспондентский счет: 30101810400000000225
          </Typography>
        </Box>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.ok ? 'success' : 'error'} variant="filled">
          {snack.ok
            ? 'Сообщение отправлено! Мы свяжемся с вами.'
            : 'Ошибка отправки. Попробуйте позже.'}
        </Alert>
      </Snackbar>
    </Box>
  );
}
