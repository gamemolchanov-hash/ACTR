import * as Sentry from '@sentry/nextjs';
import { makeSentryInitOptions } from './src/lib/sentryInitOptions';
import { makeStorefrontBeforeSend } from './src/lib/sentryBeforeSend';
import { installChunkErrorRecovery } from './src/lib/chunkReload';

Sentry.init({
  // FBG-406: env-гейт (dsn/enabled/environment) вынесен в тестируемую фабрику.
  // ВНИМАНИЕ: в браузере не-NEXT_PUBLIC_ SENTRY_DISABLED недоступен → клиентский гейт снять
  // в рантайме нельзя (известное ограничение Next); профилактика шума нацелена на server/edge.
  ...makeSentryInitOptions({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_STOREFRONT_SENTRY_DSN: process.env.NEXT_PUBLIC_STOREFRONT_SENTRY_DSN,
    SENTRY_DISABLED: process.env.SENTRY_DISABLED,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
  }),

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
