/**
 * ARM storefront proxy (Phase 1).
 *
 * Проксирует `/api/storefront/*` → `${BFF}/public/arm/storefront/*`, инъектируя
 * server-side `X-Tenant-ID` и `X-Storefront-Key` (ключ НЕ уходит в клиентский бандл —
 * берётся из не-NEXT_PUBLIC env и исполняется только на сервере). Прокидывает
 * `X-Currency`, `Authorization`, `Content-Type` из входящего запроса.
 *
 * Заменяет прежний next.config rewrite на OMS (`/public/oms/storefront/*`).
 * Картинки идут тем же путём: `/api/storefront/images/:tenantId/*` (ARM-эндпоинт публичен).
 */
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BFF = (process.env.BFF_INTERNAL_URL || 'http://localhost:4000').replace(/\/+$/, '');
const ARM_BASE = `${BFF}/public/arm/storefront`;
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'demo-tenant';
const STOREFRONT_KEY = process.env.ARM_STOREFRONT_KEY || '';

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const target = `${ARM_BASE}/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;

  const headers: Record<string, string> = { 'X-Tenant-ID': TENANT_ID };
  if (STOREFRONT_KEY) headers['X-Storefront-Key'] = STOREFRONT_KEY;
  const currency = req.headers.get('x-currency');
  if (currency) headers['X-Currency'] = currency;
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  const contentType = req.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  const upstream = await fetch(target, init);
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      // отдаём кеш-заголовки апстрима (картинки/каталог), если есть
      ...(upstream.headers.get('cache-control')
        ? { 'cache-control': upstream.headers.get('cache-control') as string }
        : {}),
    },
  });
}

type Ctx = { params: { path: string[] } };

export const GET = (req: NextRequest, ctx: Ctx) => proxy(req, ctx.params.path);
export const POST = (req: NextRequest, ctx: Ctx) => proxy(req, ctx.params.path);
export const PUT = (req: NextRequest, ctx: Ctx) => proxy(req, ctx.params.path);
export const PATCH = (req: NextRequest, ctx: Ctx) => proxy(req, ctx.params.path);
export const DELETE = (req: NextRequest, ctx: Ctx) => proxy(req, ctx.params.path);
