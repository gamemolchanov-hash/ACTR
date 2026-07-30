import { redirect } from '@/i18n/navigation';
import { getLoyaltyProgram } from '@/lib/storefront-config';
import { CASHBACK_WALLET_PROGRAM } from '@/lib/loyalty';

/**
 * Server-side launch gate for the private Creator Club page (FBG-469 review).
 *
 * Same class of gate as /rewards: the dormant-programme check used to run only
 * in a `useEffect` after hydration, so a plain GET /account/loyalty answered 200
 * with an empty body. The programme state is public config, independent of the
 * session, so it can — and must — be decided on the server; the sign-in check
 * stays client-side (the token lives in localStorage).
 *
 * A failed `/config` is NOT a dormant answer — see the `available` check below.
 */

// Live backend state → evaluate per request instead of freezing the build-time
// answer into the full-route cache; `getLoyaltyProgram()` also skips the data
// cache, so the gate follows the ARM switch with no TTL (FBG-469 review).
export const dynamic = 'force-dynamic';

export default async function AccountLoyaltyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { program, available } = await getLoyaltyProgram();
  // Redirect only on a CONFIRMED other programme. An unreadable /config is
  // "unknown", not "off": bouncing the member here would also cut them off from
  // the page's own error/retry state (FBG-469 review).
  if (available && program !== CASHBACK_WALLET_PROGRAM) {
    redirect({ href: '/account', locale });
  }

  return children;
}
