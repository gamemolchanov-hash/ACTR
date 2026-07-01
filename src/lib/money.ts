/**
 * Format a monetary amount using Intl.NumberFormat.
 * Uses style:'currency' so the output includes the ISO symbol (e.g. $12.99, ₺450, €9).
 * Uses currencyDisplay:'narrowSymbol' so the narrow currency symbol renders
 * (e.g. TRY -> ₺) regardless of UI language (D4) — the locale arg should be
 * the country-derived format locale, not the UI language.
 *
 * @param amount - The amount to format
 * @param currency - ISO 4217 currency code. Falls back to NEXT_PUBLIC_STOREFRONT_CURRENCY → 'TRY' (WR-05)
 * @param locale - BCP-47 locale string (e.g. 'tr-TR', 'en-US'). Falls back to 'en-US'
 */
export function fmtMoney(amount: number, currency?: string, locale?: string): string {
  const curr = currency || process.env.NEXT_PUBLIC_STOREFRONT_CURRENCY || 'TRY';
  const loc = locale || 'en-US';
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: curr,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Unknown currency code — fall back to plain number + code
    return `${new Intl.NumberFormat(loc).format(amount)} ${curr}`;
  }
}
