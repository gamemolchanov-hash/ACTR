import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'tr'],
  // Turkish market: TR is the default UI locale (FBG-425). localeDetection stays
  // on, so a browser whose Accept-Language matches en still gets /en; the default
  // applies only when nothing matches (ru, de, …) or no header is sent (bots → /tr).
  defaultLocale: 'tr',
  localePrefix: 'always',
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
});
