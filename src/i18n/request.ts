import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: 'Europe/Istanbul',
    // Defensive fallback: missing TR key → key string (not throw)
    getMessageFallback({ namespace, key }: { namespace?: string; key: string }) {
      return [namespace, key].filter(Boolean).join('.');
    },
    onError(error: Error) {
      // Suppress missing-translation warnings in production; log in dev
      if (process.env.NODE_ENV === 'development') {
        console.warn('[next-intl]', error.message);
      }
    },
  };
});
