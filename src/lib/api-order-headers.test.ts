/**
 * FBG-477 — order/payment request contract.
 *
 * `locale`: ARM addresses the "set your password" welcome mail with the RAW tag
 * from `body.locale`, so a Turkish buyer gets an English mail unless createOrder
 * sends it.
 *
 * `Authorization`: after FBG-480 an order whose customer can sign in requires
 * that customer's JWT on GET /orders/:id and POST /payment/create-session — a
 * logged-in buyer would otherwise 404 on their own order. A guest's shell has no
 * credentials, so the same calls stay reachable by UUID with no header.
 *
 * Mocks `axios` (api.ts uses axios.create) — mirrors api-wallet.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('axios', () => ({
  default: {
    create: () => ({ get: mockGet, post: mockPost }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_USE_MOCKS;
  localStorage.clear();
  mockPost.mockResolvedValue({
    data: { data: { id: 'o1', number: 'N1', total: 100, currency: 'TRY' } },
  });
  mockGet.mockResolvedValue({ data: { data: { id: 'o1', number: 'N1' } } });
});

afterEach(() => {
  localStorage.clear();
});

const orderPayload = {
  customer: { name: 'Ada', phone: '+905000000000', email: 'ada@example.com' },
  shipping: { country: 'TR' },
  items: [{ productId: 'dp1', quantity: 1 }],
  locale: 'tr',
};

describe('createOrder — locale for the welcome email', () => {
  it('sends the raw locale tag', async () => {
    const { createOrder } = await import('./api');
    await createOrder(orderPayload);
    const [, body] = mockPost.mock.calls[0];
    expect(body.locale).toBe('tr');
  });

  it('passes the account status through unchanged', async () => {
    mockPost.mockResolvedValue({
      data: {
        data: {
          id: 'o1',
          number: 'N1',
          total: 100,
          currency: 'TRY',
          account: { status: 'created', welcome_email_sent: true },
        },
      },
    });
    const { createOrder } = await import('./api');
    const res = await createOrder(orderPayload);
    expect(res.data.account).toEqual({ status: 'created', welcome_email_sent: true });
  });

  it('leaves `account` undefined for a storefront without auto-registration', async () => {
    const { createOrder } = await import('./api');
    const res = await createOrder(orderPayload);
    expect(res.data.account).toBeUndefined();
  });
});

describe('Authorization on the post-checkout order calls', () => {
  it('fetchOrder sends the Bearer token of a logged-in buyer', async () => {
    localStorage.setItem('arm_token', 'jwt-123');
    const { fetchOrder } = await import('./api');
    await fetchOrder('o1');
    const [, config] = mockGet.mock.calls[0];
    expect((config.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
  });

  it('fetchOrder sends no Authorization for a guest (order read by UUID)', async () => {
    const { fetchOrder } = await import('./api');
    await fetchOrder('o1');
    const [, config] = mockGet.mock.calls[0];
    expect((config?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
  });

  it('createPaymentSession sends the Bearer token of a logged-in buyer', async () => {
    localStorage.setItem('arm_token', 'jwt-123');
    const { createPaymentSession } = await import('./api');
    await createPaymentSession('o1', 'https://s/ok', 'https://s/cancel');
    const [, , config] = mockPost.mock.calls[0];
    expect((config.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
  });

  it('createPaymentSession sends no Authorization for a guest', async () => {
    const { createPaymentSession } = await import('./api');
    await createPaymentSession('o1', 'https://s/ok', 'https://s/cancel');
    const [, , config] = mockPost.mock.calls[0];
    expect((config?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
  });

  it('returns the session-less `manual` payload as-is (offline provider, FBG-478)', async () => {
    mockPost.mockResolvedValue({ data: { data: { type: 'manual' } } });
    const { createPaymentSession } = await import('./api');
    const res = await createPaymentSession('o1', 'https://s/ok', 'https://s/cancel');
    expect(res.data).toEqual({ type: 'manual' });
  });
});
