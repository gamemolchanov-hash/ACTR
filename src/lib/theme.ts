'use client';

import { createTheme } from '@mui/material/styles';
// palette lives in a non-'use client' module so server components can import it
// too; re-exported below to keep existing `@/lib/theme` importers working.
import { palette } from './palette';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: palette.primary,
      light: palette.primaryLight,
    },
    background: {
      default: palette.white,
      paper: palette.bgLight,
    },
  },
  typography: {
    fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica, sans-serif',
    h1: {
      fontWeight: 450,
      fontSize: '40px',
      lineHeight: '50px',
      textTransform: 'uppercase',
      color: palette.primary,
    },
    h2: {
      fontWeight: 450,
      fontSize: '24px',
      lineHeight: '31px',
      textTransform: 'uppercase',
      color: palette.primary,
    },
    h3: {
      fontWeight: 500,
      fontSize: '20px',
      lineHeight: '26px',
      textTransform: 'uppercase',
      color: palette.primary,
    },
    body1: {
      fontWeight: 400,
      fontSize: '18px',
      lineHeight: '23px',
      color: palette.primary,
    },
    body2: {
      fontWeight: 400,
      fontSize: '14px',
      lineHeight: '18px',
      color: palette.primary,
    },
    caption: {
      fontFamily: '"Open Sans", sans-serif',
      fontWeight: 400,
      fontSize: '13px',
      lineHeight: '18px',
      color: palette.primaryLight,
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", "Jost", sans-serif',
          fontWeight: 450,
          fontSize: '18px',
          padding: '12px 20px',
        },
        containedPrimary: {
          backgroundColor: palette.primary,
          color: palette.white,
          '&:hover': {
            backgroundColor: '#2a3d85',
          },
        },
        outlinedPrimary: {
          borderColor: palette.primary,
          color: palette.primary,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: `1px solid ${palette.primaryLight}`,
          boxShadow: 'none',
          backgroundColor: palette.white,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 40,
          fontFamily: 'LiraFix, "Futura PT", "Futura PT Fallback", "Jost", sans-serif',
          fontWeight: 450,
          fontSize: '14px',
        },
      },
    },
  },
});

export { theme, palette };
