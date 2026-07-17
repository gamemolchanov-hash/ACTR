import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { CartProvider } from '@/providers/CartProvider';
import { CurrencyProvider } from '@/providers/CurrencyProvider';
import { AuthProvider } from '@/lib/auth-context';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { GeoLocaleInit } from '@/components/GeoLocaleInit';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { routing } from '@/i18n/routing';
import { getStorefrontConfig } from '@/lib/storefront-config';
import { formatLocaleFromCountry } from '@/lib/format-locale';
import { FONT_FACE_CSS, FUTURA_PRELOAD_HREF } from '@/lib/fonts';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Locale-aware root metadata (I18N-04).
 * Title/description come from `meta.*` translation keys so they are EN/TR.
 * alternates.languages provides hreflang for both locales.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const ogLocale = locale === 'tr' ? 'tr_TR' : 'en_US';

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('defaultTitle'),
      template: `%s — ${SITE_NAME}`,
    },
    description: t('siteDesc'),
    icons: {
      icon: '/favicon.ico',
    },
    alternates: {
      languages: {
        en: `${SITE_URL}/en`,
        tr: `${SITE_URL}/tr`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: ogLocale,
      title: t('defaultTitle'),
      description: t('siteDesc'),
    },
    twitter: {
      card: 'summary_large_image',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // T-04-01: Validate locale — hasLocale guards against URL injection
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const {
    currency,
    country,
    locale: configLocale,
  } = await getStorefrontConfig();
  const formatLocale = formatLocaleFromCountry(country, configLocale ?? undefined);

  return (
    <html lang={locale}>
      <head>
        {/* Self-hosted Futura PT (FBG-225) — replaces render-blocking fonts.cdnfonts.com.
            Preload the primary (Book) face; @font-face rules (incl. metric-adjusted
            fallback and the LiraFix ₺ family) live in FONT_FACE_CSS.
            dangerouslySetInnerHTML keeps React from escaping the quotes. */}
        <link
          rel="preload"
          href={FUTURA_PRELOAD_HREF}
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />
        <style dangerouslySetInnerHTML={{ __html: FONT_FACE_CSS }} />
      </head>
      <body style={{ margin: 0, overflowX: 'hidden' }}>
        <AppRouterCacheProvider>
          <ThemeProvider>
            <NextIntlClientProvider>
              <CurrencyProvider initialCurrency={currency} initialFormatLocale={formatLocale}>
                <QueryProvider>
                  <AuthProvider>
                    <CartProvider>
                      <GeoLocaleInit currentLocale={locale} />
                      <Suspense>
                        <Header />
                      </Suspense>
                      <main style={{ minHeight: 'calc(100vh - 400px)' }}>{children}</main>
                      <Footer />
                    </CartProvider>
                  </AuthProvider>
                </QueryProvider>
              </CurrencyProvider>
            </NextIntlClientProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
