/**
 * Format a monetary amount using Intl.NumberFormat.
 * Uses style:'currency' so the output includes the ISO symbol (e.g. $12.99, ₺450, €9).
 * Falls back to NEXT_PUBLIC_STOREFRONT_CURRENCY → USD when `currency` is undefined.
 */
export function fmtMoney(amount: number, currency?: string): string {
  const curr = currency || process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'USD';
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Unknown currency code — fall back to plain number + code
    return `${new Intl.NumberFormat('en').format(amount)} ${curr}`;
  }
}
