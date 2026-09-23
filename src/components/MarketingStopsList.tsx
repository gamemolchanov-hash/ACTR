import { Box, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { palette } from '@/lib/theme';

const fontBody = '"Open Sans", Helvetica, sans-serif';

/**
 * What stops arriving after an email opt-out and what keeps coming — shared by
 * the one-click unsubscribe page and the email switch in «İletişim Tercihleri»
 * (owner, 23.09.2026: tell the shopper which letters will stop).
 */
export default function MarketingStopsList({
  compact = false,
  ifOff = false,
}: {
  compact?: boolean;
  /** Heading phrased as a consequence («if you turn email off…») for the account switch. */
  ifOff?: boolean;
}) {
  const t = useTranslations('unsubscribe');
  const text = {
    fontFamily: fontBody,
    fontSize: compact ? { xs: 12, md: 13 } : { xs: 14, md: 15 },
    color: compact ? palette.primaryLight : palette.primary,
    lineHeight: 1.55,
  };
  return (
    <Box data-testid="sf-marketing-stops">
      <Typography sx={{ ...text, fontWeight: 600, mb: 0.5 }}>
        {t(ifOff ? 'stopsHeadingIfOff' : 'stopsHeading')}
      </Typography>
      <Box component="ul" sx={{ m: 0, mb: 1, pl: 2.5 }}>
        <Typography component="li" sx={text}>
          {t('stopsCreatorClub')}
        </Typography>
        <Typography component="li" sx={text}>
          {t('stopsPromo')}
        </Typography>
      </Box>
      <Typography sx={{ ...text, color: palette.primaryLight }}>{t('keeps')}</Typography>
    </Box>
  );
}
