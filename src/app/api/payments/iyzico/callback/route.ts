/**
 * iyzico Checkout Form → buyer return (22.09.2026).
 *
 * iyzico POSTs `token` (form-urlencoded) to this URL in the buyer's browser
 * after the hosted payment page; a GET with `?token=` is accepted too (a
 * reload of the landing). The token goes server-side to ARM
 * `POST /public/arm/storefront/payment/iyzico/callback` with the storefront
 * key (never in the client bundle); ARM re-reads the result from iyzico and
 * answers `{ status, orderId }`, which picks the page the buyer is sent to
 * (`redirectPathFor`). The response is always a 303 — the buyer never sees
 * JSON, and a bank-page «back» cannot re-POST into a page.
 */
import { NextResponse, type NextRequest } from 'next/server';

import { tenantId, ARM_STOREFRONT_BASE_PATH } from '@/lib/arm-contract';
import {
  isPlausibleToken,
  localeFromCookie,
  publicOrigin,
  redirectPathFor,
  type IyzicoCallbackStatus,
} from '@/lib/iyzico-return';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BFF = (process.env.BFF_INTERNAL_URL || 'http://localhost:4000').replace(/\/+$/, '');
const CALLBACK_TARGET = `${BFF}${ARM_STOREFRONT_BASE_PATH}/payment/iyzico/callback`;
const STOREFRONT_KEY = process.env.ARM_STOREFRONT_KEY || '';
const UPSTREAM_TIMEOUT_MS = 25_000;

async function readToken(req: NextRequest): Promise<string | null> {
  const fromQuery = req.nextUrl.searchParams.get('token');
  if (req.method === 'GET') return fromQuery;
  const contentType = req.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const body = (await req.json()) as { token?: unknown };
      return typeof body?.token === 'string' ? body.token : fromQuery;
    }
    const raw = await req.text();
    return new URLSearchParams(raw).get('token') || fromQuery;
  } catch {
    return fromQuery;
  }
}

async function handle(req: NextRequest): Promise<Response> {
  const locale = localeFromCookie(req.cookies.get('NEXT_LOCALE')?.value);
  const token = await readToken(req);
  const origin = publicOrigin(req.headers, req.nextUrl.origin);
  const redirect = (status: IyzicoCallbackStatus, orderId: string | null) =>
    NextResponse.redirect(new URL(redirectPathFor(status, orderId, locale), origin), 303);

  if (!isPlausibleToken(token)) return redirect('error', null);

  const headers: Record<string, string> = {
    'X-Tenant-ID': tenantId(),
    'Content-Type': 'application/json',
  };
  if (STOREFRONT_KEY) headers['X-Storefront-Key'] = STOREFRONT_KEY;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) headers['X-Forwarded-For'] = xff;

  try {
    const upstream = await fetch(CALLBACK_TARGET, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token: token.trim() }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const json = (await upstream.json().catch(() => null)) as {
      data?: { status?: IyzicoCallbackStatus; orderId?: string | null };
      code?: string;
    } | null;
    if (!upstream.ok || !json?.data?.status) {
      return redirect(upstream.status === 404 ? 'not_found' : 'error', null);
    }
    return redirect(json.data.status, json.data.orderId ?? null);
  } catch {
    return redirect('error', null);
  }
}

export const POST = (req: NextRequest) => handle(req);
export const GET = (req: NextRequest) => handle(req);
