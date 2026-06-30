'use client';

/**
 * Reset-password redirect shim (AUTH-03 / Pitfall 3)
 *
 * ARM BFF generates reset-link emails as:
 *   ${ARM_STOREFRONT_URL}/reset-password?token=<token>
 *
 * ACTR's actual reset page lives at /login/reset-password, not /reset-password.
 * This shim transparently redirects, preserving the token query param.
 */

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordRedirectInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    router.replace(`/login/reset-password${token ? `?token=${encodeURIComponent(token)}` : ''}`);
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
