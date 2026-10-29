/**
 * FBG-766 — retry of the browser proxy `/api/storefront/*`.
 *
 * GET/HEAD replay any network failure and 502/503/504/522/524; other methods only
 * a failure to connect (the request never left the server, so no second order);
 * no new attempt after 10 s. Every test injects an instant `delay`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchWithRetry, isConnectFailure, RETRY_BUDGET_MS } from './proxy-retry';

afterEach(() => {
  vi.unstubAllGlobals();
});

const URL_ = 'https://api.example.test/public/arm/storefront/products';

/** What undici throws when Node could not connect to any address of the host (prod, 28.10.2026). */
const connectFailure = () =>
  new TypeError('fetch failed', {
    cause: Object.assign(new AggregateError([new Error('connect ETIMEDOUT 104.21.16.19:443')]), {
      code: 'ETIMEDOUT',
    }),
  });

/** A pooled connection reset by the edge — the request may have reached the upstream. */
const resetFailure = () =>
  new TypeError('fetch failed', {
    cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET', syscall: 'read' }),
  });

function recordingDelay(): { waits: number[]; delay: (ms: number) => Promise<void> } {
  const waits: number[] = [];
  return { waits, delay: async (ms: number) => void waits.push(ms) };
}

const ok = () => new Response('{"data":[]}', { status: 200 });

describe('isConnectFailure', () => {
  it('knows a failure to connect from a failure on an open connection', () => {
    expect(isConnectFailure(connectFailure())).toBe(true);
    expect(
      isConnectFailure(
        new TypeError('fetch failed', {
          cause: Object.assign(new Error('Connect Timeout Error'), { code: 'UND_ERR_CONNECT_TIMEOUT' }),
        }),
      ),
    ).toBe(true);
    expect(isConnectFailure(resetFailure())).toBe(false);
    expect(isConnectFailure(new Error('no cause'))).toBe(false);
  });
});

describe('fetchWithRetry', () => {
  it('replays a GET after a failure to connect, marking the replay', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(connectFailure()).mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', fetchMock);
    const { waits, delay } = recordingDelay();

    const res = await fetchWithRetry(URL_, { method: 'GET', headers: { 'X-Tenant-ID': 't' } }, delay);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, retryInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(retryInit.headers).toEqual({ 'X-Tenant-ID': 't', 'X-Retry-Attempt': '1' });
    expect(waits).toHaveLength(1);
    expect(waits[0]).toBeGreaterThanOrEqual(300);
    expect(waits[0]).toBeLessThanOrEqual(375);
  });

  it('replays a GET after a reset of a pooled connection', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(resetFailure()).mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchWithRetry(URL_, { method: 'GET', headers: {} }, recordingDelay().delay);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after three attempts and rethrows the last failure', async () => {
    const last = connectFailure();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(connectFailure())
      .mockRejectedValueOnce(connectFailure())
      .mockRejectedValueOnce(last);
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithRetry(URL_, { method: 'GET', headers: {} }, recordingDelay().delay)).rejects.toBe(last);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('replays a POST only when the connection was never established', async () => {
    const connectThenOk = vi.fn().mockRejectedValueOnce(connectFailure()).mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', connectThenOk);
    const res = await fetchWithRetry(URL_, { method: 'POST', headers: {}, body: '{}' }, recordingDelay().delay);
    expect(res.status).toBe(200);
    expect(connectThenOk).toHaveBeenCalledTimes(2);

    const reset = resetFailure();
    const resetOnce = vi.fn().mockRejectedValueOnce(reset).mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', resetOnce);
    await expect(
      fetchWithRetry(URL_, { method: 'POST', headers: {}, body: '{}' }, recordingDelay().delay),
    ).rejects.toBe(reset);
    expect(resetOnce).toHaveBeenCalledTimes(1);
  });

  it('replays 502/503/504/522/524 on a GET only; 500 and other methods go back as is', async () => {
    const gateway = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', gateway);
    expect((await fetchWithRetry(URL_, { method: 'GET', headers: {} }, recordingDelay().delay)).status).toBe(200);
    expect(gateway).toHaveBeenCalledTimes(2);

    const appError = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    vi.stubGlobal('fetch', appError);
    expect((await fetchWithRetry(URL_, { method: 'GET', headers: {} }, recordingDelay().delay)).status).toBe(500);
    expect(appError).toHaveBeenCalledTimes(1);

    const postGateway = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', postGateway);
    expect(
      (await fetchWithRetry(URL_, { method: 'POST', headers: {}, body: '{}' }, recordingDelay().delay)).status,
    ).toBe(503);
    expect(postGateway).toHaveBeenCalledTimes(1);
  });

  it('starts no new attempt once the request is 10 s old', async () => {
    const failure = connectFailure();
    const fetchMock = vi.fn().mockRejectedValue(failure);
    vi.stubGlobal('fetch', fetchMock);
    let clock = 0;
    fetchMock.mockImplementation(async () => {
      clock += RETRY_BUDGET_MS; // the attempt hung until undici's connect timeout
      throw failure;
    });

    await expect(
      fetchWithRetry(URL_, { method: 'GET', headers: {} }, recordingDelay().delay, () => clock),
    ).rejects.toBe(failure);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
