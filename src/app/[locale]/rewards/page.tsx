/**
 * Public Creator Club page — the ACRU/ACSTORE landing ported to ACTR
 * (FBG-501/513 composition; ACRU is the owner's visual reference, 07.10.2026).
 *
 * Server Component: the programme is resolved on the server on every request,
 * and its rules arrive as a prop — nothing about the programme is hardcoded in
 * the view. The launch gate itself lives in `layout.tsx` (a confirmed dormant
 * programme redirects home before this runs); this page only backstops it.
 *
 *  - programme live            → the landing;
 *  - storefront confirms another programme → 404 (backstop of the layout redirect);
 *  - `/config` unreadable      → an error with a retry, never a 404 or redirect:
 *    a BFF blip must not bounce shoppers off a live page (FBG-469 review).
 */
import { notFound } from 'next/navigation';
import { getLoyaltyProgramPublic } from '@/lib/storefront-config';
import { CASHBACK_WALLET_PROGRAM } from '@/lib/loyalty';
import { parseRewardsProgram } from '@/lib/rewards';
import { RewardsUnavailable, RewardsView } from './RewardsView';

export const dynamic = 'force-dynamic';

export default async function RewardsPage() {
  const { program: raw, available } = await getLoyaltyProgramPublic();
  if (!available) return <RewardsUnavailable />;

  const program = parseRewardsProgram(raw);
  if (program.program !== CASHBACK_WALLET_PROGRAM) notFound();

  return <RewardsView program={program} />;
}
