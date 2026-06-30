'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { isChunkLoadError, recoverFromChunkError } from '@/lib/chunkReload';

/**
 * Global error boundary — last resort.
 *
 * This component renders its own <html> and may be invoked OUTSIDE the
 * NextIntlClientProvider on a root-level error. Using useTranslations() here
 * is unreliable because the provider may not be mounted. Per plan (04-04 Task 3):
 * use EN fallback strings directly. This satisfies I18N-01 (no Russian hardcode)
 * while keeping the emergency screen safe from broken provider dependencies.
 */
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

  return (
    <html lang="en">
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
            <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>A critical error occurred</h2>
            <p style={{ margin: '0 0 24px', color: '#666', fontSize: '14px' }}>
              The application encountered an unexpected error. Please reload the page.
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
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
