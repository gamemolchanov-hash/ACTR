import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { SITE_URL } from '@/lib/seo';
import { getStorefrontConfig } from '@/lib/storefront-config';
import { CASHBACK_WALLET_PROGRAM } from '@/lib/loyalty';

/**
 * Launch gate + metadata for the public Creator Club page (FBG-469).
 *
 * The gate is enforced HERE, on the server: while the storefront runs anything
 * other than `cashback_wallet` a plain GET /rewards must answer with a redirect
 * to the home page — not a 200 with an empty body that only navigates away once
 * JS runs. Bots, curl and JS-less clients see the redirect too, and the route is
 * additionally marked noindex while the programme is dormant.
 *
 * The page itself is a client component (it needs the session for the member
 * view), so its title, description and hreflang alternates live here as well.
 */

// The gate depends on live backend state, so it must be evaluated per request:
// a build-time prerender would freeze today's dormant answer into the full-route
// cache and keep redirecting for up to `expire` after the owner launches the
// programme (and vice versa). `/config` itself stays fetch-cached (300s).
export const dynamic = 'force-dynamic';

async function isProgrammeLive(): Promise<boolean> {
  // Same already-cached /config call the locale layout makes — no extra request.
  const { loyaltyProgram } = await getStorefrontConfig();
  return loyaltyProgram === CASHBACK_WALLET_PROGRAM;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'rewards' });
  const live = await isProgrammeLive();

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

export default async function RewardsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // An unreadable /config leaves the programme unproven → treat it as dormant
  // (getStorefrontConfig never throws; it degrades to loyaltyProgram: null).
  if (!(await isProgrammeLive())) redirect({ href: '/', locale });

  return children;
}
