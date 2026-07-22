/**
 * Pre-launch gate (FBG-416).
 *
 * The storefront catalog is public, but ordering is not yet enabled while the
 * shop finishes its final preparations. While `PRELAUNCH` is on:
 *   - "Add to Cart" (catalog card + product page) does NOT add the item and
 *     shows a "store is getting ready" notice;
 *   - `/basket` shows the same notice instead of cart contents;
 *   - `/checkout` (even via a direct URL with items left in localStorage)
 *     shows the notice instead of the order form.
 *
 * All user-facing copy comes from the `prelaunch.*` i18n keys (EN/TR) — never
 * hardcoded in components.
 *
 * Client-safe module: NO `import 'server-only'`, so the `'use client'`
 * components (CartProvider, basket, checkout) can import it.
 *
 * To open the store for orders at launch, flip this single constant to `false`.
 */
export const PRELAUNCH = true;
