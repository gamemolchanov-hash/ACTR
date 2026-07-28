import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

/**
 * FBG-428: neutralize Accept-Language before next-intl resolves the locale.
 *
 * next-intl 4.13 gates BOTH the NEXT_LOCALE cookie and the Accept-Language header
 * behind a single `localeDetection` flag, so turning detection off to stop the
 * Accept-Language leak (ru,…,en → /en) would also stop the cookie from being read
 * — breaking "explicit choice → /en" and letting syncCookie overwrite a stored en
 * cookie back to tr. Stripping the header keeps detection on: the cookie (Prio 2)
 * still yields /en, while the now-empty Accept-Language (Prio 3) always resolves to
 * the default locale (tr). Cookie-less visitors therefore land on /tr regardless of
 * their browser language; English stays reachable via the switcher/cookie or a
 * direct /en/* link.
 */
export default function middleware(request: NextRequest): ReturnType<typeof handleI18nRouting> {
  request.headers.delete('accept-language');
  const response = handleI18nRouting(request);
  stripLocaleSetCookie(response);
  return response;
}

/**
 * FBG-395 (KVKK): NEXT_LOCALE is a *functional* (optional) cookie, so it must not
 * be written without the visitor's İşlevsel consent. next-intl otherwise syncs it
 * via Set-Cookie on nearly every request; strip that header here so the only
 * writer is the consent-gated client path (persistLocalePreference). Reading the
 * cookie is untouched, so an explicit /en choice still resolves (FBG-428).
 */
function stripLocaleSetCookie(response: ReturnType<typeof handleI18nRouting>): void {
  const setCookies = response.headers.getSetCookie();
  if (setCookies.length === 0) return;
  const kept = setCookies.filter((cookie) => !/^NEXT_LOCALE=/i.test(cookie));
  if (kept.length === setCookies.length) return;
  response.headers.delete('set-cookie');
  for (const cookie of kept) response.headers.append('set-cookie', cookie);
}

export const config = {
  // Match all paths except: /api/*, /_next/*, /_vercel/*, /reset-password, files with extensions
  matcher: ['/((?!api|_next|_vercel|reset-password|.*\\..*).*)'],
};
