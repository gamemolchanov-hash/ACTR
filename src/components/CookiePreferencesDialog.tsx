'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Switch,
  Button,
  IconButton,
  Link as MuiLink,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { palette } from '@/lib/theme';
import { OPTIONAL_CATEGORIES, type OptionalSelection } from '@/lib/consent';
import { useConsent } from '@/providers/CookieConsentProvider';

const actionSx = {
  flex: { xs: '1 1 100%', sm: 1 },
  borderRadius: '10px',
  py: 1.1,
  fontSize: 15,
  fontWeight: 450,
  textTransform: 'none' as const,
};

function CategoryRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        py: 1.75,
        borderBottom: `1px solid ${palette.bgLight}`,
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 500, color: palette.primary }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 13, color: palette.primary, opacity: 0.75, mt: 0.25 }}>
          {description}
        </Typography>
      </Box>
      <Switch
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        inputProps={{ 'aria-label': title }}
      />
    </Box>
  );
}

export function CookiePreferencesDialog() {
  const t = useTranslations('cookieConsent');
  const { preferencesOpen, closePreferences, consent, acceptAll, rejectAll, savePreferences } =
    useConsent();
  const [selection, setSelection] = useState<OptionalSelection>({
    functional: false,
    analytics: false,
    marketing: false,
  });

  // Re-seed the toggles from the current saved decision every time the dialog
  // opens (footer entry → shows current values; no/expired consent → all off).
  useEffect(() => {
    if (!preferencesOpen) return;
    const cats = consent?.categories;
    setSelection({
      functional: cats?.functional ?? false,
      analytics: cats?.analytics ?? false,
      marketing: cats?.marketing ?? false,
    });
  }, [preferencesOpen, consent]);

  return (
    <Dialog
      open={preferencesOpen}
      onClose={closePreferences}
      PaperProps={{ sx: { maxWidth: 640, width: '100%', borderRadius: '20px', m: 2 } }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(51, 74, 159, 0.2)',
            backdropFilter: 'blur(2.5px)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: 22,
          fontWeight: 500,
          color: palette.primary,
          pr: 6,
        }}
      >
        {t('preferences.title')}
        <IconButton
          onClick={closePreferences}
          aria-label={t('preferences.close')}
          sx={{ position: 'absolute', top: 12, right: 12, color: palette.primary }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <CategoryRow
          title={t('categories.necessary.title')}
          description={t('categories.necessary.description')}
          checked
          disabled
        />
        {OPTIONAL_CATEGORIES.map((cat) => (
          <CategoryRow
            key={cat}
            title={t(`categories.${cat}.title`)}
            description={t(`categories.${cat}.description`)}
            checked={selection[cat]}
            onChange={(value) => setSelection((prev) => ({ ...prev, [cat]: value }))}
          />
        ))}

        <Typography sx={{ fontSize: 13, mt: 2 }}>
          <MuiLink
            component={Link}
            href="/legal/gizlilik"
            sx={{ color: palette.primary, textDecoration: 'underline', fontWeight: 500 }}
          >
            {t('policyLinkLabel')}
          </MuiLink>
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 1,
          gap: 1,
          flexWrap: 'wrap',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Button
          variant="contained"
          disableElevation
          onClick={() => savePreferences(selection)}
          sx={{
            ...actionSx,
            bgcolor: palette.primary,
            color: palette.white,
            '&:hover': { bgcolor: '#2a3d85' },
          }}
        >
          {t('actions.save')}
        </Button>
        <Button
          variant="outlined"
          onClick={rejectAll}
          sx={{
            ...actionSx,
            borderColor: palette.primary,
            color: palette.primary,
            '&:hover': { borderColor: palette.primary, bgcolor: palette.bgLight },
          }}
        >
          {t('actions.rejectAll')}
        </Button>
        <Button
          variant="outlined"
          onClick={acceptAll}
          sx={{
            ...actionSx,
            borderColor: palette.primary,
            color: palette.primary,
            '&:hover': { borderColor: palette.primary, bgcolor: palette.bgLight },
          }}
        >
          {t('actions.acceptAll')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
