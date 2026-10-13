'use client';

/**
 * Creator Club «Activate a code» (13.10.2026): the member enters an XP bonus code
 * created in the Portal for this storefront and gets its XP once
 * (`POST /auth/me/loyalty/xp-code`). Input and button as the basket promo field;
 * on success the page re-reads the profile and the history (`onActivated`).
 */

import { useState } from 'react';
import { Box, CircularProgress, InputBase, Typography } from '@mui/material';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { palette } from '@/lib/theme';
import { useFormatLocale } from '@/providers/CurrencyProvider';
import { activateXpCode, xpCodeErrorOf, type XpCodeActivation } from '@/lib/loyalty';

const fontMain = 'LiraFix, "Jost", "Jost Fallback", Helvetica, sans-serif';
const fontBody = '"Open Sans", Helvetica, sans-serif';
const ERROR = '#d32f2f';
const SUCCESS = '#2e7d32';

export default function XpCodeForm({
  onActivated,
}: {
  onActivated: (result: XpCodeActivation) => void;
}) {
  const t = useTranslations('loyalty');
  const formatLocale = useFormatLocale();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async () => {
    const value = code.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);
    setDone(null);
    try {
      const result = await activateXpCode(value);
      setDone(
        t('xpCode.success', {
          xp: new Intl.NumberFormat(formatLocale).format(result.xp),
          code: result.code,
        }),
      );
      setCode('');
      onActivated(result);
    } catch (err) {
      setError(t(`xpCode.errors.${xpCodeErrorOf(err)}`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box data-testid="sf-xp-code" sx={{ bgcolor: palette.bgLight, borderRadius: '20px', p: { xs: 2.5, md: 3 } }}>
      <Typography sx={{ fontFamily: fontMain, fontSize: 18, fontWeight: 500, color: palette.primary }}>
        {t('xpCode.title')}
      </Typography>
      <Typography sx={{ fontFamily: fontBody, fontSize: 13, color: palette.primaryLight, mt: 0.5, mb: 2 }}>
        {t('xpCode.hint')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <InputBase
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder={t('xpCode.placeholder')}
          disabled={loading}
          inputProps={{ 'aria-label': t('xpCode.title'), maxLength: 64, 'data-testid': 'sf-xp-code-input' }}
          sx={{
            bgcolor: '#fff',
            border: '0.5px solid',
            borderColor: error ? ERROR : palette.primary,
            borderRadius: '10px',
            px: 2,
            height: 50,
            flex: 1,
            maxWidth: 419,
            fontFamily: fontBody,
            color: palette.primary,
          }}
        />
        <Box
          component="button"
          type="button"
          onClick={submit}
          disabled={loading}
          aria-label={t('xpCode.submit')}
          data-testid="sf-xp-code-submit"
          sx={{
            width: 50,
            height: 50,
            bgcolor: loading ? palette.primaryLight : palette.primary,
            border: 'none',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: loading ? 'default' : 'pointer',
            flexShrink: 0,
          }}
        >
          {loading ? (
            <CircularProgress size={20} sx={{ color: 'white' }} />
          ) : (
            <ArrowForwardIcon sx={{ color: 'white', fontSize: 24 }} />
          )}
        </Box>
      </Box>
      {error && (
        <Typography role="alert" sx={{ fontFamily: fontBody, fontSize: 13, color: ERROR, mt: 0.75 }}>
          {error}
        </Typography>
      )}
      {done && (
        <Typography
          role="status"
          data-testid="sf-xp-code-success"
          sx={{ fontFamily: fontBody, fontSize: 13, color: SUCCESS, fontWeight: 600, mt: 0.75 }}
        >
          {done}
        </Typography>
      )}
    </Box>
  );
}
