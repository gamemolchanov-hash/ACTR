/**
 * Own ARM analytics (nav.js, 02.10.2026): shop events for the cookieless visit
 * collector. The tracker script itself is loaded by <ArmNavScript /> in the root
 * layout; calls made before it loads are queued in `armTrack.q` and replayed by
 * it. Never throws into the caller — analytics must not break the shop.
 *
 *   view_item      { product, name, value, currency }
 *   add_to_cart    { product, qty }
 *   begin_checkout { qty }
 *   purchase       { order }  — the order number; the BFF takes the amount from the order
 */

type ArmTrackProps = Record<string, string | number>;
type ArmTrackFn = ((type: string, props?: ArmTrackProps) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    armTrack?: ArmTrackFn;
  }
}

/** Queue cap while the script is not (yet) loaded — e.g. no analytics consent. */
const MAX_QUEUED = 50;

export function armTrack(type: string, props?: ArmTrackProps): void {
  if (typeof window === 'undefined') return;
  try {
    if (!window.armTrack) {
      const stub: ArmTrackFn = (...args: unknown[]) => {
        const q = (stub.q = stub.q || []);
        if (q.length < MAX_QUEUED) q.push(args);
      };
      window.armTrack = stub;
    }
    window.armTrack(type, props);
  } catch {
    /* tracking must never surface to the shopper */
  }
}
