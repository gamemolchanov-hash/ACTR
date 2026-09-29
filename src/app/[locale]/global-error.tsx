'use client';

import { useEffect, useSyncExternalStore } from 'react';
import * as Sentry from '@sentry/nextjs';
import { isChunkLoadError, recoverFromChunkError } from '@/lib/chunkReload';
import en from '../../../messages/en.json';
import tr from '../../../messages/tr.json';

/**
 * Global error boundary — last resort.
 *
 * This component renders its own <html> and may be invoked OUTSIDE the
 * NextIntlClientProvider on a root-level error. Using useTranslations() here
 * is unreliable because the provider may not be mounted. So no next-intl here:
 * the locale comes from the URL (`/en…` → en, anything else — `/tr…`, bare root —
 * → tr, the default locale) and the three strings are read straight from the
 * statically imported messages/*.json (keys globalError.*, Tolgee #34).
 * Property access is literal so the bundler keeps only these keys.
 */
const COPY = {
  en: {
    title: en['globalError.title'],
    body: en['globalError.body'],
    retry: en['globalError.retry'],
  },
  tr: {
    title: tr['globalError.title'],
    body: tr['globalError.body'],
    retry: tr['globalError.retry'],
  },
};

type Locale = keyof typeof COPY;
const urlLocale = (): Locale => (/^\/en(\/|$)/.test(window.location.pathname) ? 'en' : 'tr');
// Server snapshot = default locale; on hydration React then re-renders with the
// URL locale instead of reporting a text mismatch.
const serverLocale = (): Locale => 'tr';
const noSubscribe = () => () => {};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Transient stale-chunk after redeploy: reload once per session
    // (fresh HTML fetches up-to-date chunks) without reporting to Sentry.
    // If reload already happened — this is a real error (broken deploy): report and show UI.
    if (isChunkLoadError(error) && recoverFromChunkError()) {
      return;
    }
    Sentry.captureException(error);
  }, [error]);

  const locale = useSyncExternalStore(noSubscribe, urlLocale, serverLocale);
  const copy = COPY[locale];

  return (
    <html lang={locale}>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '24px',
            backgroundColor: '#fafafa',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '32px',
              borderRadius: '8px',
              border: '1px solid #eee',
              backgroundColor: '#fff',
              textAlign: 'center',
            }}
          >
            <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>{copy.title}</h2>
            <p style={{ margin: '0 0 24px', color: '#666', fontSize: '14px' }}>
              {copy.body}
            </p>
            <button
              onClick={reset}
              style={{
                padding: '10px 24px',
                backgroundColor: '#111',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {copy.retry}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
