/**
 * iyzico Merchant Notification Url (22.09.2026) — server-to-server webhook on
 * OUR domain, relayed byte-for-byte to ARM `POST /public/arm/webhooks/iyzico/<tenant>`
 * together with the `X-IYZ-SIGNATURE-V3` header; ARM verifies the HMAC with the
 * storefront's secret and answers, and that answer (status + text) is relayed
 * back so iyzico's retry logic sees ARM's verdict, not ours.
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
  // Every iyzico header travels verbatim (V3 today; whatever they add next).
  // The first live sandbox delivery (22.09.2026) reached ARM with NO
  // signature header at all — so when none arrives, the header names are
  // logged to tell «iyzico did not send it» from «someone stripped it».
  let sawIyzHeader = false;
  req.headers.forEach((value, name) => {
    if (name.toLowerCase().startsWith('x-iyz')) {
      headers[name] = value;
      sawIyzHeader = true;
    }
  });
  if (!sawIyzHeader) {
    console.warn('[iyzico webhook] no x-iyz-* header; incoming header names:', [...req.headers.keys()].sort().join(','));
  }
  const xff = req.headers.get('x-forwarded-for');
  if (xff) headers['X-Forwarded-For'] = xff;

  try {
    const upstream = await fetch(`${BFF}/public/arm/webhooks/iyzico/${encodeURIComponent(tenantId())}`, {
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
    // iyzico retries a non-2xx after 15 min — the right outcome for a BFF hiccup.
    return new Response('upstream unavailable', { status: 502 });
  }
}
