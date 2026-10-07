import { useSyncExternalStore } from 'react';

const noSubscribe = () => () => {};

/**
 * `false` on the server and throughout the hydration render of the *calling*
 * component, `true` from its first client-only render on.
 *
 * `getServerSnapshot` is what React uses both when rendering the HTML and when
 * hydrating it, and the check that flips to `getSnapshot` runs per fiber, right
 * after that fiber's subtree commits (FBG-472). Needed wherever the first client
 * render depends on localStorage (the shopper token → `useAuth().loading`) that
 * the server cannot know — otherwise React #418 (ported from ACRU, FBG-715).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}
