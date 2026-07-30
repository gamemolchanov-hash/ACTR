import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { SITE_URL } from '@/lib/seo';
import { getLoyaltyProgram } from '@/lib/storefront-config';
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
// programme (and vice versa). `getLoyaltyProgram()` skips the data cache too, so
// there is no TTL between the ARM switch and this route opening/closing.
export const dynamic = 'force-dynamic';

/**
 * Three states, deliberately NOT two: the programme is live, the storefront
 * confirmed another programme (→ close the route), or `/config` could not be
 * read at all. A failed read must never masquerade as "dormant" — that would
 * bounce shoppers off a live page during a BFF blip and put the page's own
 * error/retry out of reach (FBG-469 review).
 */
async function readProgramme(): Promise<'live' | 'dormant' | 'unknown'> {
  // Uncached read: the gate must follow the ARM switch immediately (FBG-469 review).
  const { program, available } = await getLoyaltyProgram();
  if (!available) return 'unknown';
  return program === CASHBACK_WALLET_PROGRAM ? 'live' : 'dormant';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'rewards' });
  // Anything but a confirmed live programme stays out of the index — an
  // unlaunched programme leaves no trace, and neither does an error page.
  const live = (await readProgramme()) === 'live';

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
  // Only a storefront that CONFIRMS another programme closes the route. When
  // /config is unreadable the page renders and handles it client-side (its own
  // fetch either succeeds, or shows the error + retry).
  if ((await readProgramme()) === 'dormant') redirect({ href: '/', locale });

  return children;
}
