import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { CartProvider } from '@/providers/CartProvider';
import { AuthProvider } from '@/lib/auth-context';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

const SITE_DESCRIPTION =
  'Каталог профессиональных гель-лаков и покрытий American Creator. Сертифицированная продукция для nail-мастеров.';

export const metadata: Metadata = {
  // Absolute base for canonical / OG / Twitter URLs (FBG-67).
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — профессиональные гель-лаки`,
    // Child pages set just their own title; the suffix is appended here.
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'ru_RU',
    title: `${SITE_NAME} — профессиональные гель-лаки`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link href="https://fonts.cdnfonts.com/css/futura-pt" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, overflowX: 'hidden' }}>
        <AppRouterCacheProvider>
          <ThemeProvider>
            <QueryProvider>
              <AuthProvider>
                <CartProvider>
                  <Suspense>
                    <Header />
                  </Suspense>
                  <main style={{ minHeight: 'calc(100vh - 400px)' }}>{children}</main>
                  <Footer />
                </CartProvider>
              </AuthProvider>
            </QueryProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
