'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { isChunkLoadError, recoverFromChunkError } from '@/lib/chunkReload';
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>{t('errorTitle')}</h2>
      <p style={{ margin: '0 0 24px', color: '#666', fontSize: '14px' }}>
        {t('errorDesc')}
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
        {t('retry')}
      </button>
    </div>
  );
}
