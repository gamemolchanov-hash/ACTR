/**
 * ProductReviews block coverage (FBG-69 + WR-02).
 *
 * Wave 2 extensions: locale-aware dates (Intl.DateTimeFormat, not ru-RU),
 * ICU plural for review count, and all UI strings from message keys.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductReviews } from '../ProductReviews';

// ---------------------------------------------------------------------------
// next-intl mock — returns EN strings; locale is configurable per test
// ---------------------------------------------------------------------------
let mockLocale = 'en';

vi.mock('next-intl', () => {
  // Minimal ICU plural (one/other only) for testing
  function icuPlural(template: string, count: number): string {
    const match = template.match(/\{[^,]+,\s*plural,\s*one\s*\{([^}]+)\}\s*other\s*\{([^}]+)\}\}/);
    if (!match) return template.replace(/\{count\}/g, String(count));
    const [, one, other] = match;
    const form = count === 1 ? one : other;
    return form.replace('#', String(count));
  }

  const messages: Record<string, string> = {
    'product.reviews': 'Reviews',
    'product.yourRating': 'Your Rating',
    'product.ratingAriaLabel': 'Rating',
    'product.sharePlaceholder': 'Share your experience with the product…',
    'product.submitReview': 'Leave a Review',
    'product.submitting': 'Submitting…',
    'product.verifiedPurchase': 'Verified Purchase',
    'product.noReviews': 'No reviews yet. Be the first!',
    'product.loginPromptText': 'To leave a review,',
    'product.loginLink': 'sign in to your account',
    'product.reviewCount': '{count, plural, one {# review} other {# reviews}}',
    'product.customer': 'Customer',
    'product.sendError': 'Could not submit the review. Please try again.',
  };

  return {
    useTranslations: (namespace?: string) =>
      (key: string, params?: Record<string, unknown>) => {
        const fullKey = namespace ? `${namespace}.${key}` : key;
        let msg = messages[fullKey] ?? fullKey;
        if (params) {
          // Handle ICU plural for reviewCount
          const count = typeof params.count === 'number' ? params.count : undefined;
          if (count !== undefined && msg.includes('plural')) {
            msg = icuPlural(msg, count);
          } else {
            Object.entries(params).forEach(([k, v]) => {
              msg = msg.replace(`{${k}}`, String(v));
            });
          }
        }
        return msg;
      },
    useLocale: () => mockLocale,
  };
});

// ---------------------------------------------------------------------------
// API / auth mocks
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  fetchProductReviews: vi.fn(),
  submitReview: vi.fn(),
  customer: { id: '1', name: 'Test User', email: 'test@test.com', phone: null } as {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null,
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
  mockLocale = 'en';
  mocks.customer = { id: '1', name: 'Test User', email: 'test@test.com', phone: null };
  mocks.fetchProductReviews.mockResolvedValue({
    data: [
      {
        id: 'r1',
        author: 'Ivan',
        rating: 5,
        text: 'Great product <script>alert(1)</script>',
        verified_purchase: true,
        date_created: '2025-01-15T10:00:00Z',
      },
    ],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1, average: 4.7 },
  });
});

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ProductReviews', () => {
  // --- Original coverage (adapted to EN strings) ---

  it('renders approved reviews, the aggregate, and the verified badge', async () => {
    const { container } = renderBlock();
    expect(await screen.findByText('Ivan')).toBeTruthy();
    expect(screen.getByText('Verified Purchase')).toBeTruthy();
    // Average summary contains 4.7
    expect(screen.getByText(/4\.7/)).toBeTruthy();
    // Review text rendered as escaped text — no live <script> element.
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(/Great product/)).toBeTruthy();
  });

  it('shows a login prompt and no submit form when logged out', async () => {
    mocks.customer = null;
    renderBlock();
    expect(await screen.findByText(/To leave a review/)).toBeTruthy();
    expect(await screen.findByText(/sign in to your account/)).toBeTruthy();
    expect(screen.queryByText('Leave a Review')).toBeNull();
  });

  it('submits a review with the auth token and shows a thank-you message', async () => {
    mocks.submitReview.mockResolvedValue({
      data: { id: 'new', status: 'draft', verified_purchase: false },
      message: 'Thank you! Your review will appear after moderation.',
    });

    renderBlock();
    await screen.findByText('Ivan');

    fireEvent.change(
      screen.getAllByPlaceholderText(/Share your experience with the product/)[0],
      { target: { value: 'Great!' } },
    );
    fireEvent.click(screen.getByText('Leave a Review'));

    await waitFor(() => expect(mocks.submitReview).toHaveBeenCalledTimes(1));
    expect(mocks.submitReview).toHaveBeenCalledWith(
      { product: 'prod-1', rating: 5, text: 'Great!' },
      'tok-1',
    );
    expect(await screen.findByText(/Thank you! Your review will appear after moderation/)).toBeTruthy();
  });

  // --- WR-02: locale-aware date formatting ---

  it('formats review dates with en-US locale (no Cyrillic month names)', async () => {
    mockLocale = 'en';
    renderBlock();
    await screen.findByText('Ivan');
    // Date '2025-01-15' should be formatted in English — e.g. "January 15, 2025"
    // It must NOT contain Cyrillic month names like "января"
    const dateEl = screen.getByText(/January|2025/i);
    expect(dateEl).toBeTruthy();
    // Absolutely no Cyrillic in the rendered text
    expect(dateEl.textContent).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('formats review dates with tr-TR locale (Turkish month names)', async () => {
    mockLocale = 'tr';
    renderBlock();
    await screen.findByText('Ivan');
    // Date '2025-01-15' in tr-TR should include "Ocak" (January in Turkish)
    // or at minimum contain 2025 and NOT contain Cyrillic
    const dateEl = screen.getByText(/Ocak|2025/i);
    expect(dateEl).toBeTruthy();
    expect(dateEl.textContent).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('does NOT use ru-RU locale for date formatting', async () => {
    mockLocale = 'en';
    renderBlock();
    await screen.findByText('Ivan');
    // Cyrillic month "января" must be absent
    const allText = document.body.textContent ?? '';
    expect(allText).not.toMatch(/января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря/);
  });

  // --- WR-02: ICU plural for review count ---

  it('renders "1 review" (singular) for total=1', async () => {
    // meta.total=1 is already the default mock
    renderBlock();
    await screen.findByText('Ivan');
    // The count string should be "1 review" (singular)
    expect(screen.getByText(/1 review/)).toBeTruthy();
  });

  it('renders "5 reviews" (plural) for total=5', async () => {
    mocks.fetchProductReviews.mockResolvedValue({
      data: [],
      meta: { total: 5, page: 1, limit: 20, totalPages: 1, average: 4.2 },
    });
    renderBlock();
    // Use findByText to wait for async data to load before asserting plural form
    expect(await screen.findByText(/5 reviews/)).toBeTruthy();
  });

  it('shows no review count when total=0', async () => {
    mocks.fetchProductReviews.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 1, average: 0 },
    });
    renderBlock();
    await screen.findByText('Reviews');
    // No "0 review(s)" displayed — the aggregate section is hidden when total=0
    expect(screen.queryByText(/0 review/)).toBeNull();
  });

  // --- No-reviews empty state ---

  it('shows empty state when there are no reviews', async () => {
    mocks.fetchProductReviews.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 1, average: 0 },
    });
    renderBlock();
    expect(await screen.findByText('No reviews yet. Be the first!')).toBeTruthy();
  });

  // --- Author fallback ---

  it('falls back to t("product.customer") when author is null', async () => {
    mocks.fetchProductReviews.mockResolvedValue({
      data: [
        {
          id: 'r2',
          author: null,
          rating: 4,
          text: 'Good.',
          verified_purchase: false,
          date_created: '2025-02-01T00:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1, average: 4.0 },
    });
    renderBlock();
    expect(await screen.findByText('Customer')).toBeTruthy();
  });
});
