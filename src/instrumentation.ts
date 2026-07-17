/**
 * Next 15 instrumentation hook (FBG-359).
 *
 * On Next 15 the legacy `sentry.server.config.ts` / `sentry.edge.config.ts`
 * files are NOT auto-loaded anymore — Sentry initialisation for the server and
 * edge runtimes has to be wired through this `register()` entrypoint, importing
 * the right config by `NEXT_RUNTIME`. The client runtime keeps loading via the
 * Sentry build plugin (sentry.client.config.ts), so it is not handled here.
 *
 * `onRequestError` forwards App Router server-render/RSC errors to Sentry
 * (the Next 15 `onRequestError` hook), which legacy config alone can't capture.
 */
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
