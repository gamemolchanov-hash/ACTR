import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_STOREFRONT_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production' && !!process.env.NEXT_PUBLIC_STOREFRONT_SENTRY_DSN,

  tracesSampleRate: 0.1,

  debug: false,
});
