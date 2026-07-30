/**
 * Pre-launch gate (FBG-416; env-переключаемый с 2026-07-30).
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
 * Toggle via `NEXT_PUBLIC_PRELAUNCH`:
 *   - unset / any other value → true  (safe default: заказы закрыты)
 *   - `false` or `0`          → false (магазин открыт)
 *
 * ВАЖНО: переменная BUILD-time — Next инлайнит `NEXT_PUBLIC_*` в бандлы при
 * сборке (страницы к тому же статически пререндерятся, generateStaticParams).
 * Локально: правь `.env.local` + перезапусти `npm run dev`. Прод: задай env на
 * этапе сборки и задеплой; смена env на сервере БЕЗ пересборки эффекта не даёт.
 */
const raw = process.env.NEXT_PUBLIC_PRELAUNCH;
export const PRELAUNCH = raw !== 'false' && raw !== '0';
