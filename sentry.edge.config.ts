import * as Sentry from '@sentry/nextjs';
import { makeSentryInitOptions } from './src/lib/sentryInitOptions';

Sentry.init({
  // FBG-406: env-гейт (dsn/enabled/environment) вынесен в тестируемую фабрику.
  // SENTRY_DISABLED=1 (рантайм, НЕ NEXT_PUBLIC_) глушит телеметрию при запуске
  // прод-артефакта вне прода. Прямые process.env.X — чтобы Next инлайнил как раньше.
  ...makeSentryInitOptions({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_STOREFRONT_SENTRY_DSN: process.env.NEXT_PUBLIC_STOREFRONT_SENTRY_DSN,
    SENTRY_DISABLED: process.env.SENTRY_DISABLED,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
  }),

  tracesSampleRate: 0.1,

  debug: false,
});
