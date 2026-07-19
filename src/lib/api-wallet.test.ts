/**
 * FBG-385 — wallet debit is a logged-in-only, positive-only, XOR-clean field.
 *
 * createOrder must attach walletAmountToApply ONLY when a JWT is present AND the
 * amount is > 0. Guests (no arm_token) must never send it — the guest-checkout
 * regression guard. validateWallet must hit /wallet/validate with the Bearer +
 * X-Currency headers (logged-in-only preview endpoint).
 *
 * Mocks `axios` (api.ts uses axios.create) — mirrors api.test.ts.
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
  delete process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY;
  localStorage.clear();
  mockPost.mockResolvedValue({ data: { data: { id: 'o1', number: 'N1', total: 100, currency: 'TRY' } } });
});

afterEach(() => {
  localStorage.clear();
});

const orderPayload = {
  customer: { name: 'A', phone: '+90', email: 'a@b.co' },
  shipping: { country: 'TR' },
  items: [{ productId: 'dp1', quantity: 1 }],
};

describe('createOrder — walletAmountToApply gating', () => {
  it('sends walletAmountToApply when a JWT is present and amount > 0', async () => {
    localStorage.setItem('arm_token', 'jwt-123');
    const { createOrder } = await import('./api');
    await createOrder({ ...orderPayload, walletAmountToApply: 250 });
    const [, body, config] = mockPost.mock.calls[0];
    expect(body.walletAmountToApply).toBe(250);
    // logged-in → Authorization header attached
    expect((config.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
  });

  it('omits walletAmountToApply when the amount is 0 (even with a JWT)', async () => {
    localStorage.setItem('arm_token', 'jwt-123');
    const { createOrder } = await import('./api');
    await createOrder({ ...orderPayload, walletAmountToApply: 0 });
    const [, body] = mockPost.mock.calls[0];
    expect('walletAmountToApply' in body).toBe(false);
  });

  it('omits walletAmountToApply for a guest even if an amount is passed (regression)', async () => {
    // no arm_token → guest
    const { createOrder } = await import('./api');
    await createOrder({ ...orderPayload, walletAmountToApply: 250 });
    const [, body, config] = mockPost.mock.calls[0];
    expect('walletAmountToApply' in body).toBe(false);
    expect((config.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('omits walletAmountToApply when it is not provided at all', async () => {
    localStorage.setItem('arm_token', 'jwt-123');
    const { createOrder } = await import('./api');
    await createOrder(orderPayload);
    const [, body] = mockPost.mock.calls[0];
    expect('walletAmountToApply' in body).toBe(false);
  });
});

describe('validateWallet — Bearer-protected preview', () => {
  beforeEach(() => {
    mockPost.mockResolvedValue({ data: { data: { balance: '500', applicable: '400', currency: 'TRY' } } });
  });

  it('POSTs to /wallet/validate with Bearer + X-Currency headers', async () => {
    localStorage.setItem('arm_token', 'jwt-xyz');
    const { validateWallet } = await import('./api');
    const { data } = await validateWallet(400, 1000);
    const [url, reqBody, config] = mockPost.mock.calls[0];
    expect(url).toBe('/wallet/validate');
    expect(reqBody).toEqual({ amount: 400, total: 1000 });
    const headers = config.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer jwt-xyz');
    expect(headers['X-Currency']).toBe('TRY');
    // string amounts from the BFF are coerced to numbers by the adapter
    expect(data.balance).toBe(500);
    expect(data.applicable).toBe(400);
  });
});
