import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'tr'],
  // Turkish market: TR is the default UI locale (FBG-425).
  //
  // FBG-428: visitors without a NEXT_LOCALE cookie must always land on /tr, never
  // on /en via Accept-Language (a ru,…,en header used to leak users onto /en).
  // localeDetection stays ON (the next-intl default) — with it OFF next-intl 4.13
  // stops consulting the NEXT_LOCALE cookie too (it gates BOTH cookie and header on
  // this one flag), which would break the "explicit choice → /en" contract and let
  // syncCookie overwrite a stored en cookie back to tr. Instead the Accept-Language
  // header is neutralized in middleware.ts, so only the cookie (an explicit choice)
  // can still yield /en on the bare root.
  defaultLocale: 'tr',
  localePrefix: 'always',
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
});
