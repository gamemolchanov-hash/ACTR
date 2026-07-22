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
  return handleI18nRouting(request);
}

export const config = {
  // Match all paths except: /api/*, /_next/*, /_vercel/*, /reset-password, files with extensions
  matcher: ['/((?!api|_next|_vercel|reset-password|.*\\..*).*)'],
};
