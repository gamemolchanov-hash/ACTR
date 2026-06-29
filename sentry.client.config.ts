import * as Sentry from '@sentry/nextjs';
import { makeStorefrontBeforeSend } from './src/lib/sentryBeforeSend';
import { installChunkErrorRecovery } from './src/lib/chunkReload';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_STOREFRONT_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production' && !!process.env.NEXT_PUBLIC_STOREFRONT_SENTRY_DSN,

  tracesSampleRate: 0.1,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  debug: false,

  // Логика хука вынесена в тестируемую фабрику (FBG-138); breadcrumb инжектится.
  beforeSend: makeStorefrontBeforeSend((breadcrumb) => Sentry.addBreadcrumb(breadcrumb)),
});

// FBG-139: глобальный recovery при stale-chunk — срабатывает даже когда чанк границы ошибки
// сам 404 (граница не монтируется). Регистрируем ПОСЛЕ Sentry.init, чтобы его глобальный
// хендлер увидел транзиент первым и приглушил его по beforeSend до перезагрузки.
if (typeof window !== 'undefined') {
  installChunkErrorRecovery();
}
