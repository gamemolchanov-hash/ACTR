import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

type NestedMessages = { [key: string]: string | NestedMessages };

/**
 * Convert our flat dotted message catalog ({ "nav.catalog": "..." }) into the
 * nested objects next-intl requires ({ nav: { catalog: "..." } }).
 *
 * The JSON files on disk stay flat (Tolgee-friendly source of truth); next-intl
 * categorically rejects keys containing "." (IntlError INVALID_KEY), so we
 * un-flatten at load time. All catalog values are leaf strings and the key set
 * has no prefix collisions, so this is lossless.
 */
function unflatten(flat: Record<string, string>): NestedMessages {
  const out: NestedMessages = {};
  for (const [flatKey, value] of Object.entries(flat)) {
    const parts = flatKey.split('.');
    let cursor: NestedMessages = out;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        cursor[part] = value;
      } else {
        if (typeof cursor[part] !== 'object' || cursor[part] === null) {
          cursor[part] = {};
        }
        cursor = cursor[part] as NestedMessages;
      }
    });
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const flatMessages = (await import(`../../messages/${locale}.json`))
    .default as Record<string, string>;

  return {
    locale,
    messages: unflatten(flatMessages),
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
