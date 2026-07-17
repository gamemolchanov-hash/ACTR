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

import { tenantId, ARM_STOREFRONT_BASE_PATH, LOCALE_TO_BCP47 } from '@/lib/arm-contract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BFF = (process.env.BFF_INTERNAL_URL || 'http://localhost:4000').replace(/\/+$/, '');
const ARM_BASE = `${BFF}${ARM_STOREFRONT_BASE_PATH}`;
const STOREFRONT_KEY = process.env.ARM_STOREFRONT_KEY || '';

// LOCALE_TO_BCP47 (единый контракт, arm-contract.ts): маппинг cookie-локали в BCP-47.
// BFF валидирует /^[a-z]{2}-[A-Z]{2}$/ — короткие en/tr молча игнорируются; переведённый
// контент даёт только полный код (D-08). Проксирует как фолбэк, когда клиент не передал
// ?lang явно (FBG-258 шлёт его для tr из URL-локали; здесь остаётся защита для en/legacy).

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  // Inject ?lang=<bcp47> ONLY on product-detail (path.length===2 && path[0]==='products').
  // The products list (/products) and all other endpoints must not receive ?lang.
  // Never overwrite an existing ?lang param (passthrough from client or test tooling).
  // Security: value comes from a fixed LOCALE_TO_BCP47 map, not from user input (T-04-05).
  const locale = req.cookies.get('NEXT_LOCALE')?.value || 'en';
  const bcp47 = LOCALE_TO_BCP47[locale] || 'en-US';
  const isProductDetail = path.length === 2 && path[0] === 'products';

  const url = new URL(req.url);
  if (isProductDetail && !url.searchParams.has('lang')) {
    url.searchParams.set('lang', bcp47);
  }

  const target = `${ARM_BASE}/${path.map(encodeURIComponent).join('/')}${url.search}`;

  const headers: Record<string, string> = { 'X-Tenant-ID': tenantId() };
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

// Next 15: route-handler context params are async — await before use.
type Ctx = { params: Promise<{ path: string[] }> };

export const GET = async (req: NextRequest, ctx: Ctx) => proxy(req, (await ctx.params).path);
export const POST = async (req: NextRequest, ctx: Ctx) => proxy(req, (await ctx.params).path);
export const PUT = async (req: NextRequest, ctx: Ctx) => proxy(req, (await ctx.params).path);
export const PATCH = async (req: NextRequest, ctx: Ctx) => proxy(req, (await ctx.params).path);
export const DELETE = async (req: NextRequest, ctx: Ctx) => proxy(req, (await ctx.params).path);
