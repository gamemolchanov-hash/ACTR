import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { CartProvider } from '@/providers/CartProvider';
import { AuthProvider } from '@/lib/auth-context';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { GeoLocaleInit } from '@/components/GeoLocaleInit';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { routing } from '@/i18n/routing';

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

  return (
    <html lang={locale}>
      <head>
        <link href="https://fonts.cdnfonts.com/css/futura-pt" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, overflowX: 'hidden' }}>
        <AppRouterCacheProvider>
          <ThemeProvider>
            <NextIntlClientProvider>
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
            </NextIntlClientProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
