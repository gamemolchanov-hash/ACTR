'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchLoyaltyConfig } from '@/lib/loyalty';

/**
 * Live Creator Club programme for the storefront chrome (FBG-469).
 *
 * The header/footer links used to read the programme from the locale layout,
 * i.e. from `getStorefrontConfig()` — which is cached for 5 minutes because it
 * runs on every route. That made the links lag the ARM switch by up to that
 * window in BOTH directions: a switched-off programme kept being advertised, and
 * a launch stayed invisible (FBG-469 review). The layout cannot read it fresh
 * either: an uncached fetch there would opt every statically rendered route out
 * of static rendering.
 *
 * So the chrome asks the storefront itself, once per page load, through the
 * uncached `/api/storefront/config` proxy. Until it answers — and if it fails —
 * `program` stays null and every Creator Club link stays hidden: an unproven
 * programme is never advertised (fail-closed). The routes themselves are gated
 * server-side (`getLoyaltyProgram()`), so a link is never the security boundary.
 */
const LoyaltyProgramContext = createContext<string | null>(null);

export function LoyaltyProgramProvider({ children }: { children: ReactNode }) {
  const [program, setProgram] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLoyaltyConfig()
      .then((cfg) => {
        if (!cancelled) setProgram(cfg.program);
      })
      // Unknown → links stay hidden; the next page load asks again.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LoyaltyProgramContext.Provider value={program}>{children}</LoyaltyProgramContext.Provider>
  );
}

/** Active programme code, or null while unknown (loading / unreachable /config). */
export function useLoyaltyProgram(): string | null {
  return useContext(LoyaltyProgramContext);
}
