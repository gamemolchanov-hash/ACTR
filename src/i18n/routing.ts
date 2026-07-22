import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'tr'],
  // Turkish market: TR is the default UI locale (FBG-425). Accept-Language detection
  // is OFF (FBG-428) — every visitor without a NEXT_LOCALE cookie lands on /tr,
  // regardless of the browser's Accept-Language (a ru,…,en header used to leak users
  // onto /en). English is reached only by explicit choice: the language switcher or
  // an existing cookie, both of which next-intl still honours with detection disabled.
  defaultLocale: 'tr',
  localeDetection: false,
  localePrefix: 'always',
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
});
