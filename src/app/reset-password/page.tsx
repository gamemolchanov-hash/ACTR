'use client';

/**
 * Reset-password redirect shim (AUTH-03 / Pitfall 3)
 *
 * ARM BFF generates reset-link emails as:
 *   ${ARM_STOREFRONT_URL}/reset-password?token=<token>
 *
 * ACTR's actual reset page lives at /[locale]/login/reset-password.
 * This shim stays OUTSIDE [locale] so ARM email links remain valid.
 * It reads the NEXT_LOCALE cookie to build the correct locale path.
 */

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordRedirectInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    // Read NEXT_LOCALE cookie; default to the site default 'tr' (FBG-425) when absent
    const localeCookie = document.cookie
      .split(';')
      .find((c) => c.trim().startsWith('NEXT_LOCALE='));
    const locale = localeCookie ? localeCookie.split('=')[1].trim() : 'tr';
    router.replace(
      `/${locale}/login/reset-password${token ? `?token=${encodeURIComponent(token)}` : ''}`,
    );
  }, [router, params]);

  return null; // renders nothing — immediate redirect
}

export default function ResetPasswordRedirect() {
  return (
    <Suspense>
      <ResetPasswordRedirectInner />
    </Suspense>
  );
}
