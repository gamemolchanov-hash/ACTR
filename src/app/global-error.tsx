'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { isChunkLoadError, recoverFromChunkError } from '@/lib/chunkReload';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Транзиентный stale-chunk после редеплоя: один раз за сессию перезагружаемся
    // (свежий HTML тянет актуальные чанки) и не шумим в Sentry. Если перезагрузка уже
    // была — это реальный 404 (сломанный деплой): репортим и показываем UI.
    if (isChunkLoadError(error) && recoverFromChunkError()) {
      return;
    }
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
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
            <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>Произошла критическая ошибка</h2>
            <p style={{ margin: '0 0 24px', color: '#666', fontSize: '14px' }}>
              Приложение столкнулось с непредвиденной ошибкой. Попробуйте перезагрузить страницу.
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
              Попробовать снова
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
