'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, InputBase, Button, Snackbar, Alert } from '@mui/material';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLocale, useTranslations } from 'next-intl';

const fontMain = 'LiraFix, "Jost", "Jost Fallback", Helvetica, sans-serif';
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

// Seller requisites under the form (BS-19): legal name, address (two lines),
// VKN / MERSİS, trade registry, KEP — values live in messages, labels per locale.
const LEGAL_LINES = [
  'legalLine1',
  'legalLine2',
  'legalLine3',
  'legalLine4',
  'legalLine5',
  'legalLine6',
] as const;

export default function ContactsPage() {
  const t = useTranslations('contacts');
  const locale = useLocale();
  const { customer } = useAuth();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  // Signed-in buyer: prefill the e-mail from the profile once it is known; stays editable.
  useEffect(() => {
    if (customer?.email) setEmail((prev) => prev || customer.email);
  }, [customer]);
  const [sending, setSending] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; ok: boolean }>({ open: false, ok: true });

  const handleSubmit = async () => {
    if (!email.trim() || !message.trim()) return;
    setSending(true);
    try {
      // ARM `POST /contact` contract: name + email + message. The OMS-era
      // `{ email, comment, source }` got 400 on every submit (BS-15, 30.09.2026).
      // `locale` — the site language the buyer writes in: the letter to the
      // manager comes in it, so the answer goes back in the same language.
      await api.post('/contact', {
        name: customer?.name?.trim() || email.trim(),
        email: email.trim(),
        message: message.trim(),
        locale,
      });
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
            {t('breadcrumbHome')}
          </Link>
          {t('breadcrumbSep')}
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
          {t('title')}
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
            width: '100%',
          }}
        >
          {/* Left: hero image (desktop only) */}
          <Box
            component="img"
            src="/images/contacts/contact-hero.png"
            alt={t('heroImgAlt')}
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
              {t('formTitle')}
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
              {t('formSubtitle')}
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
                {t('fieldMessage')}{' '}
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
                {t('fieldEmail')}{' '}
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
                {sending ? t('sending') : t('submit')}
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
            {LEGAL_LINES.map((key, i) => (
              <span key={key}>
                {i > 0 && <br />}
                {t(key)}
              </span>
            ))}
          </Typography>
        </Box>
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
