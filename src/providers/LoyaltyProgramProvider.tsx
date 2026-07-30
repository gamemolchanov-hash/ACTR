'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from '@/i18n/navigation';
import { fetchLoyaltyConfig } from '@/lib/loyalty';

/**
 * Live Creator Club programme for the storefront chrome (FBG-469).
 *
 * The header/footer links used to read the programme from the locale layout,
 * i.e. from `getStorefrontConfig()` — which is cached for 5 minutes because it
 * runs on every route. That made the links lag the ARM switch by up to that
 * window in BOTH directions: a switched-off programme kept being advertised, and
 * a launch stayed invisible. The layout cannot read it fresh either: an uncached
 * fetch there would opt every statically rendered route out of static rendering.
 *
 * So the chrome asks the storefront itself, through the uncached
 * `/api/storefront/config` proxy. This provider lives in the persistent locale
 * layout and therefore NEVER remounts, so a single mount-time fetch would pin
 * the answer for the whole SPA session (FBG-469 review). It re-reads instead:
 *
 *  - on every client navigation (the pathname changes), and
 *  - when the tab comes back to the foreground (focus / visibilitychange),
 *
 * throttled to at most one request per `REVALIDATE_AFTER_MS`, so browsing the
 * catalogue does not fire a `/config` call per click. Staleness is therefore
 * bounded by the visitor's own next interaction, not by the session length.
 *
 * While the answer is unknown — before the first response, and after a failed
 * one — `program` is null and every Creator Club link stays hidden: an unproven
 * programme is never advertised (fail-closed), and the next navigation retries.
 * The routes themselves are gated server-side (`getLoyaltyProgram()`), so a link
 * is never the security boundary.
 */
const LoyaltyProgramContext = createContext<string | null>(null);

/** Minimum gap between two `/config` reads triggered by the same visitor. */
const REVALIDATE_AFTER_MS = 30_000;

export function LoyaltyProgramProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [program, setProgram] = useState<string | null>(null);
  // Refs (not state): these drive the fetch, never the rendered output.
  const inFlight = useRef(false);
  const lastReadAt = useRef(0);

  const revalidate = useCallback(() => {
    if (inFlight.current) return;
    if (lastReadAt.current && Date.now() - lastReadAt.current < REVALIDATE_AFTER_MS) return;
    inFlight.current = true;
    fetchLoyaltyConfig()
      .then((cfg) => {
        lastReadAt.current = Date.now();
        setProgram(cfg.program);
      })
      // A failure is "unknown", never "still whatever we saw last": drop back to
      // hidden links and let the next navigation ask again.
      .catch(() => setProgram(null))
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  // First render + every client navigation.
  useEffect(() => {
    revalidate();
  }, [pathname, revalidate]);

  // Returning to a tab that sat in the background across an ARM switch.
  useEffect(() => {
    const onForeground = () => {
      if (document.visibilityState === 'visible') revalidate();
    };
    document.addEventListener('visibilitychange', onForeground);
    window.addEventListener('focus', onForeground);
    return () => {
      document.removeEventListener('visibilitychange', onForeground);
      window.removeEventListener('focus', onForeground);
    };
  }, [revalidate]);

  return (
    <LoyaltyProgramContext.Provider value={program}>{children}</LoyaltyProgramContext.Provider>
  );
}

/** Active programme code, or null while unknown (loading / unreachable /config). */
export function useLoyaltyProgram(): string | null {
  return useContext(LoyaltyProgramContext);
}
