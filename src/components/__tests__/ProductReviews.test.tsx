/**
 * ProductReviews block coverage (FBG-69).
 *
 * Verifies the public list + aggregate render, the logged-out prompt, and that
 * a logged-in submit posts the right payload. Review text is asserted to render
 * as an escaped text node (no <script> execution).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductReviews } from '../ProductReviews';

const mocks = vi.hoisted(() => ({
  fetchProductReviews: vi.fn(),
  submitReview: vi.fn(),
  customer: { id: '1', name: 'Test User', email: 'test@test.com', phone: null } as { id: string; name: string; email: string; phone: string | null } | null,
}));

vi.mock('@/lib/api', () => ({
  fetchProductReviews: mocks.fetchProductReviews,
  submitReview: mocks.submitReview,
}));

vi.mock('@/lib/auth', () => ({
  getToken: () => 'tok-1',
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ customer: mocks.customer }),
}));

function renderBlock() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductReviews productId="prod-1" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.customer = { id: '1', name: 'Test User', email: 'test@test.com', phone: null };
  mocks.fetchProductReviews.mockResolvedValue({
    data: [
      {
        id: 'r1',
        author: 'Иван',
        rating: 5,
        text: 'Отличный товар <script>alert(1)</script>',
        verified_purchase: true,
        date_created: '2025-01-15T10:00:00Z',
      },
    ],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1, average: 4.7 },
  });
});

// The storefront vitest config does not set globals:true, so RTL's automatic
// afterEach cleanup is not registered — unmount manually to avoid DOM leaking
// between tests.
afterEach(cleanup);

describe('ProductReviews', () => {
  it('renders approved reviews, the aggregate, and the verified badge', async () => {
    const { container } = renderBlock();
    expect(await screen.findByText('Иван')).toBeTruthy();
    expect(screen.getByText('Покупка подтверждена')).toBeTruthy();
    // Average summary "4.7 · 1 отзыв"
    expect(screen.getByText(/4\.7/)).toBeTruthy();
    // Review text rendered as escaped text — no live <script> element.
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(/Отличный товар/)).toBeTruthy();
  });

  it('shows a login prompt and no form when logged out', async () => {
    mocks.customer = null;
    renderBlock();
    expect(await screen.findByText(/войдите в аккаунт/)).toBeTruthy();
    expect(screen.queryByText('Оставить отзыв')).toBeNull();
  });

  it('submits a review with the auth token and shows a thank-you message', async () => {
    mocks.submitReview.mockResolvedValue({
      data: { id: 'new', status: 'draft', verified_purchase: false },
      message: 'Спасибо! Отзыв появится после проверки модератором.',
    });

    renderBlock();
    await screen.findByText('Иван');

    // MUI multiline TextField renders a visible textarea + a hidden autosize
    // shadow; target the first (visible) one.
    fireEvent.change(screen.getAllByPlaceholderText(/Поделитесь впечатлениями/)[0], {
      target: { value: 'Класс!' },
    });
    fireEvent.click(screen.getByText('Оставить отзыв'));

    await waitFor(() => expect(mocks.submitReview).toHaveBeenCalledTimes(1));
    expect(mocks.submitReview).toHaveBeenCalledWith(
      { product: 'prod-1', rating: 5, text: 'Класс!' },
      'tok-1',
    );
    expect(await screen.findByText(/Спасибо! Отзыв появится после проверки/)).toBeTruthy();
  });
});
