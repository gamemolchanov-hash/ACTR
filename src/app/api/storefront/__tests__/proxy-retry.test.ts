/**
 * FBG-766 — the storefront proxy replays a GET whose connection to the BFF failed,
 * so a network blip no longer reaches the page as «fetch failed».
 * The policy itself is covered by `src/lib/proxy-retry.test.ts`.
 */
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Stub global fetch BEFORE importing the route so the module picks it up.
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// @ts-ignore — dynamic route directory with bracket name; valid FS path
import { GET } from '../[...path]/route';

describe('ARM storefront proxy — retry (FBG-766)', () => {
  it('answers 200 when the first connection to the BFF fails', async () => {
    mockFetch
      .mockRejectedValueOnce(
        new TypeError('fetch failed', {
          cause: Object.assign(new AggregateError([new Error('connect ETIMEDOUT')]), { code: 'ETIMEDOUT' }),
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    const res = await GET(new NextRequest('http://localhost:3000/api/storefront/categories'), {
      params: Promise.resolve({ path: ['categories'] }),
    });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
