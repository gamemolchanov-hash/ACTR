import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SITE_URL } from '@/lib/seo';
import { getStorefrontConfig } from '@/lib/storefront-config';
import { CASHBACK_WALLET_PROGRAM } from '@/lib/loyalty';

/**
 * Metadata wrapper for the public Creator Club page (FBG-469).
 *
 * The page itself is a client component (it needs the session), so its title,
 * description and hreflang alternates live here. Crucially this is also where
 * the launch gate reaches robots: while the storefront runs anything other than
 * `cashback_wallet` the route only redirects home, so it must not be indexed —
 * an unlaunched programme should leave no trace in search results either.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'rewards' });
  // Same already-cached /config call the locale layout makes — no extra request.
  const { loyaltyProgram } = await getStorefrontConfig();
  const live = loyaltyProgram === CASHBACK_WALLET_PROGRAM;

  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
    alternates: {
      canonical: `${SITE_URL}/${locale}/rewards`,
      languages: {
        en: `${SITE_URL}/en/rewards`,
        tr: `${SITE_URL}/tr/rewards`,
      },
    },
    robots: live ? undefined : { index: false, follow: false },
  };
}

export default function RewardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
