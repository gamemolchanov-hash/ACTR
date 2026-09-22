/**
 * Verimor webhooks (İYS Push + SMS Webhook, 22.09.2026) — server-to-server
 * callbacks on OUR domain (american-creator.tr, Turkish origin like the shop
 * itself), relayed byte-for-byte to ARM
 * `POST /public/arm/iys/webhooks/verimor/<tenant>?token=…` together with the
 * `X-Verimor-Signature` HMAC header; ARM checks the distributor token / HMAC
 * and answers, and that answer (status + text) is relayed back so Verimor's
 * retry logic (3× every 5 min on non-2xx) sees ARM's verdict, not ours.
 * Same shape as the iyzico Merchant Notification relay (`../iyzico/route.ts`).
 */
import type { NextRequest } from 'next/server';

import { tenantId } from '@/lib/arm-contract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BFF = (process.env.BFF_INTERNAL_URL || 'http://localhost:4000').replace(/\/+$/, '');
const UPSTREAM_TIMEOUT_MS = 25_000;

export async function POST(req: NextRequest): Promise<Response> {
  const rawBody = await req.text();
  const headers: Record<string, string> = {
    'Content-Type': req.headers.get('content-type') || 'application/json',
  };
  // Every Verimor header travels verbatim (X-Verimor-Signature today).
  req.headers.forEach((value, name) => {
    if (name.toLowerCase().startsWith('x-verimor')) headers[name] = value;
  });
  const xff = req.headers.get('x-forwarded-for');
  if (xff) headers['X-Forwarded-For'] = xff;

  // The distributor webhook token lives in the query of the URL registered in
  // OİM — it is what ARM authenticates on, so it goes upstream unchanged.
  const token = req.nextUrl.searchParams.get('token') || '';
  const upstreamUrl =
    `${BFF}/public/arm/iys/webhooks/verimor/${encodeURIComponent(tenantId())}` +
    (token ? `?token=${encodeURIComponent(token)}` : '');

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: rawBody,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') || 'text/plain' },
    });
  } catch {
    // Verimor retries a non-2xx (3× every 5 min) — the right outcome for a BFF hiccup.
    return new Response('upstream unavailable', { status: 502 });
  }
}
