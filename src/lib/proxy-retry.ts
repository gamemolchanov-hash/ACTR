/**
 * Retry for the browser proxy `/api/storefront/*` (FBG-766).
 *
 * The SSR fetchers have replayed transport blips since FBG-609 (`server-api.ts`);
 * the proxy that serves the browser did not, so every blip reached the page as a
 * «fetch failed». 29.09–28.10.2026 that was ~3 a day on american-creator.tr, and
 * the .ru storefront showed the same at other moments: this server could not open
 * a connection to the API edge (every address timed out) or the edge reset a
 * pooled connection. The policy is the FBG-609 one, with two limits of a proxy:
 *   - GET/HEAD are replayed on any network failure and on 502/503/504/522/524;
 *     other methods only when the connection was never established — the request
 *     did not leave this server, so a replay cannot create a second order;
 *   - no new attempt once the request is 10 s old: an attempt that hung until
 *     undici's own 10 s connect timeout, or a gateway timeout, is not worth doubling.
 * Once the attempts are spent the last error or response goes back unchanged.
 */

import { RETRY_BACKOFF_MS, RETRYABLE_STATUSES, backoffMs, sleep, type RetryDelay } from './server-api';

/** No new attempt after this much time since the first one started. */
export const RETRY_BUDGET_MS = 10_000;

/** Codes of a fetch that failed before the request was sent: DNS, refused, unreachable, connect timeout. */
const CONNECT_ERROR_CODES = new Set([
  'UND_ERR_CONNECT_TIMEOUT',
  'ECONNREFUSED',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

interface NetCause {
  code?: string;
  syscall?: string;
  errors?: unknown;
}

/**
 * True when `fetch` gave up before the request left this server: Node could not
 * connect to any address of the host (an AggregateError of `connect` failures), or
 * DNS / connect itself failed. A reset or a timeout on an open connection is not
 * one — the upstream may already have the request.
 */
export function isConnectFailure(err: unknown): boolean {
  const cause = (err as { cause?: NetCause } | null | undefined)?.cause;
  if (!cause) return false;
  if (Array.isArray(cause.errors)) return true;
  if (cause.syscall === 'connect' || cause.syscall === 'getaddrinfo') return true;
  return CONNECT_ERROR_CODES.has(cause.code ?? '');
}

/**
 * `fetch` to the BFF under the proxy retry policy above.
 *
 * @param delay - backoff pause (test seam; a real `setTimeout` by default)
 * @param now   - clock (test seam for the 10 s budget)
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  delay: RetryDelay = sleep,
  now: () => number = Date.now,
): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const idempotent = method === 'GET' || method === 'HEAD';
  const path = new URL(url).pathname;
  const started = now();
  const mayRetry = (attempt: number) =>
    attempt < RETRY_BACKOFF_MS.length && now() - started < RETRY_BUDGET_MS;

  for (let attempt = 0; ; attempt++) {
    // A replay is marked for the BFF log, the same header FBG-609 sends.
    const headers =
      attempt === 0
        ? init.headers
        : { ...(init.headers as Record<string, string>), 'X-Retry-Attempt': String(attempt) };
    let res: Response;
    try {
      res = await fetch(url, { ...init, headers });
    } catch (err) {
      if (!mayRetry(attempt) || !(idempotent || isConnectFailure(err))) throw err;
      console.warn(
        `[storefront-proxy] retrying ${method} ${path} after a network failure (attempt ${attempt + 1})`,
      );
      await delay(backoffMs(attempt));
      continue;
    }
    if (!idempotent || !RETRYABLE_STATUSES.has(res.status) || !mayRetry(attempt)) return res;
    await res.body?.cancel().catch(() => undefined);
    console.warn(`[storefront-proxy] retrying ${method} ${path} after ${res.status} (attempt ${attempt + 1})`);
    await delay(backoffMs(attempt));
  }
}
