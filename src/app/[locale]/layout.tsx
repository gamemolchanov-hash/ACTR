import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
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
        <link href="https://fonts.cdnfonts.com/css/futura-pt" rel="stylesheet" />
        {/* Futura PT's ₺ (U+20BA) glyph reads like a ruble. Define a tiny
            "LiraFix" family that maps ONLY the lira codepoint to a clean
            sans-serif (Arial/…), and place it FIRST in every price font stack
            (`LiraFix, "Futura PT", …`). Per-glyph fallback then uses Arial's ₺
            and Futura PT for all other characters — the reliable mechanism
            (same-family composition does NOT win over the CDN Futura face).
            dangerouslySetInnerHTML keeps React from escaping the quotes. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `@font-face{font-family:"LiraFix";src:local("Arial"),local("Liberation Sans"),local("Helvetica Neue"),local("Tahoma"),local("Verdana");unicode-range:U+20BA;font-display:swap;}`,
          }}
        />
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
