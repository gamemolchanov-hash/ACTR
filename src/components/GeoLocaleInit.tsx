'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';

/**
 * GeoLocaleInit — client-side geo-based locale default (D-03).
 *
 * On first visit (no NEXT_LOCALE cookie), fetches /api/storefront/config.
 * If geo_country === 'TR' and the current locale is not 'tr', sets the
 * cookie and redirects to the TR version of the current page.
 *
 * Progressive enhancement: fetch errors are silently swallowed so the
 * page always renders even if the BFF is unavailable.
 *
 * T-04-03: router.replace uses locale-validated next-intl navigation;
 * pathname comes from usePathname(), not from user input.
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
          // Set cookie first so middleware picks it up on subsequent requests
          document.cookie =
            'NEXT_LOCALE=tr;path=/;max-age=' + 365 * 24 * 3600 + ';SameSite=Lax';
          router.replace(pathname, { locale: 'tr' });
        }
      })
      .catch(() => {
        // Silently ignore — stay on default locale (progressive enhancement)
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
