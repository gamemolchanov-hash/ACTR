import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
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

export const metadata: Metadata = {
  // Absolute base for canonical / OG / Twitter URLs.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — professional gel polishes`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    'Catalog of professional gel polishes and coatings. Certified products for nail professionals.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    title: `${SITE_NAME} — professional gel polishes`,
    description:
      'Catalog of professional gel polishes and coatings. Certified products for nail professionals.',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

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
