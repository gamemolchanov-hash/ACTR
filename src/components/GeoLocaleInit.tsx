'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import { persistLocalePreference } from '@/lib/consent';

/**
 * GeoLocaleInit — client-side geo-based locale default (D-03).
 *
 * On first visit (no NEXT_LOCALE cookie), fetches /api/storefront/config.
 * If geo_country === 'TR' and the current locale is not 'tr', redirects to the
 * TR version of the current page.
 *
 * FBG-395 (KVKK): NEXT_LOCALE is a functional (optional) cookie, so it is only
 * persisted through the consent-gated writer (persistLocalePreference) — a no-op
 * until İşlevsel consent is granted. Without persistence the geo default still
 * applies on each visit (the locale lives in the URL), it just isn't remembered.
 * The redirect uses the raw Next router with an explicit /tr prefix so next-intl's
 * client cookie sync (syncLocaleCookie) never writes NEXT_LOCALE behind the gate.
 *
 * Progressive enhancement: fetch errors are silently swallowed so the page always
 * renders even if the BFF is unavailable. The pathname comes from usePathname(),
 * not from user input.
 */
export function GeoLocaleInit({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // User already has a locale preference — respect it
    if (document.cookie.includes('NEXT_LOCALE=')) return;

    fetch('/api/storefront/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.geo_country === 'TR' && currentLocale !== 'tr') {
          // Remember the choice only if functional consent is granted (else a no-op).
          persistLocalePreference('tr');
          router.replace(`/tr${pathname === '/' ? '' : pathname}`);
        }
      })
      .catch(() => {
        // Silently ignore — stay on default locale (progressive enhancement)
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
